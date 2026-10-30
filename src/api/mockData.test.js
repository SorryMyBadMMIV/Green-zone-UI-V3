import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeAbandoned, normalizeGaSites, normalizeGreenGroups } from './data.js';
import { pointInPolygon, polygonAreaM2, polygonLabelPoint } from '../lib/geo.js';
import { loadParks } from '../lib/parks.js';
import { analyseSites } from '../lib/sites.js';
import { analyseDistrict } from '../lib/district.js';

// Plain path maths on purpose: Vite rewrites `new URL(`…${x}`, import.meta.url)` into an asset lookup.
const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = (file) => JSON.parse(readFileSync(path.join(SRC, file), 'utf8'));

describe('bundled data', () => {
  it('has no Don Mueang or heat map left', () => {
    for (const file of ['mock/don-mueang', 'data/districts/don-mueang.json', 'mock/suan-luang/heatmap.png']) {
      expect(existsSync(path.join(SRC, file)), file).toBe(false);
    }
  });
});

describe('Suan Luang data', () => {
  const boundaries = load('data/districts/suan-luang.json');
  const focus = boundaries.features.filter((f) => f.properties.role === 'focus');
  const frame = load('mock/suan-luang/frame.json');
  const lats = Object.values(frame.corners).map(([lat]) => lat);
  const lngs = Object.values(frame.corners).map(([, lng]) => lng);

  it('has one focus district, Suan Luang, of 15–35 km², with view bounds', () => {
    expect(focus).toHaveLength(1);
    expect(focus[0].properties.nameEn).toBe('Suan Luang');
    const km2 = polygonAreaM2(focus[0].geometry) / 1e6;
    expect(km2).toBeGreaterThan(15);
    expect(km2).toBeLessThan(35);
    expect(boundaries.metadata.viewBounds).toHaveLength(4);
  });

  it('places the 7 km × 6 km Theosmain image where the GA sites fit their green patches (about 1 m)', () => {
    expect(frame.extent.west).toBeCloseTo(672420, -1);
    expect(frame.extent.north).toBeCloseTo(1521080, -1);
    expect(frame.extent.east - frame.extent.west).toBe(7000);
    expect(frame.extent.north - frame.extent.south).toBe(6000);
  });

  it('places the Theosmain frame around On Nut / Srinakarin', () => {
    expect(Math.min(...lats)).toBeGreaterThan(13.69);
    expect(Math.max(...lats)).toBeLessThan(13.76);
    expect(Math.min(...lngs)).toBeGreaterThan(100.58);
    expect(Math.max(...lngs)).toBeLessThan(100.68);
  });

  it('has at least 5 example abandoned plots inside the district and the image', () => {
    const raw = load('mock/suan-luang/abandoned.geojson');
    const { features } = normalizeAbandoned(raw);
    expect(features.length).toBeGreaterThanOrEqual(5);
    expect(features.length).toBe(raw.features.length);
    expect(new Set(features.map((f) => f.properties.id)).size).toBe(features.length);
    for (const { geometry, properties } of raw.features) {
      expect(properties.isExample).toBe(true);
      expect(properties.areaM2).toBeGreaterThanOrEqual(200);
      expect(['concrete or soil', 'overgrown']).toContain(properties.landCover);
      const [lng, lat] = polygonLabelPoint(geometry);
      expect(pointInPolygon([lng, lat], focus[0].geometry), properties.id).toBe(true);
      expect(lat).toBeGreaterThanOrEqual(Math.min(...lats));
      expect(lat).toBeLessThanOrEqual(Math.max(...lats));
      expect(lng).toBeGreaterThanOrEqual(Math.min(...lngs));
      expect(lng).toBeLessThanOrEqual(Math.max(...lngs));
    }
  });

  it('leaves out plots the satellite photo shows are built up (SL-006 "Park Heritage 20" is now housing)', () => {
    const plots = load('mock/suan-luang/abandoned.geojson').features;
    expect(plots.map((f) => f.properties.id)).not.toContain('SL-006');
    expect(plots.map((f) => f.properties.name)).not.toContain('Park Heritage 20');
  });

  it('has the 11 parks the backend checked against the image', () => {
    const checks = load('mock/suan-luang/park-checks.geojson').features;
    expect(checks).toHaveLength(11);
    for (const { properties } of checks) {
      expect(['green_detected', 'no_green_detected', 'outside_image']).toContain(properties.status);
    }
  });

  it('keeps the backend summary', () => {
    expect(load('mock/suan-luang/summary.json').green_area_m2).toBe(2248297.5);
  });

  it("has the backend's 85 GA park sites, ranked inside their 1 km squares, all on the image", () => {
    const raw = load('mock/suan-luang/ga-sites.geojson');
    const { features } = normalizeGaSites(raw);
    expect(features).toHaveLength(85);
    expect(new Set(features.map((f) => f.properties.id)).size).toBe(85);
    for (const { geometry, properties } of features) {
      expect(properties.zone).toMatch(/^r\d+_c\d+$/);
      expect(properties.rank).toBeGreaterThanOrEqual(1);
      expect(properties.areaM2).toBeGreaterThan(0);
      expect(properties.distNearestOfficialM).toBeGreaterThanOrEqual(0);
      const [lng, lat] = geometry.coordinates;
      expect(lat).toBeGreaterThanOrEqual(Math.min(...lats));
      expect(lat).toBeLessThanOrEqual(Math.max(...lats));
      expect(lng).toBeGreaterThanOrEqual(Math.min(...lngs));
      expect(lng).toBeLessThanOrEqual(Math.max(...lngs));
    }
  });

  it('keeps 14 recommended sites inside Suan Luang: 40 lie outside, 5 are less than 400 m from a park, 3 inside an S circle, 23 too close to a better one', () => {
    const { parks } = analyseDistrict({ focus: focus[0].geometry, parks: loadParks(load('data/parks.json')) });
    const result = analyseSites(normalizeGaSites(load('mock/suan-luang/ga-sites.geojson')), parks, focus[0].geometry);
    expect(result.keptIds).toHaveLength(14);
    expect(result.outside).toBe(40);
    expect(result.removed).toEqual({ total: 31, within400: 5, barrier: 3, tooClose: 23 });
    for (const id of result.keptIds) expect(['S', 'M']).toContain(result.sites[id].size.key);
  });

  it("has the backend's 271 green-group circles: 170 groups and 101 isolated", () => {
    const { features } = normalizeGreenGroups(load('mock/suan-luang/green-groups.geojson'));
    expect(features).toHaveLength(271);
    expect(features.filter((f) => f.properties.kind === 'group')).toHaveLength(170);
    expect(features.filter((f) => f.properties.kind === 'isolated')).toHaveLength(101);
    expect(new Set(features.map((f) => f.properties.id)).size).toBe(271);
    for (const { properties } of features) {
      expect(properties.radiusM).toBeGreaterThan(0);
      expect(properties.greenM2InGroup).toBeGreaterThan(0);
    }
  });
});

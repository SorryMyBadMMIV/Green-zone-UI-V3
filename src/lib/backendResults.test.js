import { describe, it, expect } from 'vitest';
import { greenGroupStats, recommendedAreaM2, sitesPerSquare } from './backendResults.js';

const site = (zone, rank) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [100.6, 13.7] }, properties: { id: `${zone}-${rank}`, zone, rank } });
const group = (id, kind, greenM2InGroup) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [100.6, 13.7] },
  properties: { id, kind, radiusM: 100, greenM2InGroup },
});

describe('sitesPerSquare', () => {
  it('counts the GA sites in every 1 km square', () => {
    const sites = { type: 'FeatureCollection', features: [site('r0_c0', 1), site('r0_c0', 2), site('r1_c3', 1)] };
    expect(sitesPerSquare(sites)).toEqual({ r0_c0: 2, r1_c3: 1 });
  });

  it('is empty when there are no sites', () => {
    expect(sitesPerSquare(null)).toEqual({});
  });
});

describe('recommendedAreaM2', () => {
  it('adds up the area of the GA sites that are kept and the sites the app added, not the removed ones', () => {
    const gaSites = { type: 'FeatureCollection', features: [site('r0_c0', 1), site('r0_c0', 2), site('r1_c3', 1)] };
    gaSites.features.forEach((f, i) => (f.properties.areaM2 = [1000, 2000, 4000][i]));
    const siteAnalysis = { keptIds: ['r0_c0-1', 'r1_c3-1'] };
    expect(recommendedAreaM2(gaSites, siteAnalysis, [{ areaM2: 500 }])).toBe(5500);
    expect(recommendedAreaM2(null, null, null)).toBe(0);
  });
});

describe('greenGroupStats', () => {
  it('counts groups and isolated circles', () => {
    const groups = { type: 'FeatureCollection', features: [group('1', 'group', 600), group('2', 'group', 200), group('3', 'isolated', 100)] };
    expect(greenGroupStats(groups)).toEqual({ groups: 2, isolated: 1 });
  });
});

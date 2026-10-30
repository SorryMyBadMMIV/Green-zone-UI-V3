import { describe, it, expect } from 'vitest';
import { analyseSite, analyseSites, circleOverlapShare, fillGaps, scoreSite, siteLevel } from './sites.js';
import { loadParks } from './parks.js';

const M = 111195; // metres per degree of latitude
const LAT = 13.73;
const kx = M * Math.cos((LAT * Math.PI) / 180);
const LNG = 100.63;
const east = (metres) => LNG + metres / kx;

const parks = (...list) =>
  loadParks({
    type: 'FeatureCollection',
    features: list.map(([id, lng, lat, areaM2]) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: { id, name: `Park ${id}`, areaM2 },
    })),
  });
const site = (id, lng, lat, areaM2) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [lng, lat] },
  properties: { id, zone: 'r0_c0', rank: 1, areaM2 },
});

describe('scoreSite', () => {
  it.each([
    [{ distanceM: 1000, areaM2: 16000, freeShare: 1 }, 100, { distance: 40, overlap: 30, size: 30 }],
    [{ distanceM: 500, areaM2: 8000, freeShare: 0.5 }, 50, { distance: 20, overlap: 15, size: 15 }],
    [{ distanceM: Infinity, areaM2: 40000, freeShare: 0 }, 70, { distance: 40, overlap: 0, size: 30 }],
    [{ distanceM: 0, areaM2: null, freeShare: 0 }, 0, { distance: 0, overlap: 0, size: 0 }],
  ])('scores %o as %i: far from parks (40), not overlapping (30), size (30)', (input, score, parts) => {
    expect(scoreSite(input)).toEqual({ score, parts });
  });
});

describe('siteLevel', () => {
  it.each([
    [80, 'Very good'],
    [60, 'Good'],
    [40, 'Fair'],
    [39, 'Poor'],
  ])('calls %i "%s"', (score, label) => {
    expect(siteLevel(score).label).toBe(label);
  });
});

describe('analyseSite', () => {
  it('gives a lone site its own size class and reach, and the full far-and-free points', () => {
    const result = analyseSite(site('a', LNG, LAT, 20000), []);
    expect(result.size).toEqual({ key: 'M', radiusM: 1000 });
    expect(result.nearestPark).toBeNull();
    expect(result.freeShare).toBe(1);
    expect(result.crowded).toBe(false);
    expect(result.score).toBe(100);
  });

  it('removes a site less than 400 m from a park (it fails the policy)', () => {
    const result = analyseSite(site('a', LNG, LAT, 5000), parks(['p', east(300), LAT, 1000]));
    expect(result.withinPolicy).toBe(true);
    expect(result.crowded).toBe(true);
  });

  it('removes a site inside any S park circle (the barrier)', () => {
    const result = analyseSite(site('a', LNG, LAT, 5000), parks(['s', east(450), LAT, 1000]));
    expect(result).toMatchObject({ withinPolicy: false, insideBarrier: true, crowded: true });
  });

  it('keeps a site that is only inside an M, L or XL park circle', () => {
    const big = parks(['m', east(800), LAT, 50000], ['l', east(-2000), LAT, 120000], ['xl', east(3000), LAT, 300000]);
    expect(analyseSite(site('a', LNG, LAT, 5000), big)).toMatchObject({ withinPolicy: false, insideBarrier: false, crowded: false });
  });

  it('does not count XL circles in the overlap score, as they cover the whole district', () => {
    const xl = parks(['x1', east(3000), LAT, 300000], ['x2', east(-3000), LAT, 300000]);
    expect(analyseSite(site('a', LNG, LAT, 5000), xl)).toMatchObject({ circlesCovering: 0, crowded: false, freeShare: 1 });
  });

  it("measures how much of the site's own circle park circles already cover (two S circles 500 m apart share about 39%)", () => {
    const result = analyseSite(site('a', LNG, LAT, 5000), parks(['p', east(500), LAT, 1000]));
    expect(result.freeShare).toBeGreaterThan(0.58);
    expect(result.freeShare).toBeLessThan(0.64);
    expect(result.nearestPark.name).toBe('Park p');
    expect(result.nearestPark.distanceM).toBeCloseTo(500, -1);
  });
});

describe('circleOverlapShare', () => {
  it.each([
    [0, 500, 500, 1],
    [1000, 500, 500, 0],
    [1500, 500, 500, 0],
    [100, 200, 1000, 1],
  ])('gives %i m apart, radii %i and %i m, a share of %d of the smaller circle', (d, a, b, share) => {
    expect(circleOverlapShare(d, a, b)).toBeCloseTo(share, 6);
  });

  it('shares about 39% at one radius apart and about 19% at 700 m for two S circles', () => {
    expect(circleOverlapShare(500, 500, 500)).toBeCloseTo(0.391, 3);
    expect(circleOverlapShare(700, 500, 500)).toBeCloseTo(0.188, 3);
  });
});

describe('fillGaps', () => {
  const patch = (id, metresEast, areaM2) => ({ id, lngLat: [east(metresEast), LAT], areaM2 });

  it('adds the best green patch in a gap, but none whose circle overlaps a ★ by more than 25%', () => {
    const taken = [{ lngLat: [LNG, LAT], radiusM: 500 }];
    const added = fillGaps([patch('close', 500, 16000), patch('gap', 2000, 16000)], [], taken);
    expect(added.map((s) => s.id)).toEqual(['gap']);
    expect(added[0]).toMatchObject({ lngLat: [east(2000), LAT], areaM2: 16000 });
    expect(added[0].analysis.score).toBe(100);
  });

  it('takes only the best of two patches that are too close to each other', () => {
    const added = fillGaps([patch('small', 0, 2000), patch('big', 300, 16000)], [], []);
    expect(added.map((s) => s.id)).toEqual(['big']);
  });

  it('skips patches under 300 m², scoring under 40 (fair) or already served by a park', () => {
    const near = parks(['p', east(-300), LAT, 1000]);
    const added = fillGaps([patch('tiny', 3000, 250), patch('served', 0, 16000), patch('ok', 6000, 400)], near, []);
    expect(added.map((s) => s.id)).toEqual(['ok']);
    const poor = fillGaps([patch('poor', 50, 400)], parks(['q', east(-520), LAT, 1000], ['r', east(520), LAT, 1000]), []);
    expect(poor).toEqual([]);
  });
});

describe('analyseSites', () => {
  it('keeps the sites outside the barrier, best score first, and counts the removed ones by reason', () => {
    const list = parks(['p', east(300), LAT, 1000], ['w', east(1550), LAT, 1000]);
    const gaSites = {
      type: 'FeatureCollection',
      features: [site('near', LNG, LAT, 5000), site('between', east(2000), LAT, 5000), site('far', east(-2500), LAT, 16000), site('mid', east(-1000), LAT, 2000)],
    };
    const result = analyseSites(gaSites, list);
    expect(result.keptIds).toEqual(['far', 'mid']);
    expect(result.removed).toEqual({ total: 2, within400: 1, barrier: 1, tooClose: 0 });
    expect(result.sites.near.crowded).toBe(true);
  });

  it('keeps only the best of two sites whose circles overlap by more than 25%', () => {
    const gaSites = { type: 'FeatureCollection', features: [site('small', LNG, LAT, 2000), site('big', east(500), LAT, 16000)] };
    const result = analyseSites(gaSites, []);
    expect(result.keptIds).toEqual(['big']);
    expect(result.sites.small.tooCloseTo).toBe('big');
    expect(result.removed).toEqual({ total: 1, within400: 0, barrier: 0, tooClose: 1 });
  });

  it('lets circles overlap by 25% or less', () => {
    const gaSites = { type: 'FeatureCollection', features: [site('a', LNG, LAT, 2000), site('b', east(700), LAT, 16000)] };
    expect(analyseSites(gaSites, []).keptIds).toEqual(['b', 'a']);
  });

  it('leaves out the sites outside the district and counts them', () => {
    const half = 1500 / M;
    const focus = { type: 'Polygon', coordinates: [[[LNG - 0.02, LAT - half], [LNG + 0.02, LAT - half], [LNG + 0.02, LAT + half], [LNG - 0.02, LAT + half], [LNG - 0.02, LAT - half]]] };
    const gaSites = { type: 'FeatureCollection', features: [site('in', LNG, LAT, 5000), site('out', LNG, LAT + 3000 / M, 5000)] };
    const result = analyseSites(gaSites, [], focus);
    expect(result.keptIds).toEqual(['in']);
    expect(result.sites.out).toBeUndefined();
    expect(result.outside).toBe(1);
  });

  it('gives nothing while the sites are not loaded', () => {
    expect(analyseSites(null, [])).toEqual({ sites: {}, keptIds: [], removed: { total: 0, within400: 0, barrier: 0, tooClose: 0 }, outside: 0 });
  });
});

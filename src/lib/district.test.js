import { describe, it, expect } from 'vitest';
import { analyseDistrict } from './district.js';
import { loadParks } from './parks.js';

const M = 111195; // metres per degree of latitude
const LAT = 13.7;
const kx = M * Math.cos((LAT * Math.PI) / 180);

function squareAround(lng, lat, metres) {
  const dLat = metres / 2 / M;
  const dLng = metres / 2 / kx;
  return [[lng - dLng, lat - dLat], [lng + dLng, lat - dLat], [lng + dLng, lat + dLat], [lng - dLng, lat + dLat], [lng - dLng, lat - dLat]];
}

const plot = (id, lng, lat, metres) => ({
  type: 'Feature',
  geometry: { type: 'Polygon', coordinates: [squareAround(lng, lat, metres)] },
  properties: { id, areaM2: metres * metres },
});

const parks = (...list) =>
  loadParks({
    type: 'FeatureCollection',
    features: list.map(([id, lng, lat, areaM2]) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: { id, name: `Park ${id}`, areaM2 },
    })),
  });

// A 4 km × 4 km district around (100.6, 13.7).
const focus = { type: 'Polygon', coordinates: [squareAround(100.6, LAT, 4000)] };

describe('analyseDistrict', () => {
  it('keeps only the parks inside the district: parks outside are not drawn or counted, even when they reach in', () => {
    const list = parks(['s-in', 100.6, LAT, 1000], ['xl-out', 100.6 + 4000 / kx, LAT, 300000], ['s-near', 100.6 + 2100 / kx, LAT, 1000]);
    const result = analyseDistrict({ focus, parks: list, plots: { type: 'FeatureCollection', features: [] } });
    expect(result.parksBySize).toEqual({ S: 1, M: 0, L: 0, XL: 0 });
    expect(result.parks.map((p) => p.id)).toEqual(['s-in']);
  });

  it('measures the share of the district within 400 m of a park', () => {
    const result = analyseDistrict({ focus, parks: parks(['mid', 100.6, LAT, 1000]) });
    expect(Math.abs(result.policyShare - (Math.PI * 400 * 400) / 16e6)).toBeLessThan(0.01);
  });

  it('marks a far plot as a good example plot, and not a plot next to a park', () => {
    const list = parks(['p1', 100.6 - 1500 / kx, LAT, 1000]);
    const plots = { type: 'FeatureCollection', features: [plot('near', 100.6 - 1400 / kx, LAT, 50), plot('far', 100.6 + 1500 / kx, LAT, 80)] };
    const result = analyseDistrict({ focus, parks: list, plots });
    expect(result.plots.near.withinPolicy).toBe(true);
    expect(result.plots.far.recommended).toBe(true);
    expect(result.recommendedIds).toEqual(['far']);
    expect(result.recommendedCounts).toEqual({ veryGood: 1, good: 0 });
  });

  it('finds no good example plots when every plot is within 400 m of a park', () => {
    const list = parks(['p1', 100.6, LAT, 1000]);
    const plots = { type: 'FeatureCollection', features: [plot('a', 100.6 + 100 / kx, LAT, 40), plot('b', 100.6, LAT + 200 / M, 40)] };
    const result = analyseDistrict({ focus, parks: list, plots });
    expect(result.recommendedIds).toEqual([]);
    expect(result.recommendedCounts).toEqual({ veryGood: 0, good: 0 });
  });

  it('scores nothing while the plots are not loaded', () => {
    const result = analyseDistrict({ focus, parks: [], plots: null });
    expect(result.plots).toEqual({});
    expect(result.recommendedIds).toEqual([]);
  });
});

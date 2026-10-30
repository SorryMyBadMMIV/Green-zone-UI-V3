import { describe, it, expect } from 'vitest';
import { loadParks, sizeClass } from './parks.js';

const point = (id, lng, lat, areaM2) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [lng, lat] },
  properties: { id, name: `Park ${id}`, districtTh: 'สวนหลวง', areaM2, owner: null, kind: null, lists: ['accessible'] },
});

describe('sizeClass', () => {
  it.each([
    [0, 'S', 500],
    [50, 'S', 500],
    [16000, 'S', 500],
    [16001, 'M', 1000],
    [80000, 'M', 1000],
    [80001, 'L', 3000],
    [160000, 'L', 3000],
    [160001, 'XL', 5000],
    [800000, 'XL', 5000],
  ])('%s m² is %s with a %s m reach', (area, key, radiusM) => {
    expect(sizeClass(area)).toEqual({ key, radiusM });
  });

  it.each([null, Number.NaN, -1, undefined])('has no class for %s', (area) => {
    expect(sizeClass(area)).toBeNull();
  });
});

describe('loadParks', () => {
  it('turns features into parks with their size class', () => {
    const [park] = loadParks({ type: 'FeatureCollection', features: [point('p1', 100.64, 13.73, 7308)] });
    expect(park).toEqual({
      id: 'p1',
      name: 'Park p1',
      districtTh: 'สวนหลวง',
      areaM2: 7308,
      owner: null,
      kind: null,
      lists: ['accessible'],
      lngLat: [100.64, 13.73],
      size: { key: 'S', radiusM: 500 },
    });
  });

  it('skips a feature without point coordinates', () => {
    const broken = { type: 'Feature', geometry: null, properties: { id: 'x', name: 'x', areaM2: 10 } };
    expect(loadParks({ type: 'FeatureCollection', features: [broken, point('p2', 100.6, 13.7, 10)] })).toHaveLength(1);
  });
});

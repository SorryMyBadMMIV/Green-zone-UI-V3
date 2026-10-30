import { describe, it, expect } from 'vitest';
import { policyCoverage } from './policy.js';
import { loadParks } from './parks.js';

const parkAt = (id, lng, lat, areaM2) =>
  loadParks({
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: { id, name: `Park ${id}`, areaM2 } }],
  })[0];

// A square of side `metres` centred on (lng, lat).
function squareAround(lng, lat, metres) {
  const dLat = metres / 2 / 111195;
  const dLng = metres / 2 / (111195 * Math.cos((lat * Math.PI) / 180));
  const ring = [[lng - dLng, lat - dLat], [lng + dLng, lat - dLat], [lng + dLng, lat + dLat], [lng - dLng, lat + dLat], [lng - dLng, lat - dLat]];
  return { type: 'Polygon', coordinates: [ring] };
}

describe('policyCoverage', () => {
  const square = squareAround(100.6, 13.7, 1000);

  it('covers about π·400² of a 1 km² square with one park in the middle', () => {
    const share = policyCoverage(square, [parkAt('mid', 100.6, 13.7, 1000)]);
    expect(Math.abs(share - (Math.PI * 400 * 400) / 1e6)).toBeLessThan(0.03);
  });

  it('is 0 without parks', () => {
    expect(policyCoverage(square, [])).toBe(0);
  });
});

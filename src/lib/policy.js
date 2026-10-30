import { POLICY_RADIUS_M } from './constants.js';
import { bboxOf, haversineM, pointInPolygon } from './geo.js';

const METRES_PER_DEGREE = 111195;

/** Share (0–1) of a polygon's land within `radiusM` of any park, from points on a `stepM` grid. */
export function policyCoverage(geometry, parks, { radiusM = POLICY_RADIUS_M, stepM = 50 } = {}) {
  const [west, south, east, north] = bboxOf(geometry);
  const midLat = (south + north) / 2;
  const dLat = stepM / METRES_PER_DEGREE;
  const dLng = stepM / (METRES_PER_DEGREE * Math.cos((midLat * Math.PI) / 180));
  const padLat = radiusM / METRES_PER_DEGREE;
  const padLng = radiusM / (METRES_PER_DEGREE * Math.cos((midLat * Math.PI) / 180));
  const nearby = parks.filter(
    ({ lngLat: [lng, lat] }) => lng >= west - padLng && lng <= east + padLng && lat >= south - padLat && lat <= north + padLat,
  );
  let inside = 0;
  let covered = 0;
  for (let lat = south + dLat / 2; lat < north; lat += dLat) {
    for (let lng = west + dLng / 2; lng < east; lng += dLng) {
      if (!pointInPolygon([lng, lat], geometry)) continue;
      inside += 1;
      if (nearby.some((park) => haversineM([lng, lat], park.lngLat) <= radiusM)) covered += 1;
    }
  }
  return inside ? covered / inside : 0;
}

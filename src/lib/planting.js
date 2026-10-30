import {
  POLICY_RADIUS_M,
  RECOMMEND_MIN_SCORE,
  SCORE_AREA_FULL_M2,
  SCORE_DISTANCE_FULL_M,
  SCORE_POINTS,
} from './constants.js';
import { haversineM, polygonLabelPoint } from './geo.js';

const share = (value, full) => (typeof value === 'number' && value > 0 ? Math.min(1, value / full) : 0);

/** Planting score 0–100: distance to the nearest park (50), plot size (30), minus 10 per park circle covering it (20). */
export function scorePlot({ distanceM, areaM2, circlesCovering }) {
  const distance = SCORE_POINTS.distance * share(distanceM, SCORE_DISTANCE_FULL_M);
  const size = SCORE_POINTS.size * share(areaM2, SCORE_AREA_FULL_M2);
  const overlap = Math.max(0, SCORE_POINTS.overlap - SCORE_POINTS.perCircle * (circlesCovering ?? 0));
  return Math.min(100, Math.max(0, Math.round(distance + size + overlap)));
}

const LEVELS = [
  { min: 80, key: 'very-good', label: 'Very good for planting' },
  { min: 60, key: 'good', label: 'Good for planting' },
  { min: 40, key: 'fair', label: 'Fair for planting' },
  { min: -Infinity, key: 'poor', label: 'Poor for planting' },
];

/** Word label for a planting score. */
export function plantingLevel(score) {
  const { key, label } = LEVELS.find((level) => score >= level.min);
  return { key, label };
}

/**
 * How an abandoned plot does: nearest park, park circles covering it, whether it is already within 400 m of a park,
 * its score and whether it is recommended (outside every 400 m ring and good or very good).
 * Distances are straight-line, from a point inside the plot to each park point.
 */
export function analysePlot(geometry, areaM2, parks) {
  const point = polygonLabelPoint(geometry);
  let nearestPark = null;
  let circlesCovering = 0;
  let withinPolicy = false;
  for (const park of parks) {
    const distanceM = haversineM(point, park.lngLat);
    if (!nearestPark || distanceM < nearestPark.distanceM) nearestPark = { id: park.id, name: park.name, distanceM };
    if (park.size && distanceM <= park.size.radiusM) circlesCovering += 1;
    if (distanceM <= POLICY_RADIUS_M) withinPolicy = true;
  }
  const score = scorePlot({ distanceM: nearestPark?.distanceM ?? Infinity, areaM2, circlesCovering });
  return {
    point,
    nearestPark,
    circlesCovering,
    withinPolicy,
    score,
    level: plantingLevel(score),
    recommended: !withinPolicy && score >= RECOMMEND_MIN_SCORE,
  };
}

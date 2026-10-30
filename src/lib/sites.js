import {
  GAP_MIN_AREA_M2,
  GAP_MIN_SCORE,
  POLICY_RADIUS_M,
  SITE_AREA_FULL_M2,
  SITE_BARRIER_CLASSES,
  SITE_DISTANCE_FULL_M,
  SITE_MAX_OVERLAP,
  SITE_OVERLAP_CLASSES,
  SITE_SCORE_POINTS,
} from './constants.js';
import { haversineM, pointInPolygon } from './geo.js';
import { sizeClass } from './parks.js';
import { plantingLevel } from './planting.js';

const METRES_PER_DEGREE = 111195;
const GRID_STEPS = 15; // sample points per radius when measuring how much of a site's circle is free
const share = (value, full) => (typeof value === 'number' && value > 0 ? Math.min(1, value / full) : 0);
const LEVEL_LABELS = { 'very-good': 'Very good', good: 'Good', fair: 'Fair', poor: 'Poor' };

/** Site score 0–100 and its parts: far from parks (40), own circle not covered by park circles (30), size (30). */
export function scoreSite({ distanceM, areaM2, freeShare }) {
  const parts = {
    distance: Math.round(SITE_SCORE_POINTS.distance * share(distanceM, SITE_DISTANCE_FULL_M)),
    overlap: Math.round(SITE_SCORE_POINTS.overlap * Math.min(1, Math.max(0, freeShare ?? 0))),
    size: Math.round(SITE_SCORE_POINTS.size * share(areaM2, SITE_AREA_FULL_M2)),
  };
  return { score: parts.distance + parts.overlap + parts.size, parts };
}

/** Word label for a site score: very good from 80, good from 60, fair from 40, poor below. */
export function siteLevel(score) {
  const { key } = plantingLevel(score);
  return { key, label: LEVEL_LABELS[key] };
}

/** Share (0–1) of the smaller of two circles (radii a and b, centres distanceM apart) that the other one covers. */
export function circleOverlapShare(distanceM, a, b) {
  const small = Math.PI * Math.min(a, b) ** 2;
  if (distanceM >= a + b) return 0;
  if (distanceM <= Math.abs(a - b)) return 1;
  const d = distanceM;
  const lens =
    a * a * Math.acos((d * d + a * a - b * b) / (2 * d * a)) +
    b * b * Math.acos((d * d + b * b - a * a) / (2 * d * b)) -
    0.5 * Math.sqrt((-d + a + b) * (d + a - b) * (d - a + b) * (d + a + b));
  return lens / small;
}

/**
 * Share (0–1) of a circle (centre [lng, lat], radiusM) that none of the park circles cover, from points on a grid.
 * Small distances, so a flat local projection in metres is accurate enough.
 */
function freeShareOf([lng0, lat0], radiusM, circles) {
  const kx = METRES_PER_DEGREE * Math.cos((lat0 * Math.PI) / 180);
  const near = circles
    .map(({ lngLat: [lng, lat], radiusM: r }) => ({ x: (lng - lng0) * kx, y: (lat - lat0) * METRES_PER_DEGREE, r }))
    .filter(({ x, y, r }) => Math.hypot(x, y) < radiusM + r);
  if (!near.length) return 1;
  const step = radiusM / GRID_STEPS;
  let inside = 0;
  let free = 0;
  for (let y = -radiusM + step / 2; y < radiusM; y += step) {
    for (let x = -radiusM + step / 2; x < radiusM; x += step) {
      if (x * x + y * y > radiusM * radiusM) continue;
      inside += 1;
      if (!near.some((c) => (x - c.x) ** 2 + (y - c.y) ** 2 <= c.r * c.r)) free += 1;
    }
  }
  return inside ? free / inside : 1;
}

/**
 * One recommended site (a GA site feature, or any green patch as a point with an area) against the parks: its own
 * size class and reach, the nearest park, the S/M/L park circles covering it, whether it is inside the barrier (an S
 * park circle) or less than 400 m from a park (then it is removed), how much of its own circle is still free, and its
 * score.
 */
export function analyseSite(feature, parks) {
  const point = feature.geometry.coordinates;
  const { areaM2 } = feature.properties;
  const size = sizeClass(areaM2);
  let nearestPark = null;
  let circlesCovering = 0;
  let withinPolicy = false;
  let insideBarrier = false;
  const overlapCircles = [];
  for (const park of parks) {
    const distanceM = haversineM(point, park.lngLat);
    if (!nearestPark || distanceM < nearestPark.distanceM) nearestPark = { id: park.id, name: park.name, distanceM };
    if (distanceM <= POLICY_RADIUS_M) withinPolicy = true;
    if (park.size && SITE_BARRIER_CLASSES.includes(park.size.key) && distanceM <= park.size.radiusM) insideBarrier = true;
    if (park.size && SITE_OVERLAP_CLASSES.includes(park.size.key)) {
      overlapCircles.push({ lngLat: park.lngLat, radiusM: park.size.radiusM });
      if (distanceM <= park.size.radiusM) circlesCovering += 1;
    }
  }
  const freeShare = freeShareOf(point, size?.radiusM ?? sizeClass(0).radiusM, overlapCircles);
  const { score, parts } = scoreSite({ distanceM: nearestPark?.distanceM ?? Infinity, areaM2, freeShare });
  return {
    size,
    nearestPark,
    circlesCovering,
    withinPolicy,
    insideBarrier,
    crowded: withinPolicy || insideBarrier,
    freeShare,
    score,
    parts,
    level: siteLevel(score),
  };
}

/**
 * Every recommended site inside the district (focus; all of them when it is null) analysed. Crowded sites are removed;
 * then, best score first, a site whose circle overlaps an already kept one by more than 25% is removed as too close
 * (tooCloseTo names the better site). Returns the kept ids best score first, how many were removed and why, and how
 * many lie outside the district and were left out.
 */
export function analyseSites(gaSites, parks, focus = null) {
  const sites = {};
  let outside = 0;
  for (const feature of gaSites?.features ?? []) {
    if (focus && !pointInPolygon(feature.geometry.coordinates, focus)) {
      outside += 1;
      continue;
    }
    sites[feature.properties.id] = analyseSite(feature, parks);
  }
  const points = Object.fromEntries((gaSites?.features ?? []).map((f) => [f.properties.id, f.geometry.coordinates]));
  const radius = (id) => sites[id].size?.radiusM ?? sizeClass(0).radiusM;
  const candidates = Object.keys(sites)
    .filter((id) => !sites[id].crowded)
    .sort((a, b) => sites[b].score - sites[a].score || a.localeCompare(b));
  const keptIds = [];
  for (const id of candidates) {
    const better = keptIds.find((k) => circleOverlapShare(haversineM(points[id], points[k]), radius(id), radius(k)) > SITE_MAX_OVERLAP);
    if (better) sites[id] = { ...sites[id], tooCloseTo: better };
    else keptIds.push(id);
  }
  const crowded = Object.keys(sites).filter((id) => sites[id].crowded);
  const within400 = crowded.filter((id) => sites[id].withinPolicy).length;
  const tooClose = candidates.length - keptIds.length;
  return {
    sites,
    keptIds,
    removed: { total: crowded.length + tooClose, within400, barrier: crowded.length - within400, tooClose },
    outside,
  };
}

/**
 * Sites the app adds in the gaps between the ★: green patches (candidates: { id, lngLat, areaM2 }) of at least 300 m²
 * that score fair or better and are outside the barrier, best score first, each kept only when its circle overlaps no
 * taken circle (the ★ already shown, { lngLat, radiusM }) or earlier added site by more than 25%.
 * Returns [{ id, lngLat, areaM2, analysis }].
 */
export function fillGaps(candidates, parks, taken, { minAreaM2 = GAP_MIN_AREA_M2, minScore = GAP_MIN_SCORE } = {}) {
  const scored = candidates
    .filter((c) => c.areaM2 >= minAreaM2)
    .map((c) => ({ ...c, analysis: analyseSite({ geometry: { coordinates: c.lngLat }, properties: { areaM2: c.areaM2 } }, parks) }))
    .filter((c) => !c.analysis.crowded && c.analysis.score >= minScore && c.analysis.size)
    .sort((a, b) => b.analysis.score - a.analysis.score || a.id.localeCompare(b.id));
  const circles = [...taken];
  const added = [];
  for (const c of scored) {
    const radiusM = c.analysis.size.radiusM;
    if (circles.some((t) => circleOverlapShare(haversineM(c.lngLat, t.lngLat), radiusM, t.radiusM) > SITE_MAX_OVERLAP)) continue;
    circles.push({ lngLat: c.lngLat, radiusM });
    added.push({ id: c.id, lngLat: c.lngLat, areaM2: c.areaM2, analysis: c.analysis });
  }
  return added;
}

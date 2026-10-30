import { pointInPolygon, polygonAreaM2 } from './geo.js';
import { analysePlot } from './planting.js';
import { policyCoverage } from './policy.js';

/**
 * What the map and sidebar need about the district: its parks (only the ones inside it: parks across the border are
 * neither drawn nor counted), their sizes, the share of its land within 400 m of one of them, and every example plot's
 * planting score (good example plots: outside every 400 m ring and 60 or more).
 * focus = the district's GeoJSON geometry; parks = Park[] (all of Bangkok); plots = the abandoned FeatureCollection or null.
 */
export function analyseDistrict({ focus, parks, plots = null }) {
  const inside = parks.filter((park) => pointInPolygon(park.lngLat, focus));
  const parksBySize = { S: 0, M: 0, L: 0, XL: 0 };
  for (const park of inside) {
    if (park.size) parksBySize[park.size.key] += 1;
  }

  const results = {};
  for (const feature of plots?.features ?? []) {
    const id = String(feature.properties.id);
    const areaM2 = feature.properties.areaM2 ?? polygonAreaM2(feature.geometry);
    results[id] = analysePlot(feature.geometry, areaM2, inside);
  }
  const recommendedIds = Object.keys(results)
    .filter((id) => results[id].recommended)
    .sort((a, b) => results[b].score - results[a].score || a.localeCompare(b));
  const recommendedCounts = {
    veryGood: recommendedIds.filter((id) => results[id].level.key === 'very-good').length,
    good: recommendedIds.filter((id) => results[id].level.key === 'good').length,
  };

  return { parks: inside, parksBySize, policyShare: policyCoverage(focus, inside), plots: results, recommendedIds, recommendedCounts };
}

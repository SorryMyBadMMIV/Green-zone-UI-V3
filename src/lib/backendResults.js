// Small summaries of the backend's own results: GA park sites and green groups.

/** { zone: number of GA sites } for every 1 km square that has sites. */
export function sitesPerSquare(gaSites) {
  const counts = {};
  for (const { properties } of gaSites?.features ?? []) counts[properties.zone] = (counts[properties.zone] ?? 0) + 1;
  return counts;
}

/** How many green groups (solid circles) and isolated green circles (dashed). */
export function greenGroupStats(greenGroups) {
  const features = greenGroups?.features ?? [];
  return {
    groups: features.filter((f) => f.properties.kind === 'group').length,
    isolated: features.filter((f) => f.properties.kind === 'isolated').length,
  };
}

/** Total area (m²) of the recommended sites shown: the kept GA sites plus the sites the app added in the gaps. */
export function recommendedAreaM2(gaSites, siteAnalysis, addedSites) {
  const kept = new Set(siteAnalysis?.keptIds ?? []);
  const ga = (gaSites?.features ?? []).filter((f) => kept.has(f.properties.id)).reduce((sum, f) => sum + (f.properties.areaM2 ?? 0), 0);
  return ga + (addedSites ?? []).reduce((sum, s) => sum + (s.areaM2 ?? 0), 0);
}

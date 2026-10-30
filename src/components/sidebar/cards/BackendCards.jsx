import Card from '../../ui/Card.jsx';
import { greenGroupStats, sitesPerSquare } from '../../../lib/backendResults.js';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/**
 * The recommended sites: what the backend's genetic algorithm picked, minus the crowded ones existing parks already
 * serve, with how many of each level and in how many 1 km squares.
 */
export function RecommendedSitesCard({ district, gaSites, siteAnalysis, addedSites = [] }) {
  if (!gaSites) {
    return (
      <Card title="Recommended sites">
        <p className="text-sm text-ink">{`No GA results for ${district.nameEn} yet`}</p>
        <p className="mt-1 text-xs text-ink-3">The recommended sites come from the backend's genetic algorithm.</p>
      </Card>
    );
  }
  const { keptIds, removed, sites } = siteAnalysis;
  const kept = new Set(keptIds);
  const squares = Object.keys(sitesPerSquare({ features: gaSites.features.filter((f) => kept.has(f.properties.id)) })).length;
  const levels = { 'very-good': 0, good: 0, fair: 0, poor: 0 };
  for (const id of keptIds) levels[sites[id].level.key] += 1;
  for (const site of addedSites) levels[site.analysis.level.key] += 1;
  const total = keptIds.length + addedSites.length;
  const gaLine = `picked by the backend's genetic algorithm, in ${plural(squares, 'square', 'squares')} of 1 km`;
  return (
    <Card title="Recommended sites">
      <p className="text-lg font-semibold text-ink">{plural(total, 'recommended site', 'recommended sites')}</p>
      <p className="text-sm text-ink-2">
        {addedSites.length ? `${keptIds.length} ${gaLine}, ${addedSites.length} added by the app in the gaps` : gaLine}
      </p>
      <p className="text-sm text-ink-2">{`${levels['very-good']} very good · ${levels.good} good · ${levels.fair} fair · ${levels.poor} poor`}</p>
      {removed.total > 0 && (
        <p className="mt-1 text-xs text-ink-2">{`${removed.total} removed: ${removed.within400} less than 400 m from a park, ${removed.barrier} inside a park circle (S), ${removed.tooClose} too close to a better ★`}</p>
      )}
      {siteAnalysis.outside > 0 && <p className="text-xs text-ink-2">{`${siteAnalysis.outside} more are outside ${district.nameEn} and not shown`}</p>}
      <p className="mt-1 text-xs text-ink-3">
        Big green patches, spread out and away from official parks, each with a score from 0 to 100. Not verified public land:
        check who owns the land. Marked ★ on the map.
      </p>
    </Card>
  );
}

/** The backend's green groups in the district: green that is not a park, circled where patches lie close together. */
export function GreenGroupsCard({ district, greenGroups }) {
  const stats = greenGroupStats(greenGroups);
  return (
    <Card title="Green groups">
      <p className="text-lg font-semibold text-ink">{`${plural(stats.groups, 'group', 'groups')} · ${stats.isolated} isolated`}</p>
      <p className="text-sm text-ink-2">{`in ${district.nameEn}`}</p>
      <p className="mt-1 text-xs text-ink-3">
        Green that is not a park, grouped where patches lie close together. Dashed circles are isolated green. Turn on "Green
        groups" in Map options to see them.
      </p>
    </Card>
  );
}

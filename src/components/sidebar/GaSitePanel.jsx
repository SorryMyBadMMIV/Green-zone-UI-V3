import Card from '../ui/Card.jsx';
import InfoList from '../ui/InfoList.jsx';
import PanelHeader from './PanelHeader.jsx';
import SiteScoreCard from './cards/SiteScoreCard.jsx';
import { COLORS } from '../../lib/constants.js';
import { DASH, formatDecimal } from '../../lib/format.js';
import { REACH_LABEL } from '../../lib/parks.js';

/**
 * Sidebar content for a selected recommended site, with its score: the backend GA's candidate for a new park, or (added)
 * the best green patch the app picked in a gap between the ★.
 */
export default function GaSitePanel({ site, analysis, added = false, onClose }) {
  const rows = added
    ? [
        ['Size class', analysis.size ? `${analysis.size.key} · reaches ${REACH_LABEL[analysis.size.key]}` : DASH],
        ['Source', 'App: the best green patch in a gap between the ★ (300 m² or more, fair or better)'],
      ]
    : [
        ['Size class', analysis.size ? `${analysis.size.key} · reaches ${REACH_LABEL[analysis.size.key]}` : DASH],
        ['1 km square', site.zone],
        ['GA square score (backend)', formatDecimal(site.zoneFitness, 2)],
        ['Source', 'Backend v3, ga_parks.py'],
      ];
  return (
    <div className="space-y-3">
      <PanelHeader
        pill={added ? 'Picked by the app · not verified public land' : 'Candidate · not verified public land'}
        pillColor="#fde68a"
        pillBg="rgb(252 211 77 / 0.15)"
        title={added ? 'Added site (app)' : 'Recommended site (GA)'}
        subtitle={analysis.nearestPark ? `Nearest park: ${analysis.nearestPark.name}` : null}
        onClose={onClose}
      />
      <SiteScoreCard areaM2={site.areaM2} analysis={analysis} />
      <Card title="Info">
        <InfoList rows={rows} />
        <p className="mt-2 text-xs" style={{ color: COLORS.recommendStar }}>
          ★ Marked on the map; the dashed circle shows how far it would reach as a park. Check who owns the land before
          planning a park here.
        </p>
      </Card>
    </div>
  );
}

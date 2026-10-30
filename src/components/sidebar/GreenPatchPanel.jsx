import Card from '../ui/Card.jsx';
import InfoList from '../ui/InfoList.jsx';
import PanelHeader from './PanelHeader.jsx';
import SiteScoreCard from './cards/SiteScoreCard.jsx';
import { DASH, formatNumber } from '../../lib/format.js';
import { REACH_LABEL } from '../../lib/parks.js';

/** Sidebar content for a clicked green patch of the backend green layer, scored like a recommended site. */
export default function GreenPatchPanel({ patch, analysis, onClose }) {
  return (
    <div className="space-y-3">
      <PanelHeader
        pill="Green patch · not verified public land"
        pillColor="#86efac"
        pillBg="rgb(34 197 94 / 0.15)"
        title="Green patch"
        subtitle={analysis.nearestPark ? `Nearest park: ${analysis.nearestPark.name}` : null}
        onClose={onClose}
      />
      <SiteScoreCard areaM2={patch.areaM2} analysis={analysis} />
      <Card title="Info">
        <InfoList
          rows={[
            ['Size class', analysis.size ? `${analysis.size.key} · reaches ${REACH_LABEL[analysis.size.key]}` : DASH],
            ['Already served by a park', analysis.crowded ? 'Yes: inside a park circle (S) or less than 400 m from a park' : 'No'],
            ['Pixels in the green layer', formatNumber(patch.pixels)],
            ['Source', 'Backend green (THEOS-2), 3.5 m pixels'],
          ]}
        />
        <p className="mt-2 text-xs text-ink-3">
          Any green patch can be scored this way. The dashed circle shows how far it would reach as a park. The area comes from
          the 3.5 m green layer, so small patches are only roughly measured.
        </p>
      </Card>
    </div>
  );
}

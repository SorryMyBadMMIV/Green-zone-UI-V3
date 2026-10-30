import HalfPieGauge from '../../charts/HalfPieGauge.jsx';
import Card from '../../ui/Card.jsx';
import InfoList from '../../ui/InfoList.jsx';
import { SITE_SCORE_POINTS } from '../../../lib/constants.js';
import { formatArea, formatKm, formatPercent } from '../../../lib/format.js';

const LEVEL_COLOR = { 'very-good': '#16a34a', good: '#84cc16', fair: '#f59e0b', poor: '#dc2626' };

/** A site's (or green patch's) 0–100 score and its three parts: far from parks, not overlapping park circles, size. */
export default function SiteScoreCard({ areaM2, analysis }) {
  const { score, level, parts, nearestPark, freeShare } = analysis;
  return (
    <Card title="Site score">
      <HalfPieGauge
        fraction={score / 100}
        color={LEVEL_COLOR[level.key]}
        value={String(score)}
        unit="out of 100"
        label={`Site score ${score} out of 100. ${level.label}.`}
      />
      <p className="mt-1 text-center text-sm font-medium text-ink">{level.label}</p>
      <div className="mt-2">
        <InfoList
          rows={[
            ['Far from parks', `${parts.distance} of ${SITE_SCORE_POINTS.distance} · ${nearestPark ? `nearest park ${formatKm(nearestPark.distanceM / 1000)}` : 'no park nearby'}`],
            ['Not overlapping parks', `${parts.overlap} of ${SITE_SCORE_POINTS.overlap} · ${formatPercent(freeShare)} of its circle is free`],
            ['Size', `${parts.size} of ${SITE_SCORE_POINTS.size} · ${formatArea(areaM2)}`],
          ]}
        />
      </div>
      <p className="mt-2 text-xs text-ink-3">
        Full points at 1 km or more from the nearest park, when no park circle (S, M or L) covers any of its own circle, and at
        16,000 m² or more.
      </p>
    </Card>
  );
}

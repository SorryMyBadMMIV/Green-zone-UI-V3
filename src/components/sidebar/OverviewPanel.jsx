import HalfPieGauge from '../charts/HalfPieGauge.jsx';
import Card from '../ui/Card.jsx';
import InfoList from '../ui/InfoList.jsx';
import StatPair from '../ui/StatPair.jsx';
import { GreenGroupsCard, RecommendedSitesCard } from './cards/BackendCards.jsx';
import { DistrictFactsCard, ExampleScoreCard, GreenPerPersonCard, ParksBySizeCard, PolicyCoverageCard } from './cards/DistrictCards.jsx';
import { recommendedAreaM2 } from '../../lib/backendResults.js';
import { COLORS } from '../../lib/constants.js';
import { formatKm2, formatLatLng, formatNumber, formatPercent } from '../../lib/format.js';
import { frameCenter, frameRing, polygonAreaM2 } from '../../lib/geo.js';

const IMAGE_GREY = '#9ca3af';
const CORNERS = [
  ['Top-left', 'topLeft'],
  ['Top-right', 'topRight'],
  ['Bottom-left', 'bottomLeft'],
  ['Bottom-right', 'bottomRight'],
];

function Swatch({ color }) {
  return <span className="size-2.5 shrink-0 rounded-sm" style={{ background: color }} aria-hidden="true" />;
}

/** Green found by the backend in the satellite image. */
function BackendGreenCard({ frame, summary }) {
  const share = summary.validM2 > 0 ? summary.greenM2 / summary.validM2 : null;
  return (
    <Card title={`Green in the ${frame.label} image`}>
      <HalfPieGauge
        fraction={share}
        color={COLORS.greenImage}
        trackColor={IMAGE_GREY}
        value={formatPercent(share)}
        unit="of the image is green"
        label={`${formatPercent(share)} of the ${frame.label} image is green.`}
      />
      <ul className="mt-2 space-y-1 text-sm">
        <li className="flex items-center gap-2">
          <Swatch color={COLORS.greenImage} />
          <span className="text-ink">Green</span>
          <span className="ml-auto tabular-nums text-ink">{formatKm2(summary.greenM2)}</span>
        </li>
        <li className="flex items-center gap-2">
          <Swatch color={IMAGE_GREY} />
          <span className="text-ink">Whole image</span>
          <span className="ml-auto tabular-nums text-ink">{formatKm2(summary.validM2)}</span>
        </li>
        <li className="text-xs text-ink-3">{formatNumber(summary.patches)} green patches · THEOS-2 detection by the backend</li>
      </ul>
    </Card>
  );
}

/** Sidebar content before anything is selected: the district's green, area, facts, parks, policy and backend results. */
export default function OverviewPanel({ district, analysis, gaSites, siteAnalysis, addedSites, greenGroups }) {
  const { frame } = district;
  const focus = district.boundaries.features.find((f) => f.properties.role === 'focus');
  const districtM2 = polygonAreaM2(focus.geometry);
  const frameM2 = polygonAreaM2({ type: 'Polygon', coordinates: [frameRing(frame.corners)] });

  return (
    <div className="space-y-3">
      <header>
        <h2 className="text-xl font-semibold text-ink">{district.nameEn} overview</h2>
        <p className="text-sm text-ink-3">{`Click a park${gaSites ? ', a ★' : ''}, a red plot or a green group on the map to see its details.`}</p>
      </header>
      <BackendGreenCard frame={frame} summary={district.greenSummary} />
      <Card title="Area">
        <StatPair
          items={[
            { label: `Image ${frame.label}`, value: formatKm2(frameM2) },
            { label: `${district.nameEn} district`, value: formatKm2(districtM2) },
          ]}
          note={`The ${frame.label} image covers ${district.nameEn} and parts of its neighbours.`}
        />
      </Card>
      <DistrictFactsCard district={district} />
      <ParksBySizeCard district={district} parksBySize={analysis.parksBySize} />
      <PolicyCoverageCard district={district} policyShare={analysis.policyShare} />
      <RecommendedSitesCard district={district} gaSites={gaSites} siteAnalysis={siteAnalysis} addedSites={addedSites ?? []} />
      {siteAnalysis && (
        <GreenPerPersonCard
          district={district}
          sites={siteAnalysis.keptIds.length + (addedSites?.length ?? 0)}
          sitesM2={recommendedAreaM2(gaSites, siteAnalysis, addedSites)}
        />
      )}
      {district.data.abandoned && <ExampleScoreCard count={analysis.recommendedIds.length} counts={analysis.recommendedCounts} />}
      {greenGroups && <GreenGroupsCard district={district} greenGroups={greenGroups} />}
      <Card title="Frame info">
        <InfoList
          rows={[
            ['Center', formatLatLng(frameCenter(frame.corners))],
            ...CORNERS.map(([label, key]) => [label, formatLatLng(frame.corners[key])]),
            ['Source', frame.source],
          ]}
        />
        {frame.note && <p className="mt-2 text-xs text-ink-3">{frame.note}</p>}
      </Card>
    </div>
  );
}

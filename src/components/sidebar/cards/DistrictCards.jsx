import Card from '../../ui/Card.jsx';
import StatPair from '../../ui/StatPair.jsx';
import { TARGET_M2_PER_PERSON } from '../../../lib/constants.js';
import { districtFacts, greenPerPerson } from '../../../lib/districtFacts.js';
import { formatArea, formatDecimal, formatNumber, formatPercent } from '../../../lib/format.js';

/** Population and green space per person for the district (BMA figures), with its rank among the 50 districts. */
export function DistrictFactsCard({ district }) {
  const facts = districtFacts(district.nameTh);
  if (!facts) return null;
  return (
    <Card title="District facts">
      <StatPair
        items={[
          { label: 'People', value: formatNumber(facts.population) },
          { label: 'Green per person', value: `${formatDecimal(facts.greenPerPersonM2, 2)} m²` },
        ]}
        note={`Parks people can use: ${formatDecimal(facts.accessiblePerPersonM2, 2)} m² per person. Rank ${facts.rank} of ${facts.of} districts for green per person. Source: BMA Office of Environment via Rocket Media Lab.`}
      />
    </Card>
  );
}

/** How many parks of each size class are inside the district. */
export function ParksBySizeCard({ district, parksBySize }) {
  const { S, M, L, XL } = parksBySize;
  return (
    <Card title="Parks by size">
      <p className="text-lg font-semibold tabular-nums text-ink">{`S ${S} · M ${M} · L ${L} · XL ${XL}`}</p>
      <p className="mt-1 text-xs text-ink-3">
        Parks inside {district.nameEn}. Reach: S 500 m, M 1 km, L 3 km, XL 5 km. Parks in nearby districts also reach it and are drawn on the map.
      </p>
    </Card>
  );
}

/** Share of the district's land within 400 m of a park (Green Bangkok 2030 / 15-minute parks). */
export function PolicyCoverageCard({ district, policyShare }) {
  return (
    <Card title="Within 400 m of a park">
      <p className="text-lg font-semibold text-ink">{`${formatPercent(policyShare)} of ${district.nameEn} is within 400 m of a park`}</p>
      <p className="mt-1 text-xs text-ink-3">The policy: a park within 400 m. Straight-line distance, not walking distance.</p>
    </Card>
  );
}

/** The frontend's own score on the example plots: how many are outside every 400 m ring and score 60 or more. */
export function ExampleScoreCard({ count, counts }) {
  return (
    <Card title="Example plot score">
      <p className="text-lg font-semibold text-ink">{`${count} good example ${count === 1 ? 'plot' : 'plots'}`}</p>
      <p className="text-sm text-ink-2">{`${counts.veryGood} very good · ${counts.good} good`}</p>
      <p className="mt-1 text-xs text-ink-3">
        Example data: OpenStreetMap plots the frontend scores (outside every 400 m ring and 60 or more). Not the recommendations.
        Turn on "Example plot score" in Map options to see them as ✓.
      </p>
    </Card>
  );
}

function PerPersonBar({ label, value, max, color }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-ink-2">{label}</span>
        <span className="font-semibold tabular-nums text-ink">{`${formatDecimal(value, 2)} m²`}</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-white/10">
        <div className="h-2 rounded-full" style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} />
      </div>
    </div>
  );
}

/** Green space per person now, and if the recommended sites (count of them, sitesM2 in total) became parks. */
export function GreenPerPersonCard({ district, sites, sitesM2 }) {
  const facts = districtFacts(district.nameTh);
  if (!facts) return null;
  const now = greenPerPerson(facts);
  const withSites = greenPerPerson(facts, sitesM2);
  const max = Math.max(TARGET_M2_PER_PERSON, withSites);
  return (
    <Card title="Green per person">
      <div className="space-y-2">
        <PerPersonBar label="Now" value={now} max={max} color="#9ca3af" />
        <PerPersonBar label={`With the ${sites} recommended ${sites === 1 ? 'site' : 'sites'} as parks`} value={withSites} max={max} color="#22c55e" />
      </div>
      <p className="mt-2 text-xs text-ink-3">
        {`+${formatDecimal(withSites - now, 2)} m² per person from ${formatArea(sitesM2)} of new parks, for ${formatNumber(facts.population)} people. `}
        {`Bangkok's target: ${TARGET_M2_PER_PERSON} m² per person. Source: BMA Office of Environment via Rocket Media Lab.`}
      </p>
    </Card>
  );
}

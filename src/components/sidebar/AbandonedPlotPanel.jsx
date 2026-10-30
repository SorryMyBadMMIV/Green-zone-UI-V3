import Card from '../ui/Card.jsx';
import InfoList from '../ui/InfoList.jsx';
import StatPair from '../ui/StatPair.jsx';
import PanelHeader from './PanelHeader.jsx';
import PlantingScoreCard from './cards/PlantingScoreCard.jsx';
import { COLORS } from '../../lib/constants.js';
import { DASH, formatArea } from '../../lib/format.js';

/**
 * Sidebar content for a selected red plot (abandoned land, example data from OpenStreetMap): its planting score, its
 * area, how it was chosen and where it comes from.
 */
export default function AbandonedPlotPanel({ plot, analysis, onClose }) {
  return (
    <div className="space-y-3">
      <PanelHeader
        pill={plot.isExample ? 'Abandoned land · example' : 'Abandoned land'}
        pillColor="#fca5a5"
        pillBg="rgb(220 38 38 / 0.18)"
        title={`Site ${plot.id}`}
        subtitle={[plot.district, plot.landCover ?? 'open land'].filter(Boolean).join(' · ')}
        onClose={onClose}
      />
      {analysis && <PlantingScoreCard analysis={analysis} />}
      <Card title="Area">
        <StatPair items={[{ label: 'Site area', value: formatArea(plot.areaM2) }]} />
      </Card>
      <Card title="How it was chosen">
        <p className="text-sm text-ink-2">
          Example data from OpenStreetMap, not a backend detection. A plot was taken when its OpenStreetMap tag is
          brownfield, construction, greenfield or vacant land ("concrete or soil") or scrub or meadow ("overgrown"), it is
          at least 200 m², and it lies inside Suan Luang and the image. Plots inside parks, sports grounds, schools,
          temples, hospitals, military land or cemeteries were left out.
        </p>
        <p className="mt-2 text-xs" style={{ color: COLORS.abandonedFill }}>
          Buildings were not checked, and OpenStreetMap can be out of date: check the satellite photo before using a plot.
        </p>
      </Card>
      <Card title="Info">
        <InfoList
          rows={[
            ['Land now', plot.landCover ?? DASH],
            ['Data', plot.isExample ? 'Example data (OpenStreetMap land use)' : 'Backend'],
            ...(plot.updatedAt ? [['Updated', plot.updatedAt]] : []),
          ]}
        />
      </Card>
    </div>
  );
}

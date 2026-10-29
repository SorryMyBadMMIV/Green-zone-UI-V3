import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { formatArea } from '../../lib/format.js';

const icon = (selected) =>
  L.divIcon({
    className: `recommend-star${selected ? ' is-selected' : ''}`,
    html: '<span aria-hidden="true">★</span>',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
const STAR = icon(false);
const SELECTED_STAR = icon(true);

/** The ★ tooltip: a recommended site from the backend GA, its rank in its 1 km square and its area. */
export function recommendLabel(site, sitesInSquare) {
  return `★ Recommended site (GA) · rank ${site.rank}${sitesInSquare ? ` of ${sitesInSquare}` : ''} in its 1 km square · ${formatArea(site.areaM2)}`;
}

/** A ★ on every site the backend's genetic algorithm recommends; clicking one selects it. */
export default function RecommendMarkers({ gaSites, sitesInSquare, selected, onSelect }) {
  return gaSites.features.map(({ geometry, properties: site }) => {
    const isSelected = selected?.kind === 'ga' && selected.id === site.id;
    return (
      <Marker
        key={site.id}
        position={[geometry.coordinates[1], geometry.coordinates[0]]}
        icon={isSelected ? SELECTED_STAR : STAR}
        zIndexOffset={isSelected ? 1000 : 0}
        keyboard={false}
        bubblingMouseEvents={false}
        eventHandlers={{ click: () => onSelect({ kind: 'ga', id: site.id }) }}
      >
        <Tooltip direction="top" offset={[0, -12]}>
          {recommendLabel(site, sitesInSquare[site.zone])}
        </Tooltip>
      </Marker>
    );
  });
}

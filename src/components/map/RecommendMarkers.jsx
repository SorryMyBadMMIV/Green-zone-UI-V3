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

/** The ★ tooltip: a recommended site from the backend GA (or added by the app in a gap), its score, level and area. */
export function recommendLabel(site, analysis, added = false) {
  return `★ ${added ? 'Added site (app)' : 'Recommended site (GA)'} · score ${analysis.score} · ${analysis.level.label} · ${formatArea(site.areaM2)}`;
}

function Star({ id, kind, lngLat, label, selected, onSelect }) {
  const isSelected = selected?.kind === kind && selected.id === id;
  return (
    <Marker
      position={[lngLat[1], lngLat[0]]}
      icon={isSelected ? SELECTED_STAR : STAR}
      zIndexOffset={isSelected ? 1000 : 0}
      keyboard={false}
      bubblingMouseEvents={false}
      eventHandlers={{ click: () => onSelect({ kind, id }) }}
    >
      <Tooltip direction="top" offset={[0, -12]}>
        {label}
      </Tooltip>
    </Marker>
  );
}

/**
 * A ★ on every site the backend's genetic algorithm recommends, except the ones removed (siteAnalysis.keptIds), and on
 * every site the app added in the gaps between them (addedSites); clicking one selects it.
 */
export default function RecommendMarkers({ gaSites, siteAnalysis, addedSites, selected, onSelect }) {
  const kept = new Set(siteAnalysis.keptIds);
  return (
    <>
      {gaSites.features
        .filter((f) => kept.has(f.properties.id))
        .map(({ geometry, properties: site }) => (
          <Star
            key={site.id}
            id={site.id}
            kind="ga"
            lngLat={geometry.coordinates}
            label={recommendLabel(site, siteAnalysis.sites[site.id])}
            selected={selected}
            onSelect={onSelect}
          />
        ))}
      {(addedSites ?? []).map((site) => (
        <Star
          key={site.id}
          id={site.id}
          kind="added"
          lngLat={site.lngLat}
          label={recommendLabel(site, site.analysis, true)}
          selected={selected}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

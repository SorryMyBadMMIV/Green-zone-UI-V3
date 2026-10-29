import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';

const CHECK = L.divIcon({ className: 'example-mark', html: '<span aria-hidden="true">✓</span>', iconSize: [18, 18], iconAnchor: [9, 9] });

/** The ✓ tooltip: an example plot the frontend scores good or better. */
export function exampleMarkLabel({ score, level }) {
  return `✓ Good example plot · ${level.label} · score ${score}`;
}

/**
 * A small ✓ on every example plot the frontend's own rule rates good (outside every 400 m ring, score 60 or more).
 * Not a recommendation: the recommendations are the backend GA sites (★). Clicking a ✓ selects the plot.
 */
export default function ExampleScoreMarks({ analysis, onSelect }) {
  return analysis.recommendedIds.map((id) => {
    const plot = analysis.plots[id];
    return (
      <Marker
        key={id}
        position={[plot.point[1], plot.point[0]]}
        icon={CHECK}
        keyboard={false}
        bubblingMouseEvents={false}
        eventHandlers={{ click: () => onSelect({ kind: 'grey', id }) }}
      >
        <Tooltip direction="top" offset={[0, -8]}>
          {exampleMarkLabel(plot)}
        </Tooltip>
      </Marker>
    );
  });
}

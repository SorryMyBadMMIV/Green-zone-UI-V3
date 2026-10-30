import { useId } from 'react';
import { Minus } from 'lucide-react';
import { COLORS } from '../../lib/constants.js';

/** What the map shows when the app opens. */
export const DEFAULT_OPTIONS = {
  S: true,
  M: true,
  L: true,
  XL: false,
  policy: false,
  recommend: true,
  siteCircles: false,
  exampleScore: false,
  green: true,
  abandoned: true,
  greenGroups: false,
  basemap: 'satellite',
};

const ring = (color, dashed = false) => (
  <span className="size-3.5 rounded-full" style={{ borderWidth: 2, borderStyle: dashed ? 'dashed' : 'solid', borderColor: color }} aria-hidden="true" />
);

const PARK_CLASSES = [
  { key: 'S', label: 'S · 500 m', color: COLORS.parkS },
  { key: 'M', label: 'M · 1 km', color: COLORS.parkM },
  { key: 'L', label: 'L · 3 km', color: COLORS.parkL },
  { key: 'XL', label: 'XL · 5 km', color: COLORS.parkXL, dashed: true },
];

// Show items are marked with symbols, never with colour squares or coloured rings, so they can't be mistaken for park
// circles.
const STAR = (
  <span
    data-testid="swatch-recommend"
    className="flex size-4 items-center justify-center rounded-full bg-neutral-900 text-[10px] leading-none text-amber-300"
    aria-hidden="true"
  >
    ★
  </span>
);
const DASHED_RING = (
  <span
    data-testid="swatch-policy"
    className="size-3.5 rounded-full"
    style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: '#475569' }}
    aria-hidden="true"
  />
);
const CHECK = (
  <span
    data-testid="swatch-example"
    className="flex size-4 items-center justify-center rounded-full border border-slate-600 bg-slate-50 text-[9px] font-bold leading-none text-slate-700"
    aria-hidden="true"
  >
    ✓
  </span>
);
const STAR_RING = (
  <span className="size-3.5 rounded-full" style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: '#d97706' }} aria-hidden="true" />
);
const square = (color) => <span className="size-3 rounded-sm" style={{ background: color }} aria-hidden="true" />;

/** One switch: checkbox, symbol, name and an optional one-line explanation. The whole row toggles it. */
function Check({ name, label, swatch, help, options, onOptionChange }) {
  const helpId = useId();
  return (
    <label className="flex cursor-pointer items-start gap-2 py-0.5">
      <input
        type="checkbox"
        aria-label={label}
        aria-describedby={help ? helpId : undefined}
        className="mt-0.5 size-4 shrink-0 accent-neutral-800"
        checked={Boolean(options[name])}
        onChange={(event) => onOptionChange(name, event.target.checked)}
      />
      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">{swatch}</span>
      <span className="min-w-0 leading-tight">
        {label}
        {help && (
          <span id={helpId} className="block text-xs text-neutral-500">
            {help}
          </span>
        )}
      </span>
    </label>
  );
}

const headingClass = 'mb-0.5 mt-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500';

/**
 * The floating "Map options" panel at the top right of the map: park circles by size, Show (policy, the backend GA's
 * recommended sites, the example plot score), Layers (the backend's green, the red example plots, green groups) and the
 * base map. A district drop-down appears
 * only when there is more than one district. The – button folds the panel into a small pill.
 */
export default function MapOptions({ district, districts, onDistrictChange, options, onOptionChange, collapsed, onCollapsedChange }) {
  const id = useId();
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => onCollapsedChange(false)}
        className="absolute right-3 top-3 z-[1000] rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 shadow-md hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-blue-600"
      >
        ⚙ Map options · {district.nameEn}
      </button>
    );
  }
  const check = (name, label, swatch, help) => (
    <Check key={name} name={name} label={label} swatch={swatch} help={help} options={options} onOptionChange={onOptionChange} />
  );
  return (
    <section
      aria-label="Map options"
      className="absolute right-3 top-3 z-[1000] max-h-[calc(100%-1.5rem)] w-60 overflow-y-auto rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-neutral-800 shadow-md"
    >
      <div className="flex items-center justify-between">
        <p className="font-semibold">Map options</p>
        <button
          type="button"
          onClick={() => onCollapsedChange(true)}
          aria-label="Minimize map options"
          title="Minimize"
          className="flex size-7 items-center justify-center rounded-md border border-black/10 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          <Minus size={14} aria-hidden="true" />
        </button>
      </div>

      {districts.length > 1 && (
        <>
          <label htmlFor={`${id}-district`} className={headingClass}>
            District
          </label>
          <select
            id={`${id}-district`}
            value={district.id}
            onChange={(event) => onDistrictChange(event.target.value)}
            className="mt-0.5 w-full rounded-md border border-black/15 bg-white px-2 py-1"
          >
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nameEn}
              </option>
            ))}
          </select>
        </>
      )}

      <p className={headingClass}>Park circles</p>
      {PARK_CLASSES.map(({ key, label, color, dashed }) => check(key, label, ring(color, dashed)))}

      <p className={headingClass}>Show</p>
      {check('policy', 'Policy · 400 m', DASHED_RING, 'Shades land more than 400 m from a park')}
      {district.data.gaSites && check('recommend', 'Recommend', STAR, "Sites the backend's genetic algorithm picked")}
      {district.data.gaSites && check('siteCircles', '★ reach circles', STAR_RING, "Draw every ★'s circle at once")}
      {district.data.abandoned && check('exampleScore', 'Example plot score', CHECK, '✓ on red plots outside 400 m that score 60 or more')}

      <p className={headingClass}>Layers</p>
      {check('green', 'Green', square(COLORS.greenImage), 'Green the backend found in the image · zoom in to click a patch')}
      {district.data.abandoned && check('abandoned', 'Abandoned land', square(COLORS.abandonedFill), 'Example plots from OpenStreetMap, not the backend')}
      {district.data.greenGroups && check('greenGroups', 'Green groups', ring(COLORS.greenGroup), "Circles around green that isn't a park")}

      <label htmlFor={`${id}-basemap`} className={headingClass}>
        Base map
      </label>
      <select
        id={`${id}-basemap`}
        value={options.basemap}
        onChange={(event) => onOptionChange('basemap', event.target.value)}
        className="mb-1 mt-0.5 w-full rounded-md border border-black/15 bg-white px-2 py-1"
      >
        <option value="satellite">Satellite</option>
        <option value="street">Map</option>
      </select>
    </section>
  );
}

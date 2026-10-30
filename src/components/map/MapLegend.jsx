import { useEffect, useRef } from 'react';
import { COLORS } from '../../lib/constants.js';
import { PARK_COLORS } from './ParkLayers.jsx';

function Swatch({ color, outline = false, dashed = false, round = false }) {
  const style = outline ? { border: `2px ${dashed ? 'dashed' : 'solid'} ${color}` } : { background: color };
  return <span className={`size-3 shrink-0 ${round ? 'rounded-full' : 'rounded-sm'}`} style={style} aria-hidden="true" />;
}

const Row = ({ children }) => <p className="flex items-center gap-2">{children}</p>;

/** Floating legend (bottom-left of the map). Click "Legend" to fold or unfold it. */
export default function MapLegend({ district }) {
  const ref = useRef(null);

  // Open on desktop, folded on phones (where it would cover a big part of the small map).
  // Follows the breakpoint when the screen size changes; in between, the user's choice stays.
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const sync = () => {
      if (ref.current) ref.current.open = desktop.matches;
    };
    sync();
    desktop.addEventListener('change', sync);
    return () => desktop.removeEventListener('change', sync);
  }, []);

  return (
    <details
      ref={ref}
      className="group absolute bottom-6 left-3 z-[1000] max-h-[calc(100%-6rem)] overflow-y-auto rounded-lg border border-black/10 bg-white px-3 py-2 text-xs text-neutral-800 shadow-md"
    >
      <summary className="cursor-pointer select-none font-semibold group-open:mb-1">Legend</summary>
      <p className="mb-1 font-semibold">Parks</p>
      <Row>
        <Swatch color={PARK_COLORS.S} round />
        Park (dot colour = size)
      </Row>
      <Row>
        <Swatch color={PARK_COLORS.S} outline round />S · 500 m
        <Swatch color={PARK_COLORS.M} outline round />M · 1 km
      </Row>
      <Row>
        <Swatch color={PARK_COLORS.L} outline round />L · 3 km
        <Swatch color={PARK_COLORS.XL} outline dashed round />XL · 5 km
      </Row>
      <p className="mb-1 mt-2 font-semibold">Policy</p>
      <Row>
        <Swatch color="#64748b" outline dashed round />
        400 m from a park
      </Row>
      <Row>
        <Swatch color={COLORS.policyShade} />
        Not within 400 m
      </Row>
      {district?.data.abandoned && (
        <>
          <p className="mb-1 mt-2 font-semibold">Abandoned land (example)</p>
          <Row>
            <Swatch color={COLORS.abandonedFill} />
            Plot from OpenStreetMap
          </Row>
          <Row>
            <span className="flex size-4 shrink-0 items-center justify-center rounded-full border border-slate-600 bg-slate-50 text-[9px] font-bold text-slate-700" aria-hidden="true">
              ✓
            </span>
            Good example plot (off at start)
          </Row>
        </>
      )}
      <p className="mb-1 mt-2 font-semibold">Backend results</p>
      {district?.data.gaSites && (
        <Row>
          <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[10px] text-amber-300" aria-hidden="true">
            ★
          </span>
          Recommended site (GA, or added by the app)
        </Row>
      )}
      {district?.data.gaSites && (
        <Row>
          <Swatch color={COLORS.recommendStar} outline dashed round />
          Its reach as a park (click a ★, or ★ reach circles)
        </Row>
      )}
      <Row>
        <Swatch color={COLORS.greenImage} />
        Green in the image (zoom in, then click a patch)
      </Row>
      {district?.data.greenGroups && (
        <Row>
          <Swatch color={COLORS.greenGroup} outline round />
          Green group
          <Swatch color={COLORS.greenGroup} outline dashed round />
          Isolated green
        </Row>
      )}
      <Row>
        <Swatch color={COLORS.mask} />
        Other districts: update soon
      </Row>
    </details>
  );
}

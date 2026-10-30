import { ChevronsLeft, ChevronsRight, Leaf } from 'lucide-react';
import { COLORS } from '../../lib/constants.js';
import ErrorCard from '../ui/ErrorCard.jsx';
import AbandonedPlotPanel from './AbandonedPlotPanel.jsx';
import LoadingCards from '../ui/LoadingCards.jsx';
import GaSitePanel from './GaSitePanel.jsx';
import GreenGroupPanel from './GreenGroupPanel.jsx';
import GreenPatchPanel from './GreenPatchPanel.jsx';
import OverviewPanel from './OverviewPanel.jsx';
import ParkPanel from './ParkPanel.jsx';

/** Properties of the selected site, plot or group, or null if nothing is selected or it is not in the data. */
function findSelected(selected, collections) {
  const collection = selected ? collections[selected.kind] : null;
  return collection?.features.find((f) => f.properties.id === selected.id)?.properties ?? null;
}

function SidebarBody({ district, analysis, abandoned, parkChecks, gaSites, siteAnalysis, addedSites, patchAnalysis, greenGroups, status, error, selected, onClear, onRetry }) {
  if (status === 'loading') return <LoadingCards />;
  if (status === 'error') return <ErrorCard error={error} onRetry={onRetry} />;
  if (selected?.kind === 'park') {
    const park = analysis?.parks.find((p) => p.id === selected.id);
    if (park) {
      const check = parkChecks?.features.find((f) => f.properties.name === park.name)?.properties ?? null;
      return <ParkPanel park={park} check={check} onClose={onClear} />;
    }
  }
  if (selected?.kind === 'patch' && selected.patch && patchAnalysis) {
    return <GreenPatchPanel patch={selected.patch} analysis={patchAnalysis} onClose={onClear} />;
  }
  if (selected?.kind === 'added') {
    const site = addedSites?.find((s) => s.id === selected.id);
    if (site) return <GaSitePanel site={site} analysis={site.analysis} added onClose={onClear} />;
  }
  const item = findSelected(selected, { ga: gaSites, plot: abandoned, group: greenGroups });
  if (item && selected.kind === 'plot') return <AbandonedPlotPanel plot={item} analysis={analysis.plots[item.id] ?? null} onClose={onClear} />;
  if (item && selected.kind === 'ga' && siteAnalysis?.sites[item.id]) {
    return <GaSitePanel site={item} analysis={siteAnalysis.sites[item.id]} onClose={onClear} />;
  }
  if (item && selected.kind === 'group') return <GreenGroupPanel group={item} onClose={onClear} />;
  return (
    <OverviewPanel district={district} analysis={analysis} gaSites={gaSites} siteAnalysis={siteAnalysis} addedSites={addedSites} greenGroups={greenGroups} />
  );
}

const toggleClass =
  'flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/15 text-ink-2 hover:bg-white/10 hover:text-ink focus-visible:outline-2 focus-visible:outline-white';

/** Left column: app header + the overview or the selected park, site, plot or group. The « button folds it away. */
export default function Sidebar({ collapsed, onCollapsedChange, ...props }) {
  if (collapsed) {
    return (
      <aside aria-label="Zone statistics" className="flex bg-app p-2 lg:h-dvh lg:flex-col lg:items-center lg:border-r lg:border-line">
        <button type="button" className={toggleClass} aria-label="Open sidebar" title="Open sidebar" onClick={() => onCollapsedChange(false)}>
          <ChevronsRight size={18} aria-hidden="true" />
        </button>
      </aside>
    );
  }
  return (
    <aside
      aria-label="Zone statistics"
      className="flex flex-col gap-4 bg-app p-4 lg:h-dvh lg:overflow-y-auto lg:border-r lg:border-line"
    >
      <header className="flex items-center gap-3 border-b border-line pb-4">
        <Leaf size={26} color={COLORS.greenZoneFill} aria-hidden="true" />
        <div className="min-w-0">
          <h1 className="text-base font-semibold leading-tight text-ink">Green Lantern</h1>
          <p className="text-xs text-ink-3">{props.district.nameEn} green space explorer</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="rounded-md border border-white/20 px-2 py-0.5 text-xs text-ink-2" title="Satellite data: THEOS-2 (GISTDA)">
            THEOS-2
          </span>
          <button type="button" className={toggleClass} aria-label="Minimize sidebar" title="Minimize sidebar" onClick={() => onCollapsedChange(true)}>
            <ChevronsLeft size={18} aria-hidden="true" />
          </button>
        </div>
      </header>
      <SidebarBody {...props} />
    </aside>
  );
}

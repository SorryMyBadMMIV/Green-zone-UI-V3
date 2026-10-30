import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_OPTIONS } from './components/map/MapOptions.jsx';
import ZoneMap from './components/map/ZoneMap.jsx';
import Sidebar from './components/sidebar/Sidebar.jsx';
import useMapData from './hooks/useMapData.js';
import { DEFAULT_DISTRICT_ID, DISTRICTS, getDistrict } from './data/districts.js';
import parkList from './data/parks.json';
import { analyseDistrict } from './lib/district.js';
import { pointInPolygon, pointsInside } from './lib/geo.js';
import { analyseSite, analyseSites, fillGaps } from './lib/sites.js';
import { allPatches } from './lib/greenMask.js';
import useGreenMask from './hooks/useGreenMask.js';
import { loadParks } from './lib/parks.js';

const ALL_PARKS = loadParks(parkList);
const focusOf = (district) => district.boundaries.features.find((f) => f.properties.role === 'focus').geometry;
// Hiding a layer clears a selection of its kinds.
const LAYER_KINDS = { recommend: ['ga', 'added'], green: ['patch'], abandoned: ['plot'], greenGroups: ['group'] };
const isPhone = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && !window.matchMedia('(min-width: 1024px)').matches;

export default function App() {
  const [districtId, setDistrictId] = useState(DEFAULT_DISTRICT_ID);
  const district = getDistrict(districtId);
  const { status, error, abandoned, parkChecks, gaSites, greenGroups: allGreenGroups, version, reload } = useMapData(district);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Parks reaching the district, park sizes, the share within 400 m of a park and every example plot's planting score.
  const analysis = useMemo(() => analyseDistrict({ focus: focusOf(district), parks: ALL_PARKS, plots: abandoned }), [district, abandoned]);
  // Only what lies inside the district is shown: recommended sites (★) scored against the district's own parks (the
  // crowded ones are left out), and the green groups whose centre is inside it.
  const siteAnalysis = useMemo(
    () => (gaSites ? analyseSites(gaSites, analysis.parks, focusOf(district)) : null),
    [gaSites, analysis, district],
  );
  const greenGroups = useMemo(() => pointsInside(allGreenGroups, focusOf(district)), [allGreenGroups, district]);
  // The green layer as pixels: for clicking green patches and for filling the gaps between the ★ with the best patch.
  const greenMask = useGreenMask(district.images.green, true);
  const addedSites = useMemo(() => {
    if (!greenMask || !siteAnalysis || !gaSites) return null;
    const focus = focusOf(district);
    const patches = allPatches(greenMask.mask, greenMask.width, greenMask.height, district.frame).filter((p) => pointInPolygon(p.lngLat, focus));
    const taken = gaSites.features
      .filter((f) => siteAnalysis.keptIds.includes(f.properties.id) && siteAnalysis.sites[f.properties.id].size)
      .map((f) => ({ lngLat: f.geometry.coordinates, radiusM: siteAnalysis.sites[f.properties.id].size.radiusM }));
    return fillGaps(patches, analysis.parks, taken);
  }, [greenMask, siteAnalysis, gaSites, district, analysis]);
  const [selected, setSelected] = useState(null); // { kind: 'park' | 'ga' | 'plot' | 'group' | 'patch', id, patch? } or null
  // A clicked green patch is scored like a recommended site.
  const patchAnalysis = useMemo(
    () =>
      selected?.kind === 'patch'
        ? analyseSite({ geometry: { coordinates: selected.patch.lngLat }, properties: { areaM2: selected.patch.areaM2 } }, analysis.parks)
        : null,
    [selected, analysis],
  );
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  // On phones the options panel starts folded so it doesn't cover the small map.
  const [optionsCollapsed, setOptionsCollapsed] = useState(isPhone);

  const clearSelection = useCallback(() => setSelected(null), []);

  const changeDistrict = useCallback((id) => {
    setSelected(null);
    setDistrictId(id);
  }, []);

  const changeOption = useCallback((key, value) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
    // Never keep showing stats for a zone the user just hid.
    if (value === false && LAYER_KINDS[key]) setSelected((current) => (LAYER_KINDS[key].includes(current?.kind) ? null : current));
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div
      className={`flex min-h-dvh flex-col-reverse lg:grid lg:h-dvh ${
        sidebarCollapsed ? 'lg:grid-cols-[48px_minmax(0,1fr)]' : 'lg:grid-cols-[400px_minmax(0,1fr)]'
      }`}
    >
      <Sidebar
        district={district}
        analysis={analysis}
        abandoned={abandoned}
        parkChecks={parkChecks}
        gaSites={gaSites}
        siteAnalysis={siteAnalysis}
        addedSites={addedSites}
        patchAnalysis={patchAnalysis}
        greenGroups={greenGroups}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        status={status}
        error={error}
        selected={selected}
        onClear={clearSelection}
        onRetry={reload}
      />
      <main className="min-w-0">
        <ZoneMap
          district={district}
          districts={DISTRICTS}
          onDistrictChange={changeDistrict}
          options={options}
          onOptionChange={changeOption}
          optionsCollapsed={optionsCollapsed}
          onOptionsCollapsedChange={setOptionsCollapsed}
          abandoned={abandoned}
          gaSites={gaSites}
          siteAnalysis={siteAnalysis}
          addedSites={addedSites}
          greenMask={greenMask}
          patchAnalysis={patchAnalysis}
          greenGroups={greenGroups}
          analysis={analysis}
          version={version}
          selected={selected}
          onSelect={setSelected}
          onClear={clearSelection}
          loading={status === 'loading'}
        />
      </main>
    </div>
  );
}

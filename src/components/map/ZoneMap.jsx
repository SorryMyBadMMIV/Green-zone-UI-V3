import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Circle, GeoJSON, MapContainer, Marker, Pane, TileLayer, Tooltip, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { LoaderCircle, Maximize, Minus, Plus } from 'lucide-react';
import { BASEMAPS, MAP_DEFAULTS } from '../../config.js';
import { COLORS, GREEN_CLICK_MIN_ZOOM } from '../../lib/constants.js';
import { REACH_LABEL } from '../../lib/parks.js';
import { formatKm2 } from '../../lib/format.js';
import { frameRing, maskPolygon, pointInPolygon, polygonAreaM2 } from '../../lib/geo.js';
import { describePatch, frameUV, patchAt, patchPixels } from '../../lib/greenMask.js';
import ExampleScoreMarks from './ExampleScoreMarks.jsx';
import FrameImageLayer from './FrameImageLayer.jsx';
import GreenGroupLayer from './GreenGroupLayer.jsx';
import MapLegend from './MapLegend.jsx';
import MapOptions from './MapOptions.jsx';
import ParkLayers from './ParkLayers.jsx';
import PlotInfoBox from './PlotInfoBox.jsx';
import PolicyLayer from './PolicyLayer.jsx';
import RecommendMarkers from './RecommendMarkers.jsx';
import { GaSiteInfoBox, GreenGroupInfoBox, PatchInfoBox } from './SiteInfoBoxes.jsx';

const FIT_OPTIONS = { padding: [24, 24] };

// ---- The focus district, its grey neighbours and its image frame ----
const escapeHtml = (text) =>
  String(text).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
const labelIcon = (html, className = '') =>
  L.divIcon({ className: `map-label ${className}`.trim(), html: `<span>${html}</span>`, iconSize: null });
const SOON = '<small>Update soon</small>';

const VIEWS = new WeakMap();
/** Everything the map draws for a district that never changes: outline, mask, image frame and labels. */
function districtView(district) {
  if (VIEWS.has(district)) return VIEWS.get(district);
  const { features, metadata } = district.boundaries;
  const focus = features.find((f) => f.properties.role === 'focus');
  const neighbours = features.filter((f) => f.properties.role === 'soon');
  const [west, south, east, north] = metadata.viewBounds;
  const frameGeometry = { type: 'Polygon', coordinates: [frameRing(district.frame.corners)] };
  const frame = { ...district.frame, geometry: frameGeometry, areaM2: polygonAreaM2(frameGeometry) };
  const view = {
    focus,
    neighbours,
    viewBounds: L.latLngBounds([south, west], [north, east]),
    focusBounds: L.geoJSON(focus).getBounds(),
    // The grey "update soon" cover reaches far past the view, so panning never shows its edge.
    mask: maskPolygon(focus.geometry, [west - 1, south - 1, east + 1, north + 1]),
    frame,
    labels: [
      ...neighbours.map(({ properties: p }) => ({
        id: p.id,
        position: [p.label[1], p.label[0]],
        icon: labelIcon(`${escapeHtml(p.nameEn)} · ${escapeHtml(p.nameTh)}${SOON}`),
      })),
      { id: frame.id, position: frame.corners.topLeft, icon: labelIcon(`${escapeHtml(frame.label)} · ${formatKm2(frame.areaM2)}`, 'frame-label') },
    ],
  };
  VIEWS.set(district, view);
  return view;
}

/** Grey cover outside the district, neighbour outlines, the district outline, the image frame and labels. */
const FocusLayers = memo(function FocusLayers({ view }) {
  return (
    <>
      <Pane name="mask" style={{ zIndex: 350 }}>
        <GeoJSON data={view.mask} style={{ stroke: false, fillColor: COLORS.mask, fillOpacity: 0.55 }} interactive={false} />
        {view.neighbours.map((district) => (
          <GeoJSON
            key={district.properties.id}
            data={district}
            style={{ color: '#ffffff', weight: 1.5, opacity: 0.7, dashArray: '4 4', fill: false }}
            interactive={false}
          />
        ))}
      </Pane>
      <GeoJSON data={view.focus} style={{ color: COLORS.focusOutline, weight: 3, fill: false }} interactive={false} />
      <GeoJSON data={view.frame.geometry} interactive={false} style={{ color: COLORS.frameOutline, weight: 2, fill: false }} />
      <Pane name="labels" style={{ zIndex: 450 }}>
        {view.labels.map((label) => (
          <Marker key={label.id} position={label.position} icon={label.icon} interactive={false} keyboard={false} />
        ))}
      </Pane>
    </>
  );
});

// ---- Abandoned plots (red, example data) ----
const plotStyle = (isSelected) => ({
  color: isSelected ? COLORS.selected : COLORS.abandonedStroke,
  weight: isSelected ? 3 : 2,
  fillColor: COLORS.abandonedFill,
  fillOpacity: 0.5,
});

/** The red example plots, named by their planting level. Styles update in place when the selection changes. */
function PlotShapes({ data, plots, selected, onSelect }) {
  const layerRef = useRef(null);
  const latest = useRef({ selected, onSelect });
  const isSelected = (current, id) => current?.kind === 'plot' && current.id === id;

  useEffect(() => {
    latest.current = { selected, onSelect };
  });

  useEffect(() => {
    layerRef.current?.eachLayer((layer) => {
      const on = isSelected(selected, layer.feature.properties.id);
      layer.setStyle(plotStyle(on));
      if (on) layer.bringToFront();
    });
  }, [selected]);

  const style = useCallback((feature) => plotStyle(isSelected(latest.current.selected, feature.properties.id)), []);

  const onEachFeature = useCallback(
    (feature, layer) => {
      const p = feature.properties;
      const level = plots?.[p.id]?.level;
      layer.bindTooltip(`${p.isExample ? 'Example plot' : `Plot ${p.id}`}${level ? ` · ${level.label}` : ''}`, { sticky: true, direction: 'top' });
      layer.on({
        click: () => latest.current.onSelect({ kind: 'plot', id: p.id }),
        mouseover: () => layer.setStyle({ weight: 3.5 }),
        mouseout: () => layer.setStyle(plotStyle(isSelected(latest.current.selected, p.id))),
      });
    },
    [plots],
  );

  return <GeoJSON ref={layerRef} data={data} style={style} onEachFeature={onEachFeature} bubblingMouseEvents={false} />;
}

// ---- Clicked green patches ----
const PATCH_HIGHLIGHT_RGBA = [255, 255, 255, 230];

/** A canvas with only the patch's pixels painted white, the size of its box. */
function patchCanvas(rawPatch, width) {
  const [c0, r0, c1, r1] = rawPatch.bbox;
  const canvas = document.createElement('canvas');
  canvas.width = c1 - c0 + 1;
  canvas.height = r1 - r0 + 1;
  canvas.getContext('2d').putImageData(new ImageData(patchPixels(rawPatch, width, PATCH_HIGHLIGHT_RGBA), canvas.width, canvas.height), 0, 0);
  return canvas;
}

// ---- Map behaviour and controls ----
/** Lets the user zoom out a little past the district, but not further. Skipped while the map has no size. */
function updateMinZoom(map, focusBounds) {
  const size = map.getSize();
  if (size.x > 0 && size.y > 0) map.setMinZoom(Math.max(MAP_DEFAULTS.minZoom, map.getBoundsZoom(focusBounds) - 0.75));
}

/** Fits the district once the map has a real size and again when the district changes; reports clicks on the map. */
function MapEvents({ view, onReady, onMapClick }) {
  const latestView = useRef(view);
  const map = useMapEvents({
    click: (event) => onMapClick(event.latlng, map.getZoom()),
    resize: () => updateMinZoom(map, latestView.current.focusBounds),
  });
  useEffect(() => {
    // Leaflet only notices window resizes. Watch the container itself: it can start at 0 × 0 (or a
    // half-laid-out size) and fitting then would zoom all the way in.
    let fitted = false;
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
      if (!fitted && container.clientWidth > 0 && container.clientHeight > 0) {
        fitted = true;
        map.fitBounds(latestView.current.focusBounds, FIT_OPTIONS);
        updateMinZoom(map, latestView.current.focusBounds);
      }
    });
    observer.observe(container);
    onReady(map);
    return () => observer.disconnect();
  }, [map, onReady]);
  useEffect(() => {
    // A new district: move the limits first, then fit it.
    if (latestView.current === view) return;
    latestView.current = view;
    map.setMinZoom(MAP_DEFAULTS.minZoom);
    map.setMaxBounds(view.viewBounds);
    map.fitBounds(view.focusBounds, { ...FIT_OPTIONS, animate: false });
    updateMinZoom(map, view.focusBounds);
  }, [map, view]);
  return null;
}

const buttonClass =
  'flex size-9 items-center justify-center bg-white text-neutral-800 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600';

function MapButtons({ map, onReset }) {
  return (
    <div className="absolute left-3 top-3 z-[1000] flex flex-col divide-y divide-black/10 overflow-hidden rounded-lg border border-black/15 shadow-md">
      <button type="button" className={buttonClass} aria-label="Zoom in" title="Zoom in" onClick={() => map?.zoomIn()}>
        <Plus size={18} aria-hidden="true" />
      </button>
      <button type="button" className={buttonClass} aria-label="Zoom out" title="Zoom out" onClick={() => map?.zoomOut()}>
        <Minus size={18} aria-hidden="true" />
      </button>
      <button type="button" className={buttonClass} aria-label="Reset view" title="Reset view" onClick={onReset}>
        <Maximize size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * The interactive map of one district: satellite or street base map, the grey cover outside the district, the
 * backend's green image, the red example plots, parks and their circles, the 400 m policy, the backend's GA sites (★)
 * and green groups, controls and legend.
 */
export default function ZoneMap({
  district,
  districts,
  onDistrictChange,
  options,
  onOptionChange,
  optionsCollapsed,
  onOptionsCollapsedChange,
  abandoned,
  gaSites,
  siteAnalysis,
  addedSites,
  greenMask,
  patchAnalysis,
  greenGroups,
  analysis,
  version,
  selected,
  onSelect,
  onClear,
  loading,
}) {
  const [map, setMap] = useState(null);
  const view = useMemo(() => districtView(district), [district]);
  const [initialView] = useState(view);
  const resetView = useCallback(() => map?.fitBounds(view.focusBounds, FIT_OPTIONS), [map, view]);
  const basemap = BASEMAPS[options.basemap] ?? BASEMAPS.satellite;
  const selectedPlot = selected?.kind === 'plot' ? abandoned?.features.find((f) => f.properties.id === selected.id)?.properties : null;
  const selectedPlotAnalysis = selectedPlot ? analysis.plots[selectedPlot.id] : null;
  const selectedSiteFeature = selected?.kind === 'ga' ? gaSites?.features.find((f) => f.properties.id === selected.id) : null;
  const selectedSite = selectedSiteFeature?.properties ?? null;
  const selectedSiteAnalysis = selectedSite ? siteAnalysis?.sites[selectedSite.id] : null;
  const selectedAdded = selected?.kind === 'added' ? addedSites?.find((s) => s.id === selected.id) ?? null : null;
  const selectedPatch = selected?.kind === 'patch' ? selected.patch : null;

  // A click on a green patch (zoomed in, inside the district, green layer on) selects it; any other empty click clears.
  const handleMapClick = useCallback(
    (latlng, zoom) => {
      const point = [latlng.lng, latlng.lat];
      if (greenMask && options.green && zoom >= GREEN_CLICK_MIN_ZOOM && pointInPolygon(point, view.focus.geometry)) {
        const uv = frameUV(district.frame.corners, point);
        const { mask, width, height } = greenMask;
        const raw = uv && patchAt(mask, width, height, Math.floor(uv[0] * width), Math.floor(uv[1] * height));
        if (raw) {
          const patch = { ...describePatch(raw, width, height, district.frame), highlight: patchCanvas(raw, width) };
          onSelect({ kind: 'patch', id: patch.id, patch });
          return;
        }
      }
      onClear();
    },
    [greenMask, options.green, view, district, onSelect, onClear],
  );
  const selectedGroup = selected?.kind === 'group' ? greenGroups?.features.find((f) => f.properties.id === selected.id)?.properties : null;

  return (
    <div className="relative h-[55vh] min-h-80 lg:h-dvh">
      <MapContainer
        center={initialView.focusBounds.getCenter()}
        zoom={MAP_DEFAULTS.zoom}
        minZoom={MAP_DEFAULTS.minZoom}
        maxZoom={MAP_DEFAULTS.maxZoom}
        zoomSnap={0.25}
        maxBounds={initialView.viewBounds}
        maxBoundsViscosity={1}
        zoomControl={false}
        className="isolate size-full"
      >
        <TileLayer
          key={options.basemap}
          url={basemap.url}
          attribution={basemap.attribution}
          maxNativeZoom={basemap.maxNativeZoom}
          maxZoom={basemap.maxZoom}
          className={`basemap-${options.basemap}`}
        />
        <MapEvents view={view} onReady={setMap} onMapClick={handleMapClick} />
        <FocusLayers view={view} />
        {/* Under the grey cover (mask, 350), so the green outside the district is dimmed like the rest of it. */}
        <Pane name="green" style={{ zIndex: 345 }}>
          {options.green && (
            <FrameImageLayer key={`green-${district.id}`} corners={district.frame.corners} source={district.images.green} pane="green" />
          )}
        </Pane>
        {options.abandoned && abandoned && (
          <PlotShapes key={`plots-${district.id}-${version}`} data={abandoned} plots={analysis.plots} selected={selected} onSelect={onSelect} />
        )}
        <Pane name="policy" style={{ zIndex: 385 }}>
          {options.policy && analysis && <PolicyLayer key={district.id} focus={view.focus.geometry} parks={analysis.parks} pane="policy" />}
        </Pane>
        {analysis && <ParkLayers parks={analysis.parks} options={options} selected={selected} onSelect={onSelect} />}
        <Pane name="groups" style={{ zIndex: 395 }}>
          {options.greenGroups && greenGroups && <GreenGroupLayer greenGroups={greenGroups} selected={selected} onSelect={onSelect} />}
        </Pane>
        {options.exampleScore && options.abandoned && <ExampleScoreMarks analysis={analysis} onSelect={onSelect} />}
        <Pane name="siteReach" style={{ zIndex: 396 }}>
          {options.recommend &&
            options.siteCircles &&
            siteAnalysis &&
            gaSites?.features
              .filter((f) => siteAnalysis.keptIds.includes(f.properties.id) && siteAnalysis.sites[f.properties.id].size)
              .map((f) => (
                <Circle
                  key={`all-${f.properties.id}`}
                  center={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
                  radius={siteAnalysis.sites[f.properties.id].size.radiusM}
                  pathOptions={{ color: COLORS.recommendStar, weight: 1.5, dashArray: '8 6', fillColor: COLORS.recommendStar, fillOpacity: 0.05 }}
                  interactive={false}
                />
              ))}
          {options.recommend &&
            options.siteCircles &&
            (addedSites ?? []).map((s) => (
              <Circle
                key={`all-${s.id}`}
                center={[s.lngLat[1], s.lngLat[0]]}
                radius={s.analysis.size.radiusM}
                pathOptions={{ color: COLORS.recommendStar, weight: 1.5, dashArray: '8 6', fillColor: COLORS.recommendStar, fillOpacity: 0.05 }}
                interactive={false}
              />
            ))}
          {selectedAdded && (
            <Circle
              key={selectedAdded.id}
              center={[selectedAdded.lngLat[1], selectedAdded.lngLat[0]]}
              radius={selectedAdded.analysis.size.radiusM}
              pathOptions={{ color: COLORS.recommendStar, weight: 2.5, dashArray: '8 6', fillColor: COLORS.recommendStar, fillOpacity: 0.08 }}
              interactive={false}
            >
              <Tooltip permanent direction="top">{`${selectedAdded.analysis.size.key} · would reach ${REACH_LABEL[selectedAdded.analysis.size.key]}`}</Tooltip>
            </Circle>
          )}
          {selectedPatch && patchAnalysis?.size && (
            <Circle
              key={selectedPatch.id}
              center={[selectedPatch.lngLat[1], selectedPatch.lngLat[0]]}
              radius={patchAnalysis.size.radiusM}
              pathOptions={{ color: '#ffffff', weight: 2.5, dashArray: '8 6', fillColor: '#ffffff', fillOpacity: 0.06 }}
              interactive={false}
            >
              <Tooltip permanent direction="top">{`${patchAnalysis.size.key} · would reach ${REACH_LABEL[patchAnalysis.size.key]}`}</Tooltip>
            </Circle>
          )}
          {selectedSiteAnalysis?.size && (
            <Circle
              key={selectedSite.id}
              center={[selectedSiteFeature.geometry.coordinates[1], selectedSiteFeature.geometry.coordinates[0]]}
              radius={selectedSiteAnalysis.size.radiusM}
              pathOptions={{ color: COLORS.recommendStar, weight: 2.5, dashArray: '8 6', fillColor: COLORS.recommendStar, fillOpacity: 0.08 }}
              interactive={false}
            >
              <Tooltip permanent direction="top">{`${selectedSiteAnalysis.size.key} · would reach ${REACH_LABEL[selectedSiteAnalysis.size.key]}`}</Tooltip>
            </Circle>
          )}
        </Pane>
        <Pane name="patch" style={{ zIndex: 398 }}>
          {selectedPatch && <FrameImageLayer key={selectedPatch.id} corners={selectedPatch.corners} source={selectedPatch.highlight} pane="patch" />}
        </Pane>
        {options.recommend && gaSites && siteAnalysis && <RecommendMarkers gaSites={gaSites} siteAnalysis={siteAnalysis} addedSites={addedSites} selected={selected} onSelect={onSelect} />}
      </MapContainer>
      <MapButtons map={map} onReset={resetView} />
      <MapOptions
        district={district}
        districts={districts}
        onDistrictChange={onDistrictChange}
        options={options}
        onOptionChange={onOptionChange}
        collapsed={optionsCollapsed}
        onCollapsedChange={onOptionsCollapsedChange}
      />
      <MapLegend district={district} />
      {selectedPlot && selectedPlotAnalysis && <PlotInfoBox plot={selectedPlot} analysis={selectedPlotAnalysis} onClose={onClear} />}
      {selectedPatch && patchAnalysis && <PatchInfoBox patch={selectedPatch} analysis={patchAnalysis} onClose={onClear} />}
      {selectedAdded && <GaSiteInfoBox site={selectedAdded} analysis={selectedAdded.analysis} added onClose={onClear} />}
      {selectedSite && selectedSiteAnalysis && <GaSiteInfoBox site={selectedSite} analysis={selectedSiteAnalysis} onClose={onClear} />}
      {selectedGroup && <GreenGroupInfoBox group={selectedGroup} onClose={onClear} />}
      {loading && (
        <p className="pointer-events-none absolute left-1/2 top-16 z-[1000] flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm text-neutral-800 shadow-md lg:top-3">
          <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
          Loading…
        </p>
      )}
    </div>
  );
}

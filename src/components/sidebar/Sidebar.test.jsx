import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Sidebar from './Sidebar.jsx';
import { getDistrict } from '../../data/districts.js';
import { analyseDistrict } from '../../lib/district.js';
import { analyseSite, analyseSites } from '../../lib/sites.js';
import { loadParks } from '../../lib/parks.js';

const suanLuang = getDistrict('suan-luang');
const focus = suanLuang.boundaries.features.find((f) => f.properties.role === 'focus').geometry;

// Two small (S) parks inside Suan Luang, from the BMA list.
const parks = loadParks({
  type: 'FeatureCollection',
  features: [
    ['p-mitrapap', 'สวนมิตรภาพภิรมย์', [100.6398471, 13.7051741], 7308],
    ['p-sripat', 'สวนศรีพัฒน์ภิรมย์', [100.6408915, 13.7350756], 3600],
  ].map(([id, name, coordinates, areaM2]) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates },
    properties: { id, name, districtTh: 'สวนหลวง', areaM2, owner: 'กรุงเทพมหานคร', kind: 'พัฒนาพื้นที่สีเขียวใหม่', lists: ['15min'] },
  })),
});
// One example plot (100 m × 100 m) about 2.7 km from both parks.
const farPlot = {
  type: 'Feature',
  geometry: { type: 'Polygon', coordinates: [[[100.6595, 13.7195], [100.6605, 13.7195], [100.6605, 13.7205], [100.6595, 13.7205], [100.6595, 13.7195]]] },
  properties: { id: 'SL-T1', district: 'Suan Luang', areaM2: 10000, landCover: 'overgrown', isExample: true, updatedAt: '2026-10-26' },
};
const abandoned = { type: 'FeatureCollection', features: [farPlot] };
const analysis = analyseDistrict({ focus, parks, plots: abandoned });

const parkChecks = {
  type: 'FeatureCollection',
  features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [100.6408915, 13.7350756] }, properties: { name: 'สวนศรีพัฒน์ภิรมย์', areaM2: 3600, sizeClass: 'S', status: 'green_detected', greenM2: 2000 } }],
};

// The backend's GA sites (two in one 1 km square, one in another) and green groups, as the loader returns them.
const gaPoint = (zone, rank, areaM2, distNearestOfficialM, coordinates) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates },
  properties: { id: `${zone}-${rank}`, zone, rank, areaM2, distNearestOfficialM, zoneFitness: 1.2, zoneKMax: 2 },
});
// Three sites inside Suan Luang, 2.3 km or more apart, so their circles never overlap.
const gaSites = {
  type: 'FeatureCollection',
  features: [gaPoint('r0_c0', 1, 25991.5, 2287.7, [100.645, 13.725]), gaPoint('r0_c0', 2, 7534.5, 2437.2, [100.625, 13.715]), gaPoint('r3_c2', 1, 5000, 650, [100.62, 13.735])],
};
// A fourth site about 110 m from สวนศรีพัฒน์ภิรมย์: less than 400 m from a park, so it is removed.
gaSites.features.push(gaPoint('r5_c5', 1, 4000, 110, [100.6408915, 13.7360756]));
const siteAnalysis = analyseSites(gaSites, analysis.parks, focus);
const groupPoint = (id, kind, greenM2InGroup, patchesInGroup, radiusM) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [100.63, 13.72] },
  properties: { id, kind, radiusM, patchesInGroup, patchesInCircle: patchesInGroup + 2, greenM2InGroup, greenM2InCircle: greenM2InGroup + 100 },
});
const greenGroups = {
  type: 'FeatureCollection',
  features: [groupPoint('1', 'group', 1000000, 34, 381), groupPoint('2', 'group', 500000, 12, 250), groupPoint('171', 'isolated', 298638, 1, 192.3)],
};

const renderSidebar = (props = {}) =>
  render(
    <Sidebar
      district={suanLuang}
      analysis={analysis}
      abandoned={abandoned}
      parkChecks={parkChecks}
      gaSites={gaSites}
      siteAnalysis={siteAnalysis}
      greenGroups={greenGroups}
      status="ready"
      selected={null}
      onClear={() => {}}
      onRetry={() => {}}
      collapsed={false}
      onCollapsedChange={() => {}}
      {...props}
    />,
  );

describe('Sidebar', () => {
  it('shows the Suan Luang overview: backend green, area, district facts, parks, policy, recommended sites and green groups', () => {
    renderSidebar();
    expect(screen.getByRole('heading', { name: 'Suan Luang overview' })).toBeTruthy();
    expect(screen.getByText('5%')).toBeTruthy();
    expect(screen.getByText('2.248 km²')).toBeTruthy();
    expect(screen.getByText('123,291')).toBeTruthy();
    expect(screen.getByText('S 2 · M 0 · L 0 · XL 0')).toBeTruthy();
    expect(screen.getByText(/of Suan Luang is within 400 m of a park/)).toBeTruthy();
    expect(screen.getByText('The policy: a park within 400 m. Straight-line distance, not walking distance.')).toBeTruthy();
    expect(screen.getByText('3 recommended sites')).toBeTruthy();
    expect(screen.getByText(/in 2 squares of 1 km/)).toBeTruthy();
    expect(screen.getByText('1 removed: 1 less than 400 m from a park, 0 inside a park circle (S), 0 too close to a better ★')).toBeTruthy();
    expect(screen.getByText('2 very good · 1 good · 0 fair · 0 poor')).toBeTruthy();
    expect(screen.getByText(/Not verified public land/)).toBeTruthy();
    expect(screen.getByText('2 groups · 1 isolated')).toBeTruthy();
    expect(screen.getByText('in Suan Luang')).toBeTruthy();
    expect(screen.queryByText(/of the green is inside a circle/)).toBeNull();
  });

  it('compares green per person now with the recommended sites made into parks', () => {
    renderSidebar();
    // 750,818.4 m² of green for 123,291 people now; the 3 kept sites add 38,526 m².
    expect(screen.getByRole('heading', { name: 'Green per person' })).toBeTruthy();
    expect(screen.getByText('With the 3 recommended sites as parks')).toBeTruthy();
    expect(screen.getByText('6.40 m²')).toBeTruthy();
    expect(screen.getByText(/\+0\.31 m² per person from 38,526 m² of new parks/)).toBeTruthy();
    expect(screen.getByText(/Bangkok's target: 9 m² per person/)).toBeTruthy();
  });

  it('counts the good example plots on the overview, apart from the recommended sites', () => {
    renderSidebar();
    expect(screen.getByText('1 good example plot')).toBeTruthy();
    expect(screen.getByText('1 very good · 0 good')).toBeTruthy();
    expect(screen.getByText(/OpenStreetMap plots the frontend scores/)).toBeTruthy();
  });

  it('shows no Don Mueang frames or anything "Update soon"', () => {
    renderSidebar();
    expect(screen.queryByText('Update soon')).toBeNull();
  });

  it('shows an example plot with its area, land cover, planting score and how it was chosen', () => {
    renderSidebar({ selected: { kind: 'plot', id: 'SL-T1' } });
    expect(screen.getByRole('heading', { name: 'Site SL-T1' })).toBeTruthy();
    expect(screen.getByText('Abandoned land · example')).toBeTruthy();
    expect(screen.getByText('10,000 m²')).toBeTruthy();
    expect(screen.getByText('Very good for planting')).toBeTruthy();
    expect(screen.getByText('✓ Good example plot')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'How it was chosen' })).toBeTruthy();
    expect(screen.getByText(/Buildings were not checked/)).toBeTruthy();
  });

  it('shows the Green Lantern name and the district in the header', () => {
    renderSidebar();
    expect(screen.getByRole('heading', { name: 'Green Lantern' })).toBeTruthy();
    expect(screen.getByText('Suan Luang green space explorer')).toBeTruthy();
    expect(screen.getByText('THEOS-2')).toBeTruthy();
    expect(screen.queryByText('Mock data')).toBeNull();
  });

  it('shows a park with its size class, lists and what the satellite saw', () => {
    renderSidebar({ selected: { kind: 'park', id: 'p-sripat' } });
    expect(screen.getByRole('heading', { name: 'สวนศรีพัฒน์ภิรมย์' })).toBeTruthy();
    expect(screen.getByText('S · reaches 500 m')).toBeTruthy();
    expect(screen.getByText('Green seen by satellite: Yes')).toBeTruthy();
    expect(screen.getByText('15-minute parks')).toBeTruthy();
  });

  it('shows a recommended site (GA) with its score and what makes it up, its size class and reach (no rank)', () => {
    renderSidebar({ selected: { kind: 'ga', id: 'r0_c0-1' } });
    expect(screen.getByRole('heading', { name: 'Recommended site (GA)' })).toBeTruthy();
    expect(screen.getByText('Candidate · not verified public land')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Site score' })).toBeTruthy();
    expect(screen.getByText('Very good')).toBeTruthy();
    expect(screen.getByText('Far from parks')).toBeTruthy();
    expect(screen.getByText('Not overlapping parks')).toBeTruthy();
    expect(screen.getByText('30 of 30 · 25,992 m²')).toBeTruthy();
    expect(screen.getByText('M · reaches 1 km')).toBeTruthy();
    expect(screen.queryByText(/Rank/)).toBeNull();
  });

  it('counts the sites the app added in the gaps with the recommended sites, and opens one as "Added site (app)"', () => {
    const addedAt = (id, lngLat, areaM2) => ({ id, lngLat, areaM2, analysis: analyseSite({ geometry: { coordinates: lngLat }, properties: { areaM2 } }, analysis.parks) });
    const addedSites = [addedAt('patch-1', [100.655, 13.735], 4000), addedAt('patch-2', [100.63, 13.705], 1200)];
    const { unmount } = renderSidebar({ addedSites });
    expect(screen.getByText('5 recommended sites')).toBeTruthy();
    expect(screen.getByText(/2 added by the app in the gaps/)).toBeTruthy();
    unmount();
    renderSidebar({ addedSites, selected: { kind: 'added', id: 'patch-1' } });
    expect(screen.getByRole('heading', { name: 'Added site (app)' })).toBeTruthy();
    expect(screen.getByText('Picked by the app · not verified public land')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Site score' })).toBeTruthy();
  });

  it('shows a clicked green patch like a ★: its score and what makes it up, its size class and reach', () => {
    const patch = { id: 'patch-5', areaM2: 1225, lngLat: [100.62, 13.735], pixels: 100 };
    const patchAnalysis = analyseSite({ geometry: { coordinates: patch.lngLat }, properties: { areaM2: patch.areaM2 } }, analysis.parks);
    renderSidebar({ selected: { kind: 'patch', id: patch.id, patch }, patchAnalysis });
    expect(screen.getByRole('heading', { name: 'Green patch' })).toBeTruthy();
    expect(screen.getByText('Green patch · not verified public land')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Site score' })).toBeTruthy();
    expect(screen.getByText('2 of 30 · 1,225 m²')).toBeTruthy();
    expect(screen.getByText('S · reaches 500 m')).toBeTruthy();
  });

  it('shows a green group with its green area, patches and circle size', () => {
    renderSidebar({ selected: { kind: 'group', id: '1' } });
    expect(screen.getByRole('heading', { name: 'Green group 1' })).toBeTruthy();
    expect(screen.getByText('1,000,000 m²')).toBeTruthy();
    expect(screen.getByText('34')).toBeTruthy();
    expect(screen.getByText('381 m')).toBeTruthy();
  });

  it('calls a lone circle an isolated green patch', () => {
    renderSidebar({ selected: { kind: 'group', id: '171' } });
    expect(screen.getByRole('heading', { name: 'Isolated green 171' })).toBeTruthy();
  });

  it('falls back to the overview when the selected site is not in the data', () => {
    renderSidebar({ selected: { kind: 'ga', id: 'r9_c9-9' } });
    expect(screen.getByRole('heading', { name: 'Suan Luang overview' })).toBeTruthy();
  });

  it('calls onClear from the close button', () => {
    const onClear = vi.fn();
    renderSidebar({ selected: { kind: 'ga', id: 'r0_c0-1' }, onClear });
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('shows placeholder cards while loading', () => {
    renderSidebar({ status: 'loading', abandoned: null, parkChecks: null, gaSites: null, siteAnalysis: null, greenGroups: null });
    expect(screen.getByLabelText('Loading zone data')).toBeTruthy();
  });

  it('shows an error with a working Retry button', () => {
    const onRetry = vi.fn();
    renderSidebar({ status: 'error', abandoned: null, parkChecks: null, gaSites: null, siteAnalysis: null, greenGroups: null, onRetry });
    expect(screen.getByRole('alert').textContent).toContain("Couldn't load zone data");
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('says what failed, and does not blame a backend while it uses the example data', () => {
    const error = new Error('Loading ./assets/ga-sites.geojson failed with HTTP 404.');
    renderSidebar({ status: 'error', error, abandoned: null, parkChecks: null, gaSites: null, siteAnalysis: null, greenGroups: null });
    const alert = screen.getByRole('alert').textContent;
    expect(alert).toContain('Loading ./assets/ga-sites.geojson failed with HTTP 404.');
    expect(alert).toContain('example data');
    expect(alert).not.toMatch(/backend/i);
  });

  it('minimizes, and when minimized shows only the button that opens it again', () => {
    const onCollapsedChange = vi.fn();
    const { unmount } = renderSidebar({ onCollapsedChange });
    fireEvent.click(screen.getByRole('button', { name: 'Minimize sidebar' }));
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
    unmount();
    renderSidebar({ collapsed: true, onCollapsedChange });
    expect(screen.queryByRole('heading', { name: 'Green Lantern' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open sidebar' }));
    expect(onCollapsedChange).toHaveBeenCalledWith(false);
  });
});

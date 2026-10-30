import { describe, it, expect, vi, afterEach } from 'vitest';
import { districtDataUrl, fetchDistrictData, normalizeAbandoned, normalizeChecks, normalizeGaSites, normalizeGreenGroups } from './data.js';

const square = [[[100.5, 13.7], [100.51, 13.7], [100.51, 13.71], [100.5, 13.71], [100.5, 13.7]]];
const feature = (properties) => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: square }, properties });
const point = (coordinates, properties) => ({ type: 'Feature', geometry: { type: 'Point', coordinates }, properties });
const collection = (...features) => ({ type: 'FeatureCollection', features });
const respondWith = (json, status = 200) =>
  vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => json });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// One park check, GA site and green group, in the backend's own format (ga_parks.geojson, green_groups.geojson).
const checks = collection(point([100.65, 13.71], { name: 'P', areaM2: 400, sizeClass: 'S', status: 'green_detected', greenM2: 894.5 }));
const gaSites = collection(
  point([100.5965, 13.7467], { zone: 'r0_c0', rank: 1, area_m2: 25991.5, x_m: 672614.66, y_m: 1520289.4, dist_nearest_official_m: 2287.7, zone_fitness: 1.4472, zone_k_max: 2 }),
);
const greenGroups = collection(
  point([100.6569, 13.7026], { cluster_id: 1, kind: 'group', radius_m: 381, patches_in_group: 34, patches_in_circle: 39, green_m2_in_group: 46489.8, green_m2_in_circle: 53648.8, noise_suppressed: false, role: 'center' }),
  feature({ cluster_id: 1, kind: 'group', radius_m: 381, role: 'group_circle' }),
);

const plots = collection(feature({ id: 'SL-001', district: 'Suan Luang', areaM2: 19311, landCover: 'overgrown', isExample: true, updatedAt: '2026-10-26' }));

describe('districtDataUrl', () => {
  it('uses the example files bundled with the app when no backend URL is set', () => {
    expect(districtDataUrl('suan-luang', 'ga-sites', '')).toMatch(/mock\/suan-luang\/ga-sites\.geojson$/);
    expect(districtDataUrl('suan-luang', 'summary', '')).toMatch(/mock\/suan-luang\/summary\.json$/);
  });

  it('never points the example files at the site root, so the app works in any folder', () => {
    for (const url of [districtDataUrl('suan-luang', 'ga-sites', ''), districtDataUrl('suan-luang', 'park-checks', '')]) {
      expect(url).not.toMatch(/^\/mock\//);
    }
  });

  it('uses the backend per district when a base URL is set', () => {
    expect(districtDataUrl('suan-luang', 'ga-sites', 'http://api')).toBe('http://api/districts/suan-luang/ga-sites');
  });

  it('names the missing example file', () => {
    expect(() => districtDataUrl('suan-luang', 'grid', '')).toThrow(/suan-luang\/grid/);
  });
});

describe('normalizeAbandoned', () => {
  it('keeps polygon plots with an id, and their area, land cover and example tag', () => {
    expect(normalizeAbandoned(plots).features[0].properties).toEqual({
      id: 'SL-001',
      district: 'Suan Luang',
      areaM2: 19311,
      landCover: 'overgrown',
      isExample: true,
      updatedAt: '2026-10-26',
    });
  });

  it('skips plots without an id or a polygon, and rejects data that is not a FeatureCollection', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = normalizeAbandoned(collection(feature({ landCover: 'overgrown' }), point([100.6, 13.7], { id: 'P' })));
    expect(result.features).toHaveLength(0);
    expect(warn).toHaveBeenCalledTimes(2);
    expect(() => normalizeAbandoned({ type: 'Feature' })).toThrow(/abandoned land data is not a GeoJSON FeatureCollection/);
  });
});

describe('normalizeChecks', () => {
  it('keeps park points with a name and their check result', () => {
    expect(normalizeChecks(checks).features[0].properties).toEqual({ name: 'P', areaM2: 400, sizeClass: 'S', status: 'green_detected', greenM2: 894.5 });
  });

  it('rejects data that is not a FeatureCollection', () => {
    expect(() => normalizeChecks({ type: 'Feature' })).toThrow(/park check data is not a GeoJSON FeatureCollection/);
  });
});

describe('normalizeGaSites', () => {
  it("reads the backend's GA sites and gives each an id from its 1 km square and rank", () => {
    expect(normalizeGaSites(gaSites).features[0].properties).toEqual({
      id: 'r0_c0-1',
      zone: 'r0_c0',
      rank: 1,
      areaM2: 25991.5,
      distNearestOfficialM: 2287.7,
      zoneFitness: 1.4472,
      zoneKMax: 2,
    });
  });

  it('skips sites without a point, a square or a rank, and rejects data that is not a FeatureCollection', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = normalizeGaSites(collection(feature({ zone: 'r0_c0', rank: 2 }), point([100.6, 13.7], { rank: 3 })));
    expect(result.features).toHaveLength(0);
    expect(warn).toHaveBeenCalledTimes(2);
    expect(() => normalizeGaSites({ type: 'Feature' })).toThrow(/GA park site data is not a GeoJSON FeatureCollection/);
  });
});

describe('normalizeGreenGroups', () => {
  it('keeps the circle centres (the map draws the circles itself) and drops the circle polygons', () => {
    const { features } = normalizeGreenGroups(greenGroups);
    expect(features).toHaveLength(1);
    expect(features[0].geometry.coordinates).toEqual([100.6569, 13.7026]);
    expect(features[0].properties).toEqual({
      id: '1',
      kind: 'group',
      radiusM: 381,
      patchesInGroup: 34,
      patchesInCircle: 39,
      greenM2InGroup: 46489.8,
      greenM2InCircle: 53648.8,
    });
  });

  it('skips noise the backend suppressed and centres without a radius', () => {
    const { features } = normalizeGreenGroups(
      collection(
        point([100.6, 13.7], { cluster_id: 2, kind: 'isolated', radius_m: 50, noise_suppressed: true }),
        point([100.6, 13.7], { cluster_id: 3, kind: 'isolated', radius_m: null }),
      ),
    );
    expect(features).toHaveLength(0);
  });
});

describe('fetchDistrictData', () => {
  const suanLuang = { id: 'suan-luang', data: { abandoned: true, parkChecks: true, gaSites: true, greenGroups: true } };
  const files = { abandoned: plots, 'park-checks': checks, 'ga-sites': gaSites, 'green-groups': greenGroups };
  const named = (url) => Object.keys(files).find((name) => url.includes(name));

  it('loads the example plots, park checks, GA sites and green groups for Suan Luang', async () => {
    const fetchMock = vi.fn(async (url) => ({ ok: true, status: 200, json: async () => files[named(url)] }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await fetchDistrictData(suanLuang, { baseUrl: 'http://api' });
    expect(fetchMock.mock.calls.map(([url]) => url).sort()).toEqual([
      'http://api/districts/suan-luang/abandoned',
      'http://api/districts/suan-luang/ga-sites',
      'http://api/districts/suan-luang/green-groups',
      'http://api/districts/suan-luang/park-checks',
    ]);
    expect(Object.keys(result).sort()).toEqual(['abandoned', 'gaSites', 'greenGroups', 'parkChecks']);
    expect(result.abandoned.features[0].properties.id).toBe('SL-001');
    expect(result.gaSites.features[0].properties.id).toBe('r0_c0-1');
    expect(result.greenGroups.features[0].properties.kind).toBe('group');
    expect(result.parkChecks.features[0].properties.name).toBe('P');
  });

  it('skips what the district does not have', async () => {
    const fetchMock = vi.fn(async (url) => ({ ok: true, status: 200, json: async () => files[named(url)] }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await fetchDistrictData({ id: 'suan-luang', data: { abandoned: false, parkChecks: false, gaSites: true, greenGroups: false } }, { baseUrl: 'http://api' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.abandoned).toBeNull();
    expect(result.parkChecks).toBeNull();
    expect(result.greenGroups).toBeNull();
  });

  it('loads the bundled example files without a backend', async () => {
    const fetchMock = vi.fn(async (url) => ({ ok: true, status: 200, json: async () => files[named(url)] }));
    vi.stubGlobal('fetch', fetchMock);
    await fetchDistrictData(suanLuang, { baseUrl: '' });
    expect(fetchMock).toHaveBeenCalledWith(districtDataUrl('suan-luang', 'ga-sites', ''), expect.any(Object));
  });

  it('throws on a non-2xx response', async () => {
    vi.stubGlobal('fetch', respondWith({}, 503));
    await expect(fetchDistrictData(suanLuang, { baseUrl: 'http://api' })).rejects.toThrow(/HTTP 503/);
  });

  it('names the address when the request itself fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(fetchDistrictData(suanLuang, { baseUrl: 'http://api' })).rejects.toThrow(/http:\/\/api\/districts\/suan-luang\/.*Failed to fetch/);
  });

  it('names the address when the answer is not JSON (for example a web page)', async () => {
    const notJson = async () => {
      throw new SyntaxError("Unexpected token '<'");
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: notJson }));
    await expect(fetchDistrictData(suanLuang, { baseUrl: 'http://api' })).rejects.toThrow(/http:\/\/api\/districts\/suan-luang\/.*not JSON/);
  });
});

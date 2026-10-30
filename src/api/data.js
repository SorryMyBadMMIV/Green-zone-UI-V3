import { API_URL } from '../config.js';

// The example data in src/mock/, used while VITE_API_URL is empty. Vite bundles these files and hands
// out their URLs, so they load wherever the app is hosted (site root or any folder) and they travel
// with the source code.
const MOCK_FILES = import.meta.glob('../mock/**/*.{json,geojson}', { query: '?url', import: 'default', eager: true });

/**
 * Where one piece of a district's data lives ('abandoned' | 'park-checks' | 'ga-sites' | 'green-groups'): the backend
 * when VITE_API_URL is set, otherwise the example file src/mock/<district>/<name>.json or .geojson.
 */
export function districtDataUrl(districtId, name, baseUrl = API_URL) {
  if (baseUrl) return `${baseUrl}/districts/${districtId}/${name}`;
  const url = MOCK_FILES[`../mock/${districtId}/${name}.json`] ?? MOCK_FILES[`../mock/${districtId}/${name}.geojson`];
  if (!url) throw new Error(`There is no example file for ${districtId}/${name} (src/mock/${districtId}/${name}.json or .geojson).`);
  return url;
}

const num = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const str = (value) => (typeof value === 'string' && value.trim() !== '' ? value : null);

// Every error names the address, so the message on the error card says exactly what failed.
async function getJson(url, signal) {
  let response;
  try {
    response = await fetch(url, { signal, headers: { Accept: 'application/geo+json, application/json' } });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(`Couldn't reach ${url}: ${error.message}`, { cause: error });
  }
  if (!response.ok) throw new Error(`Loading ${url} failed with HTTP ${response.status}.`);
  try {
    return await response.json();
  } catch (error) {
    throw new Error(`${url} is not JSON (${error.message}).`, { cause: error });
  }
}

const isPolygonal = (geometry) =>
  (geometry?.type === 'Polygon' || geometry?.type === 'MultiPolygon') && Array.isArray(geometry.coordinates);

/** Abandoned plots (today: example data from OpenStreetMap): polygons with an id, area, land cover and example tag. */
export function normalizeAbandoned(json) {
  if (json?.type !== 'FeatureCollection' || !Array.isArray(json.features)) {
    throw new Error('The abandoned land data is not a GeoJSON FeatureCollection.');
  }
  const features = [];
  for (const f of json.features) {
    const p = f?.properties ?? {};
    if (p.id === undefined || p.id === null || p.id === '' || !isPolygonal(f.geometry)) {
      console.warn('Skipping an abandoned plot without an id or polygon geometry', f);
      continue;
    }
    features.push({
      type: 'Feature',
      geometry: f.geometry,
      properties: {
        id: String(p.id),
        district: str(p.district),
        areaM2: num(p.areaM2),
        landCover: str(p.landCover),
        isExample: p.isExample === true,
        updatedAt: str(p.updatedAt),
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

/** The backend's park-vs-satellite checks: Point features with name, area, size class, status and green found. */
export function normalizeChecks(json) {
  if (json?.type !== 'FeatureCollection' || !Array.isArray(json.features)) {
    throw new Error('The park check data is not a GeoJSON FeatureCollection.');
  }
  const features = json.features
    .filter((f) => f?.geometry?.type === 'Point' && str(f.properties?.name))
    .map((f) => ({
      type: 'Feature',
      geometry: f.geometry,
      properties: {
        name: f.properties.name,
        areaM2: num(f.properties.areaM2),
        sizeClass: str(f.properties.sizeClass),
        status: str(f.properties.status),
        greenM2: num(f.properties.greenM2),
      },
    }));
  return { type: 'FeatureCollection', features };
}

const isPoint = (geometry) => geometry?.type === 'Point' && Array.isArray(geometry.coordinates);

function pointCollection(json, what) {
  if (json?.type !== 'FeatureCollection' || !Array.isArray(json.features)) {
    throw new Error(`The ${what} data is not a GeoJSON FeatureCollection.`);
  }
  return json.features;
}

/**
 * The backend's GA-ranked candidate park sites (ga_parks.geojson, sent as is): one Point per site with its 1 km square
 * (`zone`), its rank inside the square, its area and its distance to the nearest official park.
 */
export function normalizeGaSites(json) {
  const features = [];
  for (const f of pointCollection(json, 'GA park site')) {
    const p = f?.properties ?? {};
    if (!isPoint(f?.geometry) || !str(p.zone) || num(p.rank) == null) {
      console.warn('Skipping a GA park site without a point, a 1 km square or a rank', f);
      continue;
    }
    features.push({
      type: 'Feature',
      geometry: f.geometry,
      properties: {
        id: `${p.zone}-${p.rank}`,
        zone: p.zone,
        rank: p.rank,
        areaM2: num(p.area_m2),
        distNearestOfficialM: num(p.dist_nearest_official_m),
        zoneFitness: num(p.zone_fitness),
        zoneKMax: num(p.zone_k_max),
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

/**
 * The backend's green groups (green_groups.geojson, sent as is). Only the circle centres are kept: the map draws each
 * circle from its centre and radius. Noise the backend suppressed is left out.
 */
export function normalizeGreenGroups(json) {
  const features = [];
  for (const f of pointCollection(json, 'green group')) {
    const p = f?.properties ?? {};
    if (!isPoint(f?.geometry) || p.noise_suppressed === true || !(num(p.radius_m) > 0) || p.cluster_id == null) continue;
    features.push({
      type: 'Feature',
      geometry: f.geometry,
      properties: {
        id: String(p.cluster_id),
        kind: p.kind === 'isolated' ? 'isolated' : 'group',
        radiusM: p.radius_m,
        patchesInGroup: num(p.patches_in_group),
        patchesInCircle: num(p.patches_in_circle),
        greenM2InGroup: num(p.green_m2_in_group),
        greenM2InCircle: num(p.green_m2_in_circle),
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

/**
 * Loads what a district has (district.data): the abandoned plots, the park checks, the GA sites and the green groups.
 * Throws on network errors, non-2xx responses and bad data.
 */
export async function fetchDistrictData(district, { baseUrl = API_URL, signal } = {}) {
  const load = async (name) => getJson(districtDataUrl(district.id, name, baseUrl), signal);
  const [abandoned, parkChecks, gaSites, greenGroups] = await Promise.all([
    district.data.abandoned ? load('abandoned').then(normalizeAbandoned) : null,
    district.data.parkChecks ? load('park-checks').then(normalizeChecks) : null,
    district.data.gaSites ? load('ga-sites').then(normalizeGaSites) : null,
    district.data.greenGroups ? load('green-groups').then(normalizeGreenGroups) : null,
  ]);
  return { abandoned, parkChecks, gaSites, greenGroups };
}

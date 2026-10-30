# Green Lantern data API

This is the contract between the frontend and the backend. The app shows one district, **`suan-luang`**, and loads its data from:

| Method | Path | Returns |
|---|---|---|
| GET | `{VITE_API_URL}/districts/suan-luang/abandoned` | Abandoned plots (GeoJSON polygons); today example data |
| GET | `{VITE_API_URL}/districts/suan-luang/park-checks` | Registered parks checked against the image (GeoJSON points) |
| GET | `{VITE_API_URL}/districts/suan-luang/ga-sites` | The recommended sites: the backend's `ga_parks.geojson`, as is |
| GET | `{VITE_API_URL}/districts/suan-luang/green-groups` | Green groups: the backend's `green_groups.geojson`, as is |

Which district has which piece is set in `src/data/districts.js` (`data: { abandoned, parkChecks, gaSites, greenGroups }`). Adding another district there brings back the District drop-down.

- Set `VITE_API_URL` in `.env` (copy `.env.example`), for example `VITE_API_URL=http://localhost:8000/api`. Restart `npm run dev` after changing it.
- When `VITE_API_URL` is empty, the app reads the same structures from `src/mock/suan-luang/` (built into the app). **Those files are working examples of everything below.**
- Allow CORS from the frontend origin (`http://localhost:5173` during development) and turn on gzip.
- Reply with HTTP `200` and JSON. Any other status shows "Couldn't load zone data", naming the address that failed, with a Retry button.

## The green image (bundled for now)

The green layer is a PNG drawn over the image frame (four corners as `[lat, lng]`, row 0 = north edge, column 0 = west edge):

| File | Made from |
|---|---|
| `src/mock/suan-luang/green.png` | the backend green mask (`round1/green_preview.png`, 3.5 m per pixel), green where the mask is 1 |
| `src/mock/suan-luang/frame.json` | the image's extent (UTM 47N) and four corners, fitted from the GA sites to about 1 m |
| `src/mock/suan-luang/summary.json` | the backend's `round1/summary.json` (green area, image area, patches) |

`docs/mock-data/make-green-layer.py` and `copy-backend-results.py` make them from the backend folder. When the backend serves them, add the image URL and corners to the district config.

## Abandoned plot feature

Today these are example plots from OpenStreetMap (`src/mock/suan-luang/abandoned.geojson`); the backend can send its own detections in the same shape later.

| Field | Type | Required | Meaning |
|---|---|---|---|
| `id` | string | yes | Unique id |
| `district` | string | no | District name in English |
| `areaM2` | number | no | Area in m². The frontend measures the polygon when it is missing |
| `landCover` | string | no | For example "concrete or soil" or "overgrown" |
| `isExample` | boolean | no | `true` shows an "example" tag. Real detections leave it out |
| `updatedAt` | string | no | ISO date |

Geometry: `Polygon` or `MultiPolygon`, WGS84 `[longitude, latitude]`.

## Park check feature

The backend's `park_mark.py` output, reduced to points:

| Field | Meaning |
|---|---|
| `name` | Park name, as in the BMA list (used to match the park) |
| `areaM2` | Registered area |
| `sizeClass` | S, M, L, XL (or `below_S`) |
| `status` | `green_detected`, `no_green_detected` or `outside_image` |
| `greenM2` | Green found by the satellite near the point |

## GA park site feature: the recommended sites

The backend's `ga_parks/ga_parks.geojson`, sent unchanged: one `Point` per candidate site picked by the backend's genetic algorithm.

| Field | Meaning |
|---|---|
| `zone` | The 1 km square, `r{row}_c{col}` from the image's top-left corner (required) |
| `rank` | Rank of the site inside its square, 1 = best (required) |
| `area_m2` | Area of the green patch |
| `dist_nearest_official_m` | Distance to the nearest registered park |
| `zone_fitness`, `zone_k_max` | The square's GA score and the most parks allowed in it |

The frontend names each site `{zone}-{rank}`, counts the sites per square, and ignores `x_m` / `y_m`. The app shows them as the recommended sites (★, the "Recommend" switch), with its own score instead of the GA rank. They are candidates, not verified public land, and the app says so.

## Green group feature

The backend's `green_groups/green_groups.geojson`, sent unchanged. The frontend keeps the `Point` features (the circle centres) and draws each circle from its centre and `radius_m`; the `Polygon` circles can be left out to save space.

| Field | Meaning |
|---|---|
| `cluster_id` | Unique id (required) |
| `kind` | `group`, or `isolated` (drawn dashed) |
| `radius_m` | Circle radius (required, more than 0) |
| `patches_in_group`, `green_m2_in_group` | The group's own patches and green |
| `patches_in_circle`, `green_m2_in_circle` | Everything inside the circle, neighbours included |
| `noise_suppressed` | `true` leaves the group out |

## What the frontend computes (don't send these)

- **Park size class and reach,** from `src/data/parks.json` (BMA list):
  - S up to 16,000 m²: 500 m
  - M up to 80,000 m²: 1 km
  - L up to 160,000 m²: 3 km
  - XL above: 5 km
- **Policy coverage:** the share of the district within 400 m of a park.
- **Planting score** (0–100) for every abandoned plot: up to 50 points for distance to the nearest park, up to 30 for size, and up to 20 minus 10 for every park circle covering it. Level: very good from 80, good from 60, fair from 40, poor below.
- **Good example plot (✓):** outside every 400 m ring and a score of 60 or more. The recommendations come from the GA sites, not from this score.
- **Only the district:** parks, GA sites and green-group centres outside the district are left out (send the whole image; the frontend filters).
- **Recommended sites:** a GA site is removed when it is less than 400 m from a park or inside an S park circle (the barrier); then, best score first, a site whose circle overlaps a kept site's circle by more than 25% of the smaller circle is removed as too close. Each kept site gets a size class from its `area_m2` (its reach circle) and a score 0–100: up to 40 for distance to the nearest park (full at 1 km), up to 30 for the share of its own circle no S, M or L park circle covers, up to 30 for size (full at 16,000 m²).
- **Green patches:** a click (zoomed in) finds the 4-connected patch of the green image under it and scores it the same way.
- **Added sites (app):** in the gaps between the kept GA sites, the best green patches of the green image (300 m² or more, fair or better, outside the barrier, at most 25% circle overlap) are added as extra ★, named "Added site (app)".
- **GA sites per 1 km square** and the **share of the green inside a group circle** (green in the groups ÷ the image's green).

## How the frontend treats your data

- A park check without a point or a name is skipped. So are a plot without an `id` or polygon geometry and a GA site without a point, `zone` or `rank`, with a console warning.
- A number that is missing or not finite shows as "—". The cards still render.
- Extra fields are ignored, so it is safe to send more.

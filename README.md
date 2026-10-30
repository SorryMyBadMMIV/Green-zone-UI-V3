# Green Zone frontend

An interactive map for **Green Zone** (GeoHackathon 2026, GISTDA): urban green space planning with THEOS-2, aligned with **Green Bangkok 2030** and the **15-minute park** policy. It focuses on **Suan Luang (สวนหลวง)**, where the backend has real THEOS-2 results.

- **Only Suan Luang:** the map shows only what lies inside the district: its 11 parks, the recommended sites and green groups inside it, and the red plots. Parks just across the border are neither shown nor counted, and the green outside is dimmed.
- **Parks and their reach:** every park inside Suan Luang from the BMA / Rocket Media Lab list, with a circle by size: **S** up to 16,000 m² reaches 500 m, **M** up to 80,000 m² reaches 1 km, **L** up to 160,000 m² reaches 3 km, **XL** reaches 5 km.
- **Policy:** a 400 m ring around every park. Land outside every ring is shaded: it is not yet within 400 m of a park.
- **Recommended sites (★):** the sites the backend's genetic algorithm (GA) picked from the green it found (not verified public land). The app removes the ones existing parks already serve and gives each of the rest a score from 0 to 100. Click a ★ to see how far it would reach as a park.
- **Green:** the green the backend found in the THEOS-2 image: land that is already green.
- **Abandoned land (red, example data):** empty or unused plots from OpenStreetMap: land where new green could go. Each gets a planting score; with "Example plot score" on (off at start), a ✓ marks the good ones. These are not backend results.
- **Green groups:** circles around groups of green that isn't an official park, so you can see where unofficial green is concentrated (off at start; isolated green is dashed). Only the groups centred inside Suan Luang are shown.
- **Satellite map** by default, with a switch to the street map. Both side panels can be minimized.

> This is the frontend only. The green, the recommended sites and the green groups come from the backend's THEOS-2 results, the parks from the BMA list. The red abandoned plots are **example data** from OpenStreetMap until the backend can detect abandoned land.

**Live site:** https://sorrymybadmmiv.github.io/Green-zone-UI-V3/

## Run it

You need Node.js 22.12 or newer (tested with Node 24).

**Windows: double-click `start.bat`.** It installs the packages the first time, starts the app on localhost, and opens your browser. Close its window to stop the app.

Or in a terminal:

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server with hot reload |
| `npm test` | Run the unit and component tests once |
| `npm run build` | Make a production build in `dist/` |
| `npm run preview` | Serve the production build locally |

## Put it online for everyone

**GitHub Pages (already set up):** every push to `main` runs `.github/workflows/deploy.yml`. It installs the packages, runs the tests, builds the app and publishes it at https://sorrymybadmmiv.github.io/Green-zone-UI-V3/ in about two minutes. If a test fails, nothing is published and the site keeps the last good version. Watch it in the repo's **Actions** tab.

**Any other web host:**

1. Run `npm run build`. It makes the `dist/` folder: the whole app, with the data and images built in.
2. Upload everything inside `dist/` to any static web host, for example GitHub Pages, Netlify, Vercel, or a folder on a school or office web server. It works at the top of a site and in a subfolder such as `https://example.com/green-zone/`, with no extra settings.
3. Share the address. Anyone with the link can use the app in their browser.

Don't open `dist/index.html` by double-clicking it, because browsers block apps opened as files. To try the build on your own computer, run `npm run preview`.

## How to use the app

- **Map options** (top right), each with a one-line explanation:
  - **Park circles:** S, M, L, XL, drawn as coloured rings.
  - **Show:** **Policy · 400 m** (dashed ring), **Recommend** (★, the backend GA's sites) and **Example plot score** (✓).
  - **Layers:** **Green**, **Abandoned land** (red) and **Green groups** (pink rings).
  - **Base map:** satellite or street map. The – button folds the panel into a small pill.
- **Click a park dot** to see its size, reach, owner and lists, and whether the satellite saw green there.
- **Click a ★** to see the recommended site's score, area, size class and nearest park. A dashed yellow circle shows how far it would reach as a park (S 500 m, M 1 km, L 3 km, XL 5 km, by its area). **★ reach circles** (Map options, off at start) draws every ★'s circle at once.
- **Click a green patch** (zoom in to street level first, zoom 16 or more): the patch is highlighted in white and scored like a ★ (score, size class, nearest park) with its own dashed circle. The area comes from the 3.5 m green layer, so it can differ a little from the backend's own number for the same spot.
- **Click a red plot or a ✓** to see its area, planting score and how it was chosen.
- **Click a green-group circle** to see its green, patches and circle size.
- **Sidebar:** the « button minimizes it, and » opens it again. To go back to the overview, press Esc, click ×, or click empty map.
- **Moving around:** zoom with the + / − buttons, the mouse wheel or a pinch. ⤢ fits the district again.

## The recommended sites (★)

The backend's GA picks 85 sites in the image; 45 lie inside Suan Luang and only those are shown. The app then:

- **Removes the ★ inside the barrier:** less than 400 m from a park (it fails the policy), or inside an S park circle (500 m). M, L and XL circles are not a barrier (one XL park covers the whole district).
- **Keeps only the best of ★ that are too close:** best score first, a ★ whose circle overlaps an already kept ★'s circle by more than 25% (of the smaller circle) is removed. Circles may overlap a little.
- **Today:** of the 45 inside Suan Luang, 5 are less than 400 m from a park, 3 are inside an S circle and 23 are too close to a better ★, so **14 are shown**.
- **Fills the gaps:** where no ★ circle reaches, the app adds the best green patch of the backend green layer as an **Added site (app)** (same yellow ★; its box and panel say it was added by the app). It must be at least 300 m² (the GA's own minimum), score fair or better, be outside the barrier, and overlap no ★ circle by more than 25%. Today this adds **11**, so **25 ★** are shown in all.
- **Scores the rest** from 0 to 100 (this replaces the GA's rank):
  - **Far from parks:** up to 40 points, full at 1 km or more from the nearest park.
  - **Not overlapping parks:** up to 30 points: the share of the site's own circle that no park circle (S, M or L) covers yet.
  - **Size:** up to 30 points, full at 16,000 m² or more.
- **Levels:** very good from 80, good from 60, fair from 40, poor below. Today (all 25): 6 very good, 14 good, 5 fair.
- **Its own circle:** a site's size class comes from its area, like a park's (S up to 16,000 m² reaches 500 m, M up to 80,000 m² reaches 1 km, and so on).

The numbers are in `src/lib/constants.js` (`SITE_*`).

## Green zone and red zone: what is the difference?

- **Green (the Green layer)** is land that **is already green**: every patch of trees or grass the satellite sees in the THEOS-2 image (the backend marks a pixel green when NDVI is 0.3 or more and EVI is 0.2 or more, and removes tiny patches as noise). It can be a park, a school field, a temple garden, roadside trees or a private garden. The ★ recommended sites and the green groups are built from it.
- **Red (Abandoned land)** is land that **is not green or not used, but could be**: empty plots, construction sites, brownfield or overgrown scrub, taken from **OpenStreetMap**, a map people draw by hand. It is **example data**, not a satellite or backend result, and can be out of date.

In short: green = what is green now, seen from space; red = where green could be added, from a map people made. An "overgrown" red plot can also show green patches, because the plants on it are real.

## The example plot score

The recommendations (★) come from the backend's GA. Separately, every red example plot gets the frontend's own planting score from 0 to 100:

- **Distance:** up to 50 points, full at 2 km or more from the nearest park.
- **Size:** up to 30 points, full at 5,000 m² or more.
- **Overlap:** up to 20 points. Every park circle that already covers the plot takes 10 points off, because people there already have parks.

| Score | Meaning |
|---|---|
| 80–100 | Very good for planting |
| 60–79 | Good for planting |
| 40–59 | Fair for planting |
| under 40 | Poor for planting |

**Good example plot (✓)** means outside every 400 m ring **and** a score of 60 or more. Distances are straight-line, not walking distance. The numbers are in `src/lib/constants.js`.

**How the red plots were chosen:** A plot is taken when its OpenStreetMap tag is brownfield, construction, greenfield or vacant land ("concrete or soil") or scrub or meadow ("overgrown"), it is at least 200 m², and it lies inside Suan Luang and the image. Plots inside parks, sports grounds, schools, temples, hospitals, military land or cemeteries are left out. Buildings are not checked, and OpenStreetMap can be out of date.

## If it says "Couldn't load zone data"

The card shows the address that failed and why, for example `Loading …/ga-sites.geojson failed with HTTP 404`.

- **Without a backend (`VITE_API_URL` empty, the default):** the example data didn't load. Make sure your copy has the `src/mock/` folder and the current `vite.config.js`, then build again.
- **With `VITE_API_URL` set:** the app is using that backend. Check that the backend is running, that the address is right, and that it allows CORS from the app's address.

## Connect the backend

1. Copy `.env.example` to `.env`.
2. Set `VITE_API_URL` to the backend base URL, for example `VITE_API_URL=http://localhost:8000/api`.
3. Restart `npm run dev`. The app now loads its data from the backend. (The THEOS-2 badge in the header names the satellite data either way.)

The backend serves the district's data at `{VITE_API_URL}/districts/suan-luang/…`. **[docs/API.md](docs/API.md)** describes it, and the files in `src/mock/suan-luang/` are working examples.

## Project structure

```
src/
  App.jsx                 page layout, map options, selection, Esc key
  config.js               backend URL, base maps (satellite, street), zoom limits
  data/districts.js       the district (Suan Luang): outline, image frame, green image, which data it has
  data/districts/         district outline + grey neighbours (OpenStreetMap)
  data/parks.json         every park from the BMA / Rocket Media Lab list (690 parks)
  data/district-facts.json  population and green space per person for the 50 districts
  api/data.js             loads and checks the district's data (example files or backend)
  hooks/useMapData.js     loading / error / retry
  lib/parks.js            park size classes and reach
  lib/policy.js           share of the district within 400 m of a park
  lib/planting.js         planting score and level of the example plots, nearest park
  lib/district.js         the parks that reach the district, park sizes, 400 m coverage, plot scores
  lib/sites.js            recommended sites: removes the crowded ones, size class, score
  lib/backendResults.js   GA sites per 1 km square, green inside the group circles
  lib/geo.js              areas, distances, points in polygons, frame corners
  components/map/         Leaflet map, map options, parks, policy, ★ GA sites, red plots and ✓, green groups, info boxes, green image
  components/sidebar/     overview, park, recommended site, abandoned plot and green group panels, cards
  components/charts/      half pie gauge
  components/ui/          cards, lists, loading and error states
  mock/suan-luang/        backend green image, frame corners, summary, park checks, GA sites, green groups, example plots
public/                   favicon
docs/API.md               the data contract for the backend
docs/mock-data/           scripts that made the data files
```

## Data

- **Parks:** the BMA Office of Environment park lists via Rocket Media Lab (CC BY 4.0), with 281 accessible parks and 495 "15-minute" parks. A row is merged into a park only when it is in the same district and has the same name (within 1 km), or, across the two lists, sits within 30 m at a similar size (at most 2× the area). That gives 690 parks. Every merge and the 7 rows with impossible coordinates are listed in `src/data/parks.json` (`metadata.merges`, `metadata.skipped`).
- **Green:** from backend v3 (the newest `Final_Results/Theosmain/run_*`, THEOS-2 image "Theosmain", 7 km × 6 km). The image's position is fitted from the backend's GA sites, which carry UTM coordinates, to about 1 m.
- **Recommended sites (GA) and green groups:** the backend's `ga_parks.geojson` and `green_groups.geojson` from the same run, unchanged.
- **Abandoned plots (red):** **example data** from OpenStreetMap land use (see "How the red plots were chosen" above).
- **How it was made:** see [docs/mock-data/](docs/mock-data/README.md).

## Changing things

- **Rules:** park classes, the 400 m radius, the recommended-site rules and the planting score points are in `src/lib/constants.js`.
- **Districts:** `src/data/districts.js`. Adding a second district brings back the District drop-down.
- **Colors:** UI colors are in `src/index.css` (`@theme`), and data colors are in `src/lib/constants.js`. A test keeps the park circle colours apart from the Recommend ★, the green groups and the red plots.
- **Base maps:** tile URLs and credits are in `src/config.js`.

## Credits

- **Satellite tiles:** © Esri (Esri, Maxar, Earthstar Geographics and the GIS User Community).
- **Street tiles and map data:** © OpenStreetMap contributors (ODbL). The street tiles come from `tile.openstreetmap.org` and need no API key, which is fine for demos. For heavy traffic, use a tile provider (see the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/)).
- **Park lists and district figures:** BMA Office of Environment via Rocket Media Lab (CC BY 4.0).
- **Satellite analysis:** THEOS-2 imagery from GISTDA, processed by the team's backend.

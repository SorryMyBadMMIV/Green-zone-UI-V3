# How the data files were made

These scripts made the files in `src/data/` and `src/mock/suan-luang/`. They are **not** part of the app. Run them again only to refresh the data, for example after the backend makes a new run.

## 1. Park list and district facts (Python, no extra packages)

```bash
python -I make-parks.py "<path to สวนสาธาณะและพื้นที่สีเขียวใน กทม. [ข้อมูลดิบ].xlsx>" <path to the project>
```

It writes `src/data/parks.json` and `src/data/district-facts.json`. It merges a row into a park only inside the same district: the same name within 1 km, or (across the two lists) the same place within 30 m at a similar size. It logs every merge and every skipped row in the file's `metadata`.

## 2. The backend's results (Python: numpy, scipy, rasterio, Pillow)

Both scripts read the newest `Final_Results/Theosmain/run_*` folder of the backend. They only read the backend folder; the `-B` flag stops Python from writing cache files into it.

```bash
python -I -B make-green-layer.py <path to the Green-zone-v3 backend folder> <path to the project>
python -I -B copy-backend-results.py <path to the Green-zone-v3 backend folder> <path to the project>
```

- `make-green-layer.py` writes `src/mock/suan-luang/green.png` (the backend's green mask as a see-through overlay) and `frame.json` (where the image sits on the map). The GeoTIFF is not in the backend repo, so the image's position is fitted: every GA site is the centre of a green patch and carries its UTM coordinates, so matching the sites to the patches in `green_preview.png` gives the image's corner to about 1 m. The script prints the fit and stops if it is poor.
- `copy-backend-results.py` copies the run's `summary.json`, park checks, GA sites (the recommended sites) and green groups into `src/mock/suan-luang/`.

## 3. District outlines and the example abandoned plots (Node: osmtogeojson + turf, in a separate folder)

```bash
mkdir greenlantern-mockgen && cd greenlantern-mockgen
npm init -y && npm install osmtogeojson@3.0.0-beta.5 @turf/turf@7
# copy the .mjs files from docs/mock-data/ into this folder, then:
node fetch-district.mjs --name "Suan Luang District, Bangkok" --out suan-luang-district-raw.json
node fetch-frame-osm.mjs --bbox 100.5894,13.6942,100.6645,13.7589 --tiles 6x3 --out suan-luang-frame-raw.json
node make-suan-luang-data.mjs <path to the project>    # after step 2
```

It writes `src/data/districts/suan-luang.json` (Suan Luang and its neighbours) and `src/mock/suan-luang/abandoned.geojson` (the red **example** plots), both from OpenStreetMap (© OpenStreetMap contributors, ODbL). A plot is taken when its OpenStreetMap tag is brownfield, construction, greenfield or vacant land ("concrete or soil") or scrub or meadow ("overgrown"), it is at least 200 m², and it lies inside Suan Luang and the image. Plots inside parks, sports grounds, schools, temples, hospitals, military land or cemeteries are left out. Buildings are not checked, and OpenStreetMap can be out of date.

**Where everything comes from:** the parks from the BMA list (Rocket Media Lab, CC BY 4.0); the green, park checks, recommended sites (GA) and green groups from the backend's THEOS-2 results; the district outlines and the example abandoned plots from OpenStreetMap.

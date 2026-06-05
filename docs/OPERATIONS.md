# Operations

## Environment Contracts

Required local runtime:

- Node `24.11.1`
- npm `11.6.2`
- Python GIS worker packages from `requirements.gis-worker.txt` when running
  source-native raster or point-cloud proof scripts:

```bash
python -m pip install --user -r requirements.gis-worker.txt
```

Use `.env.local` for local environment variables. Keep `.env.example` current and token-free.

## Baseline Commands

```bash
npm install
npm run format:check
npm run lint
npm test
npm run build
npm run macro:build -- --fixture
npm run macro:validate -- --fixture
npm run macro:ready
npm run visual:check
npm run agent-ready:check
npm run public-workflow:check
npm run privacy:check
npm audit --audit-level=moderate
```

## Local Preview Runbook

Start the app:

```bash
npm run dev
```

For provider-token runs, do not rely on a secret merely existing in Infisical.
The dev process must be started with those secrets injected:

```bash
INFISICAL_CLIENT_ID=... INFISICAL_CLIENT_SECRET=... npm run dev:infisical
```

`npm run dev:infisical` loads `simpleloop/dev/projects/_shared/providers/mapbox`
and then starts `npm run dev`. It keeps the Mapbox token server-only, defaults
`NEXT_PUBLIC_MAPBOX_PROXY_ENABLED=true` and
`NEXT_PUBLIC_MAPBOX_PROXY_URL=/api/mapbox/satellite/{z}/{x}/{y}` when
`MAPBOX_TOKEN` exists, and selects the Mapbox Satellite basemap and imagery
providers for that token-backed local run unless provider env vars override
them. It prints only loaded key names. A normal `npm run dev` will not see
Infisical secrets unless the parent shell already contains them.

Mapbox live proof after startup:

```bash
curl -I http://localhost:3000/api/mapbox/satellite/0/0/0
```

Expected when wired: HTTP `200` with an image content type. Expected when not
wired: HTTP `503` because `MAPBOX_TOKEN` is missing from the process.

Open:

```text
http://localhost:3000
```

Expected first viewport:

- Fixed left sidebar, top header/search, central globe canvas, selected-place affordance, and footer telemetry.
- Distant view labeled `Orbit Globe`, rendered as a real Three.js sphere with drag/idle rotation; very close detail view labeled `Source-backed map output`.
- Visible selected-cell H3 affordance or enabled analytical mesh overlay and nonblank map/globe surface.
- Terrain/source status visible in footer and notes panels.
- Source/provenance drawer available from the rail for active provider, mock/future, license, confidence, and limitation review.
- U3/U5/U8 tier controls, with U8 generated locally inside the selected U5 context.
- Selected-hex, analytics, macro, source, terrain, imagery, and local/private user data panels available on demand from the rail.

## Terrain Provider Operations

V1 browser terrain display is registry-driven:

1. Use `NEXT_PUBLIC_TERRAIN_TILEJSON_URL` when configured.
2. Use the official USA/Canada DTM source-preview provider when a searched coordinate is inside the covered North America source scope and the operator/user selects or triggers source inspection.
3. Use Mapterhorn PMTiles terrain from `NEXT_PUBLIC_MAPTERHORN_PMTILES_URL`, defaulting to `https://download.mapterhorn.com/planet.pmtiles`, only as visual fallback terrain.
4. Fall back to Mapzen/Joerd Terrarium XYZ tiles from `NEXT_PUBLIC_MAPZEN_TERRARIUM_URL`, defaulting to `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`.
5. Fall back to the no-token MapLibre demo raster-dem provider.
6. Keep the globe shell nonblank and report provider status if terrain is unavailable.

`NEXT_PUBLIC_TERRAIN_PROVIDER` may prefer `source-auto-dtm-preview`, `source-auto-best-dtm-preview`, `mapterhorn-pmtiles`, `mapzen-joerd-terrarium`, or `maplibre-demo-dem`, but the env TileJSON provider still has highest priority. PMTiles terrain is loaded through the browser `pmtiles://` protocol and must remain token-free unless a future deployment explicitly adds cost and access controls.

Terrain worker/package generation has a stricter rule than the browser display:
do not render or consume Mapterhorn tiles as the source of truth. Mapterhorn may
be used as a reference catalog/attribution clue for upstream source families,
but the worker must resolve directly to official upstream providers such as
USGS, Natural Resources Canada, provincial LiDAR/DEM services, or other
reviewed source COGs/archives.

The left rail Terrain panel is the runtime operator control for terrain. It can toggle the DEM/source overlay and switch between map-ready providers without restarting the app. Raster-dem providers feed MapLibre terrain and hillshade. The official source-preview provider adds a MapLibre `raster` layer instead of calling `map.setTerrain`; it proves live source display, not browser-side elevation decoding. If the selected provider fails, the renderer should fall back to the next map-ready candidate and update footer/status messaging.

Terrain remains available in close searched views. Users can search a coordinate or place, fly into the local source-backed map output, then switch the DEM overlay between Mapterhorn, Mapzen/Joerd, or configured terrain for that area without losing the selected marker, macro overlays, or H3 interaction state.

The source-preview route is:

- `GET /api/terrain/source-preview/source-auto/dtm/{z}/{x}/{y}` for automatic USA/Canada DTM preview routing.
- `GET /api/terrain/source-preview/source-auto/dsm/{z}/{x}/{y}` for automatic USA/Canada DSM preview routing. USA DSM uses the bounded USGS LPC point-cloud worker when LPC source coverage is proven.
- `GET /api/terrain/source-preview/source-auto-best/dtm/{z}/{x}/{y}` for best official DTM preview routing. It prefers proven 1 m sources and may return explicit 2 m Canada HRDEM when that is the best official source.
- `GET /api/terrain/source-preview/usgs-3dep/dtm/{z}/{x}/{y}` for USGS 3DEP 1 m DTM preview tiles.
- `GET /api/terrain/source-preview/usgs-3dep-lpc-dsm/dsm/{z}/{x}/{y}` for USA USGS LPC-derived DSM preview tiles where the point-cloud worker can produce retained evidence.
- `GET /api/terrain/source-preview/canada-hrdem/dtm/{z}/{x}/{y}` for Canada HRDEM DTM preview tiles.
- `GET /api/terrain/source-preview/canada-hrdem/dsm/{z}/{x}/{y}` for Canada HRDEM DSM preview tiles where local coverage is proven.
- `GET /api/terrain/source-preview/probe?lat=<lat>&lon=<lon>&role=dtm|dsm>` for public-safe coverage checks.

USGS DTM display tile requests use the worker-side USGS 3DEP renderer after either the 1 m product index or the official Source DEM index proves 1 m-class coverage. That worker currently renders from the official 3DEPElevation ImageServer and retains JSON/PNG evidence; a future hardening step may replace that render input with direct S1M COG/package refs where the official tile index is available. Canada display tile requests use the worker-side HRDEM COG renderer after STAC source selection, not a relabelled WMS hillshade tile. Broad STAC coverage alone is not enough. If the selected COG is absent, blank, no-data, or renderer-unavailable, the route must return a blocked/probe-failed state or a transparent fail-soft tile, not a misleading terrain claim. Canada is not treated as country-wide 1 m terrain: Mapterhorn lists the national Canada source family as partial 2 m HRDEM, and 1 m is accepted only when a direct HRDEM/provincial source proves it for that tile. Strict source-auto mode requires proven 1 m DTM/DSM. Best mode exists for practical inspection and must expose the returned resolution in `X-VMesh-Terrain-Resolution-Meters`.

Canada HRDEM and British Columbia LidarBC are source-resolved and worker-rendered, not browser-proxied as public XYZ upstreams. The probe API checks LidarBC first for broad BC coordinates, then HRDEM. Covered LidarBC probes return `/api/terrain/source-preview/bc-lidarbc/{role}/{z}/{x}/{y}`. Covered Canada probes return the strict `/api/terrain/source-preview/source-auto/{role}/{z}/{x}/{y}` route or the best-available `/api/terrain/source-preview/source-auto-best/{role}/{z}/{x}/{y}` route. Both worker paths invoke `scripts/terrain-cog-probe.py`: LidarBC resolves official FeatureServer DEM layers `5` then `6` for DTM and DSM layers `1`, `2`, then `3`, filtering to 1 metre GeoTIFFs with valid pixels; Canada resolves HRDEM STAC COGs and allows 2 m only when the route is explicitly best-available. If the source raster is absent, no-data, or the renderer is unavailable, the route returns a transparent fail-soft tile rather than relabeling HRDEM, Mapterhorn, or generic DEM as source truth.

The worker-rendered source-preview routes cache transient PNG/JSON output under the OS temp directory (`vmesh-terrain-source-preview`), not `.next` or `.artifacts`, because worker JSON can contain absolute local render paths. Retained live-proof artifacts should be copied into `.artifacts/terrain-source-preview/...` with public-safe paths and redacted metadata only.

USA DSM is separate from the 3DEP DTM route. The probe API and worker planner
use `usgs-3dep-lpc-dsm` as a separate source-index resolver for official USGS
3DEP Lidar Point Cloud projects. It tries the primary LPC index layer and the
parallel query layer, and accepts `Meets` plus `Meets with variance` entries as
1 m-class source evidence while preserving the category in retained metadata.
For a qualifying public USA AOI,
`/api/terrain/source-preview/probe?role=dsm` returns
`status=source-available`, `providerId=usgs-3dep-lpc-dsm`, and a
`source-auto/dsm/{z}/{x}/{y}` tile template. That proves source availability
only. Actual display evidence comes from the tile route invoking the bounded
point-cloud worker, deriving a retained `surface-dsm` PNG/GeoTIFF from LAZ/LAS
assets, and returning `X-VMesh-Terrain-Render-Mode=worker-point-cloud`.

Run the coordinate/search decision proof with the local app running:

```bash
npm run terrain:probe-live-proof
```

This calls `/api/terrain/source-preview/probe` for public-safe USA, Canada, and
BC DTM/DSM coordinates and writes
`.artifacts/terrain-source-preview/source-preview-coordinate-probe-live-proof-latest.json`.
Canada and BC probe decisions use the same worker-side COG/GeoTIFF evidence
class as the rendered tile routes, not only broad STAC/FeatureServer metadata.
The proof must include covered strict 1 m DTM examples where official sources
prove them and a fail-closed Canada gap where a source asset exists but the
sampled COG pixels are no-data. That gap is expected and is why
`universalUsaCanadaOneMeterDtmProven` remains `false`.

Run the current USA/Canada official-source coverage matrix with:

```bash
npm run terrain:coverage-matrix
```

This writes `.artifacts/terrain-source-preview/usa-canada-1m-terrain-coverage-matrix-latest.json` plus retained per-source JSON/PNG artifacts. The filename preserves the original strict 1 m milestone name, but the matrix is not a country-wide 1 m coverage claim. It is a `live-proof` run for selected public-safe source checks. It proves:

- USGS 3DEP 1 m DTM can be source-checked and rendered for covered USA AOIs.
- Canada HRDEM 1 m DTM/DSM can be source-checked and rendered where HRDEM Mosaic 1 m has valid pixels.
- LidarBC 1 m DEM/DSM can be source-checked and rendered where the official FeatureServer returns 1 metre GeoTIFFs.
- Known 1 m gaps fail closed instead of falling back to 2 m HRDEM, Mapterhorn, or generic DEM.

The matrix deliberately sets `universalUsaCanadaOneMeterDtmProven: false`. Do not claim universal 1 m USA/Canada coverage. Canada-wide terrain should be described as partial 2 m HRDEM by default, with direct 1 m HRDEM/provincial coverage only where the resolver proves it. Mapterhorn attribution is useful for source-family discovery, but Mapterhorn's Canada entry is `cahrdem2` at 2 m, so it cannot prove Canada-wide 1 m coverage.

Run the broader public-safe country sampler with:

```bash
npm run terrain:country-sample-live-proof
```

This probes a small USA/Canada coordinate sample for strict 1 m-class DTM and DSM,
then renders DTM display tiles for covered DTM samples within the configured
budget. Here 1 m-class means 1 m or better. Override the display budget with `--max-dtm-tile-renders <n>` or
`--render-all-dtm`. The command writes
`.artifacts/terrain-source-preview/usa-canada-terrain-country-sample-live-proof-latest.json`
and retained DTM PNGs under
`.artifacts/terrain-source-preview/country-sample-live-proof/`. The sampler is
evidence against over-claiming: even a perfect sample does not prove country-wide
coverage, and any blocked sample keeps the broad `any coordinate` goal
unproven.

After starting the local app, run the source-preview display-route proof with:

```bash
npm run terrain:route-live-proof
```

By default this calls `http://localhost:3000` with `refresh=1`. Override with
`VMESH_ROUTE_PROOF_BASE_URL`, `VMESH_ROUTE_PROOF_REFRESH=0`, or
`--base-url`. The command writes
`.artifacts/terrain-source-preview/source-preview-route-live-proof-latest.json`
and retained PNGs under
`.artifacts/terrain-source-preview/route-live-proof/`. It is a `live-proof`
gate only when the route returns `200`, `image/png`, the expected official
provider, the expected DTM/DSM ground role, the expected resolution header, the
expected worker render mode, and a non-trivial retained PNG. It proves display
route behavior for selected public-safe tiles; it still does not prove
universal 1 m USA/Canada terrain.

Run the source-to-viewer browser proof with:

```bash
npm run terrain:viewer-live-proof
```

This starts or reuses the local app, opens a headless Chrome/Edge instance,
drives the development `window.__vmeshStore` through public-safe DTM and DSM
fly-to workflows, waits for the real terrain probe and tile-readiness path to
mark the source-preview terrain active, and retains the actual worker PNGs
requested by the viewer under
`.artifacts/terrain-source-preview/viewer-live-proof/`. The report is written
to
`.artifacts/terrain-source-preview/source-preview-viewer-live-proof-latest.json`.
It is a selected-AOI source-to-viewer `live-proof` gate. It deliberately keeps
`universalUsaCanadaOneMeterDtmProven: false` until country-wide evidence
exists.

Run the terrain package proof bridge with:

```bash
npm run terrain:package-live-proof
```

This writes
`.artifacts/terrain-source-preview/terrain-package-live-proof-latest.json`.
It is a `live-proof` gate only when retained source-preview worker reports are
promoted into terrain package manifests with matching source id, DTM/DSM role,
resolution, retained evidence, and AOI coordinate/tile evidence. It also keeps a
known Canada gap blocked. This proves the optional package contract for selected
public-safe AOIs; it does not prove universal USA/Canada 1 m terrain.

Do not add paid terrain APIs, secret-bearing URLs, or live ingestion jobs without adding provider metadata, tests, license notes, cost controls, and fallback behavior.

## Basemap Provider Operations

Basemap selection is separate from terrain selection:

1. Use `NEXT_PUBLIC_BASEMAP_STYLE_URL` when configured.
2. Use `NEXT_PUBLIC_BASEMAP_PMTILES_URL` for a configured Protomaps/offline PMTiles basemap.
3. Use the token-free MapLibre/OSM raster fallback by default.
4. Keep the offline shell nonblank if external basemap styles or tiles fail.

Optional values:

- `NEXT_PUBLIC_BASEMAP_PROVIDER`: `maplibre-demo`, `openfreemap-vector`, `protomaps-pmtiles`, `mapbox-satellite-basemap`, or `offline-shell`.
- `NEXT_PUBLIC_BASEMAP_STYLE_URL`: custom MapLibre style JSON URL.
- `NEXT_PUBLIC_BASEMAP_PMTILES_URL`: hosted/local PMTiles basemap URL.
- `NEXT_PUBLIC_ENABLE_REMOTE_GEOCODING`: defaults to `true` for no-key Nominatim autocomplete; set to `false` for privacy-sensitive or offline deployments.

Mapbox satellite can be selected as a base globe only when a deployment explicitly configures a restricted public token or the server-side proxy. Do not add Mapbox or other token-bearing basemaps as public defaults.

The cinematic orbit globe is not a basemap provider. It uses a locally bundled NASA Blue Marble raster with procedural fallback so the public app stays token-free and nonblank. Source-backed map, terrain, labels, and overlays still come from MapLibre providers after search/zoom moves the user into close map output.

Search autocomplete runs through `/api/geocode/search`, which performs bounded Nominatim lookups from the server and returns normalized fly-to suggestions. This avoids browser CORS/User-Agent problems and keeps coordinate disclosure visible in the privacy docs. Disable remote geocoding for offline/private deployments.

Production open-map deployments should prefer CDN/object-storage PMTiles packages for basemaps and derived overlays. Cloudflare R2, Cloudflare CDN, or an equivalent static object store can host PMTiles archives that the browser reads through HTTP range requests. This keeps public demos cheap, cacheable, and portable to local hub mirrors.

Operational rules for PMTiles/CDN delivery:

- Keep public basemap packages token-free where possible.
- Preserve OSM/OpenFreeMap/Protomaps/Nextzen-style attribution and license metadata.
- Version tile archives and expose package vintage in source/provenance UI.
- Keep private AOIs, generated user-local packages, and local hub caches outside Git.
- Do not rely on public OSM raster tile servers for production traffic.
- Use a dedicated tile-generation/preprocessing job before publishing new terrain, contour, imagery, landcover, or H3 summary packages.

## Open Map Source Operations

`lib/openMapSources.ts` tracks open map optionality beyond the active basemap. The registry includes map-ready visual sources and preprocessing sources:

- OpenStreetMap raster/OpenFreeMap: browser visual context and no-token fallback only.
- Protomaps PMTiles: preferred configured/offline basemap bundle path.
- Overture Maps GeoParquet: source-backed feature ingestion candidate for buildings, roads, places, divisions, addresses, land, and water.
- OSM PBF extracts: self-hosted source-of-truth path for regional OSM processing.
- Natural Earth: low-zoom offline/global context.
- OpenAddresses: optional geocoding/address enrichment with privacy and per-source license review.
- LiDAR/EPT sidecars: future point-cloud inspection references; vmesh should consume derived products, not raw point clouds in the main globe.

Operational rule: do not scrape public map tiles as data. For source-backed features, return provider-native refs through the broker first. If a deployment explicitly preprocesses data, keep it in downstream/local worker storage such as PostGIS, PMTiles, COG/PMTiles rasters, or H3 summaries with attribution, license, version, and limitations.

PostgreSQL/PostGIS is the preferred production spatial backend once vmesh moves beyond committed fixtures and local Zustand state. It should store source metadata, geometry indexes, H3 indexes, provenance, source manifests, user records, and future relationship edges, not heavy provider payloads by default. GraphQL may be added later for rich benchmark or cross-layer queries, but it is not an operational prerequisite for the current app.

## Deferred Analysis Provider Operations

Climate, hazard, solar, wind, sector-map, and weather-derived analysis providers are deferred from the visible app. Provider scaffolding can remain for future package work, but it should not be exposed as a user-facing source layer or automatic place judgment in this phase.

Provider boundaries:

- Open-Meteo: no-key selected-cell weather prototype.
- NASA POWER: future solar/meteo provider boundary.
- ERA5/CDS: server/offline preprocessing only; no browser fetch and no credentials in Git.
- NASA FIRMS: future active-fire input; not called in V1.
- Terrain-derived flood: derived/HAND-ready scaffold; not authoritative flood mapping.

Future live analysis calls can expose selected coordinates to a provider. For privacy-sensitive deployments, route through a local hub cache/gateway or rely on offline/precomputed H3 summaries.

`lib/climateDataSources.ts` extends macro optionality with a provider funnel:

- Open-Meteo: selected H3 centroid live prototype.
- NASA POWER: future solar/meteo cache path.
- NOAA GFS open forecast grids: future offline H3 forecast preprocessing.
- ERA5/CDS: future historical climate normals and anomalies; credentials stay out of browser/Git.
- NASA FIRMS: future active-fire observations after access and emergency-use review.
- Terrain-derived flood: derived/HAND-ready decision-support scaffold.
- H3 weather graph model: future research path for encoding forecast/reanalysis fields onto the H3 graph.

Do not send broad map viewport queries to climate or hazard providers from the browser. Use selected-cell queries, capped rings, or local/server H3 bundles only after this analysis surface is intentionally reintroduced.

## Deferred Analysis Package Operations

The committed analysis package fixture is retained for future-provider testing. Rebuild and validate it with:

```bash
npm run macro:build -- --fixture
npm run macro:validate -- --fixture
npm run macro:ready
```

The builder writes `fixtures/macro-packages/western-europe-demo.manifest.json` and `fixtures/macro-packages/western-europe-demo.h3-summary.json`. The manifest must keep `liveNetworkUsed: false`, `noBrowserGridFetches: true`, `noPaidProviderCalls: true`, `containsUserRecords: false`, and `containsExactPrivateAddresses: false` for committed fixtures.

`npm run macro:ready` is retained as a fixture gate. In the current visible product, passing this command does not promote analysis output into the UI.

Future production analysis packages must pass an explicit profile before they can be treated as production data:

```bash
npm run macro:ready -- --profile production-core --dir <package-dir> --manifest <manifest.json> --summary <h3-summary.json>
npm run macro:ready -- --profile production-full-atlas --dir <package-dir> --manifest <manifest.json> --summary <h3-summary.json>
```

Production profiles must reject fixture/mock/future-provider source types, fixture cadence, unreviewed provider terms, browser grid-fetch modes, paid-provider calls in default packages, exact private addresses, missing provenance, missing validity windows, and authoritative hazard/survey claims.

Future analysis packages should be generated outside the browser by a local hub or server worker. The expected path is:

1. Select a bounded AOI and H3 tier.
2. Fetch or read reviewed provider inputs under their license and rate limits.
3. Transform gridded or point inputs into H3 summaries with source variables, validity windows, model run time, uncertainty, and limitations.
4. Write a manifest plus H3 summary artifact and optional PMTiles/COG/vector artifacts.
5. Validate the package before exposing it to the UI or source drawer.

Do not commit real package payloads, private AOIs, downloaded climate grids, provider caches, or local hub output unless they are sanitized fixtures.

## Ecosystem Source Broker Operations

The generic source broker exposes source-honest ecosystem planning for downstream apps:

- `GET /api/geospatial-package/sources` lists candidate providers, access class, status, provider-native ref/optional artifact kinds, license, attribution, and limitations.
- `GET /api/geospatial-package/sources?layer=terrain` filters the registry by layer.
- `GET /api/geospatial-package/intel-broker` returns the generated Intel Tools-derived source broker package when the operator has exported one, otherwise it returns the checked-in public-safe integrated snapshot.
- `GET /api/geospatial-package/ba-golden-evals` returns the public-safe BA golden-eval old-output catalog for Europe, Canada, USA, Germany, and Lebanon.
- `GET /api/geospatial-package/ba-golden-evals?site=scotland-rural-burmieston` returns the cleaned one-site package for the current active site-id pass.
- `GET /api/geospatial-package/plan` returns a deterministic Lisbon sample source plan for smoke tests.
- `POST /api/geospatial-package/plan` accepts an AOI plus requested layers and returns the current planning shape. The route name is historical; the desired downstream contract is STAC/source-broker output.

Example request:

```json
{
  "aoi": {
    "centroid": { "latitude": 38.7223, "longitude": -9.1393 },
    "label": "Sample AOI"
  },
  "layers": ["terrain", "imagery", "roads", "buildings", "water", "climate"],
  "offline": true
}
```

The planner does not download data, call paid providers, store provider payloads, or generate PMTiles inside the browser. It selects open/cacheable/source-ready providers where possible and reports preprocessing, token, license, paid, blocked, or missing states honestly. Downstream apps should be able to consume provider-native refs through STAC-compatible spatial records and typed ecosystem records. Optional local/server workers may consume the plan and write PMTiles, vector tiles, raster tiles, COGs, GeoParquet extracts, H3 summaries, ecosystem ledgers, and manifests outside Git only when that deployment explicitly enables derived/cache output.

Reviewed BA package routes:

- `GET /api/geospatial-package/ba` returns reviewed geospatial source refs, STAC-like refs, fetch recipes, live-proof refs, warnings, and gaps.
- `GET /api/geospatial-package/ecosystem` returns reviewed ecological/ecosystem records, source refs, VWiki handoff refs, display modes, warnings, and gaps.

Run the BA route proof with the local app already running:

```bash
npm run ba:route-proof
```

The script writes:

```text
.artifacts/source-broker/ba-golden-site-route-proof-latest.json
```

Public-safe sample responses are retained under `.artifacts/source-broker/`. Exact private golden-site coordinates are not written to the proof artifact. To run operator-local golden-site checks, set these variables in the local shell or secret manager, not in Git:

- `VMESH_BA_KAMLOOPS_ROSE_LAT`
- `VMESH_BA_KAMLOOPS_ROSE_LNG`
- `VMESH_BA_ALBERTA_GOLDEN_LAT`
- `VMESH_BA_ALBERTA_GOLDEN_LNG`
- optional `VMESH_BA_ROUTE_PROOF_BASE_URL`

If those variables are absent, the proof records setup gaps and still verifies public-safe Kamloops and Calgary sample routes.

Intel Tools sidecar export:

```bash
python scripts/export-intel-sidecar-source-broker.py
```

Optional variables:

- `VMESH_INTEL_SIDECAR_ROOT`: operator-local sidecar directory containing the retained SQLite runs.

Default output:

```text
.artifacts/source-broker/intel-sidecar-source-broker-package.json
```

This output is `dry-run` evidence. It proves local processing of retained Intel outputs, segmentation, dedupe, review queues, and BA source-ref packaging. It does not prove that any upstream provider produced a fresh retained response for a golden evaluation AOI. Production readiness still requires `live-proof` for at least one public-safe Kamloops/Rose or Alberta package. Keep generated packages out of Git unless a package is explicitly reduced to a public-safe fixture with no local paths, exact private coordinates, raw scraped pages, secrets, signed URLs, or bulky provider payloads.

The `/api/geospatial-package/intel-broker` route uses `lib/intelSourceBrokerRuntime.ts` to load the retained artifact first and fall back to `lib/intelSourceBrokerSnapshot.ts` if the artifact is absent or malformed. That snapshot is the stable public-safe memory of the current Intel Tools processing pass: counts, planned campaigns, setup gaps, and review/gap state. It is not a replacement for rerunning the sidecar exporter, and it should not mark planned campaigns or license-review items as BA operational sources.

BA golden-eval old-output import:

```bash
curl http://localhost:3000/api/geospatial-package/ba-golden-evals
curl "http://localhost:3000/api/geospatial-package/ba-golden-evals?site=scotland-rural-burmieston"
```

This is `dry-run` VMesh packaging of retained BA local evidence and old Intel source intelligence. It is useful because BA can request by `siteId` and receive a laser-fast source package without re-scraping old runs. It is not fresh upstream provider proof, and it does not copy raw BA licensed files, exact coordinates, exact private addresses, signed URLs, or provider order ids into VMesh. The active site is reviewed one at a time; currently `scotland-rural-burmieston` is marked `old_outputs_exhausted` and includes an added 2026-06-03 focused Scotland source-family sweep as `needs_probe` / `needs_license_review` candidate intelligence. All other Europe, Canada, USA, Germany, and Lebanon golden eval sites now also have focused 2026-06-03 packages with site-specific local data and ecosystem context candidates, and every site reports `sourceSweepState: focused_source_sweep_completed`; research-only context is marked for advanced/API mode rather than default BA operational GIS use. Kamloops/Rose and Alberta exact AOI live proof still require operator-local private-coordinate env vars. Operational promotion for any new candidate still requires AOI probes and license checks.

Production package serving should be asynchronous. The API should accept a bounded AOI/H3 request, return a source plan plus package/job identifiers, and let workers build or refresh artifacts in storage. Consumers should be able to poll or fetch a manifest without learning provider-specific logic. Cache hits can return immediately; cache misses should queue work while the consumer app continues with its own fallback UI. Public vmesh operations docs should describe this generic consumer contract and must not include private downstream repo names, local paths, exact private AOIs, provider credentials, or unpublished commercial details.

`lib/geospatialPackage/terrainWorker.ts` is the first concrete terrain-worker
contract. It accepts a package plan/request, maps the selected terrain source to
a vmesh terrain tool profile, calls an injected raster-query implementation when
one is attached, validates AOI coverage and artifact refs, and emits a terrain
package manifest. `lib/geospatialPackage/terrainWorkerRuntime.ts` adds
`VMESH_TERRAIN_WORKER_MODE=configured-artifact` for wiring already-produced
terrain refs into the contract. That mode is `configured`, not `live-proof`,
because it does not prove that this vmesh run fetched, clipped, or generated the
artifact.

`lib/geospatialPackage/terrainSourceAdapters.ts` is the source-native input
resolver that sits before the terrain worker. It can plan official upstream
input refs without treating those refs as generated package artifacts. USGS 3DEP
uses the public ImageServer export route in dry-run mode for DTM/DEM, while the
source-preview tile route now invokes `scripts/terrain-usgs-3dep-render.py`
worker-side after 1 m product-index proof.
For arbitrary USA/Canada DTM package work, use
`createLiveNorthAmericaDtmSourceAdapterPlan` rather than static package-planner
selection alone. It tries the official regional chain with live source checks:
LidarBC where BC applies, USGS 3DEP where the 1 m product index covers the AOI,
then Canada HRDEM strict 1 m and explicit HRDEM best-available fallback. This
avoids rough bounding-box country mistakes around the border.
For arbitrary USA/Canada DSM package work, use
`createLiveNorthAmericaDsmSourceAdapterPlan`. It tries LidarBC DSM where BC
applies, USGS 3DEP LPC DSM where the official LPC source index covers the AOI,
then Canada HRDEM DSM where role-specific HRDEM STAC coverage is proven.
`usgs-3dep-lpc-dsm` uses the official USGS 3DEP Lidar Point Cloud index to
resolve qualifying 1 m-class source projects. The source-preview route can now
invoke the bounded point-cloud DSM worker for retained preview PNG/GeoTIFF
evidence where the selected LPC assets cover the requested tile. Canada HRDEM
can now resolve direct official `hrdem-mosaic-1m` DTM/DSM COG refs from the
Natural Resources Canada STAC API when live STAC evidence is supplied through
`createLiveTerrainSourceAdapterPlan`, but Canada-wide terrain should still be
treated as partial 2 m by default unless direct 1 m coverage is proven for the
tile. LidarBC now resolves official 1 metre
DEM/DSM GeoTIFF refs from the Government of British Columbia LidarBC
FeatureServer indexes when live FeatureServer evidence is supplied through
`createLiveTerrainSourceAdapterPlan`.
`canada-hrdem` and `canada-hrdem-dsm` are separate source identities: the first
is bare-earth DTM, the second is surface DSM for canopy/building/obstruction
context. Both use the same official HRDEM STAC resolver but select different
role-specific COG assets, and the proof bridge blocks a DSM proof selected
against the DTM source or vice versa.
`canada-hrdem-best-dtm` is a separate package-source identity for practical
Canada DTM fallback. It uses the same official HRDEM resolver, prefers 1 m when
proved, may resolve explicit 2 m HRDEM when that is the best official source,
records the exact source resolution in the input ref, and must not be counted as
strict 1 m milestone evidence.
`bc-lidarbc` and `bc-lidarbc-dsm` are also separate source identities. They use
the official LidarBC Open LiDAR Data Index ArcGIS FeatureServer layers for DEM
and DSM respectively, select only 1 metre GeoTIFF source records, and block when
the FeatureServer returns no 1 m tile for the AOI.

Source-native terrain adapter variables:

- `VMESH_USGS_3DEP_IMAGE_SERVER_EXPORT_URL`: optional override for the USGS
  3DEP ArcGIS ImageServer export endpoint.
- `VMESH_USGS_LPC_SOURCE_INDEX_URL`: optional override for the official USGS
  3DEP Lidar Point Cloud source-index query endpoint.
- `VMESH_CANADA_HRDEM_GEOTIFF_URL` or
  `VMESH_CANADA_HRDEM_GEOTIFF_URL_TEMPLATE`: configured Canada HRDEM source ref.
- `VMESH_BC_LIDARBC_GEOTIFF_URL` or
  `VMESH_BC_LIDARBC_GEOTIFF_URL_TEMPLATE`: configured LidarBC source ref.

Configured source templates may use `{bbox}`, `{west}`, `{south}`, `{east}`,
`{north}`, `{packageId}`, `{sourceId}`, `{toolId}`, `{targetResolutionMeters}`,
`{widthPx}`, and `{heightPx}`. These refs are `configured` only. The live-proof
bar is met only after a worker fetches/clips the source, writes retained COG or
PMTiles artifacts, records QA, and returns a manifest through the terrain worker
contract. Mapterhorn and Mapzen refs should not be used as source-native package
inputs; they are map-ready fallbacks for renderer continuity.

For the current USA/Canada official-source terrain milestone, "source-native"
means an official DTM/DSM source file, service, or archive is resolved for the
requested tile. The strict 1 m branch may claim 1 m only when a source proves
that resolution for the tile. Canada national/default coverage is partial 2 m
HRDEM, and direct 1 m Canada coverage is tile/province-specific. Source-native
does not mean a Mapterhorn PMTiles tile rendered at that location. If the
official source resolver can only prove 2 m, mixed-resolution, blank/no-data, or
generic DEM coverage, the worker must report that honestly and continue to a
better official source where one exists.

The immediate USA/Canada terrain milestone is source-to-viewer ingestion, not
full terrain-package artifact generation. A terrain source run is not proven
until a public-safe AOI shows the selected USGS 3DEP, Canada HRDEM, or LidarBC
route in the viewer with matching request bounds, active MapLibre source/layer
metadata, visible role/provenance labels, and retained screenshot plus
network/source logs. Hillshade, contours, terrain RGB, PMTiles, and terrain-slab
outputs are later derivatives and should not be treated as required evidence for
this first viewer gate.

The first implemented viewer gate is `Official DTM Source Preview`. Mapterhorn
is useful here only as a hint about upstream source families: USGS 3DEP 1 m
DEM/DTM for the United States (`us1*` in the Mapterhorn catalog) and Natural
Resources Canada HRDEM for Canada (`cahrdem2` in the Mapterhorn catalog).
`cahrdem2` is listed by Mapterhorn as a partial 2 m Canada source, so it is the
default national expectation rather than proof of country-wide Canada 1 m DTM.
For Canada 1 m, the resolver must add direct official 1 m HRDEM/provincial
sources where available, such as LidarBC for British Columbia, and record exact
source resolution per tile.
Current retained public-safe live-proof artifacts show:

- a USA public AOI covered by USGS 3DEP 1 m DTM preview;
- a USA public AOI rendered by `terrain:usgs-render` after USGS 3DEP 1 m
  product-index proof;
- a USA public AOI where `terrain:usgs-lpc-dsm-probe` resolves a qualifying
  official 3DEP Lidar Point Cloud source project for 1 m DSM derivation;
- a USA public AOI where `terrain:usgs-lpc-dsm-render` bins bounded point-cloud
  assets into a retained `surface-dsm` preview PNG/GeoTIFF;
- a Canada public AOI covered by Canada HRDEM 1 m DTM preview where the direct
  source COG proves 1 m pixels;
- a Canada public AOI rendered from an HRDEM 1 m DTM COG by
  `terrain:cog-probe`;
- a Canada public AOI rendered from an HRDEM 1 m DSM COG by
  `terrain:cog-probe`, labelled as `surface-dsm` rather than bare-earth DTM;
- a British Columbia public AOI where the LidarBC FeatureServer resolves direct
  1 m DEM and DSM GeoTIFF refs;
- a Canada public AOI that broad HRDEM STAC can name but the local preview gate
  treats as blocked because the preview tile is blank/no-data.

Blocked cases are intentional. The worker must not label a tile as source-backed
1 m terrain unless the relevant official product-index/COG proof succeeds.

`npm run terrain:usgs-render` is the first USA worker-side proof utility and is
also used by the USA DTM source-preview tile route. It checks the USGS 3DEP 1 m
product index at the requested coordinate or Web Mercator tile center, blocks
DSM because this route is DTM/DEM only, and writes a retained PNG preview tile
from the official 3DEPElevation ImageServer when coverage is proven. This is
official-service live proof, not direct S1M COG proof. Example:

```bash
npm run terrain:usgs-render -- --tile-z 13 --tile-x 1706 --tile-y 3109 --role dtm --render-output .artifacts/terrain-source-preview/denver-usgs-dtm-z13-1706-3109.png --output .artifacts/terrain-source-preview/denver-usgs-dtm-web-tile-render.json
```

`npm run terrain:usgs-lpc-dsm-probe` is the first USA DSM source-availability
proof utility. It queries the official 3DEP Lidar Point Cloud index, accepts only
projects with a public LPC link, 3DEP LPC requirements met, and
`dem_gsd_meters <= 1`, and writes a retained JSON proof. It must keep
`renderedArtifact: null`; converting this source into a displayed DSM tile is a
separate PDAL/LAZ worker task. Example:

```bash
npm run terrain:usgs-lpc-dsm-probe -- --lat 39.74 --lon -104.99 --label "Denver public-safe USGS LPC DSM source probe" --output .artifacts/terrain-source-preview/usa-denver-usgs-lpc-dsm-source-probe.json
```

`npm run terrain:usgs-lpc-asset-manifest` is the next USA DSM derivation gate.
It uses the same official LPC source-index lookup, downloads the project's
`0_file_download_links.txt`, enumerates LAZ/LAS source assets, and records
runtime readiness for point-cloud derivation tooling. This is still source
manifest evidence, not a DSM tile. If `pdal` or `laspy` is absent, the manifest
must report `canDeriveDsmInCurrentRuntime=false` and keep
`renderedArtifact=null`. Example:

```bash
npm run terrain:usgs-lpc-asset-manifest -- --lat 39.74 --lon -104.99 --label "Denver public-safe USGS LPC DSM asset manifest" --output .artifacts/terrain-source-preview/usa-denver-usgs-lpc-dsm-asset-manifest.json --sample-assets 10 --head-sample-size 5
```

`npm run terrain:usgs-lpc-dsm-render` is the bounded USA DSM render proof. It
queries the official LPC index, enumerates the selected project's LAZ/LAS links,
transforms the requested Web Mercator tile into the source CRS, shortlists
intersecting point-cloud tiles from filename-derived 1 km footprints, downloads
only those assets within `--max-assets` and `--download-budget-mb`, then bins
points by max elevation into a `surface-dsm` preview grid. This is still a
preview tile, not a production DSM package. Retain the JSON, PNG, and optional
GeoTIFF artifacts when proving the live bar. Example:

```bash
npm run terrain:usgs-lpc-dsm-render -- --tile-z 15 --tile-x 6826 --tile-y 12436 --label "Denver public-safe USGS LPC DSM render proof" --output .artifacts/terrain-source-preview/usa-denver-usgs-lpc-dsm-render.json --render-output .artifacts/terrain-source-preview/usa-denver-usgs-lpc-dsm-render.png --geotiff-output .artifacts/terrain-source-preview/usa-denver-usgs-lpc-dsm-render.tif --max-assets 6 --download-budget-mb 512
```

`npm run terrain:cog-probe` is the first worker-side proof utility for that
hardening step. It queries the Canada HRDEM STAC API, selects the DTM or DSM COG
asset, opens it with rasterio, samples a bounded pixel window, and returns
`covered` only when the selected COG is a 1 m source with valid non-no-data
pixels. A 2 m HRDEM asset is blocked by default for the current milestone. With
`--allow-2m-fallback`, the utility probes 1 m first, then tries 2 m only when
the higher-resolution source is absent or has no valid pixels. That is
best-available evidence, not strict 1 m evidence. The utility can also render a
Web Mercator PNG preview tile directly from the selected source COG.
Examples:

```bash
npm run terrain:cog-probe -- --lat 45.4215 --lon -75.6972 --role dtm --output .artifacts/terrain-source-preview/ottawa-hrdem-cog-probe.json
npm run terrain:cog-probe -- --tile-z 13 --tile-x 2373 --tile-y 2933 --role dtm --render-output .artifacts/terrain-source-preview/ottawa-hrdem-dtm-z13-2373-2933.png --output .artifacts/terrain-source-preview/ottawa-hrdem-dtm-web-tile-render.json
```

Use `--include-coordinate` only for public-safe probes. Without that flag the
JSON output redacts exact coordinates while preserving source id, COG ref, CRS,
resolution, no-data ratio, valid pixel count, and elevation summary. A broad
HRDEM STAC hit plus `0` valid COG pixels is `blocked`, not coverage. A
`--render-output` PNG is written only for covered source COG pixels.

`lib/geospatialPackage/terrainSourceProofs.ts` bridges these worker-side proof
JSON files back into the terrain worker contract. It accepts only covered
USGS 3DEP DTM, USGS LPC DSM, Canada HRDEM DTM/DSM, or LidarBC DTM/DSM proofs
with retained rendered artifacts, rejects secret-bearing refs, requires
coordinate or tile evidence matching the package AOI, and keeps the plain USGS
3DEP route blocked for DSM because that route is DTM-only. A 2 m Canada HRDEM
proof is accepted only through `canada-hrdem-best-dtm`; the strict
`canada-hrdem` source still blocks it. The resulting artifact is a display-ready
terrain preview proof, not yet a normalized COG/PMTiles terrain package.

Configured terrain artifact variables:

- `VMESH_TERRAIN_WORKER_TERRAIN_REF`: required terrain COG/PMTiles/raster ref.
- `VMESH_TERRAIN_WORKER_TERRAIN_KIND`: optional `cog`, `pmtiles`, or
  `raster-tiles`; defaults to `cog`.
- `VMESH_TERRAIN_WORKER_QA_REF`, `VMESH_TERRAIN_WORKER_HILLSHADE_REF`,
  `VMESH_TERRAIN_WORKER_CONTOURS_REF`, `VMESH_TERRAIN_WORKER_MANIFEST_REF`:
  optional retained refs.
- `VMESH_TERRAIN_WORKER_CRS`,
  `VMESH_TERRAIN_WORKER_VERTICAL_DATUM`,
  `VMESH_TERRAIN_WORKER_SOURCE_RELEASE`,
  `VMESH_TERRAIN_WORKER_RESOLUTION_METERS`: optional source metadata overrides.
- `VMESH_TERRAIN_WORKER_PRIVACY`: `private` by default; use `public` only after
  license and privacy review.

The configured refs must not contain API keys, signatures, tokens, credentials,
or signed URL query strings. The worker blocks secret-bearing refs.

Generated package artifacts and caches must live in object storage, local hub storage, or another configured package store, never in the public repo unless they are small sanitized fixtures.

Production hardening now enforced at the API boundary:

- `POST /api/geospatial-package/plan` requires `application/json`.
- Request bodies over `32 KB` are rejected.
- AOI bounds must be valid WGS84 `[west, south, east, north]` values with west/east and south/north ordering.
- Single planning requests are capped to a `10` degree AOI span in each direction until a queue-backed worker exists.
- Invalid H3 IDs are rejected by the route and cannot survive AOI normalization.
- Consumer app IDs, source preferences, and labels are sanitized.
- Secret-bearing or credential-bearing provider URLs are redacted from public responses and omitted from artifact URLs.
- Requested AOI disclosure is reported as `exact-centroid`, `h3-cell`, `bounds`, or `fallback-sample`, even though package math always normalizes an H3 and centroid.
- Preferred source IDs are advisory only; they cannot select paid, token-gated, license-gated, blocked, missing, or API-key-required providers.
- Responses use `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`.

Remaining production work before real package generation:

1. Add durable package job storage.
2. Add authenticated worker routes for package generation.
3. Add object-storage publication for generated PMTiles/COGs/GeoParquet/H3 summaries.
4. Add per-deployment rate limiting and audit logs that avoid raw private AOIs.
5. Add provider-specific license acceptance and cost controls before live downloads.

## Solar, Wind, And Sector Operations

Solar, wind, and permaculture-style sector layers are macro/topography products. They must preserve source role and confidence because they combine different truth levels.

Operational path:

1. Use browser SunCalc-style calculations only for interactive sun-path and seasonal direction previews.
2. Use server/local-hub pvlib-style preprocessing for solar position, irradiance transposition, terrain-horizon shading, and direct-sun-hour summaries.
3. Use active terrain DEM/DTM to derive slope, aspect, and terrain horizon where resolution and license allow.
4. Use DSM/LiDAR/building-height/canopy products only when source-backed; otherwise label obstruction shading as unavailable.
5. Use Open-Meteo or NASA POWER for no-secret selected-cell solar/meteo context where appropriate.
6. Use ERA5/GFS/station preprocessing for climate-normal wind roses.
7. Render wind roses and climate sector maps from summaries/manifests, not from broad live viewport calls.

Required provenance for solar access:

- H3 cell or AOI.
- Sun-position method.
- Terrain source and role.
- Slope/aspect source and resolution.
- Horizon/shading source.
- Cloud/irradiance source.
- Time period or representative date set.
- Confidence and limitations.

Required provenance for wind roses:

- Wind provider and variables.
- Height above ground.
- Time period.
- Direction bin size.
- Speed bins and calm threshold.
- Whether the rose is forecast, observed, station-derived, or reanalysis-derived.

Required provenance for sector maps:

- Sector type, angle range, seasonality, intensity, source, and confidence.
- Whether the sector is provider-derived, terrain-derived, user-observed, or mock.

Do not present solar summaries as bankable PV engineering, wind roses as structural design, or sector maps as automated permaculture recommendations.

## Sentinel/SEN2SR Imagery Operations

The browser app displays raster tiles and manifest metadata only. Heavy imagery processing belongs in `pipelines/sentinel_sr/` or a separate local hub/server worker.

Pipeline stages:

1. Query Earth Search / Element84 STAC for `sentinel-2-l2a` by AOI/date.
2. Filter by `eo:cloud_cover <= 10`.
3. Clip only the selected AOI window.
4. Validate AOI cloud-free ratio with SCL classes. The generic worker threshold can remain `>= 0.95`; the downstream-render-facing Sentinel SR route defaults to a stricter `>= 0.98` gate.
5. Run SEN2SRLite on RGB+NIR bands where local/server hardware supports it.
6. Write source COG, cloud mask COG, SEN2SR COG, preview PNG, manifest JSON, and optional PMTiles/XYZ tiles.
7. Serve only the manifest and tile URL to the Next.js UI.

The default upscaler path is ESAOpenSR/SEN2SRLite RGBN `x4`: source Sentinel-2 L2A `10 m`, target display output `2.5 m`, model id `SEN2SRLite/NonReference_RGBN_x4`, and `truthStatus: imagery-inferred-context`.

`POST /api/geospatial-package/sentinel-sr` is the public API boundary for downstream apps that need this imagery before prompt preparation or renderer submission. It is plan-only: it returns worker inputs and planned cache refs, but it does not accept tile output refs, caller-supplied cloud metrics, or caller-loosened cloud thresholds.

`POST /api/geospatial-package/sentinel-sr/complete` is the worker completion boundary. It is disabled unless `VMESH_SENTINEL_SR_WORKER_TOKEN` is configured and the request supplies that token. Only this authenticated route can attach generated tile refs, scene cloud cover, AOI SCL clear-pixel ratio, worker job id, and completion time.

Route states:

- `planned`: no ready tile ref exists. Run the Sentinel SR worker with the inline STAC payload.
- `validation-required`: worker completion evidence or trusted artifact refs are incomplete. Do not use it for the renderer yet.
- `ready`: authenticated worker completion exists, a trusted tile ref passed URL policy, and both scene-level cloud cover and AOI clear-pixel ratio passed.
- `blocked-cloud-gate`: worker-derived cloud metrics failed. Search a clearer scene or generate a cloud-free composite.

The route includes a `renderHandoff` object for downstream-app prompt preparation. Its input role is `texture`, not terrain, parcel, road, building, or legal truth. The downstream app should render a source-pack image from the tile product before sending it to the renderer when the renderer cannot consume PMTiles directly, and it should hold renderer submission unless `renderHandoff.availability === "ready"`.

Ready artifact refs must be HTTPS URLs on `VMESH_SENTINEL_SR_ARTIFACT_HOST_ALLOWLIST`. The URL policy rejects custom schemes, embedded credentials, secret-like query params, localhost, private IP ranges, link-local addresses, and metadata-service IPs such as `169.254.169.254`. `vmesh-cache://` refs are planned internal placeholders only and must not be treated as ready renderer inputs.

The EOX/Sentinel cloudless preview URL is useful for map inspection only. Do not upscale that JPEG tile product. SEN2SR must use Sentinel-2 L2A source bands (`B04`, `B03`, `B02`, `B08`) plus SCL cloud QA.

Optional imagery env vars:

- `NEXT_PUBLIC_IMAGERY_PROVIDER`: set to `mapbox-satellite-global` to prefer
  Mapbox Satellite global imagery when proxy/token access is configured.
- `NEXT_PUBLIC_SENTINEL_PREVIEW_TILE_URL`
- `NEXT_PUBLIC_SEN2SR_PMTILES_URL`
- `NEXT_PUBLIC_SEN2SR_XYZ_URL`
- `NEXT_PUBLIC_OFFLINE_RASTER_PMTILES_URL`
- `MAPBOX_TOKEN`
- `NEXT_PUBLIC_MAPBOX_PROXY_ENABLED`
- `NEXT_PUBLIC_MAPBOX_PROXY_URL`
- `NEXT_PUBLIC_MAPBOX_TOKEN`
- `VMESH_SENTINEL_SR_WORKER_TOKEN`
- `VMESH_SENTINEL_SR_ARTIFACT_HOST_ALLOWLIST`

Mapbox Satellite remains optional for both the base globe and the global
ortho-style imagery overlay. Use server-only `MAPBOX_TOKEN` plus
`NEXT_PUBLIC_MAPBOX_PROXY_ENABLED=true` or `NEXT_PUBLIC_MAPBOX_PROXY_URL` for
secret-class tokens; use `NEXT_PUBLIC_MAPBOX_TOKEN` only for restricted public
`pk.*` tokens. Treat Mapbox imagery as visual context unless reviewed terms
permit a stronger workflow. Do not commit generated imagery, downloaded scenes,
private AOIs, token-bearing tile URLs, or large tile archives.

## Agricultural Field Boundary Operations

Fields of The World-style agricultural field boundaries should enter vmesh through the source-broker/package path, not as ad hoc browser fetches.

Operational path:

1. Treat PMTiles as the browser visualization artifact.
2. Treat GeoParquet as the source-backed geometry input for DuckDB/PostGIS preprocessing.
3. Treat Zarr/COG feature and prediction products as model/raster context for offline analysis.
4. Generate H3 summaries for field counts, field-size distributions, field density, fragmentation, and joins to vegetation/climate/water context.
5. Store model version, year, source product, confidence/quality metadata where available, license, attribution, and limitations.

Rules:

- Do not treat predicted field polygons as legal parcels or ownership boundaries.
- Do not infer exact farm owner identity or private business operations from field geometry.
- Do not download or commit large FTW artifacts, PMTiles archives, GeoParquet shards, Zarr mosaics, or local AOI extracts.
- Keep generated field-boundary packages outside Git and publish only sanitized manifest fixtures.
- Add production ingestion only after license/terms, cost, cache, and attribution handling are reviewed.

## Annotation Workflow Operations

Human-reviewed annotation is required before model outputs become trusted training fixtures or validation examples. Labelme is a useful external tool for this workflow, especially for polygons, masks, rectangles, oriented rectangles, circles, lines, and point labels.

Operational rules:

- Use Labelme or equivalent tools outside the browser app for reviewed imagery/feature annotation.
- Keep label schemas small and documented before starting annotation.
- Store annotation provenance: source imagery, acquisition timestamp, annotator/reviewer, label schema version, tool/version, AI-assist status, confidence, and review state.
- Convert annotations into sanitized fixtures, masks, GeoJSON/GeoParquet, COCO/VOC, or H3 summaries through preprocessing scripts.
- Do not commit raw private imagery, EXIF-rich photos, exact private property screenshots, or sensitive infrastructure labels.
- Treat AI-assisted SAM labels as drafts until reviewed.
- Do not bundle GPL-licensed annotation-tool code into the MIT app without license review.

## Resilient Comms Operations

Reticulum is the main disaster-mode communications stack for vmesh. The web app should connect to a local bridge service rather than opening radio/network interfaces directly from the browser.

Planned local topology:

```text
vmesh browser
  -> localhost comms bridge
    -> Reticulum / RNS daemon or library instance
    -> LXMF router
    -> optional Meshtastic bridge
```

Operational defaults:

- Start with a mock comms provider in V1 UI work.
- Add a local Reticulum bridge before any live disaster-comms features.
- Keep Reticulum identity files, RNS config, private keys, and peer/contact books out of Git.
- Treat Meshtastic as a bridge into an existing LoRa mesh, not as the primary vmesh network.
- Keep all over-the-air payloads short, typed, rate-limited, and auditable.
- Never claim guaranteed delivery; expose queued, sent, delivered, acknowledged, expired, and failed states.
- Store incoming mesh reports with source, timestamp, confidence, and trust label.

Meshtastic bridge operations:

- A local Meshtastic node or gateway is required to reach the Meshtastic LoRa network.
- Public MQTT is acceptable for demos and connected scenarios, but it is not the disaster-primary path.
- Private MQTT or local gateway deployments must document channel, PSK, traffic filters, rate limits, and operator responsibility.
- Meshtastic location payloads must use explicit precision controls and avoid unnecessary exact-location broadcast.

Do not transmit real emergency, medical, location, identity, or contact information through a live mesh integration until privacy, consent, retention, rate limiting, and operator procedures are documented and reviewed.

## Local Hub Preview

The current UI exposes mock statuses for Reticulum, Meshtastic bridge, and local LLM gateway readiness. These statuses are local-first scaffolding only. A production hub should run vmesh on LAN/offline hardware and connect the browser app to a narrow localhost gateway service. The gateway, not the browser, owns Reticulum identity, LXMF queues, Meshtastic hardware access, and local model endpoint access.

The hub playbook stores local/mock checklist state in Zustand for the selected H3 cell. Export is currently a UI affordance for checklist readiness; persistent file export should be added only with explicit local privacy handling.

## Data Operations

The V1 app distinguishes:

- App-pulled prepopulated macro data.
- Fixture, cached, or live selected-cell macro package data.
- App-pulled prepopulated micro data.
- User-added local/mock records.
- Derived H3 summaries.
- Provider registry entries that are map-ready, future, license-gated, API-gated, or preprocessing-required.

Every future ingestion path must document source, license/terms, update cadence, failure behavior, cost profile, confidence model, and privacy risk.

## Macro Atlas Source Broker Operations

The Macro Atlas modal and source drawer now rely on a unified layer catalog plus source-broker report. The broker is not an ingestion job; it is a public-safe selection and disclosure contract.

Operational rules:

- Select map-ready providers for the browser first, then explain source-broker refs and optional future package sources separately.
- Keep rejected-source reasons visible for token-gated, license-gated, preprocessing-only, and unavailable providers.
- Treat STAC/source manifests as the default references to future `terrain.json`, `imagery.json`, `landcover.json`, `environment.json`, `contours.json`, `h3-summary.json`, and `provenance-manifest.json` payloads.
- Show whether macro data is fixture package, cached package, live selected-cell, mock fallback, or future-provider.
- Do not let visual basemaps, Sentinel/SEN2SR imagery, landcover, roads, buildings, or parcels upgrade terrain confidence.
- Keep heavy Sentinel, landcover, contour, climate-grid, Overture, and OSM extract processing in server/local-hub workers, not in the browser.

## Release Checklist

- Lint, tests, agent-ready, tickets, audit, and build pass.
- Macro fixture build/validate and automated visual regression pass.
- Browser verification passes on desktop and a narrower viewport.
- No console errors during initial load, tier changes, hover, click selection, and local record add flow.
- Docs are updated for changed product, architecture, privacy, operations, or analytics behavior.
- Environment variables are configured in Vercel.
- User-added data defaults and provenance labels are verified.

## Provider Outage Runbooks

- Basemap outage: show renderer error state and keep DOM panels usable.
- Terrain outage: degrade to globe/basemap without elevation and show provider status.
- Reticulum bridge outage: keep local app usable, queue outbound messages, and show bridge unavailable.
- Meshtastic bridge outage: keep Reticulum active where available and mark Meshtastic interoperability unavailable.
- Macro data outage: mark affected layers unavailable and preserve cached/mock fallback where allowed.
- Micro data outage: mark affected local asset layers unavailable and do not fabricate records.
- Analytics outage: queue or drop non-critical telemetry without blocking UI.

## Cost Spike Runbook

1. Disable non-essential provider calls.
2. Check tile, analytics, property, local-market, climate, and model-provider dashboards.
3. Confirm rate limits and caching behavior.
4. Open a ticket with findings and mitigation.

## Deployment Provider Setup

Assume Vercel plus GitHub:

- Import the GitHub repository into Vercel.
- Use `main` as production branch unless changed.
- Enable preview deployments for pull requests.
- Configure env vars for development, preview, and production.
- Build command: `npm run build`.
- Install command: `npm install`.
- Output directory: managed by Next.js.

Do not commit `.vercel/`.

## Rollback Rules

Prefer Vercel deployment rollback for production incidents. Do not force-push `main`. Document the incident and corrective ticket.

## Escalation Rules

Escalate immediately for secret exposure, paid-provider runaway spend, misleading real-world risk output, user-added data leakage, unlawful data-source use, or repeated WebGL crashes on supported devices.

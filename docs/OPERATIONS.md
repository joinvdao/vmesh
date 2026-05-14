# Operations

## Environment Contracts

Required local runtime:

- Node `24.11.1`
- npm `11.6.2`

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

V1 terrain selection is registry-driven:

1. Use `NEXT_PUBLIC_TERRAIN_TILEJSON_URL` when configured.
2. Use Mapterhorn PMTiles terrain from `NEXT_PUBLIC_MAPTERHORN_PMTILES_URL`, defaulting to `https://download.mapterhorn.com/planet.pmtiles`.
3. Fall back to Mapzen/Joerd Terrarium XYZ tiles from `NEXT_PUBLIC_MAPZEN_TERRARIUM_URL`, defaulting to `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`.
4. Fall back to the no-token MapLibre demo raster-dem provider.
5. Keep the globe shell nonblank and report provider status if terrain is unavailable.

`NEXT_PUBLIC_TERRAIN_PROVIDER` may prefer `mapterhorn-pmtiles`, `mapzen-joerd-terrarium`, or `maplibre-demo-dem`, but the env TileJSON provider still has highest priority. PMTiles terrain is loaded through the browser `pmtiles://` protocol and must remain token-free unless a future deployment explicitly adds cost and access controls.

The left rail Terrain panel is the runtime operator control for terrain. It can toggle the DEM overlay and switch between map-ready providers without restarting the app. The active provider feeds both MapLibre terrain and the hillshade overlay; if the selected provider fails, the renderer should fall back to the next map-ready candidate and update footer/status messaging.

Terrain remains available in close searched views. Users can search a coordinate or place, fly into the local source-backed map output, then switch the DEM overlay between Mapterhorn, Mapzen/Joerd, or configured terrain for that area without losing the selected marker, macro overlays, or H3 interaction state.

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

Operational rule: do not scrape public map tiles as data. For source-backed features, preprocess into PostGIS, PMTiles, COG/PMTiles rasters, or H3 summaries with attribution, license, version, and confidence.

PostgreSQL/PostGIS is the preferred production spatial backend once vmesh moves beyond committed fixtures and local Zustand state. It should store original source geometries, H3 indexes, provenance, package manifests, user records, and future relationship edges. GraphQL may be added later for rich benchmark or cross-layer queries, but it is not an operational prerequisite for the current app.

## Macro Provider Operations

The first live-capable macro provider is Open-Meteo. It is called only for the selected H3 centroid or a future capped local ring. Requests must use timeout, abort, in-memory cache, visible status, and deterministic mock fallback.

Provider boundaries:

- Open-Meteo: no-key selected-cell weather prototype.
- NASA POWER: future solar/meteo provider boundary.
- ERA5/CDS: server/offline preprocessing only; no browser fetch and no credentials in Git.
- NASA FIRMS: future active-fire input; not called in V1.
- Terrain-derived flood: derived/HAND-ready scaffold; not authoritative flood mapping.

Live macro calls can expose selected coordinates to the provider. For privacy-sensitive deployments, route through a local hub cache/gateway or rely on offline/precomputed H3 summaries.

`lib/climateDataSources.ts` extends macro optionality with a provider funnel:

- Open-Meteo: selected H3 centroid live prototype.
- NASA POWER: future solar/meteo cache path.
- NOAA GFS open forecast grids: future offline H3 forecast preprocessing.
- ERA5/CDS: future historical climate normals and anomalies; credentials stay out of browser/Git.
- NASA FIRMS: future active-fire observations after access and emergency-use review.
- Terrain-derived flood: derived/HAND-ready decision-support scaffold.
- H3 weather graph model: future research path for encoding forecast/reanalysis fields onto the H3 graph.

Do not send broad map viewport queries to climate providers from the browser. Use selected-cell queries, capped rings, or local/server H3 bundles.

## Macro Package Operations

The committed macro package is a deterministic fixture. Rebuild and validate it with:

```bash
npm run macro:build -- --fixture
npm run macro:validate -- --fixture
npm run macro:ready
```

The builder writes `fixtures/macro-packages/western-europe-demo.manifest.json` and `fixtures/macro-packages/western-europe-demo.h3-summary.json`. The manifest must keep `liveNetworkUsed: false`, `noBrowserGridFetches: true`, `noPaidProviderCalls: true`, `containsUserRecords: false`, and `containsExactPrivateAddresses: false` for committed fixtures.

`npm run macro:ready` is the promotion gate. In the default fixture profile it proves the committed package is deterministic, bounded, privacy-safe, provenance-complete, and clearly blocked from production promotion. It is expected to warn that provider terms are not marked reviewed and that the fixture does not cover the full terrain/vegetation/imagery atlas.

Production macro packages must pass an explicit profile before they can be treated as production data:

```bash
npm run macro:ready -- --profile production-core --dir <package-dir> --manifest <manifest.json> --summary <h3-summary.json>
npm run macro:ready -- --profile production-full-atlas --dir <package-dir> --manifest <manifest.json> --summary <h3-summary.json>
```

`production-core` requires reviewed, non-fixture Weather, Rainfall, Climate Trend, Flood/Lowland, Fire Weather, and Solar Potential summaries. `production-full-atlas` additionally requires Terrain and derived topography, Vegetation/Landcover, and Satellite Imagery products. Production profiles reject fixture/mock/future-provider source types, fixture cadence, unreviewed provider terms, browser grid-fetch modes, paid-provider calls in default packages, exact private addresses, missing provenance, missing confidence, missing validity windows, and authoritative hazard/survey claims.

Production macro packages should be generated outside the browser by a local hub or server worker. The expected path is:

1. Select a bounded AOI and H3 tier.
2. Fetch or read reviewed provider inputs under their license and rate limits.
3. Transform gridded or point inputs into H3 summaries with source variables, validity windows, model run time, uncertainty, confidence, and limitations.
4. Write a manifest plus H3 summary artifact and optional PMTiles/COG/vector artifacts.
5. Validate the package before exposing it to the UI or source drawer.

Do not commit real package payloads, private AOIs, downloaded climate grids, provider caches, or local hub output unless they are sanitized fixtures.

## Geospatial Package Service Operations

The generic package service exposes source-honest planning for downstream apps:

- `GET /api/geospatial-package/sources` lists candidate providers, access class, status, artifact kinds, license, attribution, and limitations.
- `GET /api/geospatial-package/sources?layer=terrain` filters the registry by layer.
- `GET /api/geospatial-package/plan` returns a deterministic Lisbon sample plan for smoke tests.
- `POST /api/geospatial-package/plan` accepts an AOI plus requested layers and returns a `GeospatialPackagePlan`.

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

The planner does not download data, call paid providers, or generate PMTiles inside the browser. It selects open/cacheable/package-ready sources where possible and reports preprocessing, token, license, paid, blocked, or missing states honestly. A future local/server package worker should consume the plan and write PMTiles, vector tiles, raster tiles, COGs, GeoParquet extracts, H3 summaries, and manifests outside Git.

Production package serving should be asynchronous. The API should accept a bounded AOI/H3 request, return a source plan plus package/job identifiers, and let workers build or refresh artifacts in storage. Consumers should be able to poll or fetch a manifest without learning provider-specific logic. Cache hits can return immediately; cache misses should queue work while the consumer app continues with its own fallback UI. Public vmesh operations docs should describe this generic consumer contract and must not include private downstream repo names, local paths, exact private AOIs, provider credentials, or unpublished commercial details.

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
4. Validate AOI cloud-free ratio with SCL classes, default `>= 0.95`.
5. Run SEN2SRLite on RGB+NIR bands where local/server hardware supports it.
6. Write source COG, cloud mask COG, SEN2SR COG, preview PNG, manifest JSON, and optional PMTiles/XYZ tiles.
7. Serve only the manifest and tile URL to the Next.js UI.

The default upscaler path is ESAOpenSR/SEN2SRLite RGBN `x4`: source Sentinel-2 L2A `10 m`, target display output `2.5 m`, model id `SEN2SRLite/NonReference_RGBN_x4`, and `truthStatus: imagery-inferred-context`.

Optional imagery env vars:

- `NEXT_PUBLIC_IMAGERY_PROVIDER`
- `NEXT_PUBLIC_SENTINEL_PREVIEW_TILE_URL`
- `NEXT_PUBLIC_SEN2SR_PMTILES_URL`
- `NEXT_PUBLIC_SEN2SR_XYZ_URL`
- `NEXT_PUBLIC_OFFLINE_RASTER_PMTILES_URL`
- `MAPBOX_TOKEN`
- `NEXT_PUBLIC_MAPBOX_PROXY_ENABLED`
- `NEXT_PUBLIC_MAPBOX_PROXY_URL`
- `NEXT_PUBLIC_MAPBOX_TOKEN`

Mapbox satellite remains optional for both the base globe and comparison imagery. Use server-only `MAPBOX_TOKEN` plus the public proxy flag/url for secret-class tokens; use `NEXT_PUBLIC_MAPBOX_TOKEN` only for restricted public `pk.*` tokens. Do not commit generated imagery, downloaded scenes, private AOIs, token-bearing tile URLs, or large tile archives.

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

- Select map-ready providers for the browser first, then explain future package sources separately.
- Keep rejected-source reasons visible for token-gated, license-gated, preprocessing-only, and unavailable providers.
- Treat package manifests as references to future `terrain.json`, `imagery.json`, `landcover.json`, `environment.json`, `contours.json`, `h3-summary.json`, and `provenance-manifest.json` payloads.
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

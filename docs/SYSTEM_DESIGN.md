# System Design

## Snapshot

Date: 2026-04-30

V1 implements the screenshot-directed vmesh dashboard with a fixed Next.js app shell, MapLibre globe surface, deck.gl H3 mesh overlay, Zustand state, typed mock data, a fixture-backed macro package, local/private user records, Recharts analytics, and provider-agnostic open terrain source foundations.

The H3 mesh is treated as an indexing and retrieval layer first. The visible grid is optional analytical UI, not the default visual product.

## Architecture

```text
Next.js App Router
  app/layout.tsx
  app/page.tsx

React UI
  fixed app shell
  selected hex card
  bottom analytics dashboard
  source/provenance drawer
  map controls and mesh legend
  macro-to-micro scale control
  local user data panel

State
  Zustand vmesh store
  globe visual theme
  selected/hovered hex state
  camera/view state
  active layer filters
  U3/U5/U8 mesh tier state
  map and terrain provider status
  macro package manifest and summaries
  draft user-added records

Geospatial renderer
  MapLibre operational basemap
  raster-dem terrain source normalization
  deck.gl MapboxOverlay
  H3HexagonLayer

Data model
  macro pillars
  micro summaries
  user-added records
  H3 spatial index
  graph-ready entities, observations, sources, and relationships
  macro layer catalog
  macro package manifests and H3 summaries
  source broker reports
  site-package-style manifests
  provenance and confidence
  derived antifragility scores

Analytics
  Recharts panels
  derived mesh metrics

Resilient comms
  local bridge service
  Reticulum/RNS primary stack
  LXMF message router
  Meshtastic bridge provider
  offline outbox and delivery state
```

## Data Flow

MapLibre owns the basemap, terrain, and camera. deck.gl attaches through `MapboxOverlay` so H3 layer rendering follows the map camera. The renderer uses a two-mode visual wrapper: distant camera states present an `Orbit Globe` object, while close search/zoom states switch to `OSS Map Output` so the open MapLibre basemap becomes legible for local work. Zustand holds the selected H3 cell, hover metadata, mesh tier, active layers, map status, terrain status, the macro package manifest, package-backed H3 summaries, prepopulated hex summaries, and local draft records. React panels subscribe to Zustand slices rather than reading directly from map instances.

App-pulled datasets should enter through typed provider adapters. User-added data enters through explicit local state actions with provenance, confidence, timestamp, and private-local visibility.

For backend evolution, H3 should not be the knowledge graph itself. It should be the spatial index that anchors graph records. The graph should model entities, observations, sources, and relationships, then attach those records to one or more H3 cells for aggregation, filtering, permissions, offline bundles, and local retrieval.

Resilient communications should enter through a local bridge, not directly through browser-only code. The browser app sends small structured disaster messages to the local bridge over a localhost HTTP/WebSocket API. The bridge owns Reticulum identity, RNS daemon/process configuration, LXMF routing, peer discovery, delivery receipts, and optional Meshtastic bridge access. Received mesh reports are normalized into typed vmesh records with source, timestamp, confidence, and delivery metadata before they touch the UI.

## Public Contracts

- `MeshTier`: `U3`, `U5`, and `U8`, mapped to H3 resolutions 3, 5, and 8.
- `GlobeTheme`: `dark` or `light`, stored in Zustand as a visual mode for the atlas globe. It changes stage, ocean/land treatment, map opacity, and rim lighting without changing provider IDs, data provenance, or mesh state.
- `MacroLayerDefinition`: category, providers, readiness, status, source type, visualization type, opacity, attribution, license, freshness, confidence, limitations, map readiness, preprocessing requirement, and public-demo safety for every macro atlas layer.
- `SourceBrokerReport`: open-data-first source selection report for selected basemap, terrain, climate, imagery, candidate counts, rejected-source reasons, layer catalog summary, open-map summary, and package manifest.
- `DataPackageManifest`: site-package-style contract for terrain, imagery, landcover, environment, contours, H3 summaries, provenance, selected sources, and rejected sources.
- `GeospatialPackagePlan`: downstream-app package plan with normalized AOI, requested layers, source probes, selected providers, planned artifacts, rejected sources, warnings, next actions, and API/MCP surface references.
- `GeospatialSourceCandidate`: source registry entry for terrain, imagery, roads, buildings, water, vegetation, parcels, climate, hydrology, contours, landcover, and field boundaries.
- `PackagePlanArtifact`: app-ready artifact contract for PMTiles, vector tiles, raster tiles, COG, Zarr, GeoParquet, H3 summaries, manifests, or bounded APIs.
- `SourceProvenance`: provider/source id, source type, source URL, ground model role, acquisition/processing/vintage metadata, license, attribution, confidence, and limitations.
- `GroundModelRole`: `bare-earth-dtm`, `generic-dem`, `surface-dsm`, `topobathy`, `imagery-inferred-context`, `visual-context`, or `not-authoritative`.
- `BasemapProviderConfig`: provider metadata for Protomaps PMTiles, OpenFreeMap, MapLibre/OSM raster fallback, custom style JSON, and offline shell.
- `OpenMapSourceConfig`: provider metadata for OSM, OpenFreeMap, Protomaps, Overture Maps, OSM PBF extracts, Natural Earth, OpenAddresses, and future LiDAR/EPT sidecar paths.
- `TerrainProviderConfig`: provider metadata and source configuration for XYZ raster-dem, TileJSON raster-dem, PMTiles terrain, API DEM, dataset DEM, and STAC catalog sources.
- `TerrainProviderStatus`: `idle`, `loading`, `active`, `fallback`, `unavailable`, or `error`.
- `MacroProviderConfig`: provider metadata for Open-Meteo, NASA POWER, ERA5/CDS, NASA FIRMS, and terrain-derived flood scaffolds.
- `MacroPackageManifest`: offline/server package contract for H3 macro summaries, AOI, providers, source variables, artifacts, quality gates, privacy gates, limitations, and confidence statistics.
- `MacroPackageH3SummaryArtifact`: package-backed per-cell macro summaries keyed by H3 with source type, validity window, model run metadata, license, and limitations.
- `MacroProductionReadinessReport`: promotion-gate report for fixture-safe, production-core, and production-full-atlas macro packages. It blocks fixture/mock/future-provider packages, unreviewed terms, missing layer groups, incomplete provenance, browser grid fetches, exact private addresses, and authoritative hazard/survey claims before data can be called production-ready.
- `ClimateDataSourceConfig`: provider metadata for live point forecasts, solar/meteo APIs, open forecast grids, reanalysis preprocessing, active-fire observations, terrain-derived hazards, and future model preprocessing.
- `MacroCellSummary`: H3 ID, centroid, weather, 72h forecast, climate trend, flood, fire, solar, provenance, confidence, and limitations.
- `SolarAccessSummary`: selected H3/AOI solar path, slope/aspect, terrain horizon, direct-sun-hour proxy, cloud/irradiance context, shading sources, confidence, and limitations.
- `WindRoseSummary`: directional wind frequency bins by speed class, calm frequency, gust context, observation/model period, height above ground, provider, confidence, and limitations.
- `ClimateSectorMap`: permaculture-style directional sector model for sun, wind, cold/frost, water flow, fire, flood, access/noise/pollution, wildlife, and user-observed forces.
- `ImageryProviderConfig`: provider metadata for Sentinel-2 preview, SEN2SR PMTiles/XYZ, optional Mapbox satellite, and offline raster PMTiles.
- `ImageryTileManifest`: source scene, acquisition/processing timestamps, bands, SEN2SR model, cloud gates, bounds, H3 coverage, derived index proxies, tile URL, and provenance.
- `VmeshHexRecord`: H3 ID, tier, resolution, place, antifragility score, macro pillars, micro summary, user summary, provenance, confidence, and trend series.
- `UserRecord`: category, title, attached H3 ID, private-local visibility, provenance, confidence, and timestamps.
- `ResilientCommsProvider`: transport abstraction for Reticulum, Meshtastic bridge, and mock disaster-comms providers.
- `VmeshDisasterMessage`: compact typed payload for check-ins, H3 cell status, hazards, needs/offers, resource reports, relay notes, and position beacons.
- `DeliveryState`: `draft`, `queued`, `sent-to-bridge`, `sent-to-network`, `delivered`, `acknowledged`, `expired`, or `failed`.

## Mesh Tiers

| Tier | H3 resolution | Meaning                           | Render rule                                          |
| ---- | ------------: | --------------------------------- | ---------------------------------------------------- |
| `U3` |             3 | Global and continental macro mesh | Safe for broad global/regional context.              |
| `U5` |             5 | Regional operating mesh           | Default V1 dashboard tier.                           |
| `U8` |             8 | Local/detail mesh                 | Generated only inside the selected U5 parent bounds. |

`U8` must never render globally. It is capped and scoped to selected local context for micro and user-added workflows.

By default, no broad hex grid is rendered. Visible H3 cells are enabled only through explicit analytical overlays, selected-cell affordances, focused local detail, or debugging/provider inspection.

## Knowledge Graph Direction

The recommended backend shape is a typed property graph over a spatial index:

- `SpatialCell`: H3 IDs at U3/U5/U8 with parent/child relationships and coverage metadata.
- `Entity`: farms, markets, properties, parcels, wells, shelters, batteries, roads, organizations, hazards, and hub assets.
- `Observation`: timestamped claims, measurements, user notes, provider facts, field reports, or model outputs.
- `Source`: dataset, user, document, provider, model, radio report, or local import with license/provenance.
- `Relationship`: `LOCATED_IN`, `SERVES`, `SUPPLIES`, `DEPENDS_ON`, `OBSERVED_AT`, `PART_OF`, `NEAR`, `HAS_RISK`, and `VALIDATED_BY`.

Postgres with PostGIS plus explicit edge tables is the conservative open-source V1 backend path. It preserves geometry, H3 indexes, ordinary SQL operations, and future graph traversal without forcing an early Neo4j/RDF dependency. If relationship traversal becomes the dominant workload, vmesh can add Apache AGE, Neo4j, or an RDF/JSON-LD export layer later.

## Downstream App Contract Direction

vmesh should share contracts before it shares code. Each downstream app may have a different runtime and product surface, so reusable knowledge should start as public-safe schemas, provider notes, fixtures, manifests, and decision records.

Recommended ownership:

| Contract area                                          | Owning layer | Consumers       |
| ------------------------------------------------------ | ------------ | --------------- |
| H3 macro/micro summaries                               | vmesh        | Downstream apps |
| Basemap, terrain, imagery, and macro provider metadata | vmesh        | Downstream apps |
| Geospatial package/source manifests                    | vmesh        | Downstream apps |
| Property intelligence and parcel confidence patterns   | vmesh        | Downstream apps |
| Hub playbook cards and local readiness checklists      | vmesh        | Downstream apps |
| Permaculture/local land interaction ontology           | vmesh        | Downstream apps |

The near-term sharing mechanism is Markdown plus fixtures. A shared package should wait until duplication is painful and the contract has stabilized. If that happens, the first candidate should be a narrow package such as `@vdao/geo-contracts` that contains TypeScript types, JSON Schemas, and validators only. It should not include provider calls, tokens, private data, or app-specific rendering code.

Cross-app operating rules are documented in `docs/CROSS_REPO_INSIGHTS.md`.

## Production Open Map Stack

The preferred production stack is MapLibre-first with static geospatial packages wherever possible:

```text
Next.js / React UI
  -> MapLibre GL JS renderer
  -> deck.gl analytical overlays
  -> PMTiles protocol for vector/raster packages
  -> CDN/R2/static hosting for tile archives
  -> typed vmesh API
    -> PostgreSQL/PostGIS
    -> H3 indexes
    -> provenance and package manifests
```

PMTiles is the preferred delivery primitive for public/open layers because it can bundle vector basemaps, contour vectors, raster imagery, landcover rasters, and H3 summary tiles into static archives that work well over HTTP range requests and CDN caches. Cloudflare R2 or equivalent object storage is a strong hosting target for public demos and local hub mirrors because it avoids always-on tile-server operations.

PostgreSQL/PostGIS remains the conservative source-of-truth backend for source geometries, H3 cell relationships, provenance, user records, and future graph edges. Apollo GraphQL can be considered later for rich cross-layer queries and benchmark visualizations, but the current architecture should not add GraphQL until typed REST/RPC routes become awkward.

Some reference products combine Vue/Nuxt shells with React modules. vmesh should not adopt that framework mix. The useful lesson is modularity: renderer, layer catalogs, source transparency, benchmark charts, and authenticated workspace surfaces should be independently replaceable without coupling data contracts to UI framework boundaries.

## Terrain Provider Foundation

`lib/terrainSources.ts` is the terrain registry and normalization layer. Provider switching is configuration/state-driven: the renderer asks for a selected provider and receives a normalized MapLibre source when the provider is map-ready.

V1 provider kinds:

| Kind                  | V1 behavior                                                        |
| --------------------- | ------------------------------------------------------------------ |
| `raster-dem-tilejson` | Map-ready; supports env-configured TileJSON and demo fallback.     |
| `raster-dem-xyz`      | Map-ready when selected; supports Terrarium-style XYZ tiles.       |
| `pmtiles-raster-dem`  | Map-ready Mapterhorn/PMTiles terrain through the PMTiles protocol. |
| `api-dem`             | Future OpenTopography-style clipped DEM API path.                  |
| `dataset-dem`         | Future CUDEM/FABDEM preprocessing path.                            |
| `stac-catalog`        | Future terrain catalog discovery path.                             |

Default provider order:

1. `NEXT_PUBLIC_TERRAIN_TILEJSON_URL` env provider when configured.
2. Mapterhorn PMTiles terrain at `https://download.mapterhorn.com/planet.pmtiles`.
3. Mapzen/Joerd Terrarium XYZ terrain at `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`.
4. MapLibre demo terrain as a final browser-verification fallback.
5. Nonblank globe surface and footer/provider status if terrain is unavailable or fails.

The renderer registers `pmtiles://` with MapLibre once, normalizes provider configs into `raster-dem` sources, and attempts map-ready terrain providers in order. A tile/setup failure degrades to the next candidate without blocking the basemap, H3 mesh, or DOM panels. The runtime keeps terrain mutable after initialization so the UI can reapply a selected provider without rebuilding the map.

The terrain overlay panel is the user-facing control surface for this stack. It lists map-ready providers first, defaults to Mapterhorn PMTiles, keeps Mapzen/Joerd as the first no-token backup, and shows future CUDEM/FABDEM/OpenTopography/STAC paths as preprocessing or licensing candidates. Toggling the overlay hides or reapplies MapLibre terrain and the derived hillshade layer; it does not disable the globe camera, selected marker, macro layers, imagery, or H3 knowledge graph interactions.

Terrain trust is role-capped. A generic DEM can drive the globe surface but cannot claim high-trust bare-earth DTM status. DSM, imagery, super-resolution imagery, vectors, and visual basemaps cannot raise terrain confidence. CUDEM-style topobathy is useful for coastal context but should not become generic inland terrain.

## Macro Layer Catalog And Source Broker

`lib/layerCatalog.ts` is the user-facing macro atlas catalog. It defines Terrain, Climate, Hazard, Solar, Vegetation, and Imagery layers with readiness, status, source type, visualization type, opacity, license, confidence, limitations, map readiness, and preprocessing flags. This catalog controls what the Macro Atlas modal can show without implying that every layer is live.

`lib/sourceBroker.ts`, `lib/sourcePackages.ts`, and `lib/sourceProvenance.ts` adapt the source-package discipline to vmesh. The broker selects open-data-first defaults, records rejected or skipped sources, builds a manifest-shaped package contract, and keeps the renderer away from raw source decision-making. MapLibre consumes map-ready sources; H3 consumes summaries and provenance; heavy Sentinel, landcover, contour, climate, and open-vector preprocessing stays outside the browser.

`lib/geospatialPackage/` is the first generic package-service surface for downstream apps. It adds:

- a source registry across terrain, imagery, roads, buildings, water, vegetation, parcels, climate, hydrology, contours, landcover, and field boundaries;
- source probes that disclose open, paid, cached, blocked, missing, token-gated, license-gated, and preprocessing-required states;
- a planner that ranks open/cacheable/package-ready sources without selecting paid, token-gated, license-gated, or API-key-required providers by default, even when a downstream request prefers one;
- artifact contracts for PMTiles, vector tiles, raster tiles, COG, Zarr, GeoParquet, H3 summaries, manifests, and bounded APIs;
- API routes at `/api/geospatial-package/sources` and `/api/geospatial-package/plan`;
- a future MCP-style tool namespace, `vmesh.geospatial_package`, for source listing, package planning, and manifest retrieval.

The package service is not a data worker yet. It returns source-honest plans and clean manifests; local/server workers are responsible for downloading, clipping, tiling, caching, and validating heavy artifacts.

Production hardening for the first package-service API includes request size caps, JSON-only POST handling, strict AOI/H3 validation, source preference sanitization, label sanitization, credential/secret-bearing URL redaction, no-store responses, and explicit coordinate-disclosure metadata. Coordinate disclosure records the user-requested precision (`h3-cell`, `bounds`, `exact-centroid`, or `fallback-sample`) separately from the normalized centroid used for H3 math. These protect the planner surface while preserving the larger rule that artifact generation belongs in authenticated local/server workers.

`lib/macro-packages/macroPackages.ts`, `lib/macro-packages/macroPackageValidation.ts`, `lib/macro-packages/macroProductionReadiness.ts`, and `lib/macro-packages/macroPackageImport.ts` are the concrete macro package boundary. The committed Western Europe fixture package proves the path for H3 summary JSON, provider run metadata, source variables, confidence statistics, privacy gates, and UI disclosure. Production packages should be generated by local-hub or server workers, then imported as manifests plus artifacts; they should not trigger broad viewport climate queries from the browser.

Macro production readiness has two explicit scopes. `production-core` covers reviewed Weather, Rainfall, Climate Trend, Flood/Lowland, Fire Weather, and Solar Potential summaries. `production-full-atlas` extends that to Terrain and derived topography, Vegetation/Landcover, and Satellite Imagery. The readiness gate treats fixture data as useful but non-promotable, so a mock UI path cannot silently become a production claim.

## Licensing Gates

- FABDEM is marked `requires-license` because its public release is non-commercial unless separately licensed.
- CUDEM is marked `preprocessing-required` and should become map-ready only after tiling/COG/PMTiles processing.
- OpenTopography is marked `requires-api-key` and is not called in V1.
- Mapterhorn is the primary V1 open terrain provider; attribution and upstream dataset notices must remain visible in release notes and production docs.
- No paid APIs, secret tokens, or real ingestion jobs run in V1.

## Fallback Behavior

- If terrain tiles fail, the globe shell, basemap, H3 overlay, and DOM panels remain usable.
- If the user flies into a coordinate or autocomplete place result, the viewer can transition from the cinematic globe wrapper into a rectangular open-source map output while preserving the same MapLibre/deck.gl camera state.
- Close source-backed map output keeps the terrain runtime available, so users can switch the searched area between flat basemap context and Mapterhorn/Mapzen terrain relief without rebuilding the map.
- If the primary terrain provider fails during setup or tile loading, the renderer attempts the next map-ready candidate and updates Zustand/footer status.
- If the terrain provider is not map-ready, the footer reports `unavailable` with the provider message.
- If the map reports renderer errors, Zustand stores a visible status message.
- If user-added data cannot be persisted, it remains local/mock by design.

## Contour Foundation

Contours are modeled as a typed provider layer separate from terrain source truth. The browser renderer consumes MapLibre `raster-dem` for terrain and elevation behavior; it does not perform reliable live contour extraction from DEM tiles. Production contours should be generated by preprocessing DEM sources into vector contour tiles or contour PMTiles, then registered through the contour provider contract.

The V1 UI exposes a visible contour placeholder/status so users can see that the terrain mesh has contour plumbing, while docs and tests prevent misrepresenting it as live extraction.

## Basemap Provider Foundation

`lib/basemapSources.ts` separates basemap choice from terrain. This matters because terrain, imagery, and operational vector/raster map styles have different licenses, status, fallback behavior, and token requirements.

V1 basemap kinds:

| Kind                 | V1 behavior                                                                |
| -------------------- | -------------------------------------------------------------------------- |
| `custom-style-json`  | Highest-priority environment configured MapLibre style URL.                |
| `protomaps-pmtiles`  | Offline-friendly future vector basemap, enabled when a PMTiles URL is set. |
| `openfreemap-vector` | No-token vector style candidate for richer open geography.                 |
| `maplibre-demo`      | Default token-free OSM raster fallback that keeps the globe nonblank.      |
| `offline-shell`      | Last-resort nonblank local globe surface when no basemap can be fetched.   |

Basemap status is stored in Zustand and shown in footer telemetry. Mapbox is not a default basemap provider.

For production, open basemaps should prefer self-hosted or CDN-hosted PMTiles generated from OSM/Overture/Natural Earth/Nextzen-style open sources where licensing permits. Public OSM raster tiles are fallback visual context, not a scalable production dependency.

## Open Map Data Funnel

`lib/openMapSources.ts` is the open map data funnel. It answers "what open source map data could vmesh use for this layer?" without forcing the renderer to know whether a source is a public raster tile, a PMTiles archive, a GeoParquet catalog, a PBF extract, an address corpus, a low-zoom context layer, or a point-cloud sidecar.

V1 source classes:

| Source class               | vmesh role                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| OpenStreetMap raster tiles | Token-free visual fallback, not a data-ingestion source.                                                            |
| OpenFreeMap vector style   | Token-free MapLibre vector style candidate for richer open geography.                                               |
| Protomaps PMTiles          | Preferred offline/public-demo basemap archive path when configured.                                                 |
| Overture Maps GeoParquet   | Server-side source for buildings, transportation, places, divisions, addresses, land/water, and source attribution. |
| OSM PBF extracts           | Canonical self-hosted OSM ingestion path for regional PostGIS, PMTiles, and H3 summaries.                           |
| Natural Earth              | Small global low-zoom land/water/admin fallback for offline globe shells.                                           |
| OpenAddresses              | Optional geocoding/address enrichment with per-source license and privacy review.                                   |
| LiDAR/EPT sidecar          | Future point-cloud inspection path; vmesh consumes derived DEM, contours, footprints, or H3 summaries.              |

The renderer should consume map-ready styles or raster/vector tiles. The product data model should consume preprocessed, source-backed objects and H3 summaries. Public tile services must not be scraped as data.

## Climate Data Funnel

`lib/climateDataSources.ts` separates climate optionality from the first live weather adapter. Open-Meteo is the current no-secret selected-centroid weather path. NASA POWER, NOAA GFS open forecast grids, ERA5/CDS, NASA FIRMS, terrain-derived flood/HAND, and H3 weather graph models are modeled as future server/local-hub preprocessing sources.

The rule is simple: browser calls may sample selected H3 centroids only when a provider is no-secret and rate-limited. Gridded forecast files, reanalysis archives, active-fire products, and model pipelines should be transformed into H3 summaries outside the browser, with source variables, model run time, forecast horizon, uncertainty, license, and limitations attached to every record.

## Solar, Wind, And Climate Sector Models

Solar potential belongs at the intersection of climate and topography. The browser can calculate lightweight sun-path context for the selected cell, but trusted solar access and shading should be package-backed:

```text
selected H3 / AOI
  -> sun position and seasonal path
  -> terrain slope/aspect
  -> DEM/DTM horizon profile
  -> optional DSM/canopy/building obstruction model
  -> irradiance/cloud context
  -> SolarAccessSummary + H3 summary + visual sector overlay
```

Recommended tool roles:

- SunCalc or equivalent JavaScript library: interactive browser sun-path, seasonal azimuth/altitude, quick daylight context.
- pvlib/NREL SPA-style calculations: server/local-hub preprocessing for robust solar position, irradiance, transposition, and horizon-shading workflows.
- NASA POWER and Open-Meteo: no-secret solar/meteo context such as shortwave radiation, cloud cover, temperature, and wind where appropriate.
- NREL PVWatts: optional future token/API-gated PV production estimate for deployments that accept its terms; not a public default.
- Ladybug Tools: research/reference path for sun-path, sky-mask, direct-sun-hours, and shading-analysis concepts.

Shading confidence is source-dependent:

| Shading input               | Allowed claim                                                                           |
| --------------------------- | --------------------------------------------------------------------------------------- |
| DEM/DTM terrain horizon     | Terrain-horizon shading and aspect context.                                             |
| DSM/canopy/building surface | Local obstruction context if source-backed and current enough.                          |
| OSM/Overture buildings      | Approximate urban obstruction candidate; height/completeness may be poor.               |
| Sentinel/SEN2SR imagery     | Visual context only; cannot prove current shading geometry or PV suitability.           |
| User observation            | Local note with visibility/provenance; not authoritative unless reviewed and validated. |

Wind roses should summarize directional wind exposure for each selected cell or package AOI. Forecast wind roses can use capped selected-cell Open-Meteo data; climate-normal wind roses should come from ERA5/GFS/meteorological station preprocessing. The UI can render wind roses with existing React charting or custom SVG/polar bars; adding a heavy chart dependency is not required unless the current chart stack becomes limiting.

Climate sector maps translate macro climate/topography into a permaculture-style directional compass. Each sector is a directional influence with angle range, intensity, seasonality, source, confidence, and user-editable notes. Initial sector families should include summer/winter sun, prevailing wind, cold wind/frost, storm/rain flow, flood/drainage, fire approach, access/noise/pollution, and wildlife/corridor observations. These sectors are design intelligence, not automated recommendations.

## Source Transparency Drawer

The UI now includes a rail-opened source/provenance drawer. It summarizes the active basemap, terrain, macro, imagery, selected H3 provenance, micro mock records, provider registry statuses, licenses, confidence, and limitations without keeping permanent panels on the globe.

The drawer is intentionally read-only in V1. Provider switching still happens through the dedicated layer panels or environment configuration, while the source drawer answers whether a user is seeing live, cached, mock, fallback, token-gated, license-gated, or preprocessing-only data.

## Macro And Micro Provider Boundaries

Macro summaries now have typed climate, hazard, solar, wind, and sector-map contracts with provenance, confidence, and mock/provider-boundary status. Weather, flood, fire, solar, wind, and sector helpers operate on typed summaries and make no paid API calls.

Future weather and climate adapters may accept gridded fields, forecast fields, or graph-model outputs. Keisler-style H3 weather graph models are a useful research pattern: upstream atmospheric fields can be encoded to H3, processed as a graph, and decoded or summarized back into per-cell climate and hazard attributes. In vmesh this should run as a server-side or offline preprocessing provider, not as a V1 browser obligation, and every derived field must keep model version, initialization time, forecast horizon, uncertainty, source dataset, and confidence metadata.

The first live-capable macro adapter is Open-Meteo. It samples only the selected H3 centroid, uses no API key, applies timeout/cache/fallback behavior, and writes a `MacroCellSummary` with source type `live`, `cached`, or `mock`. If the request fails, the selected cell keeps deterministic mock data and the footer/panel report fallback.

NASA POWER is modeled as a future solar/meteo provider. ERA5/CDS is modeled as an offline/server preprocessing provider, not a browser fetch. NASA FIRMS is modeled as a future fire input provider and is not called in V1. Terrain-derived flood is a scaffold for DEM/HAND-style analysis and must not be represented as an authoritative flood map. Terrain-derived solar shading is likewise a planning scaffold unless backed by reviewed DTM/DSM, cloud/irradiance, and obstruction provenance.

Micro summaries now include local food network assets and property signals. Food records cover farms, growers, farmers markets, food hubs, community gardens, storage, and distribution points. Property signals are mock-only in V1 and use H3/approximate area fields, price bands, acreage bands, notes, provenance, and timestamps rather than exact private addresses.

## Imagery Provider And SEN2SR Pipeline Foundation

`lib/imagerySources.ts` models Sentinel-2/SEN2SR imagery as optional raster layers with manifest-backed provenance. Imagery is not the operational basemap and is off by default.

V1 imagery kinds:

| Kind                        | V1 behavior                                                              |
| --------------------------- | ------------------------------------------------------------------------ |
| `sentinel2-cog-preview`     | No-token preview raster for UI verification and manifest-backed display. |
| `sentinel2-sen2sr-pmtiles`  | Future offline/server generated SEN2SR raster PMTiles.                   |
| `sentinel2-sen2sr-xyz`      | Future offline/server generated XYZ tiles.                               |
| `mapbox-satellite-optional` | Token-gated optional comparison layer; disabled without env token.       |
| `offline-raster-pmtiles`    | Future local hub/offline imagery bundle.                                 |

The browser displays tiles and summaries only. Sentinel-2 STAC search, SCL cloud-mask validation, SEN2SRLite inference, COG writing, and tile generation belong in `pipelines/sentinel_sr/` as server/local-hub processing. H3 stores derived summaries such as NDVI, NDWI, NBR, vegetation cover proxy, bare soil proxy, water presence proxy, and cloud-free confidence.

The Sentinel/SEN2SR plan follows the same sidecar package discipline: source Sentinel-2 L2A RGBN is `10 m`, SEN2SRLite RGBN `x4` targets `2.5 m`, output is `imagery-inferred-context`, and cache keys include cell, scene/acquisition window, cloud thresholds, model id, and target resolution. This can improve imagery display and advisory material/vegetation context, but it must not improve terrain confidence, legal boundaries, roads, buildings, parcels, or emergency authority.

## Persistence Model

V1 uses committed mock/prepopulated data and local/mock user-added records only. Real persistence is out of scope until account identity, ownership, moderation, retention, deletion, export, and sharing rules are defined.

## Resilient Communications Architecture

Reticulum is the primary communications stack for vmesh disaster mode. vmesh should run a small local bridge service beside the web app on a laptop, Raspberry Pi, home server, field kit, or community base station.

```text
vmesh web app
  -> localhost comms bridge
    -> Reticulum / RNS
      -> LXMF router and delivery receipts
      -> TCP/UDP/LAN/internet interfaces
      -> LoRa/RNode/serial/radio interfaces where configured
    -> Meshtastic bridge provider
      -> local Meshtastic node over serial/BLE/TCP/MQTT
      -> existing Meshtastic LoRa mesh users and gateways
```

The Reticulum bridge is responsible for:

- Loading or creating the local Reticulum identity.
- Managing RNS configuration and local interfaces.
- Sending and receiving LXMF messages.
- Maintaining outbound queues and delivery receipts.
- Tracking peer/contact trust labels.
- Reporting interface health, reachable peers, and propagation-node status.
- Exposing a narrow localhost API to vmesh.

The Meshtastic bridge is secondary. It should translate selected compact vmesh disaster messages into Meshtastic-safe packets and import Meshtastic messages as low-bandwidth field reports. It should not become the canonical state store, identity layer, or primary transport abstraction. Meshtastic payloads must remain short and conservative because LoRa mesh capacity is limited.

The first implementation should provide:

- `mock-disaster-comms` provider for UI and tests.
- `reticulum-bridge` provider shape and local API contract.
- `meshtastic-bridge` provider shape and limitations.
- Offline outbox in local state/storage.
- Comms status surface in footer or map status layer.
- H3-attached incoming reports with provenance and confidence.

## Architecture Decisions

- Use MapLibre rather than Mapbox GL to keep the base engine open-source.
- Use deck.gl `MapboxOverlay` rather than a separate canvas to prevent camera drift.
- Use H3 as the stable mesh index for aggregation and interaction.
- Keep user-added data separate from app-pulled data in the type system.
- Keep charts in React DOM rather than WebGL to preserve accessibility and layout control.
- Use Reticulum as the primary resilient network substrate for disaster mode.
- Treat Meshtastic as an interoperability bridge into LoRa mesh networks, not as the main vmesh networking stack.

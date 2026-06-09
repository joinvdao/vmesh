# System Design

## Snapshot

Date: 2026-04-30

V1 implements the screenshot-directed vmesh dashboard with a fixed Next.js app shell, MapLibre globe surface, deck.gl H3 mesh overlay, Zustand state, typed mock data, local/private user records, source/data overview panels, and provider-agnostic open terrain source foundations.

The H3 mesh is treated as an indexing and retrieval layer first. The visible grid is optional analytical UI, not the default visual product.

The architecture should preserve vmesh's dual identity: an end-user geospatial source atlas for finding macro and micro data about a place, and a source-honest ecosystem source broker for downstream products. The provider layer makes source context explainable, reusable, privacy-aware, and difficult to overclaim across geospatial, ecological, climate, hydrology, soils, infrastructure, food-system, and local-context data. It does not replace the atlas or become a default heavy GIS/data storage layer; it protects the atlas by separating source truth, inferred context, generated/visual context, user observations, rejected providers, provider-native refs, and optional derived/cache artifacts.

## Architecture

```text
Next.js App Router
  app/layout.tsx
  app/page.tsx

React UI
  fixed app shell
  selected hex card
  bottom data overview dashboard
  source/provenance drawer
  map controls and mesh legend
  source scale control
  local user data panel

State
  Zustand vmesh store
  globe visual theme
  selected/hovered hex state
  camera/view state
  active layer filters
  U3/U5/U8 mesh tier state
  map and terrain provider status
  source package manifest and summaries
  draft user-added records

Geospatial renderer
  Three.js orbit globe for distant cinematic Earth mode
  MapLibre operational basemap
  raster-dem terrain source normalization
  deck.gl MapboxOverlay
  H3HexagonLayer

Data model
  micro summaries
  user-added records
  H3 spatial index
  graph-ready entities, observations, sources, and relationships
  source layer catalog
  STAC/source manifests and H3 summaries
  source broker reports
  optional site-package-style manifests
  provenance and limitations

Source-honest ecosystem broker
  source registries and coverage probes
  selected and rejected source reasons
  source role boundaries
  privacy disclosure and cache keys
  STAC/source manifests, typed ecosystem records, and provider-native asset refs
  downstream app source plans

Resilient comms
  local bridge service
  Reticulum/RNS primary stack
  LXMF message router
  Meshtastic bridge provider
  offline outbox and delivery state
```

## Data Flow

The renderer has two coordinated surfaces. Three.js owns the distant `Orbit Globe`: a real sphere mesh with procedural open-asset-ready Earth texture, bump relief cues, cloud shell, atmosphere, directional light, drag inertia, idle rotation, and dark/light visual modes. MapLibre owns the source-backed basemap, terrain, close-map camera, imagery, labels, and map events. deck.gl attaches through `MapboxOverlay` so H3 layer rendering follows the MapLibre camera when source overlays are enabled. Close search/zoom states switch to `OSS Map Output` so the open MapLibre basemap becomes legible for local work. Zustand holds the selected H3 cell, hover metadata, mesh tier, active layers, map status, terrain status, package-backed H3 summaries, prepopulated hex summaries, and local draft records. React panels subscribe to Zustand slices rather than reading directly from map instances.

App-pulled datasets should enter through typed provider adapters. User-added data enters through explicit local state actions with provenance, timestamp, and private-local visibility.

For backend evolution, H3 should not be the knowledge graph itself. It should be the spatial index that anchors graph records. The graph should model entities, observations, sources, and relationships, then attach those records to one or more H3 cells for aggregation, filtering, permissions, offline bundles, and local retrieval.

Resilient communications should enter through a local bridge, not directly through browser-only code. The browser app sends small structured disaster messages to the local bridge over a localhost HTTP/WebSocket API. The bridge owns Reticulum identity, RNS daemon/process configuration, LXMF routing, peer discovery, delivery receipts, and optional Meshtastic bridge access. Received mesh reports are normalized into typed vmesh records with source, timestamp, and delivery metadata before they touch the UI.

## Public Contracts

- `MeshTier`: `U3`, `U5`, and `U8`, mapped to H3 resolutions 3, 5, and 8.
- `GlobeTheme`: `dark` or `light`, stored in Zustand as a visual mode for the atlas globe. It changes stage, ocean/land treatment, map opacity, and rim lighting without changing provider IDs, data provenance, or mesh state.
- `GlobeBackdropMode`: `blank`, `grid`, or `stars`, stored in Zustand as a visual-only stage setting. It changes the background behind the globe without changing map providers, imagery, terrain, macro data, H3 tier, or selected cell state.
- `EarthTextureSourceConfig`: far-zoom globe texture source metadata for the bundled NASA Blue Marble raster, procedural Natural Earth-style fallback visuals, optional token-gated Mapbox satellite, future Sentinel/SEN2SR package textures, and offline fallback textures. These are visual-context sources.
- `MacroLayerDefinition`: retained source-layer contract for category, providers, status, source type, visualization type, opacity, attribution, license, freshness, limitations, map readiness, preprocessing requirement, and public-demo safety.
- `SourceBrokerReport`: open-data-first source selection report for selected basemap, terrain, imagery, candidate counts, rejected-source reasons, layer catalog summary, open-map summary, and package manifest.
- `DataPackageManifest`: site-package-style contract for optional derived/cache outputs such as terrain, imagery, landcover, environment, contours, H3 summaries, provenance, selected sources, and rejected sources.
- `EcosystemSourceBrokerResponse`: downstream-app source-broker contract with normalized AOI/H3/place context, STAC Items/Collections for spatial assets, typed ecosystem source records, provider-native asset refs, source probes, selected providers, rejected sources, warnings, and API/MCP surface references.
- `GeospatialStacBrokerResponse`: spatial subset of the ecosystem broker response for STAC-native raster/vector/point-cloud assets.
- `GeospatialPackagePlan`: historical package-planning contract; use it as a planning surface for optional workers/cache modes, not as the default BA-facing storage contract.
- `GeospatialSourceCandidate`: historical name for source registry entries covering terrain, imagery, roads, buildings, water, vegetation, parcels, climate, weather, hydrology, soils, biodiversity, infrastructure, food-system/local assets, contours, landcover, and field boundaries.
- `PackagePlanArtifact`: optional app-ready artifact contract for PMTiles, vector tiles, raster tiles, COG, Zarr, GeoParquet, H3 summaries, manifests, or bounded APIs when a worker/cache mode is explicitly enabled.
- `SourceProvenance`: provider/source id, source type, source URL, ground model role, acquisition/processing/vintage metadata, license, attribution, and limitations.
- `GroundModelRole`: `bare-earth-dtm`, `generic-dem`, `surface-dsm`, `topobathy`, `imagery-inferred-context`, `visual-context`, or `not-authoritative`.
- `BasemapProviderConfig`: provider metadata for Protomaps PMTiles, OpenFreeMap, MapLibre/OSM raster fallback, custom style JSON, and offline shell.
- `OpenMapSourceConfig`: provider metadata for OSM, OpenFreeMap, Protomaps, Overture Maps, OSM PBF extracts, Natural Earth, OpenAddresses, and future LiDAR/EPT sidecar paths.
- `TerrainProviderConfig`: provider metadata and source configuration for XYZ raster-dem, TileJSON raster-dem, PMTiles terrain, API DEM, dataset DEM, and STAC catalog sources.
- `TerrainProviderStatus`: `idle`, `loading`, `active`, `fallback`, `unavailable`, or `error`.
- Deferred analysis provider contracts: Open-Meteo, NASA POWER, ERA5/CDS, NASA FIRMS, terrain-derived flood, solar, wind, and sector-map scaffolding remain future-provider plumbing and are not visible analysis workflows in the current UI.
- `ImageryProviderConfig`: provider metadata for Sentinel-2 preview, SEN2SR PMTiles/XYZ, optional Mapbox satellite, and offline raster PMTiles.
- `ImageryTileManifest`: source scene, acquisition/processing timestamps, bands, SEN2SR model, cloud gates, bounds, H3 coverage, derived index proxies, tile URL, and provenance.
- `SentinelSrWorkflow`: cloud-gated Sentinel-2 L2A discovery and SEN2SR `2.5 m` package plan with worker inputs, output refs, cloud QA status, H3 coverage, cache keys, and tile manifest.
- `SentinelSrRenderHandoff`: downstream prompt-preparation contract that exposes the SEN2SR output as a render texture/reference input only after tile output and cloud QA are ready.
- `VmeshHexRecord`: H3 ID, tier, resolution, place, micro summary, user summary, and provenance.
- `UserRecord`: category, title, attached H3 ID, private-local visibility, provenance, and timestamps.
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

The ownership boundary is deliberate: vmesh owns source selection, provenance, STAC/source manifests, typed ecosystem manifests, provider-native refs, and H3/source summaries. Downstream apps own fetching, processing, storage, final rendering, simulations, material systems, agent workflows, and domain-specific user experience. Building Abundance-style products should consume vmesh source-broker responses rather than duplicating provider registries or treating their render/GIS/ecosystem workers as source authority.

Recommended ownership:

| Contract area                                          | Owning layer | Consumers       |
| ------------------------------------------------------ | ------------ | --------------- |
| H3 macro/micro summaries                               | vmesh        | Downstream apps |
| Basemap, terrain, imagery, and provider metadata       | vmesh        | Downstream apps |
| STAC/source manifests, ecosystem records, and provider-native asset refs | vmesh | Downstream apps |
| Optional package/cache artifact contracts              | vmesh/deployment | Downstream apps |
| Property intelligence and parcel provenance patterns   | vmesh        | Downstream apps |
| Hub playbook cards and local status checklists         | vmesh        | Downstream apps |
| Permaculture/local land interaction ontology           | vmesh        | Downstream apps |

The near-term sharing mechanism is Markdown plus fixtures. A shared package should wait until duplication is painful and the contract has stabilized. If that happens, the first candidate should be a narrow package such as `@vdao/geo-contracts` that contains TypeScript types, JSON Schemas, and validators only. It should not include provider calls, tokens, private data, or app-specific rendering code.

Cross-app operating rules are documented in `docs/CROSS_REPO_INSIGHTS.md`.

## Production Open Map Stack

The preferred production stack is MapLibre-first with source-broker APIs and optional static geospatial packages where a deployment explicitly enables cache/derivative delivery:

```text
Next.js / React UI
  -> MapLibre GL JS renderer
  -> deck.gl analytical overlays
  -> PMTiles protocol for optional vector/raster packages
  -> optional CDN/R2/static hosting for tile archives
  -> typed vmesh API
    -> PostgreSQL/PostGIS
    -> H3 indexes
    -> provenance and source manifests
```

PMTiles is the preferred delivery primitive for public/open derived layers when a deployment chooses to publish them, because it can bundle vector basemaps, contour vectors, raster imagery, landcover rasters, and H3 summary tiles into static archives that work well over HTTP range requests and CDN caches. Cloudflare R2 or equivalent object storage is a strong hosting target for public demos and local hub mirrors, but vmesh should still return provider-native source refs by default.

PostgreSQL/PostGIS remains the conservative source-of-truth backend for source geometries, H3 cell relationships, provenance, user records, and future graph edges. Apollo GraphQL can be considered later for rich cross-layer queries and benchmark visualizations, but the current architecture should not add GraphQL until typed REST/RPC routes become awkward.

Some reference products combine Vue/Nuxt shells with React modules. vmesh should not adopt that framework mix. The useful lesson is modularity: renderer, layer catalogs, source transparency, benchmark charts, and authenticated workspace surfaces should be independently replaceable without coupling data contracts to UI framework boundaries.

## Terrain Provider Foundation

`lib/terrainSources.ts` is the terrain registry and normalization layer. Provider switching is configuration/state-driven: the renderer asks for a selected provider and receives a normalized MapLibre source when the provider is map-ready.

V1 provider kinds:

| Kind                  | V1 behavior                                                        |
| --------------------- | ------------------------------------------------------------------ |
| `raster-dem-tilejson` | Map-ready; supports env-configured TileJSON and demo fallback.     |
| `raster-dem-xyz`      | Map-ready when selected; supports Terrarium-style XYZ tiles.       |
| `pmtiles-raster-dem`  | Browser-only visual fallback terrain through the PMTiles protocol. |
| `api-dem`             | Future OpenTopography-style clipped DEM API path.                  |
| `dataset-dem`         | Future CUDEM/FABDEM preprocessing path.                            |
| `stac-catalog`        | Future terrain catalog discovery path.                             |

Default provider order:

1. `NEXT_PUBLIC_TERRAIN_TILEJSON_URL` env provider when configured.
2. Mapterhorn PMTiles terrain at `https://download.mapterhorn.com/planet.pmtiles` for visual fallback only.
3. Mapzen/Joerd Terrarium XYZ terrain at `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`.
4. MapLibre demo terrain as a final browser-verification fallback.
5. Nonblank globe surface and footer/provider status if terrain is unavailable or fails.

The renderer registers `pmtiles://` with MapLibre once, normalizes provider configs into `raster-dem` sources, and attempts map-ready terrain providers in order. A tile/setup failure degrades to the next candidate without blocking the basemap, H3 mesh, or DOM panels. The runtime keeps terrain mutable after initialization so the UI can reapply a selected provider without rebuilding the map.

The terrain overlay panel is the user-facing control surface for browser display. It lists map-ready providers first, defaults to the configured visual terrain provider, keeps Mapterhorn/Mapzen-style terrain as no-token visual backup, and shows future CUDEM/FABDEM/OpenTopography/STAC paths as preprocessing or licensing candidates. Toggling the overlay hides or reapplies MapLibre terrain and the derived hillshade layer; it does not disable the globe camera, selected marker, source layers, imagery, or H3 context interactions.

Terrain trust is role-capped. A generic DEM can drive the globe surface but cannot claim high-trust bare-earth DTM status. DSM, imagery, super-resolution imagery, vectors, and visual basemaps cannot upgrade terrain authority. CUDEM-style topobathy is useful for coastal context but should not become generic inland terrain.

`lib/geospatialPackage/terrainSourceAdapters.ts` is the source-native input
resolver for the broker and optional package workers. It separates map-ready
render fallbacks from official upstream terrain inputs. USGS 3DEP currently resolves to an official
ArcGIS ImageServer GeoTIFF export request for DTM/DEM. USGS DSM is represented
separately as `usgs-3dep-lpc-dsm`: it resolves qualifying official 3DEP Lidar
Point Cloud source projects for later DSM derivation, but does not emit a
browser tile until a point-cloud worker derives and QA's a retained raster.
Canada HRDEM can resolve direct official `hrdem-mosaic-1m` COG refs from Natural
Resources Canada STAC for DTM and DSM roles when live STAC evidence is
available. DTM and DSM are represented as separate source IDs (`canada-hrdem`
and `canada-hrdem-dsm`) so a surface model cannot silently become bare-earth
terrain. LidarBC is also represented as separate DTM/DSM source IDs
(`bc-lidarbc` and `bc-lidarbc-dsm`) and resolves official 1 metre GeoTIFF refs
from the LidarBC ArcGIS FeatureServer indexes. Mapterhorn and Mapzen remain
useful renderer fallbacks, not upstream terrain truth for generated packages.

The default terrain broker path is:

```text
AOI/source request
  -> terrain source adapter
  -> official source input ref
  -> STAC Item / provider-native asset ref
  -> downstream app GIS/ecosystem worker fetches/processes/stores when needed
```

An optional derived terrain package path may exist in deployments that enable workers:

```text
AOI/source request
  -> terrain source adapter
  -> official source input ref
  -> explicit local/server worker fetch and clip
  -> normalized COG GeoTIFF terrain truth
  -> derived hillshade/slope/aspect/contours/terrain RGB PMTiles
  -> QA manifest and retained package artifacts
```

For the USA/Canada milestone, source selection may use Mapterhorn attribution as
a clue about upstream families, but the worker must go straight to source. It
must resolve USGS 3DEP 1 m DEM (`us1*` in Mapterhorn attribution) directly from
USGS and Natural Resources Canada/provincial terrain directly from official COG,
STAC, WCS, ArcGIS, archive, or object-store endpoints. Mapterhorn PMTiles must
not be rendered, sampled, or treated as the source of truth for generated
packages.

The Canada source chain cannot stop at Mapterhorn parity. Mapterhorn lists
Canada `cahrdem2` as partial 2 m coverage, so that is the honest national
baseline. A Canada 1 m claim requires a direct official resolver that can choose
1 m HRDEM/provincial sources where available and record lower-resolution gaps
honestly. British Columbia should
prefer direct LidarBC/provincial LiDAR-derived DTM/DSM when it is the better
official 1 m source.

`lib/geospatialPackage/terrainSourceProofs.ts` provides the bridge between
worker-side live probes and the package contract. It can turn a retained
USGS/HRDEM render proof into a terrain worker manifest only when the proof is
covered, QA is present, a rendered artifact is retained, and no secret-bearing
refs are present. This is intentionally labelled as preview evidence until the
worker emits normalized COG/PMTiles terrain artifacts.

The near-term terrain milestone is narrower than the full package path. vmesh
must first prove source-to-viewer ingestion for USA and Canada DTM/DSM data:
select the right USGS 3DEP, Canada HRDEM, or LidarBC route for a public-safe
AOI, request or preview the source-backed tile/raster, display it in MapLibre
with honest role/provenance labels, and retain browser/network evidence. Derived
hillshade, contours, terrain RGB, PMTiles, and terrain-slab outputs come after
that viewer proof exists.

The viewer has two official-source DTM modes. `Official DTM Source Preview`
is the strict 1 m path and must fail closed when only lower-resolution Canada
HRDEM or no-data pixels are proven. `Best Official DTM Preview` is a practical
inspection path: it still prefers USGS 3DEP, LidarBC, and HRDEM 1 m, but may
display explicit 2 m Canada HRDEM where that is the best proven official source.
The second path improves user coverage but cannot be used as evidence that the
strict USA/Canada 1 m branch is universally covered.

The current retained USA/Canada matrix lives at
`.artifacts/terrain-source-preview/usa-canada-1m-terrain-coverage-matrix-latest.json`
and is regenerated with `npm run terrain:coverage-matrix`. It is a `live-proof`
matrix for selected public-safe AOIs, not a universal coverage proof. It shows
covered USGS 3DEP 1 m DTM examples plus selected covered HRDEM/LidarBC 1 m
DTM/DSM examples, while Canada-wide terrain remains partial 2 m by default. It
also shows deliberate 1 m gaps that fail closed. A separate
USGS LPC DSM probe can prove source availability for future DSM derivation. The
bounded LPC DSM render worker can then shortlist intersecting LAZ/LAS assets,
download a capped subset, and derive a retained `surface-dsm` preview grid/PNG
for a public-safe tile. That preview is evidence for source-to-render
feasibility, not a production DSM package or a universal USA DSM display proof.
Therefore the system must keep
`universalUsaCanadaOneMeterDtmProven` false until a broader official-source
coverage audit proves otherwise.

## Source Layer Catalog And Source Broker

`lib/layerCatalog.ts` is the user-facing source layer catalog. The visible workflow exposes Terrain, Vegetation, and Imagery layers only. Climate, Hazard, Solar, and similar analysis-oriented groups remain deferred even if provider scaffolding exists in code.

`lib/sourceBroker.ts`, `lib/sourcePackages.ts`, and `lib/sourceProvenance.ts` adapt the source-manifest discipline to vmesh. The broker selects open-data-first defaults, records rejected or skipped sources, builds a manifest-shaped source contract, and keeps the renderer away from raw source decision-making. MapLibre consumes map-ready sources; H3 consumes summaries and provenance; heavy Sentinel, landcover, contour, deferred analysis, and open-vector preprocessing stays outside the browser.

`lib/geospatialPackage/` is the first generic broker surface for downstream apps. The directory name is historical; the contract covers ecosystem data, not only GIS layers. It adds:

- a source registry across terrain, imagery, roads, buildings, water, vegetation, parcels, climate, weather, hydrology, soils, biodiversity, infrastructure, food-system/local assets, contours, landcover, and field boundaries;
- source probes that disclose open, paid, cached, blocked, missing, token-gated, license-gated, and preprocessing-required states;
- a planner that ranks open/cacheable/source-ready providers without selecting paid, token-gated, license-gated, or API-key-required providers by default, even when a downstream request prefers one;
- STAC/source manifest contracts and typed ecosystem records for provider-native refs, plus optional artifact contracts for PMTiles, vector tiles, raster tiles, COG, Zarr, GeoParquet, H3 summaries, tabular ledgers, manifests, and bounded APIs;
- API routes at `/api/geospatial-package/sources`, `/api/geospatial-package/plan`, and `/api/geospatial-package/sentinel-sr`;
- a future MCP-style tool namespace for source listing, STAC/source planning, Sentinel/SEN2SR planning, and manifest retrieval.

The source registry should become a durable DB, not just in-memory code and sidecar snapshots. It must track source authorities, endpoints, collections, coverage evidence, and discovery runs across country, state/province, municipal, private-sector, charity/local agency, open-community, and academic source levels. The schema target and the seed Canada/USA source ladders are specified in `docs/SOURCE_REGISTRY_DB.md`. This DB stores source metadata, provider-native refs, promotion state, evidence refs, and rejected-source reasons; it does not store heavy GIS/ecosystem payloads by default.

The broker is not a general data worker and should not store heavy GIS or ecosystem payloads by default. It returns source-honest plans, STAC/source manifests, typed ecosystem source records, and provider-native refs; downstream apps or explicitly configured local/server workers are responsible for downloading, clipping, tiling, caching, storing, and validating heavy artifacts.

Terrain now has the first worker contract in `lib/geospatialPackage/terrainWorker.ts`
and `lib/geospatialPackage/terrainWorkerRuntime.ts`. This is a BA-inspired
terrain-package boundary for source selection, terrain-tool profiles, injected
raster-query execution, QA validation, retained artifact refs, run-class
labelling, and manifest creation. It does not fetch national DEM/DTM sources by
default and does not make live-provider claims. Without an attached raster query
or configured artifact refs, the worker fails closed as `configured`. A result
may be treated as `live-proof` only when a real local/server worker returns
retained artifacts and evidence under the intended workflow.

Viewer source-preview ingestion is a separate, narrower path. `lib/terrainSourcePreview.ts`
and `/api/terrain/source-preview/...` display source-backed raster previews for
DTM/DSM inspection before the package worker generates COG, PMTiles, contour,
terrain RGB, or terrain slab artifacts. USA DTM, Canada HRDEM, LidarBC, and USA
DSM all run through worker-rendered route paths; USGS DTM currently renders from
the official 3DEP ImageServer after product-index or Source DEM index proof,
while Canada HRDEM and LidarBC display tiles are rendered from source
COG/GeoTIFF inputs. The
source-preview path uses:

- USGS 3DEP 1 m DEM/DTM for USA DTM where the 1 m product index or Source DEM
  index reports coverage;
- USGS 3DEP Lidar Point Cloud source-index hits for USA DSM source availability.
  The resolver tries both official LPC query layers and accepts `Meets` plus
  `Meets with variance` 1 m-class sources. Source probes are a handoff to the
  bounded point-cloud DSM tile worker, which can return worker-rendered DSM PNGs
  for covered tiles;
- direct official Canada HRDEM/provincial DTM/DSM sources, with 1 m accepted
  only when STAC resolves a role-specific `hrdem-mosaic-1m` COG and the COG
  worker renders valid pixels for the requested tile. A 2 m-only HRDEM hit
  remains blocked in strict mode and is exposed only through the best-available
  route with explicit `2 m` headers;
- direct official LidarBC DEM/DSM FeatureServer-indexed GeoTIFFs for British
  Columbia where the index returns a role-specific 1 metre source raster. DTM
  checks use both DEM index layers because some interior BC coverage appears
  only in the 1:20,000 layer. These
  are displayed through the vmesh worker-rendered source-preview route, not by
  treating the GeoTIFF endpoint as a browser-native XYZ tile source.

The preview layer is MapLibre `raster`, not `raster-dem`. It is source evidence
for the viewer, not a decoded elevation mesh. Mapterhorn, Mapzen/Joerd, and the
demo DEM remain renderer continuity providers and cannot upgrade source truth.

Worker-side COG validation is now explicit for Canada HRDEM and LidarBC.
`scripts/terrain-cog-probe.py` queries HRDEM STAC or the LidarBC FeatureServer,
opens the selected DTM/DSM COG/GeoTIFF with rasterio, samples a bounded
coordinate window or Web Mercator tile, and reports `covered` only if the source
raster contains valid pixels. When `--render-output` is supplied it writes a PNG
terrain-preview tile from the source raster. This is the evidence bridge between
broad catalog coverage and future terrain-package artifacts.

The Canada HRDEM and LidarBC browser routes use the same COG worker renderer for
covered tiles and return raster PNGs plus source headers. They are intentionally
worker-backed render paths; they should fail transparent when Python/rasterio or
valid source pixels are unavailable rather than falling through to a
lower-trust source.

Worker-side USA DTM tile proof is explicit through `scripts/terrain-usgs-3dep-render.py`.
The source-preview API route now invokes this worker for USGS DTM display tiles.
It checks the USGS 3DEP 1 m product index and then the Source DEM index before
requesting a rendered tile from the official 3DEPElevation ImageServer. This is
retained official-service proof; direct S1M COG/package refs remain a future
hardening step. It does not satisfy DSM. USA DSM can be source-probed through
the `usgs-3dep-lpc-dsm` adapter and `scripts/terrain-usgs-lpc-dsm-probe.mjs`,
and displayed through the bounded point-cloud worker when retained DSM raster
QA succeeds.

`scripts/terrain-usgs-lpc-asset-manifest.py` is the first point-cloud handoff
step. It keeps the run lightweight by enumerating the selected project's public
LAZ/LAS source links from `0_file_download_links.txt`, writing an asset manifest,
and reporting whether the current runtime has PDAL or laspy available. It must
not download full point clouds or claim a DSM raster exists.

Production hardening for the first package-service API includes request size caps, JSON-only POST handling, strict AOI/H3 validation, source preference sanitization, label sanitization, credential/secret-bearing URL redaction, no-store responses, and explicit coordinate-disclosure metadata. Coordinate disclosure records the user-requested precision (`h3-cell`, `bounds`, `exact-centroid`, or `fallback-sample`) separately from the normalized centroid used for H3 math. These protect the planner surface while preserving the larger rule that artifact generation belongs in authenticated local/server workers.

The next worker contract is a property treatment package. It should use the same
planner/source-broker discipline, but produce concrete app-ready artifacts for a
selected H3 cell, AOI, or property/project boundary:

```text
package request
  -> source plan and privacy class
  -> CPU GIS/ecosystem worker for clip/reproject/terrain derivatives/vector overlays/map plates/source ledgers
  -> optional GPU worker for SEN2SR and high-quality render-conditioning outputs
  -> COG/PMTiles/GeoParquet/PNG/SVG/H3 summary artifacts
  -> manifest with provenance, license, cache policy, and public/private delivery refs
```

CPU geospatial work owns DEM/DTM normalization, contours, hillshade,
slope/aspect, water/flow/wetness hints, roads/buildings/water/landcover/vector
overlays, deterministic map plates, and manifest assembly. GPU work owns only
the parts where acceleration is material: SEN2SR inference, optional
terrain/material render passes, and optional downstream source views. The app
server should orchestrate, authorize, and show status; it should not run the
heavy GIS or ML steps in the request path.

Public cached PMTiles are appropriate for open/generalized layers. Private AOIs,
premium imagery, paid parcels, user-uploaded boundaries, report assets, and
downstream generated outputs require signed URLs, an authenticated tile proxy,
or private object refs. Authentication must protect the data URL or tile proxy,
not merely the UI surface.

`docs/PROPERTY_PACKAGE_TILE_ARCHITECTURE.md` is the detailed architecture note
for this package/tile split.

Semantic annotations are an optional package artifact. They describe visible
scene features such as trees, rocks, rooflines, road edges, water/field edges,
cars, posts, street lights, rooftop equipment, and material cues. When they are
only image-anchored, they support prompt conditioning, report notes, and visual
QA. When camera pose or georegistration is available, they can be emitted as
GeoJSON/PMTiles and attached to H3 cells as `visual-observation` records.

`lib/macro-packages/` remains as legacy/future package-manifest scaffolding. It must stay outside the visible user workflow until analysis packages are intentionally reintroduced. Production source responses should start as brokered manifests and provider-native refs. Optional derived packages may be generated by downstream, local-hub, or explicitly configured server workers, then imported as manifests plus artifacts; they should not trigger broad viewport climate queries from the browser.

## Licensing Gates

- FABDEM is marked `requires-license` because its public release is non-commercial unless separately licensed.
- CUDEM is marked `preprocessing-required` and should become map-ready only after tiling/COG/PMTiles processing.
- OpenTopography is marked `requires-api-key` and is not called in V1.
- Mapterhorn is a V1 visual terrain fallback and attribution reference. It is
  not a terrain worker source and must not be sampled/rendered for source-native
  package generation.
- Official USA/Canada DTM source preview follows direct official provider
  endpoints. Mapterhorn's public upstream source list may inform the resolver,
  but source labels must name the actual upstream provider and exact resolution.
- No paid APIs, secret tokens, or real ingestion jobs run in V1.

## Fallback Behavior

- If terrain tiles fail, the globe shell, basemap, H3 overlay, and DOM panels remain usable.
- If the user flies into a coordinate or autocomplete place result, the viewer can transition from the cinematic globe wrapper into a rectangular open-source map output while preserving the same MapLibre/deck.gl camera state.
- Coordinate and close-place search enables the imagery layer by default for local inspection and can add an OpenStreetMap raster reference overlay above the satellite-style imagery so roads and streets remain visible.
- Mouse-wheel zoom over the Three.js orbit globe updates Zustand camera state and crosses into `OSS Map Output` once the source-backed inspection threshold is reached.
- Close source-backed map output keeps the terrain runtime available, so users can switch the searched area between flat basemap context and Mapterhorn/Mapzen terrain relief without rebuilding the map.
- Close USA/Canada searches can auto-select the official DTM source preview. If coverage is not locally proven, the preview fails closed or returns a transparent fail-soft tile and keeps the app usable.
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

| Kind                      | V1 behavior                                                                |
| ------------------------- | -------------------------------------------------------------------------- |
| `custom-style-json`       | Highest-priority environment configured MapLibre style URL.                |
| `protomaps-pmtiles`       | Offline-friendly future vector basemap, enabled when a PMTiles URL is set. |
| `openfreemap-vector`      | No-token vector style candidate for richer open geography.                 |
| `mapbox-satellite-raster` | Optional token/proxy-gated satellite base globe for reviewed deployments.  |
| `maplibre-demo`           | Default token-free OSM raster fallback that keeps the globe nonblank.      |
| `offline-shell`           | Last-resort nonblank local globe surface when no basemap can be fetched.   |

Basemap status is stored in Zustand and shown in footer telemetry. Mapbox satellite is modeled as an optional token/proxy-gated basemap provider, but it is not the public open-source default.

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

## Deferred Analysis Data

Climate, hazard, solar, wind, sector-map, and weather-derived analysis providers are deferred from the visible user workflow. `lib/climateDataSources.ts`, provider boundaries, and package fixtures may remain as future-provider scaffolding, but they must not be exposed as user-facing source layers or automatic place judgments in this phase.

Future analysis work should return as source-labeled packages generated outside the browser, with explicit provenance, source variables, model run time, forecast horizon where relevant, license, and limitations. The browser should inspect retained artifacts and manifests rather than making broad climate/grid/provider calls from the viewport.

## Source Transparency Drawer

The UI now includes a rail-opened source/provenance drawer. It summarizes the active basemap, terrain, imagery, selected H3 provenance, local mock records, provider registry statuses, licenses, and limitations without keeping permanent panels on the globe.

The drawer is intentionally read-only in V1. Provider switching still happens through the dedicated layer panels or environment configuration, while the source drawer answers whether a user is seeing live, cached, mock, fallback, token-gated, license-gated, or preprocessing-only data.

## Local Provider Boundaries

Micro summaries now include local food network assets and property signals. Food records cover farms, growers, farmers markets, food hubs, community gardens, storage, and distribution points. Property signals are mock-only in V1 and use H3/approximate area fields, price bands, acreage bands, notes, provenance, and timestamps rather than exact private addresses.

## Imagery Provider And SEN2SR Pipeline Foundation

`lib/imagerySources.ts` models Sentinel-2/SEN2SR imagery as optional raster layers with manifest-backed provenance. Imagery is not the operational basemap and is off by default.

V1 imagery kinds:

| Kind                       | V1 behavior                                                              |
| -------------------------- | ------------------------------------------------------------------------ |
| `modis-low-zoom-context`   | Future direct NASA MODIS/Blue Marble low-zoom globe backdrop only.       |
| `sentinel2-cog-preview`    | No-token preview raster for UI verification and manifest-backed display. |
| `sentinel2-sen2sr-pmtiles` | Future offline/server generated SEN2SR raster PMTiles.                   |
| `sentinel2-sen2sr-xyz`     | Future offline/server generated XYZ tiles.                               |
| `mapbox-satellite-global`  | Token/proxy-gated global ortho-style visual imagery layer.               |
| `offline-raster-pmtiles`   | Future local hub/offline imagery bundle.                                 |

The same server-side Mapbox proxy contract can power `mapbox-satellite-basemap`
and `mapbox-satellite-global` for deployments that explicitly choose Mapbox
visual imagery. The renderer still uses MapLibre GL JS, keeps secret Mapbox
tokens server-side, and falls back to open OSM/OpenFreeMap/PMTiles or Sentinel
preview paths when Mapbox is not configured.

The imagery pyramid should separate globe-scale aesthetics from local intelligence. `modis-low-zoom-context` is a direct NASA/open-data source candidate for z0-z8 global texture, not a property source. It may help the globe feel complete before Sentinel or premium packages exist, but it must carry `visual-context`/`not-authoritative` provenance, coarse resolution metadata, NASA attribution, and a limitation that it cannot support parcel, building, road, hydrology, infrastructure, or property-analysis claims.

Standard and premium local imagery should remain separate. The standard local lane is cloud-qualified Sentinel-2 L2A plus SEN2SR-derived `2.5 m` visual/material context, labeled `imagery-inferred-context`. The premium lane is licensed orthophoto/satellite imagery with explicit storage, processing, export, AI/render-conditioning, attribution, and downstream-use rights. Mapbox Satellite global imagery is an ortho-style visual context layer unless an active commercial agreement permits stronger use for the specific workflow.

The browser displays tiles and summaries only. Sentinel-2 STAC search, SCL cloud-mask validation, SEN2SRLite inference, COG writing, and tile generation belong in `pipelines/sentinel_sr/` as server/local-hub processing. H3 stores derived summaries such as NDVI, NDWI, NBR, vegetation cover proxy, bare soil proxy, water presence proxy, and cloud-free quality metadata.

The Sentinel/SEN2SR plan follows the same sidecar package discipline: source Sentinel-2 L2A RGBN is `10 m`, SEN2SRLite RGBN `x4` targets `2.5 m`, output is `imagery-inferred-context`, and cache keys include cell, scene/acquisition window, cloud thresholds, model id, and target resolution. This can improve imagery display and advisory material/vegetation context, but it must not upgrade terrain authority, legal boundaries, roads, buildings, parcels, or emergency authority.

`/api/geospatial-package/sentinel-sr` is the downstream-facing planning flow for this product. It emits:

- an inline Earth Search STAC request for the worker;
- the cloudless preview tile template for inspection only;
- planned COG, PMTiles, XYZ, preview, manifest, and H3-summary refs;
- a `SentinelSrWorkflow.status` of `planned`, `validation-required`, `ready`, or `blocked-cloud-gate`;
- a downstream render handoff that uses role `texture` and remains unavailable until authenticated worker completion proves a generated tile ref and SCL cloud metrics both pass.

`/api/geospatial-package/sentinel-sr/complete` is the authenticated worker completion route. It requires `VMESH_SENTINEL_SR_WORKER_TOKEN`, accepts only worker-owned cloud metrics and generated artifact refs, validates those refs against `VMESH_SENTINEL_SR_ARTIFACT_HOST_ALLOWLIST`, and rejects localhost/private/link-local/metadata-service URLs, non-HTTPS schemes, credentials, and secret-like query params. Public callers cannot mark a workflow ready or loosen cloud thresholds.

The route does not upscale preview JPEGs. The worker must fetch Sentinel-2 L2A RGBN bands and SCL assets, fail closed on cloudy AOIs, run SEN2SRLite outside Next.js, publish the tile artifact to a trusted host, and then attach passing cloud metrics before downstream render prompt preparation can use it.

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
- H3-attached incoming reports with provenance and delivery metadata.

## Architecture Decisions

- Use MapLibre rather than Mapbox GL to keep the base engine open-source.
- Use deck.gl `MapboxOverlay` rather than a separate canvas to prevent camera drift.
- Use H3 as the stable mesh index for aggregation and interaction.
- Keep user-added data separate from app-pulled data in the type system.
- Keep charts in React DOM rather than WebGL to preserve accessibility and layout control.
- Use Reticulum as the primary resilient network substrate for disaster mode.
- Treat Meshtastic as an interoperability bridge into LoRa mesh networks, not as the main vmesh networking stack.

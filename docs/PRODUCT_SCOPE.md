# Product Scope

## Product Objective

vmesh is a dual-purpose geospatial and ecosystem data product.

For end users, vmesh is a source-honest atlas: a spatial operating surface where every H3 hex can combine terrain, imagery, open-map context, macro source layers, micro local records, and user-added observations without turning those inputs into automated conclusions.

The product should help users inspect what source data exists for a place, what it can and cannot prove, and which provider-native refs or optional artifacts can be reused by downstream applications.

For downstream products, vmesh is also a source-honest ecosystem source broker and data provider. This is not a separate product from the atlas; it is the data backbone that lets the atlas explain where its earth, ecological, infrastructure, climate, hydrology, soils, food-system, and local-context intelligence came from, what the data can prove, what is inferred or visual only, what was rejected, and which provider-native refs can be safely piped by other applications.

vmesh owns the slow source-discovery job for each municipality, region, and
coordinate request. It should learn which municipal open-data portals, ArcGIS
services, STAC/OGC catalogs, public object stores, climate services, ecology
registries, soil surveys, hazard sources, planning layers, infrastructure
datasets, and local-context records exist, then package that knowledge as
source ladders and gap reports. Downstream GIS workers should process selected
refs; they should not have to scrape the web from scratch for every site.

Source discovery should happen as a ladder of source-location runs, not as
immediate data ingestion. VMesh first finds where sources live: national/federal
catalogs, province/state/region catalogs, municipal/county portals, private
provider catalogs, charity/local-agency records, open-source/community
registries, and academic/research repositories. The result is a registry of
STAC/DCAT/OGC/API/ArcGIS/catalog/report/source refs, access posture, coverage
posture, pack coverage, and next actions. Raw files are fetched later only by a
GIS worker, downstream product, explicit cache mode, or authorized paid-provider
run.

## Target User And Promise

Primary users are geospatial analysts, land and property researchers, regenerative agriculture operators, infrastructure strategists, community organizers, and people trying to understand a place through both high-level source data and ground-level assets.

The core promise: select any hex and quickly inspect its source coverage, property context, local records, and human-scale assets. Newcomers should be able to enter through a guided agent that learns their interests and location, then assembles a personalized view of the mesh on their behalf.

## Product Identity

vmesh has one public identity with two tightly coupled jobs:

- Source atlas: help end users find and inspect macro and micro data about a place, including terrain, imagery, open-map features, ecosystem layers, local assets, property context, and provenance.
- Source-honest ecosystem source broker: discover, normalize, validate, and explain place-based geospatial, ecological, climate, hydrology, soils, infrastructure, food-system, and local-context source availability for downstream products without upgrading generated, inferred, fallback, or visual context into source truth.

The atlas is the experience users understand. The broker is the discipline that keeps that experience trustworthy and reusable. Every high-value layer should preserve provenance, source role, license, freshness, limitations, privacy posture, and whether it is authoritative source data, inferred context, visual context, user observation, or research-only.

vmesh is not the final game world, simulation, rendering engine, heavy GIS/ecosystem storage layer, or domain workflow for every consuming product. Products built on top of vmesh should consume ecosystem source-broker manifests, provider-native asset refs, source summaries, and H3/ecosystem signals, then own their own fetching, storage, rendering, material logic, simulation rules, or task-specific UX.

## Core Mesh Model

Each hex is a context cell that combines source data, local/community records, and user-added context. The product spine is the movement from local inspection to regional source coverage and back: every personal observation should be attached to a place, and every regional source layer should remain inspectable at the selected hex.

A hex can hold:

- Source data: terrain, imagery, water, vegetation, land use, soils, climate/weather, hydrology, buildings, roads, parcels, biodiversity, food-system, local asset, and infrastructure context.
- Micro data: local food, growing capacity, community assets, property signals, parcel context, producers, programs, and observations.
- User-added data: notes, skills, what the user has, what they need, observations, corrections, links, and assessments.

The H3 mesh is the atlas structure, not the legal boundary system. Parcels, deeds, survey descriptions, buildings, assets, and local records are objects that attach to one or more hexes.

The H3 mesh is also not required to be visible by default. In the product experience it functions as a spatial database index and knowledge-bucketing system. The interface should reveal cells only when that helps the user inspect a selected place, compare a source layer, attach local knowledge, or understand provenance.

## Deferred Analysis Layers

Climate, hazard, solar, wind, flood, and other analysis outputs are deferred in the visible product. Provider scaffolding may remain in code for future broker/worker work, but the current UI should not present climate, hazard, or resilience-style outputs.

Current visible source families:

- Terrain: DTM/DSM/DEM source preview, hillshade, contours, slope/aspect-ready artifacts.
- Imagery: satellite/aerial visual context and generated imagery artifacts with source provenance.
- Open map features: roads, buildings, water, addresses, parcels, land use, and administrative context.
- Vegetation and land cover: source-backed raster/vector context where licensing allows.
- Local data: user-added notes, records, property context, food/local asset records, and source manifests.

Deferred analysis families:

- Climate/weather summaries.
- Fire, flood, drought, and other hazard outputs.
- Solar/wind/sector-map outputs.
- Any ranked place assessment.

These layers may be visually beautiful and inspectable later, but should not be prescriptive. vmesh should not claim final system sizing, financial PV yield, legal design advice, official hazard assessment, or ranked place quality without a reviewed provider pipeline and a new product decision.
- Biodiversity: habitat indicators and species pressure where licensed sources exist.
- Macro economic and infrastructure: transport access, basic infrastructure presence.

## Open Map And Source Data Funnel

vmesh should act as a funnel for open geospatial sources rather than binding the globe to one provider. The product should keep basemap, terrain, imagery, open map features, deferred analysis providers, and H3 summaries separate so each source can be swapped, cached, licensed, and downgraded independently.

Open map feature sources are now modeled through a catalog that includes OpenStreetMap raster/vector paths, OpenFreeMap, Protomaps PMTiles, Overture Maps GeoParquet, OSM PBF extracts, Natural Earth, OpenAddresses, and future LiDAR/EPT sidecar references. Public raster tiles are visual context only; source-backed roads, buildings, places, addresses, land use, water, and admin records should come from preprocessing paths such as PostGIS, PMTiles, or H3 summaries.

Climate and hazard source optionality is modeled separately from the visible map and remains deferred. The browser should not request broad climate grids or expose climate/hazard analysis in this phase.

Agricultural field boundaries are a high-value bridge between macro land intelligence and future micro food-network work. Fields of The World should be treated as a future source-backed field-boundary provider: PMTiles for visual inspection, GeoParquet/PostGIS for source geometry, Zarr/COG products for model/raster context, and H3 summaries for field density, field size distribution, agricultural fragmentation, crop/land condition joins, and local food-system planning.

The source-broker pattern is now the generic downstream discipline. vmesh distinguishes renderer-ready sources, provider-native refs, optional derivative/cache outputs, rejected sources, future provider boundaries, and preprocessing-only datasets before anything reaches the globe, H3 summaries, or downstream app manifests.

## Ecosystem Source Broker

vmesh should stand alone as an atlas application while also serving other apps as a reusable ecosystem source aggregator. The atlas side helps users inspect macro and micro context; the provider side helps products request source-honest STAC-style spatial discovery plus typed ecosystem source results. It should answer:

- What data sources cover this coordinate, H3 cell, or AOI?
- Which sources are open, paid, cached, blocked, token-gated, license-gated, or missing?
- Which source should be used for terrain, imagery, roads, buildings, water, vegetation, parcels, climate, hydrology, soils, biodiversity, infrastructure, local food/community assets, contours, landcover, and field boundaries?
- Which provider-native URLs, API refs, STAC Items, FeatureServer records, object-store assets, or bounded query refs are ready for a downstream app to pipe?
- Can downstream apps consume clean STAC FeatureCollections/Catalogs and typed ecosystem manifests without hard-coding provider logic?

The first service boundary lives in `lib/geospatialPackage/` and the API routes under `/api/geospatial-package/*`. The naming is historical; the default role is source-honest ecosystem aggregation, not a heavy data worker. It ranks providers, exposes source probes, emits normalized source manifests, and keeps raw downloads, generated caches, and heavy artifacts outside vmesh by default.

This service should never flatten vmesh into a generic tile utility or GIS-only registry. Its purpose is to make the source atlas more truthful and more reusable: terrain, imagery, roads, buildings, parcels, hydrology, soils, climate, biodiversity, landcover, infrastructure, local assets, and user observations all become more valuable when the STAC/source manifest or typed ecosystem record explains what is known, unknown, inferred, visual, private, or unsafe to overclaim.

The production shape should be broker-first: a consumer requests source availability for a coordinate, H3 cell, AOI, or place context; vmesh returns STAC Items/Collections for spatial assets plus typed ecosystem records with provenance, query metadata, coverage confidence, license posture, and provider-native asset refs. Downstream apps such as BA should use those refs to fetch, process, or store data in their own worker/runtime. vmesh may support explicit cache or derivative modes later, but those are opt-in deployment features, not the default contract. Public vmesh docs should describe this as a generic downstream-app ecosystem source-broker contract and should not identify private consumer repos, exact AOIs, local folders, provider credentials, or unpublished planning context.

The broker should fill a stable world-building pack checklist for every site:
physical geospatial, climate, ecology, soils/geology, planning constraints,
infrastructure/access, hazard/risk, and provenance/confidence. These are
source-discovery packs first. Derived rasters, masks, terrain meshes, hydrology
products, and runtime artifacts belong to downstream workers or explicit VMesh
cache/worker modes.

The next downstream milestone is a boundary-first source-broker response, not
only a globe layer. A user or downstream app should be able to select a cell,
draw/import a project boundary, choose a standard open-data tier or a premium
licensed-data tier, and receive STAC/source manifests for imagery, terrain,
vector overlays, weather/climate context, map plates, and downstream handoff
refs. GIS-style worker output such as PMTiles/COG/GeoParquet/H3 summaries
belongs in the downstream app, local hub, or an explicit vmesh worker/cache mode.
The browser should inspect and render available previews and summaries; it
should not perform Sentinel downloads, SEN2SR inference, hydrology processing,
contour extraction, or premium imagery handling directly.

The property treatment package architecture is tracked in
`docs/PROPERTY_PACKAGE_TILE_ARCHITECTURE.md`.

The experimental community `1 m` Sentinel upscaling product track is tracked in
`docs/UPSCALED_SENTINEL_DATA_AI_RUN.md`. This is separate from the standard
SEN2SR `2.5 m` package and must remain labelled as AI-inferred visual context,
not measured orthophoto truth.

## Production Open Map Stack Direction

A strong production deployment pattern for vmesh is an open MapLibre stack with brokered source refs by default and optional PMTiles delivery through a CDN or object store such as Cloudflare R2, using open base data from the OSM, OpenFreeMap, Protomaps, Nextzen-style, Natural Earth, and Overture ecosystems where licensing permits.

This is relevant because it separates the visible atlas from the intelligence layer:

- MapLibre GL JS remains the open-source browser renderer.
- Optional PMTiles packages can carry basemaps, contours, terrain derivatives, Sentinel/SEN2SR imagery, landcover, and H3 summary overlays without requiring a tile server for every layer.
- Cloudflare/R2/CDN delivery can serve static tile archives cheaply and can be mirrored into local hub caches when a deployment explicitly enables derived/cache outputs.
- PostgreSQL/PostGIS may become the canonical backend for source metadata, source-backed geometry indexes, H3 indexes, provenance, user records, source manifests, and future knowledge-graph edges. It should not make vmesh the default owner of heavy provider payloads.
- GraphQL/Apollo-style APIs may become useful when clients need rich cross-layer queries, but simple typed API routes are enough until the query surface becomes complex.

The React-inside-Vue/Nuxt pattern seen in some geospatial products is not a target for vmesh. vmesh should stay Next.js/React-first and borrow only the modular frontend idea: map renderer, layer controls, provenance drawers, benchmark views, and user workflows should remain separable modules.

## Earth Observation Imagery Layer

Satellite imagery is a raster product that can enrich macro understanding, while H3 stores derived summaries and provenance. vmesh should support Sentinel-2 L2A discovery through STAC, cloud-free scene filtering, and offline/server-side SEN2SR super-resolution processing as a future pipeline.

MODIS should be available only as a low-zoom globe context source. Direct NASA MODIS or Blue Marble style composites can provide a coherent global backdrop for continent, country, and ocean-scale views, but the layer must be labeled as coarse visual context, usually hundreds of meters to one kilometer class depending on product. It must not feed property treatment, parcel analysis, roads, buildings, hydrology, local infrastructure, or property-detail render imagery. Do not reuse Mapbox Satellite tiles for this role; if vmesh needs MODIS, fetch and attribute the open NASA source directly.

Recommended imagery pyramid:

- `z0-z8`: NASA MODIS / Blue Marble style global composite for low-zoom visual context.
- `z8-z12`: Sentinel-2, Landsat, or reviewed public national imagery for regional context.
- `z12-z16`: Cloud-qualified Sentinel-2 plus SEN2SR-derived `2.5 m` visual/material context where a worker-produced package exists.
- `z16+`: Licensed premium satellite or aerial orthophoto only where terms permit storage, processing, report export, and downstream use.

V1 UI work may display a manifest-backed Sentinel preview layer, acquisition date, cloud-free quality metadata, and derived H3 summaries such as NDVI, NDWI, NBR, vegetation cover proxy, bare soil proxy, and water presence proxy.

Important boundaries:

- MODIS is for low-zoom globe texture and broad environmental context only.
- Do not run SEN2SR, PyTorch, COG processing, or whole-scene downloads in the browser.
- Do not present AI-enhanced imagery as higher-truth imagery.
- Do not use super-resolution imagery for legal boundaries, emergency certification, or exact infrastructure claims.
- Mapbox Satellite is optional and token/proxy-gated. It may be used as a base-globe or global ortho-style visual imagery provider in reviewed deployments, but it is not the public open-source default and is not measured orthophoto truth by default.
- Mapbox, MapTiler, Esri, and similar satellite basemaps are reference/display
  layers unless a deployment has explicit terms for storage, processing,
  export, redistribution, and downstream AI/render conditioning.
- NOAA CUDEM is coastal/topobathymetric terrain data, not global optical imagery.

The current upscaler reference is ESAOpenSR/SEN2SR. vmesh should follow a sidecar package approach: Sentinel-2 L2A RGBN at `10 m`, SEN2SRLite RGBN `x4`, derived display output at `2.5 m`, cloud-qualified AOIs, and `truthStatus: imagery-inferred-context`. This improves the visual/material layer and H3-derived vegetation/water/bare-soil summaries only; it does not create measured 2.5 m orthophoto truth.

The Sentinel/SEN2SR downstream flow lives behind `/api/geospatial-package/sentinel-sr` for public planning and `/api/geospatial-package/sentinel-sr/complete` for authenticated worker completion. It prepares the worker call, records cloud-gate requirements, produces planned refs, and emits a downstream render prompt-preparation handoff. That handoff is a texture/reference input only and must stay blocked until a generated 2.5 m tile product has trusted artifact refs plus worker-derived passing scene and AOI cloud metrics.

Fields of The World adds a field-boundary direction to this layer: Sentinel-derived agricultural field predictions can become optional map and H3 summary context when the source, model version, year, review metadata, geometry processing, and license are preserved. These predicted polygons should not be treated as cadastral parcels, legal property boundaries, or proof of ownership.

## Micro Data Layer

Micro signals describe the human-scale, walkable, person-scale context inside a hex. They are what makes a place actually livable, productive, and recoverable.

Canonical micro signals:

- Land use: parcel-level land use category, growing areas available in the community, urban-relevant green space, acreage available for cultivation or stewardship.
- Local food and growing: farmers markets, farm stands, community gardens, proximity to community gardens, growers, food producers, food hubs.
- Producers and education: local producers willing to be contacted, programs and educational offerings, workshops, repair capacity, maker spaces.
- Community assets: community hubs, stewardship sites, libraries of things, repair cafes, mutual aid nodes.
- Property and parcel signals: lawfully sourced property indicators only, with explicit license and provenance.

External micro feeds tracked for ingestion include the USDA Local Food Directories farmers market dataset (`https://www.ams.usda.gov/local-food-directories/farmersmarkets`), equivalent regional registries, and future source-backed agricultural field boundary summaries such as Fields of The World. Property listings are not scraped; only lawful, terms-reviewed sources are eligible.

## Property Boundaries And Parcel Intelligence

Property boundaries are a legal-geometry translation problem, not just another map layer. vmesh should treat parcels as first-class micro objects that can be inspected inside the mesh, while making clear that the H3 mesh is not itself a parcel boundary and vmesh does not establish legal boundaries.

Parcel and boundary records may originate from:

- County or municipal open parcel GIS datasets.
- Tax assessor or cadastral datasets with reviewed terms.
- Survey plats, deeds, title records, or metes-and-bounds legal descriptions.
- User-uploaded documents in a future human-reviewed workflow.
- Manual corrections or local observations attached by users.

Future parcel intelligence should support:

- Raw parcel polygon geometry.
- Source deed, survey, plat, or parcel dataset reference.
- Parsed metes-and-bounds calls, including bearings, distances, monuments, roads, rivers, adjoining owners, section lines, and closure calls.
- Coordinate reference system metadata, including WGS84, State Plane, local survey grids, PLSS, county GIS projections, older datums, and transformation history.
- H3 relationships: centroid hex, dominant hex, all touched hexes, overlap area by hex, and parent/child tier relationships.
- Source quality and uncertainty: closure error, extraction review state, CRS review state, source authority, and review status.
- Human review state: draft, reviewed, corrected, rejected, superseded, or official-source matched.

Parcel boundaries must expose provenance and limitations in the UI. A generated or parsed deed polygon should never be presented as authoritative unless it comes from an official source and the product clearly labels that source. AI-assisted deed extraction can draft geometry, but it must remain reviewable, correctable, and non-authoritative by default.

Product implication: the mesh remains the atlas, while parcels become inspectable local objects inside the mesh. A user should be able to click a U5 or U8 hex and see relevant properties, boundary candidates, land-use hints, deed-derived geometry, market/local data, and uncertainty together.

## User-Added Data Layer

Users can attach knowledge to any hex they care about. This layer captures the lived, ground-truth view that no provider sees.

Canonical user-added record types:

- Observations: notes, photos in a future version, conditions seen on the ground.
- Skills file: repair, growing, healthcare, construction, software, organizing, languages, and other capacities a user wants to make visible.
- "Who has what" inventory: tools, materials, surplus, capacity, vehicles, land, water access, or other resources the user is willing to share or trade.
- Community rolodex: optional local contact or organization references, with privacy controls and consent.
- Needs and offers: local requests, offers, barter possibilities, recovery capacity, and mutual-aid signals.
- Property notes: private-local property observations, parcel corrections, boundary questions, and source links.
- Corrections: user-submitted fixes to provider data, labels, locations, or assumptions.

User-added data defaults to private-local. Future sharing requires explicit visibility, ownership, moderation, retention, deletion, and export rules.

## Resilient Communications Scope

vmesh should become useful when conventional connectivity is degraded. The long-term communications posture is offline-first: the atlas, selected local tiles, H3 summaries, user-added records, checklists, and outbound messages should remain usable without the public internet.

Reticulum is the primary resilient communications stack for vmesh. The product should treat Reticulum/RNS as the main disruption-tolerant application network and use LXMF for encrypted, queued, delay-tolerant messaging where appropriate. vmesh should not implement Reticulum directly in the browser; it should connect to a local bridge service that owns the Reticulum identity, RNS configuration, LXMF router, peer discovery, delivery receipts, and interface status.

Meshtastic remains strategically important, but as a bridge into existing LoRa mesh networks rather than the core vmesh network substrate. A Meshtastic bridge should let vmesh exchange constrained emergency packets with Meshtastic users and gateway nodes while preserving Reticulum as the main stack for richer resilient routing, store-and-forward behavior, and application-level identity.

Disaster-mode message types should be deliberately small:

- Check-ins and welfare status.
- H3 cell status updates.
- Hazard observations.
- Needs and offers.
- Supply/resource reports.
- Relay notes and acknowledgements.
- Position beacons with explicit precision controls.

The UI should expose comms state clearly: offline, local bridge connected, Reticulum active, Meshtastic bridge active, queued, sent, delivered, acknowledged, expired, or failed. Every received field report should be treated as user/provenance data, not authoritative truth.

## Deferred Analysis Layer

V1 is a data aggregation and display atlas. It shows source-backed context, local records, package status, provider status, provenance, freshness, and limitations. It does not produce automated conclusions or ranked climate, hazard, or resilience-style outputs.

Any future analysis layer must be reintroduced deliberately after provenance, calibration, and trust boundaries are stronger. Until then, climate, weather, water, energy, biodiversity, infrastructure, hazard, and local asset data should remain inspectable source context rather than an app-generated judgment.

## Product Principles

- The mesh is the product spine. Panels, charts, and workflows should explain or enrich the selected hex.
- The visible globe is center stage. The hex grid is optional analytical UI, not decorative wallpaper.
- Distant globe mode should be a real 3D atlas object, not a flat map clipped into a circle. Source-backed inspection still belongs to MapLibre at close zoom.
- Source transparency should be one click away, with a dedicated drawer explaining active providers, provenance, licensing, and limitations without crowding the globe.
- The first screen should feel like a light geospatial cockpit, not a marketing landing page.
- Source, local, parcel, and user-added records must be visibly distinct.
- User-added data must be first-class, but clearly labeled by provenance and visibility.
- Property boundaries require source, CRS, and review status.
- The UI should be dense, calm, and operational rather than decorative.
- Open-source geospatial foundations are preferred for the MVP.
- Real-world claims must expose source, timestamp, and limitations.

## Downstream App Context

vmesh should remain the atlas and operating mesh: it indexes place-based source and local records, exposes provenance, and helps users or other apps decide what data is available for a place. Downstream apps can turn a selected place into simulations, reports, agent workflows, local checklists, or editor experiences without owning provider-specific map logic.

Cross-app insights belong in `docs/CROSS_REPO_INSIGHTS.md`. Public-safe learnings can move between repos as docs, schemas, fixtures, provider notes, and issue links. Private planning, secrets, exact private addresses, and terms-uncleared property data must not move between repos.

## Decision Matrix

| Decision         | Default                   | Reason                                                                        |
| ---------------- | ------------------------- | ----------------------------------------------------------------------------- |
| Rendering engine | MapLibre plus deck.gl     | Gives globe/terrain control and synchronized source layers.                   |
| Spatial index    | H3                        | Fits regional aggregation, neighbor calculations, and scalable hex context.   |
| Parcel geometry  | Native polygons plus H3   | Preserves legal geometry while attaching parcel context to mesh cells.        |
| State model      | Zustand                   | Keeps WebGL interactions and React panels tied to one small store.            |
| Data posture     | Prepopulated + user-added | Supports both app-driven atlas data and local knowledge capture.              |
| Deployment       | Vercel plus GitHub        | Fast previews and simple production flow.                                     |
| Terrain          | Open raster-dem tiles     | Avoids early paid provider lock-in.                                           |
| Tile delivery    | PMTiles over CDN/R2       | Static, cacheable, open-source-friendly delivery for basemaps and overlays.   |
| Spatial backend  | PostgreSQL/PostGIS        | Preserves source geometries, H3 indexes, provenance, and future graph edges.  |
| Resilient comms  | Reticulum primary         | Gives vmesh a disruption-tolerant app network; Meshtastic bridges LoRa users. |

## MVP Phases

1. Workspace baseline and implementation prompt approval.
2. Typed mock H3 mesh model for source, local, parcel, and user-added records.
3. Next.js shell with fixed dashboard layout.
4. MapLibre globe, terrain source, and deck.gl H3 overlay.
5. Selected hex panel showing the data package, layer availability, local assets, user-added data, parcel context, and provenance.
6. User-added data draft flow with local/mock persistence only.
7. Open parcel data research and model design for lawful parcel ingestion.
8. Reticulum-first resilient comms design, with a Meshtastic bridge plan.
9. Interaction QA, accessibility pass, and visual verification.

## Current Milestone Additions

The dashboard now includes milestone foundations for local food network data, privacy-safe property signals, and an interactive local hub playbook. Climate, hazard, solar, and similar analysis summaries are deferred from the visible workflow.

Terrain uses Mapterhorn PMTiles as the primary open terrain path and Mapzen/Joerd Terrarium as the no-token fallback. Browser terrain is MapLibre `raster-dem`; contours are represented as a derived/preprocessed layer contract, not fake live browser extraction. A dedicated terrain overlay panel lets users toggle the DEM overlay and switch between map-ready terrain providers at runtime. The selected DEM source feeds both globe terrain and a subtle hillshade layer while leaving H3, source layers, imagery, and selected-cell interactions clickable above it.

Basemaps now have a separate provider registry from terrain. The open-source default stays token-free and nonblank, while Protomaps PMTiles, OpenFreeMap, custom MapLibre styles, and offline shell behavior are modeled as provider options.

A source/provenance drawer now exposes the active basemap, terrain, imagery, selected H3 evidence, local mock boundaries, provider statuses, and safety gates. This is the primary UI affordance for distinguishing live, cached, mock, fallback, future-provider, token-gated, and preprocessing-only data.

Analysis package data for weather, flood, fire, solar, and climate trend is paused in the visible app. Open-Meteo, NASA POWER, ERA5/CDS, FIRMS, and terrain-derived flood remain provider-boundary code paths until a later scope reintroduces them deliberately.

Imagery now has a Sentinel-2/SEN2SR manifest-backed scaffold. The UI can display optional raster imagery and H3-derived image summary proxies, while the actual Sentinel discovery, cloud mask validation, SEN2SR processing, COG production, and PMTiles generation are documented as offline/server pipeline work.

The H3 product tiers remain strict: U3 is macro/global, U5 is regional/local planning, and U8 is focused detail only inside a selected U5 parent. vmesh must not generate global U8 coverage.

## Out Of Scope For First Version

- Real backend persistence.
- Authentication and multi-user workspaces.
- Live paid data ingestion.
- Scraping property listings without a lawful source and terms review.
- AI-assisted deed upload or metes-and-bounds parsing in production.
- Presenting generated parcel boundaries as authoritative legal boundaries.
- Public publishing of user-added records.
- Live Reticulum or Meshtastic transmission from the browser.
- Emergency-service dispatch, official incident command, or guaranteed delivery claims.
- Production risk certification.
- Billing or pricing flows.
- Formal regulatory reporting.

## Success Checks

- First meaningful render under 3 seconds on a modern desktop.
- Smooth map interaction under normal H3 mock-data volume.
- Selected hex changes reflected in UI within one animation frame.
- User can distinguish source data, local data, parcel context, and their own added records.
- Zero secrets, raw PII, or unlicensed listing data in committed files.
- Parcel and property records expose provenance and legal-status limitations.
- All implementation slices covered by lint, tests, and build checks.

## Cost And Pricing Posture

The MVP should minimize paid geospatial dependencies. Any future paid tile, property, parcel, market, climate, analytics, or model provider must include cost telemetry, rate limits, data provenance, and documented fallback behavior.

## Privacy And Product Authority

vmesh can help users inspect place-based source context, but it is not an authoritative certification, title, survey, or property-boundary system. Future real data must include provenance, timestamp, licensing, retention rules, and clear boundaries on decision support versus official assessment.

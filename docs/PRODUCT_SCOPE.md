# Product Scope

## Product Objective

vmesh is an atlas of antifragility: a spatial operating surface where every H3 hex can combine macro resilience data with micro local intelligence and user-added context.

The product should help users see not just where a place is fragile, but where it has adaptive capacity, redundancy, local abundance, practical opportunity, and recoverability.

## Target User And Promise

Primary users are geospatial analysts, climate resilience planners, land and property researchers, regenerative agriculture operators, infrastructure strategists, community organizers, and people trying to understand a place through both high-level systems data and ground-level assets.

The core promise: select any hex and quickly understand its resilience profile, local opportunities, risks, property context, and human-scale assets. Newcomers should be able to enter through a guided agent that learns their interests, location, and skills, then assembles a personalized view of the mesh on their behalf.

## Core Mesh Model

Each hex is a context cell that combines three concentric layers of signal: macro environment, micro community, and user-added context. The product spine is the movement from micro to macro and back: every personal observation should ladder up to a regional signal, and every regional signal should ladder back down to "what does this mean for me on my hex?"

A hex can hold:

- Macro data: climate, weather, water, energy, biodiversity, land use, infrastructure, hazard, and economic signals.
- Micro data: local food, growing capacity, community assets, property signals, parcel context, producers, programs, and observations.
- User-added data: notes, skills, what the user has, what they need, observations, corrections, links, and assessments.
- Derived scores: a basic resilience or antifragility score plus component sub-scores for climate exposure, water security, food access, energy posture, community capacity, redundancy, and confidence.

The H3 mesh is the atlas structure, not the legal boundary system. Parcels, deeds, survey descriptions, buildings, assets, and local records are objects that attach to one or more hexes.

The H3 mesh is also not required to be visible by default. In the product experience it functions as a spatial database index and knowledge-bucketing system. The interface should reveal cells only when that helps the user inspect a selected place, compare an analytical layer, attach local knowledge, or understand provenance.

## Macro Data Layer

Macro signals describe the regional environment around a hex. V1 models these as mock data; later phases ingest real provider data through typed provider registries with provenance, timestamp, license, and confidence on every record.

Canonical macro signals:

- Climate and weather: temperature, natural rainfall, seasonal trend, drought indicator.
- Water: catchment area, water stress, surface water proximity, watershed identity.
- Soil and land: soil health, land cover, bioregion classification, green space area.
- Energy: grid resilience, solar access, terrain/aspect-aware solar potential, shading context, wind exposure, fuel availability, biomass capacity.
- Hazard and risk: fire risk, flood risk, air quality risk, infrastructure risk.
- Biodiversity: habitat indicators and species pressure where licensed sources exist.
- Macro economic and infrastructure: transport access, basic infrastructure presence.

The next macro milestone adds a no-secret Open-Meteo selected-centroid weather adapter, provider boundaries for NASA POWER solar/meteo, ERA5/Copernicus preprocessing, NASA FIRMS active fire, and terrain-derived flood scaffolding. These layers must remain clearly labeled as live, cached, mock, derived, or future-provider data.

Flood and fire signals are decision-support context, not authoritative hazard maps or emergency warnings. Solar signals are practical hub-planning indicators, not bankable engineering estimates.

The current macro-atlas phase makes the macro layer catalog explicit. Layer families are Terrain, Climate, Hazard, Solar, Vegetation, and Imagery. The user can toggle and inspect these as data-intelligence layers, but vmesh should not add final recommendations or authoritative analysis yet. Each layer carries map readiness, preprocessing requirements, source type, confidence, freshness, license, and limitations.

Production macro data is promotion-gated, not asserted by convention. A core production package must include reviewed, non-fixture H3 summaries for Weather, Rainfall, Climate Trend, Flood/Lowland, Fire Weather, and Solar Potential. A full-atlas production package must additionally include Terrain and derived topography, Vegetation/Landcover, and Satellite Imagery products. Fixtures and mock fallbacks can prove UI and package behavior, but they must never be labeled as production macro intelligence.

Solar and wind should become first-class climate/topography products. For each selected H3 cell or local AOI, vmesh should be able to show:

- Sun path and seasonal solar sectors.
- Slope/aspect-aware solar access from terrain.
- Terrain-horizon shading from DEM/DTM.
- Optional DSM/canopy/building shading only when a source-backed surface model is available.
- Cloud/irradiance context from no-secret or preprocessed providers.
- Wind roses from observed, forecast, or reanalysis wind speed/direction distributions.
- Permaculture-style sector maps showing directional forces such as sun, prevailing wind, cold wind/frost, rain/stormwater flow, fire approach, flood/drainage, wildlife/access/noise/pollution where data exists.

These layers should be visually beautiful and inspectable, but not prescriptive. vmesh can show solar access, wind exposure, and sector forces; it should not claim final system sizing, financial PV yield, legal design advice, or official hazard assessment without a reviewed provider pipeline.

## Open Map And Climate Data Funnel

vmesh should act as a funnel for open geospatial sources rather than binding the globe to one provider. The product should keep basemap, terrain, imagery, open map features, climate signals, and H3 summaries separate so each source can be swapped, cached, licensed, and downgraded independently.

Open map feature sources are now modeled through a catalog that includes OpenStreetMap raster/vector paths, OpenFreeMap, Protomaps PMTiles, Overture Maps GeoParquet, OSM PBF extracts, Natural Earth, OpenAddresses, and future LiDAR/EPT sidecar references. Public raster tiles are visual context only; source-backed roads, buildings, places, addresses, land use, water, and admin records should come from preprocessing paths such as PostGIS, PMTiles, or H3 summaries.

Open climate source optionality is modeled separately from the visible map. Open-Meteo remains the selected-cell live prototype. NASA POWER, NOAA GFS open forecast grids, ERA5/CDS, NASA FIRMS, terrain-derived flood, and future H3 weather graph models are provider boundaries for server/local-hub preprocessing. The browser should request only selected-cell summaries or cached local bundles, never global climate grids.

Agricultural field boundaries are a high-value bridge between macro land intelligence and future micro food-network work. Fields of The World should be treated as a future source-backed field-boundary provider: PMTiles for visual inspection, GeoParquet/PostGIS for source geometry, Zarr/COG products for model/raster context, and H3 summaries for field density, field size distribution, agricultural fragmentation, crop/land condition joins, and local food-system planning.

The source-broker pattern is now a generic package-service discipline. vmesh distinguishes renderer-ready sources from package-ready sources, rejected sources, future provider boundaries, and preprocessing-only datasets before anything reaches the globe, H3 summaries, or downstream app manifests.

## Geospatial Package Service

vmesh should be useful to other apps as a reusable geospatial intelligence and packaging layer. It should answer:

- What data sources cover this coordinate, H3 cell, or AOI?
- Which sources are open, paid, cached, blocked, token-gated, license-gated, or missing?
- Which source should be used for terrain, imagery, roads, buildings, water, vegetation, parcels, climate, hydrology, contours, landcover, and field boundaries?
- Can vmesh produce app-ready artifacts such as PMTiles, vector tiles, raster tiles, COGs, GeoParquet extracts, H3 summaries, and package manifests?
- Can downstream apps consume a clean package manifest without hard-coding provider logic?

The first service boundary lives in `lib/geospatialPackage/` and the API routes under `/api/geospatial-package/*`. It is source-honest planning, not a heavy data worker. It plans packages, ranks providers, exposes source probes, emits artifact/cache contracts, and keeps raw downloads or generated caches outside Git.

## Production Open Map Stack Direction

A strong production deployment pattern for vmesh is an open MapLibre stack with PMTiles delivery through a CDN or object store such as Cloudflare R2, using open base data from the OSM, OpenFreeMap, Protomaps, Nextzen-style, Natural Earth, and Overture ecosystems where licensing permits.

This is relevant because it separates the visible atlas from the intelligence layer:

- MapLibre GL JS remains the open-source browser renderer.
- PMTiles packages carry basemaps, contours, terrain derivatives, Sentinel/SEN2SR imagery, landcover, and H3 summary overlays without requiring a tile server for every layer.
- Cloudflare/R2/CDN delivery can serve static tile archives cheaply and can be mirrored into local hub caches.
- PostgreSQL/PostGIS should become the canonical backend for source-backed geometries, H3 indexes, provenance, user records, package manifests, and future knowledge-graph edges.
- GraphQL/Apollo-style APIs may become useful when clients need rich cross-layer queries, but simple typed API routes are enough until the query surface becomes complex.

The React-inside-Vue/Nuxt pattern seen in some geospatial products is not a target for vmesh. vmesh should stay Next.js/React-first and borrow only the modular frontend idea: map renderer, layer controls, provenance drawers, benchmark views, and user workflows should remain separable modules.

## Earth Observation Imagery Layer

Satellite imagery is a raster product that can enrich macro understanding, while H3 stores derived summaries and provenance. vmesh should support Sentinel-2 L2A discovery through STAC, cloud-free scene filtering, and offline/server-side SEN2SR super-resolution processing as a future pipeline.

V1 UI work may display a manifest-backed Sentinel preview layer, acquisition date, cloud-free confidence, and derived H3 summaries such as NDVI, NDWI, NBR, vegetation cover proxy, bare soil proxy, and water presence proxy.

Important boundaries:

- Do not run SEN2SR, PyTorch, COG processing, or whole-scene downloads in the browser.
- Do not present AI-enhanced imagery as higher-truth imagery.
- Do not use super-resolution imagery for legal boundaries, emergency certification, or exact infrastructure claims.
- Mapbox satellite is optional and token-gated; it is not the public open-source default.
- NOAA CUDEM is coastal/topobathymetric terrain data, not global optical imagery.

The current upscaler reference is ESAOpenSR/SEN2SR. vmesh should follow a sidecar package approach: Sentinel-2 L2A RGBN at `10 m`, SEN2SRLite RGBN `x4`, derived display output at `2.5 m`, cloud-qualified AOIs, and `truthStatus: imagery-inferred-context`. This improves the visual/material layer and H3-derived vegetation/water/bare-soil summaries only; it does not create measured 2.5 m orthophoto truth.

Fields of The World adds a field-boundary direction to this layer: Sentinel-derived agricultural field predictions can become optional map and H3 summary context when the source, model version, year, confidence, geometry processing, and license are preserved. These predicted polygons should not be treated as cadastral parcels, legal property boundaries, or proof of ownership.

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
- Confidence and uncertainty: closure error, extraction confidence, CRS confidence, source authority, and review status.
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

## Resilience Score

V1 uses a mock derived antifragility score built from macro pillar values. Future scoring should remain explainable and decomposable.

Score inputs should include:

- Climate and weather exposure.
- Water availability and stress.
- Energy and infrastructure posture.
- Food, growing, and local production capacity.
- Biodiversity and land health.
- Community assets and redundancy.
- Hazard and risk.
- Source confidence.

Scores are decision-support signals, not official risk certification. Every score should expose component values, source provenance, update time, and confidence.

## Product Principles

- The mesh is the product spine. Panels, charts, and workflows should explain or enrich the selected hex.
- The visible globe is center stage. The hex grid is optional analytical UI, not decorative wallpaper.
- Source transparency should be one click away, with a dedicated drawer explaining active providers, provenance, confidence, licensing, and limitations without crowding the globe.
- The first screen should feel like a light geospatial cockpit, not a marketing landing page.
- Macro, micro, parcel, and user-added signals must be visibly distinct.
- User-added data must be first-class, but clearly labeled by provenance and visibility.
- Property boundaries require source, CRS, confidence, and review status.
- The UI should be dense, calm, and operational rather than decorative.
- Open-source geospatial foundations are preferred for the MVP.
- Real-world claims must expose source, timestamp, confidence, and limitations.

## Downstream App Context

vmesh should remain the atlas and operating mesh: it indexes place-based macro and micro intelligence, exposes provenance, and helps users or other apps decide where and how to act. Downstream apps can turn a selected place into simulations, reports, agent workflows, local checklists, or editor experiences without owning provider-specific map logic.

Cross-app insights belong in `docs/CROSS_REPO_INSIGHTS.md`. Public-safe learnings can move between repos as docs, schemas, fixtures, provider notes, and issue links. Private planning, secrets, exact private addresses, and terms-uncleared property data must not move between repos.

## Decision Matrix

| Decision         | Default                   | Reason                                                                        |
| ---------------- | ------------------------- | ----------------------------------------------------------------------------- |
| Rendering engine | MapLibre plus deck.gl     | Gives globe/terrain control and synchronized analytical layers.               |
| Spatial index    | H3                        | Fits regional aggregation, neighbor calculations, and scalable hex analytics. |
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
2. Typed mock H3 mesh model for macro, micro, parcel, and user-added records.
3. Next.js shell with fixed dashboard layout.
4. MapLibre globe, terrain source, and deck.gl H3 overlay.
5. Selected hex panel showing antifragility, macro pillars, micro assets, user-added data, parcel context, and provenance.
6. User-added data draft flow with local/mock persistence only.
7. Open parcel data research and model design for lawful parcel ingestion.
8. Reticulum-first resilient comms design, with a Meshtastic bridge plan.
9. Interaction QA, accessibility pass, and visual verification.

## Current Milestone Additions

The dashboard now includes milestone foundations for macro climate/hazard/solar summaries, local food network microdata, privacy-safe property signals, and an interactive local hub playbook. These remain mock/provider-boundary data in V1 and are clearly separated from live ingestion.

Terrain uses Mapterhorn PMTiles as the primary open terrain path and Mapzen/Joerd Terrarium as the no-token fallback. Browser terrain is MapLibre `raster-dem`; contours are represented as a derived/preprocessed layer contract, not fake live browser extraction. A dedicated terrain overlay panel lets users toggle the DEM overlay and switch between map-ready terrain providers at runtime. The selected DEM source feeds both globe terrain and a subtle hillshade layer while leaving H3, macro, imagery, and selected-cell interactions clickable above it.

Basemaps now have a separate provider registry from terrain. The open-source default stays token-free and nonblank, while Protomaps PMTiles, OpenFreeMap, custom MapLibre styles, and offline shell behavior are modeled as provider options.

A source/provenance drawer now exposes the active basemap, terrain, macro, imagery, selected H3 evidence, micro mock boundaries, provider statuses, and safety gates. This is the primary UI affordance for distinguishing live, cached, mock, fallback, future-provider, token-gated, and preprocessing-only data.

Macro data now has an opt-in layer model for weather, flood, fire, solar, and climate trend. The selected weather cell can attempt a no-secret Open-Meteo point forecast and fall back to deterministic mock summaries. NASA POWER, ERA5/CDS, FIRMS, and terrain-derived flood remain provider boundaries until ingestion, licensing, caching, and confidence handling are reviewed.

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

## Success Metrics

- First meaningful render under 3 seconds on a modern desktop.
- Smooth map interaction under normal H3 mock-data volume.
- Selected hex changes reflected in UI within one animation frame.
- User can distinguish macro data, micro data, parcel context, and their own added records.
- Zero secrets, raw PII, or unlicensed listing data in committed files.
- Parcel and property records expose provenance, confidence, and legal-status limitations.
- All implementation slices covered by lint, tests, and build checks.

## Cost And Pricing Posture

The MVP should minimize paid geospatial dependencies. Any future paid tile, property, parcel, market, climate, analytics, or model provider must include cost telemetry, rate limits, data provenance, and documented fallback behavior.

## Privacy And Product Authority

vmesh can help users reason about place-based antifragility, but it is not an authoritative risk certification, title, survey, or property-boundary system. Future real data must include provenance, timestamp, confidence, licensing, retention rules, and clear boundaries on decision support versus official assessment.

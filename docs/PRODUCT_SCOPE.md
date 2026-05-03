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

## Macro Data Layer

Macro signals describe the regional environment around a hex. V1 models these as mock data; later phases ingest real provider data through typed provider registries with provenance, timestamp, license, and confidence on every record.

Canonical macro signals:

- Climate and weather: temperature, natural rainfall, seasonal trend, drought indicator.
- Water: catchment area, water stress, surface water proximity, watershed identity.
- Soil and land: soil health, land cover, bioregion classification, green space area.
- Energy: grid resilience, solar potential, fuel availability, biomass capacity.
- Hazard and risk: fire risk, flood risk, air quality risk, infrastructure risk.
- Biodiversity: habitat indicators and species pressure where licensed sources exist.
- Macro economic and infrastructure: transport access, basic infrastructure presence.

## Micro Data Layer

Micro signals describe the human-scale, walkable, person-scale context inside a hex. They are what makes a place actually livable, productive, and recoverable.

Canonical micro signals:

- Land use: parcel-level land use category, growing areas available in the community, urban-relevant green space, acreage available for cultivation or stewardship.
- Local food and growing: farmers markets, farm stands, community gardens, proximity to community gardens, growers, food producers, food hubs.
- Producers and education: local producers willing to be contacted, programs and educational offerings, workshops, repair capacity, maker spaces.
- Community assets: community hubs, stewardship sites, libraries of things, repair cafes, mutual aid nodes.
- Property and parcel signals: lawfully sourced property indicators only, with explicit license and provenance.

External micro feeds tracked for ingestion include the USDA Local Food Directories farmers market dataset (`https://www.ams.usda.gov/local-food-directories/farmersmarkets`) and equivalent regional registries. Property listings are not scraped; only lawful, terms-reviewed sources are eligible.

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
- The first screen should feel like a light geospatial cockpit, not a marketing landing page.
- Macro, micro, parcel, and user-added signals must be visibly distinct.
- User-added data must be first-class, but clearly labeled by provenance and visibility.
- Property boundaries require source, CRS, confidence, and review status.
- The UI should be dense, calm, and operational rather than decorative.
- Open-source geospatial foundations are preferred for the MVP.
- Real-world claims must expose source, timestamp, confidence, and limitations.

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

You are Codex acting as a principal geospatial systems engineer and frontend architect.

Repo: vmesh, "Atlas of Antifragility".
Objective: take the current app to the next level without starting from scratch. Preserve the existing Next.js App Router, React, TypeScript, Zustand, MapLibre, deck.gl, H3, PMTiles, Tailwind, and docs workflow.

Before editing:

1. Read AGENTS.md.
2. Read docs/PRODUCT_SCOPE.md, docs/DESIGN_DIRECTION.md, docs/SYSTEM_DESIGN.md, docs/RESEARCH.md, docs/SECURITY_PRIVACY.md, docs/OPERATIONS.md, docs/TESTING.md.
3. Inspect current app/components/lib/store/data/tests structure.
4. Keep changes scoped, typed, and production-grade. Do not commit secrets, paid API keys, personal data, scraped listings, or private planning files.

## Product Goal

Build vmesh into a disaster-resilience geospatial operating system with:

- a visible globe/map viewer using MapLibre;
- real terrain plumbing from Mapterhorn and Mapzen/Joerd;
- basic terrain contours and hillshade;
- H3 mesh overlays at macro and local scale;
- macro climate/resilience layers focused on weather, flood risk, fire risk, and solar potential;
- microdata layers focused on local food networks and properties available for sale;
- an interactive playbook for building a local resilience hub;
- offline/local hub deployment foundations;
- Reticulum-first local network architecture, with a Meshtastic bridge for LoRa mesh access;
- local LLM access over the hub network where possible.

## Priority Order

1. Keep the screenshot-faithful vmesh UI intact: sidebar, top search, globe/map canvas, right selected-hex panel, bottom analytics strip, footer telemetry.
2. Make the central viewer visibly useful: globe/map must not be blank, terrain status must be visible, mesh must be visible.
3. Add provider-agnostic terrain and contour foundations.
4. Add macro climate/hazard/solar data model and mock-to-real provider boundary.
5. Add microdata model for food networks and properties.
6. Add interactive hub playbook.
7. Add Reticulum/Meshtastic/local-LLM architecture docs and UI affordances.
8. Add tests and verification.

## Terrain + Contour Work

Implement or improve the terrain provider system around `lib/terrainSources.ts`.

Support these terrain providers:

- `mapterhorn-pmtiles`
  - URL: `https://download.mapterhorn.com/planet.pmtiles`
  - PMTiles protocol via `pmtiles`
  - Terrarium/RGB elevation where applicable
  - status-aware, license-aware, fallback-safe

- `mapzen-joerd-terrarium`
  - URL template: `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`
  - MapLibre `raster-dem`
  - fallback no-token source

Add terrain source status to Zustand:
`idle | loading | active | fallback | unavailable | error`.

Add normalized provider metadata:
`id`, `label`, `kind`, `encoding`, `tileSize`, `maxzoom`, `attribution`, `license`, `requiresApiKey`, `coverage`, `resolution`, `status`, `sourceUrl`, `notes`.

Add basic contour layer support:

- Treat contours as a derived layer from DEM, not as raw source truth.
- If a maintained MapLibre-compatible contour plugin/source is already present or easy to add, use it.
- Otherwise implement a typed contour provider abstraction and a visible placeholder/fallback contour layer that can later be backed by precomputed contour PMTiles.
- Do not fake live contour extraction if it is not actually implemented.
- Add docs explaining that browser MapLibre terrain uses raster-dem, while production contours may require preprocessing DEM into vector contour tiles.

## Map Viewer

Improve `components/Map/TerrainGlobe.tsx` and related components.

Requirements:

- MapLibre v4 viewer with globe projection where suitable.
- Light operational map style by default.
- Real terrain source normalization from provider registry.
- Hillshade/terrain visual layer where supported.
- deck.gl `MapboxOverlay` stays synchronized with MapLibre.
- H3 mesh remains pickable.
- Search should fly to typed locations like Google Earth style.
- On source failure, show nonblank fallback globe/surface and a clear status message.
- Footer must show active terrain provider, terrain status, contour status, H3 tier, visible hex count, and data freshness.

## H3 + Data Model

Keep Zustand as the single source of truth.

Ensure these typed concepts exist or are improved:

- `MeshTier = "U3" | "U5" | "U8"`
- U3 = macro/global summaries
- U5 = regional/local planning summaries
- U8 = focused detail only inside selected/focused U5 parent
- `VmeshHexRecord`
- `MacroClimateSummary`
- `HazardRiskSummary`
- `SolarPotentialSummary`
- `MicroFoodNetworkSummary`
- `PropertySignalSummary`
- `HubPlaybookState`
- `NetworkNodeStatus`

Do not generate global U8. U8 is only local/focused/capped.

## Macro Layers

Implement typed layer definitions and mock-to-real provider boundaries for:

1. Weather
   - current conditions, forecast summary, heat/cold stress, wind, rainfall
   - provider interface only; no paid APIs or secrets

2. Flood risk
   - terrain/HAND-ready architecture
   - flood exposure score per H3
   - provenance fields

3. Fire risk
   - vegetation/dryness/wind/topography inputs
   - risk class and confidence

4. Solar potential
   - slope/aspect/cloudiness/irradiance-ready model
   - score per H3 and practical hub-use interpretation

Use mock data where live ingestion is not present, but mark it clearly as mock.

## Micro Layers

Implement typed models, UI cards, and mock records for:

1. Local food networks
   - farms, growers, farmers markets, food hubs, community gardens, storage, distribution points
   - availability, seasonality, contact/provenance fields
   - privacy-safe defaults

2. Properties available for sale
   - model only and mock data only
   - no scraping in V1
   - fields: listing type, approximate location/H3, price band, acreage band, water/soil/solar/access notes, source/provenance, updated timestamp
   - avoid exact private addresses unless user-added and private-local

Add UI toggles for macro/micro layers and ensure selected hex panel summarizes both.

## Hub Playbook

Add an interactive "Build A Hub" playbook section/panel.

It should guide a user through:

- choose a location/hex;
- assess water, food, power, comms, access, shelter, tools, governance;
- identify local assets and gaps;
- create a phased action plan;
- attach notes/tasks to the selected H3 cell;
- export or save a local hub readiness checklist.

Keep this offline-friendly and local-first. Use mock persistence/local state unless repo already has a persistence pattern.

## Local Hub / Radio / LLM Architecture

Add docs and lightweight UI/status scaffolding for disaster mode.

Architecture:

- Reticulum is the primary resilient networking stack.
- Meshtastic is a bridge to access LoRa mesh networks.
- Local hub node can host vmesh locally on LAN/offline hardware.
- Local LLM should be reachable through a local API on the hub node.
- Browser app should talk to a local gateway service, not directly to radio hardware.

Add typed gateway concepts:

- `ReticulumGatewayStatus`
- `MeshtasticBridgeStatus`
- `LocalLlmStatus`
- `HubNodeStatus`
- message envelope with H3 cell, timestamp, priority, payload type, signature/provenance placeholder

Do not implement real radio transmission unless safe libraries and local hardware are present. Add adapter interfaces, mock gateway, docs, and UI status.

## Docs

Update:

- docs/PRODUCT_SCOPE.md
- docs/SYSTEM_DESIGN.md
- docs/RESEARCH.md
- docs/OPERATIONS.md
- docs/SECURITY_PRIVACY.md
- docs/TESTING.md
- docs/USER_GUIDE.md

Docs must clearly explain:

- Mapterhorn/Mapzen terrain role;
- contour derivation/preprocessing path;
- macro vs micro H3 data;
- no global U8;
- no paid API/secrets;
- no listing scraping in V1;
- Reticulum-first hub network;
- Meshtastic bridge;
- local LLM over hub gateway;
- offline/local hub deployment assumptions.

## Tests

Add or update tests for:

- terrain provider normalization;
- terrain fallback order;
- provider status transitions;
- contour layer config/status;
- H3 tier mapping and capped U8 generation;
- macro climate/hazard/solar scoring helpers;
- food network/property mock records;
- playbook reducer/state actions;
- hub gateway mock status;
- privacy-safe property fields.

## Verification

Run:

- npm run format:check
- npm run lint
- npm test
- npm run build
- npm run agent-ready:check
- npm run public-workflow:check
- npm run privacy:check

Then start:

- npm run dev

Browser verify:

- app loads on localhost;
- central globe/map is visible;
- terrain source status is visible;
- mesh is visible;
- terrain fallback is nonblank if remote tiles fail;
- search flies to a location;
- macro/micro toggles work;
- selected hex updates;
- playbook is interactive;
- hub network status panel shows Reticulum/Meshtastic/local LLM mock statuses;
- no body scroll;
- no uncaught console errors.

Final response:

- summarize changed files and behavior;
- report commands run and failures honestly;
- include the localhost URL if dev server is running.

# System Design

## Snapshot

Date: 2026-04-30

V1 implements the screenshot-directed vmesh dashboard with a fixed Next.js app shell, MapLibre globe surface, deck.gl H3 mesh overlay, Zustand state, typed mock data, local/private user records, Recharts analytics, and provider-agnostic open terrain source foundations.

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
  map controls and mesh legend
  macro-to-micro scale control
  local user data panel

State
  Zustand vmesh store
  selected/hovered hex state
  camera/view state
  active layer filters
  U3/U5/U8 mesh tier state
  map and terrain provider status
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

MapLibre owns the basemap, terrain, and camera. deck.gl attaches through `MapboxOverlay` so H3 layer rendering follows the map camera. Zustand holds the selected H3 cell, hover metadata, mesh tier, active layers, map status, terrain status, prepopulated hex summaries, and local draft records. React panels subscribe to Zustand slices rather than reading directly from map instances.

App-pulled datasets should enter through typed provider adapters. User-added data enters through explicit local state actions with provenance, confidence, timestamp, and private-local visibility.

For backend evolution, H3 should not be the knowledge graph itself. It should be the spatial index that anchors graph records. The graph should model entities, observations, sources, and relationships, then attach those records to one or more H3 cells for aggregation, filtering, permissions, offline bundles, and local retrieval.

Resilient communications should enter through a local bridge, not directly through browser-only code. The browser app sends small structured disaster messages to the local bridge over a localhost HTTP/WebSocket API. The bridge owns Reticulum identity, RNS daemon/process configuration, LXMF routing, peer discovery, delivery receipts, and optional Meshtastic bridge access. Received mesh reports are normalized into typed vmesh records with source, timestamp, confidence, and delivery metadata before they touch the UI.

## Public Contracts

- `MeshTier`: `U3`, `U5`, and `U8`, mapped to H3 resolutions 3, 5, and 8.
- `TerrainProviderConfig`: provider metadata and source configuration for XYZ raster-dem, TileJSON raster-dem, PMTiles terrain, API DEM, dataset DEM, and STAC catalog sources.
- `TerrainProviderStatus`: `idle`, `loading`, `active`, `fallback`, `unavailable`, or `error`.
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

The renderer registers `pmtiles://` with MapLibre once, normalizes provider configs into `raster-dem` sources, and attempts map-ready terrain providers in order. A tile/setup failure degrades to the next candidate without blocking the basemap, H3 mesh, or DOM panels.

## Licensing Gates

- FABDEM is marked `requires-license` because its public release is non-commercial unless separately licensed.
- CUDEM is marked `preprocessing-required` and should become map-ready only after tiling/COG/PMTiles processing.
- OpenTopography is marked `requires-api-key` and is not called in V1.
- Mapterhorn is the primary V1 open terrain provider; attribution and upstream dataset notices must remain visible in release notes and production docs.
- No paid APIs, secret tokens, or real ingestion jobs run in V1.

## Fallback Behavior

- If terrain tiles fail, the globe shell, basemap, H3 overlay, and DOM panels remain usable.
- If the primary terrain provider fails during setup or tile loading, the renderer attempts the next map-ready candidate and updates Zustand/footer status.
- If the terrain provider is not map-ready, the footer reports `unavailable` with the provider message.
- If the map reports renderer errors, Zustand stores a visible status message.
- If user-added data cannot be persisted, it remains local/mock by design.

## Contour Foundation

Contours are modeled as a typed provider layer separate from terrain source truth. The browser renderer consumes MapLibre `raster-dem` for terrain and elevation behavior; it does not perform reliable live contour extraction from DEM tiles. Production contours should be generated by preprocessing DEM sources into vector contour tiles or contour PMTiles, then registered through the contour provider contract.

The V1 UI exposes a visible contour placeholder/status so users can see that the terrain mesh has contour plumbing, while docs and tests prevent misrepresenting it as live extraction.

## Macro And Micro Provider Boundaries

Macro summaries now have typed climate, hazard, and solar contracts with provenance, confidence, and mock/provider-boundary status. Weather, flood, fire, and solar scoring helpers operate on typed summaries and make no paid API calls.

Micro summaries now include local food network assets and property signals. Food records cover farms, growers, farmers markets, food hubs, community gardens, storage, and distribution points. Property signals are mock-only in V1 and use H3/approximate area fields, price bands, acreage bands, notes, provenance, and timestamps rather than exact private addresses.

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

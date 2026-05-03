# System Design

## Snapshot

Date: 2026-04-30

V1 implements the screenshot-directed vmesh dashboard with a fixed Next.js app shell, MapLibre globe surface, deck.gl H3 mesh overlay, Zustand state, typed mock data, local/private user records, Recharts analytics, and provider-agnostic open terrain source foundations.

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
  provenance and confidence
  derived antifragility scores

Analytics
  Recharts panels
  derived mesh metrics
```

## Data Flow

MapLibre owns the basemap, terrain, and camera. deck.gl attaches through `MapboxOverlay` so H3 layer rendering follows the map camera. Zustand holds the selected H3 cell, hover metadata, mesh tier, active layers, map status, terrain status, prepopulated hex summaries, and local draft records. React panels subscribe to Zustand slices rather than reading directly from map instances.

App-pulled datasets should enter through typed provider adapters. User-added data enters through explicit local state actions with provenance, confidence, timestamp, and private-local visibility.

## Public Contracts

- `MeshTier`: `U3`, `U5`, and `U8`, mapped to H3 resolutions 3, 5, and 8.
- `TerrainProviderConfig`: provider metadata and source configuration for XYZ raster-dem, TileJSON raster-dem, PMTiles terrain, API DEM, dataset DEM, and STAC catalog sources.
- `TerrainProviderStatus`: `idle`, `loading`, `active`, `fallback`, `unavailable`, or `error`.
- `VmeshHexRecord`: H3 ID, tier, resolution, place, antifragility score, macro pillars, micro summary, user summary, provenance, confidence, and trend series.
- `UserRecord`: category, title, attached H3 ID, private-local visibility, provenance, confidence, and timestamps.

## Mesh Tiers

| Tier | H3 resolution | Meaning                           | Render rule                                          |
| ---- | ------------: | --------------------------------- | ---------------------------------------------------- |
| `U3` |             3 | Global and continental macro mesh | Safe for broad global/regional context.              |
| `U5` |             5 | Regional operating mesh           | Default V1 dashboard tier.                           |
| `U8` |             8 | Local/detail mesh                 | Generated only inside the selected U5 parent bounds. |

`U8` must never render globally. It is capped and scoped to selected local context for micro and user-added workflows.

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

## Persistence Model

V1 uses committed mock/prepopulated data and local/mock user-added records only. Real persistence is out of scope until account identity, ownership, moderation, retention, deletion, export, and sharing rules are defined.

## Architecture Decisions

- Use MapLibre rather than Mapbox GL to keep the base engine open-source.
- Use deck.gl `MapboxOverlay` rather than a separate canvas to prevent camera drift.
- Use H3 as the stable mesh index for aggregation and interaction.
- Keep user-added data separate from app-pulled data in the type system.
- Keep charts in React DOM rather than WebGL to preserve accessibility and layout control.

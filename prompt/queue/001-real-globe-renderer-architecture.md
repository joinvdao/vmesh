# vmesh Globe Phase 1: Renderer Architecture And Mode Split

You are Codex acting as a principal geospatial frontend architect.

## Goal

Replace the current CSS-masked orbit globe illusion with a real renderer split:

- Far zoom: `orbit-earth`, a true Three.js sphere.
- Mid zoom: `source-map-globe`, MapLibre globe/source-backed map.
- Close zoom: `local-map`, MapLibre local detail.
- Future: `local-terrain-package`, package-backed high-resolution terrain.

MapLibre remains the operational map engine. Three.js owns the beautiful far/orbit Earth.

## Read First

- `AGENTS.md`
- `docs/DESIGN_DIRECTION.md`
- `docs/SYSTEM_DESIGN.md`
- `docs/TESTING.md`
- `components/Map/TerrainGlobe.tsx`
- `components/Map/TerrainGlobeViewport.tsx`
- `components/Map/globeCamera.ts`
- `components/Map/globeVisualRuntime.ts`
- `lib/globeViewer.ts`
- `store/vmeshStoreTypes.ts`

## Implementation

- Add a typed viewer model in `lib/globeViewer.ts`:
  - `GlobeRenderMode = "orbit-earth" | "source-map-globe" | "local-map" | "local-terrain-package"`
  - keep legacy `GlobeViewerMode` compatibility only if needed.
- Add `components/Map/ThreeEarthGlobe.tsx`.
- Add helper files:
  - `components/Map/threeEarthCamera.ts`
  - `components/Map/threeEarthMaterials.ts`
  - `components/Map/earthTextureSources.ts`
- Render a real sphere in orbit mode.
- Keep the current MapLibre canvas mounted but low-opacity/non-primary in orbit mode.
- Crossfade MapLibre in as viewer mode moves toward source/local mode.
- Do not break existing deck.gl overlay setup.

## Acceptance

- App loads with a true sphere in the center.
- MapLibre remains active for source-backed state but no longer pretends to be the far-orbit globe.
- No blank map/globe state.
- Existing search, layer, terrain, and footer statuses still render.
- Add unit tests for mode mapping and texture registry defaults.

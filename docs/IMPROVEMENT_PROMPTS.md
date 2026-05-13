# Improvement Prompts

These prompts were written after comparing the current implementation against `README.md`, `docs/PRODUCT_SCOPE.md`, `docs/DESIGN_DIRECTION.md`, `docs/SYSTEM_DESIGN.md`, `docs/TESTING.md`, `docs/SECURITY_PRIVACY.md`, and `docs/OPERATIONS.md`.

## 1. First-Viewport Selected Mesh Affordance

Prompt: Reconcile the docs that require a visible H3 mesh signal on first load with the newer product principle that the global grid should not be decorative wallpaper. Add a restrained selected-cell H3 affordance that is always visible when the deck.gl renderer is available. Keep broad U3/U5/U8 layers opt-in through analytical overlays, preserve the rule that U8 is generated only inside a selected U5 parent, and make footer visible-hex counts reflect unique rendered H3 cells.

Execution target: `components/Map/useTerrainGlobeLayers.ts`, `store/vmeshStoreHelpers.ts`, and store tests.

## 2. Privacy-Gated Remote Geocoding

Prompt: Treat free-text place search as a provider call that can expose user intent and selected geography. Keep offline coordinate parsing and known-place lookup enabled by default, but gate remote Nominatim geocoding behind an explicit public environment flag. Surface a clear status message when remote geocoding is disabled and update docs/env examples so deployments opt in deliberately.

Execution target: `lib/searchLocations.ts`, `components/Layout/AppHeader.tsx`, `.env.example`, privacy/user docs, and search tests.

## 3. Macro Layer Catalog Maintainability

Prompt: Keep the macro atlas catalog as a typed source-broker contract, but split oversized catalog definitions away from helper logic. Preserve all existing layer metadata, category summaries, legacy layer aliases, map-ready classification, and source-broker behavior. The refactor should reduce file size without weakening types or changing runtime outputs.

Execution target: `lib/layerCatalog.ts` plus supporting catalog modules.

## 4. Terrain Renderer Lifecycle Isolation

Prompt: Extract MapLibre/deck.gl initialization, terrain provider fallback wiring, PMTiles protocol registration, map status updates, resize cleanup, and renderer error handling out of the main `TerrainGlobe` component. Keep `TerrainGlobe` focused on composition and hook orchestration while preserving the exact fallback behavior and Zustand status updates described in the docs.

Execution target: `components/Map/TerrainGlobe.tsx` and a dedicated renderer hook.

## 5. Store Action Cleanup

Prompt: Move the async selected-cell weather loading action out of the main Zustand store file while preserving cache keys, Open-Meteo fallback behavior, status updates, and selected macro summary updates. This should make the store easier to review and help the agent-ready file-size budget without changing public behavior.

Execution target: `store/useVmeshStore.ts` and a focused macro action helper.

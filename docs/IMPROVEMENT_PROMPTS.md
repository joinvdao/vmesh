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

## 6. Property Package Contract And Worker Boundary

Prompt: Add the boundary-first property treatment package contract described in
`docs/PROPERTY_PACKAGE_TILE_ARCHITECTURE.md`. Define the manifest shape,
privacy classes, cache classes, tier model, artifact roles, provenance fields,
and worker lifecycle states before adding real provider calls. The package must
support H3 cell, drawn AOI, imported boundary, and future parcel-backed inputs.
It should distinguish standard open-data outputs from premium licensed outputs,
and it must keep H3 cells separate from legal property boundaries.

Execution target: `lib/geospatialPackage/`, package manifest types, planner
tests, docs, and fixture manifests. Do not implement live heavy workers yet.

## 7. Public/Private Tile Delivery Policy

Prompt: Implement a source-safe artifact URL policy for package outputs. Public
PMTiles/COG/vector tile refs should be allowed only for intentionally public
open/generalized artifacts. Private AOIs, user boundaries, paid parcel data,
premium imagery, report assets, and generated downstream outputs must require
signed URLs, authenticated tile proxy refs, or owner-private object refs. Add
tests that reject localhost/private-network refs, credential-bearing URLs,
secret-like query params, token-bearing provider tile URLs, and public-cache
promotion without a license/privacy review flag.

Execution target: `lib/geospatialPackage/`, API response sanitization,
security/privacy docs, and route tests.

## 8. Clearfork-Style Package Viewer UX

Prompt: Build a narrow operator/viewer UX inspired by the Clearfork Wells
benchmark without adopting its R Shiny stack. The user should be able to draw or
select an AOI/property boundary, see source/package status, inspect MapLibre
layers, open a table/chart view for package features, and download only
artifacts whose license/privacy policy allows it. The UI should make public,
private, premium, cached, pending, blocked, and failed artifact states visually
clear.

Execution target: map controls, package drawer/modal, Zustand package state,
fixture package viewer tests, and accessibility/browser verification. Keep
premium provider calls mocked or disabled.

## 9. Standard Sentinel/SEN2SR Claimable Layer

Prompt: Promote the existing Sentinel/SEN2SR planning/completion scaffold into a
standard-tier claimable imagery package flow. A completed worker output should
produce a manifest-backed tile artifact, cloud metrics, source scene metadata,
SEN2SR model metadata, cache key, H3 coverage, and download/share policy. The
UI must label the layer as `imagery-inferred-context`, not measured orthophoto
truth, and block cloudy, preview-only, wrong-provenance, wrong-host, or
non-worker-completed outputs.

Execution target: Sentinel SR workflow types, completion route, package
manifest fixture, imagery layer UI, security tests, and package docs.

## 10. Weather Ledger For Gameplay And Reports

Prompt: Add a normalized weather-ledger package contract for selected cells and
AOIs. The ledger should ingest no-key Open-Meteo and fixture data first, model
NASA POWER/ERA5/GFS/premium providers as future worker sources, and expose
daily/hourly fields needed for ambience, plant growth, frost, heat stress,
water-balance, wind roses, and climate-sector maps. Browser UI may request only
selected-cell summaries; growth/report logic must consume the ledger rather
than direct live API calls.

Execution target: macro package contracts, provider registry, selected-cell
weather action, H3 summary fixtures, docs, and tests for fallback/last-known
behavior.

## 11. Premium Data Tier Provider Gate

Prompt: Add premium-tier planning surfaces without enabling paid ingestion.
The planner should identify candidate premium orthophoto/satellite, DEM/DTM/DSM,
parcel/title/survey, and weather/climate providers, but mark them blocked until
terms allow storage, processing, export, redistribution, downstream app use, and
AI/render conditioning where relevant. Mapbox, MapTiler, Esri, and similar
satellite basemaps must remain display/reference-only unless the deployment
has an explicit custom license for package generation.

Execution target: source registry candidates, rejected-source reasons,
license-gate metadata, docs, tests, and UI disclosure in the source drawer.

## 12. Semantic Scene Annotation Overlay

Prompt: Add a package-level semantic annotation contract for visual observations
from source views, capture walkthroughs, photogrammetry scenes, or generated
world QA. An annotation should carry label, category, source view, image/camera
anchor, optional georegistered geometry, H3 cells where available, confidence,
truth role, source, privacy class, and limitations. Non-georegistered
annotations should support prompt conditioning, report notes, and QA only.
Georegistered annotations may become GeoJSON/PMTiles overlays and H3
observations after source review.

Execution target: package manifest types, fixture annotations, source drawer,
package viewer overlay, privacy tests, and docs. Do not treat burned-in overlay
text or AI labels as measured geometry, parcel truth, infrastructure truth, or
hydrology truth.

## 13. Polygon Component Preflight

Prompt: Add selection-time component analysis for polygons drawn or confirmed
around buildings, project areas, parcels, or H3 AOIs. The preflight should
intersect source-backed vectors and allowed imagery/package artifacts to identify
components inside the polygon: buildings, roads, driveways, water, trees,
vegetation/field edges, bare soil, hardstanding, greenhouses, solar panels,
fences/walls, and unknown objects needing review. The output should be
`component-preflight.json` with geometry or image anchors, source id/date,
confidence, model id where used, review status, truth role, privacy class, and
limitations.

Execution target: package planner, fixture manifests, package viewer overlay,
source drawer, and tests. Do not use display-only Mapbox/MapTiler/Esri basemap
pixels as model input unless an explicit licensed processing source is
configured.

## 14. USA/Canada DTM And DSM Viewer Source Ingestion

Prompt: Prove USA and Canada DTM/DSM source ingestion in the vmesh viewer before
building downstream terrain derivatives. For a selected AOI, the viewer should
select the correct USGS 3DEP, Canada HRDEM, or LidarBC source path for the
requested role, probe coverage, display a source-backed terrain/surface layer
when the source is map-ready or proxy-previewable, and fail closed when it is
only configured or preprocessing-required. The UI must show provider, product
role, coverage status, resolution/vintage when known, attribution, active layer
id, fallback state, and run class. Mapterhorn, Mapzen/Joerd, and MapLibre demo
terrain may remain renderer fallbacks, but must never be relabeled as USGS,
HRDEM, LidarBC, DTM, or DSM source truth.

Execution target: `prompt/queue/007-usa-canada-dtm-dsm-viewer-source-ingestion.md`,
`lib/terrainSources.ts`, `lib/geospatialPackage/sourceRegistryRegionalTerrain.ts`,
`lib/geospatialPackage/terrainSourceAdapters.ts`, terrain panel/source drawer UI,
MapLibre source/layer wiring, terrain source tests, browser verification, and
terrain operations docs.

# Abundance / VMesh Source Handoff Contract

Status: v1 implemented in code, 2026-07-06.

Canonical schema: `vmesh-abundance-source-handoff-v1`

VMesh returns source refs, parameterized recipes, coverage evidence, confidence,
warnings, and gaps. Abundance or the builder worker executes recipes and stores
terrain/vector/mask payloads. VMesh does not store heavy provider payloads in
this handoff.

## Ownership

| Layer         | VMesh responsibility                                                                                                          | Abundance responsibility                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Request frame | Normalize AOI/H3 and emit a default 3 km square source-slice frame.                                                           | Use the frame to build payloads; render parcel/user boundary as overlay only.                |
| Source refs   | Return reviewed source records, selected flags, licenses, attribution, limitations, and confidence.                           | Preserve provenance in source/runtime packs.                                                 |
| Recipes       | Return adapter ids, parameter slots, steps, expected payload kinds, and fail-closed gaps.                                     | Execute recipes with provider-specific workers and write payloads outside VMesh.             |
| Terrain       | Separate DTM, DSM, topobathy, generic DEM, and visual/fallback roles.                                                         | Never satisfy DTM with DSM or generic DEM; attach QA before runtime use.                     |
| Vectors/masks | Return source refs and worker plans for roads, buildings, water, landcover, vegetation, soils, climate, imagery, and parcels. | Materialize rows/masks and block empty/synthetic output unless explicitly labelled fallback. |

## Required Top-Level Fields

- `schemaVersion`: always `vmesh-abundance-source-handoff-v1`.
- `createdAt`: ISO timestamp.
- `runClass`: currently `dry-run`; live proof belongs to worker outputs.
- `request`: `consumerAppId`, `edgeMeters`, `gridSize`, and requested BA
  segments.
- `frame`: default `3000` m square, `257` grid, parcel boundary
  `overlay-only`.
- `jurisdiction`: H3 context plus resolver status. The in-memory v1 contract
  emits `h3-only` until the resolver route attaches
  `vmesh.jurisdiction_at` output.
- `terrain`: selected and rejected terrain source ids with source role,
  resolution, confidence, and selected flag.
- `coverageEvidence`: copied from the BA reviewed package.
- `baPackage`: the reviewed `vmesh-ba-geospatial-package-v1`.
- `layers`: per-layer execution contract.
- `terrainAdapterPlans`: source-native terrain adapter plans where supported.
- `buildingWorkerHandoff`: `vmesh-building-package-worker-v1` when buildings
  are requested.
- `warnings`, `gaps`, `nextActions`.

## Layer Contract

Each layer entry includes:

- `layerId`;
- `segmentIds`;
- `expectedPayloadKind`;
- `status`: `ready-to-execute`, `requires-worker`, `source-ref-only`, or
  `blocked`;
- `selectedSourceIds`;
- `sourceRefs`;
- `recipes`;
- `warnings`;
- `gaps`.

Expected payload kinds:

| Layer                         | Expected payload         |
| ----------------------------- | ------------------------ |
| `terrain`                     | `terrain-raster`         |
| `contours`                    | `terrain-derived-vector` |
| `roads`                       | `vector-roads`           |
| `buildings`                   | `vector-buildings`       |
| `water`, `hydrology`          | `environment-vector`     |
| `landcover`                   | `landcover-raster`       |
| `vegetation`                  | `semantic-ground-vector` |
| `climate`                     | `climate-context`        |
| `imagery`                     | `imagery-context`        |
| `parcels`, `field-boundaries` | `parcel-boundary`        |

## Recipe Contract

Each recipe includes:

- `id`;
- `kind`: `terrain-source-adapter`, `building-worker-handoff`,
  `ba-fetch-recipe`, or `blocked-review`;
- `sourceId`;
- `adapterId`;
- `artifactKinds`;
- `parameterSlots`;
- `steps`;
- `status`;
- `requiredWorker`.

Executable recipes must use placeholders such as `{bbox}`, `{lat}`, `{lon}`,
and `{h3}` rather than committed exact coordinates. Terrain source adapter
recipes use `{bbox}` because the downstream worker clips/window reads provider
inputs to the source-slice frame. Building and Overture-style vector recipes use
`{bbox}` for AOI row extraction.

## Hard Rules

- No raw LiDAR, GeoTIFF, GeoParquet extracts, vector rows, or masks in VMesh
  handoff JSON.
- No private exact coordinates, local absolute paths, signed URLs, API keys, or
  paid-provider refs in committed fixtures.
- Generic DEM and synthetic terrain are fallback roles only.
- DSM/surface models cannot satisfy DTM/bare-earth terrain.
- Empty roads/buildings/masks are allowed only as blocked or explicit fallback,
  not as source-backed success.
- Parcel boundaries are context/overlay until a legal/survey source is proven.

## Implementation

Code:

- `lib/geospatialPackage/abundanceSourceHandoff.ts`
- exported through `lib/geospatialPackage/index.ts`

Tests:

- `tests/abundanceSourceHandoff.test.ts`

Next phase:

- Add a VMesh API resolver mode that returns this contract.
- Add the Abundance-side recipe executor that maps recipe kinds to existing
  site-package adapter callbacks and payload-store writes.

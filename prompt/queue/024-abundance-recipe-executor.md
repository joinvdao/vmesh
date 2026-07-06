# vmesh Phase 24: Abundance Recipe Executor Adapter

You are Codex acting as an Abundance data-pipeline engineer.

## Goal

Build the Abundance-side executor adapter that consumes
`vmesh-abundance-source-handoff-v1` and turns VMesh recipes into builder inputs.

VMesh remains the source broker. Abundance executes recipes, fetches/clips data,
and emits source packs/runtime packs.

## Status

`private-done-partial` as of 2026-07-06.

Landed in private Abundance branch `feat/v4-V0-visual-uplift`:

- `c4c8e14 feat(data): add vmesh abundance handoff executor`
- `fefbf4d feat(data): queue vmesh handoffs into site packages`
- `4f92a9d feat(data): normalize vmesh builder inputs`

Implemented:

- schema-version guard and typed `vmesh-abundance-source-handoff-v1` consumer;
- VMesh source-id to Abundance site-package adapter mapping;
- normal `SitePackageManifest` generation for terrain, Overture roads/buildings,
  Sentinel imagery context, landcover, hydrology/environment, parcels, and
  unsupported climate context;
- `/api/site-packages` ingress via `vmeshSourceHandoff`;
- worker-step proof that terrain, vector, imagery, landcover, and environment
  callbacks execute from the VMesh-derived manifest;
- public route response test proving H3/bounds are not leaked.
- normalized builder-input records with `{lat}`, `{lon}`, `{bbox}`, `{h3}`,
  and `{radius_km}` substitution;
- fixture-safe coordinate/H3 redaction for committed proof inputs;
- adapter-family classification for source-native terrain, Overture
  GeoParquet, STAC, bounded API, download-index, manual-review, and
  unsupported recipes;
- fallback/generic terrain downgrade tests before source-truth emission.

Still open before marking `done`:

- builder-side source-pack fixture emission from normalized builder inputs;
- persisting normalized builder-input JSON files to the builder/package store;
- live provider execution for each adapter family, beyond unit-level
  classification and route queueing;
- end-to-end runtime-pack proof from VMesh handoff -> builder input ->
  source-pack payload -> `site-runtime-pack.v1`.

## Repos

- Read VMesh private `main`.
- Edit `abundance-v2` and `building-abundance` only where needed for data
  pipeline/builder code.
- Do not edit `components/lookdev/**` or renderer/physics hot files.

## Executor Responsibilities

For each recipe:

- validate schema version;
- validate adapter id;
- substitute `{lat}`, `{lon}`, `{bbox}`, `{h3}`, `{radius_km}`;
- enforce axis-order notes;
- reject secrets, local paths, signed URLs, and private exact coords in fixtures;
- write normalized builder inputs;
- preserve source role, confidence, license, attribution, limitations;
- fail closed on unsupported adapters.

## Adapter Priority

1. `stac-cog-point`
2. `arcgis-image-export`
3. `arcgis-feature-query`
4. `geoparquet-bbox`
5. `download-index`
6. `manual-review` as gap only

## Tests

Add Abundance/builder tests for:

- valid handoff consumed;
- unsupported adapter blocked;
- placeholder substitution;
- privacy scrub;
- terrain recipe converted to terrain builder input;
- vector recipe converted to vector builder input;
- fallback terrain downgraded.

## Verification

Run the touched Abundance and builder tests plus typecheck where available.

Report the exact files that consume the VMesh handoff and the adapter families
implemented.

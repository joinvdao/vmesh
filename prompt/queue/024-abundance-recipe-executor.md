# vmesh Phase 24: Abundance Recipe Executor Adapter

You are Codex acting as an Abundance data-pipeline engineer.

## Goal

Build the Abundance-side executor adapter that consumes
`vmesh-abundance-source-handoff-v1` and turns VMesh recipes into builder inputs.

VMesh remains the source broker. Abundance executes recipes, fetches/clips data,
and emits source packs/runtime packs.

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

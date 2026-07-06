# vmesh Phase 22: Abundance/VMesh Handoff Contract

You are Codex acting as a schema and integration contract engineer.

## Goal

Define and test the stable contract between VMesh and Abundance:

`vmesh-abundance-source-handoff-v1`

VMesh returns source refs, parameterized recipes, coverage evidence, confidence,
and gaps. Abundance executes recipes and builds source/runtime packs.

## Contract Requirements

The handoff must include:

- request and disclosure metadata;
- 3 km x 3 km slice frame by default;
- parcel boundary context, if provided, as overlay/context only;
- H3 context;
- jurisdiction context;
- selected terrain source and rejected terrain sources;
- terrain role: DTM, DSM, topobathy, generic DEM, or visual context;
- terrain resolution, confidence, CRS, vertical datum when known;
- vector source refs for buildings, roads, water, parcels/planning;
- mask and ecology source refs for landcover, vegetation, soil, hydro, climate;
- fetch recipes with adapter id and placeholders;
- coverage evidence;
- execution plan for Abundance builders;
- warnings and hard gaps;
- provenance, license, attribution, limitations.

## Hard Rules

- No heavy provider payloads in the handoff.
- No exact private coordinates in committed fixtures.
- No local paths, signed URLs, secrets, or paid-provider refs.
- Generic DEM cannot satisfy high-confidence terrain.
- DSM cannot satisfy DTM.
- Synthetic fallback must be labeled synthetic/fallback.

## Implementation Targets

VMesh:

- `lib/geospatialPackage/`
- `app/api/geospatial-package/`
- `tests/`
- `docs/INTEL_VMESH_SOURCE_HANDOFF_CONTRACT.md`

Abundance:

- contract docs only unless this phase explicitly creates generated fixtures;
- no renderer files.

## Tests

Add contract tests for:

- valid handoff shape;
- privacy redaction;
- terrain role separation;
- fallback labeling;
- parcel boundary as context, not slice frame;
- missing terrain creates a blocking gap;
- recipe placeholders are present and not hardcoded.

## Verification

Run:

- `npx tsc --noEmit`
- contract targeted Vitest
- `npm run privacy:check`

Report the final schema fields and any version-bump risks for downstream
contracts.

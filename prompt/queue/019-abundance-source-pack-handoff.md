# vmesh Phase 19: Abundance Source-Pack Handoff

You are Codex acting as the VMesh/Building Abundance integration engineer.

## Goal

Make the VMesh resolver output directly usable by Building Abundance's source
pack builders. VMesh still returns refs and recipes; Abundance executes recipes
and builds the source/runtime pack.

## Contract

For a Mapbox-selected coordinate/parcel, VMesh returns:

- normalized 3 km slice frame;
- selected terrain source and fallback/gap state;
- selected vector source refs for roads/buildings/water/parcels where available;
- soils/landcover/ecology/climate source refs and recipes;
- coverage evidence;
- confidence and limitations;
- rejected sources;
- source-pack execution plan for BA builders.

Abundance consumes this to generate:

- terrain payload;
- buildings/roads/water/vector payloads;
- masks/landcover/soil/ecology payloads;
- provenance manifest;
- site-runtime-pack input.

## Boundaries

- VMesh does not edit Abundance renderer files.
- VMesh does not fabricate features, elevations, soil facts, species, parcels, or
  roads.
- VMesh does not store private exact coordinates in public-safe artifacts.
- BA workers own heavy fetch/clip/convert unless explicitly running a VMesh proof.

## Deliverables

1. `vmesh-abundance-source-handoff-v1` JSON schema/types.
2. Resolver response mode for BA.
3. Compatibility examples for public-safe USA, BC, England, Scotland.
4. Handoff docs that tell BA exactly how to execute recipes.
5. Gap flags that BA can surface or use to downgrade visual confidence.

## Tests

Add tests for:

- BA mode includes terrain/vector/ecology source-pack execution plan;
- no heavy payloads are returned;
- missing terrain blocks high-confidence source-pack claim;
- fallback/generic terrain is labeled;
- parcel polygon is represented as boundary context, not slice boundary;
- privacy scrub catches exact coords/local paths/signed URLs in fixtures.

## Verification

Run:

- `npx tsc --noEmit`
- BA handoff tests
- resolver tests
- privacy check
- route proof fixtures for public-safe regions

Report the sample handoff paths and unresolved source gaps.

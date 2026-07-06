# vmesh Phase 27: Anywhere Capability Tiers

You are Codex acting as a geospatial product truth and source-confidence
engineer.

## Goal

Define and enforce the honest meaning of "anywhere." Abundance should be able to
request a slice for any coordinate, but the quality tier must depend on source
coverage. VMesh must never imply Kamloops-quality data where only generic or
coarse sources exist.

## Capability Tiers

Define and implement response tiers:

- `tier_0_no_operational_source`: no usable open source path.
- `tier_1_global_fallback`: generic DEM/global modeled context only.
- `tier_2_source_refs`: reviewed source refs and recipes, coverage not proven.
- `tier_3_regional_operational`: terrain/vector/ecology recipes with regional
  coverage evidence.
- `tier_4_high_fidelity_lidar`: high-confidence DTM/DSM terrain plus vectors and
  masks, region-gated.

## Rules

- "Anywhere on Earth" can mean requestability, not uniform quality.
- Generic DEM is never high-fidelity.
- Global modeled soil/landcover is context, not site survey.
- Parcel boundary context is not survey truth.
- High-fidelity claims require retained source evidence.

## Deliverables

- Tier definitions in docs.
- Resolver response field for capability tier.
- Tests asserting downgrade behavior.
- Sample matrix showing tier per region.

## Tests

Add tests for:

- high-fidelity region receives high tier only with terrain evidence;
- generic fallback receives low tier;
- missing vectors/masks reduce final tier;
- review-only sources do not upgrade tier;
- confidence explanations are present.

## Verification

Run resolver tests, privacy check, and route proof matrix.

Report exact language downstream apps should use when a user asks for "anywhere"
slice generation.

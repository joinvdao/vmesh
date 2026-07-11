# vmesh Phase 37: Global Any-Coordinate Acceptance

## Goal

Prove the complete VMesh resolver and Abundance handoff for arbitrary Earth
coordinates without downloading or storing heavy provider payloads in VMesh.

## Matrix

Use public-safe, redacted fixtures covering:

- Kamloops and another Canadian location;
- a USA LiDAR/3DEP region;
- England or Scotland;
- at least five land coordinates across five continents;
- a sparse-data/global-fallback land coordinate;
- a coastal and an ocean coordinate;
- an urban building-rich AOI;
- a valid empty-building AOI;
- anti-meridian and high-latitude edge cases.

## Required Assertions

For each request retain:

- normalized coordinate disclosure class and frame summary;
- selected source per layer and ranked alternatives;
- provider, role, resolution/scale, confidence, license and attribution;
- coverage status, endpoint-health age and fallback reason;
- executable recipe family and downstream worker action;
- gaps and rejected-source reasons;
- resolver duration and public-safe response size;
- Abundance handoff schema validation.

## Performance Bar

VMesh must read durable coverage evidence first. Warm source-plan resolution
should target two seconds or less; cold bounded metadata probes should target
ten seconds or less and must time out cleanly. Provider payload generation is a
downstream worker duration and is reported separately.

## Final Done Bar

- Terrain has an executable source plan everywhere, with LiDAR/DTM upgrades and
  labelled global fallback.
- Ecology/landcover has executable sourced context everywhere applicable.
- Buildings have an executable global query plan and valid empty semantics.
- Other domains return a ranked source or explicit gap.
- The `vmesh-abundance-source-handoff-v1` fixture validates for every matrix
  entry without changing Abundance `site-runtime-pack.v1`.
- Standing gates are green and retained live evidence distinguishes endpoint
  proof, asset-ref proof, materialization proof and Abundance live proof.

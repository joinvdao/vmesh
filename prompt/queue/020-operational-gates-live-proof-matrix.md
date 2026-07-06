# vmesh Phase 20: Operational Gates And Live-Proof Matrix

You are Codex acting as a reliability engineer for VMesh source brokerage.

## Goal

Make VMesh's land intelligence resolver reliable enough to be trusted by
downstream apps. Add standing gates, live-proof samples, privacy scans, and
regression fixtures.

## Matrix

Maintain public-safe samples for:

- USA high-resolution terrain region
- British Columbia LidarBC/HRDEM region
- Canada non-BC HRDEM region
- England LiDAR region
- Scotland LiDAR region
- generic global fallback region

For each sample, record:

- selected terrain source;
- terrain role;
- resolution;
- confidence;
- selected vector source refs;
- soils/landcover/ecology/climate source refs;
- gaps;
- rejected-source reasons;
- route status and warnings.

## Gates

Standing gates:

- `npx tsc --noEmit`
- resolver targeted Vitest
- terrain adapter/probe targeted Vitest
- source registry targeted Vitest
- privacy check
- no private refs scan
- route proof fixtures

Hard fail when:

- generic DEM is reported as high-confidence DTM;
- DSM satisfies DTM;
- source coverage is claimed without evidence;
- synthetic/fallback data is unlabeled;
- private coordinate/local path/signed URL appears in committed fixture;
- license-gated source appears as default operational source.

## Deliverables

1. Live-proof matrix script or fixture generator.
2. Regression fixtures for the canonical resolver.
3. CI-friendly targeted test commands.
4. Docs explaining confidence tiers and fallback behavior.
5. Gap report per bucket and region.

## Tests

Add tests for:

- every matrix coordinate returns a valid resolver package;
- every source has provider/license/attribution;
- every selected source has role/confidence;
- rejected sources are preserved;
- gaps are explicit;
- privacy redaction works on all committed proof fixtures.

## Verification

Run the full standing gate list and report:

- pass/fail for each gate;
- terrain source per sample;
- buckets below operational confidence;
- adapter families still missing.

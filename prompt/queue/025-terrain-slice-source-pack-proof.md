# vmesh Phase 25: Terrain Slice Source-Pack Proof

You are Codex acting as a terrain pipeline integration engineer.

## Goal

Prove that an Abundance terrain source pack can be generated from a VMesh
handoff for public-safe sample coordinates. This proves the terrain part of the
seam, not the full visual renderer.

## Scope

Start with terrain only:

- DTM where available.
- DSM only as separate surface context.
- generic DEM only as labeled fallback.
- terrain provenance manifest.
- QA summary.

## Public-Safe Proof Matrix

Generate or retain proof fixtures for:

- USA 3DEP DTM.
- BC LidarBC/HRDEM DTM.
- Canada HRDEM best available.
- England LiDAR or documented gap.
- Scotland LiDAR or documented gap.
- generic global fallback.

## Deliverables

In Abundance or builder repo, produce source-pack fixtures that include:

- `terrain.json` or equivalent source-pack terrain payload;
- `provenance-manifest.json`;
- role/resolution/confidence;
- rejected-source reasons;
- gaps;
- no private refs.

In VMesh, retain only public-safe handoff fixtures or route proof artifacts.

## Current Prerequisite Evidence

- Abundance runner landed on `feat/v4-V0-visual-uplift` at
  `abundance-v2 bba4941`.
- Evidence file:
  `abundance-v2/docs/v4-acceptance/kamloops-coordinate-proof-runner.md`.
- Runner:
  `abundance-v2/scripts/proof/site-runtime-pack/kamloopsCoordinateProofRunner.ts`.
- This proves the local/VPS runner can consume a VMesh Abundance handoff,
  preserve the 3 km source-slice frame, emit fixture-redacted builder inputs,
  record GIS/GPU/palette readiness, and emit source-pack/runtime-bridge
  readiness artifacts.
- It does not prove live provider execution for the public-safe matrix. This
  phase still needs real terrain payloads or honest gaps per region.

## Tests

Add tests for:

- terrain pack generated from VMesh handoff;
- DTM/DSM role separation;
- generic fallback label;
- missing coverage fails closed;
- confidence tiers;
- no local paths or signed URLs in committed fixtures.

## Verification

Run:

- VMesh resolver proof for each sample;
- Abundance/builder terrain tests;
- privacy scans in both repos where fixtures land.

Report which regions reach high-confidence DTM and which remain fallback/gap.

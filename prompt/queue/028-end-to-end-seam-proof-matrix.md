# vmesh Phase 28: End-To-End Seam Proof Matrix

You are Codex acting as a cross-repo verification engineer.

## Goal

Prove the VMesh/Abundance seam end to end with public-safe sample coordinates:

```text
VMesh resolver
  -> vmesh-abundance-source-handoff-v1
  -> Abundance recipe executor
  -> GIS/GPU/palette worker preflight
  -> Abundance source pack
  -> Abundance runtime-pack input
```

Renderer verification is optional and owned by the renderer lane. This phase is
about data handoff and source-pack generation.

## Samples

Use public-safe samples for:

- USA high-resolution terrain.
- BC high-resolution terrain.
- Canada non-BC HRDEM/best available.
- England.
- Scotland.
- generic fallback.

Do not use private Rose exact coordinates in committed artifacts.

## Deliverables

- VMesh handoff fixture per sample.
- Abundance source-pack fixture per sample.
- Runtime-pack input or adapter output per sample.
- Worker readiness evidence for the Abundance execution side:
  - GIS worker can fetch/clip terrain and vectors or returns a blocked reason.
  - GPU worker can process terrain/imagery/material jobs or returns a blocked
    reason.
  - Palette worker can emit source-labelled material slots without upgrading
    terrain truth.
- Matrix report with capability tier, terrain source, vector status, mask status,
  confidence, warnings, and gaps.
- Regression tests that compare key fields, not brittle timestamps.

## Current Prerequisite Evidence

- Abundance worker readiness landed on `feat/v4-V0-visual-uplift` at
  `abundance-v2 303f7a9`.
- The 3 km source-slice-frame prerequisite was reconciled onto the same branch
  at `abundance-v2 a7dcf11`, with the queue marker at `abundance-v2 d949acc`.
- The Kamloops coordinate proof runner landed at `abundance-v2 bba4941`.
- Evidence file: `abundance-v2/docs/v4-acceptance/slice-worker-readiness.md`.
- Runner evidence:
  `abundance-v2/docs/v4-acceptance/kamloops-coordinate-proof-runner.md`.
- Test file: `abundance-v2/tests/unit/sliceWorkerReadiness.test.ts`.
- This proves the GIS/GPU/palette worker preflight can accept a 3 km VMesh
  source-slice handoff with fixture callbacks and fail closed when data is
  missing or synthetic.
- It does not prove live provider execution. Phase 028 still needs public-safe
  VMesh resolver samples through Abundance source-pack/runtime-pack artifacts.

## Gates

Run:

- VMesh `npx tsc --noEmit`
- VMesh resolver targeted tests
- VMesh privacy check
- Abundance touched tests/typecheck
- Abundance privacy/no-private-ref scan where available
- Abundance worker preflight for GIS/GPU/palette roles
- source-pack fixture validation

## Hard Fail Conditions

- synthetic or generic fallback unlabeled;
- generic DEM reported as high-confidence DTM;
- DSM used as DTM;
- source coverage claimed without proof;
- worker execution claimed without worker readiness evidence;
- exact private coordinates or local paths in committed fixtures;
- license-gated source selected as default operational source.

## Report

Return a table:

| Sample | Tier | Terrain | Resolution | Vectors | Masks | Confidence | Gaps |
| ------ | ---- | ------- | ---------- | ------- | ----- | ---------- | ---- |

Then list the shortest path to raise each non-high-fidelity sample by one tier.

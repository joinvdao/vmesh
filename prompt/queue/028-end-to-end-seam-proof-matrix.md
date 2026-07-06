# vmesh Phase 28: End-To-End Seam Proof Matrix

You are Codex acting as a cross-repo verification engineer.

## Goal

Prove the VMesh/Abundance seam end to end with public-safe sample coordinates:

```text
VMesh resolver
  -> vmesh-abundance-source-handoff-v1
  -> Abundance recipe executor
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
- Matrix report with capability tier, terrain source, vector status, mask status,
  confidence, warnings, and gaps.
- Regression tests that compare key fields, not brittle timestamps.

## Gates

Run:

- VMesh `npx tsc --noEmit`
- VMesh resolver targeted tests
- VMesh privacy check
- Abundance touched tests/typecheck
- Abundance privacy/no-private-ref scan where available
- source-pack fixture validation

## Hard Fail Conditions

- synthetic or generic fallback unlabeled;
- generic DEM reported as high-confidence DTM;
- DSM used as DTM;
- source coverage claimed without proof;
- exact private coordinates or local paths in committed fixtures;
- license-gated source selected as default operational source.

## Report

Return a table:

| Sample | Tier | Terrain | Resolution | Vectors | Masks | Confidence | Gaps |
| ------ | ---- | ------- | ---------- | ------- | ----- | ---------- | ---- |

Then list the shortest path to raise each non-high-fidelity sample by one tier.

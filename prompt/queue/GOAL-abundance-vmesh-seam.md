# Goal: Operationalize The Abundance/VMesh Seam

You are Codex working across private VMesh, Abundance, and the Abundance builder
repo.

## Objective

Make the seam between VMesh and Building Abundance operational. A user-selected
Mapbox parcel, coordinate, H3 cell, or AOI should produce a source-backed
Abundance terrain/source pack through a deterministic VMesh handoff.

## Desired Flow

```text
User selects parcel/point in Abundance
  -> center and parcel boundary context
  -> VMesh resolver
  -> vmesh-abundance-source-handoff-v1
  -> Abundance recipe executor
  -> terrain/vector/mask source pack
  -> runtime-pack input
```

## Queue

Execute:

1. `021-abundance-vmesh-seam-audit.md`
2. `022-abundance-vmesh-handoff-contract.md`
3. `023-vmesh-abundance-resolver-mode.md`
4. `024-abundance-recipe-executor.md`
5. `025-terrain-slice-source-pack-proof.md`
6. `026-vector-mask-source-pack-proof.md`
7. `027-anywhere-capability-tiers.md`
8. `028-end-to-end-seam-proof-matrix.md`

## Truth Standard

This goal is complete only when Abundance can generate source-pack fixtures from
VMesh handoffs for public-safe USA, Canada/BC, Canada/non-BC, England, Scotland,
and generic fallback samples.

"Anywhere on Earth" means the request path works globally. It does not mean
everywhere has Kamloops-quality LiDAR. Quality must be tiered and explicit.

## Boundaries

- VMesh returns refs, recipes, evidence, confidence, and gaps.
- Abundance executes recipes and builds source/runtime packs.
- Do not edit Abundance renderer or `components/lookdev/**`.
- Do not store heavy provider payloads in VMesh by default.
- Do not commit private exact coordinates, local paths, signed URLs, secrets, or
  paid-provider refs.
- Do not fabricate geospatial truth.

## Done Criteria

- Stable `vmesh-abundance-source-handoff-v1` contract.
- VMesh Abundance resolver mode route-proofed.
- Abundance recipe executor implemented.
- Terrain source-pack proof works from VMesh handoff.
- Vector/mask source-pack proof works where sources exist.
- Capability tiers are enforced and documented.
- End-to-end proof matrix exists with privacy-clean fixtures.

## Verification

Run and report:

- VMesh typecheck and targeted tests.
- Abundance/builder touched tests.
- privacy/no-private-ref scans.
- proof matrix table.
- remaining regions/layers below high-fidelity quality.

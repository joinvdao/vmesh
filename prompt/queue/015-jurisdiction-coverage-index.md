# vmesh Phase 15: Jurisdiction And Coverage Index

You are Codex acting as a geospatial registry and indexing engineer.

## Goal

Make VMesh coverage-aware. Source existence is not enough. For a coordinate,
VMesh must resolve jurisdiction and coverage state so it can choose sources that
actually apply to the place.

## Problem

The existing intel handoff and DB broker can return many bucket-matching
collections, but bucket match is not source coverage. This phase promotes the
registry from "known source refs" to "routable source refs."

## Build

Implement or complete:

- ADM0/ADM1/ADM2 jurisdiction index for USA, Canada, and UK first.
- H3-backed lookup for fast coordinate to jurisdiction resolution.
- `source_collections.coverage` normalization.
- `coverage_evidence` for per-AOI probes.
- source promotion states: `candidate`, `reviewed`, `probed`, `live_proof`,
  `blocked`, `license_gated`, `token_gated`, `paid_only`, `no_data`.
- resolver filtering that prefers covered/probed/live-proof records and reports
  review candidates separately.

## Sources

Use:

- geoBoundaries for open ADM0/ADM1/ADM2 where appropriate;
- national official admin registers where legal municipal precision matters;
- H3 cells as retained index rows;
- coverage bbox/polygon summaries from source metadata where available.

Do not store or serve heavy boundary geometry by default. VMesh keeps the light
index and metadata needed for routing.

## Implementation Targets

- `db/migrations/`
- source registry DB docs
- source broker runtime
- resolver route
- `lib/geospatialPackage/planner.ts`
- source registry types/tests

## Tests

Add tests for:

- coordinate resolves to country and ADM1 for USA, Canada, UK;
- source with non-overlapping coverage is rejected;
- unknown coverage returns `needs_probe`, not `covered`;
- stale evidence queues refresh/probe;
- review-only sources are not operational unless explicitly requested;
- H3-only disclosure stays public-safe.

## Verification

Run:

- `npx tsc --noEmit`
- targeted registry/resolver tests
- DB migration dry-run or SQL parse/proof where available
- privacy check

Report coverage-aware source selection for public-safe USA, BC, England,
Scotland, and a generic global-fallback coordinate.

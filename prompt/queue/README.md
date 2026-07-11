# vmesh Prompt Queue

Private source of truth: `0xkri/vmesh` `main`.

This queue is ordered. Work top-down unless an operator explicitly reorders it.
VMesh is a land intelligence aggregator and source broker, not a heavy payload
warehouse. It stores source refs, coverage evidence, fetch recipes, provenance,
confidence, gaps, and review state. Downstream apps and workers execute recipes
and store/render payloads.

Machine-readable queue: `prompt/queue/vmesh-land-intelligence-queue.json`.

## Status Index

| Phase | Prompt                                                             | Status               | Purpose                                                          |
| ----- | ------------------------------------------------------------------ | -------------------- | ---------------------------------------------------------------- |
| 001   | `001-real-globe-renderer-architecture.md`                          | done                 | Globe renderer architecture.                                     |
| 002   | `002-earth-materials-light-dark.md`                                | done                 | Globe material polish.                                           |
| 003   | `003-globe-interaction-physics.md`                                 | done                 | Globe interaction.                                               |
| 004   | `004-search-flight-choreography.md`                                | done                 | Search and fly-to behavior.                                      |
| 005   | `005-overlay-h3-discipline.md`                                     | done                 | H3 overlay discipline.                                           |
| 006   | `006-globe-polish-qa-docs.md`                                      | done                 | QA and docs.                                                     |
| 007   | `007-usa-canada-dtm-dsm-viewer-source-ingestion.md`                | private-done-partial | USA/Canada DTM/DSM source-preview and adapter proof.             |
| 008   | `008-intel-tools-source-broker-processing.md`                      | private-done-partial | Intel Tools source-broker processing.                            |
| 009   | `009-firm-geospatial-source-review.md`                             | private-done-partial | Firm source review and promotion discipline.                     |
| 010   | `010-make-reviewed-geospatial-data-available-to-ba.md`             | private-done-partial | BA-facing reviewed source refs.                                  |
| 011   | `011-make-ecological-data-available-to-ba.md`                      | private-done-partial | BA ecosystem source refs.                                        |
| 012   | `012-global-stac-source-link-discovery.md`                         | private-done-partial | June discovery exists; current official refresh remains.         |
| 013   | `013-canonical-land-intelligence-resolver.md`                      | private-done-partial | Resolver exists; worldwide live proof remains under 037.         |
| 014   | `014-terrain-first-provider-proof.md`                              | private-done-partial | Regional terrain proofs exist; global closure remains under 032. |
| 015   | `015-jurisdiction-coverage-index.md`                               | private-done-partial | Routing index exists; refreshed registry persistence remains.    |
| 016   | `016-fetch-recipe-adapters.md`                                     | private-done-partial | Core adapters exist; 031-035 close remaining recipe families.    |
| 017   | `017-vector-built-environment-broker.md`                           | private-done-partial | Source ladders exist; worldwide executable proof remains.        |
| 018   | `018-soils-landcover-ecology-climate-broker.md`                    | private-done-partial | Typed source refs exist; materialization remains incomplete.     |
| 019   | `019-abundance-source-pack-handoff.md`                             | private-done-partial | Handoff is implemented; live all-layer packs remain incomplete.  |
| 020   | `020-operational-gates-live-proof-matrix.md`                       | private-done-partial | Partial evidence exists; 037 owns final worldwide matrix.        |
| 021   | `021-abundance-vmesh-seam-audit.md`                                | done                 | Audit the current cross-repo seam and exact gaps.                |
| 022   | `022-abundance-vmesh-handoff-contract.md`                          | done                 | Freeze the recipe-first Abundance handoff contract.              |
| 023   | `023-vmesh-abundance-resolver-mode.md`                             | done                 | Add VMesh resolver mode for Abundance.                           |
| 024   | `024-abundance-recipe-executor.md`                                 | private-done-partial | Build the Abundance-side recipe executor adapter.                |
| 025   | `025-terrain-slice-source-pack-proof.md`                           | private-done-partial | Fixture path exists; live worldwide terrain packs remain.        |
| 026   | `026-vector-mask-source-pack-proof.md`                             | private-done-partial | Fixture path exists; live vector/mask matrix remains.            |
| 027   | `027-anywhere-capability-tiers.md`                                 | private-done-partial | Tier policy exists; 032-037 provide worldwide evidence.          |
| 028   | `028-end-to-end-seam-proof-matrix.md`                              | private-done-partial | Partial matrix exists; 037 supersedes final acceptance.          |
| 029   | `029-layer-specific-source-ranking.md`                             | done                 | Deterministic per-layer source ranking for every data type.      |
| 030   | `030-source-capability-ledger-reconciliation.md`                   | in_progress          | Ledger ready; verified canonical persistence is CA/PAT-blocked.  |
| 031   | `031-official-stac-endpoint-refresh.md`                            | private-done-partial | 10 official endpoints live-probed; canonical ingest is blocked.  |
| 032   | `archive/completed/032-global-terrain-recipe-closure.md`           | done                 | Global COG floor and USGS 1 m upgrade are live-proven.           |
| 033   | `archive/completed/033-global-ecology-landcover-recipe-closure.md` | done                 | WorldCover COG context is live-proven without species claims.    |
| 034   | `archive/completed/034-global-buildings-recipe-closure.md`         | done                 | Overture live queries preserve semantics and valid empty.        |
| 035   | `archive/completed/035-non-stac-domain-api-closure.md`             | done                 | Live typed context plus explicit parcel/field gaps.              |
| 036   | `archive/completed/036-executable-source-promotion-gate.md`        | done                 | Evidence-backed promotion plus deterministic demotion.           |
| 037   | `037-global-any-coordinate-acceptance.md`                          | queued               | Prove the worldwide resolver and Abundance handoff matrix.       |

## Current Critical Path

The VMesh/Abundance seam is partially implemented, not fully resolved. The
current code can emit Abundance-oriented handoffs and Abundance can normalize
those into builder inputs/source-pack summaries. The remaining proof is:

Prerequisite source-slice and worker readiness are reconciled with Abundance on
`feat/v4-V0-visual-uplift`: `abundance-v2 a7dcf11` carries the 3 km
source-slice frame, `abundance-v2 303f7a9` carries GIS/GPU/palette preflight,
`abundance-v2 bba4941` carries the Kamloops coordinate proof runner, and
`abundance-v2 d949acc` marks the earlier queue state. The preflight accepts a
3 km VMesh source-slice handoff under fixture callbacks and fails closed for
missing or synthetic data. The runner can consume a VMesh Abundance handoff and
emit fixture-redacted builder-input, source-pack, runtime-bridge, and worker
readiness artifacts. This is not a live-provider proof.

1. `025-terrain-slice-source-pack-proof.md` - live/provider-backed terrain source
   packs from VMesh handoffs.
2. `026-vector-mask-source-pack-proof.md` - buildings, roads, water, landcover,
   vegetation, and masks from VMesh recipes.
3. `027-anywhere-capability-tiers.md` - honest quality tiers so "anywhere" means
   requestable, not uniformly Kamloops-quality.
4. `028-end-to-end-seam-proof-matrix.md` - public-safe matrix proving VMesh
   resolver -> Abundance source pack -> runtime-pack input across USA, BC,
   Canada non-BC, England, Scotland, and a generic fallback region.
5. `029-layer-specific-source-ranking.md` - deterministic 1-10 ranking ladders
   per source type so terrain, buildings, roads, water, soils, ecology,
   imagery, climate, parcels, and field boundaries are scored in their own way.

## Global Source Closure Tranche

Phases 030-037 are the current VMesh-only execution tranche. They convert the
large reviewed source inventory into an operational worldwide broker without
making VMesh a payload warehouse:

1. `030-source-capability-ledger-reconciliation.md` - reconcile June review,
   July adapters/evidence, phase 012, and stale queue statuses.
2. `031-official-stac-endpoint-refresh.md` - targeted official metadata and
   collection refresh for terrain, imagery, landcover/ecology, and hydrology.
3. `032-global-terrain-recipe-closure.md` - regional high-resolution upgrades
   over an honest global terrain/bathymetry floor.
4. `033-global-ecology-landcover-recipe-closure.md` - sourced global context
   without converting landcover into species or survey truth.
5. `034-global-buildings-recipe-closure.md` - official/Overture/OSM ladders,
   retained semantics, and valid empty results.
6. `035-non-stac-domain-api-closure.md` - typed weather, soils, roads, water,
   hydrology, parcel, and field source recipes.
7. `036-executable-source-promotion-gate.md` - operational selection only for
   sources with worker-executable recipes and current evidence.
8. `037-global-any-coordinate-acceptance.md` - all-continent, sparse, coastal,
   ocean, empty-building, anti-meridian, and high-latitude acceptance matrix.

Goal: `GOAL-global-any-coordinate-source-closure.md`.

## North Star

For any user-selected parcel, coordinate, H3 cell, or AOI, VMesh returns the
best open source package for that place:

```text
Mapbox selected parcel/point
  -> normalize AOI, H3, jurisdiction, and 3 km slice frame
  -> select terrain first, then vectors, hydro, soils, landcover, ecology, climate
  -> return source refs, fetch recipes, coverage proof, confidence, rejected sources, gaps
  -> downstream worker executes recipes and builds/render/stores payloads
```

No synthetic or generic fallback may be reported as source truth. Fallbacks are
allowed only when clearly labeled with lower confidence and role limits.

# vmesh Prompt Queue

Private source of truth: `0xkri/vmesh` `main`.

This queue is ordered. Work top-down unless an operator explicitly reorders it.
VMesh is a land intelligence aggregator and source broker, not a heavy payload
warehouse. It stores source refs, coverage evidence, fetch recipes, provenance,
confidence, gaps, and review state. Downstream apps and workers execute recipes
and store/render payloads.

## Status Index

| Phase | Prompt                                                 | Status               | Purpose                                                         |
| ----- | ------------------------------------------------------ | -------------------- | --------------------------------------------------------------- |
| 001   | `001-real-globe-renderer-architecture.md`              | done                 | Globe renderer architecture.                                    |
| 002   | `002-earth-materials-light-dark.md`                    | done                 | Globe material polish.                                          |
| 003   | `003-globe-interaction-physics.md`                     | done                 | Globe interaction.                                              |
| 004   | `004-search-flight-choreography.md`                    | done                 | Search and fly-to behavior.                                     |
| 005   | `005-overlay-h3-discipline.md`                         | done                 | H3 overlay discipline.                                          |
| 006   | `006-globe-polish-qa-docs.md`                          | done                 | QA and docs.                                                    |
| 007   | `007-usa-canada-dtm-dsm-viewer-source-ingestion.md`    | private-done-partial | USA/Canada DTM/DSM source-preview and adapter proof.            |
| 008   | `008-intel-tools-source-broker-processing.md`          | private-done-partial | Intel Tools source-broker processing.                           |
| 009   | `009-firm-geospatial-source-review.md`                 | private-done-partial | Firm source review and promotion discipline.                    |
| 010   | `010-make-reviewed-geospatial-data-available-to-ba.md` | private-done-partial | BA-facing reviewed source refs.                                 |
| 011   | `011-make-ecological-data-available-to-ba.md`          | private-done-partial | BA ecosystem source refs.                                       |
| 012   | `012-global-stac-source-link-discovery.md`             | queued               | Global STAC source discovery.                                   |
| 013   | `013-canonical-land-intelligence-resolver.md`          | queued               | Canonical coordinate/H3/AOI resolver route.                     |
| 014   | `014-terrain-first-provider-proof.md`                  | queued               | Terrain-first USA/Canada/UK live proof and fallback discipline. |
| 015   | `015-jurisdiction-coverage-index.md`                   | queued               | Coverage-aware source routing via jurisdiction/H3 index.        |
| 016   | `016-fetch-recipe-adapters.md`                         | queued               | Executable recipe adapters without storing heavy payloads.      |
| 017   | `017-vector-built-environment-broker.md`               | queued               | Buildings, roads, water, parcels, and open vectors.             |
| 018   | `018-soils-landcover-ecology-climate-broker.md`        | queued               | Land intelligence layers beyond vectors/terrain.                |
| 019   | `019-abundance-source-pack-handoff.md`                 | queued               | VMesh to Abundance source-pack handoff.                         |
| 020   | `020-operational-gates-live-proof-matrix.md`           | queued               | Gates, live-proof matrix, privacy, and regression discipline.   |

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

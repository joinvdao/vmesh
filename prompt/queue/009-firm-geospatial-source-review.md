# vmesh Phase 9: Firm Geospatial Source Review

You are Codex acting as a senior geospatial data platform reviewer.

## Goal

Perform a firm, evidence-based review of the geospatial source data currently known to VMesh before anything is promoted further for Building Abundance (BA).

This is a review gate, not a broad implementation phase. The outcome should clearly say which geospatial sources are ready, which are only configured, which need probing, which need license review, which are research-only, and which should be rejected or quarantined.

## Product Boundary

VMesh is the source aggregator and broker. It should do the slow source discovery, normalization, probing, ranking, and provenance work. BA should receive a fast, source-honest package of provider refs, STAC-like items, typed ecosystem records, fetch recipes, coverage state, confidence, and gaps.

Do not promote raw GIS payloads as the main product output. Do not store bulky provider data unless a retained cache/publication policy explicitly allows it.

## Inputs To Inspect

Start from local repo and retained artifacts:

- `docs/STAC_BROKER_CONTRACT.md`
- `docs/SYSTEM_DESIGN.md`
- `docs/PRODUCT_SCOPE.md`
- `docs/OPERATIONS.md`
- `docs/SECURITY_PRIVACY.md`
- `lib/geospatialPackage/`
- `lib/terrainSources.ts`
- `lib/imagerySources.ts`
- `lib/openMapSources.ts`
- `lib/macroSources.ts`
- `lib/intelSourceBroker.ts`
- `app/api/geospatial-package/`
- `tests/`
- `.artifacts/source-broker/intel-sidecar-source-broker-package.json`
- `.artifacts/terrain-source-preview/`
- `prompt/queue/007-usa-canada-dtm-dsm-viewer-source-ingestion.md`
- `prompt/queue/008-intel-tools-source-broker-processing.md`

If exact golden-site coordinates are needed for Kamloops/Rose or Alberta and are not already present as public-safe fixtures or local configured operator data, record that as a setup gap. Do not invent or commit exact private coordinates.

## Review Scope

Review these geospatial buckets first:

- `terrain_elevation`: DTM, DSM, DEM, LiDAR, point-cloud-derived terrain.
- `imagery_observation`: orthophoto, aerial imagery, Sentinel, public basemaps, observation rasters.
- `water_hydrology`: watersheds, streams, flood, drainage, water availability.
- `access_infrastructure`: roads, tracks, trails, utilities, access constraints.
- `land_property_planning`: parcels, cadastre-like refs, zoning, planning, environmental constraints.
- `soils_landcover`: soils, landcover, vegetation, agricultural capability.
- `climate_weather`: climate normals, forecasts, historical climate, solar, wind, fire-weather risk.

Treat `ecology_biodiversity_carbon`, `agriculture_operations`, and `community_economy` as adjacent ecosystem buckets. Mention obvious crossovers, but do not let them dilute this geospatial review.

## Review Questions

For each bucket, answer:

1. What sources are currently known?
2. What sources are BA-ready today?
3. What sources are only configured or planned?
4. Which sources have retained live-proof artifacts?
5. Which sources are source refs only, versus adapter-ready, versus viewer-ready?
6. Which sources have unclear license/access terms?
7. Which sources are noisy, duplicate, stale, or misclassified?
8. Which sources are missing for Kamloops/Rose and Alberta?
9. Which endpoints are machine-readable enough for a fast BA pipe?
10. Which sources should remain hidden from default UI but available to advanced/API mode?
11. For coordinate-led gaps, did the Intel Tools run complete a municipal/local-government search before accepting the gap?
12. If a municipal app/grid/catalog exposed one product, were sibling products checked from the same app, webmap, popup expressions, or grid?

## Source Status Definitions

Use these exact statuses:

- `ready_source_ref`: source has provider, public-safe URL, domain, geography, and acceptable access posture.
- `adapter_ready`: source has a known adapter/fetch recipe and enough metadata for BA to query or fetch.
- `viewer_ready`: source can be shown in the current VMesh viewer without being mislabeled as a fallback.
- `live_proof_ready`: a real provider produced retained public-safe evidence for the intended workflow.
- `configured_only`: code/config points at a source, but no retained live artifact proves it.
- `needs_probe`: source looks valuable but endpoint behavior is unverified.
- `needs_license_review`: access, reuse, or commercial posture is unclear.
- `research_only`: useful evidence, not an operational data source.
- `quarantine`: retained only as candidate intelligence or dedupe evidence.
- `reject`: unsuitable, unsafe, duplicate-only, unavailable, or too noisy.

## Hard Rules

- Do not call a source BA-ready from docs, mocks, static tests, or local build alone.
- Do not upgrade MapLibre/Mapzen/Mapterhorn/demo/fallback renderers into source truth.
- DTM cannot satisfy DSM. DSM cannot satisfy bare-earth DTM.
- Do not call LiDAR, DEM, DTM, DSM, orthophoto, hydrology, roads, buildings, or
  other coordinate-led geospatial data missing from provincial/national/global
  negative evidence alone. Require a municipal/local-government discovery pass,
  or classify the bucket as `needs_probe`.
- If an app/grid/catalog was used to prove one municipal product, review whether
  the same app exposes sibling product templates. Missing that check is a review
  blocker, not a valid data gap.
- Preserve negative evidence as negative evidence. A zero-feature provincial
  index result can coexist with a positive municipal source.
- Research papers and PDFs may explain or cite sources; they are not operational feeds unless they expose a usable endpoint.
- Do not expose secrets, tokens, signed URLs, private coordinates, exact private addresses, raw PII, or local machine paths.
- Do not commit heavy GIS payloads or raw scrape pages.

## Required Output

Write a retained review report under a public-safe docs or artifacts path chosen for this repo's conventions.

The report must include:

1. `executive_summary`
2. `bucket_readiness_matrix`
3. `sources_ready_for_ba`
4. `sources_not_ready_for_ba`
5. `live_proof_inventory`
6. `kamloops_rose_gap_assessment`
7. `alberta_gap_assessment`
8. `license_access_review_queue`
9. `probe_queue`
10. `rejected_or_quarantined_sources`
11. `recommended_ba_contract_changes`
12. `next_implementation_prompt`
13. `municipal_local_search_audit`
14. `negative_evidence_not_yet_a_gap`

Include counts by bucket and status. Include source IDs and provider refs, but redact any private or sensitive details.

## Verification

Run only the checks needed for a review/docs artifact unless code changes are made.

If code changes are made, run:

- `npm run format:check`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run privacy:check`

Every report must state:

- Code bar: docs-only or implementation plus tests/lint/build.
- Live bar: retained provider evidence or `live operation not proven`.
- Run class: `mock`, `dry-run`, `configured`, or `live-proof`.

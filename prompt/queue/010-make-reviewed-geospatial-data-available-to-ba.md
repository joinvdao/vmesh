# vmesh Phase 10: Make Reviewed Geospatial Data Available To BA

You are Codex acting as a senior source-broker and API engineer.

## Goal

After Phase 9 has produced a firm geospatial source review, expose only the approved geospatial source records to Building Abundance (BA) through a fast VMesh source-broker package.

BA should not scrape the web. BA should ask VMesh for a coordinate, H3 cell, or AOI package and receive the available source refs, STAC-like records, typed metadata, fetch recipes, coverage/gap state, confidence, warnings, and provenance.

## Required Precondition

Do not start implementation until a Phase 9 review report exists and explicitly lists sources approved for BA exposure.

If the review report is missing, incomplete, or only `configured_only`, stop and produce the missing review/gap list first.

## BA-Facing Output Shape

The output is not raw GIS data by default. It is a fast source package:

- STAC-compatible Items/Collections where spatial asset semantics fit.
- Typed VMesh source records where STAC alone is not expressive enough.
- Provider-native endpoint refs.
- Adapter and fetch recipes.
- H3 coverage summaries.
- Source role and product role.
- CRS, vertical datum, resolution, vintage, and bounds where known.
- License/access state.
- Probe/live-proof state.
- Confidence and limitations.
- Gaps and warnings.

Raw provider payloads, downloaded rasters, point clouds, raw scrape pages, private coordinates, private addresses, tokens, signed URLs, and secrets must not be returned or committed.

## Implementation Targets

Prefer small, typed changes around:

- `lib/geospatialPackage/types.ts`
- `lib/geospatialPackage/apiSurface.ts`
- `lib/geospatialPackage/planner.ts`
- `lib/geospatialPackage/sourceRegistry*.ts`
- `lib/intelSourceBroker.ts`
- `app/api/geospatial-package/plan/route.ts`
- `app/api/geospatial-package/sources/route.ts`
- `app/api/geospatial-package/intel-broker/route.ts`
- `scripts/export-intel-sidecar-source-broker.py`
- tests under `tests/`
- docs:
  - `docs/STAC_BROKER_CONTRACT.md`
  - `docs/SYSTEM_DESIGN.md`
  - `docs/OPERATIONS.md`
  - `docs/TESTING.md`

## API Contract

Add or tighten a BA-oriented response contract that can support:

```text
GET /api/geospatial-package/plan?lat={{PUBLIC_SAFE_LAT}}&lng={{PUBLIC_SAFE_LNG}}&segments=terrain_elevation,imagery_observation,water_hydrology,access_infrastructure,land_property_planning,soils_landcover,climate_weather
```

or an equivalent existing route.

Response sections should include:

1. `request`
2. `h3Context`
3. `stac`
4. `sourceRecords`
5. `fetchRecipes`
6. `coverage`
7. `liveProof`
8. `warnings`
9. `gaps`
10. `provenance`

Use explicit source roles such as:

- `bare-earth-dtm`
- `surface-dsm`
- `generic-dem`
- `imagery`
- `orthophoto`
- `roads`
- `buildings`
- `water`
- `hydrology`
- `soil`
- `landcover`
- `vegetation`
- `parcel-reference`
- `planning-constraint`
- `climate`
- `weather`
- `solar`
- `fire-weather`

## Promotion Rules

Expose a source to BA only if it is in one of these states:

- `ready_source_ref`
- `adapter_ready`
- `viewer_ready`
- `live_proof_ready`

Expose `configured_only`, `needs_probe`, `needs_license_review`, and `research_only` only as warnings/gaps unless the BA contract has an explicit `includeReviewQueue=true` or operator-only mode.

## BA Performance Requirement

The BA endpoint must be fast enough to avoid live web scraping during the BA user flow.

Implement this by using:

- checked-in/source-registry records;
- generated public-safe broker packages;
- local retained source manifests;
- explicit probe queues;
- optional cache refs with publication policy.

Do not add an implicit dependency on Intel Tools or sidecar DBs during normal BA requests.

## Evaluation Sites

Prioritize public-safe packages for:

- Kamloops / Rose golden evaluation site.
- Alberta golden evaluation site.

If exact coordinates are not public-safe or not configured locally, expose named evaluation setup gaps and test with public-safe city/region AOIs instead.

## Tests

Add or update tests for:

- BA package returns only approved geospatial records by default.
- `needs_probe`, `needs_license_review`, `research_only`, and `quarantine` records are not exposed as operational BA sources.
- DTM/DSM roles do not cross-satisfy each other.
- STAC-like records include stable IDs, roles, provider refs, and assets/links where applicable.
- Typed non-STAC records include segment, source role, endpoint type, license/access, confidence, and limitations.
- Secret-bearing URLs and private/local paths are redacted or rejected.
- Kamloops/Rose and Alberta requests return either public-safe packages or explicit setup gaps.

## Verification

Run:

- `npm run format:check`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run privacy:check`

If routes are changed, also run a retained local route proof for at least one public-safe coordinate/AOI and save the response artifact under the repo's artifact conventions.

Every run report must state:

- Code bar: implementation, tests, lint, build, and route verification.
- Live bar: retained provider evidence or `live operation not proven`.
- Run class: `mock`, `dry-run`, `configured`, or `live-proof`.

# vmesh Phase 12: Global STAC Source Link Discovery

You are Codex acting as a senior geospatial source-discovery and VMesh source-registry engineer.

## Goal

Create and run an Intel Tools discovery mission that builds a global index of STAC catalogs, STAC APIs, static STAC collections, and STAC-adjacent source endpoints relevant to VMesh.

VMesh is the source aggregator and source broker. Intel Tools should scrape and discover. VMesh should process, dedupe, verify, rank, and serve source refs through the source-registry DB and STAC/source-broker contract.

The first pass must begin by mining previous VMesh and Intel Tools geospatial outputs for STAC links before searching the open web. Do not treat the web as the first source if prior runs already found usable leads.

## Source Inputs

Start with local and operator-local artifacts where present:

- `.artifacts/source-broker/intel-sidecar-source-broker-package.json`
- `.artifacts/terrain-source-preview/`
- `$VMESH_INTEL_SIDECAR_ROOT/additive_geospatial_followup.db`
- `$VMESH_INTEL_SIDECAR_ROOT/additive_full_world_20260524.db`
- `$VMESH_INTEL_SIDECAR_ROOT/additive_reruns_20260523_live_v3.db`
- `$VMESH_LIME_WHIPPET_ROOT/artifacts/intel-tools`
- `$VMESH_LIME_WHIPPET_ROOT/artifacts/intel-source-discovery`
- `docs/GEOSPATIAL_SOURCE_REVIEW.md`
- `docs/SOURCE_REGISTRY_DB.md`
- `docs/STAC_BROKER_CONTRACT.md`
- `docs/OPERATIONS.md`
- `lib/geospatialPackage/`

Local operator defaults may resolve those roots, but committed prompts, docs, and generated public artifacts must not contain local machine usernames, exact private coordinates, exact private addresses, signed URLs, secrets, paid-provider order IDs, or bulky payloads.

## Discovery Scope

Find STAC and STAC-adjacent source endpoints for every region where VMesh may need source packages:

- Global and multi-country catalogs.
- Country/national catalogs.
- State/province/territory/regional catalogs.
- Municipal/local authority catalogs when they expose STAC or STAC-like endpoints.
- Academic and research catalogs.
- NGO/open-community catalogs.
- Private/provider catalogs only as explicit `paid`, `account_required`, or `license_review` entries.

Prioritize source categories:

- `terrain_elevation`: DEM, DTM, DSM, LiDAR, COPC/EPT, bathymetry, contours.
- `imagery_observation`: Sentinel, Landsat, orthophoto, aerial imagery, Planet, Maxar/Vantor-style commercial references, public basemap imagery.
- `water_hydrology`: floods, hydrography, wetlands, watersheds, snow/ice, water masks.
- `soils_landcover`: land cover, land use, soils, geology, field boundaries.
- `ecology_biodiversity_carbon`: habitat, species, canopy, biomass, carbon, protected areas.
- `climate_weather`: climate reanalysis, forecast, normals, drought, fire-weather, solar/wind where STAC-backed.
- `risk_hazard`: wildfire, landslide, earthquake, coastal, erosion, flood hazard.

## Seed STAC Endpoints

Include these as known seed records and expand outward from their links, providers, and references:

- Canada Geo.ca Datacube: `https://datacube.services.geo.ca/stac/api/`
- Canada HRDEM collections: `hrdem-mosaic-1m`, `hrdem-mosaic-2m`, `hrdem-lidar`
- Microsoft Planetary Computer: `https://planetarycomputer.microsoft.com/api/stac/v1`
- Planetary Computer 3DEP collections: `3dep-seamless`, `3dep-lidar-copc`, `3dep-lidar-dtm`, `3dep-lidar-dsm`, `3dep-lidar-hag`
- AWS USGS LiDAR static catalog: `https://usgs-lidar-stac.s3-us-west-2.amazonaws.com/ept/catalog.json`
- Element 84 Earth Search, if present in prior outputs.
- Any Copernicus, Sentinel, Landsat, NASA, NOAA, USGS, ESA, OpenTopography, or national mapping STAC endpoints found in previous VMesh/Intel outputs.

Mapterhorn may be used only as a source-family clue and fallback terrain provenance signal. Do not use Mapterhorn attribution to replace provider-native STAC provenance or to claim source-native accuracy.

## Intel Tools Run Prompt

Use this prompt in Intel Tools:

```text
You are running a global STAC source-discovery mission for VMesh.

VMesh is a source aggregator and broker. Your job is to find, classify, lightly probe, and structure STAC and STAC-adjacent source endpoints. Do not download large data payloads. Do not build final products. VMesh will process your output into its source-registry DB and serve downstream apps with fast STAC/source packages.

Phase 1: Mine prior outputs first.
- Search previous VMesh and Intel Tools geospatial runs for URLs, titles, notes, source records, and evidence containing:
  - "stac"
  - "/stac"
  - "STAC API"
  - "collections"
  - "catalog.json"
  - "pystac"
  - "planetarycomputer"
  - "earth-search"
  - "datacube.services.geo.ca"
  - "3dep"
  - "copc"
  - "ept"
  - "sentinel"
  - "landsat"
  - "cog"
- Extract every candidate endpoint and preserve the source artifact/run where it was found.
- Dedupe by canonical URL, provider, collection id, and dataset title.
- Do not treat duplicated links as noise if they prove the same endpoint was found by multiple runs; keep that as confidence evidence.

Phase 2: Global STAC discovery.
- Search official provider docs, STAC Index-like registries, GitHub references, cloud bucket catalogs, academic catalogs, and national open-data portals for STAC endpoints.
- Prefer official provider endpoints over third-party mirrors.
- Capture static STAC catalogs, STAC APIs, collection endpoints, and STAC-adjacent cloud catalogs that expose COG, COPC, EPT, Zarr, NetCDF, GeoParquet, or provider-native asset refs.
- For every country or region with a strong national mapping agency, record whether a STAC endpoint exists, no STAC was found, or only non-STAC machine-readable endpoints were found.

Cheap probes only:
- HTTP status and redirect target.
- Root/catalog JSON parse.
- STAC version/conformsTo if available.
- `/collections` availability for STAC APIs.
- collection count or sampled collection ids where cheap.
- asset role summary for sampled collections.
- license/access posture.
- whether the endpoint needs auth, payment, or account approval.

Do not:
- download full rasters, point clouds, scenes, or archives;
- store exact private coordinates or addresses;
- store secrets, tokens, signed URLs, cookies, or paid-order details;
- scrape private data;
- claim live-proof for heavy data access unless a real retained provider artifact proves it.

For each candidate, return:
- canonical_stac_id
- provider
- jurisdiction_level: global, country, state_province, municipal, private_sector, charity_local_agency, open_community, academic_research
- country_code and region_code where applicable
- endpoint_url
- endpoint_type: stac_api, stac_static, stac_collection, stac_adjacent_cloud_catalog, ept_catalog, copc_index, non_stac_machine_readable, html_catalog
- source_run_or_artifact_ref
- discovered_from_prior_run: true/false
- provider_homepage
- collection_ids_sample
- data_buckets
- source_roles
- asset_formats
- coverage_summary
- license
- auth_mode
- cost_posture
- machine_readability_score
- vmesh_relevance_score
- ba_relevance_score
- status: candidate, reviewed, probed, live_proof, blocked, license_gated, token_gated, paid_only, no_stac_found, research_only
- probe_result
- limitations
- recommended_vmesh_adapter
- recommended_next_probe

Return structured output with:
1. import_summary
2. prior_run_stac_links
3. global_stac_candidates
4. country_seed_catalogs
5. state_province_seed_catalogs
6. municipal_local_stac_candidates
7. stac_adjacent_non_stac_sources
8. blocked_or_license_gated_sources
9. duplicate_merge_hints
10. probe_results
11. remaining_country_gaps
12. recommended_vmesh_registry_updates
13. run_manifest
```

## VMesh Processing Prompt

After Intel Tools returns output, process it with this VMesh prompt:

```text
You are the VMesh STAC registry processing agent.

Input:
{{GLOBAL_STAC_INTEL_OUTPUT}}

Existing registry docs and code:
- docs/SOURCE_REGISTRY_DB.md
- docs/STAC_BROKER_CONTRACT.md
- docs/GEOSPATIAL_SOURCE_REVIEW.md
- lib/geospatialPackage/

Your job:
1. Import every STAC/STAC-adjacent candidate into quarantine.
2. Normalize canonical URLs, provider names, jurisdictions, collection ids, data buckets, source roles, and endpoint types.
3. Dedupe against existing VMesh source IDs and source refs.
4. Promote only source metadata, provider-native refs, probe evidence, and adapter recipes.
5. Keep heavy data payloads out of VMesh by default.
6. Produce registry DB rows for source_authorities, source_endpoints, source_collections, coverage_evidence, and source_runs.
7. Update VMesh docs with the promoted global STAC source ladder.
8. Create follow-up probes for high-value national/state/municipal STAC endpoints.

Promotion rules:
- `reviewed` requires plausible provider, jurisdiction, endpoint URL, and source category.
- `probed` requires a cheap retained endpoint probe.
- `live_proof` requires a real provider response retained under the intended VMesh workflow.
- `ready_source_ref` for BA requires acceptable access posture, useful source roles, and a fetch/query recipe.
- Private, paid, token-gated, license-unclear, or account-approval sources must stay out of default open-data output.

Return:
1. registry_import_summary
2. source_authorities_to_create
3. source_endpoints_to_create
4. source_collections_to_create
5. duplicates_to_merge
6. source_refs_ready_for_ba
7. advanced_api_only_sources
8. probe_queue
9. license_review_queue
10. rejected_or_blocked_sources
11. docs_updates_required
12. tests_or_privacy_checks_required
```

## Required Output

Create a retained public-safe run artifact under:

```text
.artifacts/source-registry/global-stac-discovery/
```

Minimum expected files:

- `global-stac-intel-output.json`
- `global-stac-registry-import.json`
- `global-stac-probe-results.json`
- `global-stac-discovery-report.md`

These artifacts are `dry-run` until a real Intel Tools run and real provider probes produce retained evidence. If live provider probes are executed, classify each proof individually as `live-proof` only when evidence is retained.

## Verification

Run only docs/privacy checks for prompt-only work. If code or exporter behavior changes, run:

- `npm run format:check`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run privacy:check`

Every report must state:

- Code bar: docs/prompt-only or implementation plus tests/lint/build.
- Live bar: retained provider evidence or `live operation not proven`.
- Run class: `mock`, `dry-run`, `configured`, or `live-proof`.


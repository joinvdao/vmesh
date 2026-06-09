# vmesh Phase 8: Intel Tools To BA Source Broker Processing

You are Codex acting as a senior data platform and geospatial/source-broker engineer.

## Goal

Process the existing Intel Tools sidecar outputs into a VMesh learning source registry and BA-ready source broker package.

VMesh is the data aggregator and source broker. Intel Tools scrape, discover, and gather evidence. VMesh processes, remembers, promotes, and serves source references, fetch recipes, provenance, confidence, and gaps.

The output must be clearly segmented so BA can request a coordinate/AOI package without scraping the web itself.

Priority evaluation sites:

- Kamloops / Rose golden evaluation site.
- Alberta golden evaluation site.

Do not commit exact private coordinates, private addresses, secrets, signed URLs, or bulky raw GIS/ecosystem payloads. If exact golden-site coordinates are not already available in public-safe repo fixtures or configured local operator data, record the coordinate requirement as a setup gap instead of inventing values.

## Source Inputs

Inspect the retained Intel Tools outputs before implementing:

- `$VMESH_INTEL_SIDECAR_ROOT/additive_full_world_20260524.db`
- `$VMESH_INTEL_SIDECAR_ROOT/additive_reruns_20260523_live_v3.db`
- `$VMESH_INTEL_SIDECAR_ROOT/additive_geospatial_followup.db`
- `$VMESH_INTEL_SIDECAR_ROOT/additive_eco_followup.db`
- `$VMESH_INTEL_SIDECAR_ROOT/vmesh_campaign_20260525.db`
- `$VMESH_LIME_WHIPPET_ROOT/artifacts/intel-tools`
- `$VMESH_LIME_WHIPPET_ROOT/artifacts/intel-source-discovery`

Local operator defaults may resolve those roots from the current user's home directory, but committed prompts, docs, generated packages, and test fixtures must not contain local machine usernames or absolute private paths.

Treat the sidecar DBs and artifacts as provenance and candidate intelligence, not authoritative production data.

## Prompt 1: Intel Tools Gap-Closing Run

Use this prompt when asking Intel Tools to close gaps in VMesh source coverage.

```text
You are running an Intel Tools discovery mission for VMesh.

VMesh is a data aggregator and source broker. Your job is not to produce final product data. Your job is to close known gaps by finding, classifying, and lightly verifying public or permissible data sources that VMesh can later process.

Target geography:
{{TARGET_GEOGRAPHY_OR_AOI}}

Target domains:
{{DOMAINS}}
Examples: terrain, LiDAR, orthophoto, hydrology, roads/access, parcels, planning constraints, soils, climate, biodiversity, markets, tools/resources, community, third spaces, education, property/land.

Known gaps:
{{KNOWN_GAPS}}

Existing VMesh sources to avoid duplicating:
{{EXISTING_SOURCE_SUMMARY}}

Coordinate/local discovery rule:
- For every coordinate-led or AOI-led geospatial run, identify the local
  municipality/city and the next local public bodies first: county, regional
  district, watershed/conservation authority, utility/public works body, tribal
  or Indigenous public data authority where applicable, and local planning/GIS
  offices.
- A negative provincial, state, territorial, national, or global catalogue result
  is not a real gap until the municipal/local-government pass is completed and
  recorded.
- If a municipal ArcGIS app, webmap, Experience Builder app, Hub site, or grid
  index exposes one useful product, inspect the app/webmap JSON and popup
  expressions for sibling product templates. Do not harvest only orthophoto or
  imagery links if the same grid also exposes DEM, DSM, LiDAR, contours, or
  other source products.
- Inspect ArcGIS `/sharing/rest/content/items/{id}/data`, webmap operational
  layers, MapServer/FeatureServer/ImageServer metadata, popup Arcade
  expressions, field aliases, `CELLNAME`/tile/grid identifiers, and direct static
  open-data URL patterns.
- Record both negative evidence and positive municipal evidence. Example failure
  mode to avoid: a provincial LiDAR index can be negative while a city download
  app exposes municipal LiDAR/DEM for the same area.

Discovery priorities:
1. Official government, academic, standards-body, NGO, utility, or direct provider sources.
2. Municipal/local-government sources before broader catalogues for coordinate-led runs.
3. Machine-readable endpoints first: STAC, ArcGIS REST, CKAN, OGC WMS/WFS/WCS/WMTS, public APIs, cloud buckets, direct downloads.
4. Metadata-rich catalog pages second.
5. PDFs/research papers only when they provide provenance, constants, or source leads.
6. Generic HTML, social pages, press releases, and blogs should be marked low-confidence unless they point to a real data endpoint.

For every candidate, capture:
- canonical source name
- provider/operator
- country, region, jurisdiction
- jurisdiction level: municipal, regional, provincial/state, national, global, provider, research
- source domain/layer
- official URL
- endpoint URL if present
- endpoint type
- parent app/catalog/webmap URL if the endpoint was discovered through an app
- sibling products discovered from the same app/grid/catalog
- data format
- coverage area or claimed geography
- bbox if discoverable
- CRS/vertical datum if discoverable
- resolution/scale if discoverable
- license/access/cost posture
- update cadence if discoverable
- machine-readability score
- VMesh relevance score
- BA relevance score
- evidence references
- reason this closes a known gap
- limitations, uncertainty, or blocked access
- municipal/local search status for coordinate-led runs
- negative-evidence dependencies, such as "provincial index negative but municipal pass incomplete"

Do not download large GIS payloads. Do not scrape private data. Do not retain secrets, exact private addresses, private coordinates, tokens, or signed URLs.

Perform only cheap probes where safe:
- HTTP status
- content type
- basic capability endpoint check
- ArcGIS layer metadata check
- STAC collections/search availability
- CKAN package/resource metadata
- OGC GetCapabilities
- ArcGIS app/webmap popup-expression extraction for direct download templates

Return structured output with these sections:
1. source_candidates
2. endpoint_candidates
3. probe_results
4. rejected_candidates
5. dedupe_hints
6. remaining_gaps
7. recommended_next_probes
8. run_manifest
9. municipal_local_search_log
10. app_grid_product_template_matrix
11. negative_evidence_register

Mark every candidate with one of:
- likely_ready_source
- needs_probe
- needs_license_review
- research_only
- noisy_candidate
- blocked
- negative_requires_municipal_search
```

## Prompt 2: VMesh Processing Run

Use this prompt when processing Intel Tools output into VMesh.

```text
You are the VMesh source-processing agent.

Intel Tools has returned scraped/discovered source intelligence. VMesh must now process it into a learning source registry. VMesh is not a scrape warehouse and should not store heavy GIS/ecosystem payloads by default.

Input:
{{INTEL_RUN_OUTPUT}}

Existing VMesh source registry:
{{EXISTING_VMESH_REGISTRY_SUMMARY}}

Current BA/user needs:
{{ACTIVE_PRODUCT_NEEDS}}

Your job:
1. Ingest all Intel candidates into quarantine.
2. Normalize messy records into stable VMesh source candidates.
3. Dedupe and merge aliases into canonical sources.
4. Classify each source by domain, geography, endpoint type, and product relevance.
5. Decide what can be promoted, what needs probing, what needs review, and what should be ignored.
6. Produce a broker-ready output that BA can use without scraping the web.

Processing rules:
- Never treat Intel output as authoritative final data.
- Promote only source references, endpoint recipes, metadata, provenance, and confidence states.
- Do not promote raw scraped pages, prompts, logs, private coordinates, secrets, signed URLs, or bulky payloads.
- Prefer official/machine-readable/provider-native endpoints.
- For coordinate-led geospatial runs, do not treat a terrain, imagery, LiDAR,
  DEM/DTM/DSM, hydrology, or vector bucket as truly missing unless the Intel run
  includes a municipal/local-government search log.
- If an Intel run found a municipal grid/app for one product, require evidence
  that sibling product templates were checked before closing adjacent buckets.
  For example, an orthophoto grid discovery should trigger DEM/LiDAR/DSM URL
  template checks in the same app or webmap.
- Preserve negative evidence separately from real gaps. "Provincial index
  returned zero features" is useful evidence, but it is not proof that municipal
  or local data is absent.
- Keep research papers and PDFs as provenance or constants evidence, not operational data feeds unless they expose a usable endpoint.
- Collapse duplicate URLs into one canonical source with multiple endpoints.
- Preserve all useful evidence and review decisions so VMesh gets smarter over time.

For each candidate, assign:
- canonical source ID
- source status:
  candidate, needs_probe, needs_review, ready_source_ref, adapter_ready, research_only, blocked, deprecated
- endpoint type:
  stac, arcgis_feature_server, arcgis_image_server, ckan, ogc, api_json, static_download, html_catalog, pdf, unknown
- jurisdiction level:
  municipal, regional, provincial_state, national, global, provider, research
- domain tags
- coverage metadata
- municipal/local search status
- sibling product/template discovery status
- negative evidence links
- source priority score
- confidence score
- license/access status
- recommended adapter
- fetch recipe if known
- review/probe action if not ready

Promotion criteria:
- ready_source_ref requires known provider, usable URL, domain classification, geography, and acceptable access posture.
- adapter_ready additionally requires a known adapter and enough metadata for BA to fetch/query.
- needs_probe means the source looks valuable but endpoint behavior is unverified.
- needs_license_review means access/commercial use is unclear.
- research_only means useful evidence but not a direct data source.
- blocked means unusable, inaccessible, risky, or legally unclear.

Return:
1. import_summary
2. canonical_sources_to_create
3. source_endpoints_to_create
4. aliases_or_duplicates_to_merge
5. endpoint_probes_to_schedule
6. sources_ready_for_BA
7. user_visible_sources
8. operator_review_queue
9. rejected_or_blocked_sources
10. remaining_gap_register
11. broker_response_examples
12. municipal_local_discovery_gaps
13. negative_evidence_not_yet_a_gap

The BA-facing output should be a fast source package, not raw GIS data:
- STAC-style spatial source refs where applicable
- ecosystem source records for non-GIS domains
- provider-native endpoints
- adapter/fetch recipes
- coverage and confidence
- license/access state
- gaps and warnings
```

## Required Segmentation

Segment all processed records into these BA-facing groups:

- `terrain_elevation`: DTM, DSM, DEM, LiDAR, point-cloud-derived terrain.
- `imagery_observation`: orthophoto, aerial imagery, satellite imagery, Sentinel, public basemaps.
- `water_hydrology`: watersheds, streams, flood, drainage, water availability.
- `access_infrastructure`: roads, tracks, trails, utilities, access constraints.
- `land_property_planning`: parcels, land ownership, zoning, planning, environmental constraints.
- `soils_landcover`: soil physics, soil hydraulic, landcover, vegetation, agricultural capability.
- `climate_weather`: normals, forecasts, historical climate, solar, wind, fire/weather risk.
- `ecology_biodiversity_carbon`: biodiversity, species, carbon protocols, habitat, restoration references.
- `agriculture_operations`: crop models, machinery, energetics, market inputs, robotics/tools.
- `community_economy`: markets, local producers, suppliers, third spaces, education, visitable projects, volunteers, apprenticeships.
- `research_only`: papers, standards, PDFs, constants evidence, non-operational references.
- `operator_review`: valuable but ambiguous records that need probe, license review, dedupe, or human approval.

## Processing Strategy

Use a promotion funnel:

1. Import every candidate into quarantine.
2. Normalize names, providers, URLs, geography, endpoint types, and domains.
3. Dedupe aggressively into canonical sources and endpoint aliases.
4. Auto-downgrade obvious noise.
5. For coordinate-led geospatial sources, check whether municipal/local search
   evidence exists before accepting a gap conclusion.
6. Prioritize active BA geographies, especially Kamloops/Rose and Alberta.
7. Probe only high-value, likely machine-readable endpoints first.
8. Promote only usable source references and fetch recipes.
9. Preserve rejected, blocked, and research-only decisions so future Intel runs do not repeat work.

## Implementation Targets

Prefer small, reviewable additions around:

- importer/exporter scripts under `scripts/`
- source-broker types under `lib/`
- geospatial package/source registry modules under `lib/geospatialPackage/`
- BA-facing API routes under `app/api/geospatial-package/`
- docs:
  - `docs/STAC_BROKER_CONTRACT.md`
  - `docs/SYSTEM_DESIGN.md`
  - `docs/OPERATIONS.md`
  - `docs/TESTING.md`

Do not add runtime dependency on the sidecar DB paths for production. Sidecar ingestion should be explicit, local, auditable, and reproducible.

## Verification

Run at minimum:

- `npm run format:check`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run privacy:check`

Every run report must state:

- Code bar: implementation, tests, lint, build, and local verification.
- Live bar: whether a real external provider produced retained evidence.
- Run class: `mock`, `dry-run`, `configured`, or `live-proof`.

Do not call the BA source-broker path production-ready until retained `live-proof` exists for at least one public-safe Kamloops/Rose or Alberta source package.

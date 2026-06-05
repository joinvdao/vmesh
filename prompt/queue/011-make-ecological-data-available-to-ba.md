# vmesh Phase 11: Make Ecological Data Available To BA

You are Codex acting as a senior ecosystem data and source-broker engineer.

## Goal

Make ecological and ecosystem data available to Building Abundance (BA) through VMesh's source-broker contract without turning VMesh into a heavy raw-data store.

This phase follows the geospatial review/exposure work. It should use the same source-honest discipline, but the output is often typed ecosystem source records rather than raw GIS or pure STAC.

## Product Boundary

VMesh should aggregate, normalize, rank, and serve source refs, endpoint recipes, H3 summaries, provenance, review state, and limitations.

BA should receive a fast package of ecological/ecosystem context around a coordinate, H3 cell, or AOI. BA should not scrape the web itself.

VWiki should receive generic education, methods, standards, protocols, and explainers when the material is not place/source-specific enough for VMesh's source broker.

## Ecological Scope

Prioritize these ecosystem categories:

- `ecology_biodiversity_carbon`: biodiversity, species occurrence, habitat, conservation constraints, restoration references, carbon protocols, ecosystem services.
- `soils_landcover`: soil ecology, landcover, vegetation, ecological condition.
- `water_hydrology`: wetlands, riparian systems, watersheds, aquatic habitat, drought/flood context.
- `climate_weather`: climate normals, seasonal stressors, fire-weather, drought indices, growing conditions.
- `agriculture_operations`: regenerative agriculture methods, crop/field context, machinery/energy only when relevant to ecological operations.
- `community_economy`: local ecological projects, restoration groups, nurseries, education, volunteers, visitable projects, and third spaces.
- `research_only`: papers, standards, protocols, constants, and non-operational references.

## Source Classes

Classify candidates into:

- `operational_endpoint`: API, STAC, ArcGIS, CKAN, OGC, direct download, or catalog with machine-readable resources.
- `source_reference`: authoritative source page or catalog that points to usable data but lacks direct fetch details.
- `method_reference`: protocol, standard, paper, guide, or methodology.
- `knowledge_reference`: generic education or explainer material that should be handed to VWiki.
- `local_project_reference`: public-safe project/org/resource reference with place association.
- `review_only`: useful but not safe or ready for BA.
- `reject`: noisy, duplicate, unsafe, inaccessible, or not relevant.

## BA-Facing Output Shape

Return typed ecosystem source records, and STAC-compatible records only where spatial asset semantics fit.

Response sections should include:

1. `request`
2. `h3Context`
3. `ecosystemRecords`
4. `stacRecords`
5. `sourceReferences`
6. `knowledgeReferences`
7. `fetchRecipes`
8. `coverage`
9. `confidence`
10. `warnings`
11. `gaps`
12. `provenance`

For each record include:

- stable source ID
- category/segment
- provider/operator
- jurisdiction/coverage
- endpoint/source URL with secrets redacted
- endpoint type
- spatial binding: `spatial`, `place_associated`, `non_spatial_reference`, or `internal`
- H3 relevance where known
- license/access state
- data freshness/update cadence where known
- confidence score
- limitations
- review state
- BA display mode:
  - `default_user_ui`
  - `advanced_user_view`
  - `api_downstream_mode`
  - `operator_review_mode`
  - `hidden_internal_processing`

## Display And API Rules

- Do not show all ecosystem data in the default VMesh UI.
- Default UI may show short reviewed ecological snippets and source cards only.
- Advanced/API mode can expose richer ecosystem records.
- Research-only and method references should usually go to advanced/API or VWiki, not default UI.
- Agent-generated summaries are drafts until reviewed.
- Local project/org references must avoid raw PII, scraped contact data, exact private addresses, and unsafe targeting.

## Inputs To Inspect

Inspect:

- `.artifacts/source-broker/intel-sidecar-source-broker-package.json`
- `lib/intelSourceBroker.ts`
- `lib/geospatialPackage/sourceRegistryEnvironment.ts`
- `lib/geospatialPackage/sourceRegistryClimate.ts`
- `lib/geospatialPackage/sourceRegistryOpenData.ts`
- `lib/macroSources.ts`
- `docs/STAC_BROKER_CONTRACT.md`
- `docs/SYSTEM_DESIGN.md`
- `docs/PRODUCT_SCOPE.md`
- `docs/SECURITY_PRIVACY.md`
- `prompt/queue/008-intel-tools-source-broker-processing.md`

Also inspect the new VWiki repo if present locally for compatible knowledge-reference contracts, but do not add a hard runtime dependency unless explicitly approved.

## Processing Strategy

1. Start with the current Intel sidecar package and source registries.
2. Count ecological/ecosystem candidates by category and status.
3. Quarantine noisy candidates and duplicates.
4. Promote only authoritative and public-safe source refs.
5. Keep PDFs, methods, and standards as method/knowledge refs unless they expose operational endpoints.
6. Produce BA-ready ecosystem records for approved sources.
7. Produce VWiki handoff records for generic education and methods.
8. Produce a gap list for ecological source discovery runs.

## Priority Evaluation Sites

Prioritize:

- Kamloops / Rose golden evaluation site.
- Alberta golden evaluation site.

If exact coordinates are not public-safe or not configured locally, return named setup gaps and use public-safe region labels or city/region AOIs for dry-run testing.

## Tests

Add or update tests for:

- ecological records are available through BA API mode without appearing in default UI by default.
- research-only records do not become operational ecosystem data.
- knowledge/method references can be returned as VWiki handoff refs.
- records include spatial binding and display mode.
- unsafe URLs, private paths, signed URLs, raw contact data, and exact private addresses are rejected/redacted.
- Kamloops/Rose and Alberta packages return ecological records or explicit source gaps.

## Verification

Run:

- `npm run format:check`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run privacy:check`

If routes are changed, run retained local route proof for a public-safe ecological/evaluation query.

Every run report must state:

- Code bar: implementation, tests, lint, build, and route verification.
- Live bar: retained provider evidence or `live operation not proven`.
- Run class: `mock`, `dry-run`, `configured`, or `live-proof`.

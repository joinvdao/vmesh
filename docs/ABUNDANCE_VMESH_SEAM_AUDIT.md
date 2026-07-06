# Abundance / VMesh Seam Audit

Generated: 2026-07-06

Status: partially operational.

The current pipe has strong components, but it is not yet one end-to-end
VMesh-to-Abundance source-pack path for all data types. VMesh can return
reviewed source refs and some worker handoffs; Abundance and the builder repos
can execute local site-package adapters and Rose runtime builders; the seam
between those systems is only complete for a narrow building-source ordering
handoff and for isolated terrain worker tests.

## Current Flow

```text
Abundance coordinate route
  -> app/api/site-runtime-pack/route.ts
  -> deterministic synthetic 33x33 terrain fallback for non-fixture coordinates
  -> empty roads/buildings and missing semantic masks
  -> site-runtime-pack.v1
```

```text
Rose/Kamloops builder
  -> scripts/site-config/rose-kamloops.json
  -> scripts/build-rose-runtime-source-pack.py
  -> local 3 km Rose source pack with retained terrain, vectors, masks, and provenance
  -> Abundance runtime adapters / world-state conversion
```

```text
VMesh package routes
  -> /api/geospatial-package/ba
  -> vmesh-ba-geospatial-package-v1 source refs and fetch recipes
  -> /api/geospatial-package/buildings
  -> vmesh-building-package-worker-v1 planned buildings.json handoff
```

## Desired Flow

```text
User parcel/point/H3/AOI
  -> 3 km source-slice frame and redacted AOI disclosure
  -> VMesh resolver
  -> vmesh-abundance-source-handoff-v1
  -> Abundance recipe executor
  -> site-package payloads: terrain, roads, buildings, water, landcover, masks, provenance
  -> runtime-pack input
```

VMesh should return refs, recipes, evidence, confidence, and gaps. Abundance
and builder workers should execute recipes and store generated payloads.

## Route And Builder Inventory

### VMesh

- `app/api/geospatial-package/ba/route.ts` exposes
  `createBaGeospatialPackage`.
- `lib/geospatialPackage/baPackage.ts` defines
  `vmesh-ba-geospatial-package-v1`, segments, source records, STAC-like
  records, fetch recipes, coverage, live proof, warnings, and gaps.
- `lib/geospatialPackage/baPackage.ts` maps BA segments to terrain,
  imagery, water/hydrology, roads/buildings, parcels, soils/landcover, and
  climate/weather.
- `lib/geospatialPackage/buildingPackageWorker.ts` defines
  `vmesh-building-package-worker-v1` and emits a planned `buildings.json`
  worker contract with a source ladder.
- `lib/geospatialPackage/terrainWorker.ts` defines
  `vmesh-terrain-package-worker-result-v1` and
  `vmesh-terrain-package-manifest-v1`.
- `lib/geospatialPackage/terrainSourceAdapters.ts` has source-native adapter
  planning for `usgs-3dep`, `usgs-3dep-lpc-dsm`, `canada-hrdem`,
  `canada-hrdem-best-dtm`, `canada-hrdem-dsm`, `bc-lidarbc`, and
  `bc-lidarbc-dsm`.
- `lib/geospatialPackage/sourceRegistry*.ts` catalogues terrain, Overture/OSM,
  hydro, soils, landcover, climate, imagery, Microsoft/Google/global building
  candidates, and UK terrain candidates.
- `docs/GEOSPATIAL_SOURCE_REVIEW.md` states terrain is the strongest live-proof
  area; most non-terrain buckets are `ready_source_ref` or configured/review
  only.
- `docs/INTEL_VMESH_HANDOFF_STATUS.md` says the durable Intel registry exists
  with parameterized recipes, but the HTTP broker route and coverage-aware
  filtering are still pickup work.

### Abundance App

- `app/api/site-runtime-pack/route.ts` returns the Kamloops golden fixture when
  requested, but arbitrary coordinates currently generate synthetic fallback
  terrain, empty buildings/roads, and missing semantic masks.
- `utils/sitePackageAdapters/terrain.ts` can run terrain adapters when a
  `terrainRasterQuery` is attached.
- `utils/sitePackageAdapters/overture.ts` can hydrate roads and buildings when
  Overture row queries are attached.
- `utils/sitePackageAdapters/buildings.ts` can hydrate Microsoft/global
  building payloads from configured bounded endpoints.
- `utils/sitePackageAdapters/landIntelligence.ts` can hydrate semantic ground
  masks when a `semanticGroundQuery` is attached; otherwise many layers remain
  metadata/context only.
- `utils/sitePackageWorker.ts` runs adapters and passes optional
  `terrainRasterQuery`, `overtureRoadRowsQuery`, `overtureBuildingRowsQuery`,
  and `semanticGroundQuery`.
- `utils/sitePackagePayloadStore.ts` can read/write terrain, roads, buildings,
  climate, hydrology, landcover, environment, imagery, parcel, semantic ground,
  and provenance payloads.
- `utils/worldStateFromSourcePackage.ts` converts Rose source packages into the
  runtime planning world state and carries roads, buildings, water, vegetation
  masks, terrain rails, and mask refs.

### Builder Repo

- `scripts/rose_site_config.py` loads `scripts/site-config/rose-kamloops.json`.
  Slice 002-style parameterization exists, but the default config is still Rose.
- `scripts/build-rose-runtime-source-pack.py` imports Rose diorama constants and
  uses the active site config for paths, frame, CRS, terrain rail order, vector
  draw order, and material names.
- `scripts/build-rose-runtime-source-pack.py` accepts the VMesh building handoff
  via `resolve_vmesh_building_handoff_path`, reads it, and uses
  `building_source_order_from_handoff`.
- `scripts/vmesh_building_handoff.py` validates only
  `vmesh-building-package-worker-v1` and translates VMesh building source ids
  into builder source ordering.

## Data-Type Coverage

| Data type                    | VMesh state                                                                                                                             | Worker / Abundance state                                                                                                                       | Seam state                                                                      |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| DTM terrain                  | USA/Canada/BC source-native refs and worker tests exist. UK terrain is catalogued but not in the VMesh source-native adapter allowlist. | Abundance adapters can ingest terrain when a `terrainRasterQuery` is provided. Coordinate runtime route still uses synthetic fallback.         | Partial. No canonical VMesh handoff -> Abundance terrain executor path.         |
| DSM/surface terrain          | USGS LPC, Canada HRDEM DSM, and LidarBC DSM are modelled and tested in VMesh.                                                           | Runtime pack can preserve ground model role; source packages can carry terrain rails.                                                          | Partial. No unified source handoff.                                             |
| Roads                        | VMesh returns OSM/Overture source refs.                                                                                                 | Abundance Overture road adapter can normalize rows when an Overture row query is provided.                                                     | Partial. Recipe execution not wired from VMesh.                                 |
| Buildings                    | VMesh has a dedicated planned building worker handoff.                                                                                  | Builder accepts that handoff for source ordering; Abundance can hydrate Overture/Microsoft/global building payloads when rows/endpoints exist. | Narrowly partial. It does not materialize footprints by itself.                 |
| Water / hydrology            | VMesh returns HydroSHEDS, OSM, and Overture refs.                                                                                       | Abundance has hydrology/environment payload stores and semantic ground support.                                                                | Source-ref only; no VMesh execution seam.                                       |
| Vegetation / landcover masks | VMesh returns landcover/ecology refs.                                                                                                   | Abundance can persist landcover/environment/semantic-ground payloads; Rose runtime exposes vegetation as a mask/ref.                           | Partial. Occupancy cells / decoded masks are not guaranteed from VMesh handoff. |
| Soils                        | VMesh has SoilGrids and SSURGO/gSSURGO refs.                                                                                            | Abundance can store environment/landcover context payloads.                                                                                    | Source-ref only.                                                                |
| Climate / weather            | VMesh has Open-Meteo, NASA POWER, ERA5 style context refs.                                                                              | Abundance has climate context payload storage.                                                                                                 | Source-ref only.                                                                |
| Imagery                      | VMesh exposes Sentinel source refs; Mapbox is token-gated and excluded as operational source truth.                                     | Abundance has imagery context adapters and Sentinel SR handoff boundaries.                                                                     | Source-ref/context only unless a worker is attached.                            |
| Parcels / property           | VMesh reports land-property planning as gap/review by default.                                                                          | Abundance can carry parcel boundary payloads and local glowing boundary context.                                                               | Not operational as source truth by default.                                     |

## Missing Handoff Fields

The canonical handoff still needs one schema that can drive Abundance without
out-of-band interpretation:

- `schemaVersion: "vmesh-abundance-source-handoff-v1"`;
- request frame: slice center disclosure, H3/jurisdiction, edge meters, grid
  target, and parcel-boundary overlay role;
- per-layer source package entries: terrain, DSM, roads, buildings, water,
  landcover/vegetation, soils, climate, imagery, parcels;
- source ids, adapter ids, source roles, ground-model role, nominal resolution,
  source vintage, provider, license, attribution, confidence tier, and gaps;
- executable recipe type: STAC search, ArcGIS FeatureServer query,
  GeoParquet bbox query, COG/GeoTIFF window, WCS, Overpass/OSM, configured local
  artifact, or blocked/manual-review;
- sanitized input refs or templates with no signed URLs, secrets, exact private
  coordinates, or local paths;
- expected Abundance payload kind and output contract for each layer;
- AOI coverage proof requirements and fail-closed conditions;
- semantic mask / vegetation occupancy output requirements;
- rejected source list and reason codes.

## Tests Run

VMesh:

```text
npm test -- tests/baGeospatialPackage.test.ts tests/baEcosystemPackage.test.ts tests/buildingPackageWorker.test.ts tests/terrainPackageWorker.test.ts tests/terrainSourceAdapters.test.ts tests/geospatialPackageApiSurface.test.ts tests/geospatialPackageSecurity.test.ts
7 files passed, 72 tests passed

npx tsc --noEmit
passed

npm run privacy:check
passed
```

Abundance app:

```text
npm test -- tests/integration/siteRuntimePackRoute.test.ts tests/unit/siteRuntimePackProviderMatrix.test.ts tests/unit/siteRuntimePackMasks.test.ts tests/unit/siteRuntimePackOvertureVectors.test.ts tests/unit/sitePackageTerrainHydration.test.ts tests/unit/sitePackageRoadHydration.test.ts tests/unit/sitePackageBuildingHydration.test.ts tests/unit/sitePackagePayloadValidation.test.ts
8 files passed, 41 tests passed
```

Builder repo:

```text
npm test -- tests/unit/vmeshBuildingHandoff.test.ts tests/unit/vmeshPregamePipeline.test.ts tests/unit/sitePackageTerrainHydration.test.ts tests/unit/sitePackageRoadHydration.test.ts tests/unit/sitePackageBuildingHydration.test.ts tests/unit/sitePackagePayloadValidation.test.ts tests/unit/sitePackageWorkerRunner.test.ts
7 files passed, 39 tests passed
```

These tests prove isolated source refs, adapter behavior, hydration, and the
building handoff bridge. They do not prove a VMesh resolver handoff can generate
an Abundance source pack for every data type.

## Risks

- The app coordinate runtime route is still intentionally synthetic for
  non-fixture coordinates, so it cannot be used as proof of any-location data
  quality.
- Terrain has the strongest source-native proof, but source-native support is
  currently strongest for USA/Canada/BC; UK support is split between source
  registry and Abundance-side adapters.
- Roads/buildings depend on materializing Overture/OSM/other vector rows from
  recipe refs; source refs alone can still produce empty rendered layers.
- Vegetation may render bare if the source-pack path carries only a coverage
  fraction or redacted mask ref and not decoded occupancy cells or fetchable
  semantic masks.
- The durable Intel registry has many parameterized recipes, but VMesh app still
  needs the HTTP broker and coverage-aware filtering before it can be the
  operational resolver for all buckets.
- Land-property/parcel truth remains review-gated and should not be claimed as
  legal boundary truth.

## Next Implementation Order

1. Freeze `vmesh-abundance-source-handoff-v1` in VMesh with layer entries,
   recipe entries, expected Abundance payload kinds, confidence, gaps, and
   privacy rules.
2. Add a VMesh Abundance resolver mode that composes the current BA source
   package, terrain source adapter plan, building handoff ladder, and source
   registry candidates into that one handoff.
3. Add an Abundance/builder recipe executor adapter that maps handoff entries to
   existing `terrainRasterQuery`, `overtureRoadRowsQuery`,
   `overtureBuildingRowsQuery`, `semanticGroundQuery`, and payload-store writes.
4. Generate one terrain source-pack proof from the VMesh handoff and verify DTM
   role, resolution, confidence, provenance, and fail-closed generic fallback.
5. Generate vector/mask source-pack proofs and verify non-empty roads,
   buildings, water, semantic masks, vegetation occupancy, and no synthetic fill.
6. Publish a capability tier matrix for USA, BC, Canada non-BC, England,
   Scotland, and generic fallback samples.

## Verdict

The seam is not fully resolved. It is partially operational:

- source discovery and registry inventory exist;
- reviewed BA source refs exist;
- terrain worker proof exists for selected providers;
- a building-specific handoff exists;
- Abundance can execute local adapters when the right worker callbacks are
  supplied;
- arbitrary-coordinate runtime-pack generation still falls back to synthetic
  data, and there is no single all-layer VMesh handoff/executor path yet.

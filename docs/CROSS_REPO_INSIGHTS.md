# Cross-App Substrate Insights

This document records public-safe insights for making vmesh usable by downstream apps without coupling those apps to provider-specific geospatial logic.

The goal is to share durable patterns: source registries, package manifests, provider research, interface lessons, provenance rules, evaluation fixtures, and implementation constraints. Downstream apps should be able to request data packages from vmesh and consume clean URLs/manifests instead of hard-coding provider branches.

## Product Boundary

vmesh is the reusable geospatial substrate:

- source registry;
- source probes;
- package planner;
- PMTiles/vector/raster package contracts;
- cache/index contracts;
- provider metadata;
- attribution and provenance;
- simple API and future MCP-facing tool surface.

Downstream apps remain free to build their own UI, simulation, reporting, advisory, or editing experiences on top of these packages.

## Shared Insight Workflow

1. Capture the insight where it was discovered.
2. Strip private context, local-only planning details, secrets, paid-provider credentials, personal data, exact private addresses, and unpublished operational commitments.
3. Add a short public-safe summary to this file or a provider/source doc.
4. If the insight changes implementation, create a public GitHub issue.
5. If the insight is reusable code, start with a manifest, schema, or fixture. Promote it to a shared package only after the contract stabilizes.
6. Keep source links and licensing notes with every provider or dataset insight.

Suggested insight ID format:

```text
INSIGHT-YYYYMMDD-short-slug
```

Suggested fields:

```text
ID:
Source:
Affected contracts:
Summary:
Decision or lesson:
Provider/license/privacy notes:
Next public issue:
```

## What Can Be Shared

- Provider metadata models and normalization patterns.
- Public source research and licensing notes.
- Safe schema fragments, TypeScript interfaces, JSON fixtures, and manifest examples.
- Public evaluation coordinates when they are not private homes, sensitive sites, or exact user locations.
- UX patterns, renderer findings, and performance constraints.
- Public build-log or livestream learnings.
- Agent workflow improvements that do not mention private systems.

## What Must Not Be Shared

- API keys, provider tokens, paid-service credentials, or `.env.local` values.
- Private task systems, private tickets, local vault metadata, or private planning exports.
- Exact private addresses, raw PII, sensitive infrastructure locations, or user contact details.
- Scraped property listings or terms-uncleared datasets.
- Provider quote/order details that are not intended for public release.
- Live radio/network identities, Reticulum keys, Meshtastic PSKs, contact books, or local hub secrets.
- Downloaded terrain, imagery, parcel, or climate payloads that are not sanitized fixtures.

## Package Service Loop

vmesh should develop high-fidelity geospatial package contracts for terrain role, CRS, vertical datum, imagery, buildings, roads, parcels, hydrology, vegetation, provenance, and fidelity ladders.

Downstream apps should consume the resulting package manifests, app-ready tile URLs, and H3/source summaries without knowing whether the data came from Mapterhorn, Mapzen, OSM, Overture, Sentinel, a regional DTM, or a local cache.

vmesh is both a standalone atlas and an async package service. The public contract should be generic: a downstream app sends an AOI/H3 request, vmesh returns a source plan and cache/job metadata, workers create or refresh package artifacts, and consumers read clean manifest URLs. The public vmesh repo should not identify private consumer repos, exact user locations, local paths, provider credentials, paid quotes, or unpublished roadmaps.

The current cross-app target is a boundary-first property treatment package:

```text
selected H3 / AOI / property boundary
  -> vmesh source plan
  -> CPU/GPU package workers
  -> PMTiles / COG / GeoParquet / H3 summaries / map plates / manifests
  -> downstream app import
```

Standard packages use open data such as Sentinel-2 L2A, SCL cloud masks,
SEN2SRLite, open terrain, OSM/Overture, Open-Meteo, and NASA POWER. Premium
packages use licensed orthophoto/satellite, DEM/DTM/DSM, parcel/title/survey,
and richer weather/climate feeds only when terms permit storage, processing,
export, and downstream use.

Semantic scene annotations should travel as data, not only burned-in overlay
text. A downstream app may create labels for visible features such as trees,
rocks, rooflines, streets, field edges, water edges, posts, cars, and material
cues. vmesh can store these as `scene-annotations.json`, H3-attached
`visual-observation` records, or GeoJSON/PMTiles overlays when georegistration is
available. These annotations help prompt preparation, report notes, generated
world recognisability, and QA, but they do not become measured geometry or legal
truth without reviewed geospatial anchoring.

Public cached PMTiles are a good delivery primitive for open/generalized layers.
Private property packages, paid provider outputs, exact user boundaries, report
assets, and generated downstream outputs require signed URLs, authenticated tile
proxies, owner-private object refs, or local hub storage. Auth must protect the
data URL itself, not only the browser UI.

Shared contracts to watch:

- `GeospatialPackagePlan`
- `GeospatialSourceCandidate`
- `SourceProbeResult`
- `PackagePlanArtifact`
- `DataPackageManifest`
- `SourceProvenance`
- `H3CoverageSummary`
- `PropertyTreatmentPackageManifest`
- `WeatherLedger`
- `SceneAnnotation`

## Solar, Wind, And Sector Loop

vmesh should own the macro contracts for solar access, wind roses, and climate-sector maps. These belong in the atlas substrate because they depend on terrain, climate, source provenance, and H3 summaries.

Downstream apps can turn these into reports, playbooks, design constraints, or interactive local workflows, but vmesh should preserve the source-honest summaries and limitations.

Shared contracts to watch:

- `SolarAccessSummary`
- `WindRoseSummary`
- `ClimateSectorMap`
- `SectorInfluence`
- `SunPathSummary`
- `TerrainHorizonProfile`

Sharing boundary:

- Terrain-only shading is not building/tree shading.
- Wind roses are climate/design context, not structural wind engineering.
- Sector maps are inspectable design intelligence, not official hazard analysis or automated prescriptions.
- Private AOIs, exact user sites, and local package caches must not enter public docs or Git.

## Playbook Loop

Hub playbooks should remain app-consumable rather than UI-specific. vmesh should expose selected-hex checklists, local assets, needs/offers, package evidence, and hub readiness state in typed records.

Downstream apps can render those records as dashboards, games, reports, local checklists, or agent workflows.

Shared contracts to watch:

- `HubPlaybookCard`
- `HubReadinessChecklist`
- `LocalAsset`
- `NeedOfferRecord`
- `UserRecord`

## Parcel And Property Loop

Property intelligence and land-boundary handling should remain source-honest. vmesh should attach parcel objects to H3 cells, while keeping H3 separate from legal boundary geometry.

Shared contracts to watch:

- `ParcelCandidate`
- `BoundarySource`
- `MetesBoundsDraft`
- `BoundaryConfidence`
- `PropertySignalSummary`

Rules:

- Legal boundary claims require official, reviewed source provenance.
- AI-parsed deed geometry is draft geometry unless reviewed.
- H3 cells are aggregation/index cells, not parcels.
- Public packages must avoid exact private addresses unless the source is lawful and the product has explicit privacy handling.

## Provider Research Loop

vmesh is the natural home for provider registries because it has explicit basemap, terrain, imagery, macro, micro, package, and communications boundaries.

Shared contracts to watch:

- `BasemapProviderConfig`
- `TerrainProviderConfig`
- `OpenMapSourceConfig`
- `ImageryProviderConfig`
- `MacroProviderConfig`
- `ClimateDataSourceConfig`
- `GeospatialSourceCandidate`
- `ProviderStatus`

Provider notes imported from downstream package research should be normalized into public-safe categories:

- terrain/global: Mapterhorn, Mapzen/Joerd, Copernicus DEM, NASADEM, AW3D30, SRTM, GEDTM30, FABDEM, EarthDEM, and coastal/topobathy candidates such as CUDEM, GEBCO, ETOPO, CoastalDEM, DeltaDTM, and DiluviumDEM;
- terrain/regional: SRSP LiDAR, Environment Agency LiDAR DTM, OS Terrain 50/5, USGS 3DEP, NOAA Digital Coast, Canada HRDEM, LidarBC, Alberta lidar/elevation, Bavaria DGM1, Netherlands AHN, France IGN RGE ALTI, Spain CNIG MDT, swissALTI3D, Finland NLS, Norway Hoydedata, LINZ NZ, and Geoscience Australia ELVIS;
- built environment: Overture, OSM, Microsoft Global ML Building Footprints, Google Open Buildings, Google Open Buildings 2.5D Temporal, GlobalBuildingAtlas, Roofer/CityGML/PLATEAU-style reconstruction, and commercial 3D/building products as gated upgrades;
- landcover/hydrology/context: ESA WorldCover, Dynamic World, Hansen Global Forest Change, Annual NLCD, LANDFIRE, HydroSHEDS/HydroRIVERS/HydroLAKES, USGS 3DHP/NHD, SoilGrids, NASA Black Marble, Open Infrastructure Map, Amazon Location Service, AEMET-style national weather APIs, and user-authored field-capture workflows.

The rule is unchanged: source registry inclusion is not production approval. Every source must preserve license, attribution, source vintage, confidence, limitations, privacy impact, and whether it is source truth, inferred context, visual context, or research only.

## Sentinel SR Sidecar Pattern

The useful Sentinel/SEN2SR pattern is a sidecar package workflow:

- Run Sentinel discovery, cloud screening, SEN2SRLite, COG writing, and tile production outside the browser.
- Consider openEO as an optional worker-side orchestration layer for compatible EO backends: STAC can discover candidate scenes, while openEO process graphs can express clipping, cloud masks, band math/composites, and export jobs. Keep it behind the package broker and never treat openEO execution as source truth.
- Use ESAOpenSR/SEN2SR as the upscaler reference, starting with SEN2SRLite RGBN `x4`: `10 m` Sentinel-2 L2A source bands to about `2.5 m` derived display pixels.
- Emit a manifest with scene id, acquisition time, scene/AOI cloud metrics, source resolution, derived resolution, model id, runtime, cache key, warnings, and land-understanding summaries such as NDVI/NDWI.
- Keep `truthStatus: imagery-inferred-context`; the output may improve visual/material context and H3 summaries but must not upgrade terrain, parcels, roads, buildings, legal boundaries, or emergency authority.

vmesh should adopt this as an offline/local-hub pipeline contract and only display resulting tiles/manifests on the globe.

Implementation note: vmesh now exposes this as `/api/geospatial-package/sentinel-sr` for public planning and `/api/geospatial-package/sentinel-sr/complete` for authenticated worker completion. The public route emits worker-ready STAC input, planned output refs, cloud QA policy, an `ImageryTileManifest`, and a downstream-render texture handoff. Only the worker route can attach trusted HTTPS tile refs and worker-derived cloud metrics, and those refs must pass the artifact host allowlist plus SSRF checks. Downstream apps must treat `planned` and `validation-required` as pre-render states; only `ready` with worker completion evidence means the tile ref and SCL cloud metrics are both acceptable. `blocked-cloud-gate` should trigger a clearer scene search or clean composite generation.

## Macro Atlas Source Broker Pattern

The source-broker discipline now becomes a generic vmesh package-service rule:

- Select and disclose map-ready sources separately from future package sources.
- Track terrain roles such as bare-earth DTM, generic DEM, surface DSM, topobathy, imagery-inferred context, visual context, and not-authoritative.
- Keep rejected-source reasons in the manifest so users and agents can see whether a provider was skipped because it needs preprocessing, a token, license review, or a safer deployment path.
- Treat package manifests as contracts for future terrain, imagery, landcover, environment, contour, H3 summary, and provenance payloads.
- Keep the browser as a renderer of map-ready outputs and H3 summaries, while heavy Overture/OSM/Sentinel/SEN2SR/climate-grid processing happens in local-hub or server workers.

This pattern lets any downstream app consume sanitized H3/source summaries without copying private AOIs, provider tokens, local planning context, or downloaded payloads.

## External Product And Viewer Research

### Superlocal

Observed stack:

- Next.js application hosted on Vercel.
- Public web bundles expose Mapbox GL / `mapboxgl` usage.
- Product pattern is an AI personal map with saved places, recommendations, check-ins, taste memory, and exploration progress.

vmesh relevance:

- Useful reference for personal atlas memory and preference-driven local recommendations.
- Reinforces the value of a private "what matters to me here" layer on top of the public map.
- Not a direct open-source map-stack reference because the map engine appears Mapbox-based.

### Tasmap

Observed stack:

- Next.js application hosted on Vercel.
- Confirmed MapLibre GL JS product.
- Uses OpenStreetMap attribution.
- Public bundles include Protomaps, PMTiles, MapTiler glyphs, MapLibre/Mapbox GL compatibility strings, and custom vector tile styling.

vmesh relevance:

- Strong validation for MapLibre plus PMTiles plus OSM/Protomaps-style basemap foundations.
- Good reference for custom map styling, map-as-story, and shareable map composition.
- Suggests vmesh should keep the globe central while letting users open lightweight style/layer/provenance modals as needed.

### CLSS Slovenia

Observed stack:

- Public CLSS page embeds a Flycom LIFT viewer.
- Viewer is OpenLayers-style for the 2D map.
- Raster products load as XYZ PNG tiles, for example orthophoto and state overview map tiles.
- GeoServer WMS provides overlays such as tile index and contour layers.
- 3D point-cloud viewing uses Potree with EPT datasets such as `ept.json`.
- The map is grounded in Slovenian national CRS EPSG:3794 / SI-D96/TM.

vmesh relevance:

- Useful reference for separating normal map display from heavy point-cloud inspection.
- MapLibre should consume preprocessed DEM, hillshade, contour, COG, PMTiles, or XYZ outputs rather than trying to render dense LiDAR point clouds directly.
- True point-cloud inspection should be a dedicated future viewer or sidecar path, likely Potree/EPT or Cesium/3D Tiles, with provenance and CRS metadata preserved.

## Recommended Operating Pattern

Do not create one mega-repo. Keep apps independent and share:

- Markdown decisions.
- Public-safe provider notes.
- Explicit schemas and fixtures.
- Small adapter packages only when duplication becomes real.
- Issue links when work crosses product boundaries.

The first shared package, if needed, should be a narrow contracts package rather than application code. A possible future name is `@vdao/geo-contracts`, containing only types, JSON schemas, fixture validators, and no secrets or provider calls.

Until that package exists, copy only public-safe contract snippets and keep the owning contract noted beside each interface.

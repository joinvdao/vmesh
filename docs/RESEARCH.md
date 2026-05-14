# Research Notes

This document tracks external systems, datasets, and modeling approaches that may inform future vmesh work. Research notes are not implementation commitments; each source still needs licensing, provenance, cost, privacy, and technical review before ingestion.

Cross-app research that may inform downstream users of vmesh is tracked in `docs/CROSS_REPO_INSIGHTS.md`. That file is the public-safe place to record reusable map-stack findings, provider notes, package-service lessons, playbook concepts, and app-integration patterns.

## External Map Products And Viewers

### Open Map Source Stack

vmesh should be a provider-agnostic open map funnel. The active renderer needs a beautiful map-ready style, but the product intelligence layer needs source-backed objects and H3 summaries.

Tracked source families:

- OpenStreetMap: canonical open community map data. Public tiles are visual context; PBF extracts are the safer ingestion path.
- OpenFreeMap: useful no-token MapLibre vector style candidate for open demos.
- Protomaps PMTiles: strong open/offline vector basemap direction for local hub bundles and predictable hosting.
- Overture Maps: high-value GeoParquet source for buildings, transportation, places, addresses, divisions, base land/water, and source attribution.
- Natural Earth: small global low-zoom context for offline/nonblank shells.
- OpenAddresses: useful for coarse geocoding and address enrichment, but privacy and per-source license review are required.
- LiDAR/EPT portals: useful as architecture references for point-cloud sidecars; vmesh should ingest derived DEM, contours, buildings, or H3 summaries rather than render all dense point clouds in the main globe.

Research question:

- Which open feature sources should become first real H3 aggregation jobs: Overture buildings/roads, regional OSM PBF, Natural Earth low-zoom context, or local food-network/public asset feeds?

### Production Open Map / PMTiles Stack

A relevant reference stack for vmesh is: MapLibre GL JS in the browser, PMTiles delivery through Cloudflare or equivalent CDN/object storage, open base data from the OSM/OpenFreeMap/Protomaps/Nextzen-style ecosystem, PostgreSQL/PostGIS for source-backed spatial records, and optional GraphQL for complex client queries.

Potential vmesh relevance:

- Strong validation for keeping MapLibre as the open-source renderer rather than defaulting to Mapbox.
- PMTiles over CDN/R2 is a practical way to serve basemaps, contours, terrain derivatives, H3 summaries, Sentinel/SEN2SR imagery, and landcover packages without operating a custom tile server for every layer.
- PostgreSQL/PostGIS is the right default backend for source geometries, H3 indexes, provenance, user-added records, package manifests, and future graph edges.
- Benchmark visualizations map cleanly to vmesh comparison workflows: compare regions by antifragility, climate stress, water, fire, flood, solar, vegetation, and food-network readiness.
- Apollo GraphQL is worth tracking for rich cross-layer queries, but it is not required for the current Next.js app until typed routes become insufficient.

Implementation boundary:

- Do not mix Vue/Nuxt into vmesh just because a reference product embeds React modules there. vmesh should remain Next.js/React-first.
- Do not depend on public OSM raster tiles for production traffic.
- Do not turn PMTiles into a data-truth shortcut; source geometries, transformation methods, licenses, and H3 aggregation metadata must still be stored in provenance records.
- Keep CDN-hosted public packages token-free where possible, and keep private AOIs, generated local hub packages, and exact user data out of public archives.

### Async Package Provider Boundary

vmesh should be an application in its own right and an asynchronous package provider for downstream apps. The useful contract is not a direct import of another app's internals; it is a clean package lifecycle:

```text
AOI/H3 request
  -> source registry and coverage probe
  -> source-honest package plan
  -> cache hit or queued package job
  -> worker-generated artifacts
  -> manifest URLs plus provenance and limitations
```

Potential vmesh relevance:

- Lets consumer apps ask for terrain, imagery, vectors, landcover, hydrology, parcel context, climate, and H3 summaries without knowing provider-specific logic.
- Keeps heavy STAC search, OSM/Overture extraction, national DTM clipping, Sentinel/SEN2SR, contour generation, and climate-grid processing outside the browser.
- Makes cache identity, source version, AOI disclosure, license review, cost events, and rejected-provider reasons first-class package metadata.
- Allows vmesh to remain standalone: the atlas can inspect the same package manifests and H3 summaries that external apps consume.

Implementation boundary:

- Public vmesh docs should describe generic downstream apps and public-safe contracts only.
- Do not name private consumer repos, local folders, exact private AOIs, provider credentials, paid quotes, or unpublished product plans.
- Package workers may produce artifacts for another app, but the manifest must remain reusable, source-honest, and independent of that app's renderer.

### Awesome Geospatial Index

References:

- `https://github.com/sacridini/Awesome-Geospatial`
- Latest reviewed commit: `f4ecefa1deba7d29240ddfc823c526b47b63ea80`

Awesome Geospatial is a CC0-licensed, public index of geospatial tools and resources. GitHub metadata on 2026-05-14 showed it as active, public, non-archived, and broadly used, with more than 5,000 stars and hundreds of forks. It is not a package to install; it is a scouting index for vmesh source registries, package workers, and future implementation choices.

High-signal areas for vmesh:

- Source-backed backend stack: PostGIS, pgRouting, DuckDB Spatial/PostGEESE, duckdb-raster, Rasdaman, TileDB, GeoPackage, Spatialite, and Atlas4D-style PostGIS/TimescaleDB/pgvector/H3 patterns.
- Map rendering and delivery: MapLibre GL, deck.gl, CesiumJS, NASA WebWorldWind, Mapzen Tangram, geojson-vt, Planetiler, Baremaps, Tegola, Martin, pg_tileserv, GeoServer, GeoTrellis Server, Terracotta, and PostGIS vector-tile utilities.
- Open map ingestion: OpenStreetMap API, Geofabrik extracts, Mapzen metro extracts, osm2pgsql, pyrosm, QuackOSM, OSMnx, osmdata/osmextract, OpenStreetMapX, and Organic Maps/MAPS.ME as offline-map references.
- Raster and EO pipelines: GDAL, Rasterio, rio-cogeo, rioxarray, stackstac, stactools, PySTAC, stac-fastapi, sat-search, Sentinel Toolboxes, sen2cor, Sentinel-2 AWS, deck.gl-raster, xarray, xcube, and xarray-spatial.
- Terrain/hydrology: TauDEM, TIN Terrain, pydelatin, pymartini, DEM.Net, SRTM/elevation tooling, and LiDAR/Potree/EPT-adjacent references.
- Climate and environmental data: cdsapi for Copernicus CDS/ERA5, Climata, wxee, climateR, rnoaa, NOAA/GEE references, NASA POWER client references, and environmental data portals such as ZipCheckup.
- Mobile/offline extension points: MapLibre Compose, MapLibre GL Native, Organic Maps, MAPS.ME, Mapbox mobile SDK references, and field-survey apps such as Mergin Maps.
- ML and annotation context: Solaris, segmentation/image-classification tools, Sentinel/GEE processing libraries, and annotation workflows that can feed future imagery-derived H3 summaries.

Priority shortlist for vmesh:

- Open map package workers: Planetiler, osm2pgsql, pyrosm, QuackOSM, Geofabrik extracts, Mapzen metro extracts, Natural Earth, Overture Maps GeoParquet, Martin, Baremaps, and PostGIS vector-tile utilities.
- Raster and imagery services: titiler, rio-tiler, Terracotta, localtileserver, Mapchete, Rasterio, rio-cogeo, rioxarray, xarray, xcube, deck.gl-raster, and COG validators.
- Earth-observation discovery and preprocessing: PySTAC, stac-fastapi, stactools, stackstac, EODAG, Sentinel Toolboxes, sen2cor, sat-search, Sentinel-2 AWS, USGS Earth Explorer, Planetary Computer clients, and GERS land-change references such as CCDC, COLD, and Cmask.
- Terrain, hydrology, and surface processing: PDAL, Entwine, Potree, Laspy, LAZ/LAS tooling, pydelatin, pymartini, WhiteboxTools, RichDEM, pyDEM, Open Topo Data, and Open-Elevation.
- Climate/environment providers: cdsapi, climateR, Climata, HyRiver, Siphon/THREDDS, xarray/netCDF tooling, OpenAQ clients, and environmental datasets such as ZipCheckup after license/provenance review.
- Graph and network analysis: pgRouting, OSMnx, city2graph, NetworkX, srai, momepy, urbanaccess, and spatial representation tooling for later knowledge-graph edges.
- Source security and governance: gisweep for auditing exposed map services, Bounding Box Tool for AOI/STAC/H3 handoff, GeoGig/Kart for versioned geodata, and explicit license/terms review for every provider.

Potential vmesh use:

- Use it as a backlog seed for `lib/geospatialPackage/sourceRegistry*`, not as an automatic dependency list.
- Tag each candidate by role: renderer-ready source, package-worker tool, preprocessing-only dataset/tool, optional commercial/API service, or research-only reference.
- Prioritize open, static-package-friendly tools that produce PMTiles, COG, GeoParquet, Zarr, MVT, H3 summary JSON, or PostGIS-ready artifacts.
- Compare candidates against vmesh's existing contracts: source provenance, license, attribution, confidence, freshness, privacy, and no browser-wide data pulls.
- Use it to populate a structured source-screening queue with fields for layer category, global/regional coverage, license, update cadence, package format, preprocessing cost, offline suitability, and production readiness.

Implementation boundary:

- Awesome lists are unevenly maintained and include commercial, obsolete, duplicated, and license-sensitive entries. Every candidate needs separate project-health and license review.
- Do not adopt Mapbox, Google Earth Engine, Earth Engine-derived products, ArcGIS, commercial APIs, or token-gated services as public defaults just because they appear in the list.
- Do not treat raster tiles, screenshots, or visual basemaps as source truth. vmesh should prefer source datasets, reproducible preprocessing, and signed/hashed package manifests.
- Do not assume that a tool's code license covers bundled datasets, model weights, generated tiles, third-party APIs, or redistribution of provider output.
- A fork is not needed; this remains a research index.

### MapLibre Compose

Reference: `https://github.com/maplibre/maplibre-compose`

MapLibre Compose is a public MapLibre project for adding interactive vector tile maps to Jetpack Compose apps. GitHub reports it as BSD-3-Clause licensed.

Potential vmesh relevance:

- Future Android/local-hub companion clients could render vmesh package manifests with a native MapLibre stack instead of a web view.
- Reinforces the value of keeping vmesh provider registries, package manifests, H3 summaries, and source provenance renderer-agnostic.
- Useful reference for touch-native map interaction patterns if vmesh later adds a field tablet app.

Implementation boundary:

- Not a Next.js/web dependency and not a replacement for the current MapLibre GL JS plus deck.gl renderer.
- Any future Android client should consume clean vmesh package contracts rather than duplicating provider-selection logic.

### mapgl Draw Attributes Workflow

References:

- `https://gist.github.com/walkerke/30a0d3dc7bfb57c78bfc6f0eb2a746c4`
- `https://walker-data.com/mapgl/reference/add_draw_control.html`
- `https://walkerke.r-universe.dev/mapgl`

Kyle Walker's `draw-attributes-mapgl.R` gist is a compact example of a field/intelligence workflow built on R `mapgl`, Mapbox GL / MapLibre GL, `tidycensus`, `sf`, and `mapbox-gl-draw`-style controls. The example loads 2024 ACS block-group population geometry for Texas, adds a hidden choropleth layer, enables a draw control with radius drawing, records user-entered attributes such as `site_id` and notes, returns drawn features as `sf`, then spatially joins drawn sites against block groups to summarize population by site.

Potential vmesh relevance:

- Strong reference for user-drawn AOI, local hub catchment, evacuation radius, garden/market service area, or field-observation capture.
- Attribute editing on drawn features maps cleanly to vmesh user-added records: title, category, notes, confidence, visibility, provenance, and selected H3 coverage.
- The pattern of drawing first, then joining to authoritative source layers is exactly the boundary vmesh needs: user sketch is context, not source truth.
- `mapgl` exposes MapLibre/Mapbox controls, layer controls, PMTiles, raster DEM, H3J, query-rendered-features, story maps, and Turf helpers that are worth tracking as R/prototyping references.

Implementation boundary:

- `mapgl` is an R/Shiny workflow reference, not a vmesh runtime dependency.
- vmesh should implement similar drawing/attribute capture in React/MapLibre/deck.gl with typed local records, H3 coverage, privacy defaults, and source provenance.
- User-drawn polygons, radii, and notes must default to private-local and must not be treated as parcel, survey, hazard, or infrastructure truth.
- Any future census/demographic join must preserve provider terms and avoid exposing sensitive user AOIs without consent.

### Tilia Lightweight Leaflet Runtime

Reference: `https://github.com/hiroaki/Tilia`

Tilia is a 0BSD-licensed JavaScript framework for putting geospatial data onto Leaflet 2 maps. Its README describes a small runtime plus plugin system, static/no-build deployment, importmap-loaded dependencies, embeddable map instances, GPX loading, photo/EXIF import, layer controls, elevation profile charts, settings, URL import, and drag-and-drop.

Potential vmesh relevance:

- Good architecture reference for a lightweight field-map viewer that can run from static hosting or a local hub.
- Plugin pattern is relevant to vmesh's rail-opened modals and optional layer controls.
- GPX and photo/EXIF import patterns could inform future user-added field observations, walks, site visits, and local survey evidence.
- Elevation profile charts are relevant to trails, access, watershed walks, evacuation routes, and terrain inspection.
- Multiple independent map instances on a single page may inform future docs/blog/livestream embeds.

Implementation boundary:

- Tilia uses Leaflet 2 alpha and is 2D map oriented; it is not a replacement for vmesh's MapLibre globe, PMTiles terrain, or deck.gl analytical overlays.
- Treat it as a UX/runtime/plugin reference, not a core dependency.
- EXIF/photo imports can contain precise location and timestamp metadata, so any future vmesh version must default those records to private-local and expose provenance/privacy controls.
- A fork is not needed now; the repo remains a research reference.

### Superlocal

Superlocal is useful as a product reference for a personal AI map. Public inspection indicates a Next.js/Vercel web app with Mapbox GL / `mapboxgl` usage in its web bundles. The main lesson for vmesh is not the map engine, but the product pattern: a private map that learns saved places, preferences, recommendations, check-ins, and exploration progress.

Potential vmesh relevance:

- A personal atlas layer for "what matters to me here."
- Taste and intent memory attached to places, regions, and H3 cells.
- Private-first saved places, local notes, and recommendation context.
- A calmer alternative to always-visible analytical panels.

Implementation boundary:

- Do not copy Mapbox as a default engine. vmesh remains MapLibre-first.
- Treat preference and saved-place data as user-added/private-local unless explicit sharing exists.

### Tasmap

Tasmap is a strong open web-map reference. Public inspection and the Made with MapLibre listing indicate a Next.js/Vercel app built with MapLibre GL JS. Its bundles include Protomaps, PMTiles, MapTiler glyphs, and custom vector-tile styling; the page also preserves OpenStreetMap attribution.

Potential vmesh relevance:

- Validates the MapLibre plus PMTiles plus OSM/Protomaps-style basemap direction.
- Shows that map design, storytelling, and shareable map composition can be built on an open map stack.
- Suggests vmesh should keep layer/style/provenance controls as optional modals rather than permanent dashboard clutter.

Implementation boundary:

- Keep MapTiler, Mapbox, or other token-bearing services optional and env-gated.
- Prefer open PMTiles and no-token styles for public demos.

### CLSS Slovenia / Flycom LIFT

The CLSS Slovenia portal is a useful example of national-scale LiDAR and derived raster products on the web. Public inspection shows the site embedding a Flycom LIFT viewer. The viewer uses an OpenLayers-style 2D map, GeoServer WMS overlays, XYZ PNG raster tile pyramids for products such as orthophoto and state overview maps, and Potree/EPT for 3D point-cloud inspection. The app operates in Slovenian national CRS EPSG:3794 / SI-D96/TM.

Observed public tile/data patterns:

- `XYZ` PNG raster pyramids for imagery and state maps.
- GeoServer `TileWMS` overlays for tile index and contour-style layers.
- Potree loading Entwine/EPT point-cloud manifests such as `ept.json`.
- Source products include CLSS orthophoto, analytical hillshade, contours, and LiDAR-derived point-cloud/terrain outputs.

Potential vmesh relevance:

- Dense LiDAR should not be treated as an ordinary MapLibre map layer.
- vmesh should display preprocessed DEM, hillshade, contours, COG, PMTiles, or XYZ raster outputs in MapLibre.
- True point-cloud inspection should be a future dedicated viewer or sidecar path, likely Potree/EPT or Cesium/3D Tiles.
- CRS, vertical datum, product vintage, tile scheme, and source authority must stay attached to every derived product.

Implementation boundary:

- Do not hotlink or ingest CLSS tiles into vmesh without license and access review.
- Treat CLSS as an architectural reference for open LiDAR/raster delivery, not a V1 provider.

### q3dweb Lightweight Point-Cloud Viewer

Reference: `https://github.com/Panasonic-Advanced-Technology/q3dweb`

`q3dweb` is an MIT-licensed Three.js/WebGL point-cloud viewer for the browser. Its README describes support for PCD, PLY, LAS, LAZ, and E57 files, including georeferenced LAS/LAZ overlays on map tiles. Default tile references include OpenStreetMap and Japan GSI map/aerial sources, with explicit attribution notes. The repo also includes LAZ decoding through `laz-perf`, an E57 WebAssembly path, projection conversion through `proj4`, measurement controls, and a camera/film-maker workflow.

Potential vmesh relevance:

- Useful reference for a future point-cloud sidecar viewer that can inspect local LiDAR, drone photogrammetry, scan-to-map outputs, or site survey files without installing a heavy desktop GIS.
- LAS/LAZ CRS handling and tile-overlay logic align with vmesh package manifests that need to preserve source CRS, bounds, vertical datum, and acquisition metadata.
- E57 support is relevant for local hub/site scans, structure documentation, infrastructure inspection, and before/after disaster assessment.
- Film-maker/camera keyframes are a good reference for shareable fly-throughs of macro terrain, point clouds, and local hub evidence packages.

Implementation boundary:

- Do not render dense point clouds inside the main MapLibre globe by default. Keep point clouds as sidecar inspection assets or derived products such as DEM, DSM, contours, building/canopy obstruction layers, PMTiles previews, or H3 summaries.
- Treat public OSM/GSI tile examples as viewer context only; production vmesh packages must use provider-specific attribution and tile-use terms.
- Validate large-file memory behavior, streaming, CRS transforms, vertical units, and browser safety before adopting any code path.
- If code is reused, preserve MIT notices plus third-party notices for Three.js, `laz-perf`, `proj4`, E57/WASM dependencies, and tile providers.

### Saitama Road And River Point-Cloud Atlas

References:

- `https://experience.arcgis.com/experience/d88b12836c194e8dbaa73155a23d0400/`
- `https://www.geospatial.jp/ckan/dataset/road-pointcloud-saitama`
- `https://www.geospatial.jp/ckan/dataset/river-pointcloud-saitama`

The Saitama Prefecture road/river 3D map is an ArcGIS Experience Builder public app titled `道路・河川の３Dマップ`. Its public item metadata identifies it as an ArcGIS `Web Experience` backed by a `Web Scene`. The scene contains ArcGIS `PointCloudLayer` preview groups for road, river, and mountainous-area point clouds, plus ArcGIS feature layers for download footprints/records. The app includes standard operational widgets for map, layer list, legend, filters, search/geocoding, attribute table, data-add panels, and office/route/river aggregation panels.

The linked G-Spatial Information Center datasets describe the source data:

- Road point clouds: mobile mapping system / vehicle photo-laser survey data, 2021-2025, downloadable by map sheet, CRS `JGD_2011_Japan_Zone_9`, CC BY 4.0, average ZIP about 420 MB and largest about 8.2 GB.
- River point clouds: UAV drone and narrow multibeam survey data, 2022-2025, downloadable by map sheet, CRS `JGD_2011_Japan_Zone_9`, CC BY 4.0, average ZIP about 520 MB and largest about 1.0 GB.

Potential vmesh relevance:

- Excellent architecture reference for separating heavy point-cloud preview from downloadable source packages.
- Shows a practical catalog pattern: feature footprints/records drive search, filter, table, and download interactions, while point-cloud layers provide 3D visual preview.
- Reinforces that vmesh package manifests need CRS, acquisition years, collection method, provider, license, file size, coverage geometry, and layer role before making dense data available.
- Useful for future road/river corridor packages, local infrastructure inspection, flood-channel context, and post-disaster change assessment sidecars.

Implementation boundary:

- ArcGIS `PointCloudLayer` and Experience Builder are proprietary Esri runtime patterns. vmesh should learn the catalog/preview/download separation, not make Esri a default dependency.
- Do not hotlink ArcGIS point-cloud services or redistribute Saitama downloads without preserving CC BY attribution, terms, CRS, and source metadata.
- Keep raw point clouds as sidecar inspection/download products; derive DEM/DSM, contours, bridge/road/river corridor context, or H3 summaries through worker pipelines when needed.
- Large files require package planning, resumable downloads, tiling/indexing, cache budgets, and user warnings before local hub/offline use.

## Climate Models And Digital Twins

### NASA Earth System Digital Twins

NASA's Earth System Digital Twins work is relevant to vmesh as a model for integrating Earth observations, models, information systems, monitoring, prediction, and decision support.

Reference: `https://esto.nasa.gov/earth-system-digital-twin/`

Potential vmesh relevance:

- Treat large Earth-system models as future macro providers.
- Convert model outputs into H3-derived local attributes.
- Attach model run metadata, forecast horizon, uncertainty, and provenance to every derived score.
- Support climate/weather outputs as both map layers and mesh intelligence.

Potential future provider kinds:

- `climate-digital-twin`
- `weather-ai-model`
- `forecast-grid`
- `downscaled-risk-field`

### NVIDIA Earth-2

NVIDIA Earth-2 is relevant as a reference for AI-accelerated weather and climate modeling, high-resolution downscaling, and digital-twin style climate/weather workflows.

Reference: `https://www.nvidia.com/en-us/high-performance-computing/earth-2/`

Potential vmesh relevance:

- Downscale coarse climate/weather fields into local hex-level signals.
- Derive heat, rainfall, drought, storm, fire-weather, and water-stress attributes per H3 cell.
- Track model family, run date, resolution, confidence, forecast horizon, and limitations.
- Keep Earth-2-style outputs as future provider inputs, not V1 dependencies.

Research question:

- Which climate/weather outputs are reliable enough to influence an antifragility score, and which should remain visual/context-only?

### Keisler 2022 H3 Graph Weather Forecasting

Ryan Keisler's 2022 graph neural network weather-forecasting work is directly relevant to vmesh because it uses H3 as the intermediate computation mesh for global weather forecasting. The public reference implementation is MIT licensed and describes a three-stage model that maps atmospheric fields onto an H3 mesh, performs message passing across that mesh, and maps predictions back to latitude/longitude weather fields.

References:

- `https://github.com/rkeisler/keisler-2022`
- `https://arxiv.org/abs/2202.07575`

Potential vmesh relevance:

- Validates H3 as more than a visual overlay: it can act as a computational graph for atmospheric and climate signals.
- Suggests a future `weather-ai-model` provider path where gridded ERA5, GFS, ECMWF, or equivalent forecast fields are encoded to H3, processed, and decoded or summarized back into per-cell signals.
- Gives vmesh a pattern for deriving temperature, rainfall, wind, pressure, drought, fire-weather, storm, and solar/cloud-cover context per H3 cell while retaining model-run provenance.
- Aligns with the product direction that the visible hex grid should stay optional while H3 remains the backend spatial index and knowledge-bucketing layer.

Implementation boundary:

- This is not a V1 browser dependency. The reference stack is Python/JAX-oriented and expects weather-model data pipelines, so any real use belongs in a server-side or offline preprocessing job.
- vmesh should not claim operational weather forecasting from mock data. Model outputs must carry initialization time, forecast horizon, source dataset, model version, uncertainty, confidence, and calibration notes.
- If used later for disaster mode, forecasts should remain decision-support context rather than emergency authority.

Potential future provider kinds:

- `h3-weather-graph-model`
- `forecast-field-to-h3`
- `h3-climate-downscaler`
- `forecast-sensitivity-map`

Research questions:

- Which weather variables are useful at U3, U5, and focused U8 without overclaiming local precision?
- Should vmesh store model outputs as H3 cell attributes, graph observations, or both?
- What calibration and uncertainty metadata is required before model outputs can influence antifragility scoring?

### Open-Meteo Forecast API

Open-Meteo is relevant as the first no-secret weather prototype provider. It can provide current and forecast weather for a selected H3 centroid without committing an API key.

Reference: `https://open-meteo.com/en/docs`

Potential vmesh relevance:

- Populate selected-cell weather now and 72-hour forecast summaries.
- Derive weather stress, rainfall outlook, wind exposure, cloud cover, and fire-weather proxies.
- Exercise the live/cached/mock provider boundary before heavier climate-model ingestion exists.

Implementation boundary:

- Query only selected H3 centroids or a small capped ring.
- Use timeout, abort, cache, and visible fallback.
- Treat returned data as point forecast context, not official warnings.
- Document that live requests expose selected coordinates to the provider unless routed through a local cache/gateway.

### NASA POWER Solar And Meteorology

NASA POWER is relevant as a future solar/meteo provider for practical hub planning, especially solar radiation and weather-derived load context.

Reference: `https://power.larc.nasa.gov/api/pages/`

Potential vmesh relevance:

- Solar practicality estimates per H3 cell.
- Cloudiness, temperature, and wind context for local energy planning.
- Offline/precomputed solar summaries for local hub bundles.

### Solar Position, Shading, And PV Potential Tools

Solar potential in vmesh should combine lightweight interactive sun-path display with heavier server/local-hub solar preprocessing.

References:

- SunCalc JavaScript: `https://github.com/mourner/suncalc`
- pvlib Python: `https://pvlib-python.readthedocs.io/`
- pvlib horizon-shading example: `https://pvlib-python.readthedocs.io/en/v0.11.2/gallery/shading/plot_simple_irradiance_adjustment_for_horizon_shading.html`
- NREL PVWatts API: `https://developer.nrel.gov/docs/solar/pvwatts/`
- Ladybug Tools: `https://www.ladybug.tools/ladybug.html`
- Ladybug sun path docs: `https://docs.ladybug.tools/ladybug-primer/components/2_visualizedata/sunpath`

Potential vmesh relevance:

- SunCalc is a good browser-side candidate for quick sun azimuth/altitude, sunrise/sunset, and seasonal sun-sector visualization.
- pvlib is the stronger preprocessing candidate for solar position, irradiance transposition, PV modeling, and horizon-shading workflows.
- NREL PVWatts can inform optional future PV production estimates where API keys/terms are accepted, but it should not become the open-source default.
- Ladybug Tools is a strong conceptual reference for sun paths, sky masks, direct sun hours, and shading analysis.

Implementation boundary:

- Terrain-only shading should be labeled as terrain-horizon shading.
- Building/canopy obstruction shading requires DSM, LiDAR, building height, or validated local observations.
- Sentinel/SEN2SR imagery can provide visual/material context, not authoritative obstruction geometry.
- Solar output is planning context, not bankable PV design or financial yield.
- Every solar summary must preserve source, time period, slope/aspect method, horizon source, obstruction source, cloud/irradiance source, and confidence.

### Wind Roses And Wind Exposure

Wind roses are relevant for climate context, fire-weather interpretation, microclimate comfort, shelterbelt planning, and local hub siting.

References:

- Open-Meteo forecast variables: `https://open-meteo.com/en/docs`
- ERA5 reanalysis overview: `https://www.ecmwf.int/en/forecasts/dataset/ecmwf-reanalysis-v5`
- openair windRose reference: `https://openair-project.github.io/openair/reference/windRose.html`
- Plotly wind rose chart reference: `https://plotly.com/javascript/wind-rose-charts/`

Potential vmesh relevance:

- Open-Meteo exposes wind speed and wind direction at multiple heights for selected-cell forecast context.
- ERA5 can provide historical wind-direction and wind-speed distributions as a server/preprocessing source.
- openair's `windRose` is a useful algorithm/reference pattern for speed-bin-by-direction summaries.
- The UI can render wind roses using Recharts/custom SVG/polar bars before adding another chart dependency.

Implementation boundary:

- Wind roses should state height above ground, observation/model period, source variables, time resolution, and calm threshold.
- Forecast roses and climate-normal roses must be visually distinct.
- Reanalysis wind can be useful for pattern context but may understate local terrain/canopy/urban effects.
- Wind roses are not structural wind engineering or turbine-siting certification.

### Permaculture Climate Sector Mapping

Permaculture sector analysis is relevant because it turns directional climate and site forces into an intuitive design compass.

References:

- Permaculture Association sector analysis: `https://www.permaculture.org.uk/design-methods/sector-analysis`
- Oregon State open permaculture sectors material: `https://open.oregonstate.education/permaculture/chapter/sectors/`

Potential vmesh relevance:

- Sector maps can show summer/winter sun, prevailing winds, cold winds, storm/rain movement, flood/drainage, wildfire approach, wildlife corridors, access, noise, and pollution as directional overlays around a selected H3 cell or local hub site.
- The sector map is a bridge between macro atlas data and later hub/playbook workflows.
- User observations can enrich sector maps without claiming provider authority.

Implementation boundary:

- Sector maps are decision-support and observation tools, not automated design prescriptions.
- Each sector should carry source, confidence, seasonality, angle range, intensity, and whether it is user-entered, derived, mock, or provider-backed.
- Directional sectors should remain editable/inspectable because local reality may differ from gridded climate data.

### ERA5 / Copernicus CDS

ERA5 is relevant as a high-quality reanalysis source for climate normals, anomalies, and historical hazard context.

Reference: `https://cds.climate.copernicus.eu/datasets/reanalysis-era5-complete`

Implementation boundary:

- Do not fetch ERA5 from the browser.
- Treat CDS credentials and requests as server/offline preprocessing.
- Store derived H3 summaries with source variable, run date, model version, uncertainty, and license metadata.

### NASA FIRMS Active Fire

NASA FIRMS is relevant as a future fire/hotspot input provider.

Reference: `https://firms.modaps.eosdis.nasa.gov/content/active_fire/`

Implementation boundary:

- Do not call FIRMS from V1 UI.
- Review access requirements, latency, false positives, confidence, and emergency-use disclaimers before ingestion.
- Treat active fire detections as observations with provenance, not as complete fire-risk truth.

## Biodiversity Models And Datasets

### World Bank Global Biodiversity Data

The World Bank Global Biodiversity Data catalogue entry is relevant as a potential biodiversity macro source. It includes public, CC BY 4.0 biodiversity resources such as species richness, species at risk, extinction risk, species endemism, small occurrence data, and gridded human coexistence indicators.

Reference: `https://datacatalog.worldbank.org/search/dataset/0066034/global-biodiversity-data`

Observed source characteristics:

- Metadata last updated: March 7, 2025.
- License: Creative Commons Attribution 4.0.
- Classification: Public.
- Temporal coverage shown on the catalogue page: 2024.
- Includes CSV resources and a larger ZIP resource for gridded global biodiversity data.
- Resources include terrestrial, freshwater, marine, species global grid, extinction risk, species endemism, and small occurrence datasets.

H3 relevance:

- The catalogue describes gridded/global-grid datasets, but it does not appear to use H3 as its native index.
- vmesh should treat this as a source to normalize into H3, not as a ready-made H3 mesh.
- Future ingestion should map source grid cells or coordinates to H3 cells, preserving the original grid identifier, source resolution, and transformation method.

Potential vmesh-derived attributes:

- Species richness per H3 cell.
- Count of species at risk per H3 cell.
- Endemism indicators.
- Small occurrence indicators.
- Terrestrial/freshwater/marine human coexistence indices.
- Biodiversity confidence score based on source density and spatial resolution.

Implementation requirements before use:

- Confirm resource schema, coordinate/grid system, and source resolution.
- Confirm attribution language required by CC BY 4.0.
- Build a reproducible grid-to-H3 normalization job.
- Preserve original source IDs and transformation metadata.
- Avoid overclaiming precision where source grids are coarse or unevenly sampled.

Research question:

- Which biodiversity signals should affect the antifragility score directly, and which should remain explanatory context?

## Mesh Normalization Rule

External climate, biodiversity, terrain, parcel, raster, and catalogue datasets should not be assumed to use H3. The vmesh ingestion model should support:

- native source geometry or grid ID
- source CRS
- source resolution
- source license and attribution
- source timestamp/version
- transformation method into H3
- overlap/weighting method
- derived H3 cell IDs
- confidence and uncertainty

H3 is the vmesh operating mesh, not a requirement for upstream datasets.

### H3J / H3T Compact H3 Delivery

Reference: `https://github.com/INSPIDE/h3j-h3t`

`h3j-h3t` is an MIT-licensed JavaScript/MapLibre reference for sending H3-indexed data without shipping full GeoJSON polygon geometry. Its README defines `H3J` as a compact JSON format with a root `cells` array and a required `h3id` field, and `H3T` as a tiled form served through `z/x/y.h3t` endpoints. The MapLibre module generates H3 cell geometry client side and can render polygons or centroids.

Potential vmesh relevance:

- Strongly matches the vmesh principle that H3 is the backend spatial index and knowledge bucket, while visible geometry should be generated only when a layer needs it.
- Suggests a compact interchange format for macro summaries, local food-network counts, property signals, climate scores, and user-added observations attached to H3 cells.
- Could reduce payload size compared with shipping GeoJSON hex polygons, especially for focused U8 or layer-specific overlays.
- Gives an open MapLibre-compatible pattern for future `h3-summary-json` and `h3-summary-tile` provider kinds.

Implementation boundary:

- Do not adopt the package directly until it is tested against current MapLibre and vmesh deck.gl overlay behavior.
- Keep `deck.gl` H3 layers as the current rendering path unless a compact H3T pipeline clearly improves performance or offline bundle size.
- Preserve provenance, timestamp, confidence, source license, and transformation method in metadata or per-cell attributes.
- H3T should be treated as an optional delivery optimization, not a replacement for source-backed datasets or the knowledge graph.

## Open Terrain Tiles

### Mapterhorn PMTiles

Mapterhorn is now the primary V1 open terrain path. vmesh treats it as a `pmtiles-raster-dem` provider with Terrarium RGB elevation encoding and loads the archive directly in the browser through HTTP range requests.

Reference: `https://download.mapterhorn.com/planet.pmtiles`

Potential vmesh relevance:

- Provides a modern no-token terrain archive that can be used by MapLibre `raster-dem`.
- Keeps terrain provider choice in configuration/state rather than renderer-specific branches.
- Establishes the future path for PMTiles terrain packages, STAC/catalog discovery, and source-attribution metadata.

Implementation notes:

- Register the `pmtiles://` protocol once before adding PMTiles terrain sources to MapLibre.
- Keep provider metadata visible through footer/source status and public docs.
- Preserve attribution and upstream dataset notices before any production release.

### Mapzen / Joerd Terrarium

Mapzen/Joerd Terrarium tiles are the no-token V1 fallback terrain path.

Reference: `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`

Potential vmesh relevance:

- Provides an XYZ `raster-dem` fallback with Terrarium encoding.
- Useful for browser verification if PMTiles range requests fail or a PMTiles archive is unavailable.
- Gives vmesh a simple open fallback pattern for other Terrarium-compatible providers.

Research question:

- Which terrain provider should be considered authoritative for public demos versus production deployments once attribution, update cadence, coverage, and reliability are reviewed?

### Terrain Source Expansion Watchlist

Downstream site-package research identified a broader terrain ladder that vmesh should track in source registries and package-worker docs.

Global and coastal candidates:

- GEDTM30, Copernicus DEM GLO-30/GLO-90, JAXA AW3D30, ASTER GDEM, NASADEM, SRTM, FABDEM, EarthDEM, and NASA Earthdata DEM catalog routes are comparison/fallback terrain candidates. Most should remain `generic-dem`, DSM-style, inferred-DTM, or license-gated until a worker proves source semantics, datum, coverage, and licensing.
- NOAA CUDEM, NOAA Digital Coast, GEBCO, ETOPO, CoastalDEM, DeltaDTM, DiluviumDEM, and OpenTELEMAC-style tooling belong in coastal/topobathy or hydrodynamic research lanes, not generic inland DTM defaults.
- FathomDEM/FathomDEM+ and commercial terrain products are premium or license-reviewed candidates rather than public defaults.

Regional high-trust DTM candidates:

- Great Britain: Environment Agency LiDAR DTM, Scottish Remote Sensing Portal LiDAR, OS Terrain 50, and OS Terrain 5.
- North America: USGS 3DEP, NOAA coastal products, Canada HRDEM, British Columbia LidarBC, and Alberta provincial lidar/elevation.
- Europe: Netherlands AHN, Bavaria DGM1, France IGN RGE ALTI, Spain CNIG MDT, swissALTI3D, Finland NLS elevation, and Norway Hoydedata.
- Other strong regional rails: LINZ New Zealand elevation and Geoscience Australia ELVIS.

Implementation boundary:

- Every source needs AOI coverage probes, CRS and vertical-datum preservation, source vintage, no-data checks, license notes, and a ground-model role.
- DSM, stereo surface products, canopy models, and super-resolved imagery may inform surface/context layers but must not silently become bare-earth DTM.
- Tooling references such as CUDEM, `dsm2dtm`, and sea-level visualization repos are not data sources by themselves.

## Earth Observation Imagery And Super Resolution

### Sentinel-2 L2A Through STAC

Sentinel-2 L2A Cloud Optimized GeoTIFFs are relevant as the first open optical imagery path for vmesh. Earth Search / Element84 STAC can be used to discover recent scenes around a selected H3 cell or local hub AOI.

Potential vmesh relevance:

- Recent clear-scene context for selected places.
- Vegetation, water, burn, bare soil, and land-cover proxy summaries per H3 cell.
- Offline local hub imagery bundles for disaster or low-connectivity use.

Implementation boundary:

- Filter by scene-level `eo:cloud_cover`, then validate AOI pixels with SCL/cloud-mask data.
- Do not download whole scenes when an AOI window is enough.
- Preserve source scene ID, acquisition time, cloud metrics, CRS, bands, and license metadata.

### Fields Of The World Agricultural Field Boundaries

References:

- `https://fieldsofthe.world/`
- `https://source.coop/ftw/global-data`
- `https://github.com/fieldsoftheworld/ftw-prue`
- `https://fieldsofthe.world/ethical-statement.html`

Fields of The World is highly relevant to vmesh. The project describes an open ecosystem for agricultural field-boundary detection using Sentinel-2 imagery and machine learning. The global release reports 3.17B field polygons across 241 countries and territories at 10m resolution for 2024-2025. The Source Cooperative global data product includes Sentinel-2-derived median composites in COG and Zarr formats, prediction outputs in Zarr and GeoParquet, and a global PMTiles archive for browser visualization.

Potential vmesh relevance:

- First serious global field-boundary source for the food/land intelligence layer.
- PMTiles output can become an optional visual overlay on the vmesh globe/map.
- GeoParquet output can feed PostGIS/DuckDB preprocessing and H3 summaries.
- Zarr/COG feature and prediction products align with the Sentinel/SEN2SR/vegetation pipeline.
- H3 summaries can include field count, field density, field-size distribution, field-boundary confidence, agricultural fragmentation, adjacency to roads/water/settlements, and links to crop/vegetation condition layers.
- Strong source-broker fit: field polygons, prediction rasters, PMTiles, model/version metadata, and ethical-use notes can all live in package manifests.

Implementation boundary:

- Treat FTW polygons as predicted agricultural field boundaries, not cadastral parcels, ownership boundaries, or legal property geometry.
- Preserve model version, product year, confidence layer or score where available, Sentinel feature vintage, source format, license, and ethical-use notes.
- Use PMTiles for visual inspection only; source-backed analysis should use GeoParquet/PostGIS/DuckDB and derive H3 summaries.
- Do not use FTW to identify private land ownership, target individuals, or infer exact farm business operations.
- Add a source-specific license/terms review before production ingestion, especially for global output, benchmark labels, model weights, and downstream redistribution.

### Labelme Image Annotation

References:

- `https://github.com/wkentaro/labelme`
- `https://github.com/wkentaro/labelme/releases/tag/v6.2.0`
- `https://labelme.io`

Labelme is a GPL-3.0 Python/Qt image annotation tool for polygons, rectangles, circles, lines, points, masks, semantic segmentation, instance segmentation, classification, video annotation, and AI-assisted annotation. Release `v6.2.0` on May 10, 2026 adds oriented rectangles as a first-class shape type, SAM-assisted conversion to oriented rectangles, axis-aligned rectangles, and circles, plus additional canvas/editing fixes.

Potential vmesh relevance:

- External human-in-the-loop annotation tool for validating Sentinel/SEN2SR imagery, field boundaries, landcover classes, water/vegetation/bare-soil features, and parcel/asset candidates.
- Useful for creating small reviewed fixtures for tests and demos before larger ingestion pipelines exist.
- Oriented rectangles are relevant for agricultural field blocks, buildings, greenhouses, solar arrays, storage yards, and other rotated site features.
- AI-assisted SAM output can speed up annotation, but human review remains necessary before labels become training or validation data.
- Label JSON can be converted into masks, polygons, or COCO/VOC-style training data in offline preprocessing.

Implementation boundary:

- Treat Labelme as an external tool/workflow reference, not a bundled dependency in the MIT vmesh app, unless GPL compatibility is explicitly reviewed.
- Do not commit private imagery, EXIF-bearing photos, exact property screenshots, or sensitive infrastructure annotations.
- Preserve annotator, source imagery, acquisition date, label schema, review status, and confidence when converting labels into vmesh fixtures or H3 summaries.
- AI-assisted labels are draft labels until human-reviewed.

### ESAOpenSR / SEN2SR

ESAOpenSR SEN2SR is relevant as an offline/server-side super-resolution engine for Sentinel-2 imagery.

Reference: `https://github.com/ESAOpenSR/SEN2SR`

Potential vmesh relevance:

- Generate enhanced RGB+NIR local imagery products for inspection and planning. The current practical target is SEN2SRLite RGBN `x4`, converting `10 m` Sentinel-2 L2A display context into about `2.5 m` derived pixels.
- Produce COG and PMTiles/XYZ raster outputs that MapLibre can display.
- Derive H3 summaries from processed imagery while keeping the raster product separate from the H3 index.

Implementation boundary:

- Do not run SEN2SR, PyTorch, or raster processing in the browser.
- Use SEN2SRLite first for practical local/GPU feasibility.
- Preserve the sidecar package discipline: cloud-qualified AOI, scene and AOI cloud metrics, model id, model variant, source resolution, derived resolution, cache key, and `truthStatus: imagery-inferred-context`.
- Label output as AI-assisted super-resolution derived from Sentinel-2.
- Do not use enhanced imagery for legal boundaries, emergency certification, or exact infrastructure claims.

### Sentinel SR Sidecar Pattern

The useful implementation pattern for vmesh is a sidecar workflow rather than browser-side raster processing:

- A Node sidecar wrapper invokes a configured command with AOI JSON on stdin and reads a bounded JSON result from stdout.
- A deterministic fixture sidecar exists for tests.
- A Python sidecar dependency-checks `sen2sr`, `mlstac`, `cubo`, `torch`, `numpy`, `Pillow`, and `xarray`.
- The production-oriented path requests Sentinel-2 L2A RGBN bands, rejects over-cloud AOIs, runs SEN2SRLite RGBN `x4`, emits a preview asset, and derives advisory NDVI/NDWI land-understanding summaries.
- All outputs are visual/material context and may improve only the imagery layer baseline, never terrain, parcels, roads, buildings, or legal boundaries.

vmesh should adopt the contract and provenance posture: a local/server worker creates COGs, preview PNGs, PMTiles/XYZ tiles, manifests, and H3 summaries; the browser reads only manifests and tile URLs.

### Geospatial Package Broker Pattern

The durable pattern for source selection and geospatial honesty is a package broker that separates provider discovery, source role, coverage checks, rejected-source reasons, payload generation, renderer hydration, and provenance.

Potential vmesh relevance:

- Macro Atlas layers should be selected through a catalog/broker before they reach MapLibre or H3.
- Terrain sources should carry explicit roles: bare-earth DTM, generic DEM, surface DSM, topobathy, imagery-inferred context, visual context, or not-authoritative.
- Source packages should reference separate payloads for terrain, imagery, landcover, environment, contours, H3 summaries, and provenance.
- Rejected providers should be visible, not silently ignored.
- Sentinel, Overture, OSM extracts, climate grids, contours, and regional DTM products should become local/server package jobs before becoming browser layers.

Implementation boundary:

- Do not copy private repo context, private AOIs, local tickets, provider tokens, or downloaded source artifacts.
- Use this as a public-safe contract pattern: manifests, source provenance, rejected-source reasons, role confidence caps, and tests.

### Built Environment, Capture, And Graph Context

Several downstream research notes are directly relevant to vmesh's package backlog:

- Microsoft Global ML Building Footprints, Google Open Buildings, Google Open Buildings 2.5D Temporal, GlobalBuildingAtlas, Overture buildings, OSM buildings, Roofer, PLATEAU/CityGML converters, and TomoSAR building-height research all belong to the building/context ladder. They should never alter terrain trust.
- Streets GL, OSM Buildings, F4map, Map3D, prettymaps, and `arnis` are renderer or conversion references for recognizable OSM-derived worlds, vector-tile styling, LoD1 building massing, road hierarchy, and lightweight GLB export. Map3D is especially relevant as an active React Three Fiber example, but its direct OSM/Overpass browser fetches and generated GLBs must stay downstream of vmesh source plans, provenance, and cache boundaries. They are not source authority.
- `city2graph` is a strong worker-side reference for turning source-backed roads, buildings, parcels, transit, and points into graph metrics before summarizing them back to H3.
- `Mazzap`, q3dweb, Potree/EPT-style viewers, SphereSfM, 3DGS pipeline guides, geo-registration tooling, RADIO-ViPE, Fast3R, and user-uploaded LiDAR/photogrammetry are a separate user-supplied/capture lane. These can improve recognizability and inspection, but must carry upload rights, privacy controls, scale/georegistration QA, and source provenance.

World-model conditioning opportunity:

- A Map3D-style worker can turn a vmesh source package into a lightweight visual blockout: terrain plane or mesh, orthophoto or raster context, road strokes, water masks, vegetation hints, and simple building massing.
- That blockout can then be rendered into model-facing media such as equirectangular panoramas, short flythrough videos, north/east/south/west source views, depth/height hints, or optional GLB reference assets.
- This is useful because external world-generation systems often respond better to visual layout conditioning than to raw geospatial tables, while vmesh still preserves the source package as the auditable truth object.

Implementation boundary:

- Keep source-backed vectors, point clouds, splats, and generated meshes separate from the H3 index and from terrain-role claims.
- Store graph/capture outputs as package artifacts or sidecar manifests with source ids, licenses, vintages, coordinate frames, confidence, and privacy flags.
- Treat rendered blockouts, panoramas, videos, and exported GLBs as conditioning or visual artifacts. They must point back to package manifests, not replace source-backed terrain, vectors, imagery, H3 summaries, or provenance.
- Avoid copying GPL/AGPL tooling into the MIT app unless a separate license-compliance path is deliberately chosen.

### Advisory Context Source Watchlist

vmesh's macro/micro atlas should also track context layers that are useful for interpretation but not land truth:

- NASA Black Marble / VIIRS Nighttime Lights can support settlement intensity, electrification, outage/disaster context, night ambience, skyglow, and light-pollution screening at coarse resolution.
- Open Infrastructure Map is an OSM-derived infrastructure context and vector-tile pipeline reference for power, telecoms, petroleum, water, and transport features where mapped.
- Amazon Location Service is a basemap/search/routing/provider-redundancy candidate, with Open Data Maps separate from commercial Esri/HERE/GrabMaps provider options.
- AEMET OpenData is a useful national-weather example for station observations, precipitation, radiation, radar/satellite products, forecasts, warnings, climatologies, and normals.
- DF Walker and similar field apps are user-authored observation/capture patterns for vegetation, forestry, polygon notes, offline orthophoto work, and GeoJSON export.

Implementation boundary:

- Infrastructure, nighttime lights, field notes, weather, and climate normals are advisory/context layers unless a source-specific contract says otherwise.
- They must not imply official utility location, service capacity, safety, parcel status, property-scale lighting truth, rainfall truth, hydrology truth, or legal/planning authority.

### Mapbox Satellite Optionality

Mapbox satellite can be useful for comparison, but it is optional and token-gated.

Implementation boundary:

- Do not make Mapbox the public default.
- Do not commit `NEXT_PUBLIC_MAPBOX_TOKEN`.
- Display Mapbox only when a deployment explicitly configures the token and terms are reviewed.

### mapboxapi R Workflow Reference

Reference: `https://github.com/walkerke/mapboxapi`

`mapboxapi` is an R package by Kyle Walker for using Mapbox web services from spatial data science workflows. The README describes geocoding, directions, matrix/routing analysis, Mapbox tileset upload workflows, and conversion of spatial analysis results into Mapbox-hosted vector tilesets. It is not a Mapbox GL JS wrapper.

Potential vmesh relevance:

- Useful as a workflow reference for geocoding, routing/matrix analysis, and tile-production pipelines in R.
- Shows how R spatial workflows can combine `sf`, Census/TIGER-style geometry, directions APIs, and vector-tile production.
- Reinforces the pattern of producing map-ready tiles or summaries outside the browser, then rendering a clean layer in the app.
- Could inform optional analyst notebooks for route accessibility, travel-time-to-hub, and local service reachability.

Implementation boundary:

- Mapbox API usage requires access tokens and Mapbox terms review, so it must remain optional and never be the open-source default.
- Do not commit Mapbox public or secret tokens.
- Prefer open equivalents for public vmesh demos: OSRM/Valhalla/GraphHopper for routing where feasible, PMTiles/MapLibre for display, and open source geocoding where feasible.
- If Mapbox-derived results are used in a private deployment, store provider ID, request timestamp, terms note, and whether coordinates were sent to Mapbox.

## Research Add-Ons For Later

### City2Graph Geospatial Graph Engine

References:

- `https://city2graph.net/latest/#features`
- `https://github.com/c2g-dev/city2graph`

City2Graph is a BSD-3-Clause Python library for transforming geospatial datasets into graph structures for spatial network analysis, GeoAI, Graph Neural Networks, NetworkX, and PyTorch Geometric. Its public documentation describes support for morphological graphs from buildings, streets, land use, OpenStreetMap, and Overture Maps; transportation graphs from GTFS; contiguity graphs from polygons such as land use, land cover, or administrative boundaries; mobility/OD matrices; POI proximity graphs; multi-center accessibility catchments; and layered isochrones.

Potential vmesh relevance:

- Turn open map features into actual relationships: roads connect to farms, markets, shelters, parcels, hubs, water points, power assets, and local services.
- Derive H3-level graph metrics such as accessibility, isolation, redundancy, centrality, route alternatives, service gaps, food-network reachability, and hub siting advantage.
- Support micro-layer reasoning for local food networks, properties, parcel context, community assets, shelters, repair capacity, and disaster logistics.
- Support macro/micro fusion: a hex can store climate/hazard exposure plus graph-derived recoverability, access, and redundancy.
- Bridge vmesh with the future knowledge graph direction by turning source-backed geometries into typed nodes and edges before summarizing them back to H3 cells.

Recommended architecture:

```text
Open map/climate/property sources
  -> Python/PostGIS preprocessing worker
    -> City2Graph graph construction
      -> NetworkX/PyTorch Geometric metrics where useful
        -> H3 summaries + graph edges + provenance
          -> vmesh globe and selected-hex panels
```

Implementation boundary:

- Do not run City2Graph in the browser.
- Use it as a local/server preprocessing worker or notebook/R&D pipeline.
- Preserve original geometry, CRS, source IDs, source timestamps, license, and transformation method before aggregating into H3.
- Keep GNN outputs as decision-support/model-derived signals with model version, input datasets, confidence, and limitations.
- Do not let graph-derived parcel or property insights imply legal boundary truth.
- Review dependency, licensing, and GPU/CPU runtime requirements before making it part of the default public workflow.

### Ground Station Satellite Tracker

Reference: `https://github.com/sgoudelis/ground-station`

Ground Station is a GPL-3.0 open-source satellite monitoring suite. Its public README describes a React/Redux/MUI frontend, FastAPI plus Socket.IO backend, worker processes, TLE synchronization from CelesTrak and SatNOGS, multi-target satellite tracking, SDR waterfall views, IQ recording, packet decoding, automated observation scheduling, antenna rotator control, Hamlib rig control, and SDR support for RTL-SDR, SoapySDR, UHD/USRP, and remote SDR devices.

Potential vmesh relevance:

- Future local hub add-on for satellite pass awareness, especially when a community hub wants to understand overhead satellite windows.
- Reference architecture for separating browser UI, backend orchestration, hardware/radio workers, recordings, decoders, and external orbital data sources.
- Possible inspiration for a vmesh "sky layer" showing satellite passes above a selected H3 cell or hub site.
- Useful pairing with resilient communications research, but distinct from Reticulum/Meshtastic. Satellite tracking/SDR workflows should remain an optional specialist add-on, not core V1 disaster messaging.
- Potential future bridge to store pass predictions, observation windows, decoded weather imagery, or radio observations as provenance-labelled records attached to a hub/H3 cell.

Implementation boundary:

- Do not add GPL code directly into vmesh without license review. Treat the repo as research and integration inspiration unless a separate process confirms compatibility.
- Do not require SDR hardware, rotators, rigs, or satellite reception for normal vmesh use.
- Do not present decoded satellite signals or weather imagery as authoritative unless source, acquisition time, decoding method, hardware chain, and confidence are captured.
- Any future ground-station bridge should run as a local service beside vmesh, similar to the Reticulum bridge pattern, with the browser consuming only status, pass predictions, and provenance-labelled outputs.

## Resilient Communications

### Reticulum / RNS

Reticulum should be the primary resilient communications stack for vmesh. It is a general-purpose, cryptographic, disruption-tolerant network stack with application APIs, multiple interface types, and user-facing ecosystems such as LXMF, Sideband, Nomad Network, MeshChat, and propagation nodes.

References:

- `https://reticulum.network/manual/reference.html`
- `https://reticulum.network/manual/software.html`
- `https://pypi.org/project/lxmf/`
- `https://reticulum.network/start.html`

Potential vmesh relevance:

- Provides a resilient application-network substrate rather than only a radio chat path.
- Supports low-bandwidth and intermittent networks when configured with suitable interfaces.
- LXMF handles messaging concerns such as routing, queues, receipts, retries, delayed delivery, and end-to-end encryption.
- Reticulum can operate over many media, including TCP/UDP/LAN/internet links and radio/LoRa-style interfaces where suitable hardware and configuration exist.
- A local bridge lets the web app remain a normal Next.js UI while a companion process owns identities, keys, interfaces, and network routing.

Recommended posture:

- Treat Reticulum/RNS as the main vmesh disaster-mode stack.
- Build a local `reticulum-bridge` service before live integration.
- Keep Reticulum private keys, RNS config, contact books, and interface secrets out of the public repo.
- Attach every received message to H3/user-data models with provenance, confidence, trust label, timestamp, and delivery metadata.

### Meshtastic Bridge

Meshtastic remains valuable for interoperability with widely deployed LoRa mesh users and gateway nodes, but vmesh should treat it as a bridge provider rather than the canonical network stack.

References:

- `https://meshtastic.org/docs/software/integrations/mqtt/`
- `https://meshtastic.org/docs/development/device/client-api/`
- `https://meshtastic.org/docs/software/web-client/`
- `https://meshtastic.org/docs/hardware/devices/`

Potential vmesh relevance:

- Lets vmesh exchange short field reports with Meshtastic users and local LoRa meshes.
- Supports local node access over USB/serial, BLE, TCP, or MQTT depending on device and environment.
- Public MQTT can help demos and connected operations, but should not be treated as disaster-primary infrastructure.
- Private gateways can bridge Reticulum-oriented vmesh deployments to local Meshtastic users, with careful filtering and rate limits.

Bridge constraints:

- Meshtastic payloads must be short and conservative.
- Rate limits and deduplication are required to avoid flooding low-bandwidth mesh networks.
- Location precision must be explicit and privacy-preserving.
- A physical Meshtastic node or trusted gateway is required for true LoRa network access.

Research question:

- What is the minimum safe common message schema that can move between Reticulum/LXMF and Meshtastic without overloading radio networks or confusing provenance?

## Current Implementation Boundaries

The app includes typed provider interfaces and deterministic mock data for weather, flood risk, fire risk, solar potential, food networks, property signals, Reticulum gateway status, Meshtastic bridge status, and local LLM status. These are implementation scaffolds, not claims that live providers are connected.

No paid APIs, API keys, scraped listings, exact private addresses, or live radio transmissions are used in V1. Property availability remains mock model data only until lawful source terms, privacy controls, and provenance handling are reviewed.

# vmesh Next Phase: Macro Data Atlas And Open Geospatial Source Funnel

You are Codex acting as a principal geospatial systems engineer, frontend architect, and cartographic design lead.

Repo: vmesh, "Atlas of Antifragility".

Objective: elevate vmesh beyond a simple MVP into a beautiful macro-scale geospatial intelligence aggregator. Do not start from scratch. Preserve the existing Next.js App Router, React, TypeScript, Zustand, MapLibre, deck.gl, H3, PMTiles, Tailwind, docs workflow, and current globe-first visual direction.

This phase focuses on macro data only:

- elevation, terrain, hillshade, contours, slope, aspect, and terrain-source provenance;
- climate and weather context, including heat, rainfall, drought, fire-weather, flood/lowland context, wind roses, climate sector mapping, and solar potential;
- solar access, including sun path, slope/aspect, terrain-horizon shading, optional source-backed obstruction shading, and cloud/irradiance context;
- vegetation, land cover, NDVI/NDWI/NBR-style imagery summaries, crop/land condition, and cloud-qualified Sentinel imagery.

Micro data such as local food networks and properties for sale remains future scope unless already present in the app. Do not expand micro features in this phase.

The product is a data intelligence aggregator first. Do not add scoring, recommendations, automated conclusions, or authoritative analysis yet. Show data, source, status, freshness, confidence, and limitations beautifully.

## Before Editing

1. Read `AGENTS.md`.
2. Read:
   - `docs/PRODUCT_SCOPE.md`
   - `docs/DESIGN_DIRECTION.md`
   - `docs/SYSTEM_DESIGN.md`
   - `docs/RESEARCH.md`
   - `docs/SECURITY_PRIVACY.md`
   - `docs/OPERATIONS.md`
   - `docs/TESTING.md`
   - `docs/CROSS_REPO_INSIGHTS.md`
3. Inspect current `app`, `components`, `lib`, `store`, `data`, `tests`, and `pipelines`.
4. Preserve the current globe-first UI: beautiful central globe, slim rail, floating modals, footer telemetry, source/provenance drawer, no body scroll.
5. Do not commit secrets, paid API keys, personal data, scraped listings, raw private coordinates, private planning files, or downloaded provider artifacts.
6. Keep changes scoped, typed, test-backed, and production-grade.

## Package-Service Insights To Import

Use adjacent geospatial package-service patterns as architecture references, not as codebases to copy wholesale.

Important lessons to bring into vmesh:

1. Geospatial honesty beats visual fakery.
   - Real source-backed data is preferred.
   - Fallbacks are allowed only when clearly labeled.
   - Inferred layers can be visually useful but must not become source truth.

2. Separate terrain roles.
   - `DTM`: bare-earth terrain, preferred for ground, contours, slope, hydrology, and terrain confidence.
   - `DEM`: generic elevation fallback, useful but confidence-capped.
   - `DSM`: surface model with buildings/canopy/bridges, context only unless explicitly needed as a surface layer.
   - `topobathy`: coastal/bathymetry product, useful for CUDEM/coastal context, not generic inland terrain.
   - `imagery-inferred-context`: ML or super-resolved imagery outputs, useful for visual/material and vegetation/water/bare-ground summaries only.

3. Use site-package style manifests.
   - vmesh should not let the renderer decide truth.
   - A data package or provider output should carry role, CRS, vertical datum, resolution, vintage, license, attribution, coverage, no-data handling, QA, confidence, and rejected-source reasons.
   - Useful payload names:
     - `terrain.json`
     - `imagery.json`
     - `landcover.json`
     - `environment.json`
     - `contours.json`
     - `provenance-manifest.json`
     - `h3-summary.json`

4. Use a data-broker pattern.
   - Add a broker/catalog layer that ranks open sources by AOI, source role, availability, coverage, license, and map-readiness.
   - A source can be `active-runtime`, `payload-ready`, `configured-source`, `broker-planned`, `research`, `premium`, or `disabled`.
   - Store why a source was selected, skipped, rejected, or downgraded.

5. Keep renderer outputs and source packages separate.
   - MapLibre consumes map-ready style/raster/vector/PMTiles sources.
   - H3 consumes summaries and provenance.
   - Browser UI consumes manifests and tile URLs.
   - Heavy processing runs server-side, offline, or on a local hub worker.

6. Sentinel/SEN2SR is a sidecar workflow.
   - Source Sentinel-2 L2A RGBN is 10 m.
   - SEN2SRLite RGBN x4 targets about 2.5 m display pixels.
   - Output truth status is `imagery-inferred-context`.
   - Use cloud-qualified AOIs, scene cloud cover, AOI clear ratio, model id, cache key, warnings, and derived NDVI/NDWI summaries.
   - Do not use super-resolved imagery for terrain confidence, legal boundaries, roads, buildings, parcels, emergency authority, or exact infrastructure claims.

7. Open vectors should become source-backed objects, not scraped basemap pixels.
   - Overture Maps GeoParquet, OSM PBF extracts, Geofabrik, Natural Earth, OpenAddresses, national hydrography, and regional open data should be preprocessed into source-backed objects, PMTiles, COGs, or H3 summaries.
   - Public raster/vector tile services are visual context and must not be scraped as source data.

## Product Goal

Build the first serious macro atlas layer for vmesh.

The user should be able to:

- open vmesh and see a beautiful globe;
- spin the globe with the mouse;
- search for a place or coordinates and fly smoothly into the area;
- toggle macro layer families on and off;
- inspect terrain, climate, hazard, and vegetation source status;
- see when a layer is live, cached, static, mock, derived, future-provider, fallback, unavailable, or token-gated;
- understand which sources are map-ready today and which are future preprocessing pipelines;
- keep the globe center stage without permanent dashboard clutter.

Do not make the app feel like a data table. It should feel like an atlas object: beautiful, tactile, scientific, and alive.

## Visual Direction

The map must look excellent.

- Globe first, UI second.
- No giant default H3 grid.
- H3 appears only as a selected-cell affordance, a focused overlay, or an enabled analytical layer.
- Use soft, sparse, beautiful H3 cells when macro overlays are active.
- Support dark and light globe modes.
- Preserve the slim left rail and floating modal pattern.
- Move dense panels into popovers, drawers, or modals so the globe remains center stage.
- Use subtle atmospheric glow, terrain shading, crisp labels, and elegant opacity transitions.
- When zoomed out, the globe should feel round and hovering.
- When zoomed in, the viewer should shift into a legible open-source map output for local inspection.
- Layer toggles should feel immediate and visually satisfying.

Recommended overlay treatment:

- terrain and hillshade: quiet, physical, relief-first;
- contours: thin, elegant, low-opacity, source-labelled;
- climate heat/rain/drought: scientific gradients, never alarmist;
- wind roses: clean polar diagrams with speed-bin color and clear period/source labels;
- climate sectors: elegant compass wedges for directional forces, not heavy map clutter;
- flood/lowland: blue/indigo transparency;
- fire weather: sand/amber/red transparency;
- solar: muted yellow to mint, with sun-path arcs and shading/horizon confidence shown separately;
- vegetation: mint/green/teal, with optional NDVI-style palette;
- crop/land condition: green to amber with clear provenance.

## Macro Layer Catalog

Create or improve `lib/layerCatalog.ts` as the unified macro layer registry.

Core types:

```ts
export type MacroLayerCategory =
  | "terrain"
  | "climate"
  | "hazard"
  | "solar"
  | "vegetation"
  | "imagery";

export type MacroLayerId =
  | "terrain-elevation"
  | "terrain-hillshade"
  | "terrain-contours"
  | "terrain-slope"
  | "terrain-aspect"
  | "climate-weather"
  | "climate-heat"
  | "climate-rainfall"
  | "climate-wind-rose"
  | "climate-sector-map"
  | "hazard-fire-weather"
  | "hazard-flood-lowland"
  | "hazard-drought"
  | "solar-potential"
  | "solar-sunpath"
  | "solar-shading"
  | "vegetation-ndvi"
  | "vegetation-ndwi"
  | "vegetation-landcover"
  | "vegetation-crop-condition"
  | "imagery-sentinel2"
  | "imagery-sen2sr";

export type LayerReadiness =
  | "active-runtime"
  | "payload-ready"
  | "configured-source"
  | "broker-planned"
  | "research"
  | "premium"
  | "disabled";

export type LayerDataStatus = "idle" | "loading" | "active" | "fallback" | "unavailable" | "error";

export type LayerSourceType = "live" | "cached" | "mock" | "derived" | "static" | "future-provider";

export type LayerVisualizationType =
  | "raster"
  | "vector"
  | "h3"
  | "hillshade"
  | "contour"
  | "marker"
  | "none";
```

Every layer definition must include:

- id;
- label;
- category;
- description;
- provider ids;
- readiness;
- status;
- source type;
- visualization type;
- opacity default;
- attribution;
- license/terms note;
- freshness;
- confidence;
- limitations;
- whether it is map-ready today;
- whether it needs preprocessing;
- whether it is safe for public demo.

## Source Broker And Package Contracts

Add or improve a provider/source broker based on a generic package-service discipline.

Suggested files:

- `lib/sourceBroker.ts`
- `lib/sourcePackages.ts`
- `lib/sourceProvenance.ts`
- `lib/terrainSources.ts`
- `lib/basemapSources.ts`
- `lib/macroSources.ts`
- `lib/imagerySources.ts`
- `lib/openMapSources.ts`
- `lib/climateDataSources.ts`

Core concepts:

```ts
export type GroundModelRole =
  | "bare-earth-dtm"
  | "generic-dem"
  | "surface-dsm"
  | "topobathy"
  | "imagery-inferred-context"
  | "visual-context"
  | "not-authoritative";

export interface SourceProvenance {
  providerId: string;
  sourceId: string;
  sourceType: LayerSourceType;
  sourceUrl?: string;
  acquiredAt?: string;
  processedAt?: string;
  vintage?: string;
  license: string;
  attribution: string;
  confidence: number;
  limitations: string[];
}

export interface DataPackageManifest {
  id: string;
  label: string;
  aoi: {
    h3Id?: string;
    bounds?: [number, number, number, number];
    centroid?: { latitude: number; longitude: number };
  };
  payloads: {
    terrain?: string;
    imagery?: string;
    landcover?: string;
    environment?: string;
    contours?: string;
    h3Summary?: string;
    provenance?: string;
  };
  sources: SourceProvenance[];
  rejectedSources: Array<{
    providerId: string;
    reason: string;
    status: LayerReadiness | LayerDataStatus;
  }>;
  createdAt: string;
  schemaVersion: string;
}
```

Rules:

- The broker recommends sources; the renderer only consumes normalized map-ready outputs.
- The broker should distinguish active browser sources from future package sources.
- Keep rejected-source reasons visible in source/provenance UI.
- Every package payload must preserve source, role, license, confidence, and limitations.
- Do not let imagery, landcover, or vector context raise terrain confidence.

## Terrain And Elevation

Terrain is the foundation.

Primary open terrain order:

1. Env-configured terrain provider if explicitly set.
2. Mapterhorn PMTiles terrain:
   - default URL: `https://download.mapterhorn.com/planet.pmtiles`;
   - PMTiles protocol through `pmtiles`;
   - Terrarium/RGB elevation where applicable;
   - primary open global terrain provider.
3. Mapzen / Joerd Terrarium:
   - `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`;
   - no-token fallback.
4. MapLibre demo terrain or offline nonblank shell.

Model future terrain rails, without live ingestion unless already implemented:

- CUDEM: coastal/topobathy, U.S. coastal zones, preprocessing required.
- USGS 3DEP: U.S. DTM/DEM rail, preprocessing or configured service required.
- Environment Agency LiDAR: England regional DTM rail.
- OS Terrain 50/5: Great Britain terrain rail, licensing/access reviewed.
- Scottish Remote Sensing Portal: Scotland DTM rail.
- Canada HRDEM and LidarBC: Canada regional rails.
- Bavaria DGM1, Netherlands AHN, swissALTI3D, LINZ, Norway Hoydedata, Finnish NLS, Geoscience Australia ELVIS: regional high-trust rails.
- FABDEM: license-gated/non-commercial unless separately licensed.
- OpenTopography: API/key-gated future provider.
- Copernicus DEM, NASADEM, JAXA AW3D30, ASTER, GEDTM30: global comparison or fallback candidates, not high-trust local DTM by default.

Implement or improve:

- terrain provider registry;
- terrain role metadata;
- terrain status in footer;
- terrain provider modal;
- terrain overlay toggle;
- hillshade layer;
- contour provider boundary;
- terrain QA metadata shape;
- source/provenance drawer details.

Contour rule:

- Browser MapLibre terrain uses raster-dem.
- Production contours should be precomputed from DEM/DTM into vector contour PMTiles or equivalent.
- Do not fake live contour extraction.
- If no real contour tiles exist, show honest placeholder/status only.

## Climate And Hazard Layers

Create or improve provider boundaries for:

- Open-Meteo selected-cell weather;
- NASA POWER solar/meteo;
- NOAA GFS open forecast grids;
- ERA5/CDS historical reanalysis and climate normals;
- NASA FIRMS active fire;
- terrain-derived flood/lowland/HAND-ready context;
- selected-cell and climate-normal wind roses;
- permaculture-style sector mapping for sun, wind, water, fire, frost/cold, access/noise/pollution, and wildlife corridors;
- drought/heat/fire-weather summaries;
- future H3 weather graph model preprocessing.

Rules:

- Browser live calls may query only selected H3 centroid or a small capped ring.
- Gridded forecast/reanalysis/model data belongs in server/offline/local-hub preprocessing.
- Every climate record must include provider, variable names, run time or observed time, forecast horizon where relevant, confidence, license, and limitations.
- Do not claim official warnings or emergency authority.
- Do not add paid APIs or credentials.

Suggested macro summary types:

```ts
export interface WeatherContextSummary {
  h3Id: string;
  centroid: { latitude: number; longitude: number };
  temperatureC?: number;
  apparentTemperatureC?: number;
  humidityPercent?: number;
  precipitationMm?: number;
  windSpeedKph?: number;
  windGustKph?: number;
  cloudCoverPercent?: number;
  source: SourceProvenance;
}

export interface HazardContextSummary {
  h3Id: string;
  floodLowlandClass?: "low" | "moderate" | "high" | "unknown";
  fireWeatherClass?: "low" | "moderate" | "high" | "unknown";
  droughtClass?: "low" | "moderate" | "high" | "unknown";
  inputs: string[];
  source: SourceProvenance;
}

export interface SolarPotentialSummary {
  h3Id: string;
  solarClass?: "low" | "medium" | "high" | "unknown";
  sunPathMethod?: "suncalc" | "pvlib" | "other" | "unknown";
  slopeAspectSource?: string;
  terrainHorizonSource?: string;
  obstructionSource?:
    | "none"
    | "dtm-horizon"
    | "dsm"
    | "lidar"
    | "building-heights"
    | "user-observed"
    | "unknown";
  shadingConfidence?: number;
  source: SourceProvenance;
}

export interface WindRoseSummary {
  h3Id: string;
  period: string;
  heightMeters: number;
  directionBinDegrees: number;
  calmFrequencyPercent: number;
  bins: Array<{
    directionFromDegrees: number;
    directionToDegrees: number;
    speedClass: string;
    frequencyPercent: number;
  }>;
  source: SourceProvenance;
}

export interface ClimateSectorMap {
  h3Id: string;
  sectors: Array<{
    id: string;
    type:
      | "summer-sun"
      | "winter-sun"
      | "prevailing-wind"
      | "cold-wind"
      | "rain-stormwater"
      | "flood-drainage"
      | "fire-approach"
      | "access"
      | "noise-pollution"
      | "wildlife-corridor"
      | "user-observed";
    angleStartDegrees: number;
    angleEndDegrees: number;
    seasonality?: string;
    intensity: "low" | "moderate" | "high" | "unknown";
    confidence: number;
    source: SourceProvenance;
  }>;
}
```

This phase should show context and provenance only. Do not add final antifragility analysis or recommendations.

## Solar Access, Shading, Wind Roses, And Climate Sectors

Solar potential must be possible for every selected area, but with honest source roles:

- Use SunCalc or an equivalent lightweight JavaScript solar-position library for browser sun-path previews, seasonal sun arcs, sunrise/sunset, and directional solar sectors.
- Use pvlib/NREL SPA-style preprocessing for robust solar position, irradiance transposition, PV context, and horizon-shading calculations.
- Use active DEM/DTM terrain for slope, aspect, and terrain-horizon shading.
- Use DSM/LiDAR/building-height/canopy sources only when source-backed; otherwise mark local obstruction shading unavailable.
- Use NASA POWER, Open-Meteo shortwave radiation/cloud cover, or equivalent reviewed sources for cloud/irradiance context.
- Treat NREL PVWatts as optional future API/key-gated production estimate support, not a public default.
- Never claim bankable PV design, financial output, or rooftop/building shade truth from terrain-only data.

Wind roses must be first-class macro context:

- Forecast wind roses may use selected-cell Open-Meteo wind speed/direction, capped and cached.
- Climate-normal wind roses should come from ERA5/GFS/station preprocessing, not broad browser calls.
- Each wind rose must include source, period, height above ground, direction bin size, speed bins, calm threshold, confidence, and limitations.
- Render with existing chart tooling or custom SVG/polar bars before adding a heavy new visualization dependency.

Permaculture-style climate sector mapping must be modeled as directional intelligence:

- Sector families: summer sun, winter sun, prevailing wind, cold wind/frost, rain/stormwater flow, flood/drainage, fire approach, access, noise/pollution, wildlife/corridor, and user-observed forces.
- Each sector has an angle range, intensity, seasonality, source, confidence, and limitations.
- Sector maps should be visually elegant compass overlays or modals, not permanent map clutter.
- Sector maps are inspectable context and playbook inputs, not automated design prescriptions.

Recommended research references:

- SunCalc JavaScript for browser sun path.
- pvlib Python for solar position, irradiance, and horizon shading.
- NASA POWER and Open-Meteo for solar/meteo context.
- NREL PVWatts for optional future PV estimates.
- Ladybug Tools for sun path, sky mask, and direct sun hours concepts.
- openair `windRose` for wind rose binning patterns.

## Vegetation, Landcover, And Imagery

Add vegetation as a first-class macro family.

Sources and provider boundaries:

- Sentinel-2 L2A via STAC/Earth Search;
- Fields of The World agricultural field boundaries;
- Sentinel SCL/cloud masks for AOI clear-pixel gating;
- SEN2SR/SEN2SRLite offline sidecar;
- Labelme or equivalent external annotation tools for reviewed masks, polygons, rectangles, oriented rectangles, and training fixtures;
- ESA WorldCover;
- Dynamic World;
- Hansen Global Forest Change;
- MODIS/VIIRS vegetation products where appropriate;
- Crop Monitor / GEOGLAM-style crop condition sources as research/provider boundary;
- regional landcover products such as NLCD, LANDFIRE, national habitat layers, and open forestry data.

The browser should display only:

- manifest-backed raster tiles;
- preview imagery;
- H3 summaries;
- provenance and confidence.

It should not:

- run PyTorch/SEN2SR;
- download full scenes;
- generate COGs;
- infer legal boundaries, roads, buildings, or infrastructure truth from imagery;
- treat super-resolution as measured orthophoto truth.

Add or improve:

- `ImageryTileManifest`;
- `VegetationContextSummary`;
- `AgriculturalFieldBoundarySummary`;
- `AnnotationFixtureManifest`;
- Sentinel cloud provenance;
- raster opacity controls;
- imagery layer modal;
- selected-cell vegetation summary;
- source/provenance drawer entries.

Fields of The World boundary:

- Treat FTW polygons as predicted agricultural field boundaries, not legal parcels, ownership records, or cadastral truth.
- Prefer PMTiles for visual inspection, GeoParquet/PostGIS/DuckDB for source-backed geometry processing, and Zarr/COG products for raster/model context.
- Derive H3 summaries such as field count, field density, field-size distribution, fragmentation, adjacency, and joins to vegetation/climate/water context.
- Preserve model version, product year, source product, confidence/quality metadata where available, license, attribution, and limitations.

Annotation boundary:

- Use Labelme-style tools as external/offline annotation workflows, not bundled app dependencies.
- Support sanitized reviewed fixtures for polygons, masks, rectangles, oriented rectangles, circles, lines, and points.
- Preserve source imagery, annotation tool/version, label schema, reviewer, review state, AI-assist status, confidence, and privacy redaction status.
- Treat SAM/AI-assisted annotations as draft labels until reviewed.
- Do not commit raw private imagery, EXIF-rich photos, private property screenshots, or sensitive infrastructure labels.

Required manifest fields:

```ts
export interface ImageryTileManifest {
  id: string;
  sourceSceneId: string;
  provider: string;
  acquiredAt: string;
  processedAt: string;
  bands: string[];
  sourceResolutionMeters: number;
  derivedResolutionMeters?: number;
  superResolutionModel?: string;
  truthStatus: "source-imagery" | "imagery-inferred-context";
  cloudCoverScenePercent?: number;
  clearPixelRatioAoi?: number;
  bounds: [number, number, number, number];
  h3Coverage: string[];
  license: string;
  provenance: SourceProvenance;
  tileUrl?: string;
  previewUrl?: string;
}
```

## H3 Role

H3 remains the spatial index and layer summary system.

Rules:

- U3 = broad macro/global summaries.
- U5 = regional planning summaries.
- U8 = focused local detail only inside selected U5 parent.
- Never generate global U8.
- H3 is not the knowledge graph itself.
- H3 is not a legal boundary or parcel system.
- H3 visual overlays should be sparse and purposeful.

For macro layers:

- Each active layer may render subtle H3 cells only where records exist.
- H3 tiles/summaries should carry source provenance and transformation method.
- For raster products, H3 stores summaries, not the original raster.
- For vector products, H3 stores aggregates/relationships, not a replacement for original geometry.

## UI Requirements

Create or improve a "Macro Atlas" modal opened from the left rail.

It should include:

- Terrain;
- Climate;
- Hazards;
- Solar;
- Wind;
- Sectors;
- Vegetation;
- Imagery;
- active provider;
- status badge;
- readiness badge;
- opacity slider;
- source/provenance button;
- mock/live/cached/static/derived/future-provider badges.

Keep the globe central.

Default viewport:

- beautiful globe visible;
- no permanent giant panels;
- no broad H3 wallpaper;
- slim rail;
- header/search;
- footer telemetry;
- selected-place marker;
- source status available but not crowding the canvas.

Selected-place macro panel should summarize:

- active layers;
- elevation/terrain source and role;
- hillshade/contour status;
- weather source status;
- hazard context source status;
- solar source status;
- wind rose source status;
- climate sector source status;
- vegetation/imagery source status;
- provenance and limitations.

Footer should show:

- basemap provider/status;
- terrain provider/status;
- contour status;
- active macro layer;
- macro source status;
- imagery provider/status;
- selected H3 tier/resolution;
- visible overlay count;
- data mode: live/cached/mock/static/derived/future.

## Map Rendering

Use MapLibre for the globe/map engine and deck.gl for analytical overlays.

Requirements:

- Globe is visible and beautiful on first load.
- Mouse drag spins/navigates naturally.
- Search by place or coordinates flies smoothly to location.
- Close zoom transitions into legible open-source map output.
- Terrain provider switching works or shows honest fallback.
- Hillshade/terrain overlay works when source allows it.
- Contours work only if a real contour provider exists; otherwise status is honest.
- H3 overlays are opt-in and meaningful.
- Layer opacity changes update the map without remounting the app.
- Map errors update Zustand/status UI instead of blanking the map.

## Data And Truth Boundaries

Do not add final analysis or recommendations in this phase.

Allowed:

- source catalogs;
- layer toggles;
- map-ready provider display;
- deterministic mock summaries;
- live selected-cell Open-Meteo if already safe/no-secret;
- manifest-backed imagery display;
- provenance, source status, confidence, and limitations;
- H3 summaries and transformation metadata.

Not allowed:

- paid provider calls;
- committed tokens;
- global U8 generation;
- scraping property listings;
- scraping public map tiles as data;
- treating imagery-derived features as legal/property/road/building truth;
- claiming official flood/fire/weather warning authority;
- presenting SEN2SR output as measured 2.5 m imagery;
- hiding fallback/mock/provider-boundary status.

## Tests

Add or update tests for:

- layer catalog normalization;
- source readiness/status handling;
- provider fallback order;
- terrain provider normalization;
- terrain role metadata and confidence caps;
- contour provider placeholder versus real provider status;
- macro layer toggles and opacity;
- source broker selected/skipped/rejected-source output;
- source provenance required fields;
- H3 tier rules and no global U8;
- weather/climate provider cache keys;
- solar sun-path/shading provenance and confidence caps;
- wind rose binning and metadata;
- climate sector angle normalization and source confidence;
- vegetation/imagery manifest validation;
- Sentinel cloud gate logic with fixtures only;
- SEN2SR manifest truth status;
- Mapbox provider disabled when token missing;
- no paid/secrets providers active by default;
- source/provenance drawer state.

Tests must not call live providers except where existing tests already explicitly mock or fixture those paths.

## Docs

Update:

- `docs/PRODUCT_SCOPE.md`
- `docs/DESIGN_DIRECTION.md`
- `docs/SYSTEM_DESIGN.md`
- `docs/RESEARCH.md`
- `docs/OPERATIONS.md`
- `docs/SECURITY_PRIVACY.md`
- `docs/TESTING.md`
- `docs/USER_GUIDE.md`
- `docs/CROSS_REPO_INSIGHTS.md`

Docs must explain:

- vmesh is a macro data atlas in this phase;
- micro data expansion is later;
- H3 is an index and summary layer, not default decoration;
- terrain roles: DTM, DEM, DSM, topobathy, imagery-inferred context;
- Mapterhorn and Mapzen roles;
- regional terrain rails and licensing/status boundaries;
- contour preprocessing path;
- climate/hazard provider boundaries;
- vegetation and Sentinel/SEN2SR sidecar path;
- source-package/data-broker pattern adopted;
- no paid APIs or secrets;
- no authoritative legal/emergency claims;
- no tile scraping.

## Verification

Run:

```bash
npm run format:check
npm run lint
npm test
npm run build
npm run agent-ready:check
npm run public-workflow:check
npm run privacy:check
npm audit --audit-level=moderate
```

Then run:

```bash
npm run dev
```

Browser verify:

- app loads locally;
- globe is visible, round, beautiful, and not flattened;
- mouse drag spins/navigates the globe;
- search/coordinates fly to location;
- close zoom becomes legible open-source map output;
- macro atlas modal opens from left rail;
- terrain/hillshade/contour controls work or report honest fallback;
- climate, hazard, solar, vegetation, and imagery toggles update state and map layers;
- no giant default H3 grid;
- H3 appears only for selected/focused/active macro layer purposes;
- source/provenance drawer shows provider, status, license, confidence, freshness, and limitations;
- footer telemetry updates;
- no body scroll;
- no uncaught console errors.

Final response should summarize:

- files changed;
- what now works;
- what remains mock/future-provider;
- package-service insights adopted;
- verification commands and results;
- localhost URL if dev server is running.

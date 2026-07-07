# vmesh Phase 29: Layer-Specific Source Ranking

You are Codex acting as the VMesh land-intelligence source broker.

## Goal

Add a deterministic source ranking system across every VMesh data type so a
coordinate/AOI request can return the best available source refs for Abundance
without pretending that all layers use the same quality criteria.

VMesh remains an aggregator/indexer. It returns ranked source decisions,
coverage/provenance evidence, fetch recipes, gaps, and rejected alternatives.
It does not store heavy payloads.

## Required Model

Use a 1-10 rank scale, where `1` is best and `10` is worst. The rank is
layer-specific source quality, not proof that a payload has already been
generated.

Every ranked source candidate must include:

- `layerId` and `dataType`;
- `sourceId`, label, provider, source role/subtype;
- `rank`, `rankLabel`, `confidenceTier`;
- `accessMode`, `processingCost`, `workerAction`;
- selected/rejected state for the AOI;
- coverage, resolution, status, access, warnings, blockers;
- evidence source: registry, reviewed BA source record, terrain adapter plan.

## Layer Ladders

Terrain:

1. Source-native official DTM raster API/COG/ImageServer/export endpoint.
2. Official <=1m DEM/DTM archives/tiles with deterministic worker processing.
3. Official source-indexed LiDAR/DEM where coverage is proven.
4. Official contour/DEMPoint/derived elevation with QA.
5. Best-available official/regional DTM such as HRDEM/3DEP/LidarBC with
   resolution clearly labelled.
6. Mapterhorn/Mapzen generic visual fallback only.

Buildings:

1. Official municipal/cadastral building footprints with height/levels where
   published.
2. Overture building theme.
3. OSM buildings.
4. Google/Microsoft ML footprints.
5. Other reviewed open building atlases.
6. License-gated/restricted building products.

Roads:

1. Official transport/municipal road centerlines.
2. Overture transportation.
3. OSM roads/paths.
4. OSM-derived infrastructure context.

Water/Hydrology:

1. Official local/regional hydrography.
2. HydroSHEDS/HydroRIVERS/HydroLAKES.
3. Overture/OSM water features.
4. Sentinel/Dynamic World water masks.

Soils/Landcover/Vegetation/Ecology:

1-2. Official local/national soil or habitat surveys where available. 2. USDA SSURGO/gSSURGO for US soils. 3. NLCD/LANDFIRE where regionally applicable. 4. ESA WorldCover/Dynamic World global landcover. 5. Sentinel-derived masks/indices and field-boundary products. 6. SoilGrids/Hansen/GEDI modelled global context.

Imagery:

1-2. Official/local orthophoto or source-native imagery endpoint. 4. Sentinel-2 L2A source imagery. 5. Super-resolution display products, labelled as inferred. 9. Token-gated commercial imagery unless license/review permits stronger use.

Climate/Weather:

1-2. Official station/hazard feed where available. 3. Open-Meteo point forecast context. 4. NASA POWER solar/meteo context. 6. ERA5/reanalysis or account-gated climate context.

Parcels/Field Boundaries:

1. Official parcel/cadastral GIS.
2. Predicted field-boundary products.
3. Address context.
4. Overture division/place context.
   Never represent predicted or address sources as legal parcel truth.

## Abundance Handoff

Expose `sourceRanking` in `vmesh-abundance-source-handoff-v1` as a sidecar
decision object. Do not change Abundance `site-runtime-pack.v1`.

Abundance must be able to read:

- selected source per layer;
- ranked alternatives and rejected-source reasons;
- access mode and expected worker path;
- confidence tier and fallback status.

## Gates

- `npx tsc --noEmit`
- targeted resolver/handoff/source-ranking Vitest
- `npm run privacy:check`
- no exact private coordinates, secrets, signed URLs, local paths, or raw bulky
  provider payloads in committed artifacts.

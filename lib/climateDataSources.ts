import type { ClimateDataSourceConfig, ClimateLayerId } from "@/lib/vmeshTypes";

export const OPEN_METEO_FORECAST_CLIMATE_SOURCE_ID = "open-meteo-forecast";
export const NASA_POWER_SOLAR_CLIMATE_SOURCE_ID = "nasa-power-solar";
export const NOAA_GFS_CLIMATE_SOURCE_ID = "noaa-gfs-open-data";
export const ERA5_CDS_CLIMATE_SOURCE_ID = "era5-cds-reanalysis";
export const NASA_FIRMS_CLIMATE_SOURCE_ID = "nasa-firms-active-fire";
export const TERRAIN_DERIVED_FLOOD_CLIMATE_SOURCE_ID = "terrain-derived-flood";
export const H3_WEATHER_GRAPH_CLIMATE_SOURCE_ID = "h3-weather-graph-model";

export interface ClimateDataFunnelSummary {
  totalSources: number;
  liveCapableSources: number;
  preprocessingSources: number;
  tokenFreeSources: number;
  layers: Record<ClimateLayerId, number>;
}

function withPriority(
  provider: Omit<ClimateDataSourceConfig, "priority">,
  priority: number
): ClimateDataSourceConfig {
  return { ...provider, priority };
}

function createLayerCount(): Record<ClimateLayerId, number> {
  return {
    weather: 0,
    "climate-trend": 0,
    solar: 0,
    flood: 0,
    fire: 0,
    drought: 0,
    "air-quality": 0
  };
}

export function getClimateDataSourceRegistry(): ClimateDataSourceConfig[] {
  return [
    withPriority(
      {
        id: OPEN_METEO_FORECAST_CLIMATE_SOURCE_ID,
        label: "Open-Meteo selected-cell forecast",
        kind: "point-forecast-api",
        layers: ["weather", "fire", "flood"],
        sourceUrl: "https://api.open-meteo.com/v1/forecast",
        attribution: "Open-Meteo",
        license: "Open-Meteo terms; no API key for V1 prototype",
        requiresApiKey: false,
        status: "available",
        queryMode: "selected-h3-centroid",
        notes:
          "Live-capable no-secret weather adapter. Query only selected H3 centroids or small capped rings, with cache and visible fallback."
      },
      10
    ),
    withPriority(
      {
        id: NASA_POWER_SOLAR_CLIMATE_SOURCE_ID,
        label: "NASA POWER solar/meteo",
        kind: "solar-meteo-api",
        layers: ["solar", "weather", "climate-trend", "drought"],
        sourceUrl: "https://power.larc.nasa.gov/api/",
        attribution: "NASA POWER Project",
        license: "NASA POWER terms and citation required",
        requiresApiKey: false,
        status: "future",
        queryMode: "server-side-batch",
        notes:
          "Best near-term open solar potential candidate. Implement server/local cache before using for broad map overlays."
      },
      20
    ),
    withPriority(
      {
        id: NOAA_GFS_CLIMATE_SOURCE_ID,
        label: "NOAA GFS open forecast grids",
        kind: "forecast-grid-open-data",
        layers: ["weather", "fire", "flood", "solar"],
        sourceUrl: "https://registry.opendata.aws/noaa-gfs-bdp-pds/",
        attribution: "NOAA / AWS Open Data",
        license: "NOAA public data; AWS Open Data access and egress terms apply",
        requiresApiKey: false,
        status: "preprocessing-required",
        queryMode: "offline-h3-precompute",
        notes:
          "Future gridded forecast ingestion path. Convert forecast fields into H3 summaries server-side; do not stream global GRIB files into the browser."
      },
      30
    ),
    withPriority(
      {
        id: ERA5_CDS_CLIMATE_SOURCE_ID,
        label: "ERA5 / Copernicus CDS reanalysis",
        kind: "reanalysis-preprocessing",
        layers: ["climate-trend", "drought", "weather", "fire", "flood", "solar"],
        sourceUrl: "https://cds.climate.copernicus.eu/datasets/reanalysis-era5-complete",
        attribution: "Copernicus Climate Change Service / ECMWF",
        license: "Copernicus/ECMWF terms; credentials and preprocessing required",
        requiresApiKey: true,
        status: "preprocessing-required",
        queryMode: "offline-h3-precompute",
        notes:
          "High-value historical climate baseline. Keep out of browser; derive H3 normals/anomalies with model run and variable provenance."
      },
      40
    ),
    withPriority(
      {
        id: NASA_FIRMS_CLIMATE_SOURCE_ID,
        label: "NASA FIRMS active fire",
        kind: "active-fire-observation",
        layers: ["fire", "air-quality"],
        sourceUrl: "https://firms.modaps.eosdis.nasa.gov/",
        attribution: "NASA FIRMS",
        license: "NASA FIRMS terms and attribution required",
        requiresApiKey: true,
        status: "requires-api-key",
        queryMode: "future-review",
        notes:
          "Future fire observation input. Treat detections as observations with latency/false-positive limits, not complete fire-risk truth."
      },
      50
    ),
    withPriority(
      {
        id: TERRAIN_DERIVED_FLOOD_CLIMATE_SOURCE_ID,
        label: "Terrain-derived flood scaffold",
        kind: "terrain-derived-hazard",
        layers: ["flood"],
        sourceUrl: "",
        attribution: "Derived from configured DEM, water, rainfall, and local constraints",
        license: "Derived-output terms depend on input DEM and hydrography sources",
        requiresApiKey: false,
        status: "future",
        queryMode: "offline-h3-precompute",
        notes:
          "HAND/lowland/water-proximity scaffold. Decision-support only; not an authoritative flood map."
      },
      60
    ),
    withPriority(
      {
        id: H3_WEATHER_GRAPH_CLIMATE_SOURCE_ID,
        label: "H3 weather graph model",
        kind: "climate-model-preprocessing",
        layers: ["weather", "climate-trend", "fire", "flood", "solar", "drought"],
        sourceUrl: "https://github.com/rkeisler/keisler-2022",
        attribution: "Model/source-specific; Keisler 2022 pattern reference",
        license: "Reference implementation MIT; input weather fields require separate terms",
        requiresApiKey: false,
        status: "future",
        queryMode: "offline-h3-precompute",
        notes:
          "Research path for mapping forecast/reanalysis fields into H3 graph summaries. Do not treat mock data as operational forecasting."
      },
      70
    )
  ].sort((a, b) => a.priority - b.priority);
}

export function getClimateSourcesForLayer(
  providers: ClimateDataSourceConfig[],
  layerId: ClimateLayerId
): ClimateDataSourceConfig[] {
  return providers
    .filter((provider) => provider.layers.includes(layerId))
    .sort((a, b) => a.priority - b.priority);
}

export function selectClimateSourceForLayer(
  providers: ClimateDataSourceConfig[],
  layerId: ClimateLayerId
): ClimateDataSourceConfig | undefined {
  const candidates = getClimateSourcesForLayer(providers, layerId);
  return (
    candidates.find((provider) => provider.status === "available") ??
    candidates.find((provider) => provider.status === "fallback") ??
    candidates[0]
  );
}

export function createClimateDataFunnelSummary(
  providers: ClimateDataSourceConfig[]
): ClimateDataFunnelSummary {
  const layers = createLayerCount();

  providers.forEach((provider) => {
    provider.layers.forEach((layerId) => {
      layers[layerId] += 1;
    });
  });

  return {
    totalSources: providers.length,
    liveCapableSources: providers.filter((provider) => provider.status === "available").length,
    preprocessingSources: providers.filter(
      (provider) =>
        provider.queryMode === "offline-h3-precompute" || provider.queryMode === "server-side-batch"
    ).length,
    tokenFreeSources: providers.filter((provider) => !provider.requiresApiKey).length,
    layers
  };
}

export function createClimateH3CacheKey({
  providerId,
  h3Id,
  layerId,
  period
}: {
  providerId: string;
  h3Id: string;
  layerId: ClimateLayerId;
  period: string;
}): string {
  return `${providerId}:${layerId}:${h3Id}:${period}`;
}

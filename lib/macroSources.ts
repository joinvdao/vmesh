import {
  ERA5_CDS_PROVIDER_ID,
  NASA_FIRMS_PROVIDER_ID,
  NASA_POWER_SOLAR_PROVIDER_ID,
  OPEN_METEO_BASE_URL,
  OPEN_METEO_PROVIDER_ID,
  TERRAIN_FLOOD_PROVIDER_ID
} from "@/lib/macroProviderIds";
import type { MacroCellSummary, MacroLayerId, MacroProviderConfig } from "@/lib/vmeshTypes";

export {
  ERA5_CDS_PROVIDER_ID,
  NASA_FIRMS_PROVIDER_ID,
  NASA_POWER_SOLAR_PROVIDER_ID,
  OPEN_METEO_BASE_URL,
  OPEN_METEO_PROVIDER_ID,
  TERRAIN_FLOOD_PROVIDER_ID
} from "@/lib/macroProviderIds";
export {
  buildOpenMeteoForecastUrl,
  createMacroSummaryFromOpenMeteo,
  fetchOpenMeteoMacroSummary,
  parseOpenMeteoForecastPayload
} from "@/lib/providers/openMeteoAdapter";
export type {
  FetchMacroSummaryOptions,
  OpenMeteoRequestConfig
} from "@/lib/providers/openMeteoAdapter";

export interface MacroCacheKeyInput {
  providerId: string;
  h3Id: string;
  at: Date;
}

function withPriority(
  provider: Omit<MacroProviderConfig, "priority">,
  priority: number
): MacroProviderConfig {
  return { ...provider, priority };
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export function getMacroProviderRegistry(): MacroProviderConfig[] {
  return [
    withPriority(
      {
        id: OPEN_METEO_PROVIDER_ID,
        label: "Open-Meteo forecast",
        kind: "open-meteo-forecast",
        sourceUrl: OPEN_METEO_BASE_URL,
        attribution: "Open-Meteo weather forecast APIs",
        license: "No-key prototype use; verify Open-Meteo terms before production",
        requiresApiKey: false,
        status: "available",
        notes:
          "Live-capable selected-centroid weather adapter with timeout, cache, and mock fallback."
      },
      10
    ),
    withPriority(
      {
        id: NASA_POWER_SOLAR_PROVIDER_ID,
        label: "NASA POWER solar/meteo",
        kind: "nasa-power-solar",
        sourceUrl: "https://power.larc.nasa.gov/api/",
        attribution: "NASA POWER",
        license: "NASA open data with attribution; verify endpoint terms",
        requiresApiKey: false,
        status: "future",
        notes: "Solar/meteo candidate provider. Kept as interface boundary until adapter review."
      },
      20
    ),
    withPriority(
      {
        id: ERA5_CDS_PROVIDER_ID,
        label: "ERA5 CDS reanalysis",
        kind: "era5-cds-reanalysis",
        sourceUrl: "https://cds.climate.copernicus.eu/",
        attribution: "Copernicus Climate Change Service / ECMWF",
        license: "Dataset-specific CDS terms",
        requiresApiKey: true,
        status: "preprocessing-required",
        notes:
          "Expert/offline preprocessing provider only. Do not fetch from the browser or commit credentials."
      },
      30
    ),
    withPriority(
      {
        id: NASA_FIRMS_PROVIDER_ID,
        label: "NASA FIRMS active fire",
        kind: "nasa-firms-active-fire",
        sourceUrl: "https://firms.modaps.eosdis.nasa.gov/",
        attribution: "NASA FIRMS",
        license: "NASA/Earthdata terms; access requirements must be reviewed",
        requiresApiKey: true,
        status: "future",
        notes: "Future fire input. Not called in V1 macro UI."
      },
      40
    ),
    withPriority(
      {
        id: TERRAIN_FLOOD_PROVIDER_ID,
        label: "Terrain-derived flood scaffold",
        kind: "terrain-derived-flood",
        sourceUrl: "derived-from-active-dem",
        attribution: "Derived from configured DEM provider",
        license: "Derived product; source DEM attribution required",
        requiresApiKey: false,
        status: "future",
        notes:
          "Flood/HAND-ready architecture scaffold. It must not be presented as an authoritative flood map."
      },
      50
    )
  ];
}

export function selectMacroProvider(
  providers: MacroProviderConfig[],
  preferredProviderId = OPEN_METEO_PROVIDER_ID
): MacroProviderConfig {
  return (
    providers.find((provider) => provider.id === preferredProviderId) ??
    providers.find((provider) => provider.status === "available") ??
    providers[0]
  );
}

export function createMacroCacheKey({ providerId, h3Id, at }: MacroCacheKeyInput): string {
  const hour = at.toISOString().slice(0, 13);
  return `${providerId}:${h3Id}:${hour}`;
}

export const MACRO_LAYER_LABELS: Record<MacroLayerId, string> = {
  weather: "Weather",
  flood: "Flood",
  fire: "Fire",
  solar: "Solar",
  "climate-trend": "Climate trend",
  "terrain-elevation": "Elevation",
  "terrain-hillshade": "Hillshade",
  "terrain-contours": "Contours",
  "terrain-slope": "Slope",
  "terrain-aspect": "Aspect",
  "climate-weather": "Weather",
  "climate-heat": "Heat",
  "climate-rainfall": "Rainfall",
  "hazard-fire-weather": "Fire weather",
  "hazard-flood-lowland": "Flood / lowland",
  "hazard-drought": "Drought",
  "solar-potential": "Solar potential",
  "vegetation-ndvi": "NDVI",
  "vegetation-ndwi": "NDWI",
  "vegetation-landcover": "Land cover",
  "vegetation-crop-condition": "Crop condition",
  "imagery-sentinel2": "Sentinel-2",
  "imagery-sen2sr": "SEN2SR"
};

export function getMacroLayerValue(summary: MacroCellSummary, layerId: MacroLayerId): number {
  if (layerId === "weather" || layerId === "climate-weather" || layerId === "climate-heat") {
    return summary.forecast.stressScore;
  }
  if (layerId === "climate-rainfall") return Math.min(100, summary.forecast.next72hRainMm * 4);
  if (layerId === "flood" || layerId === "hazard-flood-lowland") return summary.flood.exposureScore;
  if (layerId === "fire" || layerId === "hazard-fire-weather") return summary.fire.exposureScore;
  if (layerId === "hazard-drought") {
    return clamp(100 - summary.weather.relativeHumidityPercent);
  }
  if (layerId === "solar" || layerId === "solar-potential") return summary.solar.practicalityScore;
  if (layerId.startsWith("terrain-")) return clamp(45 + summary.resolution * 4);
  if (layerId.startsWith("vegetation-")) {
    return clamp(60 + summary.solar.cloudPenalty - summary.fire.exposureScore / 5);
  }
  if (layerId.startsWith("imagery-")) return summary.provenance.confidence;
  return clamp(50 + summary.climateTrend.temperatureAnomalyC * 15);
}

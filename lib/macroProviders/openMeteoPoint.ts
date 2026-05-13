import { OPEN_METEO_PROVIDER_ID } from "@/lib/macroSources";
import type { MacroPackageProviderBoundary } from "@/lib/macroProviders/types";

export const openMeteoPointBoundary: MacroPackageProviderBoundary = {
  providerId: OPEN_METEO_PROVIDER_ID,
  label: "Open-Meteo selected-cell weather",
  packageRole: "selected-cell-live",
  defaultEnabled: true,
  browserFetchAllowed: true,
  variables: [
    "temperature_2m",
    "apparent_temperature",
    "precipitation",
    "rain",
    "wind_speed_10m",
    "wind_gusts_10m",
    "relative_humidity_2m",
    "cloud_cover"
  ],
  outputLayers: ["climate-weather", "climate-rainfall", "hazard-fire-weather"],
  requiredProvenance: ["h3Id", "centroid", "requestedAt", "validFrom", "validTo", "providerUrl"],
  limitations: [
    "Selected centroid only unless a future capped-ring package worker is explicitly enabled.",
    "Weather context only; not an official warning feed."
  ]
};

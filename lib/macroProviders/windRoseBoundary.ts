import type { MacroPackageProviderBoundary } from "@/lib/macroProviders/types";

export const windRoseBoundary: MacroPackageProviderBoundary = {
  providerId: "wind-rose-package",
  label: "Wind rose package boundary",
  packageRole: "server-preprocessing",
  defaultEnabled: false,
  browserFetchAllowed: false,
  variables: ["wind_speed", "wind_direction", "height_above_ground", "period"],
  outputLayers: ["climate-weather", "hazard-fire-weather"],
  requiredProvenance: ["provider", "height", "period", "directionBins", "calmThreshold"],
  limitations: [
    "Climate/design context only; not structural wind engineering or turbine siting certification."
  ]
};

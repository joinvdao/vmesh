import type { MacroPackageProviderBoundary } from "@/lib/macroProviders/types";

export const climateSectorBoundary: MacroPackageProviderBoundary = {
  providerId: "climate-sector-package",
  label: "Climate sector map package boundary",
  packageRole: "local-hub-preprocessing",
  defaultEnabled: false,
  browserFetchAllowed: false,
  variables: ["sun_sector", "wind_sector", "water_flow", "fire_approach", "user_observed_forces"],
  outputLayers: ["climate-weather", "hazard-flood-lowland", "hazard-fire-weather"],
  requiredProvenance: ["sectorType", "angleRange", "seasonality", "source", "confidence"],
  limitations: [
    "Directional design intelligence only; not automated permaculture prescription or official hazard mapping."
  ]
};

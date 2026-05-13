import { NASA_POWER_SOLAR_PROVIDER_ID, TERRAIN_FLOOD_PROVIDER_ID } from "@/lib/macroSources";
import type { MacroPackageProviderBoundary } from "@/lib/macroProviders/types";

export const solarAccessBoundary: MacroPackageProviderBoundary = {
  providerId: "solar-access-package",
  label: "Solar access package boundary",
  packageRole: "local-hub-preprocessing",
  defaultEnabled: false,
  browserFetchAllowed: false,
  variables: ["sun_path", "slope", "aspect", "terrain_horizon", "cloud_context"],
  outputLayers: ["solar-potential"],
  requiredProvenance: [
    "sunPositionMethod",
    "terrainProvider",
    "cloudProvider",
    "period",
    "limitations"
  ],
  limitations: [
    `Depends on ${NASA_POWER_SOLAR_PROVIDER_ID} and ${TERRAIN_FLOOD_PROVIDER_ID} style inputs when reviewed.`,
    "Planning context only; not bankable PV engineering, financial yield, or installation advice."
  ]
};

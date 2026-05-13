import { NASA_FIRMS_PROVIDER_ID } from "@/lib/macroSources";
import type { MacroPackageProviderBoundary } from "@/lib/macroProviders/types";

export const firmsBoundary: MacroPackageProviderBoundary = {
  providerId: NASA_FIRMS_PROVIDER_ID,
  label: "NASA FIRMS active-fire package boundary",
  packageRole: "server-preprocessing",
  defaultEnabled: false,
  browserFetchAllowed: false,
  variables: ["latitude", "longitude", "brightness", "confidence", "acq_date", "satellite"],
  outputLayers: ["hazard-fire-weather"],
  requiredProvenance: ["satellite", "acquiredAt", "confidence", "providerTerms"],
  limitations: [
    "Fire context only; not an emergency alerting, evacuation, or official incident feed.",
    "Access and emergency-use constraints must be reviewed before production use."
  ]
};

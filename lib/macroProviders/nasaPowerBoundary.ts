import { NASA_POWER_SOLAR_PROVIDER_ID } from "@/lib/macroSources";
import type { MacroPackageProviderBoundary } from "@/lib/macroProviders/types";

export const nasaPowerBoundary: MacroPackageProviderBoundary = {
  providerId: NASA_POWER_SOLAR_PROVIDER_ID,
  label: "NASA POWER solar/meteo package boundary",
  packageRole: "server-preprocessing",
  defaultEnabled: false,
  browserFetchAllowed: false,
  variables: ["ALLSKY_SFC_SW_DWN", "T2M", "PRECTOTCORR", "WS10M", "RH2M"],
  outputLayers: ["solar-potential", "climate-weather", "climate-rainfall"],
  requiredProvenance: ["providerCitation", "temporalAggregation", "variables", "generatedAt"],
  limitations: [
    "Package worker only; do not call NASA POWER broadly from the browser.",
    "Solar context is not a bankable PV engineering estimate."
  ]
};

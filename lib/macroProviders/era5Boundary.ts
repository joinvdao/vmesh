import { ERA5_CDS_PROVIDER_ID } from "@/lib/macroSources";
import type { MacroPackageProviderBoundary } from "@/lib/macroProviders/types";

export const era5Boundary: MacroPackageProviderBoundary = {
  providerId: ERA5_CDS_PROVIDER_ID,
  label: "ERA5/CDS climate normal package boundary",
  packageRole: "server-preprocessing",
  defaultEnabled: false,
  browserFetchAllowed: false,
  variables: ["2m_temperature", "total_precipitation", "10m_wind", "soil_moisture"],
  outputLayers: ["climate-heat", "climate-rainfall", "hazard-drought"],
  requiredProvenance: ["dataset", "modelRunAt", "timePeriod", "variables", "license"],
  limitations: [
    "Requires offline/server preprocessing and CDS credential handling outside Git.",
    "Climate-normal context, not local operational forecasting."
  ]
};

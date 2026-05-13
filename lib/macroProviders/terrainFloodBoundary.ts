import { TERRAIN_FLOOD_PROVIDER_ID } from "@/lib/macroSources";
import type { MacroPackageProviderBoundary } from "@/lib/macroProviders/types";

export const terrainFloodBoundary: MacroPackageProviderBoundary = {
  providerId: TERRAIN_FLOOD_PROVIDER_ID,
  label: "Terrain-derived flood/HAND package boundary",
  packageRole: "local-hub-preprocessing",
  defaultEnabled: false,
  browserFetchAllowed: false,
  variables: ["dem_source", "hand_proxy", "flow_accumulation_proxy", "lowland_index"],
  outputLayers: ["hazard-flood-lowland", "terrain-slope", "terrain-aspect"],
  requiredProvenance: ["demSource", "groundModelRole", "resolution", "method", "generatedAt"],
  limitations: [
    "Planning context only; not an authoritative flood map.",
    "DSM, imagery, and decorative globe texture cannot upgrade flood or terrain confidence."
  ]
};

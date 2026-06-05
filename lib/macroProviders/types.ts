import type { MacroLayerId } from "@/lib/vmeshTypes";

export interface MacroPackageProviderBoundary {
  providerId: string;
  label: string;
  packageRole:
    | "selected-cell-live"
    | "fixture"
    | "server-preprocessing"
    | "local-hub-preprocessing"
    | "future-review";
  defaultEnabled: boolean;
  browserFetchAllowed: boolean;
  variables: string[];
  outputLayers: MacroLayerId[];
  requiredProvenance: string[];
  limitations: string[];
}

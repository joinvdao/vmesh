import type {
  MacroCellSummary,
  MacroDataSourceKind,
  MacroLayerId,
  MeshTier
} from "@/lib/vmeshTypes";

export const MACRO_PACKAGE_SCHEMA_VERSION = "vmesh-macro-package-v1";

export type MacroPackageMode =
  | "live-selected-cell"
  | "fixture-package"
  | "cached-package"
  | "mock-fallback"
  | "future-provider"
  | "unavailable";

export type MacroPackageArtifactKind =
  | "h3-summary-json"
  | "h3-summary-pmtiles"
  | "raster-cog"
  | "vector-pmtiles"
  | "manifest-only";

export interface MacroPackageAoi {
  label: string;
  bounds: [number, number, number, number];
  centroid: {
    latitude: number;
    longitude: number;
  };
  privacy: "public-demo" | "coarse-aoi" | "private-local";
}

export interface MacroPackageTimeWindow {
  validFrom: string;
  validTo: string;
  cadence: "fixture" | "hourly" | "daily" | "monthly" | "climate-normal";
}

export interface MacroPackageProviderRun {
  providerId: string;
  providerLabel: string;
  sourceType: MacroDataSourceKind;
  status: MacroPackageMode;
  requestedAt: string;
  modelRunAt?: string;
  variables: string[];
  license: string;
  limitations: string;
  confidence: number;
}

export interface MacroPackageArtifact {
  kind: MacroPackageArtifactKind;
  path: string;
  contentHash: string;
  recordCount: number;
  h3Resolution: number;
  layerIds: MacroLayerId[];
  generatedAt: string;
}

export interface MacroPackageQualityGates {
  maxCells: number;
  fixtureOnly: boolean;
  noPrivateAddresses: boolean;
  noBrowserGridFetches: boolean;
  noPaidProviderCalls: boolean;
  h3ResolutionAligned: boolean;
  provenanceComplete: boolean;
  providerTermsReviewed: boolean;
  licenseAttributionComplete: boolean;
  freshnessWindowBounded: boolean;
  confidenceDocumented: boolean;
  limitationsDocumented: boolean;
  noAuthorityClaims: boolean;
}

export interface MacroPackageManifest {
  schemaVersion: typeof MACRO_PACKAGE_SCHEMA_VERSION;
  packageId: string;
  packageVersion: string;
  generatedAt: string;
  mode: MacroPackageMode;
  aoi: MacroPackageAoi;
  h3Resolution: number;
  h3Tiers: MeshTier[];
  timeWindow: MacroPackageTimeWindow;
  sourceRun: {
    id: string;
    generatedBy: "fixture-builder" | "local-hub" | "server-worker";
    liveNetworkUsed: boolean;
  };
  providers: MacroPackageProviderRun[];
  layers: MacroLayerId[];
  artifacts: MacroPackageArtifact[];
  summaryStats: {
    cellCount: number;
    minConfidence: number;
    maxConfidence: number;
    meanConfidence: number;
  };
  qualityGates: MacroPackageQualityGates;
  privacy: {
    containsUserRecords: boolean;
    containsExactPrivateAddresses: boolean;
    aoiPrecision: "h3" | "bounds" | "coarse-region";
  };
  limitations: string[];
}

export interface MacroPackageH3SummaryArtifact {
  schemaVersion: typeof MACRO_PACKAGE_SCHEMA_VERSION;
  packageId: string;
  packageVersion: string;
  generatedAt: string;
  records: PackagedMacroCellSummary[];
}

export interface PackagedMacroCellSummary extends MacroCellSummary {
  packageId: string;
  packageVersion: string;
  packageMode: MacroPackageMode;
  qualityFlags: string[];
  inputVariables: string[];
  modelRunAt: string;
  validFrom: string;
  validTo: string;
  license: string;
  limitations: string;
}

export function macroPackageModeLabel(mode: MacroPackageMode): string {
  const labels: Record<MacroPackageMode, string> = {
    "live-selected-cell": "Live selected-cell",
    "fixture-package": "Fixture package",
    "cached-package": "Cached package",
    "mock-fallback": "Mock fallback",
    "future-provider": "Future provider",
    unavailable: "Unavailable"
  };
  return labels[mode];
}

export function sourceTypeToPackageMode(sourceType: MacroDataSourceKind): MacroPackageMode {
  if (sourceType === "live") return "live-selected-cell";
  if (sourceType === "package") return "cached-package";
  if (sourceType === "fixture") return "fixture-package";
  if (sourceType === "mock" || sourceType === "derived" || sourceType === "cached") {
    return "mock-fallback";
  }
  return sourceType === "future-provider" ? "future-provider" : "unavailable";
}

export function packageSummaryToMacroCellSummary(
  summary: PackagedMacroCellSummary
): MacroCellSummary {
  return {
    h3Id: summary.h3Id,
    tier: summary.tier,
    resolution: summary.resolution,
    centroid: summary.centroid,
    weather: summary.weather,
    forecast: summary.forecast,
    climateTrend: summary.climateTrend,
    flood: summary.flood,
    fire: summary.fire,
    solar: summary.solar,
    provenance: summary.provenance
  };
}

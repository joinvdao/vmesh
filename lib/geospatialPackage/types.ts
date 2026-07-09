export type PackageLayerId =
  | "terrain"
  | "imagery"
  | "roads"
  | "buildings"
  | "water"
  | "vegetation"
  | "ecology"
  | "soil"
  | "parcels"
  | "climate"
  | "hydrology"
  | "contours"
  | "landcover"
  | "field-boundaries";

export type PackageSourceStatus =
  | "open"
  | "configured"
  | "cached"
  | "blocked"
  | "missing"
  | "preprocessing-required"
  | "token-gated"
  | "license-gated"
  | "paid"
  | "future";

export type PackageAccessClass =
  | "open"
  | "local"
  | "token-gated"
  | "license-gated"
  | "paid"
  | "blocked";

export type PackageArtifactKind =
  | "pmtiles"
  | "vector-tiles"
  | "raster-tiles"
  | "cog"
  | "zarr"
  | "geoparquet"
  | "h3-summary"
  | "manifest"
  | "api"
  | "none";

export type PackageProbeStrategy =
  | "static-url"
  | "stac-search"
  | "catalog-lookup"
  | "bounded-api"
  | "bulk-preprocess"
  | "configured-local-cache"
  | "manual-review"
  | "not-available";

export type PackageArtifactStatus =
  | "ready-external"
  | "planned"
  | "cache-hit"
  | "blocked"
  | "unavailable";

export interface PackageCoordinate {
  latitude: number;
  longitude: number;
}

export type PackageBounds = [number, number, number, number];

export interface PackageAoiInput {
  h3Id?: string;
  centroid?: PackageCoordinate;
  bounds?: PackageBounds;
  label?: string;
}

export type PackageAoiDisclosure = "exact-centroid" | "h3-cell" | "bounds" | "fallback-sample";

export interface NormalizedPackageAoi extends Required<PackageAoiInput> {
  resolution: number;
}

export interface GeospatialSourceCandidate {
  id: string;
  label: string;
  layerIds: PackageLayerId[];
  status: PackageSourceStatus;
  access: PackageAccessClass;
  artifactKinds: PackageArtifactKind[];
  coverage: string;
  resolution: string;
  sourceUrl: string;
  attribution: string;
  license: string;
  requiresApiKey: boolean;
  mapReady: boolean;
  packageReady: boolean;
  cacheable: boolean;
  priority: number;
  probeStrategy: PackageProbeStrategy;
  truthRole: string;
  limitations: string[];
  notes: string;
}

export interface SourceProbeResult {
  sourceId: string;
  sourceLabel: string;
  layerId: PackageLayerId;
  status: PackageSourceStatus;
  access: PackageAccessClass;
  coverageStatus: "covers-aoi" | "probable" | "regional-check-required" | "unknown" | "unavailable";
  selected: boolean;
  reason: string;
  canGenerateArtifacts: boolean;
  artifactKinds: PackageArtifactKind[];
  estimatedSteps: string[];
}

export interface PackagePlanArtifact {
  layerId: PackageLayerId;
  sourceId: string;
  kind: PackageArtifactKind;
  status: PackageArtifactStatus;
  cacheKey: string;
  url: string | null;
  generator: string;
  provenance: {
    providerId: string;
    attribution: string;
    license: string;
    limitations: string[];
  };
}

export interface PackagePlanRequest {
  aoi: PackageAoiInput;
  layers: PackageLayerId[];
  preferredSourceIds?: string[];
  consumerAppId?: string;
  maxResolution?: number;
  offline?: boolean;
}

export interface PackagePlanManifest {
  packageId: string;
  schemaVersion: string;
  manifestUrl: string;
  artifactCount: number;
  aoi: NormalizedPackageAoi;
  aoiDisclosure: PackageAoiDisclosure;
  requestedLayers: PackageLayerId[];
  consumerAppId: string;
}

export interface GeospatialPackagePlan {
  id: string;
  schemaVersion: string;
  createdAt: string;
  aoi: NormalizedPackageAoi;
  aoiDisclosure: PackageAoiDisclosure;
  requestedLayers: PackageLayerId[];
  selectedSources: Record<PackageLayerId, GeospatialSourceCandidate | null>;
  probes: SourceProbeResult[];
  artifacts: PackagePlanArtifact[];
  manifest: PackagePlanManifest;
  rejectedSources: SourceProbeResult[];
  warnings: string[];
  nextActions: string[];
  apiSurface: {
    listSources: string;
    planPackage: string;
    getManifest: string;
    mcpToolNamespace: string;
  };
}

import type {
  GeospatialSourceCandidate,
  PackageAccessClass,
  PackageArtifactKind,
  PackageLayerId,
  PackageProbeStrategy,
  PackageSourceStatus
} from "@/lib/geospatialPackage/types";

export interface SourceInput {
  id: string;
  label: string;
  layerIds: PackageLayerId[];
  status: PackageSourceStatus;
  access?: PackageAccessClass;
  artifactKinds: PackageArtifactKind[];
  coverage: string;
  resolution: string;
  sourceUrl: string;
  attribution: string;
  license: string;
  requiresApiKey?: boolean;
  mapReady?: boolean;
  packageReady?: boolean;
  cacheable?: boolean;
  priority: number;
  probeStrategy: PackageProbeStrategy;
  truthRole: string;
  limitations: string[];
  notes: string;
}

export function source(input: SourceInput): GeospatialSourceCandidate {
  return {
    access: input.access ?? "open",
    requiresApiKey: input.requiresApiKey ?? false,
    mapReady: input.mapReady ?? false,
    packageReady: input.packageReady ?? false,
    cacheable: input.cacheable ?? true,
    ...input
  };
}

export function configuredOrFuture(url: string | undefined): PackageSourceStatus {
  return url?.trim() ? "configured" : "future";
}

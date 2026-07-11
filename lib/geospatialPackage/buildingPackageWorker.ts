import {
  createGeospatialPackagePlan,
  type PackagePlannerOptions
} from "@/lib/geospatialPackage/planner";
import {
  getGeospatialSourceRegistry,
  getPackageSourcesByLayer
} from "@/lib/geospatialPackage/sourceRegistry";
import type {
  GeospatialPackagePlan,
  GeospatialSourceCandidate,
  NormalizedPackageAoi,
  PackageAoiDisclosure,
  PackageAoiInput,
  PackageArtifactKind,
  PackageSourceStatus,
  SourceProbeResult
} from "@/lib/geospatialPackage/types";
import { createPackageCacheKey, stableId } from "@/lib/geospatialPackage/plannerUtils";

export const BUILDING_PACKAGE_WORKER_SCHEMA_VERSION = "vmesh-building-package-worker-v1";
export const BUILDING_PACKAGE_OUTPUT_FILE = "buildings.json";

export const DEFAULT_BUILDING_SOURCE_PREFERENCES = [
  "official-building-footprints",
  "overture-maps-geoparquet",
  "openstreetmap-pbf-extracts",
  "microsoft-building-footprints",
  "google-open-buildings",
  "global-building-atlas-odbl-polygons",
  "openaddresses"
] as const;

export type BuildingPackageMaterializationStatus = "planned" | "ready" | "blocked";
export type BuildingPackageWorkerRole = "primary" | "fallback" | "review-required" | "not-selected";

export interface BuildingPackageWorkerInput {
  aoi: PackageAoiInput;
  consumerAppId?: string;
  preferredSourceIds?: string[];
  offline?: boolean;
}

export interface BuildingPackageSourceLadderEntry {
  sourceId: string;
  label: string;
  selected: boolean;
  workerRole: BuildingPackageWorkerRole;
  status: PackageSourceStatus;
  access: GeospatialSourceCandidate["access"];
  coverageStatus: SourceProbeResult["coverageStatus"];
  artifactKinds: PackageArtifactKind[];
  truthRole: string;
  attribution: string;
  license: string;
  canMaterialize: boolean;
  reason: string;
  limitations: string[];
}

export interface BuildingPackageOutputContract {
  fileName: typeof BUILDING_PACKAGE_OUTPUT_FILE;
  contentType: "application/geo+json";
  format: "GeoJSON FeatureCollection";
  coordinateReferenceSystem: "EPSG:4326";
  geometryTypes: ["Polygon", "MultiPolygon"];
  status: BuildingPackageMaterializationStatus;
  cacheKey: string;
  plannedCacheRef: string;
  readyUrl: string | null;
  featureCount: number | null;
  selectedSourceId: string | null;
  generatedBy: "geospatial-package-worker";
  requiredFeatureProperties: string[];
}

export interface BuildingPackageWorkerRequest {
  jobId: string;
  packageId: string;
  layerId: "buildings";
  aoi: NormalizedPackageAoi;
  aoiDisclosure: PackageAoiDisclosure;
  selectedSourceId: string | null;
  sourceLadder: BuildingPackageSourceLadderEntry[];
  output: BuildingPackageOutputContract;
  workerSteps: string[];
  policies: {
    noSyntheticFill: true;
    preserveSourceFeatureIds: true;
    preserveAttributionAndLicense: true;
    keepRawDownloadsOutOfGit: true;
  };
}

export interface BuildingPackageWorkerHandoff {
  schemaVersion: typeof BUILDING_PACKAGE_WORKER_SCHEMA_VERSION;
  createdAt: string;
  plan: GeospatialPackagePlan;
  workerRequest: BuildingPackageWorkerRequest;
  warnings: string[];
}

function isMaterializable(probe: SourceProbeResult, source: GeospatialSourceCandidate): boolean {
  return (
    probe.canGenerateArtifacts &&
    source.packageReady &&
    !source.requiresApiKey &&
    (source.access === "open" || source.access === "local")
  );
}

function workerRole({
  probe,
  source,
  selectedSourceId
}: {
  probe: SourceProbeResult;
  source: GeospatialSourceCandidate;
  selectedSourceId: string | null;
}): BuildingPackageWorkerRole {
  if (probe.sourceId === selectedSourceId) return "primary";
  if (!isMaterializable(probe, source)) return "review-required";
  if (
    probe.status === "license-gated" ||
    probe.status === "token-gated" ||
    probe.status === "paid"
  ) {
    return "review-required";
  }
  return "fallback";
}

function preferenceIndex(sourceId: string, preferredSourceIds: string[]): number {
  const index = preferredSourceIds.indexOf(sourceId);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function createSourceLadder({
  plan,
  sources,
  preferredSourceIds
}: {
  plan: GeospatialPackagePlan;
  sources: GeospatialSourceCandidate[];
  preferredSourceIds: string[];
}): BuildingPackageSourceLadderEntry[] {
  const buildingSources = getPackageSourcesByLayer(sources, "buildings");
  const sourceById = new Map(buildingSources.map((source) => [source.id, source]));
  const selectedSourceId = plan.selectedSources.buildings?.id ?? null;

  return plan.probes
    .filter((probe) => probe.layerId === "buildings")
    .map((probe) => {
      const source = sourceById.get(probe.sourceId);

      if (!source) return null;

      return {
        sourceId: probe.sourceId,
        label: probe.sourceLabel,
        selected: probe.selected,
        workerRole: workerRole({ probe, source, selectedSourceId }),
        status: probe.status,
        access: probe.access,
        coverageStatus: probe.coverageStatus,
        artifactKinds: probe.artifactKinds,
        truthRole: source.truthRole,
        attribution: source.attribution,
        license: source.license,
        canMaterialize: isMaterializable(probe, source),
        reason: probe.reason,
        limitations: source.limitations
      } satisfies BuildingPackageSourceLadderEntry;
    })
    .filter((entry): entry is BuildingPackageSourceLadderEntry => Boolean(entry))
    .sort((left, right) => {
      if (left.selected !== right.selected) return left.selected ? -1 : 1;
      const leftPreference = preferenceIndex(left.sourceId, preferredSourceIds);
      const rightPreference = preferenceIndex(right.sourceId, preferredSourceIds);
      if (leftPreference !== rightPreference) return leftPreference - rightPreference;
      if (left.canMaterialize !== right.canMaterialize) return left.canMaterialize ? -1 : 1;
      return left.sourceId.localeCompare(right.sourceId);
    });
}

function createBuildingOutputContract({
  packageId,
  selectedSourceId
}: {
  packageId: string;
  selectedSourceId: string | null;
}): BuildingPackageOutputContract {
  const cacheKey = createPackageCacheKey({
    packageId,
    layerId: "buildings",
    sourceId: selectedSourceId ?? "unselected"
  });

  return {
    fileName: BUILDING_PACKAGE_OUTPUT_FILE,
    contentType: "application/geo+json",
    format: "GeoJSON FeatureCollection",
    coordinateReferenceSystem: "EPSG:4326",
    geometryTypes: ["Polygon", "MultiPolygon"],
    status: selectedSourceId ? "planned" : "blocked",
    cacheKey,
    plannedCacheRef: `vmesh-cache://${cacheKey}/${BUILDING_PACKAGE_OUTPUT_FILE}`,
    readyUrl: null,
    featureCount: null,
    selectedSourceId,
    generatedBy: "geospatial-package-worker",
    requiredFeatureProperties: [
      "sourceId",
      "sourceFeatureId",
      "sourceRelease",
      "truthRole",
      "confidence",
      "class",
      "subtype",
      "heightMeters",
      "levels",
      "facadeColor",
      "facadeMaterial",
      "roofColor",
      "roofMaterial",
      "roofShape",
      "roofHeightMeters"
    ]
  };
}

export function createBuildingPackageWorkerHandoff(
  input: BuildingPackageWorkerInput,
  options: PackagePlannerOptions = {}
): BuildingPackageWorkerHandoff {
  const preferredSourceIds = input.preferredSourceIds ?? [...DEFAULT_BUILDING_SOURCE_PREFERENCES];
  const createdAt = (options.now?.() ?? new Date("2026-05-12T00:00:00.000Z")).toISOString();
  const sources = getGeospatialSourceRegistry(options);
  const buildingSources = getPackageSourcesByLayer(sources, "buildings");
  const plannerPreferredSourceIds = preferredSourceIds
    .filter((sourceId) => {
      const source = buildingSources.find((candidate) => candidate.id === sourceId);
      return Boolean(source?.sourceUrl && source.packageReady && source.access === "open");
    })
    .slice(0, 1);
  const plan = createGeospatialPackagePlan(
    {
      aoi: input.aoi,
      layers: ["buildings"],
      preferredSourceIds: plannerPreferredSourceIds,
      consumerAppId: input.consumerAppId ?? "generic-downstream-app",
      offline: input.offline ?? true
    },
    options
  );
  const selectedSourceId = plan.selectedSources.buildings?.id ?? null;
  const sourceLadder = createSourceLadder({ plan, sources, preferredSourceIds });
  const output = createBuildingOutputContract({ packageId: plan.id, selectedSourceId });
  const jobId = `${plan.id}-buildings-${stableId(selectedSourceId ?? "unselected")}`;

  return {
    schemaVersion: BUILDING_PACKAGE_WORKER_SCHEMA_VERSION,
    createdAt,
    plan,
    workerRequest: {
      jobId,
      packageId: plan.id,
      layerId: "buildings",
      aoi: plan.aoi,
      aoiDisclosure: plan.aoiDisclosure,
      selectedSourceId,
      sourceLadder,
      output,
      workerSteps: [
        "Use a promoted official jurisdictional building source first when VMesh resolves one for the exact AOI.",
        "For the Overture global tier, POST the centroid to /api/geospatial-package/buildings/live to resolve the latest official release and extract the fixed 3 km frame.",
        "Resolve the selected source release or local preprocessed cache for the AOI.",
        "Clip building Polygon/MultiPolygon features to the requested AOI bounds.",
        "Preserve source feature ids, release metadata, attribution, license, confidence, and limitations.",
        `Write ${BUILDING_PACKAGE_OUTPUT_FILE} plus a manifest outside Git unless it is a sanitized fixture.`,
        "Leave the output planned or blocked if no source-backed footprints are available; do not synthesize buildings."
      ],
      policies: {
        noSyntheticFill: true,
        preserveSourceFeatureIds: true,
        preserveAttributionAndLicense: true,
        keepRawDownloadsOutOfGit: true
      }
    },
    warnings: [
      "This handoff proves the source ladder and worker contract, not a completed global building feature index.",
      "The Intel/source registry stores provider metadata and fetch/preprocess candidates; footprints are ready only after the worker materializes buildings.json.",
      "Building footprints are source-backed context, not legal parcel, address, occupancy, or survey truth."
    ]
  };
}

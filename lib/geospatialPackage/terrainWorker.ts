import {
  createGeospatialPackagePlan,
  type PackagePlannerOptions
} from "@/lib/geospatialPackage/planner";
import {
  containsSecretLikeValue,
  createPackageCacheKey
} from "@/lib/geospatialPackage/plannerUtils";
import type {
  GeospatialPackagePlan,
  GeospatialSourceCandidate,
  NormalizedPackageAoi,
  PackageAoiDisclosure,
  PackagePlanRequest
} from "@/lib/geospatialPackage/types";

export type TerrainWorkerRunClass = "mock" | "dry-run" | "configured" | "live-proof";

export type TerrainWorkerStatus = "ready" | "blocked" | "failed";

export type TerrainGroundModelRole =
  | "bare-earth-dtm"
  | "generic-dem"
  | "surface-dsm"
  | "topobathy"
  | "inferred-bare-earth"
  | "unknown";

export type TerrainCoverageStatus = "contains-aoi" | "partial" | "outside-aoi" | "not-checked";

export type TerrainWorkerArtifactKind =
  | "cog"
  | "pmtiles"
  | "raster-tiles"
  | "vector-tiles"
  | "png"
  | "json";

export type TerrainWorkerArtifactRole =
  | "terrain"
  | "hillshade"
  | "slope"
  | "aspect"
  | "contours"
  | "qa"
  | "manifest";

export interface TerrainWorkerArtifactRef {
  kind: TerrainWorkerArtifactKind;
  role: TerrainWorkerArtifactRole;
  ref: string;
  privacy: "public" | "private";
  byteSize?: number;
  sha256?: string;
}

export interface TerrainWorkerSourceSummary {
  provider: string;
  sourceId: string;
  sourceRelease: string;
  license: string;
  attribution: string;
  groundModelRole: TerrainGroundModelRole;
  resolutionMeters: number;
  crs?: string;
  verticalDatum?: string;
}

export interface TerrainWorkerQaSummary {
  coverageStatus: TerrainCoverageStatus;
  noDataRatio?: number;
  minElevationMeters?: number;
  maxElevationMeters?: number;
  meanElevationMeters?: number;
  sampleCount?: number;
}

export interface TerrainRasterQueryInput {
  packageId: string;
  aoi: NormalizedPackageAoi;
  source: GeospatialSourceCandidate;
  toolProfile: TerrainToolProfile;
  bbox: {
    west: number;
    south: number;
    east: number;
    north: number;
  };
  cacheKey: string;
}

export interface TerrainRasterQueryOutput {
  status: "ready" | "blocked" | "failed";
  runClass?: TerrainWorkerRunClass;
  artifacts: TerrainWorkerArtifactRef[];
  sourceSummary: TerrainWorkerSourceSummary;
  qa: TerrainWorkerQaSummary;
  retainedEvidence: string[];
  warnings?: string[];
  blockedReasons?: string[];
}

export type TerrainRasterQuery = (
  input: TerrainRasterQueryInput
) => Promise<TerrainRasterQueryOutput> | TerrainRasterQueryOutput;

export interface TerrainToolProfile {
  toolId: string;
  sourceIds: string[];
  provider: string;
  targetResolutionMeters: number;
  sourceRelease: string;
  groundModelRole: TerrainGroundModelRole;
  crs?: string;
  verticalDatum?: string;
  payloadCapable: boolean;
  notes: string;
}

export interface TerrainPackageManifest {
  schemaVersion: "vmesh-terrain-package-manifest-v1";
  packageId: string;
  createdAt: string;
  runClass: TerrainWorkerRunClass;
  aoi: NormalizedPackageAoi;
  aoiDisclosure: PackageAoiDisclosure;
  sourceSummary: TerrainWorkerSourceSummary;
  qa: TerrainWorkerQaSummary;
  artifacts: TerrainWorkerArtifactRef[];
  retainedEvidence: string[];
  warnings: string[];
}

export interface TerrainPackageWorkerResult {
  schemaVersion: "vmesh-terrain-package-worker-result-v1";
  packageId: string;
  createdAt: string;
  status: TerrainWorkerStatus;
  runClass: TerrainWorkerRunClass;
  selectedSource: GeospatialSourceCandidate | null;
  toolProfile: TerrainToolProfile | null;
  manifest: TerrainPackageManifest | null;
  artifacts: TerrainWorkerArtifactRef[];
  blockedReasons: string[];
  warnings: string[];
}

export interface TerrainPackageWorkerOptions extends PackagePlannerOptions {
  now?: () => Date;
  terrainRasterQuery?: TerrainRasterQuery;
}

export interface TerrainPackageWorkerInput {
  request?: PackagePlanRequest;
  plan?: GeospatialPackagePlan;
}

const DEFAULT_CREATED_AT = "2026-06-02T00:00:00.000Z";

export const TERRAIN_TOOL_PROFILES: TerrainToolProfile[] = [
  {
    toolId: "mapterhorn-pmtiles",
    sourceIds: ["mapterhorn-pmtiles-terrain"],
    provider: "Mapterhorn",
    targetResolutionMeters: 30,
    sourceRelease: "Mapterhorn terrain PMTiles",
    groundModelRole: "generic-dem",
    crs: "Web Mercator tile grid / EPSG:3857",
    verticalDatum: "source-dependent DEM blend",
    payloadCapable: true,
    notes:
      "Map-ready global terrain fallback. Package-ready only after a worker creates retained AOI artifacts."
  },
  {
    toolId: "mapzen-joerd-terrarium",
    sourceIds: ["mapzen-joerd-terrarium"],
    provider: "Mapzen / Joerd Terrain Tiles",
    targetResolutionMeters: 30,
    sourceRelease: "Mapzen Joerd Terrarium tiles",
    groundModelRole: "generic-dem",
    crs: "Web Mercator tile grid / EPSG:3857",
    verticalDatum: "source-dependent DEM blend",
    payloadCapable: true,
    notes: "No-token global fallback when higher-trust terrain is unavailable."
  },
  {
    toolId: "usgs-3dep",
    sourceIds: ["usgs-3dep"],
    provider: "USGS 3DEP",
    targetResolutionMeters: 1,
    sourceRelease: "USGS 3DEP 1 m DEM official source; Mapterhorn source family us1*",
    groundModelRole: "bare-earth-dtm",
    payloadCapable: true,
    notes: "Preferred USA open bare-earth terrain source where coverage exists."
  },
  {
    toolId: "usgs-3dep-lpc-dsm",
    sourceIds: ["usgs-3dep-lpc-dsm"],
    provider: "USGS 3DEP Lidar Point Cloud",
    targetResolutionMeters: 1,
    sourceRelease: "USGS 3DEP Lidar Point Cloud source index",
    groundModelRole: "surface-dsm",
    payloadCapable: true,
    notes:
      "USA DSM derivation route. Requires point-cloud enumeration and PDAL/LAZ processing before display tiles can be emitted."
  },
  {
    toolId: "noaa-cudem",
    sourceIds: ["noaa-cudem"],
    provider: "NOAA / CIRES CUDEM",
    targetResolutionMeters: 3,
    sourceRelease: "NOAA CUDEM AOI-selected source tiles",
    groundModelRole: "topobathy",
    payloadCapable: true,
    notes: "Coastal/topobathy source, not a general inland terrain default."
  },
  {
    toolId: "copernicus-dem-glo30",
    sourceIds: ["copernicus-dem-glo30"],
    provider: "Copernicus DEM",
    targetResolutionMeters: 30,
    sourceRelease: "Copernicus DEM GLO-30",
    groundModelRole: "surface-dsm",
    payloadCapable: true,
    notes: "Global DSM-style fallback and comparison source."
  },
  {
    toolId: "environment-agency-lidar-dtm",
    sourceIds: ["environment-agency-lidar-dtm"],
    provider: "Environment Agency England LiDAR DTM",
    targetResolutionMeters: 1,
    sourceRelease: "Environment Agency LIDAR Composite DTM",
    groundModelRole: "bare-earth-dtm",
    payloadCapable: true,
    notes: "England open terrain upgrade where coverage exists."
  },
  {
    toolId: "scottish-remote-sensing-lidar",
    sourceIds: ["scottish-remote-sensing-lidar"],
    provider: "Scottish Remote Sensing Portal LiDAR",
    targetResolutionMeters: 1,
    sourceRelease: "Scottish Remote Sensing Portal DTM/DSM tiles",
    groundModelRole: "bare-earth-dtm",
    payloadCapable: true,
    notes: "Scotland open terrain upgrade where phase coverage exists."
  },
  {
    toolId: "os-terrain-50",
    sourceIds: ["os-terrain-50"],
    provider: "Ordnance Survey Terrain 50",
    targetResolutionMeters: 50,
    sourceRelease: "OS Terrain 50 OpenData",
    groundModelRole: "bare-earth-dtm",
    payloadCapable: true,
    notes: "Coarse Great Britain fallback below higher-resolution LiDAR/DTM."
  },
  {
    toolId: "spain-cnig-mdt",
    sourceIds: ["spain-cnig-mdt"],
    provider: "CNIG / IGN Spain",
    targetResolutionMeters: 1,
    sourceRelease: "CNIG MDT AOI-selected source tiles",
    groundModelRole: "bare-earth-dtm",
    payloadCapable: true,
    notes: "Spain terrain upgrade where MDT01/MDT02 coverage exists."
  },
  {
    toolId: "kamloops-local-lidar",
    sourceIds: ["kamloops-local-lidar-dtm-1m"],
    provider: "City of Kamloops / operator-retained municipal LiDAR DTM",
    targetResolutionMeters: 1,
    sourceRelease: "Kamloops operator-local municipal DTM source pack",
    groundModelRole: "bare-earth-dtm",
    payloadCapable: true,
    notes:
      "Operator-local Kamloops DTM rail. VMesh indexes the configured endpoint; Abundance must fetch, window, QA, and retain public-safe package artifacts before claiming golden-quality terrain."
  },
  {
    toolId: "canada-hrdem",
    sourceIds: ["canada-hrdem"],
    provider: "Natural Resources Canada HRDEM",
    targetResolutionMeters: 1,
    sourceRelease: "Natural Resources Canada HRDEM official source; Mapterhorn source cahrdem2",
    groundModelRole: "bare-earth-dtm",
    payloadCapable: true,
    notes:
      "Canada DTM route. Mapterhorn parity is cahrdem2 partial 2m; the strict 1m branch accepts only direct official HRDEM/provincial 1m proof and records 2m as lower-resolution coverage."
  },
  {
    toolId: "canada-hrdem",
    sourceIds: ["canada-hrdem-best-dtm"],
    provider: "Natural Resources Canada HRDEM",
    targetResolutionMeters: 2,
    sourceRelease: "Natural Resources Canada HRDEM best available official DTM source",
    groundModelRole: "bare-earth-dtm",
    payloadCapable: true,
    notes:
      "Canada best-available DTM route. Prefer direct official 1m HRDEM/provincial proof where available, otherwise allow explicit 2m HRDEM without counting it as strict 1m evidence."
  },
  {
    toolId: "canada-hrdem",
    sourceIds: ["canada-hrdem-dsm"],
    provider: "Natural Resources Canada HRDEM",
    targetResolutionMeters: 1,
    sourceRelease: "Natural Resources Canada HRDEM DSM official source",
    groundModelRole: "surface-dsm",
    payloadCapable: true,
    notes:
      "Canada high-resolution surface model route. Use only for DSM/canopy/building surface context; do not promote to bare-earth DTM."
  },
  {
    toolId: "bc-lidarbc",
    sourceIds: ["bc-lidarbc"],
    provider: "Government of British Columbia LidarBC",
    targetResolutionMeters: 1,
    sourceRelease: "LidarBC AOI-selected collection",
    groundModelRole: "bare-earth-dtm",
    payloadCapable: true,
    notes: "British Columbia high-value terrain source where coverage exists."
  },
  {
    toolId: "bc-lidarbc",
    sourceIds: ["bc-lidarbc-dsm"],
    provider: "Government of British Columbia LidarBC",
    targetResolutionMeters: 1,
    sourceRelease: "LidarBC AOI-selected DSM collection",
    groundModelRole: "surface-dsm",
    payloadCapable: true,
    notes:
      "British Columbia source-native surface model route. Use for DSM/canopy/building surface context only."
  },
  {
    toolId: "netherlands-ahn",
    sourceIds: ["netherlands-ahn"],
    provider: "AHN Netherlands",
    targetResolutionMeters: 0.5,
    sourceRelease: "AHN AOI-selected DTM/DSM tiles",
    groundModelRole: "bare-earth-dtm",
    payloadCapable: true,
    notes: "Netherlands high-resolution DTM/DSM route."
  },
  {
    toolId: "linz-nz-elevation",
    sourceIds: ["linz-nz-elevation"],
    provider: "Toitu Te Whenua LINZ",
    targetResolutionMeters: 1,
    sourceRelease: "LINZ elevation AOI-selected source tiles",
    groundModelRole: "bare-earth-dtm",
    payloadCapable: true,
    notes: "New Zealand open elevation route."
  },
  {
    toolId: "geoscience-australia-elvis",
    sourceIds: ["geoscience-australia-elvis"],
    provider: "Geoscience Australia / ELVIS",
    targetResolutionMeters: 5,
    sourceRelease: "ELVIS AOI-selected elevation source",
    groundModelRole: "bare-earth-dtm",
    payloadCapable: true,
    notes: "Australia elevation discovery route before premium providers."
  }
];

function createdAt(options: TerrainPackageWorkerOptions): string {
  return (options.now?.() ?? new Date(DEFAULT_CREATED_AT)).toISOString();
}

function ensureTerrainLayer(request: PackagePlanRequest): PackagePlanRequest {
  return {
    ...request,
    layers: request.layers.includes("terrain") ? request.layers : ["terrain", ...request.layers]
  };
}

export function getTerrainToolProfileForSource(sourceId: string): TerrainToolProfile | null {
  return TERRAIN_TOOL_PROFILES.find((profile) => profile.sourceIds.includes(sourceId)) ?? null;
}

function selectedTerrainSource(plan: GeospatialPackagePlan): GeospatialSourceCandidate | null {
  return plan.selectedSources.terrain ?? null;
}

function bboxFromAoi(aoi: NormalizedPackageAoi): TerrainRasterQueryInput["bbox"] {
  const [west, south, east, north] = aoi.bounds;
  return { west, south, east, north };
}

function hasSecretBearingArtifact(artifact: TerrainWorkerArtifactRef): boolean {
  if (containsSecretLikeValue(artifact.ref)) return true;
  if (artifact.sha256 && !/^[a-f0-9]{64}$/i.test(artifact.sha256)) return true;
  return false;
}

function isValidQa(qa: TerrainWorkerQaSummary): boolean {
  if (qa.coverageStatus !== "contains-aoi") return false;
  if (qa.noDataRatio !== undefined && (qa.noDataRatio < 0 || qa.noDataRatio > 1)) return false;
  if (qa.sampleCount !== undefined && qa.sampleCount < 0) return false;
  if (
    qa.minElevationMeters !== undefined &&
    qa.maxElevationMeters !== undefined &&
    qa.minElevationMeters > qa.maxElevationMeters
  ) {
    return false;
  }
  return true;
}

function inferRunClass(output: TerrainRasterQueryOutput): TerrainWorkerRunClass {
  if (output.runClass) return output.runClass;
  return output.retainedEvidence.length > 0 ? "live-proof" : "configured";
}

function blockedResult({
  plan,
  created,
  selectedSource,
  toolProfile,
  reasons,
  warnings,
  runClass = "configured"
}: {
  plan: GeospatialPackagePlan;
  created: string;
  selectedSource: GeospatialSourceCandidate | null;
  toolProfile: TerrainToolProfile | null;
  reasons: string[];
  warnings?: string[];
  runClass?: TerrainWorkerRunClass;
}): TerrainPackageWorkerResult {
  return {
    schemaVersion: "vmesh-terrain-package-worker-result-v1",
    packageId: plan.id,
    createdAt: created,
    status: "blocked",
    runClass,
    selectedSource,
    toolProfile,
    manifest: null,
    artifacts: [],
    blockedReasons: reasons,
    warnings: warnings ?? []
  };
}

function buildManifest({
  plan,
  created,
  output,
  runClass
}: {
  plan: GeospatialPackagePlan;
  created: string;
  output: TerrainRasterQueryOutput;
  runClass: TerrainWorkerRunClass;
}): TerrainPackageManifest {
  return {
    schemaVersion: "vmesh-terrain-package-manifest-v1",
    packageId: plan.id,
    createdAt: created,
    runClass,
    aoi: plan.aoi,
    aoiDisclosure: plan.aoiDisclosure,
    sourceSummary: output.sourceSummary,
    qa: output.qa,
    artifacts: output.artifacts,
    retainedEvidence: output.retainedEvidence,
    warnings: output.warnings ?? []
  };
}

function validateRasterOutput(output: TerrainRasterQueryOutput): string[] {
  const reasons: string[] = [];

  if (output.status !== "ready") {
    return output.blockedReasons?.length
      ? output.blockedReasons
      : [`Terrain raster query returned ${output.status}.`];
  }
  if (output.artifacts.length === 0) {
    reasons.push("Terrain raster query returned ready without retained artifact refs.");
  }
  if (!output.artifacts.some((artifact) => artifact.role === "terrain")) {
    reasons.push("Terrain raster query did not produce a terrain artifact.");
  }
  if (output.artifacts.some(hasSecretBearingArtifact)) {
    reasons.push("Terrain raster query returned a secret-bearing or invalid artifact ref.");
  }
  if (output.retainedEvidence.some(containsSecretLikeValue)) {
    reasons.push("Terrain raster query returned a secret-bearing retained evidence ref.");
  }
  if (inferRunClass(output) === "live-proof" && output.retainedEvidence.length === 0) {
    reasons.push("Terrain raster query claimed live proof without retained evidence.");
  }
  if (!isValidQa(output.qa)) {
    reasons.push("Terrain raster query QA does not prove full AOI terrain coverage.");
  }
  if (output.sourceSummary.resolutionMeters <= 0) {
    reasons.push("Terrain raster query source summary has an invalid resolution.");
  }
  if (output.sourceSummary.license.trim().length === 0) {
    reasons.push("Terrain raster query source summary is missing a license.");
  }
  if (output.sourceSummary.attribution.trim().length === 0) {
    reasons.push("Terrain raster query source summary is missing attribution.");
  }

  return reasons;
}

export function createTerrainWorkerPlan(
  input: TerrainPackageWorkerInput,
  options: TerrainPackageWorkerOptions = {}
): GeospatialPackagePlan {
  if (input.plan) return input.plan;
  if (!input.request) {
    throw new Error("Terrain package worker requires a geospatial package plan or request.");
  }
  return createGeospatialPackagePlan(ensureTerrainLayer(input.request), options);
}

export async function runTerrainPackageWorker(
  input: TerrainPackageWorkerInput,
  options: TerrainPackageWorkerOptions = {}
): Promise<TerrainPackageWorkerResult> {
  const plan = createTerrainWorkerPlan(input, options);
  const created = createdAt(options);
  const source = selectedTerrainSource(plan);

  if (!source) {
    return blockedResult({
      plan,
      created,
      selectedSource: null,
      toolProfile: null,
      reasons: ["The geospatial package plan did not select a terrain source."]
    });
  }

  const toolProfile = getTerrainToolProfileForSource(source.id);
  if (!toolProfile) {
    return blockedResult({
      plan,
      created,
      selectedSource: source,
      toolProfile: null,
      reasons: [`No vmesh terrain worker tool profile is registered for ${source.id}.`]
    });
  }

  if (!toolProfile.payloadCapable) {
    return blockedResult({
      plan,
      created,
      selectedSource: source,
      toolProfile,
      reasons: [`${toolProfile.provider} is cataloged but not payload-capable in vmesh yet.`]
    });
  }

  if (!options.terrainRasterQuery) {
    return blockedResult({
      plan,
      created,
      selectedSource: source,
      toolProfile,
      reasons: [
        `No terrain raster query is attached for ${toolProfile.toolId}.`,
        "A local/server worker must fetch, clip, normalize, QA, and retain terrain artifacts before this package is ready."
      ],
      warnings: [
        "Code path is configured, but live operation is not proven.",
        "The planner may expose map-ready terrain sources, but this worker did not create retained package artifacts."
      ],
      runClass: "configured"
    });
  }

  try {
    const output = await options.terrainRasterQuery({
      packageId: plan.id,
      aoi: plan.aoi,
      source,
      toolProfile,
      bbox: bboxFromAoi(plan.aoi),
      cacheKey: createPackageCacheKey({
        packageId: plan.id,
        layerId: "terrain",
        sourceId: source.id
      })
    });
    const blockedReasons = validateRasterOutput(output);

    if (blockedReasons.length > 0) {
      return blockedResult({
        plan,
        created,
        selectedSource: source,
        toolProfile,
        reasons: blockedReasons,
        warnings: output.warnings,
        runClass: inferRunClass(output)
      });
    }

    const runClass = inferRunClass(output);
    const manifest = buildManifest({ plan, created, output, runClass });

    return {
      schemaVersion: "vmesh-terrain-package-worker-result-v1",
      packageId: plan.id,
      createdAt: created,
      status: "ready",
      runClass,
      selectedSource: source,
      toolProfile,
      manifest,
      artifacts: output.artifacts,
      blockedReasons: [],
      warnings: output.warnings ?? []
    };
  } catch (error) {
    return blockedResult({
      plan,
      created,
      selectedSource: source,
      toolProfile,
      reasons: [error instanceof Error ? error.message : "Unknown terrain worker failure."],
      warnings: ["Terrain worker failed closed without publishing package artifacts."],
      runClass: "configured"
    });
  }
}

import { containsSecretLikeValue } from "@/lib/geospatialPackage/plannerUtils";
import type {
  TerrainGroundModelRole,
  TerrainRasterQuery,
  TerrainRasterQueryInput,
  TerrainRasterQueryOutput,
  TerrainWorkerArtifactKind,
  TerrainWorkerArtifactRef,
  TerrainWorkerRunClass
} from "@/lib/geospatialPackage/terrainWorker";
import { tileToLonLatBbox } from "@/lib/terrainSourcePreview";

type SourceProofStatus = "covered" | "blocked" | "failed";
type SourceProofProviderId = "usgs-3dep" | "usgs-3dep-lpc-dsm" | "canada-hrdem" | "bc-lidarbc";
type SourceProofRole = "dtm" | "dsm";

interface TerrainSourceRenderedArtifactProof {
  status?: unknown;
  kind?: unknown;
  role?: unknown;
  ref?: unknown;
  byteSize?: unknown;
  sha256?: unknown;
}

interface TerrainSourceQaProof {
  coverageStatus?: unknown;
  coverageFeatureCount?: unknown;
  noDataRatio?: unknown;
  minElevationMeters?: unknown;
  maxElevationMeters?: unknown;
  meanElevationMeters?: unknown;
  validPixels?: unknown;
  windowPixels?: unknown;
  pointsInsideRequestedTile?: unknown;
  renderStatus?: unknown;
}

interface TerrainSourceTileProof {
  z?: unknown;
  x?: unknown;
  y?: unknown;
}

interface TerrainSourceCoordinateProof {
  latitude?: unknown;
  longitude?: unknown;
}

interface TerrainSourceRenderProof {
  schemaVersion?: unknown;
  generatedAt?: unknown;
  runClass?: unknown;
  providerId?: unknown;
  role?: unknown;
  groundModelRole?: unknown;
  status?: unknown;
  resolutionMeters?: unknown;
  coverageSourceIds?: unknown;
  coordinate?: unknown;
  tile?: unknown;
  sourceAsset?: unknown;
  sourceService?: unknown;
  qa?: unknown;
  renderedArtifact?: unknown;
  reasons?: unknown;
}

export interface TerrainSourceRenderProofOptions {
  proofRef?: string;
  privacy?: TerrainWorkerArtifactRef["privacy"];
}

export const MAPTERHORN_USGS_3DEP_1M_SOURCE_FAMILY = "us1*";
export const MAPTERHORN_CANADA_HRDEM_SOURCE_ID = "cahrdem2";

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
    : [];
}

function artifactKind(value: unknown): TerrainWorkerArtifactKind {
  if (
    value === "cog" ||
    value === "pmtiles" ||
    value === "raster-tiles" ||
    value === "vector-tiles" ||
    value === "png" ||
    value === "json"
  ) {
    return value;
  }

  return "png";
}

function proofStatus(value: unknown): SourceProofStatus | null {
  return value === "covered" || value === "blocked" || value === "failed" ? value : null;
}

function proofProviderId(value: unknown): SourceProofProviderId | null {
  return value === "usgs-3dep" ||
    value === "usgs-3dep-lpc-dsm" ||
    value === "canada-hrdem" ||
    value === "bc-lidarbc"
    ? value
    : null;
}

function proofRole(value: unknown): SourceProofRole | null {
  return value === "dtm" || value === "dsm" ? value : null;
}

function asInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function coordinateInsideBbox({
  latitude,
  longitude,
  bbox
}: {
  latitude: number;
  longitude: number;
  bbox: TerrainRasterQueryInput["bbox"];
}): boolean {
  return (
    longitude >= bbox.west &&
    longitude <= bbox.east &&
    latitude >= bbox.south &&
    latitude <= bbox.north
  );
}

function tileContainsCoordinate({
  tile,
  latitude,
  longitude
}: {
  tile: TerrainSourceTileProof;
  latitude: number;
  longitude: number;
}): boolean {
  const z = asInteger(tile.z);
  const x = asInteger(tile.x);
  const y = asInteger(tile.y);
  if (z === null || x === null || y === null) return false;

  try {
    const bbox = tileToLonLatBbox({ z, x, y });
    return coordinateInsideBbox({ latitude, longitude, bbox });
  } catch {
    return false;
  }
}

function proofHasAoiLocationEvidence({
  input,
  proof
}: {
  input: TerrainRasterQueryInput;
  proof: TerrainSourceRenderProof;
}): boolean {
  const coordinate = asRecord(proof.coordinate) as TerrainSourceCoordinateProof | null;
  const latitude = asNumber(coordinate?.latitude);
  const longitude = asNumber(coordinate?.longitude);
  if (
    latitude !== undefined &&
    longitude !== undefined &&
    coordinateInsideBbox({ latitude, longitude, bbox: input.bbox })
  ) {
    return true;
  }

  const tile = asRecord(proof.tile) as TerrainSourceTileProof | null;
  return Boolean(
    tile &&
    tileContainsCoordinate({
      tile,
      latitude: input.aoi.centroid.latitude,
      longitude: input.aoi.centroid.longitude
    })
  );
}

function groundModelRoleForProof({
  providerId,
  role,
  value
}: {
  providerId: SourceProofProviderId;
  role: SourceProofRole;
  value: unknown;
}): TerrainGroundModelRole {
  if (
    value === "bare-earth-dtm" ||
    value === "surface-dsm" ||
    value === "generic-dem" ||
    value === "topobathy" ||
    value === "inferred-bare-earth" ||
    value === "unknown"
  ) {
    return value;
  }

  if (providerId === "usgs-3dep") return "bare-earth-dtm";
  if (providerId === "usgs-3dep-lpc-dsm") return "surface-dsm";
  return role === "dsm" ? "surface-dsm" : "bare-earth-dtm";
}

function sourceReleaseForProof({
  providerId,
  role,
  proof,
  coverageSourceIds
}: {
  providerId: SourceProofProviderId;
  role: SourceProofRole;
  proof: TerrainSourceRenderProof;
  coverageSourceIds: string[];
}): string {
  if (providerId === "usgs-3dep") {
    return `USGS 3DEP 1 m DEM official source; Mapterhorn source family ${MAPTERHORN_USGS_3DEP_1M_SOURCE_FAMILY}`;
  }
  if (providerId === "usgs-3dep-lpc-dsm") {
    const sourceSuffix = coverageSourceIds.length ? ` via ${coverageSourceIds[0]}` : "";
    return `USGS 3DEP Lidar Point Cloud DSM official source${sourceSuffix}`;
  }
  if (providerId === "bc-lidarbc") {
    const sourceSuffix = coverageSourceIds.length ? ` via ${coverageSourceIds[0]}` : "";
    return `Government of British Columbia LidarBC ${role.toUpperCase()} official source${sourceSuffix}`;
  }

  const sourceAsset = asRecord(proof.sourceAsset);
  const collection = asString(sourceAsset?.collection);
  const collectionSuffix = collection ? ` (${collection})` : "";
  const sourceSuffix = coverageSourceIds.length ? ` via ${coverageSourceIds[0]}` : "";

  return `Natural Resources Canada HRDEM ${role.toUpperCase()} official source; Mapterhorn source ${MAPTERHORN_CANADA_HRDEM_SOURCE_ID}${collectionSuffix}${sourceSuffix}`;
}

function providerName(providerId: SourceProofProviderId): string {
  if (providerId === "usgs-3dep") return "USGS 3DEP";
  if (providerId === "usgs-3dep-lpc-dsm") return "USGS 3DEP Lidar Point Cloud";
  if (providerId === "bc-lidarbc") return "Government of British Columbia LidarBC";
  return "Natural Resources Canada HRDEM";
}

function licenseForProvider(providerId: SourceProofProviderId): string {
  if (providerId === "usgs-3dep" || providerId === "usgs-3dep-lpc-dsm") {
    return "Public Domain (U.S. Government Work)";
  }
  if (providerId === "bc-lidarbc") return "BC open data terms";
  return "Open Government Licence - Canada";
}

function attributionForProvider(providerId: SourceProofProviderId): string {
  if (providerId === "usgs-3dep" || providerId === "usgs-3dep-lpc-dsm") {
    return "U.S. Geological Survey 3D Elevation Program";
  }
  if (providerId === "bc-lidarbc") return "Government of British Columbia LidarBC";
  return "Natural Resources Canada";
}

function blockedOutput({
  input,
  reasons,
  warnings = [],
  runClass = "configured"
}: {
  input: TerrainRasterQueryInput;
  reasons: string[];
  warnings?: string[];
  runClass?: TerrainWorkerRunClass;
}): TerrainRasterQueryOutput {
  return {
    status: "blocked",
    runClass,
    artifacts: [],
    sourceSummary: {
      provider: input.toolProfile.provider,
      sourceId: input.source.id,
      sourceRelease: input.toolProfile.sourceRelease,
      license: input.source.license,
      attribution: input.source.attribution,
      groundModelRole: input.toolProfile.groundModelRole,
      resolutionMeters: input.toolProfile.targetResolutionMeters,
      crs: input.toolProfile.crs,
      verticalDatum: input.toolProfile.verticalDatum
    },
    qa: { coverageStatus: "not-checked" },
    retainedEvidence: [],
    blockedReasons: reasons,
    warnings
  };
}

function qaCoverageStatusForProof(
  qa: TerrainSourceQaProof
): TerrainRasterQueryOutput["qa"]["coverageStatus"] {
  if (
    qa.coverageStatus === "contains-aoi" ||
    qa.coverageStatus === "partial" ||
    qa.coverageStatus === "outside-aoi" ||
    qa.coverageStatus === "not-checked"
  ) {
    return qa.coverageStatus;
  }

  const validPixels = asNumber(qa.validPixels);
  const pointsInsideRequestedTile = asNumber(qa.pointsInsideRequestedTile);
  const coverageFeatureCount = asNumber(qa.coverageFeatureCount);

  if (
    (validPixels !== undefined && validPixels > 0) ||
    (pointsInsideRequestedTile !== undefined && pointsInsideRequestedTile > 0) ||
    (coverageFeatureCount !== undefined && coverageFeatureCount > 0)
  ) {
    return "contains-aoi";
  }

  return "not-checked";
}

function qaProvesAoiCoverage(qa: TerrainSourceQaProof): boolean {
  const explicitCoverageStatus =
    qa.coverageStatus === "contains-aoi" ||
    qa.coverageStatus === "partial" ||
    qa.coverageStatus === "outside-aoi" ||
    qa.coverageStatus === "not-checked";
  const coverageStatus = qaCoverageStatusForProof(qa);
  const validPixels = asNumber(qa.validPixels);
  const pointsInsideRequestedTile = asNumber(qa.pointsInsideRequestedTile);
  const coverageFeatureCount = asNumber(qa.coverageFeatureCount);
  const noDataRatio = asNumber(qa.noDataRatio);
  const renderStatus = asString(qa.renderStatus);

  if (explicitCoverageStatus && coverageStatus !== "contains-aoi") return false;
  if (validPixels !== undefined && validPixels <= 0) return false;
  if (pointsInsideRequestedTile !== undefined && pointsInsideRequestedTile <= 0) return false;
  if (coverageFeatureCount !== undefined && coverageFeatureCount <= 0) return false;
  if (noDataRatio !== undefined && noDataRatio >= 1) return false;
  if (renderStatus && renderStatus !== "ready") return false;

  return coverageStatus === "contains-aoi";
}

function qaSummaryForProof(qa: TerrainSourceQaProof): TerrainRasterQueryOutput["qa"] {
  const coverageStatus = qaCoverageStatusForProof(qa);
  const windowPixels = asNumber(qa.windowPixels);
  const validPixels = asNumber(qa.validPixels);
  const pointsInsideRequestedTile = asNumber(qa.pointsInsideRequestedTile);
  const coverageFeatureCount = asNumber(qa.coverageFeatureCount);

  return {
    coverageStatus,
    noDataRatio: asNumber(qa.noDataRatio),
    minElevationMeters: asNumber(qa.minElevationMeters),
    maxElevationMeters: asNumber(qa.maxElevationMeters),
    meanElevationMeters: asNumber(qa.meanElevationMeters),
    sampleCount: windowPixels ?? validPixels ?? pointsInsideRequestedTile ?? coverageFeatureCount
  };
}

function outputFromSourceRenderProof({
  input,
  proof,
  options
}: {
  input: TerrainRasterQueryInput;
  proof: TerrainSourceRenderProof;
  options: TerrainSourceRenderProofOptions;
}): TerrainRasterQueryOutput {
  const providerId = proofProviderId(proof.providerId);
  const role = proofRole(proof.role);
  const status = proofStatus(proof.status);
  const reasons = asStringArray(proof.reasons);
  const generatedAt = asString(proof.generatedAt);
  const renderedArtifact = asRecord(
    proof.renderedArtifact
  ) as TerrainSourceRenderedArtifactProof | null;

  if (!providerId || !role || !status) {
    return blockedOutput({
      input,
      reasons: ["Source render proof is missing providerId, role, or covered/blocked status."]
    });
  }

  if (providerId !== input.toolProfile.toolId && providerId !== input.source.id) {
    return blockedOutput({
      input,
      reasons: [
        `Source render proof provider ${providerId} does not match selected source ${input.source.id}.`
      ]
    });
  }

  if (providerId === "usgs-3dep" && role !== "dtm") {
    return blockedOutput({
      input,
      reasons: ["USGS 3DEP proof is not accepted for DSM; USGS 3DEP DEM is a DTM route."],
      warnings: reasons
    });
  }

  if (providerId === "usgs-3dep-lpc-dsm" && role !== "dsm") {
    return blockedOutput({
      input,
      reasons: ["USGS 3DEP LPC proof is not accepted for DTM; it is a DSM route."],
      warnings: reasons
    });
  }

  const expectedRole = input.toolProfile.groundModelRole === "surface-dsm" ? "dsm" : "dtm";
  if (role !== expectedRole) {
    return blockedOutput({
      input,
      reasons: [
        `${providerName(providerId)} source proof role ${role.toUpperCase()} does not match selected ${expectedRole.toUpperCase()} terrain source ${input.source.id}.`
      ],
      warnings: reasons,
      runClass: proof.runClass === "live-proof" ? "live-proof" : "configured"
    });
  }

  if (status !== "covered") {
    return blockedOutput({
      input,
      reasons: reasons.length ? reasons : [`Source render proof returned ${status}.`],
      warnings: [`The ${providerName(providerId)} source proof failed closed.`],
      runClass: proof.runClass === "live-proof" ? "live-proof" : "configured"
    });
  }

  if (!proofHasAoiLocationEvidence({ input, proof })) {
    return blockedOutput({
      input,
      reasons: [
        "Source render proof does not include coordinate/tile evidence matching the package AOI."
      ],
      warnings: reasons,
      runClass: proof.runClass === "live-proof" ? "live-proof" : "configured"
    });
  }

  const resolutionMeters = asNumber(proof.resolutionMeters);
  const isCanadaBestAvailableDtm =
    input.source.id === "canada-hrdem-best-dtm" && providerId === "canada-hrdem" && role === "dtm";
  const acceptedResolution = isCanadaBestAvailableDtm
    ? resolutionMeters === 1 || resolutionMeters === 2
    : resolutionMeters === 1;

  if (!acceptedResolution) {
    return blockedOutput({
      input,
      reasons: [
        isCanadaBestAvailableDtm
          ? `${providerName(providerId)} best-available source proof resolved ${resolutionMeters ?? "unknown"} m terrain; only explicit 1 m or 2 m HRDEM is accepted for this fallback source.`
          : `${providerName(providerId)} source proof resolved ${resolutionMeters ?? "unknown"} m terrain; the current USA/Canada terrain milestone requires proven 1 m source data.`
      ],
      warnings: reasons,
      runClass: proof.runClass === "live-proof" ? "live-proof" : "configured"
    });
  }

  const artifactRef = asString(renderedArtifact?.ref);
  if (renderedArtifact?.status !== "ready" || !artifactRef) {
    return blockedOutput({
      input,
      reasons: ["Source render proof is covered but did not retain a rendered terrain artifact."],
      runClass: proof.runClass === "live-proof" ? "live-proof" : "configured"
    });
  }

  if (containsSecretLikeValue(artifactRef)) {
    return blockedOutput({
      input,
      reasons: ["Source render proof artifact ref contains a secret-bearing value."],
      runClass: proof.runClass === "live-proof" ? "live-proof" : "configured"
    });
  }

  const proofRef = options.proofRef?.trim();
  if (proofRef && containsSecretLikeValue(proofRef)) {
    return blockedOutput({
      input,
      reasons: ["Source render proof report ref contains a secret-bearing value."],
      runClass: proof.runClass === "live-proof" ? "live-proof" : "configured"
    });
  }

  const qa = asRecord(proof.qa) as TerrainSourceQaProof | null;
  if (!qa) {
    return blockedOutput({
      input,
      reasons: ["Source render proof is covered but is missing QA summary."],
      runClass: proof.runClass === "live-proof" ? "live-proof" : "configured"
    });
  }

  if (!qaProvesAoiCoverage(qa)) {
    return blockedOutput({
      input,
      reasons: [
        "Source render proof is covered but its QA does not prove full AOI/tile coverage with valid terrain pixels."
      ],
      warnings: reasons,
      runClass: proof.runClass === "live-proof" ? "live-proof" : "configured"
    });
  }

  const coverageSourceIds = asStringArray(proof.coverageSourceIds);
  const retainedEvidence = [proofRef].filter((value): value is string => Boolean(value));
  const runClass: TerrainWorkerRunClass =
    proof.runClass === "live-proof" && retainedEvidence.length > 0 ? "live-proof" : "configured";
  const artifact: TerrainWorkerArtifactRef = {
    kind: artifactKind(renderedArtifact.kind),
    role: "terrain",
    ref: artifactRef,
    privacy: options.privacy ?? "private",
    byteSize: asNumber(renderedArtifact.byteSize)
  };
  const sha256 = asString(renderedArtifact.sha256);
  if (sha256) artifact.sha256 = sha256;

  return {
    status: "ready",
    runClass,
    artifacts: [artifact],
    sourceSummary: {
      provider: providerName(providerId),
      sourceId: input.source.id,
      sourceRelease: sourceReleaseForProof({ providerId, role, proof, coverageSourceIds }),
      license: licenseForProvider(providerId),
      attribution: attributionForProvider(providerId),
      groundModelRole: groundModelRoleForProof({
        providerId,
        role,
        value: proof.groundModelRole
      }),
      resolutionMeters: resolutionMeters ?? input.toolProfile.targetResolutionMeters,
      crs: providerId === "usgs-3dep" ? "EPSG:3857 rendered tile" : input.toolProfile.crs,
      verticalDatum: input.toolProfile.verticalDatum
    },
    qa: qaSummaryForProof(qa),
    retainedEvidence,
    warnings: [
      "Source-render proof is a display-ready terrain preview artifact, not yet a normalized COG/PMTiles terrain package.",
      "The upstream source is aligned to Mapterhorn attribution, but vmesh fetched/proved it directly from the official provider.",
      ...(generatedAt ? [`Source proof generated at ${generatedAt}.`] : []),
      ...(isCanadaBestAvailableDtm && resolutionMeters !== 1
        ? [
            "Canada HRDEM best-available DTM is explicit lower-resolution evidence and does not satisfy strict 1m milestone proof."
          ]
        : []),
      ...(runClass === "configured"
        ? [
            "No retained proof report ref was supplied, so this result is not claimed as live-proof."
          ]
        : [])
    ]
  };
}

export function createTerrainRasterQueryFromSourceRenderProof(
  proof: unknown,
  options: TerrainSourceRenderProofOptions = {}
): TerrainRasterQuery {
  const proofRecord = asRecord(proof);

  return (input) => {
    if (!proofRecord) {
      return blockedOutput({
        input,
        reasons: ["Source render proof must be a JSON object."]
      });
    }

    return outputFromSourceRenderProof({
      input,
      proof: proofRecord,
      options
    });
  };
}

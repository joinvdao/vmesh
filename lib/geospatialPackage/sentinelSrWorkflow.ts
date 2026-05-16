import {
  buildSentinelStacSearchPayload,
  createH3CoverageFromBounds,
  DEFAULT_SENTINEL_PREVIEW_TILE_URL,
  SEN2SR_LITE_RGBN_MODEL_ID,
  SEN2SR_REPOSITORY_URL,
  SEN2SR_TARGET_RESOLUTION_METERS,
  SENTINEL_COG_PREVIEW_PROVIDER_ID,
  SENTINEL_L2A_SOURCE_RESOLUTION_METERS,
  SENTINEL_RGBN_BANDS,
  SENTINEL_SEN2SR_PMTILES_PROVIDER_ID
} from "@/lib/imagerySources";
import {
  createSentinelSuperResolutionPlan,
  type SentinelSuperResolutionPlanInput
} from "@/lib/sentinelSuperResolutionPlan";
import {
  normalizePackageAoi,
  sanitizePublicUrl,
  stableId
} from "@/lib/geospatialPackage/plannerUtils";
import { validateTrustedHttpsArtifactUrl } from "@/lib/geospatialPackage/artifactUrlPolicy";
import { sanitizeConsumerAppId } from "@/lib/geospatialPackage/security";
import type { NormalizedPackageAoi, PackageAoiInput } from "@/lib/geospatialPackage/types";
import type {
  ImageryTileManifest,
  MacroProvenance,
  SentinelSuperResolutionPlan
} from "@/lib/vmeshTypes";

export const SENTINEL_SR_WORKFLOW_SCHEMA_VERSION = "vmesh-sentinel-sr-workflow-v1";
export const RENDER_HANDOFF_SCHEMA_VERSION = "vmesh-render-texture-handoff-v1";
export const SENTINEL_SR_DEFAULT_CLOUD_COVER_MAX = 10;
export const SENTINEL_SR_DEFAULT_AOI_CLEAR_PIXEL_RATIO_MIN = 0.98;

export type SentinelSrWorkflowStatus =
  | "planned"
  | "validation-required"
  | "ready"
  | "blocked-cloud-gate";

export type SentinelSrCloudGateStatus = "pending-worker-validation" | "passed" | "failed";

export type SentinelSrArtifactStatus =
  | "inline"
  | "ready-external"
  | "ready-configured"
  | "planned"
  | "blocked";

export type SentinelSrRenderAvailability =
  | "ready"
  | "requires-vmesh-worker"
  | "requires-cloud-validation"
  | "blocked-cloud-gate";

export interface SentinelSrWorkflowInput {
  aoi: PackageAoiInput;
  consumerAppId?: string;
  acquiredAt?: string;
  datetime?: string;
  sourceSceneId?: string;
  cloudCoverMax?: number;
  aoiClearPixelRatioMin?: number;
  targetResolutionMeters?: number;
  processingLocation?: SentinelSuperResolutionPlanInput["processingLocation"];
  sentinelPreviewTileUrl?: string;
  workerCompletion?: SentinelSrWorkerCompletionInput;
  trustedArtifactHostAllowlist?: string[];
  now?: () => Date;
}

export interface SentinelSrWorkerCompletionInput {
  completedByWorker: true;
  workerJobId: string;
  completedAt?: string;
  sourceSceneId: string;
  acquiredAt: string;
  sceneCloudCover: number;
  clearPixelRatioAoi: number;
  sen2srPmtilesUrl?: string;
  sen2srXyzUrl?: string;
}

export interface SentinelSrCloudGate {
  policy: "scene-metadata-plus-scl-aoi";
  status: SentinelSrCloudGateStatus;
  sceneCloudCoverMax: number;
  aoiClearPixelRatioMin: number;
  sceneCloudCover: number | null;
  clearPixelRatioAoi: number | null;
  maskMethod: "SCL";
  accepted: boolean;
  reason: string;
}

export interface SentinelSrArtifactRef {
  kind:
    | "stac-search-payload"
    | "cloudless-preview-tile-template"
    | "source-clipped-cog"
    | "cloud-mask-cog"
    | "sen2sr-cog"
    | "preview-png"
    | "manifest-json"
    | "raster-pmtiles"
    | "raster-xyz"
    | "derived-h3-summary";
  role: "source-discovery" | "source-preview" | "cloud-qa" | "upscaled-output" | "handoff";
  status: SentinelSrArtifactStatus;
  ref: string | null;
  contentType: string;
  cacheKey: string;
  notes: string;
}

export interface SentinelSrWorkflow {
  id: string;
  schemaVersion: typeof SENTINEL_SR_WORKFLOW_SCHEMA_VERSION;
  status: SentinelSrWorkflowStatus;
  readyForRenderer: boolean;
  createdAt: string;
  consumerAppId: string;
  aoi: NormalizedPackageAoi;
  source: {
    providerId: "sentinel-2-l2a-earth-search";
    collection: "sentinel-2-l2a";
    stacApiUrl: string;
    stacSearchPayload: Record<string, unknown>;
    sourceSceneId: string;
    acquiredAt: string;
    previewProviderId: typeof SENTINEL_COG_PREVIEW_PROVIDER_ID;
    previewTileUrl: string;
    previewLimitations: string[];
  };
  cloudGate: SentinelSrCloudGate;
  upscaler: SentinelSuperResolutionPlan;
  h3Coverage: string[];
  artifacts: SentinelSrArtifactRef[];
  tileManifest: ImageryTileManifest;
  completion: SentinelSrRenderHandoff["completion"];
  warnings: string[];
  blockedReasons: string[];
  nextActions: string[];
}

export interface SentinelSrRenderHandoff {
  schemaVersion: typeof RENDER_HANDOFF_SCHEMA_VERSION;
  consumerAppId: string;
  sourceWorkflowId: string;
  availability: SentinelSrRenderAvailability;
  preparationStage: "before-render-prompt";
  input: {
    role: "texture";
    ref: string | null;
    refKind: "pmtiles" | "xyz-template" | "planned-vmesh-cache" | "none";
    contentType: string;
    h3Id: string;
    targetResolutionMeters: number;
    sourceResolutionMeters: number;
    truthStatus: "imagery-inferred-context";
    useAs: string[];
    doNotUseAs: string[];
  };
  promptPreparation: {
    includeBeforeRender: true;
    instructions: string[];
    promptGuards: string[];
  };
  provenance: {
    providerId: string;
    modelId: string;
    upscalerRepositoryUrl: string;
    license: string;
    limitations: string[];
  };
  completion: {
    completedByWorker: true;
    workerJobId: string;
    completedAt: string;
    artifactHost: string;
  } | null;
}

export interface SentinelSrWorkflowPackage {
  ok: boolean;
  readyForRenderer: boolean;
  blockedReasons: string[];
  workflow: SentinelSrWorkflow;
  renderHandoff: SentinelSrRenderHandoff;
}

function clampRatio(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

function normalizeCloudCover(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(100, value));
}

function strictCloudCover(value: number): number | undefined {
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : undefined;
}

function strictRatio(value: number): number | undefined {
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : undefined;
}

function defaultDatetime(now: Date): string {
  const end = now.toISOString().slice(0, 10);
  const startDate = new Date(now);
  startDate.setUTCDate(startDate.getUTCDate() - 90);
  return `${startDate.toISOString().slice(0, 10)}/${end}`;
}

function createWorkflowId({
  h3Id,
  acquiredAt,
  targetResolutionMeters
}: {
  h3Id: string;
  acquiredAt: string;
  targetResolutionMeters: number;
}): string {
  const targetLabel = targetResolutionMeters.toString().replace(".", "p");
  return `sentinel-sr-${stableId(h3Id)}-${stableId(acquiredAt)}-${targetLabel}m`;
}

function cloudGateStatus({
  sceneCloudCover,
  clearPixelRatioAoi,
  sceneCloudCoverMax,
  aoiClearPixelRatioMin
}: {
  sceneCloudCover: number | undefined;
  clearPixelRatioAoi: number | undefined;
  sceneCloudCoverMax: number;
  aoiClearPixelRatioMin: number;
}): SentinelSrCloudGate {
  const sceneFailed = sceneCloudCover !== undefined && sceneCloudCover > sceneCloudCoverMax;
  const aoiFailed = clearPixelRatioAoi !== undefined && clearPixelRatioAoi < aoiClearPixelRatioMin;
  const hasBothMetrics = sceneCloudCover !== undefined && clearPixelRatioAoi !== undefined;

  if (sceneFailed || aoiFailed) {
    return {
      policy: "scene-metadata-plus-scl-aoi",
      status: "failed",
      sceneCloudCoverMax,
      aoiClearPixelRatioMin,
      sceneCloudCover: sceneCloudCover ?? null,
      clearPixelRatioAoi: clearPixelRatioAoi ?? null,
      maskMethod: "SCL",
      accepted: false,
      reason:
        "Cloud QA failed; do not upscale or send this tile into downstream render preparation."
    };
  }

  if (hasBothMetrics) {
    return {
      policy: "scene-metadata-plus-scl-aoi",
      status: "passed",
      sceneCloudCoverMax,
      aoiClearPixelRatioMin,
      sceneCloudCover: sceneCloudCover ?? null,
      clearPixelRatioAoi: clearPixelRatioAoi ?? null,
      maskMethod: "SCL",
      accepted: true,
      reason: "Scene metadata and AOI SCL clear-pixel gate passed."
    };
  }

  return {
    policy: "scene-metadata-plus-scl-aoi",
    status: "pending-worker-validation",
    sceneCloudCoverMax,
    aoiClearPixelRatioMin,
    sceneCloudCover: sceneCloudCover ?? null,
    clearPixelRatioAoi: clearPixelRatioAoi ?? null,
    maskMethod: "SCL",
    accepted: false,
    reason:
      "Worker must fetch Sentinel-2 L2A assets and validate SCL clear pixels before downstream render handoff is allowed."
  };
}

function workflowStatus({
  cloudGate,
  hasConfiguredTile
}: {
  cloudGate: SentinelSrCloudGate;
  hasConfiguredTile: boolean;
}): SentinelSrWorkflowStatus {
  if (cloudGate.status === "failed") return "blocked-cloud-gate";
  if (hasConfiguredTile && cloudGate.status === "passed") return "ready";
  if (hasConfiguredTile) return "validation-required";
  return "planned";
}

function artifactStatusForOutput(
  status: SentinelSrWorkflowStatus,
  hasConfiguredRef: boolean
): SentinelSrArtifactStatus {
  if (status === "blocked-cloud-gate") return "blocked";
  if (hasConfiguredRef && status === "ready") return "ready-configured";
  if (hasConfiguredRef) return "ready-external";
  return "planned";
}

interface TrustedCompletionArtifacts {
  pmtilesUrl?: string;
  xyzUrl?: string;
  artifactHost: string | null;
  blockedReasons: string[];
}

function validateWorkerCompletionArtifacts({
  completion,
  allowedHosts
}: {
  completion: SentinelSrWorkerCompletionInput | undefined;
  allowedHosts: string[];
}): TrustedCompletionArtifacts {
  if (!completion) {
    return { artifactHost: null, blockedReasons: [] };
  }

  const blockedReasons: string[] = [];
  let pmtilesUrl: string | undefined;
  let xyzUrl: string | undefined;
  let artifactHost: string | null = null;

  if (!completion.sen2srPmtilesUrl && !completion.sen2srXyzUrl) {
    blockedReasons.push("Worker completion must include a generated PMTiles or XYZ tile ref.");
  }

  if (completion.sen2srPmtilesUrl) {
    const validation = validateTrustedHttpsArtifactUrl(completion.sen2srPmtilesUrl, {
      allowedHosts
    });
    if (validation.ok && validation.url) {
      pmtilesUrl = validation.url;
      artifactHost = validation.host;
    } else {
      blockedReasons.push(`PMTiles ref rejected: ${validation.reason}`);
    }
  }

  if (completion.sen2srXyzUrl) {
    const validation = validateTrustedHttpsArtifactUrl(completion.sen2srXyzUrl, {
      allowedHosts
    });
    if (validation.ok && validation.url) {
      xyzUrl = validation.url;
      artifactHost = artifactHost ?? validation.host;
    } else {
      blockedReasons.push(`XYZ ref rejected: ${validation.reason}`);
    }
  }

  return { pmtilesUrl, xyzUrl, artifactHost, blockedReasons };
}

function createArtifacts({
  workflowId,
  status,
  previewTileUrl,
  sen2srPmtilesUrl,
  sen2srXyzUrl
}: {
  workflowId: string;
  status: SentinelSrWorkflowStatus;
  previewTileUrl: string;
  sen2srPmtilesUrl?: string;
  sen2srXyzUrl?: string;
}): SentinelSrArtifactRef[] {
  const cacheBase = `vmesh-cache://sentinel-sr/${workflowId}`;
  const blocked = status === "blocked-cloud-gate";
  const plannedStatus: SentinelSrArtifactStatus = blocked ? "blocked" : "planned";
  const pmtilesRef = sen2srPmtilesUrl
    ? sanitizePublicUrl(sen2srPmtilesUrl)
    : `${cacheBase}/tiles.pmtiles`;
  const xyzRef = sen2srXyzUrl
    ? sanitizePublicUrl(sen2srXyzUrl)
    : `${cacheBase}/xyz/{z}/{x}/{y}.png`;

  return [
    {
      kind: "stac-search-payload",
      role: "source-discovery",
      status: "inline",
      ref: "inline:workflow.source.stacSearchPayload",
      contentType: "application/json",
      cacheKey: `${cacheBase}/stac-search.json`,
      notes: "Worker-side Sentinel-2 L2A search payload; not a browser fetch."
    },
    {
      kind: "cloudless-preview-tile-template",
      role: "source-preview",
      status: "ready-external",
      ref: sanitizePublicUrl(previewTileUrl),
      contentType: "image/jpeg",
      cacheKey: `${cacheBase}/preview-template`,
      notes:
        "Cloudless preview layer for inspection only; SEN2SR uses source L2A bands, not this JPEG preview."
    },
    {
      kind: "source-clipped-cog",
      role: "source-discovery",
      status: plannedStatus,
      ref: blocked ? null : `${cacheBase}/source-rgbn.tif`,
      contentType: "image/tiff; application=geotiff",
      cacheKey: `${cacheBase}/source-rgbn.tif`,
      notes: "AOI-clipped Sentinel-2 L2A RGBN COG generated by worker."
    },
    {
      kind: "cloud-mask-cog",
      role: "cloud-qa",
      status: plannedStatus,
      ref: blocked ? null : `${cacheBase}/cloud-mask-scl.tif`,
      contentType: "image/tiff; application=geotiff",
      cacheKey: `${cacheBase}/cloud-mask-scl.tif`,
      notes: "SCL-derived cloud, shadow, snow, and no-data mask used for fail-closed QA."
    },
    {
      kind: "sen2sr-cog",
      role: "upscaled-output",
      status: plannedStatus,
      ref: blocked ? null : `${cacheBase}/sen2sr-2p5m.tif`,
      contentType: "image/tiff; application=geotiff",
      cacheKey: `${cacheBase}/sen2sr-2p5m.tif`,
      notes: "SEN2SRLite x4 output COG; imagery-inferred context only."
    },
    {
      kind: "preview-png",
      role: "handoff",
      status: plannedStatus,
      ref: blocked ? null : `${cacheBase}/preview.png`,
      contentType: "image/png",
      cacheKey: `${cacheBase}/preview.png`,
      notes: "Small AOI render for prompt preparation and human QA."
    },
    {
      kind: "manifest-json",
      role: "handoff",
      status: blocked ? "blocked" : "inline",
      ref: blocked ? null : "inline:workflow.tileManifest",
      contentType: "application/json",
      cacheKey: `${cacheBase}/manifest.json`,
      notes: "Source, model, cloud QA, license, and limitations manifest."
    },
    {
      kind: "raster-pmtiles",
      role: "handoff",
      status: artifactStatusForOutput(status, Boolean(sen2srPmtilesUrl)),
      ref: blocked ? null : pmtilesRef,
      contentType: "application/vnd.pmtiles",
      cacheKey: `${cacheBase}/tiles.pmtiles`,
      notes: "Preferred static tile handoff for vmesh and downstream apps."
    },
    {
      kind: "raster-xyz",
      role: "handoff",
      status: artifactStatusForOutput(status, Boolean(sen2srXyzUrl)),
      ref: blocked ? null : xyzRef,
      contentType: "image/png",
      cacheKey: `${cacheBase}/xyz/{z}/{x}/{y}.png`,
      notes: "Optional XYZ tile endpoint if a worker publishes tiles outside PMTiles."
    },
    {
      kind: "derived-h3-summary",
      role: "handoff",
      status: plannedStatus,
      ref: blocked ? null : `${cacheBase}/h3-summary.json`,
      contentType: "application/json",
      cacheKey: `${cacheBase}/h3-summary.json`,
      notes: "NDVI/NDWI/NBR and vegetation/water/bare-soil proxy summaries keyed by H3."
    }
  ];
}

function createTileManifest({
  workflowId,
  aoi,
  h3Coverage,
  status,
  sourceSceneId,
  acquiredAt,
  createdAt,
  sceneCloudCover,
  clearPixelRatioAoi,
  cloudGate,
  tileUrl
}: {
  workflowId: string;
  aoi: NormalizedPackageAoi;
  h3Coverage: string[];
  status: SentinelSrWorkflowStatus;
  sourceSceneId: string;
  acquiredAt: string;
  createdAt: string;
  sceneCloudCover: number | undefined;
  clearPixelRatioAoi: number | undefined;
  cloudGate: SentinelSrCloudGate;
  tileUrl: string;
}): ImageryTileManifest {
  const confidence =
    status === "ready" ? 82 : status === "validation-required" ? 52 : status === "planned" ? 38 : 0;
  const clearRatio = clearPixelRatioAoi ?? cloudGate.aoiClearPixelRatioMin;
  const cloudCover = sceneCloudCover ?? cloudGate.sceneCloudCoverMax;
  const provenance: MacroProvenance = {
    providerId: SENTINEL_SEN2SR_PMTILES_PROVIDER_ID,
    providerLabel: "Sentinel-2 SEN2SR 2.5m package",
    sourceType: status === "ready" ? "derived" : "future-provider",
    observedAt: acquiredAt,
    generatedAt: createdAt,
    freshnessLabel:
      sourceSceneId === "pending-stac-scene-selection"
        ? "pending Sentinel scene selection"
        : `Sentinel scene ${sourceSceneId}`,
    confidence,
    limitations:
      "SEN2SR output is AI-assisted visual/material context. It is not measured 2.5 m orthophoto truth, terrain truth, parcel truth, or emergency evidence.",
    license: "Copernicus Sentinel data terms and ESAOpenSR/SEN2SR citation requirements apply"
  };

  return {
    id: workflowId,
    sourceSceneId,
    provider: SENTINEL_SEN2SR_PMTILES_PROVIDER_ID,
    acquiredAt,
    processedAt: createdAt,
    bands: [...SENTINEL_RGBN_BANDS],
    sourceResolutionMeters: SENTINEL_L2A_SOURCE_RESOLUTION_METERS,
    resolutionMeters: SEN2SR_TARGET_RESOLUTION_METERS,
    scaleFactor: SENTINEL_L2A_SOURCE_RESOLUTION_METERS / SEN2SR_TARGET_RESOLUTION_METERS,
    superResolutionModel: SEN2SR_LITE_RGBN_MODEL_ID,
    upscalerRepositoryUrl: SEN2SR_REPOSITORY_URL,
    truthStatus: "imagery-inferred-context",
    cloudCoverScene: cloudCover,
    clearPixelRatioAoi: clearRatio,
    bounds: aoi.bounds,
    h3Coverage,
    license: provenance.license,
    provenance,
    tileUrl,
    ndviMean: 0,
    ndwiMean: 0,
    nbrMean: 0,
    vegetationCoverProxy: 0,
    bareSoilProxy: 0,
    waterPresenceProxy: 0,
    cloudFreeConfidence: Math.round(clearRatio * 100)
  };
}

function selectPrimaryHandoffArtifact(
  artifacts: SentinelSrArtifactRef[]
): SentinelSrArtifactRef | null {
  return (
    artifacts.find((artifact) => artifact.kind === "raster-pmtiles" && artifact.ref) ??
    artifacts.find((artifact) => artifact.kind === "raster-xyz" && artifact.ref) ??
    null
  );
}

function renderAvailability(status: SentinelSrWorkflowStatus): SentinelSrRenderAvailability {
  if (status === "ready") return "ready";
  if (status === "validation-required") return "requires-cloud-validation";
  if (status === "blocked-cloud-gate") return "blocked-cloud-gate";
  return "requires-vmesh-worker";
}

function refKind(
  artifact: SentinelSrArtifactRef | null
): SentinelSrRenderHandoff["input"]["refKind"] {
  if (!artifact?.ref) return "none";
  if (artifact.kind === "raster-pmtiles" && artifact.status === "planned")
    return "planned-vmesh-cache";
  if (artifact.kind === "raster-pmtiles") return "pmtiles";
  if (artifact.kind === "raster-xyz") return "xyz-template";
  return "none";
}

function createRenderHandoff(workflow: SentinelSrWorkflow): SentinelSrRenderHandoff {
  const primary = selectPrimaryHandoffArtifact(workflow.artifacts);

  return {
    schemaVersion: RENDER_HANDOFF_SCHEMA_VERSION,
    consumerAppId: workflow.consumerAppId,
    sourceWorkflowId: workflow.id,
    availability: renderAvailability(workflow.status),
    preparationStage: "before-render-prompt",
    input: {
      role: "texture",
      ref: primary?.ref ?? null,
      refKind: refKind(primary),
      contentType: primary?.contentType ?? "application/octet-stream",
      h3Id: workflow.aoi.h3Id,
      targetResolutionMeters: workflow.upscaler.targetResolutionMeters,
      sourceResolutionMeters: workflow.upscaler.sourceResolutionMeters,
      truthStatus: "imagery-inferred-context",
      useAs: [
        "generated-world source-pack texture/reference render",
        "visual material context",
        "landcover, vegetation, water, and bare-soil prompt context"
      ],
      doNotUseAs: [
        "terrain or elevation truth",
        "parcel, road, or building geometry truth",
        "legal boundary evidence",
        "emergency or safety certification",
        "claim of measured 2.5 m orthophoto fidelity"
      ]
    },
    promptPreparation: {
      includeBeforeRender: true,
      instructions: [
        "Render the AOI from the tile product into downstream source imagery before prompt assembly if the renderer does not consume PMTiles directly.",
        "Hold renderer submission unless availability is ready and cloudGate.status is passed.",
        "Describe this as Sentinel-2 SEN2SR visual/material context, not as authoritative ground truth."
      ],
      promptGuards: [
        "No clouds, cloud shadows, snow, or no-data patches may be present in the accepted source view.",
        "Do not ask the renderer to infer exact buildings, boundaries, roads, or terrain from the super-resolved texture alone.",
        "Keep source provenance and imagery-inferred caveats attached to the generated world record."
      ]
    },
    provenance: {
      providerId: SENTINEL_SEN2SR_PMTILES_PROVIDER_ID,
      modelId: workflow.upscaler.modelId,
      upscalerRepositoryUrl: workflow.upscaler.upscalerRepositoryUrl,
      license: workflow.tileManifest.license,
      limitations: [...workflow.upscaler.warnings, workflow.source.previewLimitations.join(" ")]
    },
    completion: workflow.completion
  };
}

export function createSentinelSrWorkflow(
  input: SentinelSrWorkflowInput
): SentinelSrWorkflowPackage {
  const createdAt = (input.now?.() ?? new Date()).toISOString();
  const now = new Date(createdAt);
  const aoi = normalizePackageAoi(input.aoi);
  const targetResolutionMeters = SEN2SR_TARGET_RESOLUTION_METERS;
  const requestedTargetResolution = input.targetResolutionMeters;
  const cloudCoverMax =
    input.cloudCoverMax === undefined
      ? SENTINEL_SR_DEFAULT_CLOUD_COVER_MAX
      : Math.min(
          normalizeCloudCover(input.cloudCoverMax) ?? SENTINEL_SR_DEFAULT_CLOUD_COVER_MAX,
          SENTINEL_SR_DEFAULT_CLOUD_COVER_MAX
        );
  const aoiClearPixelRatioMin = clampRatio(
    input.aoiClearPixelRatioMin === undefined
      ? SENTINEL_SR_DEFAULT_AOI_CLEAR_PIXEL_RATIO_MIN
      : Math.max(input.aoiClearPixelRatioMin, SENTINEL_SR_DEFAULT_AOI_CLEAR_PIXEL_RATIO_MIN),
    SENTINEL_SR_DEFAULT_AOI_CLEAR_PIXEL_RATIO_MIN
  );
  const completion = input.workerCompletion;
  const completionArtifacts = validateWorkerCompletionArtifacts({
    completion,
    allowedHosts: input.trustedArtifactHostAllowlist ?? []
  });
  const metricBlockedReasons: string[] = [];
  const sceneCloudCover =
    completion === undefined ? undefined : strictCloudCover(completion.sceneCloudCover);
  if (completion && sceneCloudCover === undefined) {
    metricBlockedReasons.push("Worker completion scene cloud cover must be between 0 and 100.");
  }
  const clearPixelRatioAoi =
    completion === undefined ? undefined : strictRatio(completion.clearPixelRatioAoi);
  if (completion && clearPixelRatioAoi === undefined) {
    metricBlockedReasons.push("Worker completion AOI clear-pixel ratio must be between 0 and 1.");
  }
  const acquiredAt = completion?.acquiredAt.trim() || input.acquiredAt?.trim() || "latest";
  const sourceSceneId =
    completion?.sourceSceneId.trim() ||
    input.sourceSceneId?.trim() ||
    "pending-stac-scene-selection";
  const workflowId = createWorkflowId({
    h3Id: aoi.h3Id,
    acquiredAt,
    targetResolutionMeters
  });
  const previewTileUrl = input.sentinelPreviewTileUrl?.trim() || DEFAULT_SENTINEL_PREVIEW_TILE_URL;
  const cloudGate = cloudGateStatus({
    sceneCloudCover,
    clearPixelRatioAoi,
    sceneCloudCoverMax: cloudCoverMax,
    aoiClearPixelRatioMin
  });
  const blockedReasons = [...metricBlockedReasons, ...completionArtifacts.blockedReasons];
  const hasTrustedCompletionTile = Boolean(
    completion &&
    blockedReasons.length === 0 &&
    (completionArtifacts.pmtilesUrl || completionArtifacts.xyzUrl)
  );
  const status = workflowStatus({
    cloudGate,
    hasConfiguredTile: hasTrustedCompletionTile
  });
  const upscaler = createSentinelSuperResolutionPlan({
    h3Id: aoi.h3Id,
    bounds: aoi.bounds,
    acquiredAt,
    cloudCoverMax,
    aoiClearPixelRatioMin,
    targetResolutionMeters,
    processingLocation: input.processingLocation ?? "server-job"
  });
  const h3Coverage = createH3CoverageFromBounds(aoi.bounds);
  const artifacts = createArtifacts({
    workflowId,
    status,
    previewTileUrl,
    sen2srPmtilesUrl: completionArtifacts.pmtilesUrl,
    sen2srXyzUrl: completionArtifacts.xyzUrl
  });
  const tileRef =
    selectPrimaryHandoffArtifact(artifacts)?.ref ??
    `vmesh-cache://sentinel-sr/${workflowId}/tiles.pmtiles`;
  const readyForRenderer =
    status === "ready" &&
    cloudGate.status === "passed" &&
    hasTrustedCompletionTile &&
    Boolean(completion?.completedByWorker) &&
    Boolean(completionArtifacts.artifactHost);
  const warnings = [
    ...upscaler.warnings,
    "EOX/cloudless preview tiles are preview context only; the SEN2SR worker must use Sentinel-2 L2A source bands.",
    "Downstream render handoff is blocked until the worker records passing SCL cloud QA for the AOI.",
    ...(requestedTargetResolution !== undefined &&
    Math.abs(requestedTargetResolution - SEN2SR_TARGET_RESOLUTION_METERS) > 0.001
      ? ["Requested target resolution was normalized to SEN2SRLite x4 2.5 m output."]
      : [])
  ];
  const completionEvidence =
    readyForRenderer && completion && completionArtifacts.artifactHost
      ? {
          completedByWorker: true as const,
          workerJobId: completion.workerJobId,
          completedAt: completion.completedAt?.trim() || createdAt,
          artifactHost: completionArtifacts.artifactHost
        }
      : null;
  const tileManifest = createTileManifest({
    workflowId,
    aoi,
    h3Coverage,
    status,
    sourceSceneId,
    acquiredAt,
    createdAt,
    sceneCloudCover,
    clearPixelRatioAoi,
    cloudGate,
    tileUrl: tileRef
  });
  const workflow: SentinelSrWorkflow = {
    id: workflowId,
    schemaVersion: SENTINEL_SR_WORKFLOW_SCHEMA_VERSION,
    status,
    readyForRenderer,
    createdAt,
    consumerAppId: sanitizeConsumerAppId(input.consumerAppId ?? "downstream-app"),
    aoi,
    source: {
      providerId: "sentinel-2-l2a-earth-search",
      collection: "sentinel-2-l2a",
      stacApiUrl: upscaler.stacApiUrl,
      stacSearchPayload: buildSentinelStacSearchPayload({
        bbox: aoi.bounds,
        datetime: input.datetime?.trim() || defaultDatetime(now),
        cloudCoverMax
      }),
      sourceSceneId,
      acquiredAt,
      previewProviderId: SENTINEL_COG_PREVIEW_PROVIDER_ID,
      previewTileUrl: sanitizePublicUrl(previewTileUrl),
      previewLimitations: [
        "Preview tiles are for map inspection only and are not the upscaler input.",
        "The worker must fetch source Sentinel-2 L2A RGBN bands and SCL assets for the AOI."
      ]
    },
    cloudGate,
    upscaler,
    h3Coverage,
    artifacts,
    tileManifest,
    completion: completionEvidence,
    warnings,
    blockedReasons,
    nextActions: readyForRenderer
      ? [
          "Render a downstream source image from the 2.5 m tile product.",
          "Attach the handoff, manifest, provenance, and cloud QA metrics to downstream prompt preparation."
        ]
      : status === "validation-required"
        ? [
            "Load the configured tile product manifest and record sceneCloudCover plus clearPixelRatioAoi.",
            "Only mark the handoff ready after SCL cloud QA passes."
          ]
        : status === "blocked-cloud-gate"
          ? [
              "Reject this scene for downstream render handoff.",
              "Search a clearer Sentinel scene or build a cloud-free composite in the worker."
            ]
          : [
              "Run the Sentinel SR worker with the inline STAC payload.",
              "Validate SCL cloud mask, run SEN2SRLite x4, publish COG/PMTiles/manifest artifacts, then call this route with ready refs and cloud metrics."
            ]
  };
  const renderHandoff = createRenderHandoff(workflow);

  return {
    ok: true,
    readyForRenderer,
    blockedReasons,
    workflow,
    renderHandoff
  };
}

export const INTEL_BROKER_SEGMENT_IDS = [
  "terrain_elevation",
  "imagery_observation",
  "water_hydrology",
  "access_infrastructure",
  "land_property_planning",
  "soils_landcover",
  "climate_weather",
  "ecology_biodiversity_carbon",
  "agriculture_operations",
  "community_economy",
  "research_only",
  "operator_review"
] as const;

export type IntelBrokerSegmentId = (typeof INTEL_BROKER_SEGMENT_IDS)[number];

export type IntelBrokerSourceStatus =
  | "candidate"
  | "needs_probe"
  | "needs_review"
  | "needs_license_review"
  | "ready_source_ref"
  | "adapter_ready"
  | "research_only"
  | "blocked"
  | "deprecated"
  | "noisy_candidate"
  | "planned_campaign";

export type IntelBrokerEndpointType =
  | "stac"
  | "arcgis_feature_server"
  | "arcgis_image_server"
  | "ckan"
  | "ogc"
  | "api_json"
  | "static_download"
  | "html_catalog"
  | "pdf"
  | "unknown";

export interface IntelBrokerFetchRecipe {
  adapter: string;
  steps: string[];
}

export interface IntelBrokerProvenanceRef {
  runId: string;
  sourceDb: string;
  recordId: string;
  evidenceRefCount: number;
}

export interface IntelBrokerSource {
  id: string;
  title: string;
  provider: string;
  country: string | null;
  region: string | null;
  jurisdiction: string | null;
  segments: IntelBrokerSegmentId[];
  status: IntelBrokerSourceStatus;
  endpointType: IntelBrokerEndpointType;
  sourceUrl: string;
  endpointUrl: string;
  coverage: string;
  resolution: string;
  license: string;
  access: string;
  probeStatus: string;
  confidenceScore: number;
  priorityScore: number;
  evaluationSiteRelevance: string[];
  adapter: string | null;
  fetchRecipe: IntelBrokerFetchRecipe | null;
  limitations: string[];
  reviewActions: string[];
  provenance: IntelBrokerProvenanceRef[];
}

export interface IntelBrokerSegmentSummary {
  id: IntelBrokerSegmentId;
  label: string;
  sourceCount: number;
  readyCount: number;
  reviewCount: number;
  topSourceIds: string[];
}

export interface IntelBrokerEvaluationSite {
  id: string;
  publicSafeLabel: string;
  coordinateStatus: "public_safe_region_only" | "setup_gap_private_coordinate_required";
  priorityRegions: string[];
  priorityTerms: string[];
  notes: string[];
}

export interface IntelBrokerGap {
  id: string;
  sourceDb: string;
  gapType: string;
  country: string | null;
  layer: string;
  priority: number;
  status: string;
  description: string;
  recommendedAction: string;
}

export interface IntelSourceBrokerImportSummary {
  runClass: "dry-run";
  sourceSystem: "intel-tools-sidecar";
  sidecarRoot: "operator-local";
  dbs: Array<{
    sourceDb: string;
    importMode: string;
    sourceRecordCount: number;
    probeCount: number;
    gapCount: number;
    researchRunCount: number;
  }>;
  quarantineCandidateCount: number;
  canonicalSourceCount: number;
  statusCounts: Record<string, number>;
  segmentCounts: Record<IntelBrokerSegmentId, number>;
}

export interface IntelSourceBrokerPackage {
  schemaVersion: "vmesh-intel-source-broker-package-v1";
  generatedAt: string;
  runClass: "dry-run";
  importSummary: IntelSourceBrokerImportSummary;
  evaluationSites: IntelBrokerEvaluationSite[];
  segments: IntelBrokerSegmentSummary[];
  sourcesReadyForBA: IntelBrokerSource[];
  ecosystemSourceRecords: IntelBrokerSource[];
  operatorReviewQueue: IntelBrokerSource[];
  remainingGapRegister: IntelBrokerGap[];
  brokerResponseExamples: Array<{
    siteId: string;
    consumer: "ba-gis-worker";
    requestedSegments: IntelBrokerSegmentId[];
    sourceIds: string[];
    warnings: string[];
  }>;
}

const READY_STATUSES = new Set<IntelBrokerSourceStatus>([
  "ready_source_ref",
  "adapter_ready",
  "needs_license_review"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function isIntelBrokerSegmentId(value: string): value is IntelBrokerSegmentId {
  return INTEL_BROKER_SEGMENT_IDS.includes(value as IntelBrokerSegmentId);
}

export function isIntelBrokerSource(value: unknown): value is IntelBrokerSource {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || typeof value.title !== "string") return false;
  if (typeof value.provider !== "string") return false;
  if (!Array.isArray(value.segments) || !value.segments.every(isIntelBrokerSegmentId)) {
    return false;
  }
  if (typeof value.status !== "string" || typeof value.endpointType !== "string") return false;
  if (typeof value.priorityScore !== "number" || typeof value.confidenceScore !== "number") {
    return false;
  }
  if (!isStringArray(value.evaluationSiteRelevance)) return false;
  if (!isStringArray(value.limitations) || !isStringArray(value.reviewActions)) return false;

  return true;
}

export function validateIntelSourceBrokerPackage(
  value: unknown
): value is IntelSourceBrokerPackage {
  if (!isRecord(value)) return false;
  if (value.schemaVersion !== "vmesh-intel-source-broker-package-v1") return false;
  if (value.runClass !== "dry-run") return false;
  if (!isRecord(value.importSummary)) return false;
  if (!Array.isArray(value.evaluationSites) || value.evaluationSites.length === 0) return false;
  if (!Array.isArray(value.segments)) return false;
  if (
    !Array.isArray(value.sourcesReadyForBA) ||
    !value.sourcesReadyForBA.every(isIntelBrokerSource)
  ) {
    return false;
  }
  if (
    !Array.isArray(value.ecosystemSourceRecords) ||
    !value.ecosystemSourceRecords.every(isIntelBrokerSource)
  ) {
    return false;
  }
  if (
    !Array.isArray(value.operatorReviewQueue) ||
    !value.operatorReviewQueue.every(isIntelBrokerSource)
  ) {
    return false;
  }

  return true;
}

export function getBaReadyIntelSources(
  sourcePackage: IntelSourceBrokerPackage,
  filters: {
    segment?: IntelBrokerSegmentId;
    siteId?: string;
    includeLicenseReview?: boolean;
  } = {}
): IntelBrokerSource[] {
  const readyStatuses = filters.includeLicenseReview
    ? READY_STATUSES
    : new Set<IntelBrokerSourceStatus>(["ready_source_ref", "adapter_ready"]);

  return sourcePackage.sourcesReadyForBA.filter((source) => {
    if (!readyStatuses.has(source.status)) return false;
    if (filters.segment && !source.segments.includes(filters.segment)) return false;
    if (filters.siteId && !source.evaluationSiteRelevance.includes(filters.siteId)) return false;
    return true;
  });
}

export function getIntelSourcesForSegment(
  sourcePackage: IntelSourceBrokerPackage,
  segment: IntelBrokerSegmentId
): IntelBrokerSource[] {
  const merged = [
    ...sourcePackage.sourcesReadyForBA,
    ...sourcePackage.ecosystemSourceRecords,
    ...sourcePackage.operatorReviewQueue
  ];
  const seen = new Set<string>();

  return merged.filter((source) => {
    if (!source.segments.includes(segment) || seen.has(source.id)) return false;
    seen.add(source.id);
    return true;
  });
}

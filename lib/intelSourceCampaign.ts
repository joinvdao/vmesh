import type {
  IntelCapabilityState,
  IntelFetchRecipe,
  IntelHandoffReviewReport,
  IntelQuarantinePackage,
  IntelSourceCollection,
  IntelSourceEndpoint,
  IntelSourceHandoff
} from "./intelSourceCampaignTypes";
import {
  countBy,
  fnv1a32,
  increment,
  isRecord,
  mergeById,
  recordArray,
  stableStringify,
  stringArray,
  stringRecord,
  stringValue
} from "./intelSourceCampaignUtils.ts";

export const INTEL_HANDOFF_SCHEMA_VERSION = "vmesh-intel-source-handoff-v1" as const;
export const INTEL_QUARANTINE_SCHEMA_VERSION = "vmesh-intel-quarantine-v1" as const;

export class IntelHandoffValidationError extends Error {
  readonly report: IntelHandoffReviewReport;

  constructor(report: IntelHandoffReviewReport) {
    super(report.errors.join("; ") || "Intel handoff validation failed.");
    this.name = "IntelHandoffValidationError";
    this.report = report;
  }
}

const DATA_BUCKETS = new Set([
  "terrain_elevation",
  "imagery_observation",
  "water_hydrology",
  "soils_landcover",
  "ecology_biodiversity_carbon",
  "access_infrastructure",
  "land_property_planning",
  "climate_weather",
  "food_system_local_assets",
  "risk_hazard",
  "knowledge_context"
]);
const CANDIDATE_STATES = new Set([
  "candidate",
  "verified",
  "recommended_for_vmesh_review",
  "rejected_noise",
  "blocked_license",
  "blocked_access",
  "needs_human_review"
]);
const CAPABILITY_STATES = new Set([
  "metadata-only",
  "probe-ready",
  "adapter-ready",
  "live-materialized",
  "abundance-live-proven"
]);
const SUPPORTED_ADAPTERS = new Set([
  "stac-api-search",
  "stac-collection-items",
  "cog-window",
  "copc-ept-window",
  "arcgis-feature-query",
  "arcgis-image-export",
  "ogc-wfs-bbox",
  "ogc-wcs-coverage",
  "geoparquet-bbox",
  "typed-api-query",
  "download-index"
]);
const SECRET_KEYS = /(?:access_token|api[_-]?key|apikey|x-amz-signature|signature|token)/i;
const LOCAL_PATH = /(?:[A-Za-z]:\\|\/Users\/|\/home\/|\/root\/)/;

export function reviewAndCleanIntelHandoff(input: unknown): {
  handoff: IntelSourceHandoff;
  report: IntelHandoffReviewReport;
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const dropped: Record<string, number> = {};
  if (!isRecord(input)) throw invalidReport(["Handoff must be a JSON object."]);
  const rawSerialized = JSON.stringify(input);
  if (LOCAL_PATH.test(rawSerialized))
    errors.push("Handoff input contains a local filesystem path.");
  if (SECRET_KEYS.test(rawSerialized))
    errors.push("Handoff input contains a secret-bearing key or URL.");
  if (input.schemaVersion !== INTEL_HANDOFF_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${INTEL_HANDOFF_SCHEMA_VERSION}.`);
  }
  const run = isRecord(input.run) ? input.run : {};
  const runId = stringValue(run.runId);
  if (!runId) errors.push("run.runId is required.");
  const runClass = stringValue(run.runClass);
  if (!new Set(["mock", "dry_run", "configured", "live_proof"]).has(runClass)) {
    errors.push("run.runClass is invalid.");
  }

  const inputAuthorities = recordArray(input.authorities);
  const inputEndpoints = recordArray(input.endpoints);
  const inputCollections = recordArray(input.collections);
  const authorities = dedupeBy(
    inputAuthorities,
    (row) => stringValue(row.id),
    dropped,
    "duplicate_authority"
  )
    .filter((row) => Boolean(stringValue(row.id)))
    .map((row) => ({ ...row, id: stringValue(row.id) }));
  const authorityIds = new Set(authorities.map((row) => stringValue(row.id)));

  const endpoints: IntelSourceEndpoint[] = [];
  const endpointKeys = new Set<string>();
  for (const row of inputEndpoints) {
    const id = stringValue(row.id);
    const authorityId = stringValue(row.authorityId);
    const url = canonicalPublicUrl(stringValue(row.url));
    const status = stringValue(row.status);
    if (status === "promoted")
      errors.push(`Endpoint ${id || "unknown"} attempted to bypass VMesh promotion.`);
    if (!id || !authorityIds.has(authorityId) || !url || !CANDIDATE_STATES.has(status)) {
      increment(dropped, "invalid_endpoint");
      continue;
    }
    const key = `${authorityId}|${url}`;
    if (endpointKeys.has(key)) {
      increment(dropped, "duplicate_endpoint");
      continue;
    }
    endpointKeys.add(key);
    endpoints.push({
      ...row,
      id,
      authorityId,
      endpointType: stringValue(row.endpointType),
      url,
      status,
      license: stringValue(row.license) || "review",
      disclosureClass: "public_safe"
    } as IntelSourceEndpoint);
  }
  const endpointIds = new Set(endpoints.map((row) => row.id));

  const collections: IntelSourceCollection[] = [];
  const collectionKeys = new Set<string>();
  for (const row of inputCollections) {
    const id = stringValue(row.id);
    const endpointId = stringValue(row.endpointId);
    const providerCollectionId = stringValue(row.providerCollectionId);
    const dataBucket = stringValue(row.dataBucket);
    const status = stringValue(row.status);
    if (status === "promoted")
      errors.push(`Collection ${id || "unknown"} attempted to bypass VMesh promotion.`);
    const capabilityState = stringValue(row.capabilityState) as IntelCapabilityState;
    if (
      !id ||
      !endpointIds.has(endpointId) ||
      !providerCollectionId ||
      !DATA_BUCKETS.has(dataBucket) ||
      !CANDIDATE_STATES.has(status) ||
      !CAPABILITY_STATES.has(capabilityState)
    ) {
      increment(dropped, "invalid_collection");
      continue;
    }
    const key = `${endpointId}|${providerCollectionId}|${dataBucket}`;
    if (collectionKeys.has(key)) {
      increment(dropped, "duplicate_collection");
      continue;
    }
    collectionKeys.add(key);
    let fetchRecipe: IntelFetchRecipe | null = null;
    if (
      capabilityState === "adapter-ready" ||
      capabilityState === "live-materialized" ||
      capabilityState === "abundance-live-proven"
    ) {
      fetchRecipe = cleanRecipe(row.fetchRecipe, id, errors);
    } else if (row.fetchRecipe != null) {
      warnings.push(`Non-executable collection ${id} supplied a recipe; VMesh discarded it.`);
      increment(dropped, "non_executable_recipe");
    }
    collections.push({
      ...row,
      id,
      endpointId,
      providerCollectionId,
      title: stringValue(row.title) || providerCollectionId,
      dataBucket,
      sourceRole: stringValue(row.sourceRole) || "unknown",
      status,
      capabilityState,
      fetchRecipe,
      disclosureClass: "public_safe"
    } as IntelSourceCollection);
  }

  const cleaned: IntelSourceHandoff = {
    schemaVersion: INTEL_HANDOFF_SCHEMA_VERSION,
    generatedAt: stringValue(input.generatedAt) || new Date(0).toISOString(),
    run: {
      ...run,
      runId,
      runType: stringValue(run.runType) || "intel_tools_discovery",
      runClass: runClass as IntelSourceHandoff["run"]["runClass"],
      dataBuckets: stringArray(run.dataBuckets).filter((bucket) => DATA_BUCKETS.has(bucket))
    },
    authorities,
    endpoints,
    collections,
    coverageEvidence: recordArray(input.coverageEvidence),
    gapRegister: recordArray(input.gapRegister),
    evalScorecard: isRecord(input.evalScorecard) ? input.evalScorecard : {},
    provenance: isRecord(input.provenance) ? input.provenance : {}
  };
  if (inputCollections.length > 0 && collections.length === 0) {
    errors.push("Handoff contained source collections, but none survived review/clean validation.");
  }
  const serialized = JSON.stringify(cleaned);
  if (LOCAL_PATH.test(serialized)) errors.push("Handoff contains a local filesystem path.");
  if (SECRET_KEYS.test(serialized)) errors.push("Handoff contains a secret-bearing key or URL.");
  const capabilityStates = countBy(collections.map((row) => row.capabilityState));
  const report: IntelHandoffReviewReport = {
    schemaVersion: "vmesh-intel-review-clean-report-v1",
    runId,
    valid: errors.length === 0,
    errors,
    warnings,
    inputCounts: {
      authorities: inputAuthorities.length,
      endpoints: inputEndpoints.length,
      collections: inputCollections.length
    },
    outputCounts: {
      authorities: authorities.length,
      endpoints: endpoints.length,
      collections: collections.length
    },
    dropped,
    capabilityStates,
    readyForQuarantineIngest: errors.length === 0,
    readyForOperationalPromotion: false
  };
  if (errors.length) throw new IntelHandoffValidationError(report);
  return { handoff: cleaned, report };
}

export function ingestIntelHandoffToQuarantine(
  input: unknown,
  existing?: IntelQuarantinePackage
): IntelQuarantinePackage {
  const { handoff, report } = reviewAndCleanIntelHandoff(input);
  const fingerprint = fnv1a32(stableStringify(handoff));
  const ingestionKey = `${handoff.run.runId}:${fingerprint}`;
  if (existing?.ingestionKey === ingestionKey) return existing;
  return {
    schemaVersion: INTEL_QUARANTINE_SCHEMA_VERSION,
    runId: handoff.run.runId,
    ingestionKey,
    ingestedRunIds: Array.from(
      new Set([...(existing?.ingestedRunIds ?? []), handoff.run.runId])
    ).sort(),
    authorities: mergeById(existing?.authorities ?? [], handoff.authorities),
    endpoints: mergeById(existing?.endpoints ?? [], handoff.endpoints),
    collections: mergeById(existing?.collections ?? [], handoff.collections),
    coverageEvidence: mergeById(existing?.coverageEvidence ?? [], handoff.coverageEvidence),
    gapRegister: mergeById(existing?.gapRegister ?? [], handoff.gapRegister),
    review: report,
    promotionState: "quarantine"
  };
}

function cleanRecipe(
  value: unknown,
  collectionId: string,
  errors: string[]
): IntelFetchRecipe | null {
  if (!isRecord(value)) {
    errors.push(`Collection ${collectionId} requires an executable fetchRecipe.`);
    return null;
  }
  const adapter = stringValue(value.adapter);
  const urlTemplate = stringValue(value.urlTemplate);
  if (!SUPPORTED_ADAPTERS.has(adapter))
    errors.push(`Collection ${collectionId} uses unsupported adapter ${adapter}.`);
  if (!safeUrlTemplate(urlTemplate))
    errors.push(`Collection ${collectionId} has an unsafe recipe URL template.`);
  return {
    adapter,
    method: value.method === "POST" ? "POST" : "GET",
    urlTemplate,
    paramSpec: stringRecord(value.paramSpec),
    axisOrderNote: stringValue(value.axisOrderNote) || null,
    responsePath: stringValue(value.responsePath) || null,
    steps: stringArray(value.steps)
  };
}

function safeUrlTemplate(value: string): boolean {
  if (!value || SECRET_KEYS.test(value) || LOCAL_PATH.test(value)) return false;
  let probe = value;
  for (const token of ["{lat}", "{lon}", "{bbox}", "{h3}", "{radius_km}"])
    probe = probe.replaceAll(token, "0");
  return !/[{}]/.test(probe) && canonicalPublicUrl(probe) !== null;
}

function canonicalPublicUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (!new Set(["http:", "https:"]).has(url.protocol) || url.username || url.password)
      return null;
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      /^127\.|^10\.|^192\.168\.|^169\.254\./.test(host)
    )
      return null;
    for (const key of Array.from(url.searchParams.keys()))
      if (SECRET_KEYS.test(key)) url.searchParams.delete(key);
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function invalidReport(errors: string[]): IntelHandoffValidationError {
  return new IntelHandoffValidationError({
    schemaVersion: "vmesh-intel-review-clean-report-v1",
    runId: "unknown",
    valid: false,
    errors,
    warnings: [],
    inputCounts: { authorities: 0, endpoints: 0, collections: 0 },
    outputCounts: { authorities: 0, endpoints: 0, collections: 0 },
    dropped: {},
    capabilityStates: {},
    readyForQuarantineIngest: false,
    readyForOperationalPromotion: false
  });
}

function dedupeBy(
  rows: Array<Record<string, unknown>>,
  key: (row: Record<string, unknown>) => string,
  dropped: Record<string, number>,
  reason: string
): Array<Record<string, unknown>> {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const value = key(row);
    if (!value || seen.has(value)) {
      increment(dropped, reason);
      return false;
    }
    seen.add(value);
    return true;
  });
}

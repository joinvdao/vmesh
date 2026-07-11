export const SOURCE_CAPABILITY_STATES = [
  "metadata-only",
  "probe-ready",
  "adapter-ready",
  "live-materialized",
  "abundance-live-proven"
] as const;

export type SourceCapabilityState = (typeof SOURCE_CAPABILITY_STATES)[number];

export interface SourceCapabilityLedgerRow {
  id: string;
  authorityId: string | null;
  endpointId: string | null;
  dataBucket: string;
  sourceRole: string;
  capabilityState: SourceCapabilityState;
  promotionState: string;
  endpointStatus: string;
  coverageStatus: string;
  licensePosture: string;
  accessMode: string;
  resolutionMeters: number | null;
  recipeFamily: string | null;
  lastCheckedAt: string | null;
  lastHealthyAt?: string | null;
  consecutiveFailures?: number;
  promotionReasons?: string[];
  evidenceRef: string | null;
  blocker: string | null;
  nextAction: string;
}

interface PromotionResultInput {
  sourceId: string;
  decision: "promoted" | "quarantined" | "demoted";
  executable: boolean;
  reasons: string[];
  evaluatedAt: string;
}

export function applyPromotionResultsToCapabilityLedger(
  rows: SourceCapabilityLedgerRow[],
  results: PromotionResultInput[]
): SourceCapabilityLedgerRow[] {
  const byId = new Map(results.map((result) => [result.sourceId, result]));
  return rows.map((row) => {
    const result = byId.get(row.id);
    if (!result) return row;
    return {
      ...row,
      promotionState: result.decision,
      promotionReasons: result.reasons,
      blocker: result.executable ? null : (result.reasons[0] ?? "promotion-gate-rejected"),
      nextAction: result.executable ? "monitor" : "resolve-promotion-gate-reasons"
    };
  });
}

export interface SourceCapabilityLedgerSummary {
  schemaVersion: "vmesh-source-capability-ledger-summary-v1";
  generatedAt: string;
  sourceCount: number;
  capabilityStates: Record<string, number>;
  promotionStates: Record<string, number>;
  dataBuckets: Record<string, number>;
  endpointStatuses: Record<string, number>;
  coverageStatuses: Record<string, number>;
  licensePostures: Record<string, number>;
  blockers: Record<string, number>;
  discoveryGapCount: number;
  adapterGapCount: number;
  materializerGapCount: number;
  abundanceProofGapCount: number;
}

interface QuarantineCollection {
  id: string;
  endpointId?: string | null;
  dataBucket: string;
  sourceRole: string;
  capabilityState: SourceCapabilityState;
  license?: string | null;
  resolutionMeters?: number | null;
  fetchRecipe?: { adapter?: string } | null;
}

interface QuarantineEndpoint {
  id: string;
  authorityId?: string | null;
  status?: string | null;
  authMode?: string | null;
  license?: string | null;
  lastCheckedAt?: string | null;
  evidenceRef?: string | null;
}

interface QuarantineCoverageEvidence {
  endpointId?: string | null;
  coverageStatus?: string | null;
  checkedAt?: string | null;
  evidenceRef?: string | null;
}

export function classifyLicensePosture(license: string | null | undefined): string {
  const value = (license ?? "").trim().toLowerCase();
  if (!value || ["review", "unknown", "unverified"].includes(value)) return "review-required";
  if (/(proprietary|non-commercial|\bcc-by-nc\b|research[- ]only|account[- ]only)/.test(value))
    return "restricted-or-ineligible";
  if (/(open government|public domain|\bcc0\b|\bcc-by\b|\bodc-by\b|\bodbl\b)/.test(value))
    return "open-claimed-unverified";
  return "claimed-review-required";
}

export function deriveCapabilityAction(input: {
  capabilityState: SourceCapabilityState;
  promotionState: string;
  endpointStatus: string;
  coverageStatus: string;
  licensePosture: string;
}): { blocker: string | null; nextAction: string } {
  if (input.licensePosture !== "open-claimed-unverified")
    return { blocker: "license-review-required", nextAction: "verify-license" };
  if (!new Set(["verified", "probed", "live_proof"]).has(input.endpointStatus))
    return { blocker: "endpoint-verification-required", nextAction: "probe-endpoint" };
  if (input.capabilityState === "metadata-only")
    return { blocker: "executable-recipe-missing", nextAction: "derive-fetch-recipe" };
  if (input.capabilityState === "probe-ready")
    return { blocker: "adapter-proof-required", nextAction: "prove-adapter" };
  if (!new Set(["covered", "partial"]).has(input.coverageStatus))
    return { blocker: "coverage-proof-required", nextAction: "probe-coverage" };
  if (input.capabilityState === "adapter-ready")
    return { blocker: "materialization-proof-required", nextAction: "materialize-live-payload" };
  if (input.capabilityState === "live-materialized")
    return { blocker: "abundance-proof-required", nextAction: "prove-abundance-handoff" };
  if (input.promotionState !== "promoted")
    return { blocker: "promotion-review-required", nextAction: "run-promotion-gate" };
  return { blocker: null, nextAction: "monitor" };
}

export function summarizeCapabilityLedger(
  rows: SourceCapabilityLedgerRow[],
  options: { generatedAt?: string; discoveryGapCount?: number } = {}
): SourceCapabilityLedgerSummary {
  return {
    schemaVersion: "vmesh-source-capability-ledger-summary-v1",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    sourceCount: rows.length,
    capabilityStates: count(rows.map((row) => row.capabilityState)),
    promotionStates: count(rows.map((row) => row.promotionState)),
    dataBuckets: count(rows.map((row) => row.dataBucket)),
    endpointStatuses: count(rows.map((row) => row.endpointStatus)),
    coverageStatuses: count(rows.map((row) => row.coverageStatus)),
    licensePostures: count(rows.map((row) => row.licensePosture)),
    blockers: count(rows.flatMap((row) => (row.blocker ? [row.blocker] : []))),
    discoveryGapCount: options.discoveryGapCount ?? 0,
    adapterGapCount: rows.filter((row) =>
      new Set<SourceCapabilityState>(["metadata-only", "probe-ready"]).has(row.capabilityState)
    ).length,
    materializerGapCount: rows.filter((row) => row.capabilityState === "adapter-ready").length,
    abundanceProofGapCount: rows.filter((row) => row.capabilityState !== "abundance-live-proven")
      .length
  };
}

export function buildQuarantineCapabilityLedger(input: {
  collections: QuarantineCollection[];
  endpoints: QuarantineEndpoint[];
  coverageEvidence: QuarantineCoverageEvidence[];
}): SourceCapabilityLedgerRow[] {
  const endpointById = new Map(input.endpoints.map((row) => [row.id, row]));
  const coverageByEndpoint = new Map<string, QuarantineCoverageEvidence>();
  for (const evidence of input.coverageEvidence) {
    if (!evidence.endpointId) continue;
    const prior = coverageByEndpoint.get(evidence.endpointId);
    if (!prior || String(evidence.checkedAt ?? "") > String(prior.checkedAt ?? "")) {
      coverageByEndpoint.set(evidence.endpointId, evidence);
    }
  }

  return input.collections.map((collection) => {
    const endpoint = endpointById.get(collection.endpointId ?? "");
    const coverage = coverageByEndpoint.get(collection.endpointId ?? "");
    const endpointStatus = endpoint?.status ?? "candidate";
    const coverageStatus = coverage?.coverageStatus ?? "unknown";
    const licensePosture = classifyLicensePosture(collection.license ?? endpoint?.license);
    const action = deriveCapabilityAction({
      capabilityState: collection.capabilityState,
      promotionState: "quarantine",
      endpointStatus,
      coverageStatus,
      licensePosture
    });
    return {
      id: collection.id,
      authorityId: endpoint?.authorityId ?? null,
      endpointId: collection.endpointId ?? null,
      dataBucket: collection.dataBucket,
      sourceRole: collection.sourceRole,
      capabilityState: collection.capabilityState,
      promotionState: "quarantine",
      endpointStatus,
      coverageStatus,
      licensePosture,
      accessMode: endpoint?.authMode ?? "review",
      resolutionMeters: collection.resolutionMeters ?? null,
      recipeFamily: collection.fetchRecipe?.adapter ?? null,
      lastCheckedAt: coverage?.checkedAt ?? endpoint?.lastCheckedAt ?? null,
      evidenceRef: coverage?.evidenceRef ?? endpoint?.evidenceRef ?? null,
      blocker: action.blocker,
      nextAction: action.nextAction
    };
  });
}

function count(values: string[]): Record<string, number> {
  return Object.fromEntries(
    Array.from(
      values.reduce((counts, value) => counts.set(value, (counts.get(value) ?? 0) + 1), new Map())
    ).sort(([left], [right]) => left.localeCompare(right))
  );
}

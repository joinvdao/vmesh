export type IntelCapabilityState =
  | "metadata-only"
  | "probe-ready"
  | "adapter-ready"
  | "live-materialized"
  | "abundance-live-proven";

export interface IntelFetchRecipe {
  adapter: string;
  method: "GET" | "POST";
  urlTemplate: string;
  paramSpec: Record<string, string>;
  axisOrderNote?: string | null;
  responsePath?: string | null;
  steps: string[];
}

export interface IntelSourceEndpoint {
  id: string;
  authorityId: string;
  endpointType: string;
  url: string;
  status: string;
  license: string;
  disclosureClass: "public_safe";
  [key: string]: unknown;
}

export interface IntelSourceCollection {
  id: string;
  endpointId: string;
  providerCollectionId: string;
  title: string;
  dataBucket: string;
  sourceRole: string;
  status: string;
  capabilityState: IntelCapabilityState;
  fetchRecipe: IntelFetchRecipe | null;
  disclosureClass: "public_safe";
  [key: string]: unknown;
}

export interface IntelSourceHandoff {
  schemaVersion: "vmesh-intel-source-handoff-v1";
  generatedAt: string;
  run: {
    runId: string;
    runType: string;
    runClass: "mock" | "dry_run" | "configured" | "live_proof";
    dataBuckets: string[];
    [key: string]: unknown;
  };
  authorities: Array<Record<string, unknown> & { id: string }>;
  endpoints: IntelSourceEndpoint[];
  collections: IntelSourceCollection[];
  coverageEvidence: Array<Record<string, unknown>>;
  gapRegister: Array<Record<string, unknown>>;
  evalScorecard: Record<string, unknown>;
  provenance: Record<string, unknown>;
}

export interface IntelHandoffReviewReport {
  schemaVersion: "vmesh-intel-review-clean-report-v1";
  runId: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  inputCounts: { authorities: number; endpoints: number; collections: number };
  outputCounts: { authorities: number; endpoints: number; collections: number };
  dropped: Record<string, number>;
  capabilityStates: Record<string, number>;
  readyForQuarantineIngest: boolean;
  readyForOperationalPromotion: false;
}

export interface IntelQuarantinePackage {
  schemaVersion: "vmesh-intel-quarantine-v1";
  runId: string;
  ingestionKey: string;
  ingestedRunIds: string[];
  authorities: IntelSourceHandoff["authorities"];
  endpoints: IntelSourceEndpoint[];
  collections: IntelSourceCollection[];
  coverageEvidence: IntelSourceHandoff["coverageEvidence"];
  gapRegister: IntelSourceHandoff["gapRegister"];
  review: IntelHandoffReviewReport;
  promotionState: "quarantine";
}

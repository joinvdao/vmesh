import { describe, expect, it } from "vitest";

import {
  buildQuarantineCapabilityLedger,
  classifyLicensePosture,
  deriveCapabilityAction,
  summarizeCapabilityLedger,
  type SourceCapabilityLedgerRow
} from "@/lib/sourceCapabilityLedger";

function row(overrides: Partial<SourceCapabilityLedgerRow> = {}): SourceCapabilityLedgerRow {
  return {
    id: "col:example",
    authorityId: "auth:example",
    endpointId: "ep:example",
    dataBucket: "terrain_elevation",
    sourceRole: "generic-dem",
    capabilityState: "adapter-ready",
    promotionState: "quarantine",
    endpointStatus: "verified",
    coverageStatus: "covered",
    licensePosture: "open-claimed-unverified",
    accessMode: "none",
    resolutionMeters: 30,
    recipeFamily: "stac-collection-items",
    lastCheckedAt: "2026-07-11T00:00:00Z",
    evidenceRef: "evidence:example",
    blocker: "materialization-proof-required",
    nextAction: "materialize-live-payload",
    ...overrides
  };
}

describe("source capability ledger", () => {
  it("keeps claimed open licenses separate from reviewed promotion", () => {
    expect(classifyLicensePosture("CC-BY-4.0")).toBe("open-claimed-unverified");
    expect(classifyLicensePosture("review")).toBe("review-required");
    expect(classifyLicensePosture("proprietary")).toBe("restricted-or-ineligible");
  });

  it("prioritizes truth blockers before materialization", () => {
    expect(
      deriveCapabilityAction({
        capabilityState: "adapter-ready",
        promotionState: "quarantine",
        endpointStatus: "candidate",
        coverageStatus: "unknown",
        licensePosture: "review-required"
      })
    ).toEqual({ blocker: "license-review-required", nextAction: "verify-license" });
  });

  it("separates adapter, materializer, and Abundance proof gaps", () => {
    const summary = summarizeCapabilityLedger(
      [
        row({ id: "metadata", capabilityState: "metadata-only" }),
        row({ id: "adapter" }),
        row({ id: "materialized", capabilityState: "live-materialized" }),
        row({
          id: "proven",
          capabilityState: "abundance-live-proven",
          promotionState: "promoted",
          blocker: null,
          nextAction: "monitor"
        })
      ],
      { generatedAt: "2026-07-11T00:00:00Z", discoveryGapCount: 2 }
    );

    expect(summary.sourceCount).toBe(4);
    expect(summary.adapterGapCount).toBe(1);
    expect(summary.materializerGapCount).toBe(1);
    expect(summary.abundanceProofGapCount).toBe(3);
    expect(summary.discoveryGapCount).toBe(2);
  });

  it("derives quarantine rows from the typed handoff evidence", () => {
    const rows = buildQuarantineCapabilityLedger({
      collections: [
        {
          id: "col:terrain",
          endpointId: "ep:terrain",
          dataBucket: "terrain_elevation",
          sourceRole: "generic-dem",
          capabilityState: "adapter-ready",
          resolutionMeters: 30,
          fetchRecipe: { adapter: "stac-collection-items" }
        }
      ],
      endpoints: [
        {
          id: "ep:terrain",
          authorityId: "auth:terrain",
          status: "verified",
          authMode: "none",
          license: "CC0-1.0"
        }
      ],
      coverageEvidence: [
        {
          endpointId: "ep:terrain",
          coverageStatus: "covered",
          checkedAt: "2026-07-11T00:00:00Z",
          evidenceRef: "evidence:terrain"
        }
      ]
    });

    expect(rows[0]).toMatchObject({
      authorityId: "auth:terrain",
      recipeFamily: "stac-collection-items",
      blocker: "materialization-proof-required"
    });
  });
});

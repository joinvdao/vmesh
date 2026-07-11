import { describe, expect, it } from "vitest";
import {
  ingestIntelHandoffToQuarantine,
  IntelHandoffValidationError,
  reviewAndCleanIntelHandoff
} from "@/lib/intelSourceCampaign";

function fixture() {
  return {
    schemaVersion: "vmesh-intel-source-handoff-v1",
    generatedAt: "2026-07-11T00:00:00Z",
    run: {
      runId: "fixture-global-refresh",
      runType: "intel_tools_discovery",
      runClass: "dry_run",
      dataBuckets: ["terrain_elevation"]
    },
    authorities: [
      {
        id: "auth:example",
        name: "Example Mapping Authority",
        homepageUrl: "https://catalog.example.test"
      }
    ],
    endpoints: [
      {
        id: "ep:example",
        authorityId: "auth:example",
        endpointType: "stac_api",
        url: "https://catalog.example.test/stac",
        status: "verified",
        license: "CC-BY-4.0",
        disclosureClass: "public_safe"
      }
    ],
    collections: [
      {
        id: "col:example-dem",
        endpointId: "ep:example",
        providerCollectionId: "example-dem",
        title: "Example DEM",
        dataBucket: "terrain_elevation",
        sourceRole: "generic-dem",
        status: "verified",
        capabilityState: "adapter-ready",
        fetchRecipe: {
          adapter: "stac-collection-items",
          method: "GET",
          urlTemplate:
            "https://catalog.example.test/stac/collections/example-dem/items?bbox={bbox}&limit=10",
          paramSpec: { bbox: "minLon,minLat,maxLon,maxLat" },
          steps: ["Query by bbox."]
        },
        disclosureClass: "public_safe"
      }
    ],
    coverageEvidence: [],
    gapRegister: [],
    evalScorecard: {},
    provenance: { candidateOnly: true }
  };
}

describe("Intel Tools to VMesh source campaign handoff", () => {
  it("reviews and cleans a candidate handoff without promoting it", () => {
    const { handoff, report } = reviewAndCleanIntelHandoff(fixture());

    expect(report.valid).toBe(true);
    expect(report.readyForQuarantineIngest).toBe(true);
    expect(report.readyForOperationalPromotion).toBe(false);
    expect(handoff.collections[0].fetchRecipe?.adapter).toBe("stac-collection-items");
  });

  it("ingests idempotently into quarantine", () => {
    const first = ingestIntelHandoffToQuarantine(fixture());
    const second = ingestIntelHandoffToQuarantine(fixture(), first);

    expect(second).toBe(first);
    expect(second.promotionState).toBe("quarantine");
    expect(second.ingestedRunIds).toEqual(["fixture-global-refresh"]);
    expect(second.collections).toHaveLength(1);
  });

  it("rejects credentials and attempted promotion", () => {
    const unsafe = fixture();
    unsafe.endpoints[0].url = "https://catalog.example.test/stac?access_token=secret";
    unsafe.collections[0].status = "promoted";

    expect(() => reviewAndCleanIntelHandoff(unsafe)).toThrow(IntelHandoffValidationError);
  });

  it("keeps metadata-only records but discards their recipes", () => {
    const metadataOnly = fixture();
    metadataOnly.collections[0].capabilityState = "metadata-only";

    const { handoff, report } = reviewAndCleanIntelHandoff(metadataOnly);

    expect(handoff.collections[0].fetchRecipe).toBeNull();
    expect(report.warnings.join(" ")).toContain("discarded");
    expect(report.dropped.non_executable_recipe).toBe(1);
  });
});

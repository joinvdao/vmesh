import { describe, expect, it } from "vitest";

import {
  evaluateSourcePromotion,
  isOperationalSourcePromoted,
  operationalPromotionResults,
  unsafeEndpointReasons,
  type SourcePromotionCandidate
} from "@/lib/sourcePromotionGate";

const NOW = new Date("2026-07-11T00:00:00Z");

function candidate(overrides: Partial<SourcePromotionCandidate> = {}): SourcePromotionCandidate {
  return {
    sourceId: "source:example",
    authorityReviewed: true,
    endpoint: "https://example.gov/data.tif",
    licenseReviewed: true,
    accessAllowed: true,
    coverageStatus: "covered",
    sourceRole: "bare-earth-dtm",
    resolutionOrScale: "30 m",
    confidence: 0.9,
    recipeFamily: "cog",
    assetFormat: "image/tiff; application=geotiff; profile=cloud-optimized",
    fixtureEvidenceRef: "tests/source-example.test.ts",
    liveEvidenceRef: "docs/evidence/source-example.json",
    lastHealthyAt: "2026-07-10T00:00:00Z",
    consecutiveFailures: 0,
    limitations: ["Regional upgrade preferred where available."],
    fallbackBehavior: "Return explicit no-data and continue ranked ladder.",
    ...overrides
  };
}

describe("source promotion gate", () => {
  it("promotes only complete executable evidence", () => {
    expect(evaluateSourcePromotion(candidate(), { now: NOW })).toMatchObject({
      decision: "promoted",
      executable: true,
      reasons: []
    });
  });

  it("quarantines metadata-only and unlicensed records", () => {
    expect(
      evaluateSourcePromotion(
        candidate({ recipeFamily: null, liveEvidenceRef: null, licenseReviewed: false }),
        { now: NOW }
      )
    ).toMatchObject({
      decision: "quarantined",
      executable: false,
      reasons: expect.arrayContaining([
        "recipe-family-unsupported",
        "live-evidence-missing",
        "license-or-access-gated"
      ])
    });
  });

  it("demotes after three consecutive failures or stale health evidence", () => {
    expect(
      evaluateSourcePromotion(candidate({ consecutiveFailures: 3 }), { now: NOW })
    ).toMatchObject({ decision: "demoted", executable: false });
    expect(
      evaluateSourcePromotion(candidate({ lastHealthyAt: "2026-05-01T00:00:00Z" }), { now: NOW })
    ).toMatchObject({ decision: "demoted", executable: false });
  });

  it("rejects signed refs, local paths, previews and private endpoints", () => {
    expect(unsafeEndpointReasons("https://example.gov/data.tif?token=secret")).toContain(
      "signed-or-secret-ref-rejected"
    );
    expect(unsafeEndpointReasons("C:\\private\\data.tif")).toContain("local-path-rejected");
    expect(unsafeEndpointReasons("https://example.gov/preview.png")).toContain(
      "preview-or-html-ref-rejected"
    );
    expect(unsafeEndpointReasons("https://127.0.0.1/data.tif")).toContain(
      "private-endpoint-rejected"
    );
    const credentialRef = new URL("https://example.gov/data.tif");
    credentialRef.username = "test-user";
    credentialRef.password = "test-value";
    expect(unsafeEndpointReasons(credentialRef.toString())).toContain(
      "credential-bearing-ref-rejected"
    );
  });

  it("has an explicit small operational catalog", () => {
    expect(isOperationalSourcePromoted("copernicus-dem-glo30", NOW)).toBe(true);
    expect(isOperationalSourcePromoted("unreviewed-intel-candidate", NOW)).toBe(false);
    expect(operationalPromotionResults(NOW).every((result) => result.executable)).toBe(true);
  });
});

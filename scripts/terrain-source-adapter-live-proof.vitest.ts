import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  createLiveNorthAmericaDsmSourceAdapterPlan,
  createLiveNorthAmericaDtmSourceAdapterPlan
} from "@/lib/geospatialPackage";

const artifactDir = path.join(".artifacts", "terrain-source-preview");
const reportPath = path.join(artifactDir, "source-adapter-live-proof-latest.json");

const cases = [
  {
    id: "usa-denver-dtm-source-adapter",
    role: "dtm",
    aoi: {
      centroid: { latitude: 39.74, longitude: -104.99 },
      label: "Denver public-safe DTM adapter proof AOI"
    },
    expectedSourceId: "usgs-3dep",
    expectedToolId: "usgs-3dep",
    expectedStatus: "ready"
  },
  {
    id: "bc-vancouver-dtm-source-adapter",
    role: "dtm",
    aoi: {
      centroid: { latitude: 49.2827, longitude: -123.1207 },
      label: "Vancouver public-safe DTM adapter proof AOI"
    },
    expectedSourceId: "bc-lidarbc",
    expectedToolId: "bc-lidarbc",
    expectedStatus: "ready"
  },
  {
    id: "canada-ottawa-dtm-source-adapter",
    role: "dtm",
    aoi: {
      centroid: { latitude: 45.4215, longitude: -75.6972 },
      label: "Ottawa public-safe DTM adapter proof AOI"
    },
    expectedSourceId: "canada-hrdem",
    expectedToolId: "canada-hrdem",
    expectedStatus: "ready"
  },
  {
    id: "usa-denver-dsm-source-adapter",
    role: "dsm",
    aoi: {
      centroid: { latitude: 39.74, longitude: -104.99 },
      label: "Denver public-safe DSM adapter proof AOI"
    },
    expectedSourceId: "usgs-3dep-lpc-dsm",
    expectedToolId: "usgs-3dep-lpc-dsm",
    expectedStatus: "ready"
  },
  {
    id: "bc-vancouver-dsm-source-adapter",
    role: "dsm",
    aoi: {
      centroid: { latitude: 49.2827, longitude: -123.1207 },
      label: "Vancouver public-safe DSM adapter proof AOI"
    },
    expectedSourceId: "bc-lidarbc-dsm",
    expectedToolId: "bc-lidarbc",
    expectedStatus: "ready"
  },
  {
    id: "canada-ottawa-dsm-source-adapter",
    role: "dsm",
    aoi: {
      centroid: { latitude: 45.4215, longitude: -75.6972 },
      label: "Ottawa public-safe DSM adapter proof AOI"
    },
    expectedSourceId: "canada-hrdem-dsm",
    expectedToolId: "canada-hrdem",
    expectedStatus: "ready"
  }
] as const;

describe("North America terrain source adapter live proof", () => {
  it("resolves official DTM and DSM package-source inputs for selected public-safe USA and Canada AOIs", async () => {
    const checks = [];

    for (const proofCase of cases) {
      const plan =
        proofCase.role === "dtm"
          ? await createLiveNorthAmericaDtmSourceAdapterPlan({
              request: {
                aoi: proofCase.aoi,
                layers: ["terrain"]
              }
            })
          : await createLiveNorthAmericaDsmSourceAdapterPlan({
              request: {
                aoi: proofCase.aoi,
                layers: ["terrain"]
              }
            });

      checks.push({
        id: proofCase.id,
        role: proofCase.role,
        expectedStatus: proofCase.expectedStatus,
        actualStatus: plan.status,
        expectedSourceId: proofCase.expectedSourceId,
        selectedSourceId: plan.selectedSource?.id ?? null,
        expectedToolId: proofCase.expectedToolId,
        selectedToolId: plan.toolProfile?.toolId ?? null,
        inputRefCount: plan.inputRefs.length,
        inputRefKinds: plan.inputRefs.map((inputRef) => inputRef.kind),
        targetResolutionMeters: plan.inputRefs[0]?.targetResolutionMeters ?? null,
        blockedReasons: plan.blockedReasons,
        warnings: plan.warnings
      });

      expect(plan.status).toBe(proofCase.expectedStatus);
      expect(plan.selectedSource?.id).toBe(proofCase.expectedSourceId);
      expect(plan.toolProfile?.toolId).toBe(proofCase.expectedToolId);
      expect(plan.inputRefs.length).toBeGreaterThan(0);
      if (proofCase.role === "dsm") {
        expect(plan.inputRefs[0].groundModelRole).toBe("surface-dsm");
      }
    }

    const dtmChecks = checks.filter((check) => check.role === "dtm");
    const dsmChecks = checks.filter((check) => check.role === "dsm");
    const report = {
      schemaVersion: "vmesh-terrain-source-adapter-live-proof-v1",
      generatedAt: new Date().toISOString(),
      runClass: "live-proof",
      status: "source-adapter-live-proof-passed",
      universalUsaCanadaOneMeterDtmProven: false,
      universalUsaCanadaOneMeterDsmProven: false,
      canadaNationalDefault:
        "partial 2m HRDEM unless direct 1m HRDEM/provincial coverage is proven for the AOI",
      note: "Public-safe live proof for package-side source adapter selection. This proves official DTM/DSM source input resolution for selected AOIs, not country-wide 1m coverage.",
      summary: {
        totalChecks: checks.length,
        readyPlans: checks.filter((check) => check.actualStatus === "ready").length,
        dtmChecks: dtmChecks.length,
        dsmChecks: dsmChecks.length,
        readyDtmPlans: dtmChecks.filter((check) => check.actualStatus === "ready").length,
        readyDsmPlans: dsmChecks.filter((check) => check.actualStatus === "ready").length
      },
      checks
    };

    mkdirSync(path.dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }, 180_000);
});

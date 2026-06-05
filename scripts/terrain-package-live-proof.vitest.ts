import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  createTerrainRasterQueryFromSourceRenderProof,
  runTerrainPackageWorker
} from "@/lib/geospatialPackage";

const artifactDir = path.join(".artifacts", "terrain-source-preview");
const reportPath = path.join(artifactDir, "terrain-package-live-proof-latest.json");

interface PackageProofCase {
  id: string;
  proofPath: string;
  proofRef: string;
  aoi: {
    centroid: { latitude: number; longitude: number };
    label: string;
  };
  preferredSourceIds: string[];
  expectedStatus: "ready" | "blocked";
  expectedRunClass: "live-proof" | "configured";
  expectedGroundModelRole?: "bare-earth-dtm" | "surface-dsm";
}

const cases: PackageProofCase[] = [
  {
    id: "usa-denver-usgs-dtm-package-proof",
    proofPath: path.join(artifactDir, "matrix-denver-usgs-dtm.json"),
    proofRef: path.join(artifactDir, "matrix-denver-usgs-dtm.json"),
    aoi: {
      centroid: { latitude: 39.7240885773337, longitude: -105.00732421875 },
      label: "Denver public USGS 3DEP DTM tile proof AOI"
    },
    preferredSourceIds: ["usgs-3dep"],
    expectedStatus: "ready",
    expectedRunClass: "live-proof",
    expectedGroundModelRole: "bare-earth-dtm"
  },
  {
    id: "usa-denver-usgs-lpc-dsm-package-proof",
    proofPath: path.join(artifactDir, "matrix-denver-usgs-lpc-dsm-render.json"),
    proofRef: path.join(artifactDir, "matrix-denver-usgs-lpc-dsm-render.json"),
    aoi: {
      centroid: { latitude: 39.73676229957947, longitude: -105.0018310546875 },
      label: "Denver public USGS LPC DSM tile proof AOI"
    },
    preferredSourceIds: ["usgs-3dep-lpc-dsm"],
    expectedStatus: "ready",
    expectedRunClass: "live-proof",
    expectedGroundModelRole: "surface-dsm"
  },
  {
    id: "canada-ottawa-hrdem-dtm-package-proof",
    proofPath: path.join(artifactDir, "matrix-ottawa-hrdem-dtm.json"),
    proofRef: path.join(artifactDir, "matrix-ottawa-hrdem-dtm.json"),
    aoi: {
      centroid: { latitude: 45.41387646082107, longitude: -75.69580078125 },
      label: "Ottawa public HRDEM DTM tile proof AOI"
    },
    preferredSourceIds: ["canada-hrdem"],
    expectedStatus: "ready",
    expectedRunClass: "live-proof",
    expectedGroundModelRole: "bare-earth-dtm"
  },
  {
    id: "canada-ottawa-hrdem-dsm-package-proof",
    proofPath: path.join(artifactDir, "matrix-ottawa-hrdem-dsm.json"),
    proofRef: path.join(artifactDir, "matrix-ottawa-hrdem-dsm.json"),
    aoi: {
      centroid: { latitude: 45.41387646082107, longitude: -75.69580078125 },
      label: "Ottawa public HRDEM DSM tile proof AOI"
    },
    preferredSourceIds: ["canada-hrdem-dsm"],
    expectedStatus: "ready",
    expectedRunClass: "live-proof",
    expectedGroundModelRole: "surface-dsm"
  },
  {
    id: "bc-vancouver-lidarbc-dtm-package-proof",
    proofPath: path.join(artifactDir, "matrix-vancouver-lidarbc-dtm.json"),
    proofRef: path.join(artifactDir, "matrix-vancouver-lidarbc-dtm.json"),
    aoi: {
      centroid: { latitude: 49.2827, longitude: -123.1207 },
      label: "Vancouver public LidarBC DTM proof AOI"
    },
    preferredSourceIds: ["bc-lidarbc"],
    expectedStatus: "ready",
    expectedRunClass: "live-proof",
    expectedGroundModelRole: "bare-earth-dtm"
  },
  {
    id: "bc-vancouver-lidarbc-dsm-package-proof",
    proofPath: path.join(artifactDir, "matrix-vancouver-lidarbc-dsm.json"),
    proofRef: path.join(artifactDir, "matrix-vancouver-lidarbc-dsm.json"),
    aoi: {
      centroid: { latitude: 49.2827, longitude: -123.1207 },
      label: "Vancouver public LidarBC DSM proof AOI"
    },
    preferredSourceIds: ["bc-lidarbc-dsm"],
    expectedStatus: "ready",
    expectedRunClass: "live-proof",
    expectedGroundModelRole: "surface-dsm"
  },
  {
    id: "bc-interior-hrdem-dtm-package-gap",
    proofPath: path.join(artifactDir, "matrix-bc-interior-hrdem-dtm-gap.json"),
    proofRef: path.join(artifactDir, "matrix-bc-interior-hrdem-dtm-gap.json"),
    aoi: {
      centroid: { latitude: 50.665, longitude: -120.545 },
      label: "BC interior public HRDEM DTM no-data gap AOI"
    },
    preferredSourceIds: ["canada-hrdem"],
    expectedStatus: "blocked",
    expectedRunClass: "live-proof"
  }
];

describe("terrain package live proof artifacts", () => {
  it("promotes retained source proofs into package worker manifests and preserves fail-closed gaps", async () => {
    const checks = [];

    for (const proofCase of cases) {
      const proof = JSON.parse(readFileSync(proofCase.proofPath, "utf8")) as unknown;
      const terrainRasterQuery = createTerrainRasterQueryFromSourceRenderProof(proof, {
        proofRef: proofCase.proofRef
      });
      const result = await runTerrainPackageWorker(
        {
          request: {
            aoi: proofCase.aoi,
            layers: ["terrain"],
            preferredSourceIds: proofCase.preferredSourceIds
          }
        },
        { terrainRasterQuery }
      );

      checks.push({
        id: proofCase.id,
        proofPath: proofCase.proofPath,
        expectedStatus: proofCase.expectedStatus,
        actualStatus: result.status,
        expectedRunClass: proofCase.expectedRunClass,
        actualRunClass: result.runClass,
        selectedSourceId: result.selectedSource?.id ?? null,
        groundModelRole: result.manifest?.sourceSummary.groundModelRole ?? null,
        resolutionMeters: result.manifest?.sourceSummary.resolutionMeters ?? null,
        retainedEvidence: result.manifest?.retainedEvidence ?? [],
        blockedReasons: result.blockedReasons
      });

      expect(result.status).toBe(proofCase.expectedStatus);
      expect(result.runClass).toBe(proofCase.expectedRunClass);
      if (proofCase.expectedStatus === "ready") {
        expect(result.manifest?.sourceSummary.resolutionMeters).toBe(1);
        expect(result.manifest?.sourceSummary.groundModelRole).toBe(
          proofCase.expectedGroundModelRole
        );
        expect(result.manifest?.retainedEvidence).toContain(proofCase.proofRef);
      } else {
        expect(result.manifest).toBeNull();
        expect(result.blockedReasons.length).toBeGreaterThan(0);
      }
    }

    const report = {
      schemaVersion: "vmesh-terrain-package-live-proof-v1",
      generatedAt: new Date().toISOString(),
      runClass: "live-proof",
      status: "terrain-package-live-proof-passed",
      universalUsaCanadaOneMeterDtmProven: false,
      universalDsmProven: false,
      note: "Public-safe package worker proof. Retained source-preview worker artifacts are promoted only when source, role, resolution, and AOI location evidence match. This proves package contract behavior for selected AOIs, not universal 1m USA/Canada coverage.",
      summary: {
        totalChecks: checks.length,
        readyManifests: checks.filter((check) => check.actualStatus === "ready").length,
        blockedGaps: checks.filter((check) => check.actualStatus === "blocked").length
      },
      checks
    };

    mkdirSync(path.dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }, 120_000);
});

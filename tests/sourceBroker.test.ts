import { describe, expect, it } from "vitest";

import { MAPTERHORN_PROVIDER_ID } from "@/lib/terrainSources";
import {
  capTerrainConfidenceByRole,
  canSourceDriveTerrainMesh,
  createSourceProvenance
} from "@/lib/sourceProvenance";
import { validateDataPackageManifest } from "@/lib/sourcePackages";
import { createSourceBrokerReport, validateSourceBrokerReport } from "@/lib/sourceBroker";

describe("macro atlas source broker and package manifests", () => {
  it("selects open defaults and emits a valid package manifest", () => {
    const report = createSourceBrokerReport({
      h3Id: "85393363fffffff",
      centroid: { latitude: 38.7223, longitude: -9.1393 },
      bounds: [-9.55, 38.48, -8.75, 39.05],
      createdAt: "2026-05-10T00:00:00.000Z"
    });

    expect(report.openDataFirst).toBe(true);
    expect(report.selected.terrain.id).toBe(MAPTERHORN_PROVIDER_ID);
    expect(report.selected.basemap.requiresApiKey).toBe(false);
    expect(report.selected.imagery.requiresApiKey).toBe(false);
    expect(report.layerCatalogSummary.totalLayers).toBeGreaterThan(12);
    expect(validateDataPackageManifest(report.packageManifest)).toBe(true);
    expect(validateSourceBrokerReport(report)).toBe(true);
  });

  it("keeps skipped source reasons visible for preprocessing and gated providers", () => {
    const report = createSourceBrokerReport({
      h3Id: "85393363fffffff",
      centroid: { latitude: 38.7223, longitude: -9.1393 }
    });

    expect(report.rejectedSources.length).toBeGreaterThan(0);
    expect(report.rejectedSources.map((source) => source.providerId)).toContain("noaa-cudem");
    expect(report.rejectedSources.some((source) => source.reason.includes("preprocessing"))).toBe(
      true
    );
  });

  it("caps terrain confidence by source role and blocks imagery from terrain trust", () => {
    const dem = createSourceProvenance({
      providerId: "mapterhorn-pmtiles",
      sourceId: "mapterhorn-pmtiles",
      sourceType: "static",
      groundModelRole: "generic-dem",
      license: "open data",
      attribution: "Mapterhorn",
      confidence: 91,
      limitations: ["Generic DEM until tile-level DTM metadata is available."]
    });
    const imagery = createSourceProvenance({
      providerId: "sentinel2-sen2sr-pmtiles",
      sourceId: "mock-sentinel-scene",
      sourceType: "derived",
      groundModelRole: "imagery-inferred-context",
      license: "Sentinel/SEN2SR terms",
      attribution: "Copernicus Sentinel-2 / ESAOpenSR",
      confidence: 80,
      limitations: ["Super-resolution is visual context only."]
    });

    expect(capTerrainConfidenceByRole(dem)).toBe(72);
    expect(canSourceDriveTerrainMesh(dem)).toBe(true);
    expect(capTerrainConfidenceByRole(imagery)).toBe(20);
    expect(canSourceDriveTerrainMesh(imagery)).toBe(false);
  });
});

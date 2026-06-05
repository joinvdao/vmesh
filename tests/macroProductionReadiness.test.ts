import { describe, expect, it } from "vitest";

import manifestJson from "@/fixtures/macro-packages/western-europe-demo.manifest.json";
import summaryJson from "@/fixtures/macro-packages/western-europe-demo.h3-summary.json";
import {
  assessMacroPackageProductionReadiness,
  FULL_ATLAS_MACRO_LAYER_GROUPS
} from "@/lib/macro-packages/macroProductionReadiness";
import type {
  MacroPackageH3SummaryArtifact,
  MacroPackageManifest
} from "@/lib/macro-packages/macroPackages";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createProductionCorePackage(): {
  manifest: MacroPackageManifest;
  summary: MacroPackageH3SummaryArtifact;
} {
  const manifest = clone(manifestJson as MacroPackageManifest);
  const summary = clone(summaryJson as MacroPackageH3SummaryArtifact);

  manifest.mode = "cached-package";
  manifest.packageVersion = "2026.05.production-core";
  manifest.timeWindow.cadence = "hourly";
  manifest.sourceRun.generatedBy = "server-worker";
  manifest.sourceRun.liveNetworkUsed = true;
  manifest.qualityGates.fixtureOnly = false;
  manifest.qualityGates.providerTermsReviewed = true;
  manifest.limitations = [
    "Decision-support macro package with source latency, uncertainty, and confidence limits.",
    "Official warning feeds, legal survey products, and emergency directives remain separate."
  ];
  manifest.providers = manifest.providers.map((provider) => ({
    ...provider,
    providerId: "open-meteo-forecast",
    providerLabel: "Open-Meteo reviewed package",
    sourceType: "package",
    status: "cached-package",
    license: "Open-Meteo terms and attribution preserved in package metadata",
    limitations: "Decision-support context with point-forecast latency and confidence limits."
  }));

  summary.packageVersion = manifest.packageVersion;
  summary.records = summary.records.map((record) => ({
    ...record,
    packageVersion: manifest.packageVersion,
    packageMode: "cached-package",
    qualityFlags: ["reviewed-provider", "bounded-aoi", "no-browser-grid-fetch"],
    license: "Open-Meteo terms and attribution preserved in package metadata",
    limitations: "Decision-support context with point-forecast latency and confidence limits.",
    provenance: {
      ...record.provenance,
      providerId: "open-meteo-forecast",
      providerLabel: "Open-Meteo reviewed package",
      sourceType: "package",
      license: "Open-Meteo terms and attribution preserved in package metadata",
      limitations: "Decision-support context with point-forecast latency and confidence limits."
    }
  }));

  return { manifest, summary };
}

describe("macro production readiness gates", () => {
  const manifest = manifestJson as MacroPackageManifest;
  const summary = summaryJson as MacroPackageH3SummaryArtifact;

  it("treats committed macro fixtures as safe fixtures, not production packages", () => {
    const fixtureReport = assessMacroPackageProductionReadiness(manifest, summary, "fixture");
    const productionReport = assessMacroPackageProductionReadiness(
      manifest,
      summary,
      "production-core"
    );

    expect(fixtureReport.status).toBe("fixture-safe");
    expect(fixtureReport.valid).toBe(true);
    expect(fixtureReport.warnings.join(" ")).toContain("production promotion will be blocked");
    expect(productionReport.status).toBe("blocked");
    expect(productionReport.errors).toContain(
      "production profile cannot use a fixture-only package"
    );
  });

  it("can promote a reviewed core macro package only after production gates pass", () => {
    const productionPackage = createProductionCorePackage();
    const report = assessMacroPackageProductionReadiness(
      productionPackage.manifest,
      productionPackage.summary,
      "production-core"
    );

    expect(report.status).toBe("production-ready");
    expect(report.errors).toEqual([]);
  });

  it("blocks full-atlas production until terrain, vegetation, and imagery products are present", () => {
    const productionPackage = createProductionCorePackage();
    const report = assessMacroPackageProductionReadiness(
      productionPackage.manifest,
      productionPackage.summary,
      "production-full-atlas"
    );

    expect(report.status).toBe("blocked");
    expect(report.checkedLayerGroups).toHaveLength(FULL_ATLAS_MACRO_LAYER_GROUPS.length);
    expect(report.errors.join(" ")).toContain("Terrain and derived topography");
    expect(report.errors.join(" ")).toContain("Vegetation and land cover");
    expect(report.errors.join(" ")).toContain("Satellite imagery");
  });
});

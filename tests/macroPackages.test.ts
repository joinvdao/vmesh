import { describe, expect, it } from "vitest";

import manifestJson from "@/fixtures/macro-packages/western-europe-demo.manifest.json";
import summaryJson from "@/fixtures/macro-packages/western-europe-demo.h3-summary.json";
import { createWesternEuropeMacroPackageFixture } from "@/lib/macro-packages/macroPackageFixtures";
import { importMacroPackageSummaries } from "@/lib/macro-packages/macroPackageImport";
import type {
  MacroPackageH3SummaryArtifact,
  MacroPackageManifest
} from "@/lib/macro-packages/macroPackages";
import { macroPackageModeLabel } from "@/lib/macro-packages/macroPackages";
import { validateMacroPackage } from "@/lib/macro-packages/macroPackageValidation";

describe("macro package fixtures", () => {
  const manifest = manifestJson as MacroPackageManifest;
  const summary = summaryJson as MacroPackageH3SummaryArtifact;

  it("validates the committed Western Europe fixture package", () => {
    const result = validateMacroPackage(manifest, summary);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(summary.records).toHaveLength(20);
    expect(manifest.mode).toBe("fixture-package");
  });

  it("imports packaged summaries into the current macro summary map", () => {
    const selectedH3Id = summary.records[0].h3Id;
    const imported = importMacroPackageSummaries({ manifest, summary, selectedH3Id });

    expect(imported.importedCount).toBe(summary.records.length);
    expect(imported.selectedSummary?.h3Id).toBe(selectedH3Id);
    expect(imported.selectedSummary?.provenance.sourceType).toBe("fixture");
    expect(imported.dataModeLabel).toBe("Fixture package");
  });

  it("generates deterministic in-code fixtures with package provenance", () => {
    const generated = createWesternEuropeMacroPackageFixture(8);
    const result = validateMacroPackage(generated.manifest, generated.summary);

    expect(result.valid).toBe(true);
    expect(generated.summary.records).toHaveLength(8);
    expect(generated.summary.records[0].qualityFlags).toContain("no-live-network");
    expect(macroPackageModeLabel(generated.manifest.mode)).toBe("Fixture package");
  });
});

import {
  macroPackageModeLabel,
  packageSummaryToMacroCellSummary,
  type MacroPackageH3SummaryArtifact,
  type MacroPackageManifest,
  type PackagedMacroCellSummary
} from "@/lib/macro-packages/macroPackages";
import type { MacroCellSummary } from "@/lib/vmeshTypes";

export interface MacroPackageImportResult {
  summariesByH3: Record<string, MacroCellSummary>;
  selectedSummary: MacroCellSummary | null;
  importedCount: number;
  dataModeLabel: string;
}

export function importMacroPackageSummaries({
  manifest,
  summary,
  selectedH3Id
}: {
  manifest: MacroPackageManifest;
  summary: MacroPackageH3SummaryArtifact;
  selectedH3Id?: string;
}): MacroPackageImportResult {
  const summariesByH3 = Object.fromEntries(
    summary.records.map((record) => [record.h3Id, packageSummaryToMacroCellSummary(record)])
  );

  return {
    summariesByH3,
    selectedSummary: selectedH3Id ? (summariesByH3[selectedH3Id] ?? null) : null,
    importedCount: summary.records.length,
    dataModeLabel: macroPackageModeLabel(manifest.mode)
  };
}

export function isPackagedMacroSummary(
  summary: MacroCellSummary | PackagedMacroCellSummary
): summary is PackagedMacroCellSummary {
  return "packageId" in summary && "packageVersion" in summary;
}

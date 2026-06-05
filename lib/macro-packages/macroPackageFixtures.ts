import { createHash } from "node:crypto";

import { createMockMacroCellSummary, initialHexDataByTier } from "@/data/mockVmeshData";
import {
  MACRO_PACKAGE_SCHEMA_VERSION,
  type MacroPackageH3SummaryArtifact,
  type MacroPackageManifest,
  type PackagedMacroCellSummary
} from "@/lib/macro-packages/macroPackages";

const fixtureGeneratedAt = "2026-05-11T00:00:00.000Z";
const fixtureValidFrom = "2026-05-01T00:00:00.000Z";
const fixtureValidTo = "2026-05-04T00:00:00.000Z";
const fixturePackageId = "western-europe-demo";
const fixturePackageVersion = "2026.05.fixture";
const fixtureVariables = [
  "temperature_2m",
  "precipitation",
  "wind_speed_10m",
  "cloud_cover",
  "shortwave_radiation_proxy"
];

function contentHash(value: unknown): string {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

export function createWesternEuropeMacroPackageFixture(maxCells = 20): {
  manifest: MacroPackageManifest;
  summary: MacroPackageH3SummaryArtifact;
} {
  const records: PackagedMacroCellSummary[] = initialHexDataByTier.U5.slice(0, maxCells).map(
    (record) => {
      const summary = createMockMacroCellSummary(record);
      return {
        ...summary,
        packageId: fixturePackageId,
        packageVersion: fixturePackageVersion,
        packageMode: "fixture-package",
        qualityFlags: ["fixture", "bounded-aoi", "no-live-network"],
        inputVariables: fixtureVariables,
        modelRunAt: fixtureGeneratedAt,
        validFrom: fixtureValidFrom,
        validTo: fixtureValidTo,
        license: "Fictional fixture generated from deterministic vmesh mock data",
        limitations:
          "Fixture package for pipeline and UI validation. It is not operational climate, fire, flood, or solar intelligence.",
        provenance: {
          ...summary.provenance,
          providerId: "open-meteo-fixture-package",
          providerLabel: "Open-Meteo fixture package",
          sourceType: "fixture",
          observedAt: fixtureValidFrom,
          generatedAt: fixtureGeneratedAt,
          freshnessLabel: "fixture package 2026-05-01 to 2026-05-04",
          confidence: Math.min(82, summary.provenance.confidence),
          license: "Fictional fixture generated from deterministic vmesh mock data",
          limitations:
            "Fixture package for local macro pipeline validation. It is not a live provider result and not operational intelligence."
        }
      };
    }
  );

  const summary: MacroPackageH3SummaryArtifact = {
    schemaVersion: MACRO_PACKAGE_SCHEMA_VERSION,
    packageId: fixturePackageId,
    packageVersion: fixturePackageVersion,
    generatedAt: fixtureGeneratedAt,
    records
  };
  const confidenceValues = records.map((record) => record.provenance.confidence);
  const manifest: MacroPackageManifest = {
    schemaVersion: MACRO_PACKAGE_SCHEMA_VERSION,
    packageId: fixturePackageId,
    packageVersion: fixturePackageVersion,
    generatedAt: fixtureGeneratedAt,
    mode: "fixture-package",
    aoi: {
      label: "Western Europe demo AOI",
      bounds: [-10.8, 36.4, 18.8, 60.2],
      centroid: {
        latitude: 45.2,
        longitude: 2.8
      },
      privacy: "public-demo"
    },
    h3Resolution: 5,
    h3Tiers: ["U5"],
    timeWindow: {
      validFrom: fixtureValidFrom,
      validTo: fixtureValidTo,
      cadence: "fixture"
    },
    sourceRun: {
      id: "fixture-run-20260511",
      generatedBy: "fixture-builder",
      liveNetworkUsed: false
    },
    providers: [
      {
        providerId: "open-meteo-fixture-package",
        providerLabel: "Open-Meteo fixture package",
        sourceType: "fixture",
        status: "fixture-package",
        requestedAt: fixtureGeneratedAt,
        modelRunAt: fixtureGeneratedAt,
        variables: fixtureVariables,
        license: "Fictional fixture generated from deterministic vmesh mock data",
        limitations:
          "Fixture provider run. Replace with reviewed Open-Meteo package output before production use.",
        confidence: 78
      }
    ],
    layers: [
      "climate-trend",
      "climate-weather",
      "climate-rainfall",
      "hazard-flood-lowland",
      "hazard-fire-weather",
      "solar-potential"
    ],
    artifacts: [
      {
        kind: "h3-summary-json",
        path: "western-europe-demo.h3-summary.json",
        contentHash: contentHash(summary.records),
        recordCount: records.length,
        h3Resolution: 5,
        layerIds: [
          "climate-trend",
          "climate-weather",
          "climate-rainfall",
          "hazard-flood-lowland",
          "hazard-fire-weather",
          "solar-potential"
        ],
        generatedAt: fixtureGeneratedAt
      }
    ],
    summaryStats: {
      cellCount: records.length,
      minConfidence: Math.min(...confidenceValues),
      maxConfidence: Math.max(...confidenceValues),
      meanConfidence: Math.round(
        confidenceValues.reduce((sum, confidence) => sum + confidence, 0) / confidenceValues.length
      )
    },
    qualityGates: {
      maxCells,
      fixtureOnly: true,
      noPrivateAddresses: true,
      noBrowserGridFetches: true,
      noPaidProviderCalls: true,
      h3ResolutionAligned: true,
      provenanceComplete: true,
      providerTermsReviewed: false,
      licenseAttributionComplete: true,
      freshnessWindowBounded: true,
      confidenceDocumented: true,
      limitationsDocumented: true,
      noAuthorityClaims: true
    },
    privacy: {
      containsUserRecords: false,
      containsExactPrivateAddresses: false,
      aoiPrecision: "coarse-region"
    },
    limitations: [
      "Fixture-only package generated from deterministic mock records.",
      "Not operational weather, climate, fire, flood, solar, wind, or emergency intelligence.",
      "Use reviewed package workers and provider terms before production ingestion."
    ]
  };

  return { manifest, summary };
}

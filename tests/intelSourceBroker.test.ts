import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  getBaReadyIntelSources,
  getIntelSourcesForSegment,
  validateIntelSourceBrokerPackage,
  type IntelSourceBrokerPackage
} from "@/lib/intelSourceBroker";
import { loadIntelSourceBrokerPackage } from "@/lib/intelSourceBrokerRuntime";
import { INTEL_SOURCE_BROKER_SNAPSHOT } from "@/lib/intelSourceBrokerSnapshot";

const samplePackage: IntelSourceBrokerPackage = {
  schemaVersion: "vmesh-intel-source-broker-package-v1",
  generatedAt: "2026-06-03T00:00:00+00:00",
  runClass: "dry-run",
  importSummary: {
    runClass: "dry-run",
    sourceSystem: "intel-tools-sidecar",
    sidecarRoot: "operator-local",
    dbs: [],
    quarantineCandidateCount: 3,
    canonicalSourceCount: 3,
    statusCounts: {
      adapter_ready: 1,
      needs_license_review: 1,
      research_only: 1
    },
    segmentCounts: {
      terrain_elevation: 1,
      imagery_observation: 0,
      water_hydrology: 0,
      access_infrastructure: 0,
      land_property_planning: 0,
      soils_landcover: 1,
      climate_weather: 0,
      ecology_biodiversity_carbon: 0,
      agriculture_operations: 1,
      community_economy: 0,
      research_only: 1,
      operator_review: 0
    }
  },
  evaluationSites: [
    {
      id: "kamloops-rose",
      publicSafeLabel: "Kamloops / Rose golden evaluation site",
      coordinateStatus: "setup_gap_private_coordinate_required",
      priorityRegions: ["British Columbia", "Canada"],
      priorityTerms: ["LidarBC"],
      notes: ["Exact private coordinate is not committed."]
    }
  ],
  segments: [],
  sourcesReadyForBA: [
    {
      id: "canonical-bc-lidarbc",
      title: "British Columbia LidarBC",
      provider: "Government of British Columbia",
      country: "Canada",
      region: "British Columbia",
      jurisdiction: "British Columbia",
      segments: ["terrain_elevation"],
      status: "adapter_ready",
      endpointType: "arcgis_feature_server",
      sourceUrl: "https://www2.gov.bc.ca/gov/content/data/geographic-data-services/lidarbc",
      endpointUrl:
        "https://services6.arcgis.com/ubm4tcTYICKBpist/ArcGIS/rest/services/LiDAR_BC_S3_Public/FeatureServer",
      coverage: "British Columbia",
      resolution: "1m where indexed",
      license: "BC open data terms",
      access: "reachable",
      probeStatus: "reachable",
      confidenceScore: 78,
      priorityScore: 99,
      evaluationSiteRelevance: ["kamloops-rose"],
      adapter: "arcgis-feature-server",
      fetchRecipe: {
        adapter: "arcgis-feature-server",
        steps: ["Query service/layer metadata.", "Run bounded intersects query for the AOI."]
      },
      limitations: ["Requires AOI live proof."],
      reviewActions: ["schedule_aoi_live_proof"],
      provenance: [
        {
          runId: "sidecar-run",
          sourceDb: "additive_full_world_20260524.db",
          recordId: "record-1",
          evidenceRefCount: 1
        }
      ]
    },
    {
      id: "canonical-soil-reference",
      title: "Soil constants reference",
      provider: "Research provider",
      country: null,
      region: null,
      jurisdiction: null,
      segments: ["soils_landcover", "agriculture_operations", "research_only"],
      status: "research_only",
      endpointType: "pdf",
      sourceUrl: "https://example.test/soil.pdf",
      endpointUrl: "https://example.test/soil.pdf",
      coverage: "Reference",
      resolution: "not applicable",
      license: "unknown",
      access: "unknown",
      probeStatus: "not_probed",
      confidenceScore: 35,
      priorityScore: 20,
      evaluationSiteRelevance: [],
      adapter: "research-evidence",
      fetchRecipe: null,
      limitations: ["Evidence only."],
      reviewActions: ["extract_numeric_or_provenance_evidence"],
      provenance: []
    }
  ],
  ecosystemSourceRecords: [],
  operatorReviewQueue: [],
  remainingGapRegister: [],
  brokerResponseExamples: []
};

describe("Intel Tools source broker package", () => {
  it("validates the public-safe BA package shape", () => {
    expect(validateIntelSourceBrokerPackage(samplePackage)).toBe(true);
  });

  it("filters BA-ready source refs by golden evaluation site and segment", () => {
    const readySources = getBaReadyIntelSources(samplePackage, {
      siteId: "kamloops-rose",
      segment: "terrain_elevation"
    });

    expect(readySources).toHaveLength(1);
    expect(readySources[0]?.adapter).toBe("arcgis-feature-server");
  });

  it("keeps research-only ecosystem records out of the default BA-ready set", () => {
    expect(getBaReadyIntelSources(samplePackage).map((source) => source.id)).not.toContain(
      "canonical-soil-reference"
    );
    expect(getIntelSourcesForSegment(samplePackage, "research_only")).toHaveLength(1);
  });

  it("validates the integrated public-safe Intel snapshot", () => {
    expect(validateIntelSourceBrokerPackage(INTEL_SOURCE_BROKER_SNAPSHOT)).toBe(true);
    expect(INTEL_SOURCE_BROKER_SNAPSHOT.sourcesReadyForBA).toHaveLength(0);
    expect(INTEL_SOURCE_BROKER_SNAPSHOT.remainingGapRegister.map((gap) => gap.id)).toContain(
      "intel-snapshot-gap-community-economy"
    );
    expect(
      getIntelSourcesForSegment(INTEL_SOURCE_BROKER_SNAPSHOT, "community_economy").map(
        (source) => source.id
      )
    ).toContain("intel-snapshot-vmesh-markets-campaign");
  });

  it("keeps the integrated snapshot from treating planned campaigns as BA-ready", () => {
    expect(getBaReadyIntelSources(INTEL_SOURCE_BROKER_SNAPSHOT)).toHaveLength(0);
    expect(
      getBaReadyIntelSources(INTEL_SOURCE_BROKER_SNAPSHOT, {
        includeLicenseReview: true
      })
    ).toHaveLength(0);
  });

  it("loads a valid retained Intel sidecar artifact when present", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "vmesh-intel-broker-"));
    const packagePath = join(tempDir, "source-package.json");

    try {
      await writeFile(packagePath, JSON.stringify(samplePackage), "utf8");

      const loaded = await loadIntelSourceBrokerPackage({ packagePath });

      expect(loaded.packageSource).toBe("retained-artifact");
      expect(loaded.sourcePackage.generatedAt).toBe(samplePackage.generatedAt);
      expect(loaded.sourcePackage.sourcesReadyForBA).toHaveLength(2);
    } finally {
      await rm(tempDir, { force: true, recursive: true });
    }
  });

  it("falls back to the integrated snapshot when the sidecar artifact is missing", async () => {
    const loaded = await loadIntelSourceBrokerPackage({
      packagePath: join(tmpdir(), "vmesh-intel-broker-missing-package.json")
    });

    expect(loaded.packageSource).toBe("integrated-snapshot");
    expect(loaded.sourcePackage.generatedAt).toBe(INTEL_SOURCE_BROKER_SNAPSHOT.generatedAt);
  });

  it("falls back to the integrated snapshot when the sidecar artifact is malformed", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "vmesh-intel-broker-"));
    const packagePath = join(tempDir, "source-package.json");

    try {
      await writeFile(packagePath, JSON.stringify({ schemaVersion: "wrong" }), "utf8");

      const loaded = await loadIntelSourceBrokerPackage({ packagePath });

      expect(loaded.packageSource).toBe("integrated-snapshot");
      expect(loaded.sourcePackage.generatedAt).toBe(INTEL_SOURCE_BROKER_SNAPSHOT.generatedAt);
    } finally {
      await rm(tempDir, { force: true, recursive: true });
    }
  });
});

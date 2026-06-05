import type { IntelSourceBrokerPackage } from "@/lib/intelSourceBroker";

export const INTEL_SOURCE_BROKER_SNAPSHOT: IntelSourceBrokerPackage = {
  schemaVersion: "vmesh-intel-source-broker-package-v1",
  generatedAt: "2026-06-03T03:16:23+00:00",
  runClass: "dry-run",
  importSummary: {
    runClass: "dry-run",
    sourceSystem: "intel-tools-sidecar",
    sidecarRoot: "operator-local",
    dbs: [
      {
        sourceDb: "additive_full_world_20260524.db",
        importMode: "primary-source-registry",
        sourceRecordCount: 3344,
        probeCount: 540,
        gapCount: 17,
        researchRunCount: 2
      },
      {
        sourceDb: "additive_reruns_20260523_live_v3.db",
        importMode: "dedupe-cross-check",
        sourceRecordCount: 332,
        probeCount: 22,
        gapCount: 17,
        researchRunCount: 2
      },
      {
        sourceDb: "additive_geospatial_followup.db",
        importMode: "geospatial-followup",
        sourceRecordCount: 188,
        probeCount: 0,
        gapCount: 12,
        researchRunCount: 1
      },
      {
        sourceDb: "additive_eco_followup.db",
        importMode: "ecosystem-reference-registry",
        sourceRecordCount: 36,
        probeCount: 0,
        gapCount: 5,
        researchRunCount: 1
      },
      {
        sourceDb: "vmesh_campaign_20260525.db",
        importMode: "planned-campaign",
        sourceRecordCount: 0,
        probeCount: 0,
        gapCount: 0,
        researchRunCount: 7
      }
    ],
    quarantineCandidateCount: 3907,
    canonicalSourceCount: 3353,
    statusCounts: {
      needs_license_review: 91,
      needs_probe: 516,
      needs_review: 46,
      noisy_candidate: 2506,
      planned_campaign: 7,
      research_only: 187
    },
    segmentCounts: {
      terrain_elevation: 322,
      imagery_observation: 187,
      water_hydrology: 378,
      access_infrastructure: 254,
      land_property_planning: 327,
      soils_landcover: 582,
      climate_weather: 78,
      ecology_biodiversity_carbon: 208,
      agriculture_operations: 131,
      community_economy: 49,
      research_only: 383,
      operator_review: 1114
    }
  },
  evaluationSites: [
    {
      id: "kamloops-rose",
      publicSafeLabel: "Kamloops / Rose golden evaluation site",
      coordinateStatus: "setup_gap_private_coordinate_required",
      priorityRegions: ["British Columbia", "Canada"],
      priorityTerms: ["Kamloops", "Rose", "LidarBC", "BC Data Catalogue", "Canada HRDEM"],
      notes: [
        "Exact golden-site coordinates are not committed.",
        "Use operator-local proof variables before claiming golden-site live-proof."
      ]
    },
    {
      id: "alberta-golden",
      publicSafeLabel: "Alberta golden evaluation site",
      coordinateStatus: "setup_gap_private_coordinate_required",
      priorityRegions: ["Alberta", "Canada"],
      priorityTerms: ["Alberta", "Canada HRDEM", "open.alberta.ca"],
      notes: [
        "Exact golden-site coordinates are not committed.",
        "Use operator-local proof variables before claiming golden-site live-proof."
      ]
    }
  ],
  segments: [
    {
      id: "terrain_elevation",
      label: "Terrain, elevation, DTM, DSM, DEM, and LiDAR",
      sourceCount: 322,
      readyCount: 15,
      reviewCount: 310,
      topSourceIds: []
    },
    {
      id: "imagery_observation",
      label: "Imagery, orthophoto, aerial, and observation sources",
      sourceCount: 187,
      readyCount: 8,
      reviewCount: 187,
      topSourceIds: []
    },
    {
      id: "water_hydrology",
      label: "Water, hydrology, watersheds, streams, flood, and drainage",
      sourceCount: 378,
      readyCount: 5,
      reviewCount: 353,
      topSourceIds: []
    },
    {
      id: "access_infrastructure",
      label: "Roads, access, tracks, utilities, and infrastructure",
      sourceCount: 254,
      readyCount: 3,
      reviewCount: 244,
      topSourceIds: []
    },
    {
      id: "land_property_planning",
      label: "Land, property, parcels, planning, zoning, and constraints",
      sourceCount: 327,
      readyCount: 7,
      reviewCount: 315,
      topSourceIds: []
    },
    {
      id: "soils_landcover",
      label: "Soils, landcover, vegetation, and agricultural capability",
      sourceCount: 582,
      readyCount: 10,
      reviewCount: 524,
      topSourceIds: []
    },
    {
      id: "climate_weather",
      label: "Climate, weather, solar, wind, and fire-weather context",
      sourceCount: 78,
      readyCount: 2,
      reviewCount: 70,
      topSourceIds: []
    },
    {
      id: "ecology_biodiversity_carbon",
      label: "Ecology, biodiversity, species, habitat, and carbon",
      sourceCount: 208,
      readyCount: 3,
      reviewCount: 188,
      topSourceIds: []
    },
    {
      id: "agriculture_operations",
      label: "Agriculture, crop models, machinery, robotics, and inputs",
      sourceCount: 131,
      readyCount: 2,
      reviewCount: 108,
      topSourceIds: []
    },
    {
      id: "community_economy",
      label: "Markets, producers, suppliers, community, education, and third spaces",
      sourceCount: 49,
      readyCount: 2,
      reviewCount: 40,
      topSourceIds: []
    },
    {
      id: "research_only",
      label: "Research-only evidence, PDFs, papers, standards, and constants references",
      sourceCount: 383,
      readyCount: 3,
      reviewCount: 196,
      topSourceIds: []
    },
    {
      id: "operator_review",
      label: "Operator review queue",
      sourceCount: 1114,
      readyCount: 39,
      reviewCount: 1114,
      topSourceIds: []
    }
  ],
  sourcesReadyForBA: [],
  ecosystemSourceRecords: [],
  operatorReviewQueue: [
    {
      id: "intel-snapshot-vmesh-markets-campaign",
      title: "Planned VMesh campaign: vmesh_markets",
      provider: "VMesh / Intel Tools",
      country: null,
      region: null,
      jurisdiction: null,
      segments: ["community_economy", "land_property_planning"],
      status: "planned_campaign",
      endpointType: "unknown",
      sourceUrl: "",
      endpointUrl: "",
      coverage: "Campaign-defined geography; not extracted source data.",
      resolution: "planned",
      license: "not applicable",
      access: "operator planned",
      probeStatus: "planned",
      confidenceScore: 20,
      priorityScore: 18,
      evaluationSiteRelevance: [],
      adapter: null,
      fetchRecipe: null,
      limitations: ["Planned campaign only; not user-facing source data."],
      reviewActions: ["execute_intel_gap_closing_run", "ingest_returned_candidates"],
      provenance: [
        {
          runId: "vmesh_campaign_20260525",
          sourceDb: "vmesh_campaign_20260525.db",
          recordId: "vmesh_markets",
          evidenceRefCount: 0
        }
      ]
    },
    {
      id: "intel-snapshot-vmesh-community-campaign",
      title: "Planned VMesh campaign: vmesh_community",
      provider: "VMesh / Intel Tools",
      country: null,
      region: null,
      jurisdiction: null,
      segments: ["community_economy", "land_property_planning"],
      status: "planned_campaign",
      endpointType: "unknown",
      sourceUrl: "",
      endpointUrl: "",
      coverage: "Campaign-defined geography; not extracted source data.",
      resolution: "planned",
      license: "not applicable",
      access: "operator planned",
      probeStatus: "planned",
      confidenceScore: 20,
      priorityScore: 18,
      evaluationSiteRelevance: [],
      adapter: null,
      fetchRecipe: null,
      limitations: ["Planned campaign only; not user-facing source data."],
      reviewActions: ["execute_intel_gap_closing_run", "ingest_returned_candidates"],
      provenance: [
        {
          runId: "vmesh_campaign_20260525",
          sourceDb: "vmesh_campaign_20260525.db",
          recordId: "vmesh_community",
          evidenceRefCount: 0
        }
      ]
    },
    {
      id: "intel-snapshot-vmesh-knowledge-education-campaign",
      title: "Planned VMesh campaign: vmesh_knowledge_education",
      provider: "VMesh / Intel Tools",
      country: null,
      region: null,
      jurisdiction: null,
      segments: ["community_economy", "research_only"],
      status: "planned_campaign",
      endpointType: "unknown",
      sourceUrl: "",
      endpointUrl: "",
      coverage: "Campaign-defined geography; not extracted source data.",
      resolution: "planned",
      license: "not applicable",
      access: "operator planned",
      probeStatus: "planned",
      confidenceScore: 20,
      priorityScore: 18,
      evaluationSiteRelevance: [],
      adapter: null,
      fetchRecipe: null,
      limitations: ["Planned campaign only; likely VWiki handoff for generic education."],
      reviewActions: ["execute_intel_gap_closing_run", "ingest_returned_candidates"],
      provenance: [
        {
          runId: "vmesh_campaign_20260525",
          sourceDb: "vmesh_campaign_20260525.db",
          recordId: "vmesh_knowledge_education",
          evidenceRefCount: 0
        }
      ]
    }
  ],
  remainingGapRegister: [
    {
      id: "intel-snapshot-gap-community-economy",
      sourceDb: "processed-intel-snapshot",
      gapType: "missing_reviewed_source_refs",
      country: null,
      layer: "community_economy",
      priority: 1,
      status: "open",
      description:
        "Local food network, local producers, markets, suppliers, third spaces, and community resources have no reviewed operational BA source refs yet.",
      recommendedAction:
        "Run the vmesh_markets and vmesh_community Intel campaigns, then ingest returned candidates through review."
    },
    {
      id: "intel-snapshot-gap-golden-coordinates",
      sourceDb: "processed-intel-snapshot",
      gapType: "setup_gap",
      country: "Canada",
      layer: "golden_evaluation_sites",
      priority: 1,
      status: "open",
      description:
        "Exact Kamloops/Rose and Alberta golden-site coordinates are not committed and must be provided operator-locally for proof runs.",
      recommendedAction:
        "Set VMESH_BA_KAMLOOPS_ROSE_LAT/LNG and VMESH_BA_ALBERTA_GOLDEN_LAT/LNG locally, then run npm run ba:route-proof."
    }
  ],
  brokerResponseExamples: [
    {
      siteId: "kamloops-rose",
      consumer: "ba-gis-worker",
      requestedSegments: [
        "terrain_elevation",
        "imagery_observation",
        "water_hydrology",
        "soils_landcover",
        "climate_weather",
        "ecology_biodiversity_carbon",
        "agriculture_operations",
        "community_economy"
      ],
      sourceIds: [],
      warnings: [
        "Integrated snapshot is source intelligence and gap state, not raw GIS data.",
        "Exact golden-site coordinates remain a setup gap until supplied operator-locally.",
        "Use /api/geospatial-package/ba and /api/geospatial-package/ecosystem for reviewed BA packages."
      ]
    },
    {
      siteId: "alberta-golden",
      consumer: "ba-gis-worker",
      requestedSegments: [
        "terrain_elevation",
        "imagery_observation",
        "water_hydrology",
        "soils_landcover",
        "climate_weather",
        "ecology_biodiversity_carbon",
        "agriculture_operations",
        "community_economy"
      ],
      sourceIds: [],
      warnings: [
        "Integrated snapshot is source intelligence and gap state, not raw GIS data.",
        "Exact golden-site coordinates remain a setup gap until supplied operator-locally.",
        "Use /api/geospatial-package/ba and /api/geospatial-package/ecosystem for reviewed BA packages."
      ]
    }
  ]
};

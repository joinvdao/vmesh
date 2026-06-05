import type { IntelBrokerSegmentId, IntelBrokerSourceStatus } from "@/lib/intelSourceBroker";

export type BaGoldenEvalRegion = "europe" | "canada" | "usa" | "germany" | "lebanon";

export type BaGoldenEvalOldOutputState =
  | "old_outputs_exhausted"
  | "old_outputs_imported_pending_site_review";

export type BaGoldenEvalSourceSweepState = "focused_source_sweep_completed";

export interface BaGoldenEvalOldRunEvidence {
  runId: string;
  runType: string;
  runClass: "live-proof evidence retained, operator-local package";
  retainedRef: string;
  mapboxRunClass: "live-proof" | "not-used";
  mapboxTiles: number | null;
  sentinelRunClass: "live-proof" | "not-used";
  sentinelTiles: number | null;
  sentinelCloudMean: number | null;
  terrainRunClass: "live-proof" | "not-used";
  terrainRoles: string[];
  terrainResolution: string | null;
  up42PackNumber: string | null;
}

export interface BaGoldenEvalIntelMatchSummary {
  query: string;
  matchCount: number;
  usableNow: boolean;
  notes: string[];
  examples?: Array<{
    id: string;
    title: string;
    provider: string;
    sourceUrl?: string;
    endpointType?: string;
    status: IntelBrokerSourceStatus;
    segments: IntelBrokerSegmentId[];
  }>;
}

export interface BaGoldenEvalSiteSummary {
  id: string;
  publicSafeLabel: string;
  region: BaGoldenEvalRegion;
  country: string;
  priority: number;
  coordinateDisclosure: "withheld-public-safe-site-id";
  oldOutputState: BaGoldenEvalOldOutputState;
  reviewedThroughSitePackage: boolean;
  sourceSweepState: BaGoldenEvalSourceSweepState;
  oldRunEvidence: BaGoldenEvalOldRunEvidence[];
  intelOldOutputMatches: BaGoldenEvalIntelMatchSummary[];
}

export interface BaGoldenEvalCleanedSourceRecord {
  id: string;
  label: string;
  sourceClass: "ba-retained-live-proof" | "vmesh-reviewed-source-ref" | "intel-candidate-review";
  segments: IntelBrokerSegmentId[];
  runClass: "live-proof" | "dry-run";
  status:
    | "ready_for_ba_pipe"
    | "ready_source_ref"
    | "needs_probe"
    | "needs_license_review"
    | "research_only"
    | "not_operational";
  displayMode: "api_downstream_mode" | "advanced_user_view" | "operator_review_mode";
  retainedRefs: string[];
  limitations: string[];
}

export interface BaGoldenEvalSitePackage {
  schemaVersion: "vmesh-ba-golden-eval-site-package-v1";
  generatedAt: string;
  runClass: "dry-run";
  site: BaGoldenEvalSiteSummary;
  cleanedSourceRecords: BaGoldenEvalCleanedSourceRecord[];
  baPipe: {
    consumer: "ba-gis-worker";
    endpointMode: "site-id-public-safe";
    sourceRecordCount: number;
    candidateReviewCount: number;
    rawProviderPayloadsStoredByVmesh: false;
    exactCoordinatesStoredByVmesh: false;
  };
  gaps: string[];
  nextSiteIds: string[];
}

export interface BaGoldenEvalCatalogPackage {
  schemaVersion: "vmesh-ba-golden-eval-catalog-v1";
  generatedAt: string;
  runClass: "dry-run";
  sourceSystems: Array<{
    id: string;
    runClass: "dry-run" | "live-proof evidence retained, operator-local package";
    boundary: string;
  }>;
  activeSiteId: string;
  sites: BaGoldenEvalSiteSummary[];
}

const GENERATED_AT = "2026-06-03T00:00:00.000Z";

const SCOTLAND_INTEL_MATCHES: BaGoldenEvalIntelMatchSummary[] = [
  {
    query: "Scotland",
    matchCount: 32,
    usableNow: false,
    notes: [
      "Old Intel output found regional Scotland candidates, but none are site-specific to Burmieston.",
      "These remain candidate review items until license and AOI probes are complete."
    ],
    examples: [
      {
        id: "canonical-ae699d4fc4aae04d",
        title: "Scotland Habitat and Land Cover Map - 2020",
        provider: "spatialdata.gov.scot",
        status: "needs_probe",
        segments: ["ecology_biodiversity_carbon", "soils_landcover"]
      },
      {
        id: "canonical-6cd9fbabdb22134d",
        title: "Soil Maps of Scotland (partial cover) - SpatialData.gov.scot",
        provider: "spatialdata.gov.scot",
        status: "needs_probe",
        segments: ["soils_landcover"]
      },
      {
        id: "canonical-a7f70797a37ea889",
        title: "Access API - Registers of Scotland",
        provider: "ros.gov.uk",
        status: "needs_license_review",
        segments: ["access_infrastructure"]
      }
    ]
  },
  {
    query: "Burmieston",
    matchCount: 0,
    usableNow: false,
    notes: ["Old Intel output has no Burmieston-specific source records."]
  },
  {
    query: "BA intel-source-discovery Scotland seeds",
    matchCount: 2,
    usableNow: false,
    notes: [
      "BA artifacts/intel-source-discovery found official Scotland geospatial seed sources.",
      "These are high-priority probe candidates for the Burmieston sweep, not operational BA sources yet."
    ],
    examples: [
      {
        id: "ba-intel-scottish-remote-sensing-portal",
        title: "Scottish Remote Sensing Portal",
        provider: "Scottish Government / Scottish Remote Sensing Portal",
        sourceUrl: "https://remotesensingdata.gov.scot/",
        endpointType: "html_catalog_with_web_services",
        status: "needs_probe",
        segments: ["terrain_elevation", "imagery_observation"]
      },
      {
        id: "ba-intel-scottish-spatial-data-infrastructure",
        title: "Scottish Spatial Data Infrastructure catalogue",
        provider: "Scottish Government",
        sourceUrl: "https://spatialdata.gov.scot/geonetwork/srv/api",
        endpointType: "geonetwork_api",
        status: "needs_probe",
        segments: [
          "terrain_elevation",
          "soils_landcover",
          "water_hydrology",
          "ecology_biodiversity_carbon"
        ]
      }
    ]
  },
  {
    query: "Burmieston live source sweep 2026-06-03",
    matchCount: 8,
    usableNow: false,
    notes: [
      "Focused web search found official Scotland source families for terrain, habitat, soils, forestry, flood, and environmental context.",
      "These close the discovery gap for Burmieston but still require AOI probes before operational BA promotion."
    ],
    examples: [
      {
        id: "burmieston-sweep-scottish-remote-sensing-portal",
        title: "Scottish Remote Sensing Portal LiDAR datasets",
        provider: "Scottish Government / JNCC",
        sourceUrl: "https://remotesensingdata.gov.scot/",
        endpointType: "html_catalog_with_web_services",
        status: "needs_probe",
        segments: ["terrain_elevation", "imagery_observation"]
      },
      {
        id: "burmieston-sweep-ssdi-geonetwork-api",
        title: "Scottish Spatial Data Infrastructure GeoNetwork REST API",
        provider: "Scottish Government",
        sourceUrl: "https://spatialdata.gov.scot/geonetwork/srv/api",
        endpointType: "geonetwork_api",
        status: "needs_probe",
        segments: ["terrain_elevation", "water_hydrology", "soils_landcover"]
      },
      {
        id: "burmieston-sweep-habitat-map-scotland",
        title: "Habitat Map of Scotland",
        provider: "Scotland's environment web / NatureScot partners",
        sourceUrl:
          "https://www.environment.gov.scot/our-environment/habitats-and-species/habitat-map-of-scotland/",
        endpointType: "html_catalog",
        status: "needs_probe",
        segments: ["ecology_biodiversity_carbon", "soils_landcover"]
      },
      {
        id: "burmieston-sweep-james-hutton-soils",
        title: "James Hutton Institute soil data and maps",
        provider: "James Hutton Institute",
        sourceUrl: "https://www.hutton.ac.uk/soil-data-and-maps/",
        endpointType: "download_catalog",
        status: "needs_license_review",
        segments: ["soils_landcover", "agriculture_operations"]
      },
      {
        id: "burmieston-sweep-naturescot-data-services",
        title: "NatureScot data services and open spatial data",
        provider: "NatureScot",
        sourceUrl: "https://www.nature.scot/information-hub/naturescot-data-services",
        endpointType: "download_catalog",
        status: "needs_license_review",
        segments: ["ecology_biodiversity_carbon", "land_property_planning"]
      },
      {
        id: "burmieston-sweep-scottish-forestry-open-data",
        title: "Scottish Forestry Open Data",
        provider: "Scottish Forestry",
        sourceUrl: "https://open-data-scottishforestry.hub.arcgis.com/",
        endpointType: "arcgis_hub",
        status: "needs_probe",
        segments: ["ecology_biodiversity_carbon", "access_infrastructure"]
      },
      {
        id: "burmieston-sweep-sepa-flood-data",
        title: "SEPA flood maps and flood data downloads",
        provider: "Scottish Environment Protection Agency",
        sourceUrl: "https://www2.sepa.org.uk/flooddata/",
        endpointType: "download_catalog",
        status: "needs_probe",
        segments: ["water_hydrology"]
      },
      {
        id: "burmieston-sweep-scotland-environment-maps",
        title: "Scotland's environment maps",
        provider: "Scotland's environment web",
        sourceUrl: "https://www.environment.gov.scot/maps/",
        endpointType: "map_catalog",
        status: "needs_probe",
        segments: [
          "water_hydrology",
          "ecology_biodiversity_carbon",
          "soils_landcover",
          "land_property_planning"
        ]
      }
    ]
  }
];

const COMRIE_CROFT_INTEL_MATCHES: BaGoldenEvalIntelMatchSummary[] = [
  ...SCOTLAND_INTEL_MATCHES,
  {
    query: "Comrie Croft live source sweep 2026-06-03",
    matchCount: 7,
    usableNow: false,
    notes: [
      "Focused web search found official Scotland and Perthshire source families for terrain, local open data, habitat, soils, forestry, flood, and Comrie ecosystem context.",
      "These close the discovery gap for Comrie Croft but still require AOI probes before operational BA promotion."
    ],
    examples: [
      {
        id: "comrie-croft-sweep-scottish-remote-sensing-portal",
        title: "Scottish Remote Sensing Portal LiDAR datasets",
        provider: "Scottish Government / Scottish Remote Sensing Portal",
        sourceUrl: "https://remotesensingdata.gov.scot/",
        endpointType: "html_catalog_with_web_services",
        status: "needs_probe",
        segments: ["terrain_elevation", "imagery_observation"]
      },
      {
        id: "comrie-croft-sweep-lidar-scotland-phase-2-dtm",
        title: "LiDAR for Scotland Phase 2 DTM",
        provider: "Scottish Government SpatialData.gov.scot",
        sourceUrl: "https://ckan.publishing.service.gov.uk/dataset/lidar-for-scotland-phase-2-dtm",
        endpointType: "ckan_dataset_download_service",
        status: "needs_license_review",
        segments: ["terrain_elevation", "water_hydrology"]
      },
      {
        id: "comrie-croft-sweep-perth-kinross-open-data",
        title: "Open Perth and Kinross data portal",
        provider: "Perth & Kinross Council",
        sourceUrl: "https://www.pkc.gov.uk/opendata",
        endpointType: "local_open_data_portal",
        status: "needs_probe",
        segments: ["access_infrastructure", "land_property_planning", "community_economy"]
      },
      {
        id: "comrie-croft-sweep-habitat-map-scotland",
        title: "Habitat Map of Scotland",
        provider: "Scotland's environment web / NatureScot partners",
        sourceUrl:
          "https://www.environment.gov.scot/our-environment/habitats-and-species/habitat-map-of-scotland/",
        endpointType: "html_catalog",
        status: "needs_probe",
        segments: ["ecology_biodiversity_carbon", "soils_landcover"]
      },
      {
        id: "comrie-croft-sweep-comrie-flood-protection",
        title: "Comrie Flood Protection Scheme and Perthshire flood risk records",
        provider: "Perth & Kinross Council / SEPA",
        sourceUrl: "https://www.pkc.gov.uk/frmplans",
        endpointType: "local_authority_flood_documents",
        status: "needs_probe",
        segments: ["water_hydrology", "land_property_planning"]
      },
      {
        id: "comrie-croft-sweep-comrie-northwoods-context",
        title: "Comrie Croft Northwoods land partner profile",
        provider: "SCOTLAND: The Big Picture",
        sourceUrl: "https://www.scotlandbigpicture.com/nrn-partners/comrie-croft",
        endpointType: "ecosystem_context_page",
        status: "research_only",
        segments: ["ecology_biodiversity_carbon", "agriculture_operations", "community_economy"]
      },
      {
        id: "comrie-croft-sweep-local-energy-context",
        title: "Comrie Croft solar PV and battery storage project profile",
        provider: "Local Energy Scotland",
        sourceUrl: "https://localenergy.scot/?p=633",
        endpointType: "ecosystem_context_page",
        status: "research_only",
        segments: ["community_economy"]
      }
    ]
  }
];

const TANGLEHA_INTEL_MATCHES: BaGoldenEvalIntelMatchSummary[] = [
  ...SCOTLAND_INTEL_MATCHES,
  {
    query: "St Cyrus Tangleha live source sweep 2026-06-03",
    matchCount: 7,
    usableNow: false,
    notes: [
      "Focused web search found official and local coastal source families for St Cyrus / Tangleha: NatureScot reserve context, protected-area layers, SEPA coastal flood data, Aberdeenshire open data, coastal change adaptation material, and permaculture context.",
      "These close the discovery gap for the coastal Scotland site but still require AOI probes before operational BA promotion."
    ],
    examples: [
      {
        id: "tangleha-sweep-st-cyrus-naturescot-reserve",
        title: "St Cyrus National Nature Reserve",
        provider: "NatureScot",
        sourceUrl: "https://www.nature.scot/st-cyrus/",
        endpointType: "ecosystem_context_page",
        status: "research_only",
        segments: ["ecology_biodiversity_carbon", "community_economy"]
      },
      {
        id: "tangleha-sweep-st-cyrus-nnr-about-reserve",
        title: "St Cyrus NNR habitat and management context",
        provider: "NatureScot",
        sourceUrl:
          "https://www.nature.scot/enjoying-outdoors/scotlands-national-nature-reserves/st-cyrus-nnr/st-cyrus-nnr-about-reserve",
        endpointType: "ecosystem_context_page",
        status: "research_only",
        segments: ["ecology_biodiversity_carbon", "water_hydrology"]
      },
      {
        id: "tangleha-sweep-naturescot-nnr-agol-layer",
        title: "National Nature Reserves spatial layer",
        provider: "NatureScot ArcGIS Online",
        sourceUrl: "https://www.arcgis.com/home/item.html?id=41f4c9c7ee114acc94950a6eec3774a7",
        endpointType: "arcgis_online_item",
        status: "needs_license_review",
        segments: ["ecology_biodiversity_carbon", "land_property_planning"]
      },
      {
        id: "tangleha-sweep-sepa-coastal-flood-data",
        title: "SEPA coastal flood data downloads",
        provider: "Scottish Environment Protection Agency",
        sourceUrl: "https://www2.sepa.org.uk/flooddata/",
        endpointType: "download_catalog",
        status: "needs_probe",
        segments: ["water_hydrology"]
      },
      {
        id: "tangleha-sweep-aberdeenshire-open-data",
        title: "Aberdeenshire Council open data",
        provider: "Aberdeenshire Council",
        sourceUrl: "https://www.aberdeenshire.gov.uk/data/open-data/",
        endpointType: "local_open_data_portal",
        status: "needs_probe",
        segments: ["access_infrastructure", "land_property_planning", "community_economy"]
      },
      {
        id: "tangleha-sweep-aberdeenshire-coastal-change",
        title: "Aberdeenshire coastal change adaptation programme",
        provider: "Aberdeenshire Council",
        sourceUrl:
          "https://www.aberdeenshire.gov.uk/news/2025/jun/regional-coastal-change-adaptation-plan-will-tackle-impact-of-climate-change",
        endpointType: "coastal_adaptation_context",
        status: "research_only",
        segments: ["water_hydrology", "ecology_biodiversity_carbon", "community_economy"]
      },
      {
        id: "tangleha-sweep-permaculture-association-context",
        title: "Tangleha Artist's Collective permaculture profile",
        provider: "Permaculture Association",
        sourceUrl: "https://www.permaculture.org.uk/tangleha-artists-collective",
        endpointType: "ecosystem_context_page",
        status: "research_only",
        segments: ["agriculture_operations", "ecology_biodiversity_carbon", "community_economy"]
      }
    ]
  }
];

const EDINBURGH_MCDONALD_INTEL_MATCHES: BaGoldenEvalIntelMatchSummary[] = [
  ...SCOTLAND_INTEL_MATCHES,
  {
    query: "Edinburgh McDonald Place live source sweep 2026-06-03",
    matchCount: 7,
    usableNow: false,
    notes: [
      "Focused web search found Edinburgh-specific source families for adopted roads, city open data, greenspace, flood/environment context, and Scotland-wide LiDAR/habitat sources.",
      "These close the urban Edinburgh discovery gap but still require AOI probes before operational BA promotion."
    ],
    examples: [
      {
        id: "edinburgh-mcdonald-sweep-adopted-road-record",
        title: "McDonald Place adopted-road maintenance record",
        provider: "City of Edinburgh Council",
        sourceUrl: "https://www.edinburgh.gov.uk/directory-record/1810438/mcdonald-place",
        endpointType: "local_authority_road_record",
        status: "needs_license_review",
        segments: ["access_infrastructure", "land_property_planning"]
      },
      {
        id: "edinburgh-mcdonald-sweep-city-open-data",
        title: "City of Edinburgh open data",
        provider: "City of Edinburgh Council",
        sourceUrl: "https://edinburghopendata.info/",
        endpointType: "local_open_data_portal",
        status: "needs_probe",
        segments: ["access_infrastructure", "land_property_planning", "community_economy"]
      },
      {
        id: "edinburgh-mcdonald-sweep-greenspace-scotland",
        title: "Greenspace Scotland open greenspace map",
        provider: "Greenspace Scotland",
        sourceUrl: "https://www.greenspacescotland.org.uk/greenspace-map",
        endpointType: "greenspace_dataset_context",
        status: "needs_license_review",
        segments: ["ecology_biodiversity_carbon", "community_economy", "soils_landcover"]
      },
      {
        id: "edinburgh-mcdonald-sweep-sepa-flood-data",
        title: "SEPA flood maps and flood data downloads",
        provider: "Scottish Environment Protection Agency",
        sourceUrl: "https://www2.sepa.org.uk/flooddata/",
        endpointType: "download_catalog",
        status: "needs_probe",
        segments: ["water_hydrology"]
      },
      {
        id: "edinburgh-mcdonald-sweep-scotland-environment-maps",
        title: "Scotland's environment maps",
        provider: "Scotland's environment web",
        sourceUrl: "https://www.environment.gov.scot/maps/",
        endpointType: "map_catalog",
        status: "needs_probe",
        segments: ["water_hydrology", "ecology_biodiversity_carbon", "soils_landcover"]
      },
      {
        id: "edinburgh-mcdonald-sweep-scottish-remote-sensing-portal",
        title: "Scottish Remote Sensing Portal LiDAR datasets",
        provider: "Scottish Government / Scottish Remote Sensing Portal",
        sourceUrl: "https://remotesensingdata.gov.scot/",
        endpointType: "html_catalog_with_web_services",
        status: "needs_probe",
        segments: ["terrain_elevation", "imagery_observation"]
      },
      {
        id: "edinburgh-mcdonald-sweep-city-mobility-environment-context",
        title: "Edinburgh City Mobility Plan environmental report",
        provider: "City of Edinburgh Council",
        sourceUrl:
          "https://consultationhub.edinburgh.gov.uk/sfc/city-mobility-plan/supporting_documents/Final%20Draft%20Edinburgh%20City%20Mobility%20Plan%20SEA%20Environmental%20Report%20and%20Appendicies.pdf",
        endpointType: "environmental_context_pdf",
        status: "research_only",
        segments: ["access_infrastructure", "ecology_biodiversity_carbon", "community_economy"]
      }
    ]
  }
];

const PERTH_PH1_INTEL_MATCHES: BaGoldenEvalIntelMatchSummary[] = [
  ...SCOTLAND_INTEL_MATCHES,
  {
    query: "Perth PH1 road-building alignment live source sweep 2026-06-03",
    matchCount: 8,
    usableNow: false,
    notes: [
      "Focused web search found Perth & Kinross source families for open data, core paths, transport/planning, surface-water/flood context, Scotland LiDAR, and local climate-risk GIS context.",
      "These close the Perth PH1 road-building discovery gap but still require AOI probes before operational BA promotion."
    ],
    examples: [
      {
        id: "perth-ph1-sweep-pkc-open-data",
        title: "Open Perth and Kinross data portal",
        provider: "Perth & Kinross Council",
        sourceUrl: "https://www.pkc.gov.uk/opendata",
        endpointType: "local_open_data_portal",
        status: "needs_probe",
        segments: ["access_infrastructure", "land_property_planning", "community_economy"]
      },
      {
        id: "perth-ph1-sweep-pkc-arcgis-hub-feed",
        title: "Perth & Kinross ArcGIS Hub DCAT feed",
        provider: "Perth & Kinross Council",
        sourceUrl: "https://open-data-perth-kinross.hub.arcgis.com/api/feed/dcat-ap/2.0.1.json",
        endpointType: "arcgis_hub_dcat_feed",
        status: "needs_probe",
        segments: ["access_infrastructure", "land_property_planning", "water_hydrology"]
      },
      {
        id: "perth-ph1-sweep-core-paths-adopted",
        title: "Perth & Kinross adopted core paths dataset",
        provider: "Perth & Kinross Council",
        sourceUrl:
          "https://opendata.scot/datasets/perth%2B%2526%2Bkinross%2Bcouncil-core%2Bpaths%2Badopted/",
        endpointType: "arcgis_hub_dataset_with_vector_exports",
        status: "needs_license_review",
        segments: ["access_infrastructure", "land_property_planning"]
      },
      {
        id: "perth-ph1-sweep-lidar-scotland-phase-2-dtm",
        title: "LiDAR for Scotland Phase 2 DTM",
        provider: "Scottish Government SpatialData.gov.scot",
        sourceUrl: "https://ckan.publishing.service.gov.uk/dataset/lidar-for-scotland-phase-2-dtm",
        endpointType: "ckan_dataset_download_service",
        status: "needs_license_review",
        segments: ["terrain_elevation", "water_hydrology"]
      },
      {
        id: "perth-ph1-sweep-sepa-flood-data",
        title: "SEPA flood maps and flood data downloads",
        provider: "Scottish Environment Protection Agency",
        sourceUrl: "https://www2.sepa.org.uk/flooddata/",
        endpointType: "download_catalog",
        status: "needs_probe",
        segments: ["water_hydrology"]
      },
      {
        id: "perth-ph1-sweep-scone-surface-water-context",
        title: "Scone surface water management plan context",
        provider: "Perth & Kinross Council",
        sourceUrl: "https://consult.pkc.gov.uk/communities/sconeswmp/",
        endpointType: "surface_water_context_page",
        status: "research_only",
        segments: ["water_hydrology", "community_economy"]
      },
      {
        id: "perth-ph1-sweep-pkc-climate-risk-gis-context",
        title: "Perth & Kinross climate change risk GIS context",
        provider: "Perth & Kinross Council",
        sourceUrl: "https://www.pkclimateaction.co.uk/files/PKC_CCROA_2024_V2-1.pdf",
        endpointType: "climate_risk_context_pdf",
        status: "research_only",
        segments: ["water_hydrology", "access_infrastructure", "climate_weather"]
      },
      {
        id: "perth-ph1-sweep-pkc-wind-turbines-open-data",
        title: "Perth & Kinross wind turbines planning dataset",
        provider: "Perth & Kinross Council",
        sourceUrl: "https://find.data.gov.scot/datasets/45189",
        endpointType: "open_data_scotland_dataset",
        status: "needs_probe",
        segments: ["land_property_planning", "community_economy"]
      }
    ]
  }
];

const CANADA_INTEL_MATCHES: BaGoldenEvalIntelMatchSummary[] = [
  {
    query: "Canada",
    matchCount: 101,
    usableNow: false,
    notes: ["Old Intel output has broad Canada source candidates but needs per-site promotion."],
    examples: [
      {
        id: "canonical-c2d837b875a92b53",
        title: "Canadian DEM data source notes",
        provider: "Open Canada",
        status: "needs_license_review",
        segments: ["terrain_elevation"]
      },
      {
        id: "canonical-c8957b1385ba8f3a",
        title: "NRCan ArcGIS REST services",
        provider: "Natural Resources Canada",
        status: "needs_license_review",
        segments: ["operator_review"]
      }
    ]
  }
];

const PEMBERTON_INTEL_MATCHES: BaGoldenEvalIntelMatchSummary[] = [
  ...CANADA_INTEL_MATCHES,
  {
    query: "Pemberton BC live source sweep 2026-06-03",
    matchCount: 7,
    usableNow: false,
    notes: [
      "Focused web search found official BC and regional source families for Pemberton terrain, lidar-derived DEM/DSM, regional mapping, ecosystem data, settlement planning, and agricultural land context.",
      "These close the discovery gap for Pemberton but still require AOI probes before operational BA promotion."
    ],
    examples: [
      {
        id: "pemberton-sweep-lidarbc-program",
        title: "LidarBC provincial LiDAR program",
        provider: "Province of British Columbia / GeoBC",
        sourceUrl:
          "https://www2.gov.bc.ca/gov/content/data/geographic-data-services/topographic-data/lidarbc",
        endpointType: "official_program_page",
        status: "needs_probe",
        segments: ["terrain_elevation", "imagery_observation"]
      },
      {
        id: "pemberton-sweep-lidarbc-open-data-index",
        title: "LidarBC Open LiDAR Data Index",
        provider: "Province of British Columbia / ArcGIS Online",
        sourceUrl: "https://www.arcgis.com/home/item.html?id=5f6a1f31212a4cb2826743d2e52ef02a",
        endpointType: "arcgis_online_item",
        status: "needs_probe",
        segments: ["terrain_elevation"]
      },
      {
        id: "pemberton-sweep-bc-topographic-data",
        title: "British Columbia topographic data",
        provider: "Province of British Columbia",
        sourceUrl:
          "https://www2.gov.bc.ca/gov/content/data/geographic-data-services/topographic-data",
        endpointType: "official_catalog_page",
        status: "needs_probe",
        segments: ["terrain_elevation", "access_infrastructure", "water_hydrology"]
      },
      {
        id: "pemberton-sweep-slrd-web-map",
        title: "Squamish-Lillooet Regional District web map",
        provider: "Squamish-Lillooet Regional District",
        sourceUrl: "https://www.slrd.bc.ca/planning-building/mapping",
        endpointType: "local_gis_web_map",
        status: "needs_license_review",
        segments: ["land_property_planning", "access_infrastructure", "community_economy"]
      },
      {
        id: "pemberton-sweep-bc-ecosystem-data-search",
        title: "BC terrestrial ecosystem data search",
        provider: "Province of British Columbia",
        sourceUrl:
          "https://www2.gov.bc.ca/gov/content/environment/plants-animals-ecosystems/ecosystems/search-ecosystem-info",
        endpointType: "official_ecosystem_catalog_page",
        status: "needs_probe",
        segments: ["ecology_biodiversity_carbon", "soils_landcover"]
      },
      {
        id: "pemberton-sweep-slrd-settlement-area-mapping",
        title: "SLRD settlement area mapping",
        provider: "Squamish-Lillooet Regional District",
        sourceUrl: "https://www.slrd.bc.ca/node/3198",
        endpointType: "planning_context_page",
        status: "research_only",
        segments: ["land_property_planning", "community_economy"]
      },
      {
        id: "pemberton-sweep-bc-agricultural-land-reserve",
        title: "Agricultural Land Reserve South Coast administrative region map",
        provider: "Agricultural Land Commission",
        sourceUrl:
          "https://www.alc.gov.bc.ca/assets/alc/assets/about-the-alc/alr-and-maps/maps-and-gis/south_coast_administrative_region.pdf",
        endpointType: "pdf_map_context",
        status: "research_only",
        segments: ["agriculture_operations", "land_property_planning"]
      }
    ]
  }
];

const KAMLOOPS_INTEL_MATCHES: BaGoldenEvalIntelMatchSummary[] = [
  ...CANADA_INTEL_MATCHES,
  {
    query: "Kamloops",
    matchCount: 111,
    usableNow: false,
    notes: [
      "Old Intel output has Kamloops/BC regional source candidates.",
      "BA-local Airbus DSM and retained imagery evidence are stronger for the current golden eval package."
    ],
    examples: [
      {
        id: "canonical-f32d1e575f249e3b",
        title: "LidarBC - Open LiDAR Data Portal - Web Map",
        provider: "arcgis.com",
        status: "needs_probe",
        segments: ["terrain_elevation"]
      },
      {
        id: "canonical-17854db55c6fa9cf",
        title: "British Columbia Soil Information Finder Tool",
        provider: "arcgis.com",
        status: "needs_license_review",
        segments: ["soils_landcover"]
      }
    ]
  },
  {
    query: "Kamloops Rose Hill live source sweep 2026-06-03",
    matchCount: 8,
    usableNow: false,
    notes: [
      "Focused web search found official BC and regional source families for Kamloops/Rose terrain, lidar-derived DEM/DSM, dryland ecosystems, soils, flood hazards, wildfire/geohazard context, and city/regional open data.",
      "These close priority discovery gaps for the Kamloops/Rose golden eval, but exact Rose coverage remains an operator-local coordinate setup gap."
    ],
    examples: [
      {
        id: "kamloops-rose-sweep-lidarbc-dsm-index",
        title: "LidarBC Open LiDAR DSM/DEM Data Index",
        provider: "Province of British Columbia / ArcGIS Online",
        sourceUrl:
          "https://www.arcgis.com/home/item.html?id=5f6a1f31212a4cb2826743d2e52ef02a&sublayer=1",
        endpointType: "arcgis_online_item",
        status: "needs_probe",
        segments: ["terrain_elevation"]
      },
      {
        id: "kamloops-rose-sweep-bc-data-catalogue",
        title: "BC Data Catalogue",
        provider: "Province of British Columbia",
        sourceUrl:
          "https://www2.gov.bc.ca/gov/content/data/finding-and-sharing/bc-data-catalogue/find",
        endpointType: "official_data_catalog",
        status: "needs_probe",
        segments: [
          "terrain_elevation",
          "soils_landcover",
          "water_hydrology",
          "ecology_biodiversity_carbon",
          "agriculture_operations"
        ]
      },
      {
        id: "kamloops-rose-sweep-bc-ecosystem-data-search",
        title: "BC terrestrial ecosystem data search",
        provider: "Province of British Columbia",
        sourceUrl:
          "https://www2.gov.bc.ca/gov/content/environment/plants-animals-ecosystems/ecosystems/search-ecosystem-info",
        endpointType: "official_ecosystem_catalog_page",
        status: "needs_probe",
        segments: ["ecology_biodiversity_carbon", "soils_landcover"]
      },
      {
        id: "kamloops-rose-sweep-thompson-flood-projects",
        title: "Thompson flood hazard results and GIS mapping layers",
        provider: "Fraser Basin Council / Thompson-Nicola partners",
        sourceUrl:
          "https://www.fraserbasin.bc.ca/regional-work/thompson-region/thompson-flood-projects/",
        endpointType: "flood_hazard_context_and_gis_layers",
        status: "needs_license_review",
        segments: ["water_hydrology", "land_property_planning"]
      },
      {
        id: "kamloops-rose-sweep-city-open-data-catalog",
        title: "City of Kamloops open data catalog",
        provider: "City of Kamloops",
        sourceUrl: "https://dateno.io/registry/catalog/cdi00002549/",
        endpointType: "local_open_data_catalog_index",
        status: "needs_probe",
        segments: [
          "access_infrastructure",
          "land_property_planning",
          "water_hydrology",
          "community_economy"
        ]
      },
      {
        id: "kamloops-rose-sweep-tnrd-property-geohazard-context",
        title: "Thompson-Nicola Regional District property and geohazard report context",
        provider: "Thompson-Nicola Regional District",
        sourceUrl: "https://portal.tnrd.ca/property_report/index.html",
        endpointType: "local_authority_property_context",
        status: "needs_license_review",
        segments: ["land_property_planning", "water_hydrology"]
      },
      {
        id: "kamloops-rose-sweep-bcdata-soil-wildfire-watershed-index",
        title: "BC Data Catalogue soil, wildfire, and watershed dataset index",
        provider: "BCGov bcdata documentation",
        sourceUrl: "https://bcgov.github.io/bcdata/reference/bcdc_list.html",
        endpointType: "catalog_api_reference",
        status: "research_only",
        segments: ["soils_landcover", "water_hydrology", "ecology_biodiversity_carbon"]
      },
      {
        id: "kamloops-rose-sweep-lac-du-bois-grasslands-context",
        title: "Lac du Bois grasslands dryland ecosystem context",
        provider: "Public protected-area context",
        sourceUrl: "https://en.wikipedia.org/wiki/Lac_du_Bois_Grasslands_Protected_Area",
        endpointType: "ecosystem_context_page",
        status: "research_only",
        segments: ["ecology_biodiversity_carbon", "agriculture_operations"]
      }
    ]
  }
];

const ALBERTA_INTEL_MATCHES: BaGoldenEvalIntelMatchSummary[] = [
  ...CANADA_INTEL_MATCHES,
  {
    query: "Alberta",
    matchCount: 112,
    usableNow: false,
    notes: [
      "Old Intel output has Alberta regional candidates.",
      "Existing BA UP42 terrain outputs are live-proof operator-local packages and should be exposed as retained refs."
    ],
    examples: [
      {
        id: "canonical-7f06513e72d4248a",
        title: "Alberta Geological Survey",
        provider: "geology-ags-aer.opendata.arcgis.com",
        status: "needs_license_review",
        segments: ["operator_review"]
      },
      {
        id: "canonical-5ba1d1f68cb03a85",
        title: "Town of Canmore Open Data Portal",
        provider: "Alberta Government",
        status: "needs_license_review",
        segments: ["operator_review"]
      }
    ]
  },
  {
    query: "Alberta golden live source sweep 2026-06-03",
    matchCount: 8,
    usableNow: false,
    notes: [
      "Focused web search found official Alberta source families for soils, agricultural resource atlas layers, wildfire GIS, biodiversity/ACIMS, hydrological habitats, lidar/open DEM products, and geological context.",
      "These complement retained BA UP42 terrain evidence, but exact Alberta AOI live proof remains an operator-local coordinate setup gap."
    ],
    examples: [
      {
        id: "alberta-golden-sweep-wildfire-gis",
        title: "Alberta wildfire maps and GIS data",
        provider: "Government of Alberta",
        sourceUrl: "https://www.alberta.ca/wildfire-maps-and-data",
        endpointType: "official_download_and_agsp_catalog",
        status: "needs_probe",
        segments: ["ecology_biodiversity_carbon", "land_property_planning"]
      },
      {
        id: "alberta-golden-sweep-soil-information",
        title: "Alberta soil information and AGRASID data",
        provider: "Government of Alberta",
        sourceUrl: "https://www.alberta.ca/about-soil-in-alberta",
        endpointType: "official_soil_catalog",
        status: "needs_probe",
        segments: ["soils_landcover", "agriculture_operations"]
      },
      {
        id: "alberta-golden-sweep-soil-information-viewer",
        title: "Alberta Soil Information Viewer",
        provider: "Government of Alberta",
        sourceUrl: "https://soil.agric.gov.ab.ca/",
        endpointType: "map_viewer",
        status: "needs_license_review",
        segments: ["soils_landcover", "agriculture_operations"]
      },
      {
        id: "alberta-golden-sweep-agricultural-land-resource-atlas",
        title: "Agricultural Land Resource Atlas of Alberta spatial data",
        provider: "Government of Alberta",
        sourceUrl: "https://www.alberta.ca/agricultural-land-resource-atlas-of-alberta",
        endpointType: "official_spatial_data_catalog",
        status: "needs_probe",
        segments: ["agriculture_operations", "soils_landcover", "water_hydrology"]
      },
      {
        id: "alberta-golden-sweep-altalis-spatial-products",
        title: "Altalis spatial data and imagery products",
        provider: "Altalis",
        sourceUrl: "https://www.altalisdata.com/all-products",
        endpointType: "commercial_open_data_catalog",
        status: "needs_license_review",
        segments: ["terrain_elevation", "access_infrastructure", "land_property_planning"]
      },
      {
        id: "alberta-golden-sweep-abmi-airborne-lidar",
        title: "ABMI airborne LiDAR data and products",
        provider: "Alberta Biodiversity Monitoring Institute",
        sourceUrl: "https://abmi.ca/abmi-home/what-we-do/airborne-data-collection.html",
        endpointType: "open_data_portal_context",
        status: "needs_probe",
        segments: ["terrain_elevation", "ecology_biodiversity_carbon"]
      },
      {
        id: "alberta-golden-sweep-abmi-hydrological-habitats",
        title: "ABMI hydrological habitats and HydroPatterns",
        provider: "Alberta Biodiversity Monitoring Institute",
        sourceUrl:
          "https://abmi.ca/abmi-home/what-we-do/land-cover-and-land-use-mapping/hydrological.html",
        endpointType: "ecosystem_data_context",
        status: "needs_probe",
        segments: ["water_hydrology", "ecology_biodiversity_carbon"]
      },
      {
        id: "alberta-golden-sweep-acims-data",
        title: "Alberta Conservation Information Management System data access",
        provider: "Government of Alberta",
        sourceUrl: "https://www.alberta.ca/access-acims-data",
        endpointType: "biodiversity_data_access",
        status: "needs_license_review",
        segments: ["ecology_biodiversity_carbon"]
      }
    ]
  }
];

const GERMANY_BAVARIA_INTEL_MATCHES: BaGoldenEvalIntelMatchSummary[] = [
  {
    query: "Bavaria Germany live source sweep 2026-06-03",
    matchCount: 8,
    usableNow: false,
    notes: [
      "Focused web search found official Bavaria and Germany source families for DGM/DOM terrain, orthophoto/geoservices, nature/ecosystem GIS, soils/geology, and OGC service access.",
      "These close the old-output gap for the Bavaria golden eval but still require AOI probes before operational BA promotion."
    ],
    examples: [
      {
        id: "bavaria-sweep-dgm1-open-data",
        title: "Bavaria Digital Terrain Model 1m OpenData",
        provider: "Bayerische Vermessungsverwaltung",
        sourceUrl: "https://geodaten.bayern.de/opengeodata/OpenDataDetail.html?pn=dgm1",
        endpointType: "open_data_geotiff_metalink",
        status: "needs_probe",
        segments: ["terrain_elevation"]
      },
      {
        id: "bavaria-sweep-opengeodata-catalog",
        title: "Bavaria OpenData geodata catalog",
        provider: "Bayerische Vermessungsverwaltung",
        sourceUrl: "https://geodaten.bayern.de/opengeodata/",
        endpointType: "official_open_data_catalog",
        status: "needs_probe",
        segments: ["terrain_elevation", "imagery_observation", "access_infrastructure"]
      },
      {
        id: "bavaria-sweep-geoportal-services",
        title: "Geoportal Bayern geodata services",
        provider: "Geoportal Bayern",
        sourceUrl: "https://geoportal.bayern.de/geoportalbayern/seiten/dienste",
        endpointType: "ogc_service_catalog",
        status: "needs_probe",
        segments: [
          "terrain_elevation",
          "imagery_observation",
          "water_hydrology",
          "ecology_biodiversity_carbon"
        ]
      },
      {
        id: "bavaria-sweep-ldbv-geodata-services",
        title: "Bavarian Surveying Administration geodata services",
        provider: "Landesamt fuer Digitalisierung, Breitband und Vermessung Bayern",
        sourceUrl: "https://www.ldbv.bayern.de/produkte/dienste/geodatendienste.html",
        endpointType: "wms_wfs_service_docs",
        status: "needs_probe",
        segments: ["imagery_observation", "access_infrastructure", "land_property_planning"]
      },
      {
        id: "bavaria-sweep-fis-natur-fin-web",
        title: "FIS-Natur FIN-Web nature and landscape GIS",
        provider: "Bavarian Environment Agency",
        sourceUrl: "https://www.lfu.bayern.de/natur/fis_natur/fin_web/index.htm",
        endpointType: "nature_gis_viewer",
        status: "needs_license_review",
        segments: ["ecology_biodiversity_carbon", "soils_landcover"]
      },
      {
        id: "bavaria-sweep-bgr-geoportal",
        title: "BGR Geoportal soil, geology, groundwater, and raw materials data",
        provider: "Bundesanstalt fuer Geowissenschaften und Rohstoffe",
        sourceUrl:
          "https://www.deutsche-rohstoffagentur.de/EN/Themen/Geodatenmanagement/Geoportal/geoportal_node_en.html",
        endpointType: "national_geoportal",
        status: "needs_probe",
        segments: ["soils_landcover", "water_hydrology", "land_property_planning"]
      },
      {
        id: "bavaria-sweep-geodata-acquisition-soil-estimate",
        title: "Bavaria geodata acquisition and soil estimate data context",
        provider: "BayernPortal",
        sourceUrl: "https://www.bayernportal.de/dokumente/leistung/217422739468?locale=en",
        endpointType: "official_service_context",
        status: "needs_license_review",
        segments: ["soils_landcover", "agriculture_operations", "land_property_planning"]
      },
      {
        id: "bavaria-sweep-landscape-planning-data",
        title: "Bavaria landscape planning data and source guidance",
        provider: "Bavarian Environment Agency",
        sourceUrl:
          "https://www.lfu.bayern.de/natur/landschaftsplanung/planungsgrundlagen/doc/datengrundlagen.pdf",
        endpointType: "pdf_source_guidance",
        status: "research_only",
        segments: ["ecology_biodiversity_carbon", "water_hydrology", "soils_landcover"]
      }
    ]
  }
];

const USA_INTEL_MATCHES: BaGoldenEvalIntelMatchSummary[] = [
  {
    query: "USA / USGS",
    matchCount: 42,
    usableNow: false,
    notes: [
      "Old Intel output has broad USA and USGS candidates.",
      "VMesh reviewed terrain source registry is stronger for operational USGS 3DEP source refs."
    ],
    examples: [
      {
        id: "canonical-0eedf8d065248392",
        title: "Land Cover Data Download",
        provider: "U.S. Geological Survey",
        status: "needs_probe",
        segments: ["soils_landcover"]
      },
      {
        id: "canonical-1031a0c3dad187b9",
        title: "Carbon sequestration in ecosystems of the western United States",
        provider: "pubs.usgs.gov",
        status: "research_only",
        segments: ["ecology_biodiversity_carbon", "research_only"]
      }
    ]
  }
];

const VERMONT_MAD_RIVER_INTEL_MATCHES: BaGoldenEvalIntelMatchSummary[] = [
  ...USA_INTEL_MATCHES,
  {
    query: "Vermont Mad River Valley live source sweep 2026-06-03",
    matchCount: 7,
    usableNow: false,
    notes: [
      "Focused web search found official Vermont source families for lidar-derived DEMs, soils, river corridors, flood hazards, ANR natural-resource layers, and Mad River Valley stormwater context.",
      "These close the Vermont discovery gap but still require AOI probes before operational BA promotion."
    ],
    examples: [
      {
        id: "vermont-mad-river-sweep-vcgi-open-geodata",
        title: "Vermont Open Geodata Portal / VCGI state GIS warehouse",
        provider: "Vermont Center for Geographic Information",
        sourceUrl: "https://geodata.vermont.gov/",
        endpointType: "arcgis_hub_open_data",
        status: "needs_probe",
        segments: [
          "terrain_elevation",
          "soils_landcover",
          "water_hydrology",
          "access_infrastructure"
        ]
      },
      {
        id: "vermont-mad-river-sweep-vcgi-lidar-dem",
        title: "Vermont QL2 lidar hydro-enforced DEM metadata",
        provider: "Vermont Center for Geographic Information / USGS 3DEP",
        sourceUrl: "https://maps.vcgi.vermont.gov/gisdata/metadata/ElevationDEM_DEMHE0p7M2014.htm",
        endpointType: "metadata_download_catalog",
        status: "needs_probe",
        segments: ["terrain_elevation", "water_hydrology"]
      },
      {
        id: "vermont-mad-river-sweep-anr-river-program-mapserver",
        title: "Vermont ANR Atlas Rivers Program ArcGIS service",
        provider: "Vermont Agency of Natural Resources",
        sourceUrl:
          "https://anrmaps.vermont.gov/arcgis/rest/services/map_services/MAP_ANR_ANRATLASRIVERSPROGRAM_WM_NOCACHE/MapServer",
        endpointType: "arcgis_rest_mapserver",
        status: "needs_probe",
        segments: ["water_hydrology", "land_property_planning"]
      },
      {
        id: "vermont-mad-river-sweep-river-corridors-layer",
        title: "Vermont River Corridors layer",
        provider: "Vermont Department of Environmental Conservation",
        sourceUrl:
          "https://anrmaps.vermont.gov/arcgis/rest/services/map_services/MAP_ANR_ANRATLASRIVERSPROGRAM_WM_NOCACHE/MapServer/11",
        endpointType: "arcgis_rest_layer",
        status: "needs_probe",
        segments: ["water_hydrology", "land_property_planning"]
      },
      {
        id: "vermont-mad-river-sweep-nrcs-vermont-soils",
        title: "Vermont soils and VCGI SSURGO references",
        provider: "USDA NRCS / Vermont VCGI",
        sourceUrl: "https://www.nrcs.usda.gov/state-offices/vermont/vermont-soils",
        endpointType: "official_soil_reference",
        status: "needs_probe",
        segments: ["soils_landcover", "agriculture_operations"]
      },
      {
        id: "vermont-mad-river-sweep-anr-online-links",
        title: "Vermont ANR Atlas and Open GeoData links",
        provider: "Vermont Agency of Natural Resources",
        sourceUrl: "https://anrweb.vt.gov/DEC/DamsInventory/ANROnLineLinks.aspx",
        endpointType: "official_source_directory",
        status: "research_only",
        segments: ["water_hydrology", "ecology_biodiversity_carbon", "operator_review"]
      },
      {
        id: "vermont-mad-river-sweep-mad-river-stormwater-context",
        title: "Mad River Ridge to River stormwater report",
        provider: "Mad River Valley / Vermont ANR context",
        sourceUrl:
          "https://anrweb.vt.gov/PUBDOCS/DEC/STORMWATER/Town%20Reports%20and%20Maps/Warren/Mad%20River%20Ridge%20to%20River%20PHASE%201%20REPORT%20FINAL%202016%2004%2001.pdf",
        endpointType: "watershed_context_pdf",
        status: "research_only",
        segments: ["water_hydrology", "ecology_biodiversity_carbon", "community_economy"]
      }
    ]
  }
];

const COLORADO_BOULDER_INTEL_MATCHES: BaGoldenEvalIntelMatchSummary[] = [
  ...USA_INTEL_MATCHES,
  {
    query: "Colorado Boulder Canyon live source sweep 2026-06-03",
    matchCount: 6,
    usableNow: false,
    notes: [
      "Focused web search found official Boulder/Colorado and USGS source families for terrain, flood history, wildfire history, open-space/ecology, GIS downloads, and national elevation/hydrography.",
      "These close the Boulder Canyon discovery gap but still require AOI probes before operational BA promotion."
    ],
    examples: [
      {
        id: "colorado-boulder-sweep-boulder-county-gis-downloads",
        title: "Boulder County GIS downloadable data and maps",
        provider: "Boulder County",
        sourceUrl: "https://bouldercounty.gov/government/open-data/maps/",
        endpointType: "local_open_data_portal",
        status: "needs_probe",
        segments: [
          "access_infrastructure",
          "land_property_planning",
          "water_hydrology",
          "ecology_biodiversity_carbon"
        ]
      },
      {
        id: "colorado-boulder-sweep-usgs-national-map-viewer",
        title: "USGS National Map Viewer and downloads",
        provider: "U.S. Geological Survey",
        sourceUrl: "https://www.usgs.gov/tools/national-map-viewer",
        endpointType: "national_map_downloads_and_services",
        status: "needs_probe",
        segments: ["terrain_elevation", "water_hydrology", "access_infrastructure"]
      },
      {
        id: "colorado-boulder-sweep-usgs-geospatial-data",
        title: "USGS geospatial data source families",
        provider: "U.S. Geological Survey",
        sourceUrl: "https://www.usgs.gov/geospatial-data",
        endpointType: "national_source_directory",
        status: "needs_probe",
        segments: ["terrain_elevation", "imagery_observation", "soils_landcover", "water_hydrology"]
      },
      {
        id: "colorado-boulder-sweep-boulder-flood-history",
        title: "Boulder County flood history mapping context",
        provider: "Boulder County",
        sourceUrl: "https://bouldercounty.gov/government/open-data/maps/",
        endpointType: "local_hazard_map_context",
        status: "research_only",
        segments: ["water_hydrology", "community_economy"]
      },
      {
        id: "colorado-boulder-sweep-boulder-wildfire-history",
        title: "Boulder County wildfire history mapping context",
        provider: "Boulder County",
        sourceUrl: "https://bouldercounty.gov/government/open-data/maps/",
        endpointType: "local_hazard_map_context",
        status: "research_only",
        segments: ["ecology_biodiversity_carbon", "land_property_planning"]
      },
      {
        id: "colorado-boulder-sweep-usgs-3dep-coverage",
        title: "USGS 3DEP DEM coverage",
        provider: "U.S. Geological Survey",
        sourceUrl: "https://www.usgs.gov/faqs/what-coverage-3d-elevation-program-3dep-dems",
        endpointType: "national_coverage_reference",
        status: "research_only",
        segments: ["terrain_elevation"]
      }
    ]
  }
];

const FLORIDA_COASTAL_INTEL_MATCHES: BaGoldenEvalIntelMatchSummary[] = [
  ...USA_INTEL_MATCHES,
  {
    query: "Florida low relief coastal live source sweep 2026-06-03",
    matchCount: 7,
    usableNow: false,
    notes: [
      "Focused web search found official Florida and national coastal source families for lidar/digital elevation, DEP GIS, coastal relief, flood and habitat context, and coastal/offshore GIS layers.",
      "These close the Florida low-relief coastal discovery gap but still require AOI probes before operational BA promotion."
    ],
    examples: [
      {
        id: "florida-coastal-sweep-fdem-lidar",
        title: "Florida LiDAR and digital elevation data",
        provider: "Florida Division of Emergency Management",
        sourceUrl:
          "https://www.floridadisaster.org/dem/dem/ITM/geographic-information-systems/lidar/",
        endpointType: "state_lidar_source_directory",
        status: "needs_probe",
        segments: ["terrain_elevation", "water_hydrology"]
      },
      {
        id: "florida-coastal-sweep-florida-dep-gis",
        title: "Florida DEP GIS open data",
        provider: "Florida Department of Environmental Protection",
        sourceUrl: "https://floridadep.gov/otis/enterprise-application-services/gis",
        endpointType: "state_open_data_portal",
        status: "needs_probe",
        segments: [
          "water_hydrology",
          "ecology_biodiversity_carbon",
          "soils_landcover",
          "land_property_planning"
        ]
      },
      {
        id: "florida-coastal-sweep-noaa-coastal-relief-model",
        title: "NOAA NCEI Coastal Relief Model",
        provider: "NOAA National Centers for Environmental Information",
        sourceUrl: "https://www.ncei.noaa.gov/products/coastal-relief-model",
        endpointType: "coastal_elevation_model",
        status: "needs_probe",
        segments: ["terrain_elevation", "water_hydrology"]
      },
      {
        id: "florida-coastal-sweep-usgs-florida-coastal-environments",
        title: "USGS Florida coastal and offshore geospatial characteristics",
        provider: "U.S. Geological Survey",
        sourceUrl:
          "https://www.usgs.gov/maps/geospatial-characteristics-floridas-coastal-and-offshore-environments-coastal-habitats",
        endpointType: "coastal_gis_layer_collection",
        status: "needs_probe",
        segments: ["ecology_biodiversity_carbon", "water_hydrology", "land_property_planning"]
      },
      {
        id: "florida-coastal-sweep-usgs-florida-3dep-economy",
        title: "USGS 3DEP supporting Florida's economy",
        provider: "U.S. Geological Survey",
        sourceUrl: "https://pubs.usgs.gov/fs/2023/3037/fs20233037.pdf",
        endpointType: "terrain_coverage_context_pdf",
        status: "research_only",
        segments: ["terrain_elevation", "water_hydrology"]
      },
      {
        id: "florida-coastal-sweep-public-flood-loss-model",
        title: "Florida public flood loss model DEM context",
        provider: "Florida Commission on Hurricane Loss Projection Methodology",
        sourceUrl: "https://fchlpm.sbafla.com/media/wqmh4ckp/20240909_fpflm21-v10_with_gf-1.pdf",
        endpointType: "flood_model_context_pdf",
        status: "research_only",
        segments: ["water_hydrology", "community_economy"]
      },
      {
        id: "florida-coastal-sweep-usgs-national-map-viewer",
        title: "USGS National Map Viewer and downloads",
        provider: "U.S. Geological Survey",
        sourceUrl: "https://www.usgs.gov/tools/national-map-viewer",
        endpointType: "national_map_downloads_and_services",
        status: "needs_probe",
        segments: ["terrain_elevation", "water_hydrology", "access_infrastructure"]
      }
    ]
  }
];

const SAN_FRANCISCO_INTEL_MATCHES: BaGoldenEvalIntelMatchSummary[] = [
  ...USA_INTEL_MATCHES,
  {
    query: "San Francisco live source sweep 2026-06-03",
    matchCount: 8,
    usableNow: false,
    notes: [
      "Focused web search found official San Francisco Bay and city source families for open civic data, shoreline flood/sea-level-rise data, topobathymetric elevation, lidar, habitats, and estuary ecology.",
      "These close the San Francisco discovery gap but still require AOI probes before operational BA promotion."
    ],
    examples: [
      {
        id: "san-francisco-sweep-datasf-open-data",
        title: "DataSF San Francisco Open Data",
        provider: "City and County of San Francisco",
        sourceUrl: "https://data.sfgov.org/",
        endpointType: "city_open_data_portal",
        status: "needs_probe",
        segments: [
          "access_infrastructure",
          "land_property_planning",
          "community_economy",
          "ecology_biodiversity_carbon"
        ]
      },
      {
        id: "san-francisco-sweep-bcdc-maps-data",
        title: "San Francisco Bay BCDC maps and spatial data",
        provider: "San Francisco Bay Conservation and Development Commission",
        sourceUrl: "https://www.bcdc.ca.gov/resources/maps-and-data/",
        endpointType: "regional_open_data_portal",
        status: "needs_probe",
        segments: ["water_hydrology", "ecology_biodiversity_carbon", "land_property_planning"]
      },
      {
        id: "san-francisco-sweep-usgs-tbdem",
        title: "USGS San Francisco Bay topobathymetric elevation model",
        provider: "U.S. Geological Survey",
        sourceUrl:
          "https://www.usgs.gov/special-topics/coastal-national-elevation-database-applications-project/science/topobathymetric-0",
        endpointType: "topobathymetric_elevation_model",
        status: "needs_probe",
        segments: ["terrain_elevation", "water_hydrology"]
      },
      {
        id: "san-francisco-sweep-sfei-lidar-resources",
        title: "San Francisco Estuary Institute lidar resources",
        provider: "San Francisco Estuary Institute",
        sourceUrl: "https://www.sfei.org/projects/lidar-resources",
        endpointType: "lidar_context_and_project_index",
        status: "needs_license_review",
        segments: ["terrain_elevation", "ecology_biodiversity_carbon"]
      },
      {
        id: "san-francisco-sweep-bay-eelgrass-and-habitat",
        title: "BCDC bay habitat and eelgrass data tools",
        provider: "San Francisco Bay Conservation and Development Commission",
        sourceUrl: "https://www.bcdc.ca.gov/resources/maps-and-data/",
        endpointType: "regional_habitat_tool_directory",
        status: "needs_probe",
        segments: ["ecology_biodiversity_carbon", "water_hydrology"]
      },
      {
        id: "san-francisco-sweep-sfgov-open-data",
        title: "SFGOV city open data entrypoint",
        provider: "City and County of San Francisco",
        sourceUrl: "https://www.sfgov.org/services/city-open-data",
        endpointType: "city_open_data_context",
        status: "research_only",
        segments: ["community_economy", "operator_review"]
      },
      {
        id: "san-francisco-sweep-adapting-to-rising-tides-catalog",
        title: "San Francisco Bay adapting to rising tides GIS data catalog",
        provider: "Adapting to Rising Tides / regional partners",
        sourceUrl:
          "https://www.adaptingtorisingtides.org/wp-content/uploads/2017/04/GIS_data_catalog.pdf",
        endpointType: "sea_level_rise_gis_catalog_pdf",
        status: "research_only",
        segments: ["water_hydrology", "land_property_planning", "community_economy"]
      },
      {
        id: "san-francisco-sweep-usgs-national-map-viewer",
        title: "USGS National Map Viewer and downloads",
        provider: "U.S. Geological Survey",
        sourceUrl: "https://www.usgs.gov/tools/national-map-viewer",
        endpointType: "national_map_downloads_and_services",
        status: "needs_probe",
        segments: ["terrain_elevation", "water_hydrology", "access_infrastructure"]
      }
    ]
  }
];

const LEBANON_MOUNT_LEBANON_INTEL_MATCHES: BaGoldenEvalIntelMatchSummary[] = [
  {
    query: "Mount Lebanon live source sweep 2026-06-03",
    matchCount: 8,
    usableNow: false,
    notes: [
      "Focused web search found Lebanon national, regional, and global source families for remote sensing, land cover, vegetation, water resources, terrain, biodiversity/context, and hazard screening.",
      "Lebanon has fewer obvious public operational GIS services than the North America/Europe sites, so these records emphasize source-family discovery and still require AOI probes plus license/access review before operational BA promotion."
    ],
    examples: [
      {
        id: "lebanon-mount-sweep-cnrs-remote-sensing",
        title: "Lebanon National Council for Scientific Research remote sensing center",
        provider: "CNRS Lebanon / National Center for Remote Sensing",
        sourceUrl:
          "https://www.cnrs.edu.lb/english/about-cnrs/centers/national-center-for-remote-sensing",
        endpointType: "national_remote_sensing_center",
        status: "needs_license_review",
        segments: [
          "imagery_observation",
          "terrain_elevation",
          "water_hydrology",
          "ecology_biodiversity_carbon"
        ]
      },
      {
        id: "lebanon-mount-sweep-cnrs-water-resources",
        title: "CNRS Lebanon water resources and climate change research",
        provider: "CNRS Lebanon",
        sourceUrl: "https://www.cnrs.edu.lb/english/research/water-resources-and-climate-change",
        endpointType: "research_source_directory",
        status: "research_only",
        segments: ["water_hydrology", "climate_weather", "research_only"]
      },
      {
        id: "lebanon-mount-sweep-fao-forest-vegetation-cover",
        title: "FAO vegetation cover map of Lebanon",
        provider: "Food and Agriculture Organization of the United Nations",
        sourceUrl: "https://data.apps.fao.org/catalog/dataset/vegetation-cover-map-of-lebanon",
        endpointType: "geospatial_catalog_dataset",
        status: "needs_probe",
        segments: ["ecology_biodiversity_carbon", "soils_landcover", "agriculture_operations"]
      },
      {
        id: "lebanon-mount-sweep-fao-land-cover-atlas",
        title: "FAO Lebanon land cover / land use atlas",
        provider: "Food and Agriculture Organization of the United Nations",
        sourceUrl: "https://www.fao.org/4/i3366e/i3366e.pdf",
        endpointType: "landcover_context_pdf",
        status: "research_only",
        segments: ["soils_landcover", "agriculture_operations", "ecology_biodiversity_carbon"]
      },
      {
        id: "lebanon-mount-sweep-copernicus-dem",
        title: "Copernicus DEM global elevation source",
        provider: "Copernicus Data Space Ecosystem",
        sourceUrl:
          "https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM",
        endpointType: "global_dem_catalog",
        status: "needs_probe",
        segments: ["terrain_elevation", "water_hydrology"]
      },
      {
        id: "lebanon-mount-sweep-earth-search-sentinel",
        title: "Sentinel-2 L2A Earth Search STAC",
        provider: "Element84 / AWS Open Data",
        sourceUrl: "https://earth-search.aws.element84.com/v1",
        endpointType: "stac_api",
        status: "needs_probe",
        segments: ["imagery_observation", "agriculture_operations", "ecology_biodiversity_carbon"]
      },
      {
        id: "lebanon-mount-sweep-openstreetmap-geofabrik",
        title: "Geofabrik Lebanon OpenStreetMap extract",
        provider: "Geofabrik / OpenStreetMap contributors",
        sourceUrl: "https://download.geofabrik.de/asia/lebanon.html",
        endpointType: "osm_pbf_extract",
        status: "needs_probe",
        segments: ["access_infrastructure", "land_property_planning", "water_hydrology"]
      },
      {
        id: "lebanon-mount-sweep-global-soilgrids",
        title: "SoilGrids global soil information",
        provider: "ISRIC World Soil Information",
        sourceUrl: "https://soilgrids.org/",
        endpointType: "global_soil_api",
        status: "needs_probe",
        segments: ["soils_landcover", "agriculture_operations"]
      }
    ]
  }
];

function imageryRun({
  siteNumber,
  siteId,
  runId,
  mapboxTiles,
  sentinelCloudMean
}: {
  siteNumber: string;
  siteId: string;
  runId: string;
  mapboxTiles: number;
  sentinelCloudMean: number;
}): BaGoldenEvalOldRunEvidence {
  return {
    runId,
    runType: "official imagery comparison",
    runClass: "live-proof evidence retained, operator-local package",
    retainedRef: `ba:.codex-logs/gis-golden-runs/${siteNumber}-${siteId}/${runId}`,
    mapboxRunClass: "live-proof",
    mapboxTiles,
    sentinelRunClass: "live-proof",
    sentinelTiles: 9,
    sentinelCloudMean,
    terrainRunClass: "not-used",
    terrainRoles: [],
    terrainResolution: null,
    up42PackNumber: null
  };
}

function up42Run({
  siteNumber,
  siteId,
  runId,
  terrainRoles,
  terrainResolution,
  up42PackNumber
}: {
  siteNumber: string;
  siteId: string;
  runId: string;
  terrainRoles: string[];
  terrainResolution: string;
  up42PackNumber: string;
}): BaGoldenEvalOldRunEvidence {
  return {
    runId,
    runType: "UP42 terrain/source-pack derivatives",
    runClass: "live-proof evidence retained, operator-local package",
    retainedRef: `ba:.codex-logs/gis-golden-runs/${siteNumber}-${siteId}/${runId}`,
    mapboxRunClass: "not-used",
    mapboxTiles: null,
    sentinelRunClass: "not-used",
    sentinelTiles: null,
    sentinelCloudMean: null,
    terrainRunClass: "live-proof",
    terrainRoles,
    terrainResolution,
    up42PackNumber
  };
}

const SITES: BaGoldenEvalSiteSummary[] = [
  {
    id: "scotland-rural-burmieston",
    publicSafeLabel: "Burmieston, Perthshire, Scotland",
    region: "europe",
    country: "United Kingdom",
    priority: 1,
    coordinateDisclosure: "withheld-public-safe-site-id",
    oldOutputState: "old_outputs_exhausted",
    reviewedThroughSitePackage: true,
    sourceSweepState: "focused_source_sweep_completed",
    oldRunEvidence: [
      imageryRun({
        siteNumber: "01",
        siteId: "scotland-rural-burmieston",
        runId: "imagery-compare-20260531T042500Z",
        mapboxTiles: 121,
        sentinelCloudMean: 0.01
      })
    ],
    intelOldOutputMatches: SCOTLAND_INTEL_MATCHES
  },
  {
    id: "scotland-rural-comrie-croft",
    publicSafeLabel: "Comrie Croft, Perthshire, Scotland",
    region: "europe",
    country: "United Kingdom",
    priority: 2,
    coordinateDisclosure: "withheld-public-safe-site-id",
    oldOutputState: "old_outputs_imported_pending_site_review",
    reviewedThroughSitePackage: false,
    sourceSweepState: "focused_source_sweep_completed",
    oldRunEvidence: [
      imageryRun({
        siteNumber: "02",
        siteId: "scotland-rural-comrie-croft",
        runId: "imagery-compare-20260531T042500Z",
        mapboxTiles: 110,
        sentinelCloudMean: 0
      })
    ],
    intelOldOutputMatches: COMRIE_CROFT_INTEL_MATCHES
  },
  {
    id: "scotland-coastal-tangleha-artists-collective",
    publicSafeLabel: "St Cyrus coastal rural site, Scotland",
    region: "europe",
    country: "United Kingdom",
    priority: 3,
    coordinateDisclosure: "withheld-public-safe-site-id",
    oldOutputState: "old_outputs_imported_pending_site_review",
    reviewedThroughSitePackage: false,
    sourceSweepState: "focused_source_sweep_completed",
    oldRunEvidence: [
      imageryRun({
        siteNumber: "03",
        siteId: "scotland-coastal-tangleha-artists-collective",
        runId: "imagery-compare-20260531T042500Z",
        mapboxTiles: 110,
        sentinelCloudMean: 0.9
      })
    ],
    intelOldOutputMatches: TANGLEHA_INTEL_MATCHES
  },
  {
    id: "canada-rural-pemberton-bc",
    publicSafeLabel: "Pemberton rural mountain-valley site, British Columbia",
    region: "canada",
    country: "Canada",
    priority: 4,
    coordinateDisclosure: "withheld-public-safe-site-id",
    oldOutputState: "old_outputs_imported_pending_site_review",
    reviewedThroughSitePackage: false,
    sourceSweepState: "focused_source_sweep_completed",
    oldRunEvidence: [
      imageryRun({
        siteNumber: "04",
        siteId: "canada-rural-pemberton-bc",
        runId: "imagery-compare-20260531T042500Z",
        mapboxTiles: 81,
        sentinelCloudMean: 0.32
      })
    ],
    intelOldOutputMatches: PEMBERTON_INTEL_MATCHES
  },
  {
    id: "canada-dryland-kamloops-rose-hill",
    publicSafeLabel: "Kamloops / Rose Hill dryland site, British Columbia",
    region: "canada",
    country: "Canada",
    priority: 5,
    coordinateDisclosure: "withheld-public-safe-site-id",
    oldOutputState: "old_outputs_imported_pending_site_review",
    reviewedThroughSitePackage: false,
    sourceSweepState: "focused_source_sweep_completed",
    oldRunEvidence: [
      imageryRun({
        siteNumber: "05",
        siteId: "canada-dryland-kamloops-rose-hill",
        runId: "imagery-compare-20260531T043500Z",
        mapboxTiles: 72,
        sentinelCloudMean: 0
      })
    ],
    intelOldOutputMatches: KAMLOOPS_INTEL_MATCHES
  },
  {
    id: "canada-rural-alberta-parkland",
    publicSafeLabel: "Central Alberta rural / parkland site",
    region: "canada",
    country: "Canada",
    priority: 6,
    coordinateDisclosure: "withheld-public-safe-site-id",
    oldOutputState: "old_outputs_imported_pending_site_review",
    reviewedThroughSitePackage: false,
    sourceSweepState: "focused_source_sweep_completed",
    oldRunEvidence: [
      {
        ...up42Run({
          siteNumber: "06",
          siteId: "canada-rural-alberta-parkland",
          runId: "alberta-first-20260531T020657Z",
          terrainRoles: ["dsm", "dtm", "fillingMask"],
          terrainResolution: "0.5 m terrain bundle, area redacted in public-safe manifest",
          up42PackNumber: "UP42-02"
        }),
        runType: "UP42 terrain plus imagery comparison",
        mapboxRunClass: "live-proof",
        mapboxTiles: 90,
        sentinelRunClass: "live-proof",
        sentinelTiles: 9,
        sentinelCloudMean: 4.11
      },
      imageryRun({
        siteNumber: "06",
        siteId: "canada-rural-alberta-parkland",
        runId: "imagery-compare-20260531T043500Z",
        mapboxTiles: 100,
        sentinelCloudMean: 0
      }),
      up42Run({
        siteNumber: "06",
        siteId: "canada-rural-alberta-parkland",
        runId: "up42-01-dtm-20260531T034900Z",
        terrainRoles: ["dtm"],
        terrainResolution: "DTM, exact area redacted in public-safe manifest",
        up42PackNumber: "UP42-01"
      })
    ],
    intelOldOutputMatches: ALBERTA_INTEL_MATCHES
  },
  {
    id: "germany-rural-bavaria-wegele",
    publicSafeLabel: "Bavaria rural settlement site, Germany",
    region: "germany",
    country: "Germany",
    priority: 7,
    coordinateDisclosure: "withheld-public-safe-site-id",
    oldOutputState: "old_outputs_imported_pending_site_review",
    reviewedThroughSitePackage: false,
    sourceSweepState: "focused_source_sweep_completed",
    oldRunEvidence: [
      imageryRun({
        siteNumber: "07",
        siteId: "germany-rural-bavaria-wegele",
        runId: "imagery-compare-20260531T043500Z",
        mapboxTiles: 72,
        sentinelCloudMean: 0
      })
    ],
    intelOldOutputMatches: GERMANY_BAVARIA_INTEL_MATCHES
  },
  {
    id: "scotland-urban-edinburgh-mcdonald-place",
    publicSafeLabel: "Edinburgh urban alignment site, Scotland",
    region: "europe",
    country: "United Kingdom",
    priority: 8,
    coordinateDisclosure: "withheld-public-safe-site-id",
    oldOutputState: "old_outputs_imported_pending_site_review",
    reviewedThroughSitePackage: false,
    sourceSweepState: "focused_source_sweep_completed",
    oldRunEvidence: [
      imageryRun({
        siteNumber: "08",
        siteId: "scotland-urban-edinburgh-mcdonald-place",
        runId: "imagery-compare-20260531T043500Z",
        mapboxTiles: 100,
        sentinelCloudMean: 0.38
      })
    ],
    intelOldOutputMatches: EDINBURGH_MCDONALD_INTEL_MATCHES
  },
  {
    id: "scotland-rural-perth-ph1-road-building-alignment",
    publicSafeLabel: "Perthshire rural road/building alignment site, Scotland",
    region: "europe",
    country: "United Kingdom",
    priority: 9,
    coordinateDisclosure: "withheld-public-safe-site-id",
    oldOutputState: "old_outputs_imported_pending_site_review",
    reviewedThroughSitePackage: false,
    sourceSweepState: "focused_source_sweep_completed",
    oldRunEvidence: [
      imageryRun({
        siteNumber: "09",
        siteId: "scotland-rural-perth-ph1-road-building-alignment",
        runId: "imagery-compare-20260531T043500Z",
        mapboxTiles: 110,
        sentinelCloudMean: 0.01
      })
    ],
    intelOldOutputMatches: PERTH_PH1_INTEL_MATCHES
  },
  {
    id: "usa-vermont-rural-mad-river-valley",
    publicSafeLabel: "Mad River Valley rural site, Vermont, USA",
    region: "usa",
    country: "United States",
    priority: 10,
    coordinateDisclosure: "withheld-public-safe-site-id",
    oldOutputState: "old_outputs_imported_pending_site_review",
    reviewedThroughSitePackage: false,
    sourceSweepState: "focused_source_sweep_completed",
    oldRunEvidence: [
      imageryRun({
        siteNumber: "10",
        siteId: "usa-vermont-rural-mad-river-valley",
        runId: "imagery-compare-20260531T043500Z",
        mapboxTiles: 64,
        sentinelCloudMean: 14.3
      })
    ],
    intelOldOutputMatches: VERMONT_MAD_RIVER_INTEL_MATCHES
  },
  {
    id: "usa-colorado-mountain-boulder-canyon",
    publicSafeLabel: "Boulder Canyon mountain site, Colorado, USA",
    region: "usa",
    country: "United States",
    priority: 11,
    coordinateDisclosure: "withheld-public-safe-site-id",
    oldOutputState: "old_outputs_imported_pending_site_review",
    reviewedThroughSitePackage: false,
    sourceSweepState: "focused_source_sweep_completed",
    oldRunEvidence: [
      imageryRun({
        siteNumber: "11",
        siteId: "usa-colorado-mountain-boulder-canyon",
        runId: "imagery-compare-20260531T041500Z",
        mapboxTiles: 64,
        sentinelCloudMean: 1.9
      })
    ],
    intelOldOutputMatches: COLORADO_BOULDER_INTEL_MATCHES
  },
  {
    id: "usa-florida-low-relief-coastal",
    publicSafeLabel: "St. Augustine low-relief coastal site, Florida, USA",
    region: "usa",
    country: "United States",
    priority: 12,
    coordinateDisclosure: "withheld-public-safe-site-id",
    oldOutputState: "old_outputs_imported_pending_site_review",
    reviewedThroughSitePackage: false,
    sourceSweepState: "focused_source_sweep_completed",
    oldRunEvidence: [
      imageryRun({
        siteNumber: "12",
        siteId: "usa-florida-low-relief-coastal",
        runId: "imagery-compare-20260531T045000Z",
        mapboxTiles: 49,
        sentinelCloudMean: 0
      })
    ],
    intelOldOutputMatches: FLORIDA_COASTAL_INTEL_MATCHES
  },
  {
    id: "usa-urban-san-francisco",
    publicSafeLabel: "Mission Bay urban waterfront site, San Francisco, USA",
    region: "usa",
    country: "United States",
    priority: 13,
    coordinateDisclosure: "withheld-public-safe-site-id",
    oldOutputState: "old_outputs_imported_pending_site_review",
    reviewedThroughSitePackage: false,
    sourceSweepState: "focused_source_sweep_completed",
    oldRunEvidence: [
      imageryRun({
        siteNumber: "13",
        siteId: "usa-urban-san-francisco",
        runId: "imagery-compare-20260531T045000Z",
        mapboxTiles: 56,
        sentinelCloudMean: 0
      }),
      up42Run({
        siteNumber: "24",
        siteId: "up42-western-usa-candidate",
        runId: "up42-surface-20260531T034900Z",
        terrainRoles: ["dtm"],
        terrainResolution: "0.15 m DTM, area redacted in public-safe manifest",
        up42PackNumber: "UP42-06"
      })
    ],
    intelOldOutputMatches: SAN_FRANCISCO_INTEL_MATCHES
  },
  {
    id: "middle-east-lebanon-mount-lebanon",
    publicSafeLabel: "Mount Lebanon Mediterranean hill-country site",
    region: "lebanon",
    country: "Lebanon",
    priority: 16,
    coordinateDisclosure: "withheld-public-safe-site-id",
    oldOutputState: "old_outputs_imported_pending_site_review",
    reviewedThroughSitePackage: false,
    sourceSweepState: "focused_source_sweep_completed",
    oldRunEvidence: [
      imageryRun({
        siteNumber: "16",
        siteId: "middle-east-lebanon-mount-lebanon",
        runId: "imagery-compare-20260531T045000Z",
        mapboxTiles: 49,
        sentinelCloudMean: 10.28
      }),
      up42Run({
        siteNumber: "21",
        siteId: "up42-europe-candidate",
        runId: "up42-terrain-20260531T033700Z",
        terrainRoles: ["dsm", "dtm", "fillingMask"],
        terrainResolution: "0.5 m terrain bundle, area redacted in public-safe manifest",
        up42PackNumber: "UP42-03"
      })
    ],
    intelOldOutputMatches: LEBANON_MOUNT_LEBANON_INTEL_MATCHES
  }
];

export const BA_GOLDEN_EVAL_ACTIVE_SITE_ID = "scotland-rural-burmieston";

export function getBaGoldenEvalCatalog(): BaGoldenEvalCatalogPackage {
  return {
    schemaVersion: "vmesh-ba-golden-eval-catalog-v1",
    generatedAt: GENERATED_AT,
    runClass: "dry-run",
    sourceSystems: [
      {
        id: "ba-golden-sites-json",
        runClass: "dry-run",
        boundary:
          "BA source-of-truth site ids and public-safe labels; exact coordinates are not copied."
      },
      {
        id: "ba-gis-golden-runs-public-safe-manifest",
        runClass: "live-proof evidence retained, operator-local package",
        boundary:
          "Retained BA local evidence refs and counts only; raw provider payloads stay in BA/operator storage."
      },
      {
        id: "ba-intel-source-discovery-uk-canada-geospatial-20260520",
        runClass: "live-proof evidence retained, operator-local package",
        boundary:
          "BA retained Intel discovery refs only; VMesh imports source candidates and review state, not raw crawl output."
      },
      {
        id: "vmesh-intel-tools-sidecar-output",
        runClass: "dry-run",
        boundary:
          "Old Intel candidate intelligence only; candidates require probe/license review before BA operational promotion."
      }
    ],
    activeSiteId: BA_GOLDEN_EVAL_ACTIVE_SITE_ID,
    sites: SITES
  };
}

export function getBaGoldenEvalSite(siteId: string): BaGoldenEvalSiteSummary | null {
  return SITES.find((site) => site.id === siteId) ?? null;
}

export function getBaGoldenEvalSitesForRegion(
  region: BaGoldenEvalRegion
): BaGoldenEvalSiteSummary[] {
  return SITES.filter((site) => site.region === region);
}

export function createBaGoldenEvalSitePackage(
  siteId = BA_GOLDEN_EVAL_ACTIVE_SITE_ID
): BaGoldenEvalSitePackage {
  const site = getBaGoldenEvalSite(siteId);
  if (!site) {
    throw new Error(`Unknown BA golden eval site: ${siteId}`);
  }

  const retainedRecords: BaGoldenEvalCleanedSourceRecord[] = site.oldRunEvidence.map((run) => ({
    id: `ba-run:${site.id}:${run.runId}`,
    label: `${site.publicSafeLabel} retained ${run.runType}`,
    sourceClass: "ba-retained-live-proof",
    segments:
      run.terrainRunClass === "live-proof"
        ? ["terrain_elevation", "imagery_observation"]
        : ["imagery_observation"],
    runClass: "live-proof",
    status: "ready_for_ba_pipe",
    displayMode: "api_downstream_mode",
    retainedRefs: [run.retainedRef],
    limitations: [
      "Operator-local retained evidence ref; VMesh does not store raw provider payloads.",
      "Exact coordinates and paid-provider identifiers are withheld from the VMesh package."
    ]
  }));

  const reviewedRefs: BaGoldenEvalCleanedSourceRecord[] = [
    {
      id: "vmesh-source:sentinel-2-l2a-earth-search",
      label: "Sentinel-2 L2A Earth Search source reference",
      sourceClass: "vmesh-reviewed-source-ref",
      segments: ["imagery_observation", "agriculture_operations"],
      runClass: "dry-run",
      status: "ready_source_ref",
      displayMode: "api_downstream_mode",
      retainedRefs: ["/api/geospatial-package/ba?segments=imagery_observation"],
      limitations: ["AOI package fetch and cloud filtering remain downstream worker tasks."]
    },
    {
      id: "vmesh-source:openstreetmap-overture",
      label: "OSM/Overture roads, buildings, and access source references",
      sourceClass: "vmesh-reviewed-source-ref",
      segments: ["access_infrastructure", "land_property_planning"],
      runClass: "dry-run",
      status: "ready_source_ref",
      displayMode: "api_downstream_mode",
      retainedRefs: ["/api/geospatial-package/ba?segments=access_infrastructure"],
      limitations: ["Vector freshness and completeness must be compared against retained imagery."]
    }
  ];

  const candidateRecords: BaGoldenEvalCleanedSourceRecord[] = site.intelOldOutputMatches.flatMap(
    (match) =>
      (match.examples ?? []).map((source) => ({
        id: `intel-candidate:${source.id}`,
        label: source.title,
        sourceClass: "intel-candidate-review",
        segments: source.segments,
        runClass: "dry-run",
        status:
          source.status === "needs_license_review" || source.status === "research_only"
            ? source.status
            : "needs_probe",
        displayMode:
          source.status === "research_only" ? "advanced_user_view" : "operator_review_mode",
        retainedRefs: [
          "/api/geospatial-package/intel-broker",
          ...(source.sourceUrl ? [source.sourceUrl] : [])
        ],
        limitations: [
          `Matched old Intel query: ${match.query}`,
          ...(source.endpointType ? [`Endpoint type: ${source.endpointType}`] : []),
          "Not BA operational until probe, license, and AOI coverage review are complete."
        ]
      }))
  );

  const cleanedSourceRecords =
    site.reviewedThroughSitePackage === true
      ? [...retainedRecords, ...reviewedRefs, ...candidateRecords]
      : [...retainedRecords, ...candidateRecords];

  return {
    schemaVersion: "vmesh-ba-golden-eval-site-package-v1",
    generatedAt: GENERATED_AT,
    runClass: "dry-run",
    site,
    cleanedSourceRecords,
    baPipe: {
      consumer: "ba-gis-worker",
      endpointMode: "site-id-public-safe",
      sourceRecordCount: cleanedSourceRecords.length,
      candidateReviewCount: candidateRecords.length,
      rawProviderPayloadsStoredByVmesh: false,
      exactCoordinatesStoredByVmesh: false
    },
    gaps: [
      ...(site.intelOldOutputMatches.some((match) => match.matchCount === 0)
        ? ["No site-specific old Intel source records were found for at least one query."]
        : []),
      "New Intel Tools search/probe campaigns have not yet been run for this site in this VMesh pass.",
      "Raw retained BA artifacts remain operator-local and are referenced, not copied."
    ],
    nextSiteIds: SITES.filter((candidate) => candidate.priority > site.priority)
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 3)
      .map((candidate) => candidate.id)
  };
}

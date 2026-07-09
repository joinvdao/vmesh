import type {
  GeospatialSourceCandidate,
  PackageLayerId,
  PackageSourceStatus
} from "@/lib/geospatialPackage/types";
import { source } from "@/lib/geospatialPackage/sourceRegistryHelpers";

interface ThematicSource {
  id: string;
  label: string;
  layerIds: PackageLayerId[];
  status?: PackageSourceStatus;
  coverage: string;
  resolution: string;
  sourceUrl: string;
  attribution: string;
  license: string;
  priority: number;
  truthRole: string;
  notes: string;
}

const THEMATIC_SOURCES: ThematicSource[] = [
  {
    id: "google-open-buildings",
    label: "Google Open Buildings",
    layerIds: ["buildings"],
    coverage: "Africa, Latin America, Caribbean, South Asia, and Southeast Asia",
    resolution: "ML building footprints",
    sourceUrl: "https://sites.research.google/open-buildings/",
    attribution: "Google Open Buildings",
    license: "CC BY 4.0 data terms",
    priority: 320,
    truthRole: "ml-building-footprint",
    notes: "High-value building fallback where OSM/Overture are sparse."
  },
  {
    id: "microsoft-building-footprints",
    label: "Microsoft Global ML Building Footprints",
    layerIds: ["buildings"],
    coverage: "Global/regional published ML footprint releases",
    resolution: "ML building footprints and attributes where available",
    sourceUrl: "https://github.com/microsoft/GlobalMLBuildingFootprints",
    attribution: "Microsoft and OpenStreetMap contributors where applicable",
    license: "ODbL-style obligations for many releases; review per extract",
    priority: 322,
    truthRole: "ml-building-footprint",
    notes: "Useful comparison/fill source; preserve adapted-database obligations."
  },
  {
    id: "global-building-atlas-odbl-polygons",
    label: "GlobalBuildingAtlas ODbL polygons",
    layerIds: ["buildings"],
    coverage: "GlobalBuildingAtlas ODbL polygon subset only",
    resolution: "Building polygons",
    sourceUrl: "https://github.com/zhu-xlab/GlobalBuildingAtlas",
    attribution: "GlobalBuildingAtlas authors",
    license: "Use only ODbL polygon subset after license review",
    priority: 324,
    truthRole: "building-footprint-context",
    notes: "Do not ingest non-commercial LoD1/height products under this source id."
  },
  {
    id: "global-building-atlas-nc-lod1-height",
    label: "GlobalBuildingAtlas NC LoD1 and height products",
    layerIds: ["buildings"],
    status: "license-gated",
    coverage: "GlobalBuildingAtlas restricted products",
    resolution: "LoD1 and height products",
    sourceUrl: "https://github.com/zhu-xlab/GlobalBuildingAtlas",
    attribution: "GlobalBuildingAtlas authors",
    license: "Non-commercial / Commons-Clause restrictions; blocked without license",
    priority: 326,
    truthRole: "visual-context",
    notes: "Registry-only warning so restricted products are not accidentally used."
  },
  {
    id: "openaddresses",
    label: "OpenAddresses",
    layerIds: ["parcels", "buildings"],
    coverage: "Global where upstream address sources publish open data",
    resolution: "Address points",
    sourceUrl: "https://openaddresses.io/",
    attribution: "OpenAddresses and upstream sources",
    license: "Per-source license review required",
    priority: 340,
    truthRole: "address-context",
    notes:
      "Useful for coarse geocoding/building conflation; exact private addresses stay protected."
  },
  {
    id: "openinframap",
    label: "Open Infrastructure Map",
    layerIds: ["roads", "water", "climate"],
    coverage: "OSM-derived global infrastructure where tagged",
    resolution: "Feature-level OSM infrastructure tags",
    sourceUrl: "https://openinframap.org/",
    attribution: "OpenStreetMap contributors / Open Infrastructure Map",
    license: "ODbL-derived; preserve attribution",
    priority: 350,
    truthRole: "infrastructure-context",
    notes: "Power, telecoms, solar, water, oil, and gas context from OSM tags."
  },
  {
    id: "soilgrids",
    label: "SoilGrids",
    layerIds: ["soil", "vegetation", "landcover", "hydrology"],
    coverage: "Global",
    resolution: "250m modeled soil properties",
    sourceUrl: "https://soilgrids.org/",
    attribution: "ISRIC SoilGrids",
    license: "CC BY 4.0",
    priority: 360,
    truthRole: "soil-context",
    notes: "Global modeled soil context with uncertainty; not a site soil survey."
  },
  {
    id: "usda-ssurgo-gssurgo",
    label: "USDA SSURGO / gSSURGO",
    layerIds: ["soil", "vegetation", "hydrology", "landcover"],
    coverage: "United States",
    resolution: "Soil survey map units and attributes",
    sourceUrl:
      "https://www.nrcs.usda.gov/resources/data-and-reports/soil-survey-geographic-database-ssurgo",
    attribution: "USDA NRCS",
    license: "US public data; preserve source metadata",
    priority: 362,
    truthRole: "soil-context",
    notes:
      "Detailed US soil context for water capacity, limitations, productivity, and flooding attributes."
  },
  {
    id: "dynamic-world",
    label: "Dynamic World",
    layerIds: ["landcover", "vegetation", "ecology", "water"],
    coverage: "Global",
    resolution: "10m near-real-time land cover probabilities",
    sourceUrl: "https://dynamicworld.app/",
    attribution: "Google / WRI Dynamic World",
    license: "Dynamic World terms and attribution required",
    priority: 370,
    truthRole: "landcover-context",
    notes: "Recent landcover probability context; preprocess and preserve class confidence."
  },
  {
    id: "hansen-global-forest-change",
    label: "Hansen Global Forest Change",
    layerIds: ["vegetation", "ecology", "landcover", "climate"],
    coverage: "Global",
    resolution: "30m forest cover/loss/gain products",
    sourceUrl: "https://glad.earthengine.app/view/global-forest-change",
    attribution: "Hansen/UMD/Google/USGS/NASA",
    license: "Open research dataset; terms/citation required",
    priority: 372,
    truthRole: "forest-change-context",
    notes: "Forest cover, loss, gain, and change signals for vegetation context."
  },
  {
    id: "annual-nlcd",
    label: "Annual NLCD",
    layerIds: ["landcover", "vegetation", "ecology", "water"],
    coverage: "United States",
    resolution: "30m annual land cover",
    sourceUrl: "https://www.mrlc.gov/",
    attribution: "MRLC / USGS NLCD",
    license: "US public data; attribution required",
    priority: 374,
    truthRole: "landcover-context",
    notes: "US land use/land cover context and vegetation mask input."
  },
  {
    id: "landfire",
    label: "LANDFIRE",
    layerIds: ["vegetation", "ecology", "climate", "landcover"],
    coverage: "United States",
    resolution: "Vegetation/fuels products",
    sourceUrl: "https://landfire.gov/",
    attribution: "LANDFIRE",
    license: "US public data; attribution required",
    priority: 376,
    truthRole: "fire-vegetation-context",
    notes: "Vegetation, fuel, disturbance, and fire-regime context for fire-risk packages."
  },
  {
    id: "nasa-gedi-canopy",
    label: "NASA GEDI canopy metrics",
    layerIds: ["vegetation", "ecology", "landcover"],
    coverage: "Approximately 52S to 52N",
    resolution: "Canopy and ground metrics at coarse grids/footprints",
    sourceUrl: "https://gedi.umd.edu/",
    attribution: "NASA GEDI",
    license: "NASA open data terms",
    priority: 378,
    truthRole: "canopy-context",
    notes: "Canopy height and structure context; not individual tree truth."
  }
];

export function getEnvironmentPackageSources(): GeospatialSourceCandidate[] {
  return THEMATIC_SOURCES.map((entry) =>
    source({
      ...entry,
      status: entry.status ?? "preprocessing-required",
      access: entry.status === "license-gated" ? "license-gated" : "open",
      artifactKinds: ["geoparquet", "vector-tiles", "pmtiles", "h3-summary", "manifest"],
      packageReady: entry.status !== "license-gated",
      priority: entry.priority,
      probeStrategy: entry.status === "license-gated" ? "manual-review" : "bulk-preprocess",
      limitations: [
        "Requires source version, license, coverage, and confidence review per AOI.",
        "Package workers must preserve upstream attribution and transformation metadata."
      ]
    })
  );
}

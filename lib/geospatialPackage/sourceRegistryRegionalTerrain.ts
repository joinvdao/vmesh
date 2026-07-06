import type { GeospatialSourceCandidate } from "@/lib/geospatialPackage/types";
import { source } from "@/lib/geospatialPackage/sourceRegistryHelpers";

interface RegionalTerrainSource {
  id: string;
  label: string;
  coverage: string;
  resolution: string;
  sourceUrl: string;
  attribution: string;
  license: string;
  truthRole?: string;
  notes: string;
}

const REGIONAL_TERRAIN_SOURCES: RegionalTerrainSource[] = [
  {
    id: "opentopography",
    label: "OpenTopography",
    coverage: "Catalog-dependent global and regional LiDAR/DEM collections",
    resolution: "Dataset-dependent",
    sourceUrl: "https://opentopography.org/developers",
    attribution: "OpenTopography and upstream data providers",
    license: "Dataset-specific terms; API key may be required",
    notes: "High-resolution DEM/LiDAR discovery and clipping path; no browser calls in V1."
  },
  {
    id: "environment-agency-lidar-dtm",
    label: "Environment Agency England LiDAR DTM",
    coverage: "England",
    resolution: "Often 1m to 2m DTM/DSM products",
    sourceUrl: "https://environment.data.gov.uk/DefraDataDownload/",
    attribution: "Environment Agency",
    license: "Open Government Licence where applicable",
    notes: "Best England open terrain upgrade where coverage exists."
  },
  {
    id: "scottish-remote-sensing-lidar",
    label: "Scottish Remote Sensing Portal LiDAR",
    coverage: "Scotland where phase coverage exists",
    resolution: "1m DTM/DSM where available",
    sourceUrl: "https://remotesensingdata.gov.scot/",
    attribution: "Scottish Government Remote Sensing Portal",
    license: "Open Scottish public data; dataset terms apply",
    notes: "Best Scotland terrain upgrade where detailed coverage exists."
  },
  {
    id: "os-terrain-50",
    label: "OS Terrain 50",
    coverage: "Great Britain",
    resolution: "50m DTM",
    sourceUrl: "https://www.ordnancesurvey.co.uk/products/os-terrain-50",
    attribution: "Ordnance Survey",
    license: "OS OpenData terms",
    notes: "Coarse open GB terrain fallback below higher-resolution DTM/LiDAR sources."
  },
  {
    id: "spain-cnig-mdt",
    label: "Spain CNIG MDT01/MDT02",
    coverage: "Spain",
    resolution: "1m/2m DTM where coverage exists",
    sourceUrl: "https://centrodedescargas.cnig.es/",
    attribution: "CNIG / IGN Spain",
    license: "CNIG/IGN open data terms",
    notes: "Strong Iberian terrain source for local packages."
  },
  {
    id: "kamloops-local-lidar-dtm-1m",
    label: "Kamloops operator-local municipal LiDAR DTM",
    coverage:
      "City of Kamloops / Rose Hill operator-retained municipal DTM coverage where configured",
    resolution:
      "1m bare-earth DTM where the operator-retained municipal source pack covers the AOI",
    sourceUrl: "https://maps.kamloops.ca/arcgis/rest/services",
    attribution: "City of Kamloops and operator-retained source-pack evidence",
    license: "Operator-retained municipal/source-pack terms; public-safe downstream artifacts only",
    notes:
      "VMesh indexes this as a configured local source rail only. It does not store the municipal DTM payload; Abundance must fetch/window/QA the configured operator endpoint before claiming golden-quality terrain."
  },
  {
    id: "canada-hrdem",
    label: "Canada HRDEM",
    coverage: "Canada where HRDEM/LiDAR coverage exists",
    resolution:
      "Official HRDEM/provincial source resolution must be resolved per tile; Mapterhorn cahrdem2 parity is partial 2m, not country-wide 1m",
    sourceUrl: "https://open.canada.ca/data/en/dataset/0fe65119-e96e-4a57-8bfe-9d9245fba06b",
    attribution: "Natural Resources Canada",
    license: "Open Government Licence - Canada",
    notes:
      "Use Mapterhorn only as an attribution/source-family clue. For 1m Canada DTM/DSM, resolve direct official HRDEM/provincial source COGs or archives and record lower-resolution gaps honestly."
  },
  {
    id: "canada-hrdem-best-dtm",
    label: "Canada HRDEM best available DTM",
    coverage: "Canada where HRDEM/LiDAR coverage exists",
    resolution:
      "Best official bare-earth DTM source: 1m where an HRDEM/provincial source proves it, otherwise explicit 2m HRDEM where that is the best official source",
    sourceUrl: "https://open.canada.ca/data/en/dataset/0fe65119-e96e-4a57-8bfe-9d9245fba06b",
    attribution: "Natural Resources Canada",
    license: "Open Government Licence - Canada",
    notes:
      "Use only for practical Canada DTM package/viewer fallback when strict 1m is unavailable. It must preserve exact resolved source resolution and must not be counted as strict 1m milestone evidence."
  },
  {
    id: "canada-hrdem-dsm",
    label: "Canada HRDEM DSM",
    coverage: "Canada where HRDEM 1m DSM coverage exists",
    resolution:
      "Official HRDEM 1m DSM only where role-specific hrdem-mosaic-1m source COG coverage is proven",
    sourceUrl: "https://open.canada.ca/data/en/dataset/0fe65119-e96e-4a57-8bfe-9d9245fba06b",
    attribution: "Natural Resources Canada",
    license: "Open Government Licence - Canada",
    truthRole: "surface-dsm",
    notes:
      "Surface model route for canopy/building/obstruction context. It must not be used as bare-earth DTM, and 2m-only HRDEM DSM does not satisfy the current 1m milestone."
  },
  {
    id: "bc-lidarbc",
    label: "British Columbia LidarBC",
    coverage: "British Columbia public LiDAR collections",
    resolution: "Collection-dependent DTM/DSM/LiDAR",
    sourceUrl: "https://www2.gov.bc.ca/gov/content/data/geographic-data-services/lidarbc",
    attribution: "Government of British Columbia",
    license: "BC open data terms",
    notes: "High-value BC terrain source for local packages."
  },
  {
    id: "bc-lidarbc-dsm",
    label: "British Columbia LidarBC DSM",
    coverage: "British Columbia public LiDAR DSM collections where available",
    resolution: "1m DSM where the LidarBC DSM index exposes 1 metre source tiles",
    sourceUrl: "https://www2.gov.bc.ca/gov/content/data/geographic-data-services/lidarbc",
    attribution: "Government of British Columbia",
    license: "BC open data terms",
    truthRole: "surface-dsm",
    notes:
      "Surface model route from the LidarBC DSM index. Use for canopy/building/obstruction context, not bare-earth DTM."
  },
  {
    id: "netherlands-ahn",
    label: "Netherlands AHN",
    coverage: "Netherlands",
    resolution: "High-resolution DTM/DSM",
    sourceUrl: "https://www.ahn.nl/",
    attribution: "AHN Netherlands",
    license: "Dutch open data terms",
    notes: "Excellent national DTM/DSM source."
  },
  {
    id: "linz-nz-elevation",
    label: "LINZ New Zealand elevation",
    coverage: "New Zealand",
    resolution: "Dataset-dependent DEM/DSM/LiDAR",
    sourceUrl: "https://data.linz.govt.nz/",
    attribution: "Toitu Te Whenua LINZ",
    license: "LINZ open data terms",
    notes: "Strong New Zealand open elevation path."
  },
  {
    id: "geoscience-australia-elvis",
    label: "Geoscience Australia ELVIS",
    coverage: "Australia",
    resolution: "National/state elevation collections",
    sourceUrl: "https://elevation.fsdf.org.au/",
    attribution: "Geoscience Australia / ELVIS",
    license: "Australian open data terms vary by collection",
    notes: "Australian elevation discovery route before commercial providers."
  }
];

export function getRegionalTerrainPackageSources(): GeospatialSourceCandidate[] {
  return REGIONAL_TERRAIN_SOURCES.map((entry, index) =>
    source({
      ...entry,
      layerIds: ["terrain", "contours"],
      status:
        entry.id === "opentopography"
          ? "token-gated"
          : entry.id === "kamloops-local-lidar-dtm-1m"
            ? process.env.VMESH_KAMLOOPS_LOCAL_LIDAR_MODE === "configured-geotiff"
              ? "configured"
              : "future"
            : "preprocessing-required",
      access:
        entry.id === "opentopography"
          ? "token-gated"
          : entry.id === "kamloops-local-lidar-dtm-1m"
            ? "local"
            : "open",
      artifactKinds: ["cog", "pmtiles", "h3-summary", "manifest"],
      requiresApiKey: entry.id === "opentopography",
      packageReady: true,
      priority: 500 + index,
      probeStrategy: entry.id === "opentopography" ? "bounded-api" : "catalog-lookup",
      truthRole: entry.truthRole ?? "bare-earth-dtm",
      limitations: [
        "Requires AOI coverage, CRS, vertical datum, license, and source vintage review.",
        "Preprocess to COG/PMTiles/H3 summaries before renderer or downstream app use."
      ]
    })
  );
}

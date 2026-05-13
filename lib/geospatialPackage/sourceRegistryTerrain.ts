import type { GeospatialSourceCandidate } from "@/lib/geospatialPackage/types";
import { source } from "@/lib/geospatialPackage/sourceRegistryHelpers";

export const MAPTERHORN_PACKAGE_TERRAIN_URL = "https://download.mapterhorn.com/planet.pmtiles";
export const MAPZEN_PACKAGE_TERRARIUM_URL =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

export interface TerrainPackageSourceOptions {
  mapterhornPmtilesUrl?: string;
  mapzenTerrariumUrl?: string;
}

export function getTerrainPackageSources(
  options: TerrainPackageSourceOptions = {}
): GeospatialSourceCandidate[] {
  return [
    source({
      id: "mapterhorn-pmtiles-terrain",
      label: "Mapterhorn PMTiles terrain",
      layerIds: ["terrain", "contours"],
      status: "open",
      artifactKinds: ["pmtiles", "raster-tiles", "manifest"],
      coverage: "Global terrain archive",
      resolution: "Multi-resolution global DEM",
      sourceUrl: options.mapterhornPmtilesUrl ?? MAPTERHORN_PACKAGE_TERRAIN_URL,
      attribution: "Mapterhorn and upstream terrain source contributors",
      license: "Open terrain data with source attribution required",
      mapReady: true,
      packageReady: true,
      priority: 10,
      probeStrategy: "static-url",
      truthRole: "generic-dem",
      limitations: [
        "Treat as generic DEM unless tile-level metadata proves bare-earth DTM semantics.",
        "Contours should be precomputed from DEM sources before production use."
      ],
      notes: "Primary open terrain layer and package-ready PMTiles source."
    }),
    source({
      id: "mapzen-joerd-terrarium",
      label: "Mapzen / Joerd Terrarium tiles",
      layerIds: ["terrain", "contours"],
      status: "open",
      artifactKinds: ["raster-tiles", "manifest"],
      coverage: "Global mixed-source DEM",
      resolution: "Mixed global DEM",
      sourceUrl: options.mapzenTerrariumUrl ?? MAPZEN_PACKAGE_TERRARIUM_URL,
      attribution: "Tilezen Joerd / Mapzen terrain contributors",
      license: "Open data compilation; upstream terms require review",
      mapReady: true,
      packageReady: true,
      priority: 20,
      probeStrategy: "static-url",
      truthRole: "generic-dem",
      limitations: ["Good no-token fallback, but not site-survey terrain truth."],
      notes: "Fallback open Terrarium terrain source when PMTiles fails."
    }),
    source({
      id: "usgs-3dep",
      label: "USGS 3DEP",
      layerIds: ["terrain", "hydrology", "contours"],
      status: "preprocessing-required",
      artifactKinds: ["cog", "pmtiles", "h3-summary", "manifest"],
      coverage: "United States",
      resolution: "1m to 10m where LiDAR/DEM coverage exists",
      sourceUrl: "https://www.usgs.gov/3d-elevation-program",
      attribution: "USGS 3D Elevation Program",
      license: "US public data; preserve dataset metadata",
      packageReady: true,
      priority: 40,
      probeStrategy: "catalog-lookup",
      truthRole: "bare-earth-dtm",
      limitations: ["Coverage and vertical datum must be checked per AOI."],
      notes: "Best open terrain upgrade for supported US AOIs."
    }),
    source({
      id: "noaa-cudem",
      label: "NOAA / CIRES CUDEM",
      layerIds: ["terrain", "hydrology", "contours"],
      status: "preprocessing-required",
      artifactKinds: ["cog", "pmtiles", "h3-summary", "manifest"],
      coverage: "US coastal and topobathymetric zones",
      resolution: "Regional products, often 1/9 to 1/3 arc-second",
      sourceUrl: "https://www.ncei.noaa.gov/products/coastal-elevation-models",
      attribution: "NOAA NCEI CUDEM",
      license: "US public data; dataset notices apply",
      packageReady: true,
      priority: 42,
      probeStrategy: "catalog-lookup",
      truthRole: "topobathy",
      limitations: ["Coastal/topobathy source, not a global inland terrain default."],
      notes: "High-value coastal elevation and flood-context source."
    }),
    source({
      id: "copernicus-dem-glo30",
      label: "Copernicus DEM GLO-30/GLO-90",
      layerIds: ["terrain", "contours"],
      status: "preprocessing-required",
      artifactKinds: ["cog", "pmtiles", "h3-summary"],
      coverage: "Global",
      resolution: "30m and 90m DSM products",
      sourceUrl: "https://spacedata.copernicus.eu/collections/copernicus-digital-elevation-model",
      attribution: "Copernicus DEM",
      license: "Copernicus DEM terms and attribution required",
      packageReady: true,
      priority: 70,
      probeStrategy: "bulk-preprocess",
      truthRole: "surface-dsm",
      limitations: ["DSM/global fallback; local DTM should outrank it where available."],
      notes: "Global fallback and comparison terrain source."
    }),
    source({
      id: "fabdem-v1-2",
      label: "FABDEM V1-2",
      layerIds: ["terrain", "contours"],
      status: "license-gated",
      access: "license-gated",
      artifactKinds: ["cog", "pmtiles", "h3-summary"],
      coverage: "60S to 80N land areas",
      resolution: "About 30m at the equator",
      sourceUrl: "https://data.bris.ac.uk/data/dataset/s5hqmjcdj8yo2ibzi9b4ew3sn",
      attribution: "University of Bristol / Fathom FABDEM",
      license: "CC BY-NC-SA 4.0 unless separately licensed",
      packageReady: true,
      priority: 90,
      probeStrategy: "manual-review",
      truthRole: "inferred-bare-earth",
      limitations: [
        "Non-commercial public release; do not use commercially without license review."
      ],
      notes: "Promising inferred bare-earth terrain source behind a license gate."
    })
  ];
}

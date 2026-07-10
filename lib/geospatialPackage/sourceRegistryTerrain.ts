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
        "Visual fallback only for the terrain worker objective; do not sample or render Mapterhorn tiles as source-native DTM/DSM truth.",
        "Treat as generic DEM unless tile-level metadata proves bare-earth DTM semantics.",
        "Contours should be precomputed from DEM sources before production use."
      ],
      notes:
        "Map-ready terrain fallback and upstream attribution reference. Source-native workers must resolve the official upstream source directly."
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
      notes:
        "Fallback open Terrarium visual source. Source-native workers must resolve official upstream terrain sources directly."
    }),
    source({
      id: "usgs-3dep",
      label: "USGS 3DEP",
      layerIds: ["terrain", "hydrology", "contours"],
      status: "preprocessing-required",
      artifactKinds: ["cog", "pmtiles", "h3-summary", "manifest"],
      coverage: "United States where the USGS 3DEP 1m product index covers the AOI",
      resolution: "1m DEM where covered; fail closed rather than silently falling back",
      sourceUrl: "https://www.sciencebase.gov/catalog/item/543e6b86e4b0fd76af69cf4c",
      attribution: "U.S. Geological Survey 3D Elevation Program",
      license: "Public Domain (U.S. Government Work)",
      packageReady: true,
      priority: 40,
      probeStrategy: "catalog-lookup",
      truthRole: "bare-earth-dtm",
      limitations: ["Coverage and vertical datum must be checked per AOI."],
      notes: "Mapterhorn uses the same USGS 1m DEM collection, split into us1* source buckets."
    }),
    source({
      id: "usgs-3dep-lpc-dsm",
      label: "USGS 3DEP Lidar Point Cloud DSM",
      layerIds: ["terrain"],
      status: "preprocessing-required",
      artifactKinds: ["cog", "pmtiles", "h3-summary", "manifest"],
      coverage:
        "United States where the USGS 3DEP Lidar Point Cloud source index covers the AOI with suitable 1m-class source data",
      resolution:
        "DSM derivation target is 1m only where the source LPC project meets 3DEP LPC requirements and source DEM GSD is <= 1m",
      sourceUrl:
        "https://index.nationalmap.gov/arcgis/rest/services/3DEPElevationIndex/MapServer/8",
      attribution: "U.S. Geological Survey 3D Elevation Program",
      license: "Public Domain (U.S. Government Work); source project notices apply",
      packageReady: true,
      priority: 41,
      probeStrategy: "catalog-lookup",
      truthRole: "surface-dsm",
      limitations: [
        "Not a browser tile source.",
        "Requires point-cloud enumeration/download and PDAL/LAZ processing before a DSM tile or COG can be emitted.",
        "Must not be used as bare-earth DTM."
      ],
      notes:
        "USA DSM path from official 3DEP LPC source projects. Use after DTM proof when canopy/building/obstruction surface context is required."
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
      status: "open",
      artifactKinds: ["cog", "api", "manifest"],
      coverage: "Global land; public buckets intentionally omit ocean tiles",
      resolution: "30m and 90m DSM products",
      sourceUrl: "https://copernicus-dem-30m-stac.s3.amazonaws.com/dem_cop_30.json",
      attribution: "Copernicus DEM via AWS Open Data",
      license: "Copernicus DEM free licence; European Union/ESA attribution required",
      mapReady: false,
      packageReady: true,
      priority: 70,
      probeStrategy: "stac-search",
      truthRole: "surface-dsm",
      limitations: [
        "DSM/global fallback; local DTM should outrank it where available.",
        "GLO-30 availability has country-specific limitations; use public GLO-90 as the next land fallback.",
        "Ocean COGs are absent by design and may be represented as zero elevation only after both public products return verified 404 responses."
      ],
      notes:
        "Deterministic public STAC/COG index. Consumers range-read the public GLO-30 and GLO-90 buckets; VMesh stores source discovery metadata, not raster payloads."
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

export interface CanonicalPromotionMetadata {
  sourceId: string;
  label: string;
  attribution: string;
  license: string;
  dataBucket: string;
  layerIds: string[];
  artifactKinds: string[];
}

export const CANONICAL_PROMOTION_METADATA: CanonicalPromotionMetadata[] = [
  {
    sourceId: "copernicus-dem-glo30",
    label: "Copernicus DEM GLO-30/GLO-90",
    attribution: "Copernicus DEM via AWS Open Data",
    license: "Copernicus DEM free licence; European Union/ESA attribution required",
    dataBucket: "terrain_elevation",
    layerIds: ["terrain", "contours"],
    artifactKinds: ["cog", "api", "manifest"]
  },
  {
    sourceId: "usgs-3dep",
    label: "USGS 3DEP",
    attribution: "U.S. Geological Survey 3D Elevation Program",
    license: "Public Domain (U.S. Government Work)",
    dataBucket: "terrain_elevation",
    layerIds: ["terrain", "hydrology", "contours"],
    artifactKinds: ["cog", "pmtiles", "h3-summary", "manifest"]
  },
  {
    sourceId: "esa-worldcover",
    label: "ESA WorldCover",
    attribution: "ESA WorldCover",
    license: "ESA WorldCover terms and attribution required",
    dataBucket: "soils_landcover",
    layerIds: ["landcover", "vegetation", "ecology"],
    artifactKinds: ["cog", "pmtiles", "h3-summary", "manifest"]
  },
  {
    sourceId: "overture-maps-geoparquet",
    label: "Overture Maps GeoParquet",
    attribution: "Overture Maps Foundation and source contributors",
    license: "Open data with per-theme attribution and source terms",
    dataBucket: "access_infrastructure",
    layerIds: ["roads", "buildings", "water", "landcover", "parcels"],
    artifactKinds: ["geoparquet", "vector-tiles", "pmtiles", "h3-summary"]
  },
  {
    sourceId: "open-meteo-forecast",
    label: "Open-Meteo forecast",
    attribution: "Open-Meteo",
    license: "Open-Meteo terms apply",
    dataBucket: "climate_weather",
    layerIds: ["climate"],
    artifactKinds: ["api", "h3-summary", "manifest"]
  },
  {
    sourceId: "soilgrids",
    label: "SoilGrids",
    attribution: "ISRIC SoilGrids",
    license: "CC BY 4.0",
    dataBucket: "soils_landcover",
    layerIds: ["soil", "vegetation", "landcover", "hydrology"],
    artifactKinds: ["api", "h3-summary", "manifest"]
  }
];

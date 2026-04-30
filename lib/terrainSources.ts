import type {
  RasterDEMSourceSpecification,
  RasterSourceSpecification,
  StyleSpecification
} from "maplibre-gl";

import type { TerrainProviderConfig } from "@/lib/vmeshTypes";

export const TERRAIN_SOURCE_ID = "terrain-source";

export function getTerrainProviderRegistry(envTileJsonUrl?: string): TerrainProviderConfig[] {
  const providers: TerrainProviderConfig[] = [];

  if (envTileJsonUrl) {
    providers.push({
      id: "env-raster-dem",
      label: "Configured DEM",
      kind: "raster-dem-tilejson",
      encoding: "mapbox",
      tileSize: 256,
      maxzoom: 14,
      attribution: "Configured terrain provider",
      license: "Project-configured",
      requiresApiKey: false,
      coverage: "Configured by environment",
      resolution: "Configured by environment",
      status: "available",
      sourceUrl: envTileJsonUrl,
      notes: "Highest-priority terrain source when NEXT_PUBLIC_TERRAIN_TILEJSON_URL is set."
    });
  }

  return [
    ...providers,
    {
      id: "maplibre-demo-dem",
      label: "MapLibre demo terrain",
      kind: "raster-dem-tilejson",
      encoding: "mapbox",
      tileSize: 256,
      maxzoom: 12,
      attribution: "MapLibre demo terrain",
      license: "Open demo tiles",
      requiresApiKey: false,
      coverage: "Global sample",
      resolution: "Demo terrain",
      status: "fallback",
      sourceUrl: "https://demotiles.maplibre.org/terrain-tiles/tiles.json",
      notes: "No-token terrain fallback for browser verification and V1 plumbing."
    },
    {
      id: "mapzen-joerd-terrarium",
      label: "Mapzen Joerd Terrarium",
      kind: "raster-dem-xyz",
      encoding: "terrarium",
      tileSize: 256,
      maxzoom: 13,
      attribution: "Tilezen Joerd / Mapzen terrain tiles",
      license: "Open data compilation; verify source terms before production use",
      requiresApiKey: false,
      coverage: "Global DEM with bathymetry",
      resolution: "Mixed source DEM",
      status: "future",
      sourceUrl: "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
      notes: "Terrarium XYZ pattern for future fallback or selectable source."
    },
    {
      id: "mapterhorn-pmtiles",
      label: "Mapterhorn PMTiles",
      kind: "pmtiles-raster-dem",
      encoding: "pmtiles",
      tileSize: 512,
      maxzoom: 14,
      attribution: "Mapterhorn open terrain tiles",
      license: "BSD/open-data source attributions required",
      requiresApiKey: false,
      coverage: "Global plus higher-resolution regional datasets",
      resolution: "Copernicus/global with regional lidar roadmap",
      status: "future",
      sourceUrl: "https://download.mapterhorn.com/planet.pmtiles",
      notes: "First-class future provider; requires PMTiles protocol registration before live use."
    },
    {
      id: "noaa-cudem",
      label: "NOAA CUDEM",
      kind: "dataset-dem",
      encoding: "cog",
      attribution: "NOAA NCEI CUDEM",
      license: "US public data; verify dataset-specific notices",
      requiresApiKey: false,
      coverage: "US coastal and bathymetric/topographic regions",
      resolution: "1/9 to 1/3 arc-second regional products",
      status: "preprocessing-required",
      sourceUrl: "https://www.ncei.noaa.gov/products/coastal-elevation-models",
      notes: "Future ingestion source; preprocess to COG, PMTiles, or Terrarium tiles."
    },
    {
      id: "fabdem-v1-2",
      label: "FABDEM V1-2",
      kind: "dataset-dem",
      encoding: "geotiff",
      attribution: "University of Bristol / Fathom FABDEM",
      license: "CC BY-NC-SA 4.0; commercial license required for commercial use",
      requiresApiKey: false,
      coverage: "60S to 80N land elevations",
      resolution: "1 arc-second, about 30m at equator",
      status: "requires-license",
      sourceUrl: "https://data.bris.ac.uk/data/dataset/s5hqmjcdj8yo2ibzi9b4ew3sn",
      notes:
        "Future bare-earth DEM source; do not use for commercial production without license review."
    },
    {
      id: "opentopography-globaldem",
      label: "OpenTopography Global DEM API",
      kind: "api-dem",
      encoding: "api",
      attribution: "OpenTopography",
      license: "Dataset-specific terms",
      requiresApiKey: true,
      coverage: "Dataset-dependent global and regional DEMs",
      resolution: "Dataset-dependent",
      status: "requires-api-key",
      sourceUrl: "https://opentopography.org/developers",
      notes: "Future clipped DEM API path; not called in V1."
    },
    {
      id: "stac-open-terrain-catalog",
      label: "Open terrain STAC catalog",
      kind: "stac-catalog",
      encoding: "stac",
      attribution: "Provider-specific",
      license: "Provider-specific",
      requiresApiKey: false,
      coverage: "Catalog-dependent",
      resolution: "Catalog-dependent",
      status: "future",
      sourceUrl: "https://mapterhorn.com",
      notes: "Future catalog discovery layer for Mapterhorn-style terrain collections."
    }
  ];
}

export function selectTerrainProvider(providers: TerrainProviderConfig[]): TerrainProviderConfig {
  return (
    providers.find((provider) => provider.id === "env-raster-dem") ??
    providers.find((provider) => provider.id === "maplibre-demo-dem") ??
    providers[0]
  );
}

export function toRasterDemSource(
  provider: TerrainProviderConfig
): RasterDEMSourceSpecification | null {
  if (provider.kind === "raster-dem-tilejson") {
    return {
      type: "raster-dem",
      url: provider.sourceUrl,
      tileSize: provider.tileSize ?? 256,
      maxzoom: provider.maxzoom,
      attribution: provider.attribution,
      encoding: provider.encoding === "terrarium" ? "terrarium" : "mapbox"
    };
  }

  if (provider.kind === "raster-dem-xyz") {
    return {
      type: "raster-dem",
      tiles: [provider.sourceUrl],
      tileSize: provider.tileSize ?? 256,
      maxzoom: provider.maxzoom,
      attribution: provider.attribution,
      encoding: provider.encoding === "terrarium" ? "terrarium" : "mapbox"
    };
  }

  return null;
}

export function createLightBasemapStyle(): StyleSpecification {
  const osmRaster: RasterSourceSpecification = {
    type: "raster",
    tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
    tileSize: 256,
    attribution: "OpenStreetMap contributors"
  };

  return {
    version: 8,
    name: "vmesh-light-operational",
    sources: {
      "osm-raster": osmRaster
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: {
          "background-color": "#eef5f4"
        }
      },
      {
        id: "osm-raster",
        type: "raster",
        source: "osm-raster",
        paint: {
          "raster-opacity": 0.72,
          "raster-saturation": -0.38,
          "raster-contrast": -0.08,
          "raster-brightness-min": 0.08,
          "raster-brightness-max": 0.96
        }
      }
    ],
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf"
  };
}

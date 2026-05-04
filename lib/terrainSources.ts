import type {
  RasterDEMSourceSpecification,
  RasterSourceSpecification,
  StyleSpecification
} from "maplibre-gl";

import type { ContourProviderConfig, TerrainProviderConfig } from "@/lib/vmeshTypes";

export const TERRAIN_SOURCE_ID = "terrain-source";
export const ENV_TERRAIN_PROVIDER_ID = "env-raster-dem";
export const MAPTERHORN_PROVIDER_ID = "mapterhorn-pmtiles";
export const MAPZEN_PROVIDER_ID = "mapzen-joerd-terrarium";
export const MAPLIBRE_DEMO_PROVIDER_ID = "maplibre-demo-dem";
export const MAPTERHORN_DEFAULT_PMTILES_URL = "https://download.mapterhorn.com/planet.pmtiles";
export const MAPZEN_DEFAULT_TERRARIUM_URL =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
export const CONTOUR_PLACEHOLDER_PROVIDER_ID = "dem-derived-contours-placeholder";

export interface TerrainProviderRegistryOptions {
  envTileJsonUrl?: string;
  preferredProviderId?: string;
  mapterhornPmtilesUrl?: string;
  mapzenTerrariumUrl?: string;
}

function withPriority(
  provider: Omit<TerrainProviderConfig, "priority">,
  priority: number
): TerrainProviderConfig {
  return { ...provider, priority };
}

function toPmtilesProtocolUrl(sourceUrl: string): string {
  return sourceUrl.startsWith("pmtiles://") ? sourceUrl : `pmtiles://${sourceUrl}`;
}

export function getTerrainProviderRegistry(
  options: TerrainProviderRegistryOptions | string = {}
): TerrainProviderConfig[] {
  const normalizedOptions: TerrainProviderRegistryOptions =
    typeof options === "string" ? { envTileJsonUrl: options } : options;
  const providers: TerrainProviderConfig[] = [];

  if (normalizedOptions.envTileJsonUrl) {
    providers.push(
      withPriority(
        {
          id: ENV_TERRAIN_PROVIDER_ID,
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
          sourceUrl: normalizedOptions.envTileJsonUrl,
          notes: "Highest-priority terrain source when NEXT_PUBLIC_TERRAIN_TILEJSON_URL is set."
        },
        0
      )
    );
  }

  const mapterhornPmtilesUrl =
    normalizedOptions.mapterhornPmtilesUrl ?? MAPTERHORN_DEFAULT_PMTILES_URL;
  const mapzenTerrariumUrl = normalizedOptions.mapzenTerrariumUrl ?? MAPZEN_DEFAULT_TERRARIUM_URL;

  const registry: TerrainProviderConfig[] = [
    ...providers,
    withPriority(
      {
        id: MAPTERHORN_PROVIDER_ID,
        label: "Mapterhorn PMTiles",
        kind: "pmtiles-raster-dem",
        encoding: "terrarium",
        tileSize: 512,
        maxzoom: 12,
        attribution: "Mapterhorn open terrain tiles",
        license: "BSD/open-data source attributions required",
        requiresApiKey: false,
        coverage: "Global terrain archive",
        resolution: "Global multi-resolution terrain archive",
        status: "available",
        sourceUrl: mapterhornPmtilesUrl,
        notes:
          "Primary open terrain provider. Loaded through pmtiles:// with Terrarium RGB elevation encoding."
      },
      10
    ),
    withPriority(
      {
        id: MAPZEN_PROVIDER_ID,
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
        status: "fallback",
        sourceUrl: mapzenTerrariumUrl,
        notes: "No-token Terrarium XYZ fallback when Mapterhorn PMTiles is unavailable."
      },
      20
    ),
    withPriority(
      {
        id: MAPLIBRE_DEMO_PROVIDER_ID,
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
        notes: "No-token TileJSON terrain fallback for browser verification."
      },
      30
    ),
    withPriority(
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
      90
    ),
    withPriority(
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
      91
    ),
    withPriority(
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
      92
    ),
    withPriority(
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
      },
      93
    )
  ];

  const deduped = registry.filter(
    (provider, index, allProviders) =>
      provider.sourceUrl.length > 0 &&
      allProviders.findIndex((candidate) => candidate.id === provider.id) === index
  );

  if (normalizedOptions.preferredProviderId) {
    return deduped.sort((a, b) => {
      if (a.id === normalizedOptions.preferredProviderId) return -1;
      if (b.id === normalizedOptions.preferredProviderId) return 1;
      return a.priority - b.priority;
    });
  }

  return deduped.sort((a, b) => a.priority - b.priority);
}

export function getTerrainProviderCandidates(
  providers: TerrainProviderConfig[],
  preferredProviderId?: string
): TerrainProviderConfig[] {
  const priorityIds = [
    ENV_TERRAIN_PROVIDER_ID,
    preferredProviderId,
    MAPTERHORN_PROVIDER_ID,
    MAPZEN_PROVIDER_ID,
    MAPLIBRE_DEMO_PROVIDER_ID
  ].filter((id): id is string => Boolean(id));
  const byId = new Map(providers.map((provider) => [provider.id, provider]));
  const ordered: TerrainProviderConfig[] = [];

  priorityIds.forEach((id) => {
    const provider = byId.get(id);
    if (provider && toRasterDemSource(provider) !== null && !ordered.includes(provider)) {
      ordered.push(provider);
    }
  });

  providers.forEach((provider) => {
    if (toRasterDemSource(provider) !== null && !ordered.includes(provider)) {
      ordered.push(provider);
    }
  });

  return ordered;
}

export function selectTerrainProvider(
  providers: TerrainProviderConfig[],
  preferredProviderId?: string
): TerrainProviderConfig {
  return getTerrainProviderCandidates(providers, preferredProviderId)[0] ?? providers[0];
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

  if (provider.kind === "pmtiles-raster-dem") {
    return {
      type: "raster-dem",
      url: toPmtilesProtocolUrl(provider.sourceUrl),
      tileSize: provider.tileSize ?? 512,
      maxzoom: provider.maxzoom,
      attribution: provider.attribution,
      encoding: "terrarium"
    };
  }

  return null;
}

export function getContourProviderRegistry(): ContourProviderConfig[] {
  return [
    {
      id: CONTOUR_PLACEHOLDER_PROVIDER_ID,
      label: "DEM-derived contour placeholder",
      kind: "derived-dem-placeholder",
      status: "fallback",
      intervalMeters: 50,
      attribution: "Derived from active DEM provider when preprocessing is available",
      notes:
        "Visible contour affordance only. Browser MapLibre uses raster-dem terrain; production contours should be precomputed into vector tiles or contour PMTiles."
    },
    {
      id: "precomputed-contours-pmtiles",
      label: "Precomputed contour PMTiles",
      kind: "precomputed-vector-pmtiles",
      status: "unavailable",
      sourceUrl: "pmtiles://local-or-hosted-contours.pmtiles",
      intervalMeters: 20,
      attribution: "Future preprocessed DEM contour tiles",
      notes: "Typed future provider for maintained vector contours generated outside the browser."
    }
  ];
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
    name: "vmesh-civic-globe",
    sources: {
      "osm-raster": osmRaster
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: {
          "background-color": "#020915"
        }
      },
      {
        id: "osm-raster",
        type: "raster",
        source: "osm-raster",
        paint: {
          "raster-opacity": 0.72,
          "raster-saturation": -0.42,
          "raster-contrast": 0.02,
          "raster-brightness-min": 0.02,
          "raster-brightness-max": 0.86
        }
      }
    ],
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf"
  };
}

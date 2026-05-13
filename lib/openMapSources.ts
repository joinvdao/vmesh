import type { OpenMapLayerId, OpenMapSourceConfig } from "@/lib/vmeshTypes";

export const OSM_RASTER_OPEN_MAP_SOURCE_ID = "openstreetmap-raster";
export const OPENFREEMAP_OPEN_MAP_SOURCE_ID = "openfreemap-vector";
export const PROTOMAPS_OPEN_MAP_SOURCE_ID = "protomaps-pmtiles";
export const OVERTURE_OPEN_MAP_SOURCE_ID = "overture-maps-geoparquet";
export const OSM_PBF_EXTRACT_SOURCE_ID = "openstreetmap-pbf-extract";
export const NATURAL_EARTH_SOURCE_ID = "natural-earth-context";
export const OPENADDRESSES_SOURCE_ID = "openaddresses";
export const OPEN_LIDAR_POINT_CLOUD_SOURCE_ID = "open-lidar-ept-point-cloud";

export interface OpenMapSourceRegistryOptions {
  protomapsPmtilesUrl?: string;
  openFreeMapStyleUrl?: string;
  osmRasterTileUrl?: string;
}

export interface OpenMapFunnelSummary {
  totalSources: number;
  mapReadySources: number;
  preprocessingSources: number;
  tokenFreeSources: number;
  layers: Record<OpenMapLayerId, number>;
}

function withPriority(
  provider: Omit<OpenMapSourceConfig, "priority">,
  priority: number
): OpenMapSourceConfig {
  return { ...provider, priority };
}

function createLayerCount(): Record<OpenMapLayerId, number> {
  return {
    basemap: 0,
    land: 0,
    water: 0,
    "land-use": 0,
    roads: 0,
    buildings: 0,
    places: 0,
    addresses: 0,
    admin: 0,
    contours: 0,
    "point-cloud": 0
  };
}

export function getOpenMapSourceRegistry(
  options: OpenMapSourceRegistryOptions = {}
): OpenMapSourceConfig[] {
  const protomapsStatus = options.protomapsPmtilesUrl ? "available" : "future";

  return [
    withPriority(
      {
        id: OSM_RASTER_OPEN_MAP_SOURCE_ID,
        label: "OpenStreetMap raster tiles",
        kind: "osm-raster-tiles",
        layers: ["basemap", "roads", "places", "water", "land", "admin"],
        sourceUrl: options.osmRasterTileUrl ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: "OpenStreetMap contributors",
        license: "OpenStreetMap data is ODbL; tile usage policy applies",
        requiresApiKey: false,
        status: "fallback",
        processingMode: "map-ready",
        notes:
          "No-token visual fallback. Suitable for local development and nonblank demos, not high-volume production tile traffic."
      },
      10
    ),
    withPriority(
      {
        id: OPENFREEMAP_OPEN_MAP_SOURCE_ID,
        label: "OpenFreeMap vector style",
        kind: "osm-vector-style",
        layers: ["basemap", "roads", "places", "water", "land", "admin", "land-use"],
        sourceUrl: options.openFreeMapStyleUrl ?? "https://tiles.openfreemap.org/styles/liberty",
        attribution: "OpenStreetMap contributors / OpenFreeMap",
        license: "OpenStreetMap-derived; deployment terms require review",
        requiresApiKey: false,
        status: "fallback",
        processingMode: "map-ready",
        notes:
          "Token-free MapLibre vector style candidate. Use as a richer open basemap when service reliability is acceptable."
      },
      20
    ),
    withPriority(
      {
        id: PROTOMAPS_OPEN_MAP_SOURCE_ID,
        label: "Protomaps PMTiles basemap",
        kind: "pmtiles-vector",
        layers: ["basemap", "roads", "places", "water", "land", "admin", "land-use"],
        sourceUrl: options.protomapsPmtilesUrl ?? "",
        attribution: "OpenStreetMap contributors / Protomaps",
        license: "ODbL-derived; preserve attribution and generated-tile license notes",
        requiresApiKey: false,
        status: protomapsStatus,
        processingMode: options.protomapsPmtilesUrl ? "pmtiles-ready" : "preprocess-to-pmtiles",
        notes:
          "Best public-demo/offline direction once a PMTiles archive is configured. Works well with MapLibre and local hub bundles."
      },
      30
    ),
    withPriority(
      {
        id: OVERTURE_OPEN_MAP_SOURCE_ID,
        label: "Overture Maps GeoParquet",
        kind: "geoparquet-catalog",
        layers: ["roads", "buildings", "places", "addresses", "admin", "land-use", "water"],
        sourceUrl: "https://docs.overturemaps.org/",
        attribution: "Overture Maps Foundation and source contributors",
        license: "Open data with per-theme source attribution and license review required",
        requiresApiKey: false,
        status: "preprocessing-required",
        processingMode: "preprocess-to-postgis",
        notes:
          "High-value open map data catalog for buildings, transportation, places, addresses, divisions, base land/water, and source attribution. Query server-side and aggregate into H3."
      },
      40
    ),
    withPriority(
      {
        id: OSM_PBF_EXTRACT_SOURCE_ID,
        label: "OpenStreetMap PBF extracts",
        kind: "pbf-extract",
        layers: ["roads", "buildings", "places", "water", "land-use", "admin"],
        sourceUrl: "https://planet.openstreetmap.org/",
        attribution: "OpenStreetMap contributors",
        license: "ODbL; share-alike obligations and attribution apply",
        requiresApiKey: false,
        status: "preprocessing-required",
        processingMode: "preprocess-to-postgis",
        notes:
          "Canonical raw OSM path for self-hosted vmesh. Convert regional extracts into PostGIS, PMTiles, or H3 summaries rather than querying public tiles as data."
      },
      50
    ),
    withPriority(
      {
        id: NATURAL_EARTH_SOURCE_ID,
        label: "Natural Earth context",
        kind: "natural-earth",
        layers: ["land", "water", "admin"],
        sourceUrl: "https://www.naturalearthdata.com/",
        attribution: "Natural Earth",
        license: "Public domain-style Natural Earth terms; attribution recommended",
        requiresApiKey: false,
        status: "preprocessing-required",
        processingMode: "preprocess-to-pmtiles",
        notes:
          "Small global context dataset for low zoom fallback land, water, and admin layers. Useful for nonblank offline globe shells."
      },
      60
    ),
    withPriority(
      {
        id: OPENADDRESSES_SOURCE_ID,
        label: "OpenAddresses",
        kind: "open-addresses",
        layers: ["addresses"],
        sourceUrl: "https://openaddresses.io/",
        attribution: "OpenAddresses and upstream local sources",
        license: "Per-source license review required",
        requiresApiKey: false,
        status: "preprocessing-required",
        processingMode: "preprocess-to-postgis",
        notes:
          "Useful for coarse geocoding and Overture address enrichment. Do not expose exact private addresses by default in public vmesh UI."
      },
      70
    ),
    withPriority(
      {
        id: OPEN_LIDAR_POINT_CLOUD_SOURCE_ID,
        label: "Open LiDAR EPT sidecar",
        kind: "ept-point-cloud",
        layers: ["point-cloud", "contours"],
        sourceUrl: "",
        attribution: "Dataset-specific LiDAR provider",
        license: "Dataset-specific",
        requiresApiKey: false,
        status: "future",
        processingMode: "reference-only",
        notes:
          "Reference pattern from LiDAR portals: keep point clouds in a dedicated Potree/EPT/Cesium sidecar, and feed vmesh with derived DEM, contours, footprints, or H3 summaries."
      },
      90
    )
  ].sort((a, b) => a.priority - b.priority);
}

export function getOpenMapSourcesByLayer(
  providers: OpenMapSourceConfig[],
  layerId: OpenMapLayerId
): OpenMapSourceConfig[] {
  return providers
    .filter((provider) => provider.layers.includes(layerId))
    .sort((a, b) => a.priority - b.priority);
}

export function getMapReadyOpenMapSources(providers: OpenMapSourceConfig[]): OpenMapSourceConfig[] {
  return providers.filter(
    (provider) =>
      (provider.status === "available" || provider.status === "fallback") &&
      (provider.processingMode === "map-ready" || provider.processingMode === "pmtiles-ready")
  );
}

export function createOpenMapFunnelSummary(providers: OpenMapSourceConfig[]): OpenMapFunnelSummary {
  const layers = createLayerCount();

  providers.forEach((provider) => {
    provider.layers.forEach((layerId) => {
      layers[layerId] += 1;
    });
  });

  return {
    totalSources: providers.length,
    mapReadySources: getMapReadyOpenMapSources(providers).length,
    preprocessingSources: providers.filter((provider) =>
      provider.processingMode.startsWith("preprocess")
    ).length,
    tokenFreeSources: providers.filter((provider) => !provider.requiresApiKey).length,
    layers
  };
}

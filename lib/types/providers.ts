export type TerrainProviderKind =
  | "raster-dem-xyz"
  | "raster-dem-tilejson"
  | "pmtiles-raster-dem"
  | "source-raster-preview"
  | "api-dem"
  | "dataset-dem"
  | "stac-catalog";

export type TerrainProviderStatus =
  | "idle"
  | "loading"
  | "active"
  | "fallback"
  | "unavailable"
  | "error";

export type BasemapProviderStatus = TerrainProviderStatus;

export type MacroProviderStatus = TerrainProviderStatus;

export type ImageryProviderStatus = TerrainProviderStatus;

export type BasemapProviderKind =
  | "protomaps-pmtiles"
  | "openfreemap-vector"
  | "mapbox-satellite-raster"
  | "maplibre-demo"
  | "custom-style-json"
  | "offline-shell";

export type TerrainProviderAvailability =
  | "available"
  | "fallback"
  | "future"
  | "requires-api-key"
  | "requires-license"
  | "preprocessing-required";

export interface BasemapProviderConfig {
  id: string;
  label: string;
  kind: BasemapProviderKind;
  sourceUrl: string;
  attribution: string;
  license: string;
  requiresApiKey: boolean;
  status: TerrainProviderAvailability;
  priority: number;
  notes: string;
}

export type TerrainEncoding =
  | "terrarium"
  | "mapbox"
  | "raster-preview"
  | "geotiff"
  | "cog"
  | "pmtiles"
  | "stac"
  | "api";

export interface TerrainProviderConfig {
  id: string;
  label: string;
  kind: TerrainProviderKind;
  encoding: TerrainEncoding;
  tileSize?: number;
  maxzoom?: number;
  attribution: string;
  license: string;
  requiresApiKey: boolean;
  coverage: string;
  resolution: string;
  status: TerrainProviderAvailability;
  sourceUrl: string;
  priority: number;
  notes: string;
}

export interface MapStatus {
  map: TerrainProviderStatus;
  basemap: BasemapProviderStatus;
  terrain: TerrainProviderStatus;
  contours: TerrainProviderStatus;
  macro: MacroProviderStatus;
  imagery: ImageryProviderStatus;
  providerId: string;
  basemapProviderId: string;
  macroProviderId: string;
  imageryProviderId: string;
  message: string;
}

export type ContourProviderKind = "derived-dem-placeholder" | "precomputed-vector-pmtiles";

export interface ContourProviderConfig {
  id: string;
  label: string;
  kind: ContourProviderKind;
  status: TerrainProviderStatus;
  sourceUrl?: string;
  intervalMeters: number;
  attribution: string;
  notes: string;
}

export type MacroProviderKind =
  | "open-meteo-forecast"
  | "nasa-power-solar"
  | "era5-cds-reanalysis"
  | "nasa-firms-active-fire"
  | "terrain-derived-flood";

export interface MacroProviderConfig {
  id: string;
  label: string;
  kind: MacroProviderKind;
  sourceUrl: string;
  attribution: string;
  license: string;
  requiresApiKey: boolean;
  status: TerrainProviderAvailability;
  priority: number;
  notes: string;
}

export type ImageryProviderKind =
  | "sentinel2-cog-preview"
  | "sentinel2-sen2sr-pmtiles"
  | "sentinel2-sen2sr-xyz"
  | "mapbox-satellite-global"
  | "mapbox-satellite-optional"
  | "offline-raster-pmtiles";

export interface ImageryProviderConfig {
  id: string;
  label: string;
  kind: ImageryProviderKind;
  sourceUrl: string;
  attribution: string;
  license: string;
  requiresApiKey: boolean;
  status: TerrainProviderAvailability;
  priority: number;
  notes: string;
}

export type OpenMapLayerId =
  | "basemap"
  | "land"
  | "water"
  | "land-use"
  | "roads"
  | "buildings"
  | "places"
  | "addresses"
  | "admin"
  | "contours"
  | "point-cloud";

export type OpenMapSourceKind =
  | "osm-raster-tiles"
  | "osm-vector-style"
  | "pmtiles-vector"
  | "geoparquet-catalog"
  | "pbf-extract"
  | "natural-earth"
  | "open-addresses"
  | "ogc-wms"
  | "ept-point-cloud";

export type OpenMapProcessingMode =
  | "map-ready"
  | "pmtiles-ready"
  | "preprocess-to-pmtiles"
  | "preprocess-to-postgis"
  | "reference-only";

export interface OpenMapSourceConfig {
  id: string;
  label: string;
  kind: OpenMapSourceKind;
  layers: OpenMapLayerId[];
  sourceUrl: string;
  attribution: string;
  license: string;
  requiresApiKey: boolean;
  status: TerrainProviderAvailability;
  processingMode: OpenMapProcessingMode;
  priority: number;
  notes: string;
}

export type ClimateLayerId =
  | "weather"
  | "climate-trend"
  | "solar"
  | "flood"
  | "fire"
  | "drought"
  | "air-quality";

export type ClimateDataSourceKind =
  | "point-forecast-api"
  | "solar-meteo-api"
  | "forecast-grid-open-data"
  | "reanalysis-preprocessing"
  | "active-fire-observation"
  | "terrain-derived-hazard"
  | "climate-model-preprocessing";

export type ClimateQueryMode =
  | "selected-h3-centroid"
  | "capped-h3-ring"
  | "offline-h3-precompute"
  | "server-side-batch"
  | "future-review";

export interface ClimateDataSourceConfig {
  id: string;
  label: string;
  kind: ClimateDataSourceKind;
  layers: ClimateLayerId[];
  sourceUrl: string;
  attribution: string;
  license: string;
  requiresApiKey: boolean;
  status: TerrainProviderAvailability;
  queryMode: ClimateQueryMode;
  priority: number;
  notes: string;
}

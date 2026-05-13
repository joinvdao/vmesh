import type { RasterSourceSpecification } from "maplibre-gl";

import { buildCellFromCoordinate, getNeighborCells } from "@/lib/h3Mesh";
import {
  SEN2SR_LITE_RGBN_MODEL_ID,
  SEN2SR_REPOSITORY_URL,
  SEN2SR_SCALE_FACTOR,
  SEN2SR_TARGET_RESOLUTION_METERS,
  SENTINEL_L2A_SOURCE_RESOLUTION_METERS,
  SENTINEL_RGBN_BANDS
} from "@/lib/sentinelSuperResolutionPlan";
import type {
  ImageryCloudAssessment,
  ImageryProviderConfig,
  ImageryTileManifest,
  MacroProvenance,
  MeshTier
} from "@/lib/vmeshTypes";

export {
  createSentinelSuperResolutionPlan,
  EARTH_SEARCH_STAC_URL,
  SEN2SR_LITE_RGBN_MODEL_ID,
  SEN2SR_REPOSITORY_URL,
  SEN2SR_SCALE_FACTOR,
  SEN2SR_TARGET_RESOLUTION_METERS,
  SENTINEL_L2A_SOURCE_RESOLUTION_METERS,
  SENTINEL_RGBN_BANDS
} from "@/lib/sentinelSuperResolutionPlan";

export const SENTINEL_COG_PREVIEW_PROVIDER_ID = "sentinel2-cog-preview";
export const SENTINEL_SEN2SR_PMTILES_PROVIDER_ID = "sentinel2-sen2sr-pmtiles";
export const SENTINEL_SEN2SR_XYZ_PROVIDER_ID = "sentinel2-sen2sr-xyz";
export const MAPBOX_SATELLITE_PROVIDER_ID = "mapbox-satellite-optional";
export const OFFLINE_RASTER_PMTILES_PROVIDER_ID = "offline-raster-pmtiles";
export const DEFAULT_SENTINEL_PREVIEW_TILE_URL =
  "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg";

export interface ImageryProviderRegistryOptions {
  mapboxToken?: string;
  sentinelPreviewTileUrl?: string;
  sen2srPmtilesUrl?: string;
  sen2srXyzUrl?: string;
  offlineRasterPmtilesUrl?: string;
  preferredProviderId?: string;
}

export interface StacSearchInput {
  bbox: [number, number, number, number];
  datetime: string;
  cloudCoverMax?: number;
  limit?: number;
}

export interface SceneCloudMetadata {
  id: string;
  cloudCover?: number;
  productType?: string;
  acquiredAt?: string;
}

const CLOUDY_SCL_CLASSES = new Set([0, 1, 3, 8, 9, 10, 11]);

function withPriority(
  provider: Omit<ImageryProviderConfig, "priority">,
  priority: number
): ImageryProviderConfig {
  return { ...provider, priority };
}

function toPmtilesProtocolUrl(sourceUrl: string): string {
  return sourceUrl.startsWith("pmtiles://") ? sourceUrl : `pmtiles://${sourceUrl}`;
}

export function getImageryProviderRegistry(
  options: ImageryProviderRegistryOptions = {}
): ImageryProviderConfig[] {
  const mapboxTileUrl = options.mapboxToken
    ? `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg90?access_token=${options.mapboxToken}`
    : "";

  const registry = [
    withPriority(
      {
        id: SENTINEL_COG_PREVIEW_PROVIDER_ID,
        label: "Sentinel-2 clear preview",
        kind: "sentinel2-cog-preview",
        sourceUrl: options.sentinelPreviewTileUrl ?? DEFAULT_SENTINEL_PREVIEW_TILE_URL,
        attribution: "Sentinel-2 cloudless by EOX / Copernicus Sentinel data",
        license: "Preview/service terms require review before production use",
        requiresApiKey: false,
        status: "fallback",
        notes:
          "No-token raster preview for UI verification. Production vmesh should use manifest-backed COG/PMTiles outputs."
      },
      10
    ),
    withPriority(
      {
        id: SENTINEL_SEN2SR_PMTILES_PROVIDER_ID,
        label: "SEN2SR PMTiles",
        kind: "sentinel2-sen2sr-pmtiles",
        sourceUrl: options.sen2srPmtilesUrl ?? "",
        attribution: "Copernicus Sentinel-2 / ESAOpenSR SEN2SR",
        license: "Sentinel and SEN2SR citation/terms required",
        requiresApiKey: false,
        status: options.sen2srPmtilesUrl ? "available" : "future",
        notes:
          "Offline/server-generated super-resolution raster PMTiles. Never generated in the browser."
      },
      20
    ),
    withPriority(
      {
        id: SENTINEL_SEN2SR_XYZ_PROVIDER_ID,
        label: "SEN2SR XYZ tiles",
        kind: "sentinel2-sen2sr-xyz",
        sourceUrl: options.sen2srXyzUrl ?? "",
        attribution: "Copernicus Sentinel-2 / ESAOpenSR SEN2SR",
        license: "Sentinel and SEN2SR citation/terms required",
        requiresApiKey: false,
        status: options.sen2srXyzUrl ? "available" : "future",
        notes: "Optional generated XYZ tile output from the offline SEN2SR pipeline."
      },
      30
    ),
    withPriority(
      {
        id: MAPBOX_SATELLITE_PROVIDER_ID,
        label: "Mapbox satellite",
        kind: "mapbox-satellite-optional",
        sourceUrl: mapboxTileUrl,
        attribution: "Mapbox satellite imagery",
        license: "Mapbox terms; token required",
        requiresApiKey: true,
        status: options.mapboxToken ? "available" : "requires-api-key",
        notes:
          "Optional comparison imagery only. It is never the open-source public-demo default and must not commit tokens."
      },
      80
    ),
    withPriority(
      {
        id: OFFLINE_RASTER_PMTILES_PROVIDER_ID,
        label: "Offline raster PMTiles",
        kind: "offline-raster-pmtiles",
        sourceUrl: options.offlineRasterPmtilesUrl ?? "",
        attribution: "Local/offline imagery archive",
        license: "Archive-specific",
        requiresApiKey: false,
        status: options.offlineRasterPmtilesUrl ? "available" : "future",
        notes: "Local hub/offline imagery bundle path for disaster-mode deployments."
      },
      90
    )
  ];

  if (options.preferredProviderId) {
    return registry.sort((a, b) => {
      if (a.id === options.preferredProviderId) return -1;
      if (b.id === options.preferredProviderId) return 1;
      return a.priority - b.priority;
    });
  }

  return registry.sort((a, b) => a.priority - b.priority);
}

export function selectImageryProvider(
  providers: ImageryProviderConfig[],
  preferredProviderId = SENTINEL_COG_PREVIEW_PROVIDER_ID
): ImageryProviderConfig {
  return (
    providers.find((provider) => provider.id === preferredProviderId) ??
    providers.find(
      (provider) => provider.status === "available" || provider.status === "fallback"
    ) ??
    providers[0]
  );
}

export function toImageryRasterSource(
  provider: ImageryProviderConfig
): RasterSourceSpecification | null {
  if (
    !provider.sourceUrl ||
    provider.status === "requires-api-key" ||
    provider.status === "future"
  ) {
    return null;
  }

  const url =
    provider.kind === "sentinel2-sen2sr-pmtiles" || provider.kind === "offline-raster-pmtiles"
      ? toPmtilesProtocolUrl(provider.sourceUrl)
      : provider.sourceUrl;

  if (provider.kind === "sentinel2-sen2sr-pmtiles" || provider.kind === "offline-raster-pmtiles") {
    return {
      type: "raster",
      url,
      tileSize: 256,
      attribution: provider.attribution
    };
  }

  return {
    type: "raster",
    tiles: [url],
    tileSize: provider.kind === "mapbox-satellite-optional" ? 512 : 256,
    attribution: provider.attribution
  };
}

export function buildSentinelStacSearchPayload({
  bbox,
  datetime,
  cloudCoverMax = 10,
  limit = 12
}: StacSearchInput): Record<string, unknown> {
  return {
    collections: ["sentinel-2-l2a"],
    bbox,
    datetime,
    limit,
    sortby: [{ field: "properties.datetime", direction: "desc" }],
    query: {
      "eo:cloud_cover": {
        lte: cloudCoverMax
      }
    }
  };
}

export function passesSceneCloudGate(
  scene: SceneCloudMetadata,
  cloudCoverMax = 10
): ImageryCloudAssessment {
  const cloudCover = scene.cloudCover ?? 100;
  const accepted =
    cloudCover <= cloudCoverMax && (!scene.productType || scene.productType === "S2MSI2A");
  return {
    sceneCloudCover: cloudCover,
    clearPixelRatioAoi: accepted ? 1 : 0,
    maskMethod: "metadata-only",
    accepted,
    reason: accepted
      ? "Scene-level cloud metadata passed"
      : "Scene metadata failed cloud or L2A product gate"
  };
}

export function assessAoiCloudMask(
  sclClasses: number[],
  minClearRatio = 0.95
): ImageryCloudAssessment {
  if (sclClasses.length === 0) {
    return {
      sceneCloudCover: 100,
      clearPixelRatioAoi: 0,
      maskMethod: "scl-fixture",
      accepted: false,
      reason: "No SCL pixels available for AOI cloud validation"
    };
  }

  const clearPixels = sclClasses.filter((value) => !CLOUDY_SCL_CLASSES.has(value)).length;
  const clearPixelRatioAoi = clearPixels / sclClasses.length;
  return {
    sceneCloudCover: Math.round((1 - clearPixelRatioAoi) * 1000) / 10,
    clearPixelRatioAoi: Math.round(clearPixelRatioAoi * 1000) / 1000,
    maskMethod: "scl-fixture",
    accepted: clearPixelRatioAoi >= minClearRatio,
    reason:
      clearPixelRatioAoi >= minClearRatio
        ? "AOI SCL clear-pixel ratio passed"
        : "AOI rejected because cloud, shadow, snow, or no-data pixels exceed threshold"
  };
}

export function createH3CoverageFromBounds(
  bounds: [number, number, number, number],
  tier: MeshTier = "U5"
): string[] {
  const [west, south, east, north] = bounds;
  const centerLat = (south + north) / 2;
  const centerLng = (west + east) / 2;
  const seeds = [
    buildCellFromCoordinate(centerLat, centerLng, tier),
    buildCellFromCoordinate(south, west, tier),
    buildCellFromCoordinate(south, east, tier),
    buildCellFromCoordinate(north, west, tier),
    buildCellFromCoordinate(north, east, tier)
  ];
  return Array.from(new Set(seeds.flatMap((cell) => getNeighborCells(cell, 1))));
}

export function validateImageryTileManifest(manifest: ImageryTileManifest): boolean {
  return (
    manifest.id.length > 0 &&
    manifest.sourceSceneId.length > 0 &&
    manifest.tileUrl.length > 0 &&
    manifest.bands.length > 0 &&
    manifest.sourceResolutionMeters > 0 &&
    manifest.resolutionMeters > 0 &&
    manifest.scaleFactor > 0 &&
    manifest.h3Coverage.length > 0 &&
    manifest.clearPixelRatioAoi >= 0 &&
    manifest.clearPixelRatioAoi <= 1 &&
    manifest.cloudCoverScene >= 0 &&
    manifest.cloudCoverScene <= 100 &&
    manifest.provenance.limitations.length > 0 &&
    manifest.provenance.license.length > 0
  );
}

export function createMockSentinelManifest({
  h3Coverage,
  tileUrl = DEFAULT_SENTINEL_PREVIEW_TILE_URL
}: {
  h3Coverage: string[];
  tileUrl?: string;
}): ImageryTileManifest {
  const provenance: MacroProvenance = {
    providerId: SENTINEL_COG_PREVIEW_PROVIDER_ID,
    providerLabel: "Sentinel-2 preview manifest",
    sourceType: "mock",
    observedAt: "2026-05-01T10:30:00.000Z",
    generatedAt: "2026-05-01T12:00:00.000Z",
    freshnessLabel: "mock clear-scene manifest",
    confidence: 72,
    limitations:
      "Manifest-backed UI scaffold. SEN2SR processing must run offline/server-side and can introduce artifacts.",
    license: "Copernicus Sentinel data and SEN2SR citation required before production use"
  };

  return {
    id: "mock-sentinel2-sen2sr-lisbon",
    sourceSceneId: "S2A_MOCK_L2A_20260501T103000",
    provider: SENTINEL_COG_PREVIEW_PROVIDER_ID,
    acquiredAt: provenance.observedAt,
    processedAt: provenance.generatedAt,
    bands: [...SENTINEL_RGBN_BANDS],
    sourceResolutionMeters: SENTINEL_L2A_SOURCE_RESOLUTION_METERS,
    resolutionMeters: SEN2SR_TARGET_RESOLUTION_METERS,
    scaleFactor: SEN2SR_SCALE_FACTOR,
    superResolutionModel: `${SEN2SR_LITE_RGBN_MODEL_ID} planned; preview is not model output`,
    upscalerRepositoryUrl: SEN2SR_REPOSITORY_URL,
    truthStatus: "imagery-inferred-context",
    cloudCoverScene: 4.2,
    clearPixelRatioAoi: 0.97,
    bounds: [-9.55, 38.48, -8.75, 39.05],
    h3Coverage,
    license: provenance.license,
    provenance,
    tileUrl,
    ndviMean: 0.43,
    ndwiMean: 0.18,
    nbrMean: 0.36,
    vegetationCoverProxy: 61,
    bareSoilProxy: 22,
    waterPresenceProxy: 17,
    cloudFreeConfidence: 82
  };
}

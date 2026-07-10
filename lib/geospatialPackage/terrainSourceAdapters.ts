import {
  createTerrainWorkerPlan,
  getTerrainToolProfileForSource,
  type TerrainGroundModelRole,
  type TerrainPackageWorkerInput,
  type TerrainToolProfile,
  type TerrainWorkerRunClass
} from "@/lib/geospatialPackage/terrainWorker";
import {
  containsSecretLikeValue,
  createPackageCacheKey,
  sanitizePublicUrl
} from "@/lib/geospatialPackage/plannerUtils";
import type {
  GeospatialPackagePlan,
  GeospatialSourceCandidate
} from "@/lib/geospatialPackage/types";
import {
  BC_LIDARBC_TERRAIN_PROVIDER,
  CANADA_HRDEM_TERRAIN_PROVIDER,
  createCanadaHrdemStacSearchBody,
  createUsgs3depOneMeterCoverageQueryUrl,
  isBritishColumbiaTerrainSourceCoordinate,
  isCanadaTerrainSourceCoordinate,
  isKamloopsMunicipalTerrainCoordinate,
  isUsaTerrainSourceCoordinate,
  selectCanadaHrdemStacAsset,
  type TerrainSourcePreviewRole
} from "@/lib/terrainSourcePreview";
import {
  probeTerrainCogCoordinate,
  type TerrainCogProbeWorkerResult
} from "@/lib/terrainSourceProbeWorker";

export type TerrainSourceAdapterKind =
  | "arcgis-image-export"
  | "arcgis-feature-query"
  | "direct-geotiff"
  | "s3-cog"
  | "stac-cog"
  | "wcs-geotiff"
  | "zip-archive"
  | "ascii-grid"
  | "sevenzip-archive"
  | "source-index-required";

export type TerrainSourceAdapterStatus = "ready" | "blocked";
export type TerrainSourceAdapterRunClass = Extract<TerrainWorkerRunClass, "dry-run" | "configured">;

export type TerrainSourceInputFormat =
  | "geotiff"
  | "cog"
  | "stac-json"
  | "wcs-geotiff"
  | "zip"
  | "ascii-grid"
  | "sevenzip"
  | "json";

export interface TerrainSourceAdapterEnv {
  [key: string]: string | undefined;
}

export interface TerrainSourceAdapterOptions {
  now?: () => Date;
  env?: TerrainSourceAdapterEnv;
  fetchImpl?: typeof fetch;
  maxImageSide?: number;
  usgs3depImageServerUrl?: string;
  usgs3depCoverageResponse?: unknown;
  usgsLpcSourceIndexResponse?: unknown;
  usgsLpcSourceIndexUrl?: string;
  canadaHrdemGeoTiffUrl?: string;
  canadaHrdemGeoTiffUrlTemplate?: string;
  canadaHrdemStacSearchResponse?: unknown;
  kamloopsLocalLidarGeoTiffUrl?: string;
  kamloopsLocalLidarGeoTiffUrlTemplate?: string;
  kamloopsOperatorTerrainManifest?: unknown;
  kamloopsMunicipalDemGridResponse?: unknown;
  kamloopsMunicipalDemGridBaseUrl?: string;
  kamloopsMunicipalDemZipAvailability?: Record<string, KamloopsMunicipalDemZipAvailability>;
  kamloopsMunicipalLidarZipAvailability?: Record<string, KamloopsMunicipalDemZipAvailability>;
  verifyKamloopsMunicipalDemZipUrls?: boolean;
  verifyKamloopsMunicipalLidarZipUrls?: boolean;
  verifyKamloopsMunicipalContourSupport?: boolean;
  kamloopsMunicipalDemProbeTimeoutMs?: number;
  sourcePixelCoverageProbeTimeoutMs?: number;
  bcLidarGeoTiffUrl?: string;
  bcLidarGeoTiffUrlTemplate?: string;
  bcLidarFeatureServerResponse?: unknown;
  bcLidarFeatureServerBaseUrl?: string;
  requireSourcePixelCoverage?: boolean;
  terrainCogCoordinateProbe?: typeof probeTerrainCogCoordinate;
}

export interface TerrainSourceInputRef {
  sourceId: string;
  toolId: string;
  kind: TerrainSourceAdapterKind;
  url: string;
  method: "GET" | "POST";
  format: TerrainSourceInputFormat;
  requiresAuth: boolean;
  role: "terrain-source" | "source-catalog" | "source-index";
  provider: string;
  groundModelRole: TerrainGroundModelRole;
  targetResolutionMeters: number;
  crs?: string;
  verticalDatum?: string;
  license: string;
  attribution: string;
  notes: string[];
}

export interface TerrainSourceAdapterPlan {
  schemaVersion: "vmesh-terrain-source-adapter-plan-v1";
  packageId: string;
  createdAt: string;
  status: TerrainSourceAdapterStatus;
  runClass: TerrainSourceAdapterRunClass;
  selectedSource: GeospatialSourceCandidate | null;
  toolProfile: TerrainToolProfile | null;
  bbox: {
    west: number;
    south: number;
    east: number;
    north: number;
  } | null;
  targetResolutionMeters: number | null;
  cacheKey: string | null;
  inputRefs: TerrainSourceInputRef[];
  workerNextSteps: string[];
  blockedReasons: string[];
  warnings: string[];
}

export interface KamloopsOperatorTerrainManifestSource {
  id?: string;
  sourceId?: "kamloops-local-lidar-dtm-1m";
  label?: string;
  role?: "bare-earth-dtm" | "surface-dsm" | "generic-dem" | "unknown";
  resolutionMeters?: number;
  crs?: string;
  verticalDatum?: string;
  sourceRelease?: string;
  attribution?: string;
  license?: string;
  coverage?: NonNullable<TerrainSourceAdapterPlan["bbox"]>;
  source?: {
    url?: string;
    urlTemplate?: string;
  };
  qa?: {
    sourceNativeRaster?: boolean;
    coverageStatus?: "contains-aoi" | "partial" | "unknown";
    maxNoDataRatio?: number;
  };
  warnings?: string[];
}

export type KamloopsOperatorTerrainManifest =
  | {
      schemaVersion: "vmesh-kamloops-operator-terrain-source-manifest-v1";
      sources?: KamloopsOperatorTerrainManifestSource[];
    }
  | (KamloopsOperatorTerrainManifestSource & {
      schemaVersion: "vmesh-kamloops-operator-terrain-source-manifest-v1";
    });

interface SourceAdapterContext {
  plan: GeospatialPackagePlan;
  createdAt: string;
  source: GeospatialSourceCandidate;
  toolProfile: TerrainToolProfile;
  bbox: NonNullable<TerrainSourceAdapterPlan["bbox"]>;
  cacheKey: string;
  options: Required<Pick<TerrainSourceAdapterOptions, "maxImageSide">> &
    Omit<TerrainSourceAdapterOptions, "maxImageSide">;
}

const DEFAULT_CREATED_AT = "2026-06-02T00:00:00.000Z";
const DEFAULT_MAX_IMAGE_SIDE = 4096;
const USGS_3DEP_IMAGE_SERVER_EXPORT_URL =
  "https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage";
const USGS_3DEP_LPC_INDEX_QUERY_URL =
  "https://index.nationalmap.gov/arcgis/rest/services/3DEPElevationIndex/MapServer/8/query";
const BC_LIDAR_FEATURE_SERVER_BASE_URL =
  "https://services6.arcgis.com/ubm4tcTYICKBpist/ArcGIS/rest/services/LiDAR_BC_S3_Public/FeatureServer";
const KAMLOOPS_MUNICIPAL_DEM_GRID_LAYER_URL =
  "https://maps.kamloops.ca/arcgis/rest/services/FeatureDataset/GIS_Administrative_1/MapServer/6";
const KAMLOOPS_MUNICIPAL_2024_DEM_DOWNLOAD_BASE_URL =
  "https://maps.kamloops.ca/opendata/DEM/2024_CGVD2013";
const KAMLOOPS_MUNICIPAL_2024_LIDAR_DOWNLOAD_BASE_URL =
  "https://maps.kamloops.ca/opendata/Lidar/2024";
const KAMLOOPS_MUNICIPAL_DEM_POINT_BREAK_SHP_URL =
  "https://maps.kamloops.ca/OpenData/zipfiles/DEMPointBreakSHP.zip";
const KAMLOOPS_MUNICIPAL_CONTOUR_1M_LAYER_URL =
  "https://maps.kamloops.ca/arcgis/rest/services/CityWorks/UtilityBaseMap/MapServer/4";
const KAMLOOPS_MUNICIPAL_CONTOUR_1M_LAYER_FALLBACK_URLS = [
  KAMLOOPS_MUNICIPAL_CONTOUR_1M_LAYER_URL,
  "https://gis-ws-qv01.kamloops.ca/arcgis/rest/services/CityWorks/UtilityBaseMap/MapServer/4"
] as const;
const KAMLOOPS_MUNICIPAL_2024_LIDAR_APP_URL =
  "https://kamloops.maps.arcgis.com/apps/webappviewer/index.html?id=6fea67a054a94b45ad2998c0a03d88e7";
const KAMLOOPS_MUNICIPAL_2024_DOWNLOAD_WEBMAP_URL =
  "https://kamloops.maps.arcgis.com/sharing/rest/content/items/5dff6fe1f28a4f278ce652a236085dde/data";
const KAMLOOPS_MUNICIPAL_DOWNLOAD_LAYER_DEFINITION = "PHOTOGRIDLIMITS = 'YES'";
const KAMLOOPS_MUNICIPAL_ELEVATION_VECTOR_EXTENT_WGS84 = {
  west: -120.546437,
  south: 50.607833,
  east: -120.025817,
  north: 50.873614
};
const KAMLOOPS_MUNICIPAL_DEM_GRID_ORIGIN_COLUMN = 53;
const KAMLOOPS_MUNICIPAL_DEM_GRID_ORIGIN_ROW = 50;
const KAMLOOPS_MUNICIPAL_DEM_GRID_ORIGIN_EASTING = 682_585.92;
const KAMLOOPS_MUNICIPAL_DEM_GRID_ORIGIN_NORTHING = 5_610_360.01;
const KAMLOOPS_MUNICIPAL_DEM_GRID_FULL_WIDTH_METERS = 3_000;
const KAMLOOPS_MUNICIPAL_DEM_GRID_FULL_HEIGHT_METERS = 2_400;
const KAMLOOPS_MUNICIPAL_DEM_GRID_TILE_WIDTH_METERS = 1_500;
const KAMLOOPS_MUNICIPAL_DEM_GRID_TILE_HEIGHT_METERS = 1_200;
const KAMLOOPS_MUNICIPAL_DEM_GRID_MIN_ROW = 48;
const KAMLOOPS_MUNICIPAL_DEM_GRID_MAX_ROW = 64;
const KAMLOOPS_MUNICIPAL_DEM_GRID_MIN_COLUMN = 48;
const KAMLOOPS_MUNICIPAL_DEM_GRID_MAX_COLUMN = 64;

const SOURCE_NATIVE_TOOL_IDS = new Set([
  "usgs-3dep",
  "usgs-3dep-lpc-dsm",
  "kamloops-local-lidar",
  "kamloops-local-lidar-dtm-1m",
  "canada-hrdem",
  "canada-hrdem-best-dtm",
  "canada-hrdem-dsm",
  "bc-lidarbc",
  "bc-lidarbc-dsm",
  "environment-agency-lidar-dtm",
  "scottish-remote-sensing-lidar",
  "os-terrain-50"
]);

function createdAt(options: TerrainSourceAdapterOptions): string {
  return (options.now?.() ?? new Date(DEFAULT_CREATED_AT)).toISOString();
}

function bboxFromPlan(plan: GeospatialPackagePlan): NonNullable<TerrainSourceAdapterPlan["bbox"]> {
  const [west, south, east, north] = plan.aoi.bounds;
  return { west, south, east, north };
}

function formatCoordinate(value: number): string {
  return Number(value.toFixed(6)).toString();
}

function bboxString(bbox: NonNullable<TerrainSourceAdapterPlan["bbox"]>): string {
  return [bbox.west, bbox.south, bbox.east, bbox.north].map(formatCoordinate).join(",");
}

function bboxContainsBbox({
  container,
  target
}: {
  container: NonNullable<TerrainSourceAdapterPlan["bbox"]>;
  target: NonNullable<TerrainSourceAdapterPlan["bbox"]>;
}): boolean {
  return (
    target.west >= container.west &&
    target.east <= container.east &&
    target.south >= container.south &&
    target.north <= container.north
  );
}

function estimatedMetersForBbox(bbox: NonNullable<TerrainSourceAdapterPlan["bbox"]>): {
  widthMeters: number;
  heightMeters: number;
} {
  const latitude = (bbox.south + bbox.north) / 2;
  const metersPerDegreeLatitude = 111_320;
  const metersPerDegreeLongitude =
    metersPerDegreeLatitude * Math.max(0.1, Math.cos((latitude * Math.PI) / 180));

  return {
    widthMeters: Math.abs(bbox.east - bbox.west) * metersPerDegreeLongitude,
    heightMeters: Math.abs(bbox.north - bbox.south) * metersPerDegreeLatitude
  };
}

function targetImageSize({
  bbox,
  targetResolutionMeters,
  maxImageSide
}: {
  bbox: NonNullable<TerrainSourceAdapterPlan["bbox"]>;
  targetResolutionMeters: number;
  maxImageSide: number;
}): { widthPx: number; heightPx: number; capped: boolean } {
  const { widthMeters, heightMeters } = estimatedMetersForBbox(bbox);
  const widthPx = Math.max(256, Math.ceil(widthMeters / targetResolutionMeters));
  const heightPx = Math.max(256, Math.ceil(heightMeters / targetResolutionMeters));

  return {
    widthPx: Math.min(maxImageSide, widthPx),
    heightPx: Math.min(maxImageSide, heightPx),
    capped: widthPx > maxImageSide || heightPx > maxImageSide
  };
}

export function expandTerrainSourceUrlTemplate({
  template,
  bbox,
  packageId,
  sourceId,
  toolId,
  targetResolutionMeters,
  widthPx,
  heightPx
}: {
  template: string;
  bbox: NonNullable<TerrainSourceAdapterPlan["bbox"]>;
  packageId: string;
  sourceId: string;
  toolId: string;
  targetResolutionMeters: number;
  widthPx: number;
  heightPx: number;
}): string {
  const replacements: Record<string, string> = {
    bbox: bboxString(bbox),
    west: formatCoordinate(bbox.west),
    south: formatCoordinate(bbox.south),
    east: formatCoordinate(bbox.east),
    north: formatCoordinate(bbox.north),
    packageId,
    sourceId,
    toolId,
    targetResolutionMeters: String(targetResolutionMeters),
    widthPx: String(widthPx),
    heightPx: String(heightPx)
  };

  return template.replace(/\{([a-zA-Z0-9_-]+)\}/g, (match, key: string) => {
    return replacements[key] ?? match;
  });
}

function buildArcgisImageExportUrl({
  endpoint,
  bbox,
  widthPx,
  heightPx
}: {
  endpoint: string;
  bbox: NonNullable<TerrainSourceAdapterPlan["bbox"]>;
  widthPx: number;
  heightPx: number;
}): string {
  const url = new URL(endpoint);

  url.searchParams.set("bbox", bboxString(bbox));
  url.searchParams.set("bboxSR", "4326");
  url.searchParams.set("imageSR", "4326");
  url.searchParams.set("size", `${widthPx},${heightPx}`);
  url.searchParams.set("format", "tiff");
  url.searchParams.set("pixelType", "F32");
  url.searchParams.set("interpolation", "RSP_BilinearInterpolation");
  url.searchParams.set("f", "image");

  return url.toString();
}

function isAllowedSourceRef(value: string): boolean {
  return /^(https?:\/\/|s3:\/\/)/i.test(value);
}

function inferConfiguredKind(value: string): TerrainSourceAdapterKind {
  if (/^s3:\/\//i.test(value)) return "s3-cog";
  return "direct-geotiff";
}

function inferConfiguredFormat(value: string): TerrainSourceInputFormat {
  if (/\.zip($|[?#])/i.test(value)) return "zip";
  if (/\.7z($|[?#])/i.test(value)) return "sevenzip";
  if (/\.(asc|grd)($|[?#])/i.test(value)) return "ascii-grid";
  if (/^s3:\/\//i.test(value) || /\.cog\.tif(f)?($|[?#])/i.test(value)) return "cog";
  return "geotiff";
}

function buildWorkerNextSteps(toolProfile: TerrainToolProfile): string[] {
  return [
    `Fetch or stream the ${toolProfile.provider} source input outside the browser.`,
    "Clip/window the source to the package AOI and preserve source metadata.",
    "Normalize the terrain truth output to a COG GeoTIFF with CRS, vertical datum, resolution, license, and attribution.",
    "Derive hillshade, slope, aspect, contour vectors, and terrain RGB PMTiles only from the normalized terrain artifact.",
    "Run coverage/no-data/elevation-range QA before calling the package worker ready."
  ];
}

function blockedPlan({
  context,
  reasons,
  warnings = [],
  runClass = "configured"
}: {
  context: SourceAdapterContext;
  reasons: string[];
  warnings?: string[];
  runClass?: TerrainSourceAdapterRunClass;
}): TerrainSourceAdapterPlan {
  return {
    schemaVersion: "vmesh-terrain-source-adapter-plan-v1",
    packageId: context.plan.id,
    createdAt: context.createdAt,
    status: "blocked",
    runClass,
    selectedSource: context.source,
    toolProfile: context.toolProfile,
    bbox: context.bbox,
    targetResolutionMeters: context.toolProfile.targetResolutionMeters,
    cacheKey: context.cacheKey,
    inputRefs: [],
    workerNextSteps: buildWorkerNextSteps(context.toolProfile),
    blockedReasons: reasons,
    warnings
  };
}

function readyPlan({
  context,
  inputRefs,
  warnings = [],
  runClass = "dry-run"
}: {
  context: SourceAdapterContext;
  inputRefs: TerrainSourceInputRef[];
  warnings?: string[];
  runClass?: TerrainSourceAdapterRunClass;
}): TerrainSourceAdapterPlan {
  return {
    schemaVersion: "vmesh-terrain-source-adapter-plan-v1",
    packageId: context.plan.id,
    createdAt: context.createdAt,
    status: "ready",
    runClass,
    selectedSource: context.source,
    toolProfile: context.toolProfile,
    bbox: context.bbox,
    targetResolutionMeters: context.toolProfile.targetResolutionMeters,
    cacheKey: context.cacheKey,
    inputRefs,
    workerNextSteps: buildWorkerNextSteps(context.toolProfile),
    blockedReasons: [],
    warnings
  };
}

function buildInputRef({
  context,
  kind,
  url,
  format,
  notes,
  targetResolutionMeters,
  requiresAuth = false,
  role = "terrain-source"
}: {
  context: SourceAdapterContext;
  kind: TerrainSourceAdapterKind;
  url: string;
  format: TerrainSourceInputFormat;
  notes: string[];
  targetResolutionMeters?: number;
  requiresAuth?: boolean;
  role?: TerrainSourceInputRef["role"];
}): TerrainSourceInputRef {
  return {
    sourceId: context.source.id,
    toolId: context.toolProfile.toolId,
    kind,
    url,
    method: "GET",
    format,
    requiresAuth,
    role,
    provider: context.toolProfile.provider,
    groundModelRole: context.toolProfile.groundModelRole,
    targetResolutionMeters: targetResolutionMeters ?? context.toolProfile.targetResolutionMeters,
    crs: context.toolProfile.crs,
    verticalDatum: context.toolProfile.verticalDatum,
    license: context.source.license,
    attribution: context.source.attribution,
    notes
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function bboxFromUnknown(value: unknown): NonNullable<TerrainSourceAdapterPlan["bbox"]> | null {
  if (!isRecord(value)) return null;
  const west = typeof value.west === "number" && Number.isFinite(value.west) ? value.west : null;
  const south =
    typeof value.south === "number" && Number.isFinite(value.south) ? value.south : null;
  const east = typeof value.east === "number" && Number.isFinite(value.east) ? value.east : null;
  const north =
    typeof value.north === "number" && Number.isFinite(value.north) ? value.north : null;
  if (west === null || south === null || east === null || north === null) return null;
  if (west >= east || south >= north) return null;
  return { west, south, east, north };
}

function kamloopsOperatorManifestSources(value: unknown): KamloopsOperatorTerrainManifestSource[] {
  if (!isRecord(value)) return [];
  if (value.schemaVersion !== "vmesh-kamloops-operator-terrain-source-manifest-v1") return [];
  if (Array.isArray(value.sources)) {
    return value.sources
      .filter(isRecord)
      .map((source) => source as KamloopsOperatorTerrainManifestSource);
  }
  return [value as KamloopsOperatorTerrainManifestSource];
}

function isPublicHttpsRasterRef(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  ) {
    return false;
  }

  const normalized = url.toString().toLowerCase();
  const pathname = url.pathname.toLowerCase();
  return (
    /\.(tif|tiff)$/i.test(pathname) ||
    normalized.includes("format=tiff") ||
    normalized.includes("format=image/tiff") ||
    pathname.endsWith("/imageserver/exportimage")
  );
}

function validateKamloopsOperatorTerrainSource({
  context,
  source
}: {
  context: SourceAdapterContext;
  source: KamloopsOperatorTerrainManifestSource;
}):
  | { ok: true; url: string; coverage: NonNullable<TerrainSourceAdapterPlan["bbox"]> }
  | {
      ok: false;
      reasons: string[];
    } {
  const reasons: string[] = [];
  const sourceId = source.sourceId ?? "kamloops-local-lidar-dtm-1m";
  const coverage = bboxFromUnknown(source.coverage);
  const resolutionMeters =
    typeof source.resolutionMeters === "number" && Number.isFinite(source.resolutionMeters)
      ? source.resolutionMeters
      : null;
  const sourceUrl = source.source?.url;
  const sourceUrlTemplate = source.source?.urlTemplate;

  if (sourceId !== "kamloops-local-lidar-dtm-1m") {
    reasons.push("Operator terrain manifest sourceId is not kamloops-local-lidar-dtm-1m.");
  }
  if (source.role !== "bare-earth-dtm") {
    reasons.push("Operator terrain manifest source role is not bare-earth-dtm.");
  }
  if (resolutionMeters === null || resolutionMeters <= 0 || resolutionMeters > 1) {
    reasons.push(
      "Operator terrain manifest resolution must be <= 1m for golden-quality Kamloops DTM."
    );
  }
  if (!source.crs || !source.crs.trim()) {
    reasons.push("Operator terrain manifest source is missing CRS.");
  }
  if (!source.verticalDatum || !source.verticalDatum.trim()) {
    reasons.push("Operator terrain manifest source is missing vertical datum.");
  }
  if (!coverage) {
    reasons.push("Operator terrain manifest source has invalid coverage bounds.");
  } else if (!bboxContainsBbox({ container: coverage, target: context.bbox })) {
    reasons.push("Operator terrain manifest source does not fully cover the requested 3 km frame.");
  }
  if (source.qa?.sourceNativeRaster !== true) {
    reasons.push("Operator terrain manifest sourceNativeRaster QA must be true.");
  }
  if (source.qa?.coverageStatus !== "contains-aoi") {
    reasons.push("Operator terrain manifest QA coverageStatus must be contains-aoi.");
  }
  if (
    typeof source.qa?.maxNoDataRatio === "number" &&
    Number.isFinite(source.qa.maxNoDataRatio) &&
    source.qa.maxNoDataRatio > 0.01
  ) {
    reasons.push(
      "Operator terrain manifest maxNoDataRatio exceeds the 1% golden-quality threshold."
    );
  }

  let expandedUrl = "";
  try {
    expandedUrl =
      configuredSourceUrl({
        context,
        url: sourceUrl,
        urlTemplate: sourceUrlTemplate,
        missingReason:
          "Kamloops operator terrain manifest requires a public-safe HTTPS GeoTIFF/COG URL or URL template."
      }) ?? "";
  } catch (error) {
    reasons.push(
      error instanceof Error ? error.message : "Operator terrain manifest URL is invalid."
    );
  }
  if (!expandedUrl) {
    reasons.push("Operator terrain manifest source is missing a raster URL or URL template.");
  } else if (!isPublicHttpsRasterRef(expandedUrl)) {
    reasons.push(
      "Operator terrain manifest source ref must be a public-safe HTTPS GeoTIFF/COG or ImageServer exportImage URL."
    );
  }

  if (reasons.length > 0 || !coverage) return { ok: false, reasons };
  return { ok: true, url: expandedUrl, coverage };
}

function createKamloopsOperatorTerrainManifestPlan(
  context: SourceAdapterContext
): TerrainSourceAdapterPlan | null {
  const manifestSources = kamloopsOperatorManifestSources(
    context.options.kamloopsOperatorTerrainManifest
  );
  if (manifestSources.length === 0) return null;

  const rejectedReasons: string[] = [];
  for (const source of manifestSources) {
    const validation = validateKamloopsOperatorTerrainSource({ context, source });
    if (!validation.ok) {
      rejectedReasons.push(...validation.reasons);
      continue;
    }

    const resolutionMeters = source.resolutionMeters ?? context.toolProfile.targetResolutionMeters;
    return readyPlan({
      context,
      runClass: "configured",
      inputRefs: [
        buildInputRef({
          context,
          kind: inferConfiguredKind(validation.url),
          url: validation.url,
          format: inferConfiguredFormat(validation.url),
          targetResolutionMeters: resolutionMeters,
          notes: [
            `Resolved from operator terrain manifest source ${source.id ?? source.sourceId ?? "kamloops-local-lidar-dtm-1m"}.`,
            `Manifest coverage fully contains this ${Math.round(estimatedMetersForBbox(context.bbox).widthMeters)}m x ${Math.round(estimatedMetersForBbox(context.bbox).heightMeters)}m source-slice frame.`,
            `Manifest declares ${resolutionMeters}m bare-earth DTM, ${source.crs}, ${source.verticalDatum}.`,
            "VMesh is indexing this source ref only; Abundance must window the raster live for the selected coordinate, prove non-no-data coverage, and retain QA artifacts.",
            "Do not emit local paths, signed URLs, private source-pack payload refs, or raw raster payloads in public-safe responses."
          ]
        })
      ],
      warnings: [
        "Run class is configured: vmesh resolved an operator terrain manifest source ref, but did not fetch or retain terrain artifacts.",
        ...(source.warnings ?? [])
      ]
    });
  }

  return blockedPlan({
    context,
    reasons: Array.from(new Set(rejectedReasons)),
    warnings: [
      "A Kamloops operator terrain manifest was present, but no source entry could safely cover this exact 3 km frame.",
      "VMesh will not claim golden-quality terrain from an incomplete, derived, or non-public-safe manifest source."
    ]
  });
}

function createBcLidarFeatureServerQueryUrl({
  bbox,
  role,
  baseUrl
}: {
  bbox: NonNullable<TerrainSourceAdapterPlan["bbox"]>;
  role: TerrainSourcePreviewRole;
  baseUrl: string;
}): string {
  const centerLongitude = (bbox.west + bbox.east) / 2;
  const centerLatitude = (bbox.south + bbox.north) / 2;
  const layerId = role === "dsm" ? "1" : "5";
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/${layerId}/query`);

  url.searchParams.set("f", "json");
  url.searchParams.set("where", "1=1");
  url.searchParams.set(
    "geometry",
    `${formatCoordinate(centerLongitude)},${formatCoordinate(centerLatitude)}`
  );
  url.searchParams.set("geometryType", "esriGeometryPoint");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("outFields", "filename,maptile,path,spacing,year,s3Url,projection");
  url.searchParams.set("returnGeometry", "false");

  return url.toString();
}

function createKamloopsMunicipalDemGridQueryUrl({
  bbox,
  baseUrl = KAMLOOPS_MUNICIPAL_DEM_GRID_LAYER_URL
}: {
  bbox: NonNullable<TerrainSourceAdapterPlan["bbox"]>;
  baseUrl?: string;
}): string {
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/query`);

  url.searchParams.set("f", "json");
  url.searchParams.set("where", "1=1");
  url.searchParams.set(
    "geometry",
    `${formatCoordinate(bbox.west)},${formatCoordinate(bbox.south)},${formatCoordinate(
      bbox.east
    )},${formatCoordinate(bbox.north)}`
  );
  url.searchParams.set("geometryType", "esriGeometryEnvelope");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("outFields", "OBJECTID,CELLNAME,PHOTOGRIDLIMITS");
  url.searchParams.set("returnGeometry", "false");

  return url.toString();
}

function utm10Nad83FromWgs84({ latitude, longitude }: { latitude: number; longitude: number }): {
  easting: number;
  northing: number;
} {
  const semiMajorAxis = 6_378_137;
  const inverseFlattening = 298.257_222_101;
  const flattening = 1 / inverseFlattening;
  const eccentricitySquared = flattening * (2 - flattening);
  const secondEccentricitySquared = eccentricitySquared / (1 - eccentricitySquared);
  const scaleFactor = 0.9996;
  const centralMeridian = (-123 * Math.PI) / 180;
  const latitudeRadians = (latitude * Math.PI) / 180;
  const longitudeRadians = (longitude * Math.PI) / 180;
  const sinLatitude = Math.sin(latitudeRadians);
  const cosLatitude = Math.cos(latitudeRadians);
  const tanLatitude = Math.tan(latitudeRadians);
  const n = semiMajorAxis / Math.sqrt(1 - eccentricitySquared * sinLatitude * sinLatitude);
  const t = tanLatitude * tanLatitude;
  const c = secondEccentricitySquared * cosLatitude * cosLatitude;
  const a = cosLatitude * (longitudeRadians - centralMeridian);
  const meridionalArc =
    semiMajorAxis *
    ((1 -
      eccentricitySquared / 4 -
      (3 * eccentricitySquared * eccentricitySquared) / 64 -
      (5 * eccentricitySquared * eccentricitySquared * eccentricitySquared) / 256) *
      latitudeRadians -
      ((3 * eccentricitySquared) / 8 +
        (3 * eccentricitySquared * eccentricitySquared) / 32 +
        (45 * eccentricitySquared * eccentricitySquared * eccentricitySquared) / 1024) *
        Math.sin(2 * latitudeRadians) +
      ((15 * eccentricitySquared * eccentricitySquared) / 256 +
        (45 * eccentricitySquared * eccentricitySquared * eccentricitySquared) / 1024) *
        Math.sin(4 * latitudeRadians) -
      ((35 * eccentricitySquared * eccentricitySquared * eccentricitySquared) / 3072) *
        Math.sin(6 * latitudeRadians));

  const easting =
    scaleFactor *
      n *
      (a +
        ((1 - t + c) * a ** 3) / 6 +
        ((5 - 18 * t + t * t + 72 * c - 58 * secondEccentricitySquared) * a ** 5) / 120) +
    500_000;
  const northing =
    scaleFactor *
    (meridionalArc +
      n *
        tanLatitude *
        ((a * a) / 2 +
          ((5 - t + 9 * c + 4 * c * c) * a ** 4) / 24 +
          ((61 - 58 * t + t * t + 600 * c - 330 * secondEccentricitySquared) * a ** 6) / 720));

  return { easting, northing };
}

function utmBoundsFromWgs84Bbox(bbox: NonNullable<TerrainSourceAdapterPlan["bbox"]>) {
  const midLatitude = (bbox.south + bbox.north) / 2;
  const midLongitude = (bbox.west + bbox.east) / 2;
  const points = [
    { latitude: bbox.south, longitude: bbox.west },
    { latitude: bbox.south, longitude: bbox.east },
    { latitude: bbox.north, longitude: bbox.west },
    { latitude: bbox.north, longitude: bbox.east },
    { latitude: midLatitude, longitude: bbox.west },
    { latitude: midLatitude, longitude: bbox.east },
    { latitude: bbox.south, longitude: midLongitude },
    { latitude: bbox.north, longitude: midLongitude }
  ].map(utm10Nad83FromWgs84);

  return {
    west: Math.min(...points.map((point) => point.easting)),
    south: Math.min(...points.map((point) => point.northing)),
    east: Math.max(...points.map((point) => point.easting)),
    north: Math.max(...points.map((point) => point.northing))
  };
}

function demGridTileUtmBounds(row: number, column: number, quadrant: "A" | "B" | "C" | "D") {
  const columnBase =
    KAMLOOPS_MUNICIPAL_DEM_GRID_ORIGIN_EASTING +
    (column - KAMLOOPS_MUNICIPAL_DEM_GRID_ORIGIN_COLUMN) *
      KAMLOOPS_MUNICIPAL_DEM_GRID_FULL_WIDTH_METERS;
  const rowBase =
    KAMLOOPS_MUNICIPAL_DEM_GRID_ORIGIN_NORTHING +
    (row - KAMLOOPS_MUNICIPAL_DEM_GRID_ORIGIN_ROW) * KAMLOOPS_MUNICIPAL_DEM_GRID_FULL_HEIGHT_METERS;
  const west =
    columnBase +
    (quadrant === "B" || quadrant === "D" ? KAMLOOPS_MUNICIPAL_DEM_GRID_TILE_WIDTH_METERS : 0);
  const south =
    rowBase +
    (quadrant === "C" || quadrant === "D" ? KAMLOOPS_MUNICIPAL_DEM_GRID_TILE_HEIGHT_METERS : 0);

  return {
    west,
    south,
    east: west + KAMLOOPS_MUNICIPAL_DEM_GRID_TILE_WIDTH_METERS,
    north: south + KAMLOOPS_MUNICIPAL_DEM_GRID_TILE_HEIGHT_METERS
  };
}

function utmBboxesIntersect(
  left: ReturnType<typeof utmBoundsFromWgs84Bbox>,
  right: ReturnType<typeof utmBoundsFromWgs84Bbox>
) {
  return (
    left.west < right.east &&
    left.east > right.west &&
    left.south < right.north &&
    left.north > right.south
  );
}

function createIndexedKamloopsMunicipalDemGridResponse(
  bbox: NonNullable<TerrainSourceAdapterPlan["bbox"]>
) {
  const target = utmBoundsFromWgs84Bbox(bbox);
  const minColumn = Math.max(
    KAMLOOPS_MUNICIPAL_DEM_GRID_MIN_COLUMN,
    Math.floor(
      (target.west - KAMLOOPS_MUNICIPAL_DEM_GRID_ORIGIN_EASTING) /
        KAMLOOPS_MUNICIPAL_DEM_GRID_FULL_WIDTH_METERS +
        KAMLOOPS_MUNICIPAL_DEM_GRID_ORIGIN_COLUMN
    ) - 1
  );
  const maxColumn = Math.min(
    KAMLOOPS_MUNICIPAL_DEM_GRID_MAX_COLUMN,
    Math.ceil(
      (target.east - KAMLOOPS_MUNICIPAL_DEM_GRID_ORIGIN_EASTING) /
        KAMLOOPS_MUNICIPAL_DEM_GRID_FULL_WIDTH_METERS +
        KAMLOOPS_MUNICIPAL_DEM_GRID_ORIGIN_COLUMN
    ) + 1
  );
  const minRow = Math.max(
    KAMLOOPS_MUNICIPAL_DEM_GRID_MIN_ROW,
    Math.floor(
      (target.south - KAMLOOPS_MUNICIPAL_DEM_GRID_ORIGIN_NORTHING) /
        KAMLOOPS_MUNICIPAL_DEM_GRID_FULL_HEIGHT_METERS +
        KAMLOOPS_MUNICIPAL_DEM_GRID_ORIGIN_ROW
    ) - 1
  );
  const maxRow = Math.min(
    KAMLOOPS_MUNICIPAL_DEM_GRID_MAX_ROW,
    Math.ceil(
      (target.north - KAMLOOPS_MUNICIPAL_DEM_GRID_ORIGIN_NORTHING) /
        KAMLOOPS_MUNICIPAL_DEM_GRID_FULL_HEIGHT_METERS +
        KAMLOOPS_MUNICIPAL_DEM_GRID_ORIGIN_ROW
    ) + 1
  );
  const features: Array<{ attributes: Record<string, unknown> }> = [];

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let column = minColumn; column <= maxColumn; column += 1) {
      for (const quadrant of ["A", "B", "C", "D"] as const) {
        if (!utmBboxesIntersect(target, demGridTileUtmBounds(row, column, quadrant))) continue;
        features.push({
          attributes: {
            OBJECTID: null,
            CELLNAME: `${row.toString().padStart(2, "0")}${column
              .toString()
              .padStart(2, "0")}${quadrant}`,
            PHOTOGRIDLIMITS: "YES",
            VMESH_INDEX_SOURCE: "deterministic-grid-index"
          }
        });
      }
    }
  }

  return {
    features: features.sort((left, right) =>
      String(left.attributes.CELLNAME).localeCompare(String(right.attributes.CELLNAME))
    )
  };
}

function mergeKamloopsMunicipalDemGridResponses(
  primaryResponse: unknown,
  indexedResponse: unknown
) {
  const featuresByCellName = new Map<string, { attributes: Record<string, unknown> }>();

  for (const response of [indexedResponse, primaryResponse]) {
    if (!isRecord(response) || !Array.isArray(response.features)) continue;
    for (const feature of response.features) {
      if (!isRecord(feature)) continue;
      const attributes = isRecord(feature.attributes) ? feature.attributes : null;
      const cellName = attributes ? stringAttr(attributes.CELLNAME) : null;
      if (!attributes || !cellName) continue;
      featuresByCellName.set(cellName, { attributes });
    }
  }

  return {
    features: Array.from(featuresByCellName.values()).sort((left, right) =>
      String(left.attributes.CELLNAME).localeCompare(String(right.attributes.CELLNAME))
    )
  };
}

interface BcLidarAssetSelection {
  sourceId: string;
  href: string;
  year: number | null;
  spacing: string;
  filename: string;
  projection: string | null;
}

interface UsgsLpcDsmSelection {
  sourceId: string;
  lpcLink: string;
  metadataLink: string | null;
  sourcedemLink: string | null;
  workunit: string;
  project: string;
  objectId: number | null;
  qualityLevel: string | null;
  specification: string | null;
  pointMethod: string | null;
  demGsdMeters: number;
  horizontalCrs: string | null;
  verticalCrs: string | null;
  geoid: string | null;
  lpcCategory: string | null;
  lpcReason: string | null;
  collectionEnd: number | null;
}

interface KamloopsMunicipalDemGridSelection {
  sourceId: string;
  objectId: number | null;
  cellName: string;
  photoGridLimits: string | null;
  demZipUrl: string;
  lidarZipUrl: string;
  resolutionSource: "arcgis-feature" | "deterministic-grid-index";
}

interface KamloopsMunicipalDemZipAvailability {
  reachable: boolean;
  status: number | null;
  contentLengthBytes: number | null;
}

export type KamloopsMunicipalDemCoverageStatus =
  | "source-backed"
  | "partial"
  | "no-downloadable-cells"
  | "no-grid-cells"
  | "lookup-failed"
  | "blocked";

export interface KamloopsMunicipalDemCoverageCell {
  sourceId: string;
  cellName: string;
  objectId: number | null;
  photoGridLimits: string | null;
  downloadable: boolean;
  rasterZipStatus: "verified" | "missing" | "unchecked";
  demZipHttpStatus: number | null;
  demZipContentLengthBytes: number | null;
  rawLidarZipStatus: "verified" | "missing" | "unchecked";
  lidarZipHttpStatus: number | null;
  lidarZipContentLengthBytes: number | null;
}

export interface KamloopsMunicipalDemCoveragePreflight {
  schemaVersion: "vmesh-kamloops-municipal-dem-coverage-preflight-v1";
  status: KamloopsMunicipalDemCoverageStatus;
  sourceBacked: boolean;
  rasterBacked: boolean;
  rasterZipVerified: boolean;
  rasterSourceVerified: boolean;
  rawLidarArchiveBacked: boolean;
  rawLidarZipVerified: boolean;
  missingRasterCellsRawLidarVerified: boolean;
  rawLidarDtmMaterializerReady: false;
  derivedElevationBacked: boolean;
  derivedElevationSupport: "not-required" | "supported" | "unsupported" | "unknown";
  contourSupportFeatureCount: number | null;
  contourDerived: boolean;
  pointBreakDerived: boolean;
  goldenQualityTerrainCandidate: boolean;
  terrainSourceId: "kamloops-local-lidar-dtm-1m";
  role: "bare-earth-dtm";
  resolutionMeters: 1;
  selectedSourceIds: string[];
  inputRefCount: number;
  inputRefKinds: TerrainSourceAdapterKind[];
  cells: {
    total: number;
    downloadable: KamloopsMunicipalDemCoverageCell[];
    nonDownloadable: KamloopsMunicipalDemCoverageCell[];
  };
  blockedReasons: string[];
  goldenQualityBlockers: string[];
  warnings: string[];
  nextActions: string[];
}

function createUsgsLpcSourceIndexQueryUrl({
  bbox,
  baseUrl = USGS_3DEP_LPC_INDEX_QUERY_URL
}: {
  bbox: NonNullable<TerrainSourceAdapterPlan["bbox"]>;
  baseUrl?: string;
}): string {
  const centerLongitude = (bbox.west + bbox.east) / 2;
  const centerLatitude = (bbox.south + bbox.north) / 2;
  const url = new URL(baseUrl);

  url.searchParams.set("f", "json");
  url.searchParams.set("where", "1=1");
  url.searchParams.set(
    "geometry",
    `${formatCoordinate(centerLongitude)},${formatCoordinate(centerLatitude)}`
  );
  url.searchParams.set("geometryType", "esriGeometryPoint");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("outFields", "*");
  url.searchParams.set("returnGeometry", "false");

  return url.toString();
}

function numberAttr(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringAttr(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isPublicHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function safeKamloopsCellName(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  return /^[A-Z0-9_-]+$/.test(normalized) ? normalized : null;
}

function kamloopsMunicipalDemZipUrl(cellName: string): string {
  return `${KAMLOOPS_MUNICIPAL_2024_DEM_DOWNLOAD_BASE_URL}/DEM_CGVD2013_${cellName}.zip`;
}

function kamloopsMunicipalLidarZipUrl(cellName: string): string {
  return `${KAMLOOPS_MUNICIPAL_2024_LIDAR_DOWNLOAD_BASE_URL}/${cellName}.zip`;
}

function selectKamloopsMunicipalDemGridTiles(value: unknown): KamloopsMunicipalDemGridSelection[] {
  if (!isRecord(value) || !Array.isArray(value.features)) return [];

  const candidates: KamloopsMunicipalDemGridSelection[] = [];

  for (const feature of value.features) {
    if (!isRecord(feature)) continue;
    const attributes = isRecord(feature.attributes) ? feature.attributes : null;
    if (!attributes) continue;

    const rawCellName = stringAttr(attributes.CELLNAME);
    const cellName = rawCellName ? safeKamloopsCellName(rawCellName) : null;
    if (!cellName) continue;

    candidates.push({
      sourceId: `kamloops-municipal-dem-grid:${cellName}`,
      objectId: numberAttr(attributes.OBJECTID),
      cellName,
      photoGridLimits: stringAttr(attributes.PHOTOGRIDLIMITS),
      demZipUrl: kamloopsMunicipalDemZipUrl(cellName),
      lidarZipUrl: kamloopsMunicipalLidarZipUrl(cellName),
      resolutionSource:
        stringAttr(attributes.VMESH_INDEX_SOURCE) === "deterministic-grid-index"
          ? "deterministic-grid-index"
          : "arcgis-feature"
    });
  }

  return candidates.sort((left, right) => left.cellName.localeCompare(right.cellName));
}

function kamloopsMunicipalDemZipAvailabilityForTile(
  tile: KamloopsMunicipalDemGridSelection,
  availability: Record<string, KamloopsMunicipalDemZipAvailability> | undefined
): KamloopsMunicipalDemZipAvailability | undefined {
  return availability?.[tile.cellName] ?? availability?.[tile.demZipUrl];
}

function kamloopsMunicipalLidarZipAvailabilityForTile(
  tile: KamloopsMunicipalDemGridSelection,
  availability: Record<string, KamloopsMunicipalDemZipAvailability> | undefined
): KamloopsMunicipalDemZipAvailability | undefined {
  return availability?.[tile.cellName] ?? availability?.[tile.lidarZipUrl];
}

function isDownloadableKamloopsMunicipalDemGridTile(
  tile: KamloopsMunicipalDemGridSelection,
  availability?: Record<string, KamloopsMunicipalDemZipAvailability>
): boolean {
  const verified = kamloopsMunicipalDemZipAvailabilityForTile(tile, availability);
  if (verified) return verified.reachable;
  return tile.photoGridLimits?.trim().toUpperCase() === "YES";
}

function isAdvertisedKamloopsMunicipalDownloadTile(
  tile: KamloopsMunicipalDemGridSelection
): boolean {
  return tile.photoGridLimits?.trim().toUpperCase() === "YES";
}

function publicKamloopsMunicipalDemCoverageCell(
  tile: KamloopsMunicipalDemGridSelection,
  availability?: Record<string, KamloopsMunicipalDemZipAvailability>,
  lidarAvailability?: Record<string, KamloopsMunicipalDemZipAvailability>
): KamloopsMunicipalDemCoverageCell {
  const verified = kamloopsMunicipalDemZipAvailabilityForTile(tile, availability);
  const lidarVerified = kamloopsMunicipalLidarZipAvailabilityForTile(tile, lidarAvailability);
  return {
    sourceId: tile.sourceId,
    cellName: tile.cellName,
    objectId: tile.objectId,
    photoGridLimits: tile.photoGridLimits,
    downloadable: isDownloadableKamloopsMunicipalDemGridTile(tile, availability),
    rasterZipStatus: verified ? (verified.reachable ? "verified" : "missing") : "unchecked",
    demZipHttpStatus: verified?.status ?? null,
    demZipContentLengthBytes: verified?.contentLengthBytes ?? null,
    rawLidarZipStatus: lidarVerified
      ? lidarVerified.reachable
        ? "verified"
        : "missing"
      : "unchecked",
    lidarZipHttpStatus: lidarVerified?.status ?? null,
    lidarZipContentLengthBytes: lidarVerified?.contentLengthBytes ?? null
  };
}

async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(input, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

async function verifyKamloopsMunicipalDemZipAvailability({
  tiles,
  fetchImpl,
  timeoutMs,
  urlForTile = (tile) => tile.demZipUrl
}: {
  tiles: KamloopsMunicipalDemGridSelection[];
  fetchImpl: typeof fetch;
  timeoutMs: number;
  urlForTile?: (tile: KamloopsMunicipalDemGridSelection) => string;
}): Promise<Record<string, KamloopsMunicipalDemZipAvailability>> {
  async function probeUrl(url: string): Promise<KamloopsMunicipalDemZipAvailability> {
    const attempts: RequestInit[] = [
      { method: "HEAD", headers: { Accept: "application/zip,*/*" } },
      { method: "HEAD", headers: { Accept: "application/zip,*/*" } },
      { method: "GET", headers: { Accept: "application/zip,*/*", Range: "bytes=0-0" } }
    ];

    let lastStatus: number | null = null;
    for (const attempt of attempts) {
      try {
        const response = await fetchWithTimeout(fetchImpl, url, attempt, timeoutMs);
        lastStatus = response.status;
        const contentLength = Number(response.headers.get("content-length") ?? "");
        const contentRange = response.headers.get("content-range") ?? "";
        const rangeSize = /\/(\d+)$/i.exec(contentRange)?.[1];
        if (response.body) await response.body.cancel().catch(() => undefined);
        if (response.ok || response.status === 206) {
          return {
            reachable: true,
            status: response.status,
            contentLengthBytes:
              Number.isFinite(contentLength) && contentLength > 0
                ? contentLength
                : rangeSize
                  ? Number(rangeSize)
                  : null
          };
        }
      } catch {
        lastStatus = null;
      }
    }

    return {
      reachable: false,
      status: lastStatus,
      contentLengthBytes: null
    };
  }

  const entries = await Promise.all(
    tiles.map(async (tile) => {
      return [tile.cellName, await probeUrl(urlForTile(tile))] as const;
    })
  );

  return Object.fromEntries(entries);
}

function createKamloopsMunicipalContourSupportCountQueryUrl({
  bbox,
  baseUrl = KAMLOOPS_MUNICIPAL_CONTOUR_1M_LAYER_URL
}: {
  bbox: NonNullable<TerrainSourceAdapterPlan["bbox"]>;
  baseUrl?: string;
}): string {
  const url = new URL(`${baseUrl}/query`);
  url.searchParams.set("f", "json");
  url.searchParams.set("where", "1=1");
  url.searchParams.set("geometry", bboxString(bbox));
  url.searchParams.set("geometryType", "esriGeometryEnvelope");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("returnCountOnly", "true");
  url.searchParams.set("returnGeometry", "false");
  return url.toString();
}

async function verifyKamloopsMunicipalContourSupport({
  bbox,
  fetchImpl,
  timeoutMs
}: {
  bbox: NonNullable<TerrainSourceAdapterPlan["bbox"]>;
  fetchImpl: typeof fetch;
  timeoutMs: number;
}): Promise<
  | { status: "supported"; count: number; warnings?: string[] }
  | { status: "unsupported"; count: number; warnings?: string[] }
  | { status: "unknown"; reason: string }
> {
  const failures: string[] = [];

  for (const baseUrl of KAMLOOPS_MUNICIPAL_CONTOUR_1M_LAYER_FALLBACK_URLS) {
    try {
      const response = await fetchWithTimeout(
        fetchImpl,
        createKamloopsMunicipalContourSupportCountQueryUrl({ bbox, baseUrl }),
        { headers: { Accept: "application/json" } },
        timeoutMs
      );
      if (!response.ok) {
        failures.push(`HTTP ${response.status} from ${new URL(baseUrl).hostname}`);
        continue;
      }

      const payload = (await response.json()) as unknown;
      if (!isRecord(payload)) {
        failures.push(`non-object payload from ${new URL(baseUrl).hostname}`);
        continue;
      }
      if (isRecord(payload.error)) {
        const message =
          typeof payload.error.message === "string" ? payload.error.message : "ArcGIS query error";
        failures.push(`${message} from ${new URL(baseUrl).hostname}`);
        continue;
      }

      const count =
        typeof payload.count === "number" && Number.isFinite(payload.count) ? payload.count : null;
      if (count === null) {
        failures.push(`missing count from ${new URL(baseUrl).hostname}`);
        continue;
      }

      const warnings =
        failures.length > 0
          ? [
              `City of Kamloops contour support probe used ${new URL(baseUrl).hostname} after ${failures.join("; ")}.`
            ]
          : undefined;
      return count > 0
        ? { status: "supported", count, warnings }
        : { status: "unsupported", count, warnings };
    } catch (error) {
      failures.push(
        error instanceof Error
          ? `${error.message} from ${new URL(baseUrl).hostname}`
          : `request failed from ${new URL(baseUrl).hostname}`
      );
    }
  }

  return {
    status: "unknown",
    reason: `City of Kamloops contour support probe failed: ${failures.join("; ")}.`
  };
}

function kamloopsMunicipalDemPreflightInput(
  input: TerrainPackageWorkerInput
): TerrainPackageWorkerInput {
  if (!input.request) return input;
  return {
    ...input,
    request: {
      ...input.request,
      layers: ["terrain"],
      preferredSourceIds: ["kamloops-local-lidar-dtm-1m"]
    }
  };
}

function kamloopsMunicipalDemCoverageStatus({
  plan,
  downloadable,
  nonDownloadable,
  statusOverride
}: {
  plan: TerrainSourceAdapterPlan;
  downloadable: KamloopsMunicipalDemCoverageCell[];
  nonDownloadable: KamloopsMunicipalDemCoverageCell[];
  statusOverride?: KamloopsMunicipalDemCoverageStatus;
}): KamloopsMunicipalDemCoverageStatus {
  if (statusOverride) return statusOverride;
  if (plan.status === "ready") {
    return "source-backed";
  }
  if (downloadable.length > 0 && nonDownloadable.length > 0) return "partial";
  if (downloadable.length === 0 && nonDownloadable.length > 0) return "no-downloadable-cells";
  if (downloadable.length === 0 && nonDownloadable.length === 0) return "no-grid-cells";
  return "blocked";
}

export function createKamloopsMunicipalDemCoveragePreflight(
  input: TerrainPackageWorkerInput,
  demGridResponse: unknown,
  options: TerrainSourceAdapterOptions = {},
  statusOverride?: KamloopsMunicipalDemCoverageStatus
): KamloopsMunicipalDemCoveragePreflight {
  const preflightInput = kamloopsMunicipalDemPreflightInput(input);
  const zipAvailability = options.kamloopsMunicipalDemZipAvailability;
  const lidarZipAvailability = options.kamloopsMunicipalLidarZipAvailability;
  const tiles = selectKamloopsMunicipalDemGridTiles(demGridResponse);
  const downloadable = tiles
    .filter((tile) => isDownloadableKamloopsMunicipalDemGridTile(tile, zipAvailability))
    .map((tile) =>
      publicKamloopsMunicipalDemCoverageCell(tile, zipAvailability, lidarZipAvailability)
    );
  const nonDownloadable = tiles
    .filter((tile) => !isDownloadableKamloopsMunicipalDemGridTile(tile, zipAvailability))
    .map((tile) =>
      publicKamloopsMunicipalDemCoverageCell(tile, zipAvailability, lidarZipAvailability)
    );
  const plan = createTerrainSourceAdapterPlan(preflightInput, {
    ...options,
    kamloopsMunicipalDemGridResponse: demGridResponse
  });
  const status = kamloopsMunicipalDemCoverageStatus({
    plan,
    downloadable,
    nonDownloadable,
    statusOverride
  });
  const inputRefKinds = Array.from(new Set(plan.inputRefs.map((inputRef) => inputRef.kind)));
  const usesDemZipRail = plan.inputRefs.some((inputRef) =>
    /\/opendata\/DEM\/[0-9]{4}_CGVD[0-9]+\/DEM_CGVD[0-9]+_[A-Z0-9_-]+\.zip$/i.test(
      new URL(inputRef.url).pathname
    )
  );
  const usesDirectRasterRail = plan.inputRefs.some(
    (inputRef) =>
      inputRef.kind === "direct-geotiff" ||
      inputRef.kind === "s3-cog" ||
      inputRef.kind === "arcgis-image-export"
  );
  const usesPointBreakDerivedRail = plan.inputRefs.some(
    (inputRef) => inputRef.url === KAMLOOPS_MUNICIPAL_DEM_POINT_BREAK_SHP_URL
  );
  const usesContourDerivedRail = plan.inputRefs.some(
    (inputRef) => inputRef.url === KAMLOOPS_MUNICIPAL_CONTOUR_1M_LAYER_URL
  );
  const rasterBacked = usesDemZipRail || usesDirectRasterRail;
  const rasterZipVerified =
    usesDemZipRail &&
    downloadable.length > 0 &&
    downloadable.every((cell) => cell.rasterZipStatus === "verified");
  const rasterSourceVerified = usesDirectRasterRail || rasterZipVerified;
  const allCells = [...downloadable, ...nonDownloadable];
  const rawLidarArchiveBacked =
    allCells.length > 0 && allCells.every((cell) => cell.rawLidarZipStatus === "verified");
  const rawLidarZipVerified = rawLidarArchiveBacked;
  const missingRasterCellsRawLidarVerified =
    nonDownloadable.length > 0 &&
    nonDownloadable.every((cell) => cell.rawLidarZipStatus === "verified");
  const derivedElevationBacked = usesPointBreakDerivedRail || usesContourDerivedRail;
  const derivedElevationSupport = derivedElevationBacked ? "unknown" : "not-required";
  const runtimeStatus = status === "source-backed" && derivedElevationBacked ? "partial" : status;
  const runtimeSourceBacked = runtimeStatus === "source-backed";
  const goldenQualityTerrainCandidate =
    runtimeSourceBacked &&
    rasterBacked &&
    rasterSourceVerified &&
    !derivedElevationBacked &&
    nonDownloadable.length === 0;
  const goldenQualityBlockers = [
    !runtimeSourceBacked
      ? "Kamloops municipal source refs are not source-backed for this exact 3 km slice."
      : null,
    !rasterBacked
      ? "No materializable municipal raster DEM/DTM ref was selected for this exact 3 km slice."
      : null,
    usesDemZipRail && !rasterZipVerified
      ? "Selected municipal raster DEM refs were not all verified reachable by public URL probe."
      : null,
    usesPointBreakDerivedRail
      ? "Selected terrain includes DEMPoint/DEMBreakline-derived elevation evidence, not a 1m raster DEM ZIP."
      : null,
    usesContourDerivedRail
      ? "Selected terrain includes contour-derived elevation evidence, not a 1m raster DEM ZIP."
      : null,
    !rasterSourceVerified && missingRasterCellsRawLidarVerified
      ? "Missing municipal DEM raster cells have reachable public raw LiDAR ZIP archives, but no point-cloud-to-DTM materializer has proven runtime terrain for this route yet."
      : null,
    nonDownloadable.length > 0
      ? `The exact 3 km slice intersects ${nonDownloadable.length} public DEM grid cell(s) marked non-downloadable.`
      : null
  ].filter((item): item is string => Boolean(item));

  return {
    schemaVersion: "vmesh-kamloops-municipal-dem-coverage-preflight-v1",
    status: runtimeStatus,
    sourceBacked: runtimeSourceBacked,
    rasterBacked,
    rasterZipVerified,
    rasterSourceVerified,
    rawLidarArchiveBacked,
    rawLidarZipVerified,
    missingRasterCellsRawLidarVerified,
    rawLidarDtmMaterializerReady: false,
    derivedElevationBacked,
    derivedElevationSupport,
    contourSupportFeatureCount: null,
    contourDerived: usesContourDerivedRail,
    pointBreakDerived: usesPointBreakDerivedRail,
    goldenQualityTerrainCandidate,
    terrainSourceId: "kamloops-local-lidar-dtm-1m",
    role: "bare-earth-dtm",
    resolutionMeters: 1,
    selectedSourceIds:
      runtimeSourceBacked && plan.selectedSource?.id ? [plan.selectedSource.id] : [],
    inputRefCount: plan.inputRefs.length,
    inputRefKinds,
    cells: {
      total: tiles.length,
      downloadable,
      nonDownloadable
    },
    blockedReasons: plan.blockedReasons,
    goldenQualityBlockers,
    warnings: plan.warnings,
    nextActions: runtimeSourceBacked
      ? derivedElevationBacked
        ? [
            "Call the Abundance site-runtime-pack route in sourcePackMode=required for this coordinate.",
            missingRasterCellsRawLidarVerified
              ? "A raw-LiDAR-to-DTM worker could promote the missing raster cell(s), because every missing public DEM cell has a verified public raw LiDAR ZIP archive."
              : "If raw LiDAR ZIPs are verified for every missing DEM raster cell, queue a point-cloud-to-DTM worker before claiming golden-quality terrain.",
            "The worker must attempt DEMPoint/DEMBreakline or contour-derived interpolation, QA support distances, and preserve derived-elevation warnings before claiming runtime terrain readiness.",
            "Do not label this path as a 1m LiDAR raster DEM ZIP; it is official municipal derived-elevation terrain."
          ]
        : [
            "Call the Abundance site-runtime-pack route in sourcePackMode=required for this coordinate.",
            "The worker must still fetch/window each DEM ZIP and prove full non-no-data coverage before claiming runtime terrain readiness."
          ]
      : [
          "Do not claim golden-quality terrain for this exact centered 3 km slice.",
          "Offer fallback visual terrain, pick another center, or add another official DTM source for the missing cells."
        ]
  };
}

function withLiveDerivedElevationSupport(
  preflight: KamloopsMunicipalDemCoveragePreflight,
  contourSupport:
    | { status: "supported"; count: number; warnings?: string[] }
    | { status: "unsupported"; count: number; warnings?: string[] }
    | { status: "unknown"; reason: string }
): KamloopsMunicipalDemCoveragePreflight {
  if (!preflight.derivedElevationBacked) return preflight;

  if (contourSupport.status === "supported") {
    const goldenQualityBlockers = preflight.goldenQualityBlockers.filter(
      (blocker) =>
        !blocker.startsWith(
          "Kamloops municipal source refs are not source-backed for this exact 3 km slice."
        )
    );

    return {
      ...preflight,
      status: "source-backed",
      sourceBacked: true,
      selectedSourceIds: [preflight.terrainSourceId],
      derivedElevationSupport: "supported",
      contourSupportFeatureCount: contourSupport.count,
      goldenQualityBlockers,
      warnings: [
        ...preflight.warnings,
        ...(contourSupport.warnings ?? []),
        `City of Kamloops contour support probe found ${contourSupport.count} contour feature(s) for this exact 3 km AOI.`
      ],
      nextActions: [
        "Call the Abundance site-runtime-pack route in sourcePackMode=required for this coordinate.",
        preflight.missingRasterCellsRawLidarVerified
          ? "A raw-LiDAR-to-DTM worker could promote the missing raster cell(s), because every missing public DEM cell has a verified public raw LiDAR ZIP archive."
          : "The worker must use official DEMPoint/DEMBreakline or contour-derived interpolation for cells without a verified raster DEM ZIP.",
        "The worker must QA support distances and preserve derived-elevation warnings before claiming runtime terrain readiness.",
        "Do not label this path as a 1m LiDAR raster DEM ZIP; it is official municipal derived-elevation terrain."
      ]
    };
  }

  const reason =
    contourSupport.status === "unsupported"
      ? "City of Kamloops municipal contour support probe returned zero features for this exact 3 km AOI; DEMPoint/DEMBreakline support must be proven by the Abundance materializer before any source-backed terrain claim."
      : contourSupport.reason;

  if (preflight.pointBreakDerived) {
    return {
      ...preflight,
      status: "partial",
      sourceBacked: false,
      selectedSourceIds: [],
      derivedElevationSupport: contourSupport.status === "unknown" ? "unknown" : "unsupported",
      contourSupportFeatureCount:
        contourSupport.status === "unsupported" ? contourSupport.count : null,
      goldenQualityBlockers: [...preflight.goldenQualityBlockers, reason],
      warnings: [
        ...preflight.warnings,
        reason,
        "VMesh retained the public DEMPoint/DEMBreakline materializer candidate because exact point/breakline support is a worker QA decision, not a contour-count proxy."
      ],
      nextActions: [
        "Call the Abundance site-runtime-pack route in sourcePackMode=required if source-backed terrain is required for this coordinate.",
        "Abundance must attempt DEMPoint/DEMBreakline materialization, QA source-support distances, and fail closed if the exact AOI is too sparse.",
        "Auto mode may fall back to labelled visual terrain if DEMPoint/Breakline materialization cannot prove runtime terrain readiness.",
        "Do not claim this route as Kamloops-golden-quality terrain unless a raster DEM ZIP or raw-LiDAR DTM worker succeeds."
      ]
    };
  }

  if (preflight.rasterBacked) {
    return {
      ...preflight,
      status: "partial",
      sourceBacked: false,
      selectedSourceIds: [],
      derivedElevationSupport: contourSupport.status === "unknown" ? "unknown" : "unsupported",
      contourSupportFeatureCount:
        contourSupport.status === "unsupported" ? contourSupport.count : null,
      goldenQualityBlockers: [...preflight.goldenQualityBlockers, reason],
      warnings: [...preflight.warnings, reason],
      nextActions: [
        "Do not claim golden-quality terrain for this exact centered 3 km slice.",
        "Abundance may attempt the mixed municipal DEM/derived-elevation rail, but auto mode must fall back to labelled visual terrain if runtime repair QA fails.",
        "Offer fallback visual terrain, pick another center, or add another official DTM source for the missing cells."
      ]
    };
  }

  return {
    ...preflight,
    status: contourSupport.status === "unknown" ? "lookup-failed" : "blocked",
    sourceBacked: false,
    selectedSourceIds: [],
    derivedElevationSupport: contourSupport.status === "unknown" ? "unknown" : "unsupported",
    contourSupportFeatureCount:
      contourSupport.status === "unsupported" ? contourSupport.count : null,
    blockedReasons: [...preflight.blockedReasons, reason],
    goldenQualityBlockers: [...preflight.goldenQualityBlockers, reason],
    warnings: [...preflight.warnings, reason],
    nextActions: [
      "Do not claim source-backed or golden-quality terrain for this exact centered 3 km slice.",
      "Offer fallback visual terrain, pick another center, or add another official DTM source for the missing cells."
    ]
  };
}

export async function createLiveKamloopsMunicipalDemCoveragePreflight(
  input: TerrainPackageWorkerInput,
  options: TerrainSourceAdapterOptions = {}
): Promise<KamloopsMunicipalDemCoveragePreflight> {
  const preflightInput = kamloopsMunicipalDemPreflightInput(input);
  const initialPlan = createTerrainSourceAdapterPlan(preflightInput, options);

  if (!initialPlan.bbox) {
    return createKamloopsMunicipalDemCoveragePreflight(
      preflightInput,
      { features: [] },
      options,
      "blocked"
    );
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const kamloopsProbeTimeoutMs = options.kamloopsMunicipalDemProbeTimeoutMs ?? 15_000;

  async function createIndexedPreflight(
    reason: string
  ): Promise<KamloopsMunicipalDemCoveragePreflight> {
    const demGridResponse = createIndexedKamloopsMunicipalDemGridResponse(initialPlan.bbox!);
    const tiles = selectKamloopsMunicipalDemGridTiles(demGridResponse);
    const zipAvailability =
      options.verifyKamloopsMunicipalDemZipUrls === false
        ? options.kamloopsMunicipalDemZipAvailability
        : await verifyKamloopsMunicipalDemZipAvailability({
            tiles,
            fetchImpl,
            timeoutMs: kamloopsProbeTimeoutMs
          });
    const tilesMissingDemRaster = tiles.filter(
      (tile) => !isDownloadableKamloopsMunicipalDemGridTile(tile, zipAvailability)
    );
    const lidarZipAvailability =
      options.verifyKamloopsMunicipalLidarZipUrls === false
        ? options.kamloopsMunicipalLidarZipAvailability
        : tilesMissingDemRaster.length > 0
          ? {
              ...(options.kamloopsMunicipalLidarZipAvailability ?? {}),
              ...(await verifyKamloopsMunicipalDemZipAvailability({
                tiles: tilesMissingDemRaster,
                fetchImpl,
                timeoutMs: kamloopsProbeTimeoutMs,
                urlForTile: (tile) => tile.lidarZipUrl
              }))
            }
          : options.kamloopsMunicipalLidarZipAvailability;
    const preflight = createKamloopsMunicipalDemCoveragePreflight(preflightInput, demGridResponse, {
      ...options,
      kamloopsMunicipalDemZipAvailability: zipAvailability,
      kamloopsMunicipalLidarZipAvailability: lidarZipAvailability
    });
    const withIndexedWarning = {
      ...preflight,
      warnings: [
        ...preflight.warnings,
        `${reason}; VMesh consulted its deterministic public DEM ZIP grid index and still verified candidate ZIP URLs before source selection.`
      ]
    };

    if (
      options.verifyKamloopsMunicipalContourSupport !== false &&
      withIndexedWarning.derivedElevationBacked
    ) {
      const contourSupport = await verifyKamloopsMunicipalContourSupport({
        bbox: initialPlan.bbox!,
        fetchImpl,
        timeoutMs: kamloopsProbeTimeoutMs
      });
      return withLiveDerivedElevationSupport(withIndexedWarning, contourSupport);
    }

    return withIndexedWarning;
  }

  if (
    initialPlan.status === "ready" &&
    initialPlan.toolProfile?.toolId === "kamloops-local-lidar" &&
    initialPlan.inputRefs.some(
      (inputRef) =>
        inputRef.kind === "direct-geotiff" ||
        inputRef.kind === "s3-cog" ||
        inputRef.kind === "arcgis-image-export"
    )
  ) {
    return createKamloopsMunicipalDemCoveragePreflight(preflightInput, { features: [] }, options);
  }

  try {
    const response = await fetchWithTimeout(
      fetchImpl,
      createKamloopsMunicipalDemGridQueryUrl({
        bbox: initialPlan.bbox,
        baseUrl: options.kamloopsMunicipalDemGridBaseUrl ?? KAMLOOPS_MUNICIPAL_DEM_GRID_LAYER_URL
      }),
      { headers: { Accept: "application/json" } },
      kamloopsProbeTimeoutMs
    );

    if (!response.ok) {
      return createIndexedPreflight(
        `City of Kamloops public DEM Grid resolver failed with HTTP ${response.status}`
      );
    }

    const demGridResponse = (await response.json()) as unknown;
    const liveTiles = selectKamloopsMunicipalDemGridTiles(demGridResponse);
    const indexedDemGridResponse = createIndexedKamloopsMunicipalDemGridResponse(initialPlan.bbox);
    const effectiveDemGridResponse =
      liveTiles.length > 0
        ? mergeKamloopsMunicipalDemGridResponses(demGridResponse, indexedDemGridResponse)
        : demGridResponse;
    const tiles = selectKamloopsMunicipalDemGridTiles(effectiveDemGridResponse);
    if (tiles.length === 0) {
      return createIndexedPreflight(
        "City of Kamloops public DEM Grid resolver returned no raster cells for this exact 3 km AOI"
      );
    }

    const zipAvailability =
      options.verifyKamloopsMunicipalDemZipUrls === false
        ? options.kamloopsMunicipalDemZipAvailability
        : await verifyKamloopsMunicipalDemZipAvailability({
            tiles,
            fetchImpl,
            timeoutMs: kamloopsProbeTimeoutMs
          });
    const tilesMissingDemRaster = tiles.filter(
      (tile) => !isDownloadableKamloopsMunicipalDemGridTile(tile, zipAvailability)
    );
    const lidarZipAvailability =
      options.verifyKamloopsMunicipalLidarZipUrls === false
        ? options.kamloopsMunicipalLidarZipAvailability
        : tilesMissingDemRaster.length > 0
          ? {
              ...(options.kamloopsMunicipalLidarZipAvailability ?? {}),
              ...(await verifyKamloopsMunicipalDemZipAvailability({
                tiles: tilesMissingDemRaster,
                fetchImpl,
                timeoutMs: kamloopsProbeTimeoutMs,
                urlForTile: (tile) => tile.lidarZipUrl
              }))
            }
          : options.kamloopsMunicipalLidarZipAvailability;

    const preflight = createKamloopsMunicipalDemCoveragePreflight(
      preflightInput,
      effectiveDemGridResponse,
      {
        ...options,
        kamloopsMunicipalDemZipAvailability: zipAvailability,
        kamloopsMunicipalLidarZipAvailability: lidarZipAvailability
      }
    );
    const addedIndexedCellCount = tiles.length - liveTiles.length;
    const preflightWithAugmentedIndexWarning =
      addedIndexedCellCount > 0
        ? {
            ...preflight,
            warnings: [
              ...preflight.warnings,
              `City of Kamloops public DEM Grid resolver returned ${liveTiles.length} raster cell(s) for this exact 3 km AOI; VMesh added ${addedIndexedCellCount} deterministic public DEM ZIP grid candidate cell(s) and verified candidate ZIP URLs before source selection.`
            ]
          }
        : preflight;

    if (
      options.verifyKamloopsMunicipalContourSupport !== false &&
      preflightWithAugmentedIndexWarning.derivedElevationBacked
    ) {
      const contourSupport = await verifyKamloopsMunicipalContourSupport({
        bbox: initialPlan.bbox,
        fetchImpl,
        timeoutMs: kamloopsProbeTimeoutMs
      });
      return withLiveDerivedElevationSupport(preflightWithAugmentedIndexWarning, contourSupport);
    }

    return preflightWithAugmentedIndexWarning;
  } catch (error) {
    return createIndexedPreflight(
      error instanceof Error
        ? `City of Kamloops public DEM Grid resolver failed: ${error.message}`
        : "City of Kamloops public DEM Grid resolver failed"
    );
  }
}

function selectUsgsLpcDsmSource(
  value: unknown,
  targetResolutionMeters = 1
): UsgsLpcDsmSelection | null {
  if (!isRecord(value) || !Array.isArray(value.features)) return null;

  const candidates: UsgsLpcDsmSelection[] = [];

  for (const feature of value.features) {
    if (!isRecord(feature)) continue;
    const attributes = isRecord(feature.attributes) ? feature.attributes : null;
    if (!attributes) continue;

    const lpcLink = stringAttr(attributes.lpc_link);
    const workunit = stringAttr(attributes.workunit);
    const project = stringAttr(attributes.project) ?? workunit;
    const demGsdMeters = numberAttr(attributes.dem_gsd_meters);
    const objectId = numberAttr(attributes.OBJECTID);

    if (!lpcLink || !workunit || !project || demGsdMeters === null) continue;
    if (!isPublicHttpUrl(lpcLink)) continue;
    if (demGsdMeters > targetResolutionMeters) continue;

    const lpcCategory = stringAttr(attributes.lpc_category);
    const lpcReason = stringAttr(attributes.lpc_reason);
    const meetsLpc =
      lpcCategory?.toLowerCase().startsWith("meets") === true ||
      lpcReason?.toLowerCase().includes("meets 3dep lpc requirements") === true;
    if (!meetsLpc) continue;

    candidates.push({
      sourceId: `usgs-3dep-lpc-dsm:${objectId ?? workunit}`,
      lpcLink,
      metadataLink: stringAttr(attributes.metadata_link),
      sourcedemLink: stringAttr(attributes.sourcedem_link),
      workunit,
      project,
      objectId,
      qualityLevel: stringAttr(attributes.ql),
      specification: stringAttr(attributes.spec),
      pointMethod: stringAttr(attributes.p_method),
      demGsdMeters,
      horizontalCrs: stringAttr(attributes.horiz_crs),
      verticalCrs: stringAttr(attributes.vert_crs),
      geoid: stringAttr(attributes.geoid),
      lpcCategory,
      lpcReason,
      collectionEnd: numberAttr(attributes.collect_end)
    });
  }

  return (
    candidates.sort((left, right) => {
      if (left.demGsdMeters !== right.demGsdMeters) return left.demGsdMeters - right.demGsdMeters;
      return (right.collectionEnd ?? 0) - (left.collectionEnd ?? 0);
    })[0] ?? null
  );
}

function selectBcLidarOneMeterAsset(
  value: unknown,
  role: TerrainSourcePreviewRole
): BcLidarAssetSelection | null {
  if (!isRecord(value) || !Array.isArray(value.features)) return null;

  const assets: BcLidarAssetSelection[] = [];

  for (const feature of value.features) {
    if (!isRecord(feature)) continue;
    const attributes = isRecord(feature.attributes) ? feature.attributes : null;
    if (!attributes) continue;

    const href = typeof attributes.s3Url === "string" ? attributes.s3Url : "";
    const spacing = typeof attributes.spacing === "string" ? attributes.spacing.trim() : "";
    const filename = typeof attributes.filename === "string" ? attributes.filename : "unknown";
    const maptile = typeof attributes.maptile === "string" ? attributes.maptile : filename;
    const year =
      typeof attributes.year === "number" && Number.isFinite(attributes.year)
        ? attributes.year
        : null;
    const projection = typeof attributes.projection === "string" ? attributes.projection : null;

    if (!/^https?:\/\//i.test(href)) continue;
    if (!/1\s*met(re|er)/i.test(spacing) && !/xli1m/i.test(filename)) continue;
    if (role === "dsm" && !/dsm/i.test(filename)) continue;
    if (role === "dtm" && /dsm/i.test(filename)) continue;

    assets.push({
      sourceId: `bc-lidarbc:${role}:${maptile}:${year ?? "unknown"}`,
      href,
      year,
      spacing: spacing || "1 metre inferred from filename",
      filename,
      projection
    });
  }

  return assets.sort((left, right) => (right.year ?? 0) - (left.year ?? 0))[0] ?? null;
}

function createUsgs3depSourcePlan(context: SourceAdapterContext): TerrainSourceAdapterPlan {
  if (context.options.usgs3depCoverageResponse) {
    const covered =
      isRecord(context.options.usgs3depCoverageResponse) &&
      Array.isArray(context.options.usgs3depCoverageResponse.features) &&
      context.options.usgs3depCoverageResponse.features.length > 0;

    if (!covered) {
      return blockedPlan({
        context,
        reasons: ["USGS 3DEP 1m product index did not cover the selected AOI centroid."],
        warnings: [
          "Do not emit a USGS 3DEP DTM source input until product-index coverage is proven."
        ]
      });
    }
  }

  const imageSize = targetImageSize({
    bbox: context.bbox,
    targetResolutionMeters: context.toolProfile.targetResolutionMeters,
    maxImageSide: context.options.maxImageSide
  });
  const url = buildArcgisImageExportUrl({
    endpoint:
      context.options.usgs3depImageServerUrl ??
      context.options.env?.VMESH_USGS_3DEP_IMAGE_SERVER_EXPORT_URL ??
      USGS_3DEP_IMAGE_SERVER_EXPORT_URL,
    bbox: context.bbox,
    widthPx: imageSize.widthPx,
    heightPx: imageSize.heightPx
  });

  if (containsSecretLikeValue(url)) {
    return blockedPlan({
      context,
      reasons: ["USGS 3DEP ImageServer URL contains a secret-bearing query or credential."],
      warnings: [`Rejected source ref: ${sanitizePublicUrl(url)}`]
    });
  }

  return readyPlan({
    context,
    inputRefs: [
      buildInputRef({
        context,
        kind: "arcgis-image-export",
        url,
        format: "geotiff",
        notes: [
          "Official USGS 3DEP ArcGIS ImageServer export request for the selected AOI.",
          "The worker must QA coverage and source metadata after fetching; this plan is not a retained terrain artifact.",
          context.options.usgs3depCoverageResponse
            ? "USGS 3DEP 1m product-index coverage was checked for this AOI centroid before planning the export request."
            : "Use npm run terrain:usgs-render for USGS 3DEP 1m product-index proof and retained rendered tile evidence."
        ]
      })
    ],
    warnings: [
      "Run class is dry-run: vmesh planned the official source request but did not fetch or retain terrain artifacts.",
      ...(imageSize.capped
        ? [
            `Export size was capped at ${context.options.maxImageSide}px per side; production workers should tile/window larger AOIs.`
          ]
        : [])
    ]
  });
}

function createIndexedRegionalTerrainSourcePlan(
  context: SourceAdapterContext
): TerrainSourceAdapterPlan {
  return readyPlan({
    context,
    inputRefs: [
      buildInputRef({
        context,
        kind: "source-index-required",
        url: context.source.sourceUrl,
        format: "json",
        role: "source-index",
        notes: [
          `Official ${context.toolProfile.provider} source index for the requested 3 km frame.`,
          "VMesh indexes the source and worker contract only; Abundance must resolve exact tiles, fetch bounded raster windows, and run no-data QA.",
          "A source-index handoff is not source-pixel proof and must fail through to the next ranked terrain rail when exact coverage is absent."
        ]
      })
    ],
    warnings: [
      "Run class is dry-run: VMesh selected a regional source index, not a retained terrain payload."
    ]
  });
}

function createUsgsLpcDsmSourcePlan(context: SourceAdapterContext): TerrainSourceAdapterPlan {
  const selected = context.options.usgsLpcSourceIndexResponse
    ? selectUsgsLpcDsmSource(
        context.options.usgsLpcSourceIndexResponse,
        context.toolProfile.targetResolutionMeters
      )
    : null;

  if (selected) {
    if (
      containsSecretLikeValue(selected.lpcLink) ||
      (selected.metadataLink && containsSecretLikeValue(selected.metadataLink)) ||
      (selected.sourcedemLink && containsSecretLikeValue(selected.sourcedemLink))
    ) {
      return blockedPlan({
        context,
        reasons: ["USGS LPC source index resolved a secret-bearing source ref."],
        warnings: ["Secret-bearing source refs are not emitted."]
      });
    }

    return readyPlan({
      context,
      inputRefs: [
        buildInputRef({
          context,
          kind: "source-index-required",
          url: selected.lpcLink,
          format: "json",
          role: "source-index",
          notes: [
            `Resolved from official USGS 3DEP Lidar Point Cloud index as ${selected.sourceId}.`,
            `Project ${selected.project}; workunit ${selected.workunit}; quality ${selected.qualityLevel ?? "unknown"}; source DEM GSD ${selected.demGsdMeters}m.`,
            "This is source availability for DSM derivation, not a browser-ready DSM tile.",
            "A production worker must enumerate LAZ/LAS files from the LPC source directory, derive a 1m DSM with PDAL or equivalent point-cloud tooling, retain QA, and then emit display COG/PNG/PMTiles artifacts."
          ]
        })
      ],
      warnings: [
        "Run class is dry-run: vmesh resolved an official 3DEP LPC source index, but has not downloaded point clouds or derived DSM artifacts.",
        "Local runtime must have PDAL/LAZ tooling before this can become a live DSM display tile."
      ]
    });
  }

  if (context.options.usgsLpcSourceIndexResponse) {
    return blockedPlan({
      context,
      reasons: [
        "USGS 3DEP LPC index did not return a 1m-class source project that meets 3DEP LPC requirements for this AOI."
      ],
      warnings: [
        "Keep USA DSM unavailable for this AOI until a qualifying LPC, IfSAR DSM, or other official surface-model source is resolved."
      ]
    });
  }

  return blockedPlan({
    context,
    reasons: [
      "USGS LPC DSM requires a live 3DEP Lidar Point Cloud source-index lookup before vmesh can derive a source-native DSM."
    ],
    warnings: [
      "Use createLiveTerrainSourceAdapterPlan to query the official USGS 3DEP Lidar Point Cloud index. Display tiles still require a point-cloud DSM worker."
    ]
  });
}

function configuredSourceUrl({
  context,
  url,
  urlTemplate,
  missingReason
}: {
  context: SourceAdapterContext;
  url?: string;
  urlTemplate?: string;
  missingReason: string;
}): string | null {
  const imageSize = targetImageSize({
    bbox: context.bbox,
    targetResolutionMeters: context.toolProfile.targetResolutionMeters,
    maxImageSide: context.options.maxImageSide
  });
  const directUrl = url?.trim();
  const templateUrl = urlTemplate?.trim();
  const configured = directUrl ?? templateUrl;

  if (!configured) return null;

  const expanded =
    templateUrl && !directUrl
      ? expandTerrainSourceUrlTemplate({
          template: configured,
          bbox: context.bbox,
          packageId: context.plan.id,
          sourceId: context.source.id,
          toolId: context.toolProfile.toolId,
          targetResolutionMeters: context.toolProfile.targetResolutionMeters,
          widthPx: imageSize.widthPx,
          heightPx: imageSize.heightPx
        })
      : configured;

  if (containsSecretLikeValue(expanded)) {
    throw new Error(
      `${missingReason} Configured URL is secret-bearing: ${sanitizePublicUrl(expanded)}`
    );
  }
  if (!isAllowedSourceRef(expanded)) {
    throw new Error(`${missingReason} Configured URL must be an http(s) or s3 source ref.`);
  }

  return expanded;
}

function createConfiguredRegionalSourcePlan({
  context,
  url,
  urlTemplate,
  missingReason,
  notes
}: {
  context: SourceAdapterContext;
  url?: string;
  urlTemplate?: string;
  missingReason: string;
  notes: string[];
}): TerrainSourceAdapterPlan {
  try {
    const configured = configuredSourceUrl({ context, url, urlTemplate, missingReason });

    if (!configured) {
      return blockedPlan({
        context,
        reasons: [missingReason],
        warnings: [
          "The source is cataloged as source-native, but vmesh still needs an AOI-to-file resolver or configured source URL template."
        ]
      });
    }

    return readyPlan({
      context,
      runClass: "configured",
      inputRefs: [
        buildInputRef({
          context,
          kind: inferConfiguredKind(configured),
          url: configured,
          format: inferConfiguredFormat(configured),
          notes
        })
      ],
      warnings: [
        "Run class is configured: vmesh resolved a configured source input, but did not fetch or retain terrain artifacts."
      ]
    });
  } catch (error) {
    return blockedPlan({
      context,
      reasons: [error instanceof Error ? error.message : missingReason],
      warnings: ["Secret-bearing or unsupported configured source refs are not emitted."]
    });
  }
}

function createCanadaHrdemSourcePlan(context: SourceAdapterContext): TerrainSourceAdapterPlan {
  const role = terrainPreviewRoleForToolProfile(context.toolProfile);
  const isBestAvailableDtm = context.source.id === "canada-hrdem-best-dtm";
  const selectedStacAsset = context.options.canadaHrdemStacSearchResponse
    ? selectCanadaHrdemStacAsset({
        value: context.options.canadaHrdemStacSearchResponse,
        role,
        requireOneMeter: !isBestAvailableDtm
      })
    : null;

  if (selectedStacAsset) {
    if (containsSecretLikeValue(selectedStacAsset.href)) {
      return blockedPlan({
        context,
        reasons: ["Canada HRDEM STAC resolved a secret-bearing asset href."],
        warnings: ["Secret-bearing source refs are not emitted."]
      });
    }

    return readyPlan({
      context,
      inputRefs: [
        buildInputRef({
          context,
          kind: "stac-cog",
          url: selectedStacAsset.href,
          format: "cog",
          targetResolutionMeters: selectedStacAsset.resolutionMeters,
          notes: [
            `Resolved from Canada HRDEM STAC ${selectedStacAsset.sourceId}.`,
            `This is a direct official HRDEM ${selectedStacAsset.resolutionMeters}m COG input, not a Mapterhorn or Mapbox terrain tile.`,
            ...(selectedStacAsset.resolutionMeters === 1
              ? ["This satisfies strict 1m source resolution for this selected COG."]
              : [
                  "This is explicit best-available 2m HRDEM evidence and must not be counted as strict 1m milestone proof."
                ]),
            "The worker must still window the COG, prove non-no-data coverage, preserve CRS/vertical datum, and retain QA artifacts before package readiness."
          ]
        })
      ],
      warnings: [
        `Run class is dry-run: vmesh resolved a source-native ${selectedStacAsset.resolutionMeters}m COG input, but has not fetched, clipped, QA'd, or retained terrain artifacts.`,
        ...(isBestAvailableDtm && selectedStacAsset.resolutionMeters !== 1
          ? ["Best-available Canada DTM is not strict 1m evidence."]
          : [])
      ]
    });
  }

  if (context.options.canadaHrdemStacSearchResponse) {
    return blockedPlan({
      context,
      reasons: [
        isBestAvailableDtm
          ? `Canada HRDEM STAC did not return a usable hrdem-mosaic ${role.toUpperCase()} COG for the selected AOI.`
          : `Canada HRDEM STAC did not return an hrdem-mosaic-1m ${role.toUpperCase()} COG for the selected AOI.`,
        isBestAvailableDtm
          ? "No official HRDEM best-available DTM source input can be planned for this AOI."
          : "Lower-resolution HRDEM assets do not satisfy the strict 1m source branch."
      ],
      warnings: [
        isBestAvailableDtm
          ? "Keep the AOI on map-ready fallback terrain until another official source can be resolved."
          : "Use a provincial 1m source such as LidarBC where available, or record the AOI as a 1m coverage gap."
      ]
    });
  }

  return createConfiguredRegionalSourcePlan({
    context,
    url:
      context.options.canadaHrdemGeoTiffUrl ?? context.options.env?.VMESH_CANADA_HRDEM_GEOTIFF_URL,
    urlTemplate:
      context.options.canadaHrdemGeoTiffUrlTemplate ??
      context.options.env?.VMESH_CANADA_HRDEM_GEOTIFF_URL_TEMPLATE,
    missingReason:
      "Canada HRDEM requires an AOI-to-tile source index or configured GeoTIFF/COG URL template before vmesh can fetch source-native inputs.",
    notes: [
      "Configured Canada HRDEM source input for the selected AOI.",
      "The worker must verify HRDEM coverage, DTM/DSM product type, CRS, vertical datum, and no-data ratio after fetching.",
      "Use npm run terrain:cog-probe for source-native HRDEM COG non-no-data proof before promoting a broad STAC hit."
    ]
  });
}

function createKamloopsLocalLidarSourcePlan(
  context: SourceAdapterContext
): TerrainSourceAdapterPlan {
  const operatorManifestPlan = createKamloopsOperatorTerrainManifestPlan(context);
  if (operatorManifestPlan) return operatorManifestPlan;

  const configuredUrl =
    context.options.kamloopsLocalLidarGeoTiffUrl ??
    context.options.env?.VMESH_KAMLOOPS_LOCAL_LIDAR_GEOTIFF_URL;
  const configuredUrlTemplate =
    context.options.kamloopsLocalLidarGeoTiffUrlTemplate ??
    context.options.env?.VMESH_KAMLOOPS_LOCAL_LIDAR_GEOTIFF_URL_TEMPLATE;

  if (configuredUrl?.trim() || configuredUrlTemplate?.trim()) {
    return createConfiguredRegionalSourcePlan({
      context,
      url: configuredUrl,
      urlTemplate: configuredUrlTemplate,
      missingReason:
        "Kamloops municipal LiDAR/DEM direct raster override requires a clean GeoTIFF/COG URL or URL template before vmesh can hand off a direct DTM rail.",
      notes: [
        "Configured Kamloops municipal DTM raster source input for the selected AOI.",
        "VMesh is only indexing the configured source ref; Abundance must window the raster, prove non-no-data AOI coverage, preserve CRS/vertical datum, and retain QA artifacts.",
        "Do not expose local file paths, signed URLs, private coordinates, or raw municipal payload refs in public-safe runtime packs."
      ]
    });
  }

  const intersectingDemGridTiles = context.options.kamloopsMunicipalDemGridResponse
    ? selectKamloopsMunicipalDemGridTiles(context.options.kamloopsMunicipalDemGridResponse)
    : [];
  const selectedDemGridTiles = intersectingDemGridTiles.filter((tile) =>
    isDownloadableKamloopsMunicipalDemGridTile(
      tile,
      context.options.kamloopsMunicipalDemZipAvailability
    )
  );
  const nonDownloadableDemGridTiles = intersectingDemGridTiles.filter(
    (tile) =>
      !isDownloadableKamloopsMunicipalDemGridTile(
        tile,
        context.options.kamloopsMunicipalDemZipAvailability
      )
  );
  const rawLidarVerifiedForMissingDemTiles =
    nonDownloadableDemGridTiles.length > 0 &&
    nonDownloadableDemGridTiles.every(
      (tile) =>
        kamloopsMunicipalLidarZipAvailabilityForTile(
          tile,
          context.options.kamloopsMunicipalLidarZipAvailability
        )?.reachable === true
    );
  const elevationVectorCoversAoi = bboxContainsBbox({
    container: KAMLOOPS_MUNICIPAL_ELEVATION_VECTOR_EXTENT_WGS84,
    target: context.bbox
  });
  const demGridInputRefs = selectedDemGridTiles.map((selectedDemGridTile) =>
    buildInputRef({
      context,
      kind: "zip-archive",
      url: selectedDemGridTile.demZipUrl,
      format: "zip",
      role: "terrain-source",
      notes: [
        selectedDemGridTile.resolutionSource === "deterministic-grid-index"
          ? `Selected from VMesh's deterministic index of the official City of Kamloops DEM ZIP grid as ${selectedDemGridTile.sourceId}; the archive URL was reachability-verified before this source ref was emitted.`
          : `Resolved from the public City of Kamloops DEM Grid as ${selectedDemGridTile.sourceId}.`,
        `DEM grid CELLNAME ${selectedDemGridTile.cellName}; OBJECTID ${selectedDemGridTile.objectId ?? "unknown"}; PHOTOGRIDLIMITS ${selectedDemGridTile.photoGridLimits ?? "unknown"}.`,
        `The official City of Kamloops download WebMap is ${KAMLOOPS_MUNICIPAL_2024_DOWNLOAD_WEBMAP_URL}; its popup expressions define the 2024 LAS and DEM ZIP URL formulas and its operational layer definition is ${KAMLOOPS_MUNICIPAL_DOWNLOAD_LAYER_DEFINITION}.`,
        `The public LiDAR download app is ${KAMLOOPS_MUNICIPAL_2024_LIDAR_APP_URL}.`,
        `The matching public LiDAR archive is ${selectedDemGridTile.lidarZipUrl}.`,
        "This is a deterministic official public DEM ZIP source ref, not stored payload data; VMesh verifies archive reachability before selecting it.",
        "A downstream worker must fetch/window the ESRI Grid DEM, QA no-data and vertical metadata, then emit a runtime terrain raster/heightfield before claiming golden-quality terrain.",
        "The exact AOI query geometry is intentionally not emitted in this public-safe source-index ref."
      ]
    })
  );
  const rawLidarRepairInputRefs = nonDownloadableDemGridTiles
    .filter(
      (tile) =>
        kamloopsMunicipalLidarZipAvailabilityForTile(
          tile,
          context.options.kamloopsMunicipalLidarZipAvailability
        )?.reachable === true
    )
    .map((tile) =>
      buildInputRef({
        context,
        kind: "zip-archive",
        url: tile.lidarZipUrl,
        format: "zip",
        role: "terrain-source",
        notes: [
          tile.resolutionSource === "deterministic-grid-index"
            ? `Selected from VMesh's deterministic index of the official City of Kamloops 2024 LiDAR archive grid as ${tile.sourceId}; the archive URL was reachability-verified before this source ref was emitted.`
            : `Resolved from the public City of Kamloops 2024 LiDAR archive as ${tile.sourceId}.`,
          `LiDAR archive CELLNAME ${tile.cellName}; OBJECTID ${tile.objectId ?? "unknown"}; DEM PHOTOGRIDLIMITS ${tile.photoGridLimits ?? "unknown"}.`,
          `The official City of Kamloops download WebMap is ${KAMLOOPS_MUNICIPAL_2024_DOWNLOAD_WEBMAP_URL}; its popup expressions define the 2024 LAS and DEM ZIP URL formulas and its operational layer definition is ${KAMLOOPS_MUNICIPAL_DOWNLOAD_LAYER_DEFINITION}.`,
          `The public LiDAR download app is ${KAMLOOPS_MUNICIPAL_2024_LIDAR_APP_URL}.`,
          "This is a deterministic official public raw-LiDAR ZIP source ref, not stored payload data; VMesh verifies archive reachability before selecting it.",
          "A downstream worker must fetch the LAS/LAZ archive, require usable CRS metadata and ground-classified points, derive a DTM grid, QA source-support distances, and preserve warnings before claiming source-backed terrain.",
          "Do not treat a raw LiDAR archive ref alone as a ready heightfield; the runtime pack is only terrain-ready after Abundance materialization succeeds."
        ]
      })
    );
  const contourInputRef = buildInputRef({
    context,
    kind: "arcgis-feature-query",
    url: KAMLOOPS_MUNICIPAL_CONTOUR_1M_LAYER_URL,
    format: "json",
    role: "terrain-source",
    notes: [
      "Official City of Kamloops CityWorks UtilityBaseMap Contour 1m Minors feature layer for the requested 3 km frame.",
      "Use this only when public DEM raster ZIP cells are absent or incomplete.",
      "A downstream worker must query ELEVATION-coded polylines, derive a contour-interpolated runtime grid, preserve EPSG:3157/CGVD2013 metadata, and report nearest-contour support distances.",
      "This is a deterministic public ArcGIS FeatureServer source ref, not retained payload data and not a 1m raster DEM ZIP."
    ]
  });
  const demPointBreakInputRef = buildInputRef({
    context,
    kind: "zip-archive",
    url: KAMLOOPS_MUNICIPAL_DEM_POINT_BREAK_SHP_URL,
    format: "zip",
    role: "terrain-source",
    notes: [
      "Official City of Kamloops public DEMPoint/DEMBreakline shapefile archive for the requested 3 km frame.",
      "Use this only when public DEM raster ZIP cells are absent or incomplete; it is point/breakline-derived elevation evidence, not a 1m raster DEM ZIP.",
      "A downstream worker may attempt point/breakline interpolation first, then fall back to contour interpolation if support is too sparse.",
      "This is a deterministic public archive source ref, not retained payload data and not a 1m raster DEM ZIP."
    ]
  });

  if (nonDownloadableDemGridTiles.length > 0) {
    if (elevationVectorCoversAoi) {
      const repairInputRefs = [demPointBreakInputRef, contourInputRef];
      const mixedRasterRepairInputRefs =
        demGridInputRefs.length > 0 || rawLidarRepairInputRefs.length > 0
          ? [...demGridInputRefs, ...rawLidarRepairInputRefs, ...repairInputRefs]
          : repairInputRefs;
      return readyPlan({
        context,
        inputRefs: mixedRasterRepairInputRefs,
        warnings: [
          demGridInputRefs.length > 0
            ? `City of Kamloops public DEM Grid intersects ${selectedDemGridTiles.length} downloadable and ${nonDownloadableDemGridTiles.length} non-downloadable raster cell(s), so VMesh selected a mixed municipal DEM ZIP plus derived-elevation repair rail for this AOI.`
            : `City of Kamloops public DEM Grid intersects ${nonDownloadableDemGridTiles.length} non-downloadable raster cell(s), so VMesh selected the official CityWorks 1m contour layer as the municipal contour-derived DTM rail for this AOI.`,
          `Non-downloadable DEM grid cells were retained as evidence: ${nonDownloadableDemGridTiles
            .map(
              (tile) =>
                `${tile.cellName} PHOTOGRIDLIMITS ${tile.photoGridLimits ?? "unknown"}${
                  isAdvertisedKamloopsMunicipalDownloadTile(tile)
                    ? ""
                    : " (not advertised by the official download WebMap layer)"
                }`
            )
            .join(", ")}.`,
          rawLidarVerifiedForMissingDemTiles
            ? "Every non-downloadable DEM raster cell has a verified public raw LiDAR archive; VMesh emitted those archive refs so a point-cloud-to-DTM worker can promote this AOI above the contour-derived rail after materialization and QA."
            : "Raw LiDAR ZIP coverage is not verified for every non-downloadable DEM raster cell; keep this AOI on the derived-elevation rail unless another source-native raster is configured.",
          `The public DEMPoint/DEMBreakline archive at ${KAMLOOPS_MUNICIPAL_DEM_POINT_BREAK_SHP_URL} is included as a higher-support derived-elevation attempt before contour fallback.`,
          demGridInputRefs.length > 0
            ? rawLidarRepairInputRefs.length > 0
              ? "Abundance should materialize the verified municipal DEM ZIP cells first, then attempt verified raw LiDAR archive DTM repair before public DEMPoint/DEMBreakline or contour repair."
              : "Abundance should materialize the verified municipal DEM ZIP cells first, then use public DEMPoint/DEMBreakline or contour repair only for gaps."
            : rawLidarRepairInputRefs.length > 0
              ? "Abundance should materialize the verified public raw LiDAR archive rail first, then use public DEMPoint/DEMBreakline or contour repair if point-cloud DTM support is too sparse."
              : "Abundance should materialize the public DEMPoint/DEMBreakline rail first, then use contour repair if support is too sparse.",
          "Run class is dry-run: vmesh resolved public source refs only; Abundance must materialize and QA the contour-derived heightfield before runtime terrain readiness.",
          "Do not label the contour-derived output as a 1m LiDAR raster; it is official municipal elevation-derived terrain."
        ]
      });
    }

    return blockedPlan({
      context,
      reasons: [
        `City of Kamloops public DEM Grid intersects ${nonDownloadableDemGridTiles.length} non-downloadable cell(s) for this AOI; full 3 km municipal raster DTM coverage is not proven.`
      ],
      warnings: [
        `Non-downloadable DEM grid cells were omitted: ${nonDownloadableDemGridTiles
          .map(
            (tile) =>
              `${tile.cellName} PHOTOGRIDLIMITS ${tile.photoGridLimits ?? "unknown"}${
                isAdvertisedKamloopsMunicipalDownloadTile(tile)
                  ? ""
                  : " (not advertised by the official download WebMap layer)"
              }`
          )
          .join(", ")}.`,
        "The public municipal elevation-vector source extent does not fully contain this 3 km AOI.",
        "Fall through to LidarBC/Canada HRDEM or label the AOI as outside full municipal public LiDAR/DEM coverage."
      ]
    });
  }

  if (selectedDemGridTiles.length > 0) {
    return readyPlan({
      context,
      inputRefs: demGridInputRefs,
      warnings: [
        `Run class is dry-run: vmesh resolved ${selectedDemGridTiles.length} public Kamloops municipal DEM ZIP ref(s), but has not fetched LAS/DEM payloads or derived terrain artifacts.`,
        "Do not claim golden-quality terrain until the downstream worker materializes and QA-proves the municipal DTM for this AOI."
      ]
    });
  }

  if (context.options.kamloopsMunicipalDemGridResponse) {
    if (elevationVectorCoversAoi) {
      return readyPlan({
        context,
        inputRefs: [demPointBreakInputRef, contourInputRef],
        warnings: [
          "City of Kamloops public DEM Grid returned no DEM raster cells, but the official DEMPoint/DEMBreakline archive and CityWorks 1m contour layer extent cover this 3 km AOI.",
          "Run class is dry-run: vmesh resolved the public derived-elevation source refs only; Abundance must derive/interpolate and QA the runtime DTM grid before claiming source-backed terrain.",
          "Do not label the contour-derived output as a 1m LiDAR raster; it is official municipal elevation-derived terrain."
        ]
      });
    }

    return blockedPlan({
      context,
      reasons: [
        "City of Kamloops public DEM Grid did not return a tile for the selected AOI centroid."
      ],
      warnings: [
        elevationVectorCoversAoi
          ? `The official CityWorks 1m contour layer exists at ${KAMLOOPS_MUNICIPAL_CONTOUR_1M_LAYER_URL}, but the DEM Grid did not return a raster tile for this AOI; downstream workers must prove contour support before terrain readiness.`
          : "The public municipal elevation-vector source extent does not fully contain this 3 km AOI.",
        "Fall through to LidarBC/Canada HRDEM or label the AOI as outside municipal public LiDAR/DEM coverage."
      ]
    });
  }

  return blockedPlan({
    context,
    reasons: [
      "Kamloops municipal LiDAR/DEM requires a live public DEM Grid lookup before vmesh can select the public municipal source rail."
    ],
    warnings: [
      "Use createLiveTerrainSourceAdapterPlan or createLiveNorthAmericaDtmSourceAdapterPlan to query the City of Kamloops public DEM Grid. Direct GeoTIFF URL overrides remain optional deployment conveniences, not the source of truth."
    ]
  });
}

function terrainPreviewRoleForToolProfile(
  toolProfile: TerrainToolProfile
): TerrainSourcePreviewRole {
  return toolProfile.groundModelRole === "surface-dsm" ? "dsm" : "dtm";
}

function createBcLidarSourcePlan(context: SourceAdapterContext): TerrainSourceAdapterPlan {
  const role = terrainPreviewRoleForToolProfile(context.toolProfile);
  const selectedFeatureServerAsset = context.options.bcLidarFeatureServerResponse
    ? selectBcLidarOneMeterAsset(context.options.bcLidarFeatureServerResponse, role)
    : null;

  if (selectedFeatureServerAsset) {
    if (containsSecretLikeValue(selectedFeatureServerAsset.href)) {
      return blockedPlan({
        context,
        reasons: ["LidarBC FeatureServer resolved a secret-bearing asset href."],
        warnings: ["Secret-bearing source refs are not emitted."]
      });
    }

    return readyPlan({
      context,
      inputRefs: [
        buildInputRef({
          context,
          kind: "direct-geotiff",
          url: selectedFeatureServerAsset.href,
          format: "geotiff",
          notes: [
            `Resolved from the official LidarBC ${role.toUpperCase()} FeatureServer index as ${selectedFeatureServerAsset.sourceId}.`,
            `Source file ${selectedFeatureServerAsset.filename} reports ${selectedFeatureServerAsset.spacing}.`,
            "This is a direct British Columbia official source ref, not a Mapterhorn or Mapbox terrain tile.",
            "The worker must still fetch/window the GeoTIFF, prove non-no-data coverage, preserve CRS/vertical datum, and retain QA artifacts before package readiness."
          ]
        })
      ],
      warnings: [
        "Run class is dry-run: vmesh resolved a source-native LidarBC 1m input, but has not fetched, clipped, QA'd, or retained terrain artifacts."
      ]
    });
  }

  if (context.options.bcLidarFeatureServerResponse) {
    return blockedPlan({
      context,
      reasons: [
        `LidarBC FeatureServer did not return a 1m ${role.toUpperCase()} GeoTIFF for the selected AOI.`
      ],
      warnings: [
        "Record this AOI as a provincial 1m coverage gap and continue to HRDEM or another official source."
      ]
    });
  }

  return createConfiguredRegionalSourcePlan({
    context,
    url: context.options.bcLidarGeoTiffUrl ?? context.options.env?.VMESH_BC_LIDARBC_GEOTIFF_URL,
    urlTemplate:
      context.options.bcLidarGeoTiffUrlTemplate ??
      context.options.env?.VMESH_BC_LIDARBC_GEOTIFF_URL_TEMPLATE,
    missingReason:
      "LidarBC requires an AOI-to-collection source index or configured GeoTIFF/COG URL template before vmesh can fetch source-native inputs.",
    notes: [
      "Configured LidarBC source input for the selected AOI.",
      "The worker must verify collection coverage, ground product role, CRS, vertical datum, and no-data ratio after fetching."
    ]
  });
}

function createMapReadyFallbackBlock(context: SourceAdapterContext): TerrainSourceAdapterPlan {
  return blockedPlan({
    context,
    runClass: "dry-run",
    reasons: [
      `${context.source.id} is a map-ready fallback, not an official source-native terrain input.`,
      "Select an official source such as usgs-3dep, canada-hrdem, or bc-lidarbc for source-native package generation."
    ],
    warnings: [
      "Map-ready PMTiles/XYZ terrain can render the browser globe, but it should not be treated as the upstream source of truth for generated terrain packages."
    ]
  });
}

function createUnsupportedSourceBlock(context: SourceAdapterContext): TerrainSourceAdapterPlan {
  return blockedPlan({
    context,
    reasons: [
      `${context.toolProfile.toolId} is registered as terrain-capable, but vmesh does not yet have a source-native adapter for it.`
    ],
    warnings: [
      "Add an official source adapter before this provider can produce COG/PMTiles package inputs."
    ]
  });
}

function createContext({
  input,
  options
}: {
  input: TerrainPackageWorkerInput;
  options: TerrainSourceAdapterOptions;
}): SourceAdapterContext | TerrainSourceAdapterPlan {
  const plan = createTerrainWorkerPlan(input, options);
  const source = plan.selectedSources.terrain ?? null;
  const created = createdAt(options);

  if (!source) {
    return {
      schemaVersion: "vmesh-terrain-source-adapter-plan-v1",
      packageId: plan.id,
      createdAt: created,
      status: "blocked",
      runClass: "configured",
      selectedSource: null,
      toolProfile: null,
      bbox: bboxFromPlan(plan),
      targetResolutionMeters: null,
      cacheKey: null,
      inputRefs: [],
      workerNextSteps: [],
      blockedReasons: ["The geospatial package plan did not select a terrain source."],
      warnings: []
    };
  }

  const toolProfile = getTerrainToolProfileForSource(source.id);

  if (!toolProfile) {
    return {
      schemaVersion: "vmesh-terrain-source-adapter-plan-v1",
      packageId: plan.id,
      createdAt: created,
      status: "blocked",
      runClass: "configured",
      selectedSource: source,
      toolProfile: null,
      bbox: bboxFromPlan(plan),
      targetResolutionMeters: null,
      cacheKey: null,
      inputRefs: [],
      workerNextSteps: [],
      blockedReasons: [`No vmesh terrain tool profile is registered for ${source.id}.`],
      warnings: []
    };
  }

  return {
    plan,
    createdAt: created,
    source,
    toolProfile,
    bbox: bboxFromPlan(plan),
    cacheKey: createPackageCacheKey({
      packageId: plan.id,
      layerId: "terrain",
      sourceId: source.id
    }),
    options: {
      ...options,
      env: options.env ?? process.env,
      maxImageSide: options.maxImageSide ?? DEFAULT_MAX_IMAGE_SIDE
    }
  };
}

function isAdapterPlan(
  value: SourceAdapterContext | TerrainSourceAdapterPlan
): value is TerrainSourceAdapterPlan {
  return "schemaVersion" in value;
}

export function isSourceNativeTerrainAdapterSupported(sourceIdOrToolId: string): boolean {
  return SOURCE_NATIVE_TOOL_IDS.has(sourceIdOrToolId);
}

export function createTerrainSourceAdapterPlan(
  input: TerrainPackageWorkerInput,
  options: TerrainSourceAdapterOptions = {}
): TerrainSourceAdapterPlan {
  const context = createContext({ input, options });

  if (isAdapterPlan(context)) return context;

  switch (context.toolProfile.toolId) {
    case "usgs-3dep":
      return createUsgs3depSourcePlan(context);
    case "usgs-3dep-lpc-dsm":
      return createUsgsLpcDsmSourcePlan(context);
    case "kamloops-local-lidar":
      return createKamloopsLocalLidarSourcePlan(context);
    case "canada-hrdem":
      return createCanadaHrdemSourcePlan(context);
    case "bc-lidarbc":
      return createBcLidarSourcePlan(context);
    case "environment-agency-lidar-dtm":
    case "scottish-remote-sensing-lidar":
    case "os-terrain-50":
      return createIndexedRegionalTerrainSourcePlan(context);
    case "mapterhorn-pmtiles":
    case "mapzen-joerd-terrarium":
      return createMapReadyFallbackBlock(context);
    default:
      return createUnsupportedSourceBlock(context);
  }
}

export async function createLiveTerrainSourceAdapterPlan(
  input: TerrainPackageWorkerInput,
  options: TerrainSourceAdapterOptions = {}
): Promise<TerrainSourceAdapterPlan> {
  const initialPlan = createTerrainSourceAdapterPlan(input, options);

  if (
    (initialPlan.status === "ready" && initialPlan.toolProfile?.toolId !== "usgs-3dep") ||
    !initialPlan.bbox ||
    (initialPlan.toolProfile?.toolId !== "canada-hrdem" &&
      initialPlan.toolProfile?.toolId !== "bc-lidarbc" &&
      initialPlan.toolProfile?.toolId !== "kamloops-local-lidar" &&
      initialPlan.toolProfile?.toolId !== "usgs-3dep" &&
      initialPlan.toolProfile?.toolId !== "usgs-3dep-lpc-dsm") ||
    (initialPlan.toolProfile?.toolId === "canada-hrdem" && options.canadaHrdemStacSearchResponse) ||
    (initialPlan.toolProfile?.toolId === "bc-lidarbc" && options.bcLidarFeatureServerResponse) ||
    (initialPlan.toolProfile?.toolId === "kamloops-local-lidar" &&
      options.kamloopsMunicipalDemGridResponse) ||
    (initialPlan.toolProfile?.toolId === "usgs-3dep" && options.usgs3depCoverageResponse) ||
    (initialPlan.toolProfile?.toolId === "usgs-3dep-lpc-dsm" && options.usgsLpcSourceIndexResponse)
  ) {
    return initialPlan;
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const kamloopsProbeTimeoutMs = options.kamloopsMunicipalDemProbeTimeoutMs ?? 15_000;
  const role = terrainPreviewRoleForToolProfile(initialPlan.toolProfile);
  const coordinate = {
    latitude: (initialPlan.bbox.south + initialPlan.bbox.north) / 2,
    longitude: (initialPlan.bbox.west + initialPlan.bbox.east) / 2
  };

  async function createLiveKamloopsPlanFromGridResponse({
    demGridResponse,
    fallbackWarning
  }: {
    demGridResponse: unknown;
    fallbackWarning?: string;
  }): Promise<TerrainSourceAdapterPlan> {
    const tiles = selectKamloopsMunicipalDemGridTiles(demGridResponse);
    const zipAvailability =
      options.verifyKamloopsMunicipalDemZipUrls === false
        ? options.kamloopsMunicipalDemZipAvailability
        : await verifyKamloopsMunicipalDemZipAvailability({
            tiles,
            fetchImpl,
            timeoutMs: kamloopsProbeTimeoutMs
          });
    const tilesMissingDemRaster = tiles.filter(
      (tile) => !isDownloadableKamloopsMunicipalDemGridTile(tile, zipAvailability)
    );
    const lidarZipAvailability =
      options.verifyKamloopsMunicipalLidarZipUrls === false
        ? options.kamloopsMunicipalLidarZipAvailability
        : tilesMissingDemRaster.length > 0
          ? {
              ...(options.kamloopsMunicipalLidarZipAvailability ?? {}),
              ...(await verifyKamloopsMunicipalDemZipAvailability({
                tiles: tilesMissingDemRaster,
                fetchImpl,
                timeoutMs: kamloopsProbeTimeoutMs,
                urlForTile: (tile) => tile.lidarZipUrl
              }))
            }
          : options.kamloopsMunicipalLidarZipAvailability;
    const municipalPlan = createTerrainSourceAdapterPlan(input, {
      ...options,
      kamloopsMunicipalDemGridResponse: demGridResponse,
      kamloopsMunicipalDemZipAvailability: zipAvailability,
      kamloopsMunicipalLidarZipAvailability: lidarZipAvailability
    });
    const planWithFallbackWarning = fallbackWarning
      ? {
          ...municipalPlan,
          warnings: [...municipalPlan.warnings, fallbackWarning]
        }
      : municipalPlan;

    if (
      options.verifyKamloopsMunicipalContourSupport !== false &&
      isDeferrableKamloopsDerivedElevationPlan(planWithFallbackWarning)
    ) {
      const contourSupport = await verifyKamloopsMunicipalContourSupport({
        bbox: initialPlan.bbox!,
        fetchImpl,
        timeoutMs: kamloopsProbeTimeoutMs
      });
      const hasDemPointBreakRef = planWithFallbackWarning.inputRefs.some(
        (inputRef) => inputRef.url === KAMLOOPS_MUNICIPAL_DEM_POINT_BREAK_SHP_URL
      );

      if (contourSupport.status === "unsupported") {
        if (hasDemPointBreakRef) {
          return {
            ...planWithFallbackWarning,
            warnings: [
              ...planWithFallbackWarning.warnings,
              ...(contourSupport.warnings ?? []),
              "City of Kamloops contour support probe returned zero features for this exact 3 km AOI.",
              "VMesh retained the public DEMPoint/DEMBreakline materializer candidate because exact point/breakline support is proven by the Abundance worker, not by the contour-count proxy.",
              "Do not claim source-backed runtime terrain until Abundance materialization finds usable point, breakline, contour, raster, or raw LiDAR samples and passes QA."
            ]
          };
        }

        return {
          ...planWithFallbackWarning,
          status: "blocked",
          inputRefs: [],
          blockedReasons: [
            ...planWithFallbackWarning.blockedReasons,
            "City of Kamloops municipal derived-elevation rail was blocked because the official 1m contour support probe returned zero features for this exact 3 km AOI.",
            hasDemPointBreakRef
              ? "DEMPoint/DEMBreakline archive extent alone is not exact-AOI source support; Abundance must not claim source-backed terrain until the worker finds usable point, breakline, contour, raster, or raw LiDAR samples."
              : null
          ].filter((reason): reason is string => Boolean(reason)),
          warnings: [
            ...planWithFallbackWarning.warnings,
            ...(contourSupport.warnings ?? []),
            "Do not mark DEMPoint/contour-derived municipal terrain ready until an exact-AOI support probe finds source elevation samples."
          ]
        };
      }

      if (contourSupport.status === "supported") {
        return {
          ...planWithFallbackWarning,
          warnings: [
            ...planWithFallbackWarning.warnings,
            ...(contourSupport.warnings ?? []),
            `City of Kamloops contour support probe found ${contourSupport.count} contour feature(s) for this exact 3 km AOI; Abundance must still materialize and QA the derived DTM before runtime readiness.`
          ]
        };
      }

      return {
        ...planWithFallbackWarning,
        warnings: [...planWithFallbackWarning.warnings, contourSupport.reason]
      };
    }

    return planWithFallbackWarning;
  }

  try {
    if (initialPlan.toolProfile.toolId === "kamloops-local-lidar") {
      const response = await fetchWithTimeout(
        fetchImpl,
        createKamloopsMunicipalDemGridQueryUrl({
          bbox: initialPlan.bbox,
          baseUrl: options.kamloopsMunicipalDemGridBaseUrl ?? KAMLOOPS_MUNICIPAL_DEM_GRID_LAYER_URL
        }),
        {
          headers: { Accept: "application/json" }
        },
        kamloopsProbeTimeoutMs
      );

      if (!response.ok) {
        return createLiveKamloopsPlanFromGridResponse({
          demGridResponse: createIndexedKamloopsMunicipalDemGridResponse(initialPlan.bbox),
          fallbackWarning: `City of Kamloops public DEM Grid resolver failed with HTTP ${response.status}; VMesh used its deterministic public DEM ZIP grid index and still verified candidate ZIP URLs before source selection.`
        });
      }

      const demGridResponse = (await response.json()) as unknown;
      const liveTiles = selectKamloopsMunicipalDemGridTiles(demGridResponse);
      if (liveTiles.length === 0) {
        return createLiveKamloopsPlanFromGridResponse({
          demGridResponse: createIndexedKamloopsMunicipalDemGridResponse(initialPlan.bbox),
          fallbackWarning:
            "City of Kamloops public DEM Grid resolver returned no raster cells for this exact 3 km AOI; VMesh consulted its deterministic public DEM ZIP grid index and still verified candidate ZIP URLs before source selection."
        });
      }

      const indexedDemGridResponse = createIndexedKamloopsMunicipalDemGridResponse(
        initialPlan.bbox
      );
      const effectiveDemGridResponse = mergeKamloopsMunicipalDemGridResponses(
        demGridResponse,
        indexedDemGridResponse
      );
      const addedIndexedCellCount =
        selectKamloopsMunicipalDemGridTiles(effectiveDemGridResponse).length - liveTiles.length;

      return createLiveKamloopsPlanFromGridResponse({
        demGridResponse: effectiveDemGridResponse,
        fallbackWarning:
          addedIndexedCellCount > 0
            ? `City of Kamloops public DEM Grid resolver returned ${liveTiles.length} raster cell(s) for this exact 3 km AOI; VMesh added ${addedIndexedCellCount} deterministic public DEM ZIP grid candidate cell(s) and verified candidate ZIP URLs before source selection.`
            : undefined
      });
    }

    if (initialPlan.toolProfile.toolId === "usgs-3dep") {
      const response = await fetchImpl(createUsgs3depOneMeterCoverageQueryUrl(coordinate), {
        headers: { Accept: "application/json" }
      });

      if (!response.ok) {
        return {
          ...initialPlan,
          status: "blocked",
          inputRefs: [],
          blockedReasons: [
            ...initialPlan.blockedReasons,
            `USGS 3DEP 1m product-index resolver failed with HTTP ${response.status}.`
          ]
        };
      }

      const coverageResponse = (await response.json()) as unknown;
      return createTerrainSourceAdapterPlan(input, {
        ...options,
        usgs3depCoverageResponse: coverageResponse
      });
    }

    if (initialPlan.toolProfile.toolId === "usgs-3dep-lpc-dsm") {
      const response = await fetchImpl(
        createUsgsLpcSourceIndexQueryUrl({
          bbox: initialPlan.bbox,
          baseUrl:
            options.usgsLpcSourceIndexUrl ??
            options.env?.VMESH_USGS_LPC_SOURCE_INDEX_URL ??
            USGS_3DEP_LPC_INDEX_QUERY_URL
        }),
        {
          headers: { Accept: "application/json" }
        }
      );

      if (!response.ok) {
        return {
          ...initialPlan,
          blockedReasons: [
            ...initialPlan.blockedReasons,
            `USGS LPC source index resolver failed with HTTP ${response.status}.`
          ]
        };
      }

      const sourceIndexResponse = (await response.json()) as unknown;
      return createTerrainSourceAdapterPlan(input, {
        ...options,
        usgsLpcSourceIndexResponse: sourceIndexResponse
      });
    }

    if (initialPlan.toolProfile.toolId === "bc-lidarbc") {
      const response = await fetchImpl(
        createBcLidarFeatureServerQueryUrl({
          bbox: initialPlan.bbox,
          role,
          baseUrl: options.bcLidarFeatureServerBaseUrl ?? BC_LIDAR_FEATURE_SERVER_BASE_URL
        }),
        {
          headers: { Accept: "application/json" }
        }
      );

      if (!response.ok) {
        return {
          ...initialPlan,
          blockedReasons: [
            ...initialPlan.blockedReasons,
            `LidarBC FeatureServer source resolver failed with HTTP ${response.status}.`
          ]
        };
      }

      const featureServerResponse = (await response.json()) as unknown;
      return createTerrainSourceAdapterPlan(input, {
        ...options,
        bcLidarFeatureServerResponse: featureServerResponse
      });
    }

    const response = await fetchImpl("https://datacube.services.geo.ca/stac/api/search", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: createCanadaHrdemStacSearchBody(coordinate, role)
    });

    if (!response.ok) {
      return {
        ...initialPlan,
        blockedReasons: [
          ...initialPlan.blockedReasons,
          `Canada HRDEM STAC source resolver failed with HTTP ${response.status}.`
        ]
      };
    }

    const stacSearchResponse = (await response.json()) as unknown;
    return createTerrainSourceAdapterPlan(input, {
      ...options,
      canadaHrdemStacSearchResponse: stacSearchResponse
    });
  } catch (error) {
    if (initialPlan.toolProfile.toolId === "kamloops-local-lidar" && initialPlan.bbox) {
      return createLiveKamloopsPlanFromGridResponse({
        demGridResponse: createIndexedKamloopsMunicipalDemGridResponse(initialPlan.bbox),
        fallbackWarning:
          error instanceof Error
            ? `City of Kamloops public DEM Grid resolver failed: ${error.message}; VMesh used its deterministic public DEM ZIP grid index and still verified candidate ZIP URLs before source selection.`
            : "City of Kamloops public DEM Grid resolver failed; VMesh used its deterministic public DEM ZIP grid index and still verified candidate ZIP URLs before source selection."
      });
    }

    return {
      ...initialPlan,
      blockedReasons: [
        ...initialPlan.blockedReasons,
        error instanceof Error
          ? `Terrain source resolver failed: ${error.message}`
          : "Terrain source resolver failed."
      ]
    };
  }
}

function northAmericaDtmCandidateSourceIds(coordinate: {
  latitude: number;
  longitude: number;
}): string[] {
  const sourceIds: string[] = [];
  const add = (sourceId: string) => {
    if (!sourceIds.includes(sourceId)) sourceIds.push(sourceId);
  };

  if (isKamloopsMunicipalTerrainCoordinate(coordinate)) add("kamloops-local-lidar-dtm-1m");
  if (isBritishColumbiaTerrainSourceCoordinate(coordinate)) add("bc-lidarbc");
  if (isUsaTerrainSourceCoordinate(coordinate)) add("usgs-3dep");
  if (isCanadaTerrainSourceCoordinate(coordinate)) {
    add("canada-hrdem");
    add("canada-hrdem-best-dtm");
  }

  return sourceIds;
}

function ukDtmCandidateSourceIds(coordinate: { latitude: number; longitude: number }): string[] {
  const inGreatBritain =
    coordinate.latitude >= 49.5 &&
    coordinate.latitude <= 61.2 &&
    coordinate.longitude >= -8.8 &&
    coordinate.longitude <= 2.2;
  if (!inGreatBritain) return [];

  return coordinate.latitude >= 54.4
    ? ["scottish-remote-sensing-lidar", "os-terrain-50"]
    : ["environment-agency-lidar-dtm", "os-terrain-50"];
}

function liveDtmCandidateSourceIds(coordinate: { latitude: number; longitude: number }) {
  return [...northAmericaDtmCandidateSourceIds(coordinate), ...ukDtmCandidateSourceIds(coordinate)];
}

function northAmericaDsmCandidateSourceIds(coordinate: {
  latitude: number;
  longitude: number;
}): string[] {
  const sourceIds: string[] = [];
  const add = (sourceId: string) => {
    if (!sourceIds.includes(sourceId)) sourceIds.push(sourceId);
  };

  if (isBritishColumbiaTerrainSourceCoordinate(coordinate)) add("bc-lidarbc-dsm");
  if (isUsaTerrainSourceCoordinate(coordinate)) add("usgs-3dep-lpc-dsm");
  if (isCanadaTerrainSourceCoordinate(coordinate)) add("canada-hrdem-dsm");

  return sourceIds;
}

function cogProbeProviderForToolId(toolId: string | null | undefined) {
  if (toolId === "bc-lidarbc" || toolId === "bc-lidarbc-dsm") {
    return BC_LIDARBC_TERRAIN_PROVIDER;
  }
  if (
    toolId === "canada-hrdem" ||
    toolId === "canada-hrdem-best-dtm" ||
    toolId === "canada-hrdem-dsm"
  ) {
    return CANADA_HRDEM_TERRAIN_PROVIDER;
  }
  return null;
}

function terrainPlanCoordinate(plan: TerrainSourceAdapterPlan) {
  if (!plan.bbox) return null;
  return {
    latitude: (plan.bbox.south + plan.bbox.north) / 2,
    longitude: (plan.bbox.west + plan.bbox.east) / 2
  };
}

function probeFailureReason(probe: TerrainCogProbeWorkerResult) {
  const reasons = Array.isArray(probe.reasons) ? probe.reasons.filter(Boolean) : [];
  return reasons.length > 0
    ? reasons.join(" ")
    : "Source COG pixel coverage probe did not prove valid terrain pixels.";
}

async function requireSourcePixelCoverageForPlan(
  plan: TerrainSourceAdapterPlan,
  options: TerrainSourceAdapterOptions
): Promise<TerrainSourceAdapterPlan> {
  if (!options.requireSourcePixelCoverage || plan.status !== "ready") return plan;

  const providerId = cogProbeProviderForToolId(plan.toolProfile?.toolId);
  const coordinate = terrainPlanCoordinate(plan);
  if (!providerId || !coordinate || !plan.toolProfile) return plan;

  const role = terrainPreviewRoleForToolProfile(plan.toolProfile);
  const probe = await (options.terrainCogCoordinateProbe ?? probeTerrainCogCoordinate)({
    providerId,
    coordinate,
    role,
    allowTwoMeterFallback:
      plan.toolProfile.toolId === "canada-hrdem-best-dtm" ||
      plan.selectedSource?.id === "canada-hrdem-best-dtm",
    timeoutMs: options.sourcePixelCoverageProbeTimeoutMs
  });
  if (probe.status === "covered") {
    return {
      ...plan,
      warnings: [
        ...plan.warnings,
        `Source pixel coverage probe proved ${providerId} ${role.toUpperCase()} valid terrain pixels for the AOI centroid.`
      ]
    };
  }

  return {
    ...plan,
    status: "blocked",
    inputRefs: [],
    blockedReasons: [
      ...plan.blockedReasons,
      `${providerId} ${role.toUpperCase()} source pixel coverage probe failed: ${probeFailureReason(probe)}`
    ],
    warnings: [
      ...plan.warnings,
      "VMesh retained this source as index evidence only; Abundance must not claim heightfield-ready terrain from it for this AOI."
    ]
  };
}

function isKamloopsDerivedElevationRef(inputRef: TerrainSourceInputRef): boolean {
  return (
    inputRef.url === KAMLOOPS_MUNICIPAL_DEM_POINT_BREAK_SHP_URL ||
    inputRef.url === KAMLOOPS_MUNICIPAL_CONTOUR_1M_LAYER_URL
  );
}

function isDeferrableKamloopsDerivedElevationPlan(plan: TerrainSourceAdapterPlan): boolean {
  return (
    plan.status === "ready" &&
    plan.selectedSource?.id === "kamloops-local-lidar-dtm-1m" &&
    plan.inputRefs.some(isKamloopsDerivedElevationRef)
  );
}

async function createLiveNorthAmericaSourceAdapterPlan({
  input,
  options,
  candidateSourceIds,
  unresolvedWarning
}: {
  input: TerrainPackageWorkerInput;
  options: TerrainSourceAdapterOptions;
  candidateSourceIds: string[];
  unresolvedWarning: string;
}): Promise<TerrainSourceAdapterPlan> {
  const basePlan = createTerrainWorkerPlan(input, options);

  if (candidateSourceIds.length === 0) {
    return createTerrainSourceAdapterPlan(input, options);
  }

  const baseRequest = input.request ?? {
    aoi: basePlan.aoi,
    layers: basePlan.requestedLayers,
    consumerAppId: basePlan.manifest.consumerAppId
  };
  const blockedPlans: TerrainSourceAdapterPlan[] = [];
  const deferredReadyPlans: TerrainSourceAdapterPlan[] = [];

  for (const sourceId of candidateSourceIds) {
    const plan = await createLiveTerrainSourceAdapterPlan(
      {
        request: {
          ...baseRequest,
          preferredSourceIds: [sourceId]
        }
      },
      options
    );
    const verifiedPlan = await requireSourcePixelCoverageForPlan(plan, options);

    if (
      isDeferrableKamloopsDerivedElevationPlan(verifiedPlan) &&
      candidateSourceIds.some((candidateSourceId) => candidateSourceId !== sourceId)
    ) {
      deferredReadyPlans.push(verifiedPlan);
      continue;
    }

    if (verifiedPlan.status === "ready") {
      return deferredReadyPlans.length > 0
        ? {
            ...verifiedPlan,
            warnings: [
              ...verifiedPlan.warnings,
              "VMesh deferred the Kamloops municipal DEMPoint/contour-derived rail until source-native regional raster candidates were attempted for this AOI."
            ]
          }
        : verifiedPlan;
    }
    blockedPlans.push(verifiedPlan);
  }

  if (deferredReadyPlans.length > 0) {
    const fallback = deferredReadyPlans[0];
    return {
      ...fallback,
      warnings: [
        ...fallback.warnings,
        "VMesh used the Kamloops municipal DEMPoint/contour-derived rail only after stronger source-native regional raster candidates failed or were unavailable."
      ]
    };
  }

  const fallback =
    blockedPlans[blockedPlans.length - 1] ?? createTerrainSourceAdapterPlan(input, options);
  return {
    ...fallback,
    blockedReasons: blockedPlans.flatMap((plan) => plan.blockedReasons),
    warnings: [...fallback.warnings, unresolvedWarning]
  };
}

async function createLiveNorthAmericaSourceAdapterPlans({
  input,
  options,
  candidateSourceIds,
  unresolvedWarning
}: {
  input: TerrainPackageWorkerInput;
  options: TerrainSourceAdapterOptions;
  candidateSourceIds: string[];
  unresolvedWarning: string;
}): Promise<TerrainSourceAdapterPlan[]> {
  const basePlan = createTerrainWorkerPlan(input, options);

  if (candidateSourceIds.length === 0) {
    return [createTerrainSourceAdapterPlan(input, options)];
  }

  const baseRequest = input.request ?? {
    aoi: basePlan.aoi,
    layers: basePlan.requestedLayers,
    consumerAppId: basePlan.manifest.consumerAppId
  };
  const plans: TerrainSourceAdapterPlan[] = [];
  const deferredReadyPlans: TerrainSourceAdapterPlan[] = [];

  for (const sourceId of candidateSourceIds) {
    const plan = await createLiveTerrainSourceAdapterPlan(
      {
        request: {
          ...baseRequest,
          preferredSourceIds: [sourceId]
        }
      },
      options
    );
    const verifiedPlan = await requireSourcePixelCoverageForPlan(plan, options);

    if (
      isDeferrableKamloopsDerivedElevationPlan(verifiedPlan) &&
      candidateSourceIds.some((candidateSourceId) => candidateSourceId !== sourceId)
    ) {
      deferredReadyPlans.push(verifiedPlan);
      continue;
    }

    plans.push(verifiedPlan);
  }

  if (deferredReadyPlans.length > 0) {
    plans.push(
      ...deferredReadyPlans.map((plan) => ({
        ...plan,
        warnings: [
          ...plan.warnings,
          "VMesh kept the Kamloops municipal DEMPoint/contour-derived rail behind source-native regional raster candidates for this AOI."
        ]
      }))
    );
  }

  if (plans.some((plan) => plan.status === "ready")) return plans;

  const fallback = plans[plans.length - 1] ?? createTerrainSourceAdapterPlan(input, options);
  return [
    {
      ...fallback,
      blockedReasons: plans.flatMap((plan) => plan.blockedReasons),
      warnings: [...fallback.warnings, unresolvedWarning]
    }
  ];
}

export async function createLiveNorthAmericaDtmSourceAdapterPlan(
  input: TerrainPackageWorkerInput,
  options: TerrainSourceAdapterOptions = {}
): Promise<TerrainSourceAdapterPlan> {
  const basePlan = createTerrainWorkerPlan(input, options);
  return createLiveNorthAmericaSourceAdapterPlan({
    input,
    options,
    candidateSourceIds: northAmericaDtmCandidateSourceIds(basePlan.aoi.centroid),
    unresolvedWarning:
      "No official USA/Canada DTM source adapter resolved ready for this AOI after trying the regional candidate chain."
  });
}

export async function createLiveNorthAmericaDtmSourceAdapterPlans(
  input: TerrainPackageWorkerInput,
  options: TerrainSourceAdapterOptions = {}
): Promise<TerrainSourceAdapterPlan[]> {
  const basePlan = createTerrainWorkerPlan(input, options);
  return createLiveNorthAmericaSourceAdapterPlans({
    input,
    options,
    candidateSourceIds: northAmericaDtmCandidateSourceIds(basePlan.aoi.centroid),
    unresolvedWarning:
      "No official USA/Canada DTM source adapter resolved ready for this AOI after trying the regional candidate chain."
  });
}

export async function createLiveDtmSourceAdapterPlan(
  input: TerrainPackageWorkerInput,
  options: TerrainSourceAdapterOptions = {}
): Promise<TerrainSourceAdapterPlan> {
  const basePlan = createTerrainWorkerPlan(input, options);
  return createLiveNorthAmericaSourceAdapterPlan({
    input,
    options,
    candidateSourceIds: liveDtmCandidateSourceIds(basePlan.aoi.centroid),
    unresolvedWarning:
      "No indexed regional DTM source adapter resolved ready for this AOI; retain labelled global terrain fallback."
  });
}

export async function createLiveDtmSourceAdapterPlans(
  input: TerrainPackageWorkerInput,
  options: TerrainSourceAdapterOptions = {}
): Promise<TerrainSourceAdapterPlan[]> {
  const basePlan = createTerrainWorkerPlan(input, options);
  return createLiveNorthAmericaSourceAdapterPlans({
    input,
    options,
    candidateSourceIds: liveDtmCandidateSourceIds(basePlan.aoi.centroid),
    unresolvedWarning:
      "No indexed regional DTM source adapter resolved ready for this AOI; retain labelled global terrain fallback."
  });
}

export async function createLiveNorthAmericaDsmSourceAdapterPlan(
  input: TerrainPackageWorkerInput,
  options: TerrainSourceAdapterOptions = {}
): Promise<TerrainSourceAdapterPlan> {
  const basePlan = createTerrainWorkerPlan(input, options);
  return createLiveNorthAmericaSourceAdapterPlan({
    input,
    options,
    candidateSourceIds: northAmericaDsmCandidateSourceIds(basePlan.aoi.centroid),
    unresolvedWarning:
      "No official USA/Canada DSM source adapter resolved ready for this AOI after trying the regional candidate chain."
  });
}

export const SOURCE_AUTO_TERRAIN_PROVIDER = "source-auto";
export const SOURCE_AUTO_BEST_TERRAIN_PROVIDER = "source-auto-best";
export const USGS_3DEP_TERRAIN_PROVIDER = "usgs-3dep";
export const USGS_3DEP_LPC_DSM_TERRAIN_PROVIDER = "usgs-3dep-lpc-dsm";
export const CANADA_HRDEM_TERRAIN_PROVIDER = "canada-hrdem";
export const BC_LIDARBC_TERRAIN_PROVIDER = "bc-lidarbc";

export type TerrainSourcePreviewProvider =
  | typeof SOURCE_AUTO_TERRAIN_PROVIDER
  | typeof SOURCE_AUTO_BEST_TERRAIN_PROVIDER
  | typeof USGS_3DEP_TERRAIN_PROVIDER
  | typeof USGS_3DEP_LPC_DSM_TERRAIN_PROVIDER
  | typeof CANADA_HRDEM_TERRAIN_PROVIDER
  | typeof BC_LIDARBC_TERRAIN_PROVIDER;

export type TerrainSourcePreviewRole = "dtm" | "dsm";

export function isTerrainSourcePreviewProvider(
  value: string
): value is TerrainSourcePreviewProvider {
  return (
    value === SOURCE_AUTO_TERRAIN_PROVIDER ||
    value === SOURCE_AUTO_BEST_TERRAIN_PROVIDER ||
    value === USGS_3DEP_TERRAIN_PROVIDER ||
    value === USGS_3DEP_LPC_DSM_TERRAIN_PROVIDER ||
    value === CANADA_HRDEM_TERRAIN_PROVIDER ||
    value === BC_LIDARBC_TERRAIN_PROVIDER
  );
}

export function isTerrainSourcePreviewRole(value: string): value is TerrainSourcePreviewRole {
  return value === "dtm" || value === "dsm";
}

export interface TerrainSourcePreviewTileParams {
  z: string | number;
  x: string | number;
  y: string | number;
}

export interface NormalizedTerrainSourcePreviewTile {
  z: number;
  x: number;
  y: number;
}

export interface WebMercatorBbox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface LonLatCoordinate {
  longitude: number;
  latitude: number;
}

export interface TerrainSourcePreviewSummary {
  provider:
    | "USGS 3DEP"
    | "Natural Resources Canada HRDEM"
    | "Government of British Columbia LidarBC";
  providerId: TerrainSourcePreviewProvider;
  role: TerrainSourcePreviewRole;
  groundModelRole: "bare-earth-dtm" | "surface-dsm";
  resolutionMeters: number;
  sourceRelease: string;
  license: string;
  attribution: string;
  upstreamLayer: string;
}

export interface CanadaHrdemStacAssetSelection {
  collection: "hrdem-mosaic-1m" | "hrdem-mosaic-2m";
  id: string;
  sourceId: string;
  assetRole: TerrainSourcePreviewRole;
  href: string;
  type: string;
  resolutionMeters: 1 | 2;
}

export interface BcLidarFeatureServerAssetSelection {
  sourceId: string;
  href: string;
  assetRole: TerrainSourcePreviewRole;
  filename: string;
  spacing: string;
  year: number | null;
  projection: string | null;
}

export interface UsgsLpcDsmSourceSelection {
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

export interface Usgs3depDtmSourceSelection {
  sourceId: string;
  sourceDemLink: string;
  metadataLink: string | null;
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
  sourceDemCategory: string | null;
  sourceDemReason: string | null;
  oneMeterCategory: string | null;
  oneMeterReason: string | null;
  seamlessCategory: string | null;
  seamlessReason: string | null;
  collectionEnd: number | null;
}

export type TerrainSourcePreviewRequest =
  | {
      status: "ready";
      upstreamUrl: string;
      sourceSummary: TerrainSourcePreviewSummary;
    }
  | {
      status: "transparent";
      reason: string;
    }
  | {
      status: "blocked";
      reason: string;
    }
  | {
      status: "worker-render";
      sourceSummary: TerrainSourcePreviewSummary;
    };

const WEB_MERCATOR_RADIUS = 6378137;
const WEB_MERCATOR_ORIGIN = Math.PI * WEB_MERCATOR_RADIUS;
export const TRANSPARENT_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABpfZFQAAAAABJRU5ErkJggg==";

const BLANK_PREVIEW_PNG_BYTE_THRESHOLD = 2048;

interface LonLatBbox {
  west: number;
  south: number;
  east: number;
  north: number;
}

const USA_SOURCE_BOUNDS: LonLatBbox[] = [
  { west: -125, south: 24, east: -66, north: 50 },
  { west: -180, south: 51, east: -129, north: 72 },
  { west: -161, south: 18, east: -154, north: 23 },
  { west: -68.2, south: 17.7, east: -64.4, north: 18.7 }
];

const CANADA_SOURCE_BOUNDS: LonLatBbox[] = [{ west: -141.5, south: 41.5, east: -52, north: 83.5 }];
const BRITISH_COLUMBIA_SOURCE_BOUNDS: LonLatBbox[] = [
  { west: -139.2, south: 48.1, east: -119.0, north: 60.1 }
];
const BC_LIDAR_FEATURE_SERVER_BASE_URL =
  "https://services6.arcgis.com/ubm4tcTYICKBpist/ArcGIS/rest/services/LiDAR_BC_S3_Public/FeatureServer";
const BC_LIDAR_FEATURE_SERVER_LAYER_IDS: Record<TerrainSourcePreviewRole, string[]> = {
  dsm: ["1", "2", "3"],
  dtm: ["5", "6"]
};

function parseInteger(value: string | number, label: string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid terrain source tile ${label}.`);
  }
  return parsed;
}

export function normalizeTerrainSourcePreviewTile(
  params: TerrainSourcePreviewTileParams
): NormalizedTerrainSourcePreviewTile {
  const z = parseInteger(params.z, "z");
  const x = parseInteger(params.x, "x");
  const y = parseInteger(params.y, "y");
  const maxTile = 2 ** z;

  if (z < 0 || z > 16 || x < 0 || y < 0 || x >= maxTile || y >= maxTile) {
    throw new Error("Terrain source tile coordinates are outside the supported range.");
  }

  return { z, x, y };
}

export function tileToWebMercatorBbox({
  z,
  x,
  y
}: NormalizedTerrainSourcePreviewTile): WebMercatorBbox {
  const tileSize = (2 * WEB_MERCATOR_ORIGIN) / 2 ** z;
  const west = -WEB_MERCATOR_ORIGIN + x * tileSize;
  const east = west + tileSize;
  const north = WEB_MERCATOR_ORIGIN - y * tileSize;
  const south = north - tileSize;

  return { west, south, east, north };
}

export function tileToLonLatCenter({
  z,
  x,
  y
}: NormalizedTerrainSourcePreviewTile): LonLatCoordinate {
  const n = 2 ** z;
  const longitude = ((x + 0.5) / n) * 360 - 180;
  const mercatorY = Math.PI * (1 - (2 * (y + 0.5)) / n);
  const latitude = (Math.atan(Math.sinh(mercatorY)) * 180) / Math.PI;

  return { longitude, latitude };
}

function mercatorTileYToLatitude(y: number, z: number): number {
  const n = 2 ** z;
  const mercatorY = Math.PI * (1 - (2 * y) / n);
  return (Math.atan(Math.sinh(mercatorY)) * 180) / Math.PI;
}

function mercatorTileXToLongitude(x: number, z: number): number {
  return (x / 2 ** z) * 360 - 180;
}

export function tileToLonLatBbox({ z, x, y }: NormalizedTerrainSourcePreviewTile): LonLatBbox {
  return {
    west: mercatorTileXToLongitude(x, z),
    south: mercatorTileYToLatitude(y + 1, z),
    east: mercatorTileXToLongitude(x + 1, z),
    north: mercatorTileYToLatitude(y, z)
  };
}

function bboxContainsCoordinate(bbox: LonLatBbox, coordinate: LonLatCoordinate): boolean {
  return (
    coordinate.longitude >= bbox.west &&
    coordinate.longitude <= bbox.east &&
    coordinate.latitude >= bbox.south &&
    coordinate.latitude <= bbox.north
  );
}

export function isUsaTerrainSourceCoordinate(coordinate: LonLatCoordinate): boolean {
  return USA_SOURCE_BOUNDS.some((bbox) => bboxContainsCoordinate(bbox, coordinate));
}

export function isCanadaTerrainSourceCoordinate(coordinate: LonLatCoordinate): boolean {
  return CANADA_SOURCE_BOUNDS.some((bbox) => bboxContainsCoordinate(bbox, coordinate));
}

export function isBritishColumbiaTerrainSourceCoordinate(coordinate: LonLatCoordinate): boolean {
  return BRITISH_COLUMBIA_SOURCE_BOUNDS.some((bbox) => bboxContainsCoordinate(bbox, coordinate));
}

export function isNorthAmericaTerrainSourceCoordinate(coordinate: LonLatCoordinate): boolean {
  return isUsaTerrainSourceCoordinate(coordinate) || isCanadaTerrainSourceCoordinate(coordinate);
}

export function isLikelyBlankTerrainSourcePreviewImage({
  byteLength,
  contentType
}: {
  byteLength: number;
  contentType: string | null;
}): boolean {
  return (
    (contentType?.toLowerCase().includes("image/png") ?? false) &&
    byteLength <= BLANK_PREVIEW_PNG_BYTE_THRESHOLD
  );
}

export function createCanadaHrdemLocalPreviewUrl({
  coordinate,
  role,
  spanDegrees = 0.02,
  sizePx = 256
}: {
  coordinate: LonLatCoordinate;
  role: TerrainSourcePreviewRole;
  spanDegrees?: number;
  sizePx?: number;
}): string {
  const halfSpan = spanDegrees / 2;
  const south = Math.max(-90, coordinate.latitude - halfSpan);
  const north = Math.min(90, coordinate.latitude + halfSpan);
  const west = Math.max(-180, coordinate.longitude - halfSpan);
  const east = Math.min(180, coordinate.longitude + halfSpan);
  const url = new URL("https://datacube.services.geo.ca/ows/elevation");

  url.searchParams.set("service", "WMS");
  url.searchParams.set("version", "1.3.0");
  url.searchParams.set("request", "GetMap");
  url.searchParams.set("layers", `${role}-hillshade`);
  url.searchParams.set("styles", "");
  url.searchParams.set("crs", "EPSG:4326");
  url.searchParams.set(
    "bbox",
    [south, west, north, east].map((value) => value.toFixed(6)).join(",")
  );
  url.searchParams.set("width", String(sizePx));
  url.searchParams.set("height", String(sizePx));
  url.searchParams.set("format", "image/png");
  url.searchParams.set("transparent", "true");

  return url.toString();
}

function sourceSummaryForUsgs3dep(): TerrainSourcePreviewSummary {
  return {
    provider: "USGS 3DEP",
    providerId: USGS_3DEP_TERRAIN_PROVIDER,
    role: "dtm",
    groundModelRole: "bare-earth-dtm",
    resolutionMeters: 1,
    sourceRelease: "USGS 3DEP 1 meter DEM product-index/source-DEM gated worker preview",
    license: "Public Domain (U.S. Government Work)",
    attribution: "U.S. Geological Survey 3D Elevation Program",
    upstreamLayer:
      "3DEPElevation ImageServer Hillshade Gray after 1m product-index or source DEM proof"
  };
}

function sourceSummaryForUsgsLpcDsm(): TerrainSourcePreviewSummary {
  return {
    provider: "USGS 3DEP",
    providerId: USGS_3DEP_LPC_DSM_TERRAIN_PROVIDER,
    role: "dsm",
    groundModelRole: "surface-dsm",
    resolutionMeters: 1,
    sourceRelease: "USGS 3DEP Lidar Point Cloud DSM worker-derived preview where covered",
    license: "Public Domain (U.S. Government Work); source project notices apply",
    attribution: "U.S. Geological Survey 3D Elevation Program",
    upstreamLayer: "LPC max-z surface DSM preview"
  };
}

function sourceSummaryForCanadaHrdem(
  role: TerrainSourcePreviewRole,
  resolutionMeters: 1 | 2 = 1
): TerrainSourcePreviewSummary {
  return {
    provider: "Natural Resources Canada HRDEM",
    providerId: CANADA_HRDEM_TERRAIN_PROVIDER,
    role,
    groundModelRole: role === "dtm" ? "bare-earth-dtm" : "surface-dsm",
    resolutionMeters,
    sourceRelease:
      resolutionMeters === 1
        ? "Canada HRDEM Mosaic 1 m where covered; fail closed for 2 m-only strict gaps"
        : "Canada HRDEM Mosaic 2 m best-available fallback; not a 1 m milestone pass",
    license: "Open Government Licence - Canada",
    attribution: "Natural Resources Canada",
    upstreamLayer: `${role}-hillshade`
  };
}

function sourceSummaryForBcLidar(role: TerrainSourcePreviewRole): TerrainSourcePreviewSummary {
  return {
    provider: "Government of British Columbia LidarBC",
    providerId: BC_LIDARBC_TERRAIN_PROVIDER,
    role,
    groundModelRole: role === "dtm" ? "bare-earth-dtm" : "surface-dsm",
    resolutionMeters: 1,
    sourceRelease: "LidarBC 1 metre DEM/DSM FeatureServer-indexed GeoTIFF where covered",
    license: "BC open data terms",
    attribution: "Government of British Columbia LidarBC",
    upstreamLayer: role === "dsm" ? "LiDAR DSM Index 1:2,500" : "LiDAR DEM Index 1:2,500"
  };
}

function providerForTile(
  provider: TerrainSourcePreviewProvider,
  tile: NormalizedTerrainSourcePreviewTile,
  role: TerrainSourcePreviewRole
): Exclude<
  TerrainSourcePreviewProvider,
  typeof SOURCE_AUTO_TERRAIN_PROVIDER | typeof SOURCE_AUTO_BEST_TERRAIN_PROVIDER
> | null {
  if (provider !== SOURCE_AUTO_TERRAIN_PROVIDER && provider !== SOURCE_AUTO_BEST_TERRAIN_PROVIDER) {
    return provider;
  }

  const center = tileToLonLatCenter(tile);

  if (isUsaTerrainSourceCoordinate(center)) {
    return role === "dsm" ? USGS_3DEP_LPC_DSM_TERRAIN_PROVIDER : USGS_3DEP_TERRAIN_PROVIDER;
  }
  if (isCanadaTerrainSourceCoordinate(center)) return CANADA_HRDEM_TERRAIN_PROVIDER;
  return null;
}

export function createTerrainSourcePreviewRequest({
  provider,
  role,
  tile,
  sourceResolutionMeters
}: {
  provider: TerrainSourcePreviewProvider;
  role: TerrainSourcePreviewRole;
  tile: NormalizedTerrainSourcePreviewTile;
  sourceResolutionMeters?: 1 | 2;
}): TerrainSourcePreviewRequest {
  const resolvedProvider = providerForTile(provider, tile, role);

  if (!resolvedProvider) {
    return {
      status: "transparent",
      reason: "The terrain source preview tile is outside the USA/Canada source-backed area."
    };
  }

  if (resolvedProvider === USGS_3DEP_TERRAIN_PROVIDER) {
    if (role !== "dtm") {
      return {
        status: provider === SOURCE_AUTO_TERRAIN_PROVIDER ? "transparent" : "blocked",
        reason:
          "USA DSM source preview is not enabled; USGS 3DEP DEM is a bare-earth DTM route, not DSM."
      };
    }

    return {
      status: "worker-render",
      sourceSummary: sourceSummaryForUsgs3dep()
    };
  }

  if (resolvedProvider === USGS_3DEP_LPC_DSM_TERRAIN_PROVIDER) {
    if (role !== "dsm") {
      return {
        status: "blocked",
        reason: "USGS 3DEP LPC is a DSM route; use USGS 3DEP DEM for bare-earth DTM."
      };
    }

    return {
      status: "worker-render",
      sourceSummary: sourceSummaryForUsgsLpcDsm()
    };
  }

  if (resolvedProvider === BC_LIDARBC_TERRAIN_PROVIDER) {
    return {
      status: "worker-render",
      sourceSummary: sourceSummaryForBcLidar(role)
    };
  }

  return {
    status: "worker-render",
    sourceSummary: sourceSummaryForCanadaHrdem(role, sourceResolutionMeters)
  };
}

export function createBcLidarFeatureServerQueryUrl({
  coordinate,
  role,
  baseUrl = BC_LIDAR_FEATURE_SERVER_BASE_URL
}: {
  coordinate: LonLatCoordinate;
  role: TerrainSourcePreviewRole;
  baseUrl?: string;
}): string {
  return createBcLidarFeatureServerQueryUrls({ coordinate, role, baseUrl })[0];
}

export function createBcLidarFeatureServerQueryUrls({
  coordinate,
  role,
  baseUrl = BC_LIDAR_FEATURE_SERVER_BASE_URL
}: {
  coordinate: LonLatCoordinate;
  role: TerrainSourcePreviewRole;
  baseUrl?: string;
}): string[] {
  return BC_LIDAR_FEATURE_SERVER_LAYER_IDS[role].flatMap((layerId) => [
    createBcLidarFeatureServerLayerQueryUrl({ coordinate, layerId, baseUrl }),
    createBcLidarFeatureServerLayerQueryUrl({
      coordinate,
      layerId,
      baseUrl,
      envelopeDegrees: 0.03
    })
  ]);
}

function createBcLidarFeatureServerLayerQueryUrl({
  coordinate,
  layerId,
  baseUrl,
  envelopeDegrees
}: {
  coordinate: LonLatCoordinate;
  layerId: string;
  baseUrl: string;
  envelopeDegrees?: number;
}): string {
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/${layerId}/query`);

  url.searchParams.set("f", "json");
  url.searchParams.set("where", "1=1");
  if (envelopeDegrees) {
    const west = Number((coordinate.longitude - envelopeDegrees).toFixed(6));
    const south = Number((coordinate.latitude - envelopeDegrees).toFixed(6));
    const east = Number((coordinate.longitude + envelopeDegrees).toFixed(6));
    const north = Number((coordinate.latitude + envelopeDegrees).toFixed(6));
    url.searchParams.set("geometry", `${west},${south},${east},${north}`);
    url.searchParams.set("geometryType", "esriGeometryEnvelope");
  } else {
    url.searchParams.set(
      "geometry",
      `${Number(coordinate.longitude.toFixed(6))},${Number(coordinate.latitude.toFixed(6))}`
    );
    url.searchParams.set("geometryType", "esriGeometryPoint");
  }
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("outFields", "filename,maptile,path,spacing,year,s3Url,projection");
  url.searchParams.set("returnGeometry", "false");

  return url.toString();
}

export function selectBcLidarFeatureServerAsset(
  value: unknown,
  role: TerrainSourcePreviewRole
): BcLidarFeatureServerAssetSelection | null {
  if (!isRecord(value) || !Array.isArray(value.features)) return null;

  const assets: BcLidarFeatureServerAssetSelection[] = [];

  for (const feature of value.features) {
    if (!isRecord(feature)) continue;
    const attributes = isRecord(feature.attributes) ? feature.attributes : null;
    if (!attributes) continue;

    const href = typeof attributes.s3Url === "string" ? attributes.s3Url : "";
    const filename = typeof attributes.filename === "string" ? attributes.filename : "unknown";
    const spacing = typeof attributes.spacing === "string" ? attributes.spacing.trim() : "";
    const maptile = typeof attributes.maptile === "string" ? attributes.maptile : filename;
    const year =
      typeof attributes.year === "number" && Number.isFinite(attributes.year)
        ? attributes.year
        : null;
    const projection = typeof attributes.projection === "string" ? attributes.projection : null;

    if (!/^https?:\/\//i.test(href)) continue;
    if (!/\.tiff?($|[?#])/i.test(href) && !/\.tiff?$/i.test(filename)) continue;
    if (!/1\s*met(re|er)/i.test(spacing) && !/xli1m/i.test(filename)) continue;
    if (role === "dsm" && !/dsm/i.test(filename)) continue;
    if (role === "dtm" && /dsm/i.test(filename)) continue;

    assets.push({
      sourceId: `bc-lidarbc:${role}:${maptile}:${year ?? "unknown"}`,
      href,
      assetRole: role,
      filename,
      spacing: spacing || "1 metre inferred from filename",
      year,
      projection
    });
  }

  return assets.sort((left, right) => (right.year ?? 0) - (left.year ?? 0))[0] ?? null;
}

export function createBcLidarSourceSummary(
  role: TerrainSourcePreviewRole
): TerrainSourcePreviewSummary {
  return sourceSummaryForBcLidar(role);
}

export function createUsgs3depOneMeterCoverageQueryUrl(coordinate: LonLatCoordinate): string {
  const url = new URL(
    "https://index.nationalmap.gov/arcgis/rest/services/3DEPElevationIndex/MapServer/1/query"
  );

  url.searchParams.set("f", "json");
  url.searchParams.set("where", "1=1");
  url.searchParams.set("geometry", `${coordinate.longitude},${coordinate.latitude}`);
  url.searchParams.set("geometryType", "esriGeometryPoint");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("outFields", "*");
  url.searchParams.set("returnGeometry", "false");

  return url.toString();
}

export function createUsgs3depSourceDemIndexQueryUrl(coordinate: LonLatCoordinate): string {
  const url = new URL(
    "https://index.nationalmap.gov/arcgis/rest/services/3DEPElevationIndex/MapServer/11/query"
  );

  url.searchParams.set("f", "json");
  url.searchParams.set("where", "1=1");
  url.searchParams.set(
    "geometry",
    `${Number(coordinate.longitude.toFixed(6))},${Number(coordinate.latitude.toFixed(6))}`
  );
  url.searchParams.set("geometryType", "esriGeometryPoint");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("outFields", "*");
  url.searchParams.set("returnGeometry", "false");

  return url.toString();
}

export function createUsgsLpcDsmSourceIndexQueryUrl(coordinate: LonLatCoordinate): string {
  return createUsgsLpcDsmSourceIndexQueryUrls(coordinate)[0];
}

export function createUsgsLpcDsmSourceIndexQueryUrls(coordinate: LonLatCoordinate): string[] {
  return [8, 24].map((layerId) => {
  const url = new URL(
    `https://index.nationalmap.gov/arcgis/rest/services/3DEPElevationIndex/MapServer/${layerId}/query`
  );

  url.searchParams.set("f", "json");
  url.searchParams.set("where", "1=1");
  url.searchParams.set(
    "geometry",
    `${Number(coordinate.longitude.toFixed(6))},${Number(coordinate.latitude.toFixed(6))}`
  );
  url.searchParams.set("geometryType", "esriGeometryPoint");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("outFields", "*");
  url.searchParams.set("returnGeometry", "false");

  return url.toString();
  });
}

export function createCanadaHrdemStacSearchBody(
  coordinate: LonLatCoordinate,
  _role: TerrainSourcePreviewRole
): string {
  void _role;

  return JSON.stringify({
    limit: 10,
    collections: ["hrdem-mosaic-1m", "hrdem-mosaic-2m"],
    intersects: {
      type: "Point",
      coordinates: [coordinate.longitude, coordinate.latitude]
    }
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function collectionResolution(collection: string): 1 | 2 | null {
  if (collection === "hrdem-mosaic-1m") return 1;
  if (collection === "hrdem-mosaic-2m") return 2;
  return null;
}

function isPublicHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function numberAttr(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringAttr(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function selectUsgs3depDtmSource(
  value: unknown,
  targetResolutionMeters = 1
): Usgs3depDtmSourceSelection | null {
  if (!isRecord(value) || !Array.isArray(value.features)) return null;

  const candidates: Usgs3depDtmSourceSelection[] = [];

  for (const feature of value.features) {
    if (!isRecord(feature)) continue;
    const attributes = isRecord(feature.attributes) ? feature.attributes : null;
    if (!attributes) continue;

    const sourceDemLink = stringAttr(attributes.sourcedem_link);
    const workunit = stringAttr(attributes.workunit);
    const project = stringAttr(attributes.project) ?? workunit;
    const demGsdMeters = numberAttr(attributes.dem_gsd_meters);
    const objectId = numberAttr(attributes.OBJECTID);

    if (!sourceDemLink || !workunit || !project || demGsdMeters === null) continue;
    if (!isPublicHttpUrl(sourceDemLink)) continue;
    if (demGsdMeters > targetResolutionMeters) continue;

    const sourceDemCategory = stringAttr(attributes.sourcedem_category);
    const sourceDemReason = stringAttr(attributes.sourcedem_reason);
    const oneMeterCategory = stringAttr(attributes.onemeter_category);
    const oneMeterReason = stringAttr(attributes.onemeter_reason);
    const sourceDemMeets =
      sourceDemCategory?.toLowerCase() === "meets" ||
      sourceDemReason?.toLowerCase().includes("meets 3dep source dem requirements") === true;
    const oneMeterMeets =
      oneMeterCategory?.toLowerCase() === "meets" ||
      oneMeterReason?.toLowerCase().includes("meets 3dep 1-m dem requirements") === true;
    if (!sourceDemMeets || !oneMeterMeets) continue;

    candidates.push({
      sourceId: `usgs-3dep-source-dem:${objectId ?? workunit}`,
      sourceDemLink,
      metadataLink: stringAttr(attributes.metadata_link),
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
      sourceDemCategory,
      sourceDemReason,
      oneMeterCategory,
      oneMeterReason,
      seamlessCategory: stringAttr(attributes.seamless_category),
      seamlessReason: stringAttr(attributes.seamless_reason),
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

export function selectUsgsLpcDsmSource(
  value: unknown,
  targetResolutionMeters = 1
): UsgsLpcDsmSourceSelection | null {
  if (!isRecord(value) || !Array.isArray(value.features)) return null;

  const candidates: UsgsLpcDsmSourceSelection[] = [];

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
      sourceId: `${USGS_3DEP_LPC_DSM_TERRAIN_PROVIDER}:${objectId ?? workunit}`,
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

export function getCanadaHrdemStacAssetSelections(
  value: unknown,
  role: TerrainSourcePreviewRole
): CanadaHrdemStacAssetSelection[] {
  if (!isRecord(value) || !Array.isArray(value.features)) return [];

  const selections: CanadaHrdemStacAssetSelection[] = [];

  for (const feature of value.features) {
    if (!isRecord(feature)) continue;

    const rawCollection = typeof feature.collection === "string" ? feature.collection : "";
    const collection =
      rawCollection === "hrdem-mosaic-1m" || rawCollection === "hrdem-mosaic-2m"
        ? rawCollection
        : null;
    if (!collection) continue;

    const resolutionMeters = collectionResolution(collection);
    if (!resolutionMeters) continue;

    const assets = isRecord(feature.assets) ? feature.assets : null;
    const asset = assets && isRecord(assets[role]) ? assets[role] : null;
    if (!asset) continue;

    const href = typeof asset.href === "string" ? asset.href : "";
    if (!href || !isPublicHttpUrl(href)) continue;

    const id = typeof feature.id === "string" ? feature.id : "unknown";

    selections.push({
      collection,
      id,
      sourceId: `${collection}:${id}`,
      assetRole: role,
      href,
      type: typeof asset.type === "string" ? asset.type : "unknown",
      resolutionMeters
    });
  }

  return selections.sort((left, right) => {
    if (left.resolutionMeters !== right.resolutionMeters) {
      return left.resolutionMeters - right.resolutionMeters;
    }
    return left.sourceId.localeCompare(right.sourceId);
  });
}

export function selectCanadaHrdemStacAsset({
  value,
  role,
  requireOneMeter = true
}: {
  value: unknown;
  role: TerrainSourcePreviewRole;
  requireOneMeter?: boolean;
}): CanadaHrdemStacAssetSelection | null {
  const selections = getCanadaHrdemStacAssetSelections(value, role);
  const selected = requireOneMeter
    ? selections.find((candidate) => candidate.resolutionMeters === 1)
    : selections[0];

  return selected ?? null;
}

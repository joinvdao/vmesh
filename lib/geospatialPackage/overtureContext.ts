import { VectorTile } from "@mapbox/vector-tile";
import { PbfReader } from "pbf";
import { PMTiles } from "pmtiles";

export interface OvertureContextBbox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface OvertureContextFeature {
  type: "Feature";
  id: string;
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, string | number | boolean | null> & {
    sourceId: "overture-maps-geoparquet";
    sourceFeatureId: string;
    sourceRelease: string;
    sourceLayer: "segment" | "water";
  };
}

export interface OvertureContextResult {
  schemaVersion: "vmesh-overture-context-query-v1";
  dataType: "roads" | "water";
  status:
    | "query-succeeded"
    | "query-succeeded-empty"
    | "query-succeeded-truncated"
    | "provider-failed";
  runClass: "configured" | "live-proof";
  release: string | null;
  license: string | null;
  query: { zoom: number; tileCount: number; maxFeatures: number };
  policy: {
    maxTiles: number;
    metadataTimeoutMs: number;
    metadataMaxAttempts: number;
    releaseCacheTtlSeconds: number;
  };
  featureCollection: { type: "FeatureCollection"; features: OvertureContextFeature[] };
  error: string | null;
  warnings: string[];
}

interface QueryDefinition {
  dataType: "roads" | "water";
  theme: "transportation" | "base";
  layer: "segment" | "water";
  zoom: 13 | 14;
  propertyNames: string[];
  geometryTypes: string[];
  include: (properties: Record<string, unknown>) => boolean;
}

const DEFINITIONS: Record<"roads" | "water", QueryDefinition> = {
  roads: {
    dataType: "roads",
    theme: "transportation",
    layer: "segment",
    zoom: 14,
    propertyNames: [
      "class",
      "subclass",
      "subtype",
      "road_surface",
      "road_flags",
      "access_restrictions",
      "speed_limits",
      "level_rules"
    ],
    geometryTypes: ["LineString", "MultiLineString"],
    include: (properties) => properties.subtype === "road"
  },
  water: {
    dataType: "water",
    theme: "base",
    layer: "water",
    zoom: 13,
    propertyNames: ["class", "subtype", "is_intermittent", "is_salt", "level"],
    geometryTypes: ["Polygon", "MultiPolygon", "LineString", "MultiLineString"],
    include: () => true
  }
};
const POLICY = {
  maxTiles: 64,
  metadataTimeoutMs: 5_000,
  metadataMaxAttempts: 2,
  releaseCacheTtlSeconds: 3_600
} as const;
let latestCache: { expiresAt: number; release: string } | null = null;

export async function queryOvertureContext(
  dataType: "roads" | "water",
  bbox: OvertureContextBbox,
  options: {
    fetchImpl?: typeof fetch;
    tileReaderFactory?: (url: string) => {
      getZxy(z: number, x: number, y: number): Promise<{ data: Uint8Array } | undefined>;
    };
    maxFeatures?: number;
  } = {}
): Promise<OvertureContextResult> {
  const definition = DEFINITIONS[dataType];
  const maxFeatures = Math.min(Math.max(options.maxFeatures ?? 12_000, 1), 25_000);
  let release: string | null = null;
  let license: string | null = null;
  try {
    const fetchImpl = options.fetchImpl ?? fetch;
    release = await latestRelease(fetchImpl, Boolean(options.fetchImpl));
    const catalogUrl = `https://stac.overturemaps.org/${release}/${definition.theme}/catalog.json`;
    const collectionUrl = `https://stac.overturemaps.org/${release}/${definition.theme}/${definition.layer}/collection.json`;
    const [catalog, collection] = await Promise.all([
      fetchJson(fetchImpl, catalogUrl),
      fetchJson(fetchImpl, collectionUrl)
    ]);
    license = typeof collection.license === "string" ? collection.license : "review";
    const pmtilesUrl = officialPmtilesUrl(catalog, release, definition.theme);
    const reader = options.tileReaderFactory?.(pmtilesUrl) ?? new PMTiles(pmtilesUrl);
    const tiles = tilesForBbox(bbox, definition.zoom);
    if (tiles.length > POLICY.maxTiles)
      throw new Error("Context frame exceeds the bounded tile budget.");
    const features = new Map<string, OvertureContextFeature>();
    let truncated = false;
    for (const tile of tiles) {
      const response = await reader.getZxy(definition.zoom, tile.x, tile.y);
      if (!response) continue;
      const layer = new VectorTile(new PbfReader(response.data)).layers[definition.layer];
      if (!layer) continue;
      for (let index = 0; index < layer.length; index += 1) {
        const raw = layer.feature(index).toGeoJSON(tile.x, tile.y, definition.zoom);
        if (!raw.geometry || !("coordinates" in raw.geometry)) continue;
        if (!definition.geometryTypes.includes(raw.geometry.type)) continue;
        const properties = raw.properties ?? {};
        if (!definition.include(properties) || !geometryIntersects(raw.geometry.coordinates, bbox))
          continue;
        const sourceFeatureId = stringValue(properties.id) ?? stringValue(raw.id);
        if (!sourceFeatureId || features.has(sourceFeatureId)) continue;
        if (features.size >= maxFeatures) {
          truncated = true;
          break;
        }
        features.set(sourceFeatureId, {
          type: "Feature",
          id: sourceFeatureId,
          geometry: raw.geometry,
          properties: {
            sourceId: "overture-maps-geoparquet",
            sourceFeatureId,
            sourceRelease: release,
            sourceLayer: definition.layer,
            ...Object.fromEntries(
              definition.propertyNames.map((name) => [name, scalarValue(properties[name])])
            )
          }
        });
      }
      if (truncated) break;
    }
    const output = [...features.values()];
    return {
      schemaVersion: "vmesh-overture-context-query-v1",
      dataType,
      status: truncated
        ? "query-succeeded-truncated"
        : output.length
          ? "query-succeeded"
          : "query-succeeded-empty",
      runClass: options.fetchImpl || options.tileReaderFactory ? "configured" : "live-proof",
      release,
      license,
      query: { zoom: definition.zoom, tileCount: tiles.length, maxFeatures },
      policy: POLICY,
      featureCollection: { type: "FeatureCollection", features: output },
      error: null,
      warnings: [
        "Official Overture PMTiles are generalized delivery artifacts; use release-matched GeoParquet for full source geometry.",
        "Missing source semantics remain null and are never inferred by VMesh."
      ]
    };
  } catch (error) {
    return {
      schemaVersion: "vmesh-overture-context-query-v1",
      dataType,
      status: "provider-failed",
      runClass: options.fetchImpl || options.tileReaderFactory ? "configured" : "live-proof",
      release,
      license,
      query: { zoom: definition.zoom, tileCount: 0, maxFeatures },
      policy: POLICY,
      featureCollection: { type: "FeatureCollection", features: [] },
      error: error instanceof Error ? error.message : "Overture context query failed.",
      warnings: ["Provider failure is not a valid empty result; continue to a reviewed fallback."]
    };
  }
}

async function latestRelease(fetchImpl: typeof fetch, injected: boolean) {
  const now = Date.now();
  if (!injected && latestCache && latestCache.expiresAt > now) return latestCache.release;
  const root = await fetchJson(fetchImpl, "https://stac.overturemaps.org/catalog.json");
  const release = typeof root.latest === "string" ? root.latest : "";
  if (!/^20\d{2}-\d{2}-\d{2}\.\d+$/.test(release))
    throw new Error("Invalid Overture latest release.");
  if (!injected) latestCache = { expiresAt: now + 3_600_000, release };
  return release;
}

function officialPmtilesUrl(catalog: Record<string, unknown>, release: string, theme: string) {
  const link = (Array.isArray(catalog.links) ? catalog.links : []).find(
    (candidate) =>
      isRecord(candidate) && candidate.rel === "pmtiles" && typeof candidate.href === "string"
  );
  const parsed = safeUrl(isRecord(link) ? String(link.href) : "");
  if (
    !parsed ||
    parsed.hostname !== "tiles.overturemaps.org" ||
    parsed.pathname !== `/${release}/${theme}.pmtiles`
  ) {
    throw new Error(`Invalid official Overture ${theme} PMTiles ref.`);
  }
  return parsed.toString();
}

function tilesForBbox(bbox: OvertureContextBbox, zoom: number) {
  const ranges =
    bbox.west <= bbox.east
      ? [[bbox.west, bbox.east]]
      : [
          [bbox.west, 180],
          [-180, bbox.east]
        ];
  const output: Array<{ x: number; y: number }> = [];
  for (const [west, east] of ranges) {
    for (let x = lonTile(west, zoom); x <= lonTile(Math.min(179.999999, east), zoom); x += 1) {
      for (let y = latTile(bbox.north, zoom); y <= latTile(bbox.south, zoom); y += 1)
        output.push({ x, y });
    }
  }
  return output;
}

function lonTile(value: number, zoom: number) {
  const size = 2 ** zoom;
  return Math.max(0, Math.min(size - 1, Math.floor(((value + 180) / 360) * size)));
}

function latTile(value: number, zoom: number) {
  const radians = (Math.max(-85.05112878, Math.min(85.05112878, value)) * Math.PI) / 180;
  const size = 2 ** zoom;
  return Math.max(
    0,
    Math.min(size - 1, Math.floor(((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2) * size))
  );
}

function geometryIntersects(coordinates: unknown, bbox: OvertureContextBbox) {
  const points: Array<[number, number]> = [];
  collectPoints(coordinates, points);
  if (!points.length) return false;
  const west = Math.min(...points.map((point) => point[0]));
  const east = Math.max(...points.map((point) => point[0]));
  const south = Math.min(...points.map((point) => point[1]));
  const north = Math.max(...points.map((point) => point[1]));
  const longitudeHit =
    bbox.west <= bbox.east
      ? east >= bbox.west && west <= bbox.east
      : east >= bbox.west || west <= bbox.east;
  return longitudeHit && north >= bbox.south && south <= bbox.north;
}

function collectPoints(value: unknown, output: Array<[number, number]>) {
  if (!Array.isArray(value)) return;
  if (typeof value[0] === "number" && typeof value[1] === "number")
    output.push([value[0], value[1]]);
  else for (const child of value) collectPoints(child, output);
}

async function fetchJson(fetchImpl: typeof fetch, url: string) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= POLICY.metadataMaxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), POLICY.metadataTimeoutMs);
    try {
      const response = await fetchImpl(url, {
        signal: controller.signal,
        headers: { accept: "application/json", "user-agent": "VMesh source resolver" }
      });
      if (!response.ok) {
        const error = new Error(`Overture metadata failed with HTTP ${response.status}.`);
        if (response.status < 500 && response.status !== 429) throw error;
        lastError = error;
        continue;
      }
      const value = (await response.json()) as unknown;
      if (!isRecord(value)) throw new Error("Overture metadata was not an object.");
      return value;
    } catch (error) {
      lastError = error;
      if (attempt === POLICY.metadataMaxAttempts) throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Overture metadata failed.");
}

function scalarValue(value: unknown): string | number | boolean | null {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? value
    : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value
    ? value
    : typeof value === "number"
      ? String(value)
      : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

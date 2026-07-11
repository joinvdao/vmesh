import { VectorTile } from "@mapbox/vector-tile";
import { PbfReader } from "pbf";
import { PMTiles } from "pmtiles";

export interface OvertureBuildingBbox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface OvertureBuildingSourcePlan {
  release: string;
  pmtilesUrl: string;
  collectionUrl: string;
  license: string;
  columns: string[];
}

export interface OvertureBuildingFeature {
  type: "Feature";
  id: string;
  geometry: { type: string; coordinates: unknown };
  properties: {
    sourceId: "overture-maps-geoparquet";
    sourceFeatureId: string;
    sourceRelease: string;
    sourceLayer: "building" | "building_part";
    class: string | null;
    subtype: string | null;
    heightMeters: number | null;
    levels: number | null;
    minHeightMeters: number | null;
    minFloor: number | null;
    facadeColor: string | null;
    facadeMaterial: string | null;
    roofColor: string | null;
    roofMaterial: string | null;
    roofShape: string | null;
    roofHeightMeters: number | null;
    confidence: null;
    confidenceBasis: "not-published";
  };
}

export interface OvertureBuildingQueryResult {
  schemaVersion: "vmesh-overture-building-query-v1";
  status:
    | "query-succeeded"
    | "query-succeeded-empty"
    | "query-succeeded-truncated"
    | "provider-failed";
  runClass: "configured" | "live-proof";
  release: string | null;
  sourceId: "overture-maps-geoparquet";
  license: string | null;
  attribution: string;
  query: {
    zoom: 14;
    tileCount: number;
    maxFeatures: number;
    includeParts: boolean;
  };
  featureCollection: {
    type: "FeatureCollection";
    features: OvertureBuildingFeature[];
  };
  warnings: string[];
  error: string | null;
}

interface TileReader {
  getZxy(z: number, x: number, y: number): Promise<{ data: Uint8Array } | undefined>;
}

const OVERTURE_STAC_ROOT = "https://stac.overturemaps.org/catalog.json";
const TILE_ZOOM = 14 as const;
let cachedPlan: { expiresAt: number; plan: OvertureBuildingSourcePlan } | null = null;

export async function resolveLatestOvertureBuildingSource(
  options: { fetchImpl?: typeof fetch; now?: () => number } = {}
): Promise<OvertureBuildingSourcePlan> {
  const now = options.now?.() ?? Date.now();
  if (!options.fetchImpl && cachedPlan && cachedPlan.expiresAt > now) return cachedPlan.plan;
  const fetchImpl = options.fetchImpl ?? fetch;
  const root = await fetchJson(fetchImpl, OVERTURE_STAC_ROOT);
  const release = typeof root.latest === "string" ? root.latest : "";
  if (!/^20\d{2}-\d{2}-\d{2}\.\d+$/.test(release))
    throw new Error("Overture STAC did not publish a valid latest release.");
  const themeUrl = `https://stac.overturemaps.org/${release}/buildings/catalog.json`;
  const collectionUrl = `https://stac.overturemaps.org/${release}/buildings/building/collection.json`;
  const [theme, collection] = await Promise.all([
    fetchJson(fetchImpl, themeUrl),
    fetchJson(fetchImpl, collectionUrl)
  ]);
  const links = Array.isArray(theme.links) ? theme.links : [];
  const pmtilesLink = links.find(
    (link) => isRecord(link) && link.rel === "pmtiles" && typeof link.href === "string"
  );
  const pmtilesUrl = isRecord(pmtilesLink) ? String(pmtilesLink.href) : "";
  const parsed = safeUrl(pmtilesUrl);
  if (
    !parsed ||
    parsed.protocol !== "https:" ||
    parsed.hostname !== "tiles.overturemaps.org" ||
    parsed.pathname !== `/${release}/buildings.pmtiles`
  ) {
    throw new Error("Overture STAC did not publish the expected official buildings PMTiles ref.");
  }
  const columns = collectionColumns(collection);
  const plan = {
    release,
    pmtilesUrl: parsed.toString(),
    collectionUrl,
    license: typeof collection.license === "string" ? collection.license : "review",
    columns
  };
  if (!options.fetchImpl) cachedPlan = { expiresAt: now + 60 * 60 * 1000, plan };
  return plan;
}

export async function queryOvertureBuildings(
  bbox: OvertureBuildingBbox,
  options: {
    fetchImpl?: typeof fetch;
    tileReaderFactory?: (url: string) => TileReader;
    maxFeatures?: number;
    includeParts?: boolean;
  } = {}
): Promise<OvertureBuildingQueryResult> {
  const maxFeatures = Math.min(Math.max(options.maxFeatures ?? 10_000, 1), 25_000);
  let plan: OvertureBuildingSourcePlan | null = null;
  try {
    plan = await resolveLatestOvertureBuildingSource({ fetchImpl: options.fetchImpl });
    const reader = options.tileReaderFactory?.(plan.pmtilesUrl) ?? new PMTiles(plan.pmtilesUrl);
    const tiles = tilesForBbox(bbox, TILE_ZOOM);
    if (tiles.length > 64)
      throw new Error("Building frame expands beyond the bounded tile budget.");
    const features = new Map<string, OvertureBuildingFeature>();
    let truncated = false;
    for (const tile of tiles) {
      const response = await reader.getZxy(TILE_ZOOM, tile.x, tile.y);
      if (!response) continue;
      const vectorTile = new VectorTile(new PbfReader(response.data));
      const sourceLayers = options.includeParts
        ? (["building", "building_part"] as const)
        : (["building"] as const);
      for (const sourceLayer of sourceLayers) {
        const layer = vectorTile.layers[sourceLayer];
        if (!layer) continue;
        for (let index = 0; index < layer.length; index += 1) {
          const geojson = layer.feature(index).toGeoJSON(tile.x, tile.y, TILE_ZOOM);
          if (!geojson.geometry || !("coordinates" in geojson.geometry)) continue;
          if (!geometryIntersectsBbox(geojson.geometry, bbox)) continue;
          const normalized = normalizeOvertureBuildingFeature(
            {
              id: geojson.id,
              geometry: geojson.geometry,
              properties: geojson.properties ?? {}
            },
            sourceLayer,
            plan.release
          );
          if (!normalized || features.has(normalized.id)) continue;
          if (features.size >= maxFeatures) {
            truncated = true;
            break;
          }
          features.set(normalized.id, normalized);
        }
        if (truncated) break;
      }
      if (truncated) break;
    }
    const output = [...features.values()];
    return {
      schemaVersion: "vmesh-overture-building-query-v1",
      status: truncated
        ? "query-succeeded-truncated"
        : output.length === 0
          ? "query-succeeded-empty"
          : "query-succeeded",
      runClass: options.fetchImpl || options.tileReaderFactory ? "configured" : "live-proof",
      release: plan.release,
      sourceId: "overture-maps-geoparquet",
      license: plan.license,
      attribution: "Overture Maps Foundation and source contributors",
      query: {
        zoom: TILE_ZOOM,
        tileCount: tiles.length,
        maxFeatures,
        includeParts: options.includeParts === true
      },
      featureCollection: { type: "FeatureCollection", features: output },
      warnings: [
        "Official Overture PMTiles are generalized delivery artifacts; use the release-matched GeoParquet recipe when full source geometry is required.",
        "Missing height, class, facade or roof attributes remain null and are never inferred by VMesh."
      ],
      error: null
    };
  } catch (error) {
    return {
      schemaVersion: "vmesh-overture-building-query-v1",
      status: "provider-failed",
      runClass: options.fetchImpl || options.tileReaderFactory ? "configured" : "live-proof",
      release: plan?.release ?? null,
      sourceId: "overture-maps-geoparquet",
      license: plan?.license ?? null,
      attribution: "Overture Maps Foundation and source contributors",
      query: {
        zoom: TILE_ZOOM,
        tileCount: 0,
        maxFeatures,
        includeParts: options.includeParts === true
      },
      featureCollection: { type: "FeatureCollection", features: [] },
      warnings: ["Provider failure is not a valid empty result; continue to a reviewed fallback."],
      error: error instanceof Error ? error.message : "Overture building query failed."
    };
  }
}

export function normalizeOvertureBuildingFeature(
  feature: {
    id?: string | number;
    geometry: { type: string; coordinates: unknown };
    properties: Record<string, unknown>;
  },
  sourceLayer: "building" | "building_part",
  release: string
): OvertureBuildingFeature | null {
  const sourceFeatureId = stringValue(feature.properties.id) ?? stringValue(feature.id);
  if (!sourceFeatureId || !["Polygon", "MultiPolygon"].includes(feature.geometry.type)) return null;
  return {
    type: "Feature",
    id: sourceFeatureId,
    geometry: feature.geometry,
    properties: {
      sourceId: "overture-maps-geoparquet",
      sourceFeatureId,
      sourceRelease: release,
      sourceLayer,
      class: stringValue(feature.properties.class),
      subtype: stringValue(feature.properties.subtype),
      heightMeters: numberValue(feature.properties.height),
      levels: numberValue(feature.properties.num_floors ?? feature.properties.level),
      minHeightMeters: numberValue(feature.properties.min_height),
      minFloor: numberValue(feature.properties.min_floor),
      facadeColor: stringValue(feature.properties.facade_color),
      facadeMaterial: stringValue(feature.properties.facade_material),
      roofColor: stringValue(feature.properties.roof_color),
      roofMaterial: stringValue(feature.properties.roof_material),
      roofShape: stringValue(feature.properties.roof_shape),
      roofHeightMeters: numberValue(feature.properties.roof_height),
      confidence: null,
      confidenceBasis: "not-published"
    }
  };
}

function tilesForBbox(bbox: OvertureBuildingBbox, zoom: number) {
  const longitudeRanges =
    bbox.west <= bbox.east
      ? [[bbox.west, bbox.east]]
      : [
          [bbox.west, 180],
          [-180, bbox.east]
        ];
  const tiles: Array<{ x: number; y: number }> = [];
  for (const [west, east] of longitudeRanges) {
    const minX = longitudeToTile(west, zoom);
    const maxX = longitudeToTile(Math.min(179.999999, east), zoom);
    const minY = latitudeToTile(bbox.north, zoom);
    const maxY = latitudeToTile(bbox.south, zoom);
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) tiles.push({ x, y });
    }
  }
  return tiles;
}

function longitudeToTile(longitude: number, zoom: number) {
  const size = 2 ** zoom;
  return Math.max(0, Math.min(size - 1, Math.floor(((longitude + 180) / 360) * size)));
}

function latitudeToTile(latitude: number, zoom: number) {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, latitude));
  const radians = (clamped * Math.PI) / 180;
  const size = 2 ** zoom;
  return Math.max(
    0,
    Math.min(size - 1, Math.floor(((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2) * size))
  );
}

function geometryIntersectsBbox(geometry: { coordinates: unknown }, bbox: OvertureBuildingBbox) {
  const bounds = coordinateBounds(geometry.coordinates);
  if (!bounds) return false;
  const longitudeIntersects =
    bbox.west <= bbox.east
      ? bounds.east >= bbox.west && bounds.west <= bbox.east
      : bounds.east >= bbox.west || bounds.west <= bbox.east;
  return longitudeIntersects && bounds.north >= bbox.south && bounds.south <= bbox.north;
}

function coordinateBounds(value: unknown) {
  const points: Array<[number, number]> = [];
  collectPoints(value, points);
  if (points.length === 0) return null;
  return {
    west: Math.min(...points.map(([longitude]) => longitude)),
    south: Math.min(...points.map(([, latitude]) => latitude)),
    east: Math.max(...points.map(([longitude]) => longitude)),
    north: Math.max(...points.map(([, latitude]) => latitude))
  };
}

function collectPoints(value: unknown, points: Array<[number, number]>) {
  if (!Array.isArray(value)) return;
  if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
    points.push([value[0], value[1]]);
    return;
  }
  for (const child of value) collectPoints(child, points);
}

async function fetchJson(fetchImpl: typeof fetch, url: string) {
  const response = await fetchImpl(url, {
    headers: { accept: "application/json", "user-agent": "VMesh source resolver" },
    redirect: "follow"
  });
  if (!response.ok) throw new Error(`Overture metadata failed with HTTP ${response.status}.`);
  const value = (await response.json()) as unknown;
  if (!isRecord(value)) throw new Error("Overture metadata response was not an object.");
  return value;
}

function collectionColumns(collection: Record<string, unknown>): string[] {
  if (!isRecord(collection.summaries)) return [];
  const columns = collection.summaries.columns;
  return Array.isArray(columns)
    ? columns.filter((value): value is string => typeof value === "string")
    : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

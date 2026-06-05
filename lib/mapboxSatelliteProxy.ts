export const MAPBOX_SATELLITE_PROXY_TILE_URL = "/api/mapbox/satellite/{z}/{x}/{y}";

export interface MapboxSatelliteTile {
  z: number;
  x: number;
  y: number;
}

export interface MapboxSatelliteTileParams {
  z: string;
  x: string;
  y: string;
}

const MAX_MAPBOX_SATELLITE_ZOOM = 22;

export function isMapboxPublicToken(value: string | undefined): value is string {
  return Boolean(value?.trim().startsWith("pk."));
}

function parseTileInteger(value: string, label: string): number {
  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid Mapbox satellite ${label} tile coordinate.`);
  }

  return Number(value);
}

export function normalizeMapboxSatelliteTile(
  params: MapboxSatelliteTileParams
): MapboxSatelliteTile {
  const z = parseTileInteger(params.z, "z");
  const x = parseTileInteger(params.x, "x");
  const y = parseTileInteger(params.y.replace(/\.(jpg|jpeg|png|webp)$/i, ""), "y");

  if (z < 0 || z > MAX_MAPBOX_SATELLITE_ZOOM) {
    throw new Error("Mapbox satellite zoom is outside the supported range.");
  }

  const maxCoordinate = 2 ** z;
  if (x < 0 || x >= maxCoordinate || y < 0 || y >= maxCoordinate) {
    throw new Error("Mapbox satellite tile coordinate is outside the zoom bounds.");
  }

  return { z, x, y };
}

export function createMapboxSatelliteUpstreamUrl(tile: MapboxSatelliteTile, token: string): string {
  const url = new URL(
    `https://api.mapbox.com/v4/mapbox.satellite/${tile.z}/${tile.x}/${tile.y}@2x.jpg90`
  );
  url.searchParams.set("access_token", token);
  return url.toString();
}

export function createMapboxSatellitePublicTileUrl(token: string): string {
  if (!isMapboxPublicToken(token)) {
    throw new Error("Mapbox public tile URLs require a restricted pk.* token.");
  }

  const params = new URLSearchParams({ access_token: token });
  return `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg90?${params}`;
}

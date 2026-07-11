export interface CopernicusDemBbox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface CopernicusDemTile {
  id: string;
  url: string;
  latitudeDegree: number;
  longitudeDegree: number;
}

const COPERNICUS_GLO30_BUCKET = "https://copernicus-dem-30m.s3.amazonaws.com";

export function copernicusDemTilesForBbox(bbox: CopernicusDemBbox): CopernicusDemTile[] {
  if (bbox.south < -90 || bbox.north > 90 || bbox.south >= bbox.north) return [];
  const latitudeDegrees = integerCells(bbox.south, bbox.north);
  const longitudeDegrees =
    bbox.west <= bbox.east
      ? integerCells(bbox.west, bbox.east)
      : [...integerCells(bbox.west, 180), ...integerCells(-180, bbox.east)];

  return latitudeDegrees.flatMap((latitudeDegree) =>
    longitudeDegrees.map((longitudeDegree) => {
      const latitudeId = coordinateId(latitudeDegree, "N", "S", 2);
      const longitudeId = coordinateId(longitudeDegree, "E", "W", 3);
      const id = `Copernicus_DSM_COG_10_${latitudeId}_00_${longitudeId}_00_DEM`;
      return {
        id,
        url: `${COPERNICUS_GLO30_BUCKET}/${id}/${id}.tif`,
        latitudeDegree,
        longitudeDegree
      };
    })
  );
}

export async function verifyCopernicusDemTiles(
  tiles: CopernicusDemTile[],
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}
): Promise<{ available: CopernicusDemTile[]; missing: CopernicusDemTile[] }> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const results = await Promise.all(
    tiles.map(async (tile) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);
      try {
        const response = await fetchImpl(tile.url, {
          method: "HEAD",
          signal: controller.signal,
          redirect: "follow"
        });
        return { tile, available: response.ok };
      } catch {
        return { tile, available: false };
      } finally {
        clearTimeout(timer);
      }
    })
  );
  return {
    available: results.filter((result) => result.available).map((result) => result.tile),
    missing: results.filter((result) => !result.available).map((result) => result.tile)
  };
}

function integerCells(minimum: number, maximum: number): number[] {
  const first = Math.floor(minimum);
  const last = Math.ceil(maximum) - 1;
  return Array.from({ length: Math.max(0, last - first + 1) }, (_value, index) => first + index);
}

function coordinateId(value: number, positive: string, negative: string, width: number) {
  const hemisphere = value >= 0 ? positive : negative;
  return `${hemisphere}${Math.abs(value).toString().padStart(width, "0")}`;
}

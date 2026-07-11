export interface WorldCoverBbox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface WorldCoverTile {
  id: string;
  url: string;
  latitudeDegree: number;
  longitudeDegree: number;
}

export const WORLD_COVER_VERSION = "2021-v200";
export const WORLD_COVER_RESOLUTION_METERS = 10;
export const WORLD_COVER_LEGEND: Record<number, string> = {
  10: "tree-cover",
  20: "shrubland",
  30: "grassland",
  40: "cropland",
  50: "built-up",
  60: "bare-or-sparse-vegetation",
  70: "snow-and-ice",
  80: "permanent-water-bodies",
  90: "herbaceous-wetland",
  95: "mangroves",
  100: "moss-and-lichen"
};

export interface WorldCoverClassContext {
  code: number | null;
  label: string;
  contextId:
    | "vegetated-landcover"
    | "built-landcover"
    | "bare-landcover"
    | "snow-ice-landcover"
    | "water-landcover"
    | "no-data";
  confidence: "classified-global-context" | "no-data";
  limitations: string[];
}

const WORLD_COVER_BUCKET = "https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map";

export function worldCoverTilesForBbox(bbox: WorldCoverBbox): WorldCoverTile[] {
  if (bbox.south < -60 || bbox.north > 84 || bbox.south >= bbox.north) return [];
  const latitudes = gridCells(bbox.south, bbox.north, 3);
  const longitudes =
    bbox.west <= bbox.east
      ? gridCells(bbox.west, bbox.east, 3)
      : [...gridCells(bbox.west, 180, 3), ...gridCells(-180, bbox.east, 3)];
  return latitudes.flatMap((latitudeDegree) =>
    longitudes.map((longitudeDegree) => {
      const coordinateId = `${coordinate(latitudeDegree, "N", "S", 2)}${coordinate(longitudeDegree, "E", "W", 3)}`;
      const id = `ESA_WorldCover_10m_2021_v200_${coordinateId}_Map`;
      return {
        id,
        url: `${WORLD_COVER_BUCKET}/${id}.tif`,
        latitudeDegree,
        longitudeDegree
      };
    })
  );
}

export async function verifyWorldCoverTiles(
  tiles: WorldCoverTile[],
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}
): Promise<{ available: WorldCoverTile[]; missing: WorldCoverTile[] }> {
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

export function worldCoverClassContext(code: number | null | undefined): WorldCoverClassContext {
  const label = code == null ? undefined : WORLD_COVER_LEGEND[code];
  if (!label) {
    return {
      code: code ?? null,
      label: "no-data",
      contextId: "no-data",
      confidence: "no-data",
      limitations: [
        "No published WorldCover class was available for this pixel; this is not species or habitat evidence."
      ]
    };
  }
  const contextId =
    code === 50
      ? "built-landcover"
      : code === 60
        ? "bare-landcover"
        : code === 70
          ? "snow-ice-landcover"
          : code === 80
            ? "water-landcover"
            : "vegetated-landcover";
  return {
    code: code as number,
    label,
    contextId,
    confidence: "classified-global-context",
    limitations: [
      "Classified landcover can select a visual context only; it is not species, habitat survey, soil, or legal truth."
    ]
  };
}

function gridCells(minimum: number, maximum: number, size: number) {
  const first = Math.floor(minimum / size) * size;
  const last = Math.ceil(maximum / size) * size - size;
  return Array.from(
    { length: Math.max(0, Math.round((last - first) / size) + 1) },
    (_value, index) => first + index * size
  );
}

function coordinate(value: number, positive: string, negative: string, width: number) {
  return `${value >= 0 ? positive : negative}${Math.abs(value).toString().padStart(width, "0")}`;
}

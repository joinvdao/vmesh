export interface Usgs3depProductsBbox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface Usgs3depProductAsset {
  id: string;
  title: string;
  url: string;
}

export function createUsgs3depProductsQueryUrl(bbox: Usgs3depProductsBbox): string {
  const url = new URL("https://tnmaccess.nationalmap.gov/api/v1/products");
  url.searchParams.set("bbox", [bbox.west, bbox.south, bbox.east, bbox.north].join(","));
  url.searchParams.set("datasets", "Digital Elevation Model (DEM) 1 meter");
  url.searchParams.set("prodFormats", "GeoTIFF");
  url.searchParams.set("max", "100");
  return url.toString();
}

export function selectUsgs3depProductAssets(value: unknown): Usgs3depProductAsset[] {
  if (!isRecord(value) || !Array.isArray(value.items)) return [];
  return value.items
    .flatMap((item, index) => {
      if (!isRecord(item)) return [];
      const parsed = safeUrl(typeof item.downloadURL === "string" ? item.downloadURL : "");
      if (
        !parsed ||
        parsed.protocol !== "https:" ||
        parsed.hostname !== "prd-tnm.s3.amazonaws.com" ||
        !/\.tiff?$/i.test(parsed.pathname) ||
        parsed.search
      ) {
        return [];
      }
      return [
        {
          id: String(item.sourceId ?? item.metaUrl ?? `usgs-3dep-product-${index}`),
          title: typeof item.title === "string" ? item.title : "USGS 3DEP 1 m GeoTIFF",
          url: parsed.toString()
        }
      ];
    })
    .filter(
      (asset, index, assets) => assets.findIndex((other) => other.url === asset.url) === index
    );
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

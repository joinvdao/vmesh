import {
  drawLandMasses,
  drawSoftBlob,
  EARTH_TEXTURE_HEIGHT,
  EARTH_TEXTURE_WIDTH
} from "@/components/Map/earthTextureDrawing";
import type { GlobeTheme } from "@/lib/vmeshTypes";

export type EarthTextureMode =
  | "blue-marble"
  | "natural-earth"
  | "mapbox-satellite"
  | "sentinel-package"
  | "offline-fallback";

export type EarthTextureKind =
  | "bundled-raster"
  | "procedural"
  | "external-raster"
  | "package-raster";

export type EarthTextureStatus = "available" | "disabled" | "future-package";

export interface EarthTextureSourceConfig {
  id: EarthTextureMode;
  label: string;
  kind: EarthTextureKind;
  status: EarthTextureStatus;
  attribution: string;
  license: string;
  sourceUrl?: string;
  requiresToken: boolean;
  notes: string;
}

export interface EarthTextureSourceOptions {
  mapboxTokenAvailable?: boolean;
  sentinelPackageAvailable?: boolean;
}

export const BLUE_MARBLE_TEXTURE_PATH = "/textures/earth/blue-marble-2048.jpg";
export const BLUE_MARBLE_TEXTURE_SOURCE_URL =
  "https://svs.gsfc.nasa.gov/vis/a000000/a003600/a003615/flat_earth03.jpg";

export function getEarthTextureSources({
  mapboxTokenAvailable = false,
  sentinelPackageAvailable = false
}: EarthTextureSourceOptions = {}): EarthTextureSourceConfig[] {
  return [
    {
      id: "blue-marble",
      label: "NASA Blue Marble globe texture",
      kind: "bundled-raster",
      status: "available",
      sourceUrl: BLUE_MARBLE_TEXTURE_SOURCE_URL,
      attribution:
        "NASA SVS Blue Marble Next Generation, courtesy Reto Stockli (NASA/GSFC) and NASA Earth Observatory",
      license: "NASA media usage guidelines; acknowledge NASA and do not imply endorsement",
      requiresToken: false,
      notes:
        "Default far-zoom visual texture for the cinematic globe, bundled locally for token-free rendering."
    },
    {
      id: "natural-earth",
      label: "Natural Earth style procedural globe",
      kind: "procedural",
      status: "available",
      attribution: "Procedural vmesh texture inspired by Natural Earth-style land/ocean contrast",
      license: "MIT-generated procedural texture",
      requiresToken: false,
      notes: "Open-asset-ready slot for future packaged low-zoom Earth rasters."
    },
    {
      id: "mapbox-satellite",
      label: "Mapbox satellite globe texture",
      kind: "external-raster",
      status: mapboxTokenAvailable ? "available" : "disabled",
      attribution: "Mapbox and upstream satellite imagery providers",
      license: "Requires reviewed Mapbox terms and configured token/proxy",
      requiresToken: true,
      notes: "Optional deployment texture only. It must never be the public open-source default."
    },
    {
      id: "sentinel-package",
      label: "Sentinel/SEN2SR local package",
      kind: "package-raster",
      status: sentinelPackageAvailable ? "available" : "future-package",
      attribution: "Sentinel-2 / Copernicus, processed by local vmesh imagery package",
      license: "Copernicus/Sentinel terms plus package manifest attribution",
      requiresToken: false,
      notes: "Future AOI texture path for processed local packages, not a live browser pipeline."
    },
    {
      id: "offline-fallback",
      label: "Offline procedural fallback",
      kind: "procedural",
      status: "available",
      attribution: "Procedural vmesh fallback",
      license: "MIT-generated procedural texture",
      requiresToken: false,
      notes: "Keeps the globe nonblank when remote map or imagery tiles are unavailable."
    }
  ];
}

export function selectEarthTextureSource(
  sources: EarthTextureSourceConfig[],
  preferredId: EarthTextureMode = "blue-marble"
): EarthTextureSourceConfig {
  return (
    sources.find((source) => source.id === preferredId && source.status === "available") ??
    sources.find((source) => source.id === "blue-marble" && source.status === "available") ??
    sources.find((source) => source.status === "available") ??
    sources[0]
  );
}

function createCanvas(
  width = EARTH_TEXTURE_WIDTH,
  height = EARTH_TEXTURE_HEIGHT
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function createProceduralEarthCanvas(theme: GlobeTheme): HTMLCanvasElement {
  const canvas = createCanvas();
  const context = canvas.getContext("2d");
  if (!context) return canvas;

  const oceanGradient = context.createLinearGradient(
    0,
    0,
    EARTH_TEXTURE_WIDTH,
    EARTH_TEXTURE_HEIGHT
  );
  if (theme === "dark") {
    oceanGradient.addColorStop(0, "#0e4964");
    oceanGradient.addColorStop(0.34, "#126d8f");
    oceanGradient.addColorStop(0.68, "#0a3b58");
    oceanGradient.addColorStop(1, "#061526");
  } else {
    oceanGradient.addColorStop(0, "#8dd4dc");
    oceanGradient.addColorStop(0.34, "#5eb5ca");
    oceanGradient.addColorStop(0.72, "#2f7f9f");
    oceanGradient.addColorStop(1, "#164466");
  }
  context.fillStyle = oceanGradient;
  context.fillRect(0, 0, EARTH_TEXTURE_WIDTH, EARTH_TEXTURE_HEIGHT);

  drawSoftBlob(context, -30, 40, 260, "rgba(178,235,231,0.42)", theme === "dark" ? 0.18 : 0.3);
  drawSoftBlob(context, 120, -12, 230, "rgba(17,92,117,0.42)", theme === "dark" ? 0.24 : 0.16);
  drawSoftBlob(context, -135, -25, 210, "rgba(58,176,174,0.34)", 0.2);
  drawLandMasses(context, theme);

  context.save();
  context.globalAlpha = theme === "dark" ? 0.16 : 0.2;
  context.fillStyle = "#ffffff";
  for (let latitude = -70; latitude <= 70; latitude += 20) {
    context.fillRect(0, ((90 - latitude) / 180) * EARTH_TEXTURE_HEIGHT, EARTH_TEXTURE_WIDTH, 1);
  }
  for (let longitude = -180; longitude <= 180; longitude += 30) {
    context.fillRect(((longitude + 180) / 360) * EARTH_TEXTURE_WIDTH, 0, 1, EARTH_TEXTURE_HEIGHT);
  }
  context.restore();

  return canvas;
}

export function createProceduralBumpCanvas(theme: GlobeTheme): HTMLCanvasElement {
  const canvas = createCanvas(1024, 512);
  const context = canvas.getContext("2d");
  if (!context) return canvas;

  context.fillStyle = theme === "dark" ? "#5f6468" : "#7a7f82";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.scale(canvas.width / EARTH_TEXTURE_WIDTH, canvas.height / EARTH_TEXTURE_HEIGHT);
  drawLandMasses(context, "light");
  context.globalAlpha = 0.2;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, EARTH_TEXTURE_WIDTH, 24);
  context.fillRect(0, EARTH_TEXTURE_HEIGHT - 32, EARTH_TEXTURE_WIDTH, 32);
  context.restore();

  return canvas;
}

export function createProceduralCloudCanvas(theme: GlobeTheme): HTMLCanvasElement {
  const canvas = createCanvas();
  const context = canvas.getContext("2d");
  if (!context) return canvas;

  context.clearRect(0, 0, EARTH_TEXTURE_WIDTH, EARTH_TEXTURE_HEIGHT);
  const cloudColor = theme === "dark" ? "rgba(255,255,255,0.76)" : "rgba(255,255,255,0.62)";
  const cloudBands: Array<[number, number, number, number]> = [
    [-150, 38, 145, 0.24],
    [-88, -6, 110, 0.18],
    [-28, 55, 130, 0.22],
    [24, 4, 170, 0.2],
    [72, -28, 140, 0.16],
    [126, 26, 150, 0.18],
    [160, -44, 105, 0.16],
    [-8, -52, 165, 0.14]
  ];

  for (const [longitude, latitude, radius, opacity] of cloudBands) {
    drawSoftBlob(context, longitude, latitude, radius, cloudColor, opacity);
    drawSoftBlob(context, longitude + 20, latitude + 5, radius * 0.7, cloudColor, opacity * 0.82);
  }

  return canvas;
}

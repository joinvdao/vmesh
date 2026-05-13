export type GlobeViewerMode = "orbit-globe" | "oss-map-output";

export const OSS_MAP_OUTPUT_ZOOM = 5.6;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getGlobeViewerMode(zoom: number): GlobeViewerMode {
  return zoom >= OSS_MAP_OUTPUT_ZOOM ? "oss-map-output" : "orbit-globe";
}

export function getMapCanvasOpacity(zoom: number): number {
  return clamp(0.24 + Math.max(0, zoom - 2.3) * 0.18, 0.24, 1);
}

export function getOssRasterOpacity(zoom: number): number {
  return clamp(0.28 + Math.max(0, zoom - 4) * 0.14, 0.28, 0.95);
}

export function getViewerZoomPercent(zoom: number): number {
  return Math.round(clamp((zoom / 14) * 100, 0, 100));
}

export function getApproxAltitudeKm(zoom: number): number {
  return Math.round(clamp(20000 / 2 ** Math.max(0, zoom - 1), 1, 20000));
}

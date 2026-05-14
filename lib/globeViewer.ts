export type GlobeViewerMode = "orbit-globe" | "oss-map-output";

export const OSS_MAP_OUTPUT_ZOOM = 13.25;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getGlobeViewerMode(zoom: number): GlobeViewerMode {
  return zoom >= OSS_MAP_OUTPUT_ZOOM ? "oss-map-output" : "orbit-globe";
}

export function getMapCanvasOpacity(zoom: number): number {
  if (zoom < 8) return 0.04;
  if (zoom < OSS_MAP_OUTPUT_ZOOM) {
    const progress = (zoom - 8) / (OSS_MAP_OUTPUT_ZOOM - 8);
    return clamp(0.04 + progress * 0.34, 0.04, 0.38);
  }
  return clamp(0.84 + Math.max(0, zoom - OSS_MAP_OUTPUT_ZOOM) * 0.05, 0.84, 1);
}

export function getOssRasterOpacity(zoom: number): number {
  return clamp(0.76 + Math.max(0, zoom - 4) * 0.04, 0.76, 0.96);
}

export function getViewerZoomPercent(zoom: number): number {
  return Math.round(clamp((zoom / 14) * 100, 0, 100));
}

export function getApproxAltitudeKm(zoom: number): number {
  return Math.round(clamp(20000 / 2 ** Math.max(0, zoom - 1), 1, 20000));
}

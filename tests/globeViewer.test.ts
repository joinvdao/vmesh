import { describe, expect, it } from "vitest";

import {
  getApproxAltitudeKm,
  getGlobeViewerMode,
  getMapCanvasOpacity,
  getOssRasterOpacity,
  getViewerZoomPercent,
  OSS_MAP_OUTPUT_ZOOM
} from "@/lib/globeViewer";

describe("globe viewer mode helpers", () => {
  it("keeps the cinematic globe at global zoom and switches to OSS map output when close", () => {
    expect(getGlobeViewerMode(OSS_MAP_OUTPUT_ZOOM - 0.1)).toBe("orbit-globe");
    expect(getGlobeViewerMode(OSS_MAP_OUTPUT_ZOOM)).toBe("oss-map-output");
  });

  it("increases map visibility as the user flies closer", () => {
    expect(getMapCanvasOpacity(2.3)).toBeLessThan(0.1);
    expect(getMapCanvasOpacity(2.3)).toBeLessThan(getMapCanvasOpacity(10));
    expect(getMapCanvasOpacity(OSS_MAP_OUTPUT_ZOOM)).toBeGreaterThan(0.8);
    expect(getOssRasterOpacity(4)).toBeLessThan(getOssRasterOpacity(12));
  });

  it("derives stable HUD values from zoom", () => {
    expect(getViewerZoomPercent(7)).toBe(50);
    expect(getApproxAltitudeKm(2)).toBeGreaterThan(getApproxAltitudeKm(8));
  });
});

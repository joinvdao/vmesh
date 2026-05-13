import type { MutableRefObject } from "react";
import type maplibregl from "maplibre-gl";

import { setSourceBackedMapBackground } from "@/components/Map/sourceBackedMapOutput";
import { getGlobeViewerMode, getMapCanvasOpacity, getOssRasterOpacity } from "@/lib/globeViewer";
import type { GlobeViewerMode } from "@/lib/globeViewer";

interface ProjectionCapableMap extends maplibregl.Map {
  setProjection?: (projection: { type: "globe" } | { type: "mercator" }) => void;
}

export function createGlobeVisualRuntime({
  map,
  getShell,
  viewerModeRef,
  cameraZoomRef,
  setViewerMode,
  setCameraZoom
}: {
  map: maplibregl.Map;
  getShell: () => HTMLDivElement | null;
  viewerModeRef: MutableRefObject<GlobeViewerMode>;
  cameraZoomRef: MutableRefObject<number>;
  setViewerMode: (mode: GlobeViewerMode) => void;
  setCameraZoom: (zoom: number) => void;
}) {
  const sync = () => {
    const shell = getShell();
    if (!shell) return;

    const center = map.getCenter();
    const zoom = map.getZoom();
    const nextViewerMode = getGlobeViewerMode(zoom);

    if (viewerModeRef.current !== nextViewerMode) {
      viewerModeRef.current = nextViewerMode;
      setViewerMode(nextViewerMode);
      try {
        (map as ProjectionCapableMap).setProjection?.({
          type: nextViewerMode === "oss-map-output" ? "mercator" : "globe"
        });
        setSourceBackedMapBackground(map, nextViewerMode === "oss-map-output");
      } catch {
        // Older renderers can ignore projection changes; the shell still exposes the mode.
      }
    }

    if (Math.abs(cameraZoomRef.current - zoom) > 0.08) {
      cameraZoomRef.current = zoom;
      setCameraZoom(zoom);
    }

    shell.style.setProperty("--vmesh-camera-x", `${(center.lng * -1.25).toFixed(2)}px`);
    shell.style.setProperty("--vmesh-camera-y", `${(center.lat * 0.7).toFixed(2)}px`);
    shell.style.setProperty("--vmesh-map-opacity", getMapCanvasOpacity(zoom).toFixed(2));

    try {
      if (map.getLayer("osm-raster")) {
        map.setPaintProperty("osm-raster", "raster-opacity", getOssRasterOpacity(zoom));
      }
    } catch {
      // Style transitions can briefly make layers unavailable during renderer setup.
    }
  };

  return { sync };
}

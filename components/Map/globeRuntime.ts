import { cellToLatLng } from "h3-js";
import type maplibregl from "maplibre-gl";

import { useVmeshStore } from "@/store/useVmeshStore";

export interface SelectedMarkerPosition {
  x: number;
  y: number;
}

export interface GlobeRuntime {
  syncSelectedMarker: () => void;
  queueAutoSpin: () => void;
  pauseAutoSpin: () => void;
  clearAutoSpin: () => void;
}

export function createGlobeRuntime({
  map,
  getCancelled,
  setSelectedMarkerPosition
}: {
  map: maplibregl.Map;
  getCancelled: () => boolean;
  setSelectedMarkerPosition: (position: SelectedMarkerPosition | null) => void;
}): GlobeRuntime {
  let autoSpinTimer: number | undefined;
  let userInteractingWithMap = false;

  const syncSelectedMarker = () => {
    if (getCancelled()) return;

    const details = useVmeshStore.getState().selectedHexDetails;
    if (!details?.h3Id) {
      setSelectedMarkerPosition(null);
      return;
    }

    try {
      const [latitude, longitude] = cellToLatLng(details.h3Id);
      const point = map.project([longitude, latitude]);
      const canvas = map.getCanvas();
      const isVisible =
        point.x >= -28 &&
        point.y >= -28 &&
        point.x <= canvas.clientWidth + 28 &&
        point.y <= canvas.clientHeight + 28;

      setSelectedMarkerPosition(isVisible ? { x: point.x, y: point.y } : null);
    } catch {
      setSelectedMarkerPosition(null);
    }
  };

  const clearAutoSpin = () => {
    if (autoSpinTimer !== undefined) {
      window.clearTimeout(autoSpinTimer);
      autoSpinTimer = undefined;
    }
  };

  const shouldAutoSpin = () => {
    const state = useVmeshStore.getState();
    return state.activePanel === null && map.getZoom() <= 3.35 && !state.activeLayers.macro;
  };

  const queueAutoSpin = () => {
    userInteractingWithMap = false;
    clearAutoSpin();
    if (!shouldAutoSpin()) return;

    autoSpinTimer = window.setTimeout(() => {
      if (getCancelled() || userInteractingWithMap || map.isMoving() || !shouldAutoSpin()) {
        return;
      }

      const center = map.getCenter();
      map.easeTo({
        center: [center.lng + 24, center.lat],
        duration: 22000,
        easing: (time) => time,
        essential: false
      });
    }, 1100);
  };

  const pauseAutoSpin = () => {
    userInteractingWithMap = true;
    clearAutoSpin();
  };

  return {
    syncSelectedMarker,
    queueAutoSpin,
    pauseAutoSpin,
    clearAutoSpin
  };
}

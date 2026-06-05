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

  const queueAutoSpin = () => {
    // The cinematic orbit is owned by ThreeEarthGlobe. MapLibre stays stable so
    // the source-backed map, selected marker, and deck.gl layers do not appear
    // to slide independently beneath the globe.
    clearAutoSpin();
  };

  const pauseAutoSpin = () => {
    clearAutoSpin();
  };

  return {
    syncSelectedMarker,
    queueAutoSpin,
    pauseAutoSpin,
    clearAutoSpin
  };
}

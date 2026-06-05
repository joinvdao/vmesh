import { cellToLatLng } from "h3-js";
import type maplibregl from "maplibre-gl";

import type { MapFlyToRequest, ViewState, VmeshHexRecord } from "@/lib/vmeshTypes";

export function flyToSelectedHex({
  map,
  selectedHexDetails,
  isCurrentMap
}: {
  map: maplibregl.Map;
  selectedHexDetails: VmeshHexRecord;
  isCurrentMap: () => boolean;
}) {
  const [latitude, longitude] = cellToLatLng(selectedHexDetails.h3Id);
  const zoom =
    selectedHexDetails.tier === "U8" ? 11.2 : selectedHexDetails.tier === "U5" ? 7.2 : 3.1;
  map.stop();
  if (!isCurrentMap()) return;
  map.flyTo({
    center: [longitude, latitude],
    zoom,
    pitch: selectedHexDetails.tier === "U3" ? 28 : 44,
    bearing: -16,
    duration: selectedHexDetails.tier === "U3" ? 1400 : 2100,
    essential: true
  });
}

export function flyToSearchRequest({
  map,
  flyToRequest,
  isCurrentMap,
  setViewState
}: {
  map: maplibregl.Map;
  flyToRequest: MapFlyToRequest;
  isCurrentMap: () => boolean;
  setViewState: (viewState: Partial<ViewState>) => void;
}) {
  map.stop();
  if (!isCurrentMap()) return;
  const camera = {
    center: [flyToRequest.longitude, flyToRequest.latitude] as [number, number],
    zoom: flyToRequest.zoom,
    pitch: 46,
    bearing: -18
  };
  const zoomDelta = Math.abs(map.getZoom() - flyToRequest.zoom);
  map.flyTo({
    ...camera,
    duration: Math.round(Math.min(2800, Math.max(1700, 1250 + zoomDelta * 180))),
    essential: true
  });
  setViewState({
    longitude: flyToRequest.longitude,
    latitude: flyToRequest.latitude,
    zoom: flyToRequest.zoom,
    pitch: 46,
    bearing: -18
  });
}

export function returnToOrbitGlobe({
  map,
  initialViewState
}: {
  map: maplibregl.Map;
  initialViewState: ViewState;
}) {
  const camera = {
    center: [initialViewState.longitude, initialViewState.latitude] as [number, number],
    zoom: Math.min(initialViewState.zoom, 2.6),
    pitch: initialViewState.pitch,
    bearing: initialViewState.bearing
  };
  map.stop();
  map.jumpTo(camera);
}

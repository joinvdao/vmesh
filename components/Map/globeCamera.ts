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
  const zoom = selectedHexDetails.tier === "U8" ? 9 : selectedHexDetails.tier === "U5" ? 5.2 : 2.8;
  map.stop();
  if (!isCurrentMap()) return;
  map.jumpTo({
    center: [longitude, latitude],
    zoom,
    pitch: 38,
    bearing: -16
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
  map.jumpTo({
    center: [flyToRequest.longitude, flyToRequest.latitude],
    zoom: flyToRequest.zoom,
    pitch: 42,
    bearing: -18
  });
  setViewState({
    longitude: flyToRequest.longitude,
    latitude: flyToRequest.latitude,
    zoom: flyToRequest.zoom,
    pitch: 42,
    bearing: -18
  });
}

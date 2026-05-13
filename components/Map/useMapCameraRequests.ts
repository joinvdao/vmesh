"use client";

import { useEffect, useRef } from "react";
import type { MutableRefObject, RefObject } from "react";
import type maplibregl from "maplibre-gl";

import { flyToSearchRequest } from "@/components/Map/globeCamera";
import type { MapFlyToRequest, ViewState, VmeshHexRecord } from "@/lib/vmeshTypes";

export function useMapCameraRequests({
  mapRef,
  flyToRequest,
  selectedHexDetails,
  viewState,
  setViewState,
  searchSelectedHexRef,
  rendererReady
}: {
  mapRef: RefObject<maplibregl.Map | null>;
  flyToRequest: MapFlyToRequest | null;
  selectedHexDetails: VmeshHexRecord;
  viewState: ViewState;
  setViewState: (viewState: Partial<ViewState>) => void;
  searchSelectedHexRef: MutableRefObject<string | null>;
  rendererReady: boolean;
}) {
  const processedFlyToRequestIdRef = useRef<number | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !rendererReady) return;

    const targetRequest =
      flyToRequest ??
      ({
        id: 0,
        longitude: viewState.longitude,
        latitude: viewState.latitude,
        zoom: viewState.zoom,
        label: selectedHexDetails.placeName
      } satisfies MapFlyToRequest);
    const center = map.getCenter();
    const needsCameraSync =
      Math.abs(center.lng - targetRequest.longitude) > 0.01 ||
      Math.abs(center.lat - targetRequest.latitude) > 0.01 ||
      Math.abs(map.getZoom() - targetRequest.zoom) > 0.08;
    if (!needsCameraSync) return;

    const flyToRequestId = flyToRequest?.id ?? null;
    if (flyToRequestId !== null && processedFlyToRequestIdRef.current === flyToRequestId) return;

    processedFlyToRequestIdRef.current = flyToRequestId;
    searchSelectedHexRef.current = selectedHexDetails.h3Id;
    flyToSearchRequest({
      map,
      flyToRequest: targetRequest,
      setViewState,
      isCurrentMap: () => mapRef.current === map
    });
  }, [
    flyToRequest,
    mapRef,
    rendererReady,
    searchSelectedHexRef,
    selectedHexDetails,
    setViewState,
    viewState
  ]);
}

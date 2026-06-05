"use client";

import { useEffect } from "react";
import type { MutableRefObject, RefObject } from "react";
import type maplibregl from "maplibre-gl";

import { flyToSelectedHex } from "@/components/Map/globeCamera";
import type { VmeshHexRecord } from "@/lib/vmeshTypes";

export function useSelectedHexFlyTo({
  mapRef,
  selectedHexDetails,
  previousSelectedHexRef,
  searchSelectedHexRef
}: {
  mapRef: RefObject<maplibregl.Map | null>;
  selectedHexDetails: VmeshHexRecord;
  previousSelectedHexRef: MutableRefObject<string>;
  searchSelectedHexRef: MutableRefObject<string | null>;
}) {
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedHexDetails?.h3Id) return;
    if (previousSelectedHexRef.current === selectedHexDetails.h3Id) return;

    previousSelectedHexRef.current = selectedHexDetails.h3Id;
    if (searchSelectedHexRef.current === selectedHexDetails.h3Id) {
      searchSelectedHexRef.current = null;
      return;
    }

    flyToSelectedHex({
      map,
      selectedHexDetails,
      isCurrentMap: () => mapRef.current === map
    });
  }, [mapRef, previousSelectedHexRef, searchSelectedHexRef, selectedHexDetails]);
}

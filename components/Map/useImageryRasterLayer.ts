"use client";

import { useEffect } from "react";
import type { RefObject } from "react";
import type maplibregl from "maplibre-gl";

import {
  refreshOsmReferenceOverlay,
  removeOsmReferenceOverlay
} from "@/components/Map/sourceBackedMapOutput";
import { selectImageryProvider, toImageryRasterSource } from "@/lib/imagerySources";
import type { ImageryProviderConfig, TerrainProviderStatus } from "@/lib/vmeshTypes";

const IMAGERY_SOURCE_ID = "vmesh-imagery-source";
const IMAGERY_LAYER_ID = "vmesh-imagery-layer";

export interface ImageryRasterLayerOptions {
  mapRef: RefObject<maplibregl.Map | null>;
  active: boolean;
  imageryOpacity: number;
  imageryProviders: ImageryProviderConfig[];
  selectedImageryProviderId: string;
  setActiveImageryProvider: (providerId: string, message?: string) => void;
  setImageryStatus: (status: TerrainProviderStatus, message?: string) => void;
}

export function useImageryRasterLayer({
  mapRef,
  active,
  imageryOpacity,
  imageryProviders,
  selectedImageryProviderId,
  setActiveImageryProvider,
  setImageryStatus
}: ImageryRasterLayerOptions) {
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const removeImageryLayer = () => {
      removeOsmReferenceOverlay(map);
      if (map.getLayer(IMAGERY_LAYER_ID)) map.removeLayer(IMAGERY_LAYER_ID);
      if (map.getSource(IMAGERY_SOURCE_ID)) map.removeSource(IMAGERY_SOURCE_ID);
    };

    if (!active) {
      removeImageryLayer();
      setImageryStatus("idle", "Imagery layer disabled");
      return;
    }

    const imageryProvider = selectImageryProvider(imageryProviders, selectedImageryProviderId);
    const rasterSource = toImageryRasterSource(imageryProvider);
    if (!rasterSource) {
      removeImageryLayer();
      setImageryStatus(
        imageryProvider.status === "requires-api-key" ? "unavailable" : "fallback",
        `${imageryProvider.label} is not map-ready in this environment`
      );
      return;
    }

    const applyImageryLayer = (): boolean => {
      try {
        removeImageryLayer();
        map.addSource(IMAGERY_SOURCE_ID, rasterSource);
        map.addLayer({
          id: IMAGERY_LAYER_ID,
          type: "raster",
          source: IMAGERY_SOURCE_ID,
          paint: {
            "raster-opacity": imageryOpacity,
            "raster-saturation": -0.12,
            "raster-contrast": 0.08
          }
        });
        refreshOsmReferenceOverlay(map);
        setActiveImageryProvider(
          imageryProvider.id,
          `${imageryProvider.label} imagery layer active`
        );
        setImageryStatus("active", `${imageryProvider.label} imagery layer active`);
        return true;
      } catch {
        return false;
      }
    };

    if (map.isStyleLoaded() || map.getStyle().layers.length > 0) {
      if (applyImageryLayer()) {
        return;
      }
      setImageryStatus("loading", `Waiting for map style before ${imageryProvider.label}`);
    } else {
      setImageryStatus("loading", `Waiting for map style before ${imageryProvider.label}`);
    }

    const applyWhenReady = () => {
      if (applyImageryLayer()) {
        map.off("styledata", applyWhenReady);
      }
    };

    map.on("styledata", applyWhenReady);
    map.once("style.load", applyWhenReady);

    const retryTimer = window.setTimeout(() => {
      applyWhenReady();
    }, 350);

    if (map.isStyleLoaded() && applyImageryLayer()) {
      window.clearTimeout(retryTimer);
      map.off("styledata", applyWhenReady);
      return;
    }

    return () => {
      window.clearTimeout(retryTimer);
      map.off("styledata", applyWhenReady);
      map.off("style.load", applyWhenReady);
    };
  }, [
    active,
    imageryOpacity,
    imageryProviders,
    mapRef,
    selectedImageryProviderId,
    setActiveImageryProvider,
    setImageryStatus
  ]);
}

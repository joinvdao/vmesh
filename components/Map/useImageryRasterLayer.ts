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

export const IMAGERY_SOURCE_ID = "vmesh-imagery-source";
export const IMAGERY_LAYER_ID = "vmesh-imagery-layer";

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

    const requestedImageryProvider = selectImageryProvider(
      imageryProviders,
      selectedImageryProviderId
    );
    let imageryProvider = requestedImageryProvider;
    let rasterSource = toImageryRasterSource(imageryProvider);
    let fallbackReason: string | null = null;

    if (!rasterSource) {
      const fallbackProvider = imageryProviders.find((provider) => {
        return provider.id !== requestedImageryProvider.id && toImageryRasterSource(provider);
      });

      if (fallbackProvider) {
        imageryProvider = fallbackProvider;
        rasterSource = toImageryRasterSource(fallbackProvider);
        fallbackReason = `${requestedImageryProvider.label} is not map-ready in this environment`;
      }
    }

    if (!rasterSource) {
      removeImageryLayer();
      setImageryStatus(
        requestedImageryProvider.status === "requires-api-key" ? "unavailable" : "fallback",
        `${requestedImageryProvider.label} is not map-ready in this environment`
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
        const message = fallbackReason
          ? `${imageryProvider.label} imagery fallback after ${fallbackReason}`
          : imageryProvider.status === "fallback"
            ? `${imageryProvider.label} imagery fallback active`
            : `${imageryProvider.label} imagery layer active`;
        const status =
          fallbackReason || imageryProvider.status === "fallback" ? "fallback" : "active";
        setActiveImageryProvider(imageryProvider.id, message);
        setImageryStatus(status, message);
        return true;
      } catch {
        return false;
      }
    };

    if (map.isStyleLoaded() || (map.getStyle()?.layers?.length ?? 0) > 0) {
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

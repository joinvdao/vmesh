"use client";

import { useEffect, useRef, useState } from "react";
import type { Layer } from "@deck.gl/core";
import type maplibregl from "maplibre-gl";

import { returnToOrbitGlobe } from "@/components/Map/globeCamera";
import { GlobeModeHud } from "@/components/Map/GlobeModeHud";
import type { SelectedMarkerPosition } from "@/components/Map/globeRuntime";
import { getGlobeShellClassName } from "@/components/Map/globeShellStyles";
import { MapControls } from "@/components/Map/MapControls";
import { MeshLegend } from "@/components/Map/MeshLegend";
import { MeshTooltip } from "@/components/Map/MeshTooltip";
import {
  applySourceBackedMapOutput,
  setSourceBackedMapBackground
} from "@/components/Map/sourceBackedMapOutput";
import type { TerrainRuntime } from "@/components/Map/terrainRuntime";
import { TerrainGlobeViewport } from "@/components/Map/TerrainGlobeViewport";
import { useImageryRasterLayer } from "@/components/Map/useImageryRasterLayer";
import { useSelectedHexFlyTo } from "@/components/Map/useSelectedHexFlyTo";
import { useTerrainGlobeRenderer } from "@/components/Map/useTerrainGlobeRenderer";
import { useTerrainGlobeLayers } from "@/components/Map/useTerrainGlobeLayers";
import { getGlobeViewerMode, getMapCanvasOpacity } from "@/lib/globeViewer";
import type { GlobeViewerMode } from "@/lib/globeViewer";
import { getTerrainProviderCandidates } from "@/lib/terrainSources";
import { useVmeshStore } from "@/store/useVmeshStore";

type H3HexagonLayerConstructor = typeof import("@deck.gl/geo-layers").H3HexagonLayer;
type MapboxOverlayConstructor = typeof import("@deck.gl/mapbox").MapboxOverlay;
type MapboxOverlayInstance = InstanceType<MapboxOverlayConstructor>;
type ProjectionCapableMap = maplibregl.Map & {
  setProjection?: (projection: { type: "globe" } | { type: "mercator" }) => void;
};

export function TerrainGlobe() {
  const [initialViewState] = useState(() => useVmeshStore.getState().viewState);
  const containerRef = useRef<HTMLDivElement>(null);
  const globeShellRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlayInstance | null>(null);
  const layersRef = useRef<Layer[]>([]);
  const initialViewStateRef = useRef(initialViewState);
  const initialViewerMode = getGlobeViewerMode(initialViewState.zoom);
  const viewerModeRef = useRef<GlobeViewerMode>(initialViewerMode);
  const cameraZoomRef = useRef(initialViewState.zoom);
  const previousSelectedHexRef = useRef(useVmeshStore.getState().selectedHexId);
  const initialTerrainProviderIdRef = useRef(useVmeshStore.getState().selectedTerrainProviderId);
  const searchSelectedHexRef = useRef<string | null>(null);
  const terrainRuntimeRef = useRef<TerrainRuntime | null>(null);
  const lastSourceBackedMapKeyRef = useRef<string | null>(null);
  const [h3LayerConstructor, setH3LayerConstructor] = useState<H3HexagonLayerConstructor | null>(
    null
  );
  const [viewerMode, setViewerMode] = useState<GlobeViewerMode>(initialViewerMode);
  const [cameraZoom, setCameraZoom] = useState(initialViewState.zoom);
  const [terrainRuntimeReady, setTerrainRuntimeReady] = useState(false);
  const [selectedMarkerPosition, setSelectedMarkerPosition] =
    useState<SelectedMarkerPosition | null>(null);

  const selectedHexDetails = useVmeshStore((state) => state.selectedHexDetails);
  const flyToRequest = useVmeshStore((state) => state.flyToRequest);
  const viewState = useVmeshStore((state) => state.viewState);
  const activeLayers = useVmeshStore((state) => state.activeLayers);
  const activePanel = useVmeshStore((state) => state.activePanel);
  const globeTheme = useVmeshStore((state) => state.globeTheme);
  const basemapProviders = useVmeshStore((state) => state.basemapProviders);
  const selectedBasemapProviderId = useVmeshStore((state) => state.selectedBasemapProviderId);
  const terrainProviders = useVmeshStore((state) => state.terrainProviders);
  const selectedTerrainProviderId = useVmeshStore((state) => state.selectedTerrainProviderId);
  const imageryProviders = useVmeshStore((state) => state.imageryProviders);
  const selectedImageryProviderId = useVmeshStore((state) => state.selectedImageryProviderId);
  const imageryOpacity = useVmeshStore((state) => state.imageryOpacity);
  const setVisibleHexCount = useVmeshStore((state) => state.setVisibleHexCount);
  const setViewState = useVmeshStore((state) => state.setViewState);
  const setTerrainStatus = useVmeshStore((state) => state.setTerrainStatus);
  const setImageryStatus = useVmeshStore((state) => state.setImageryStatus);
  const setActiveImageryProvider = useVmeshStore((state) => state.setActiveImageryProvider);

  const { layers, visibleHexCount } = useTerrainGlobeLayers(h3LayerConstructor);
  const basemapLabel =
    basemapProviders.find((provider) => provider.id === selectedBasemapProviderId)?.label ??
    "Open-source basemap";
  const selectedBasemapProvider = basemapProviders.find(
    (provider) => provider.id === selectedBasemapProviderId
  );
  const viewStateViewerMode = getGlobeViewerMode(viewState.zoom);
  const effectiveViewerMode: GlobeViewerMode =
    viewStateViewerMode === "oss-map-output" || viewerMode === "oss-map-output"
      ? "oss-map-output"
      : "orbit-globe";
  const effectiveCameraZoom =
    effectiveViewerMode === "oss-map-output"
      ? Math.max(cameraZoom, viewState.zoom)
      : Math.min(cameraZoom, viewState.zoom);
  const globeShellClassName = getGlobeShellClassName(effectiveViewerMode, globeTheme);
  const mapOpacity = getMapCanvasOpacity(effectiveCameraZoom).toFixed(2);

  const returnToGlobe = () => {
    const nextViewState = initialViewStateRef.current;
    viewerModeRef.current = "orbit-globe";
    cameraZoomRef.current = nextViewState.zoom;
    lastSourceBackedMapKeyRef.current = null;
    setViewerMode("orbit-globe");
    setCameraZoom(nextViewState.zoom);
    setViewState(nextViewState);
    const map = mapRef.current;
    if (!map) return;
    (map as ProjectionCapableMap).setProjection?.({ type: "globe" });
    setSourceBackedMapBackground(map, false);
    returnToOrbitGlobe({ map, initialViewState: nextViewState });
  };

  useTerrainGlobeRenderer({
    containerRef,
    globeShellRef,
    mapRef,
    overlayRef,
    layersRef,
    initialViewStateRef,
    initialTerrainProviderIdRef,
    viewerModeRef,
    cameraZoomRef,
    terrainRuntimeRef,
    setH3LayerConstructor,
    setViewerMode,
    setCameraZoom,
    setTerrainRuntimeReady,
    setSelectedMarkerPosition
  });

  useEffect(() => {
    const nextViewerMode = getGlobeViewerMode(viewState.zoom);
    if (viewerModeRef.current !== nextViewerMode) {
      viewerModeRef.current = nextViewerMode;
      setViewerMode(nextViewerMode);
    }
    if (Math.abs(cameraZoomRef.current - viewState.zoom) > 0.08) {
      cameraZoomRef.current = viewState.zoom;
      setCameraZoom(viewState.zoom);
    }
    globeShellRef.current?.style.setProperty(
      "--vmesh-map-opacity",
      getMapCanvasOpacity(viewState.zoom).toFixed(2)
    );
  }, [viewState.zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || effectiveViewerMode !== "oss-map-output") {
      lastSourceBackedMapKeyRef.current = null;
      return;
    }

    const center = map.getCenter();
    const sourceBackedMapKey = [
      selectedBasemapProviderId,
      viewState.longitude.toFixed(4),
      viewState.latitude.toFixed(4),
      viewState.zoom.toFixed(2)
    ].join(":");
    const needsCameraSync =
      Math.abs(center.lng - viewState.longitude) > 0.01 ||
      Math.abs(center.lat - viewState.latitude) > 0.01 ||
      Math.abs(map.getZoom() - viewState.zoom) > 0.08;
    const needsRasterRefresh = lastSourceBackedMapKeyRef.current !== sourceBackedMapKey;
    if (!needsCameraSync && !needsRasterRefresh) return;

    const timer = window.setTimeout(() => {
      if (mapRef.current !== map) return;
      lastSourceBackedMapKeyRef.current = sourceBackedMapKey;
      applySourceBackedMapOutput({
        map,
        camera: {
          longitude: viewState.longitude,
          latitude: viewState.latitude,
          zoom: viewState.zoom,
          pitch: viewState.pitch,
          bearing: viewState.bearing
        },
        basemapProvider: selectedBasemapProvider,
        refreshRasterSource: needsRasterRefresh
      });
    }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    effectiveViewerMode,
    viewState.bearing,
    viewState.latitude,
    viewState.longitude,
    viewState.pitch,
    viewState.zoom,
    selectedBasemapProvider,
    selectedBasemapProviderId
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyToRequest) return;

    searchSelectedHexRef.current = selectedHexDetails.h3Id;
    const timer = window.setTimeout(() => {
      if (mapRef.current !== map) return;
      const nextViewerMode = getGlobeViewerMode(flyToRequest.zoom);
      viewerModeRef.current = nextViewerMode;
      cameraZoomRef.current = flyToRequest.zoom;
      setViewerMode(nextViewerMode);
      setCameraZoom(flyToRequest.zoom);
      if (nextViewerMode === "oss-map-output") {
        applySourceBackedMapOutput({
          map,
          camera: {
            longitude: flyToRequest.longitude,
            latitude: flyToRequest.latitude,
            zoom: flyToRequest.zoom,
            pitch: 46,
            bearing: -18
          },
          basemapProvider: selectedBasemapProvider,
          refreshRasterSource: true
        });
      } else {
        map.stop();
        map.jumpTo({
          center: [flyToRequest.longitude, flyToRequest.latitude],
          zoom: flyToRequest.zoom,
          pitch: 46,
          bearing: -18
        });
      }
      setViewState({
        longitude: flyToRequest.longitude,
        latitude: flyToRequest.latitude,
        zoom: flyToRequest.zoom,
        pitch: 46,
        bearing: -18
      });
    }, 80);

    return () => {
      window.clearTimeout(timer);
    };
  }, [flyToRequest, selectedBasemapProvider, selectedHexDetails.h3Id, setViewState]);

  useEffect(() => {
    layersRef.current = layers;
    overlayRef.current?.setProps({ layers });
    setVisibleHexCount(visibleHexCount);
  }, [layers, setVisibleHexCount, visibleHexCount]);

  useImageryRasterLayer({
    mapRef,
    active: activeLayers.imagery,
    imageryOpacity,
    imageryProviders,
    selectedImageryProviderId,
    setActiveImageryProvider,
    setImageryStatus
  });

  useEffect(() => {
    const map = mapRef.current;
    const runtime = terrainRuntimeRef.current;
    if (!map || !runtime || !terrainRuntimeReady) return;

    const terrainCandidates = getTerrainProviderCandidates(
      terrainProviders,
      selectedTerrainProviderId
    );
    runtime.setTerrainCandidates(terrainCandidates);

    if (!activeLayers.terrain) {
      runtime.clearTerrain("Terrain overlay hidden");
      return;
    }

    const applyTerrain = () => {
      runtime.applyTerrainCandidate(0);
    };

    if (map.isStyleLoaded()) {
      applyTerrain();
      return;
    }

    setTerrainStatus("loading", "Waiting for map style before terrain overlay");
    map.once("style.load", applyTerrain);
    return () => {
      map.off("style.load", applyTerrain);
    };
  }, [
    activeLayers.terrain,
    effectiveViewerMode,
    selectedTerrainProviderId,
    setTerrainStatus,
    terrainProviders,
    terrainRuntimeReady
  ]);

  useSelectedHexFlyTo({
    mapRef,
    selectedHexDetails,
    previousSelectedHexRef,
    searchSelectedHexRef
  });

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-[#02050c]"
      data-view-zoom={viewState.zoom.toFixed(2)}
      data-fly-to-zoom={flyToRequest?.zoom.toFixed(2) ?? ""}
      data-viewer-mode={effectiveViewerMode}
      data-map-opacity={mapOpacity}
    >
      <TerrainGlobeViewport
        globeShellRef={globeShellRef}
        containerRef={containerRef}
        globeShellClassName={globeShellClassName}
        viewerMode={effectiveViewerMode}
        globeTheme={globeTheme}
        mapOpacity={mapOpacity}
        selectedMarkerPosition={selectedMarkerPosition}
      />
      <GlobeModeHud
        mode={effectiveViewerMode}
        zoom={effectiveCameraZoom}
        basemapLabel={basemapLabel}
        onBackToGlobe={returnToGlobe}
      />
      <MapControls />
      {activePanel === "layers" || activePanel === "macro" || activeLayers.macro ? (
        <MeshLegend />
      ) : null}
      <MeshTooltip />
    </div>
  );
}

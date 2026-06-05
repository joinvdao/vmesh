"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { toMapLibreBasemapStyle } from "@/lib/basemapSources";
import { getGlobeViewerMode, getMapCanvasOpacity, type GlobeViewerMode } from "@/lib/globeViewer";
import {
  getTerrainProviderCandidates,
  SOURCE_AUTO_DSM_PROVIDER_ID,
  SOURCE_AUTO_DTM_PROVIDER_ID
} from "@/lib/terrainSources";
import {
  isCanadaTerrainSourceCoordinate,
  isNorthAmericaTerrainSourceCoordinate
} from "@/lib/terrainSourcePreview";
import {
  chooseDsmProviderFromTerrainSourceProbe,
  chooseDtmProviderFromTerrainSourceProbes,
  fetchTerrainSourceProbe,
  fetchTerrainSourceTileReadiness
} from "@/lib/terrainSourceProbeSelection";
import { useVmeshStore } from "@/store/useVmeshStore";

type H3LayerCtor = typeof import("@deck.gl/geo-layers").H3HexagonLayer;
type MapboxOverlayConstructor = typeof import("@deck.gl/mapbox").MapboxOverlay;
type MapboxOverlayInstance = InstanceType<MapboxOverlayConstructor>;
type ProjectionCapableMap = maplibregl.Map & {
  setProjection?: (projection: { type: "globe" } | { type: "mercator" }) => void;
};
const SOURCE_PREVIEW_READINESS_ZOOM = 15;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

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
  const appliedBasemapProviderIdRef = useRef(useVmeshStore.getState().selectedBasemapProviderId);
  const searchSelectedHexRef = useRef<string | null>(null);
  const terrainRuntimeRef = useRef<TerrainRuntime | null>(null);
  const lastSourceBackedMapKeyRef = useRef<string | null>(null);
  const terrainProbeRequestIdRef = useRef(0);
  const sourcePreviewAutoSelectionFlyToIdRef = useRef<number | null>(null);
  const [h3LayerConstructor, setH3LayerConstructor] = useState<H3LayerCtor | null>(null);
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
  const globeBackdropMode = useVmeshStore((state) => state.globeBackdropMode);
  const basemapProviders = useVmeshStore((state) => state.basemapProviders);
  const selectedBasemapProviderId = useVmeshStore((state) => state.selectedBasemapProviderId);
  const terrainProviders = useVmeshStore((state) => state.terrainProviders);
  const selectedTerrainProviderId = useVmeshStore((state) => state.selectedTerrainProviderId);
  const imageryProviders = useVmeshStore((state) => state.imageryProviders);
  const selectedImageryProviderId = useVmeshStore((state) => state.selectedImageryProviderId);
  const imageryOpacity = useVmeshStore((state) => state.imageryOpacity);
  const setVisibleHexCount = useVmeshStore((state) => state.setVisibleHexCount);
  const setViewState = useVmeshStore((state) => state.setViewState);
  const setBasemapStatus = useVmeshStore((state) => state.setBasemapStatus);
  const setTerrainStatus = useVmeshStore((state) => state.setTerrainStatus);
  const setMapStatus = useVmeshStore((state) => state.setMapStatus);
  const setImageryStatus = useVmeshStore((state) => state.setImageryStatus);
  const setActiveImageryProvider = useVmeshStore((state) => state.setActiveImageryProvider);
  const setSelectedTerrainProvider = useVmeshStore((state) => state.setSelectedTerrainProvider);

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

  const handleOrbitWheelZoom = useCallback(
    (deltaY: number) => {
      const map = mapRef.current;
      const zoomDelta = clamp(-deltaY / 360, -1.1, 1.1);
      const nextZoom = clamp(viewState.zoom + zoomDelta, 1.85, 16.4);
      const nextViewerMode = getGlobeViewerMode(nextZoom);
      const nextViewState = {
        longitude: viewState.longitude,
        latitude: viewState.latitude,
        zoom: nextZoom,
        pitch: nextViewerMode === "oss-map-output" ? 46 : viewState.pitch,
        bearing: nextViewerMode === "oss-map-output" ? -18 : viewState.bearing
      };

      viewerModeRef.current = nextViewerMode;
      cameraZoomRef.current = nextZoom;
      setViewerMode(nextViewerMode);
      setCameraZoom(nextZoom);
      setViewState(nextViewState);

      if (!map) return;
      if (nextViewerMode === "oss-map-output") {
        applySourceBackedMapOutput({
          map,
          camera: nextViewState,
          basemapProvider: selectedBasemapProvider,
          refreshRasterSource: true
        });
        return;
      }

      try {
        (map as ProjectionCapableMap).setProjection?.({ type: "globe" });
        setSourceBackedMapBackground(map, false);
        map.stop();
        map.easeTo({
          center: [nextViewState.longitude, nextViewState.latitude],
          zoom: nextViewState.zoom,
          pitch: nextViewState.pitch,
          bearing: nextViewState.bearing,
          duration: 180,
          essential: true
        });
      } catch {
        // The Three.js globe remains responsive if MapLibre is mid-style transition.
      }
    },
    [selectedBasemapProvider, setViewState, viewState]
  );

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
    if (!map || !selectedBasemapProvider) return;
    if (appliedBasemapProviderIdRef.current === selectedBasemapProviderId) return;

    appliedBasemapProviderIdRef.current = selectedBasemapProviderId;
    lastSourceBackedMapKeyRef.current = null;
    setBasemapStatus("loading", `Switching basemap to ${selectedBasemapProvider.label}`);

    let didFinish = false;
    let fallbackTimer: number | undefined;
    const finishBasemapSwitch = () => {
      if (didFinish || mapRef.current !== map) return;
      if (!map.isStyleLoaded()) return;
      didFinish = true;
      try {
        (map as ProjectionCapableMap).setProjection?.({
          type: effectiveViewerMode === "oss-map-output" ? "mercator" : "globe"
        });
        setSourceBackedMapBackground(map, effectiveViewerMode === "oss-map-output");
      } catch {
        // Projection support is version-dependent; the selected style still loads.
      }

      overlayRef.current?.setProps({ layers: layersRef.current });
      if (activeLayers.terrain) {
        terrainRuntimeRef.current?.applyTerrainCandidate(0);
      }
      setBasemapStatus("active", `${selectedBasemapProvider.label} basemap active`);
      map.resize();
      map.triggerRepaint();
    };

    try {
      map.stop();
      map.setStyle(toMapLibreBasemapStyle(selectedBasemapProvider), { diff: false });
      map.once("style.load", finishBasemapSwitch);
      map.once("styledata", finishBasemapSwitch);
      fallbackTimer = window.setTimeout(finishBasemapSwitch, 2400);
    } catch {
      setBasemapStatus("error", `${selectedBasemapProvider.label} basemap failed to load`);
    }

    return () => {
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      map.off("style.load", finishBasemapSwitch);
      map.off("styledata", finishBasemapSwitch);
    };
  }, [
    activeLayers.terrain,
    effectiveViewerMode,
    selectedBasemapProvider,
    selectedBasemapProviderId,
    setBasemapStatus
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyToRequest) return;

    const isNorthAmericaFlyTo = isNorthAmericaTerrainSourceCoordinate({
      latitude: flyToRequest.latitude,
      longitude: flyToRequest.longitude
    });
    if (isNorthAmericaFlyTo && sourcePreviewAutoSelectionFlyToIdRef.current !== flyToRequest.id) {
      sourcePreviewAutoSelectionFlyToIdRef.current = flyToRequest.id;
      const providerId =
        selectedTerrainProviderId === SOURCE_AUTO_DSM_PROVIDER_ID
          ? SOURCE_AUTO_DSM_PROVIDER_ID
          : SOURCE_AUTO_DTM_PROVIDER_ID;
      if (selectedTerrainProviderId !== providerId) {
        setSelectedTerrainProvider(providerId);
      }
    }

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
        map.flyTo({
          center: [flyToRequest.longitude, flyToRequest.latitude],
          zoom: flyToRequest.zoom,
          pitch: 46,
          bearing: -18,
          duration: Math.round(Math.min(4200, Math.max(1900, 1300 + flyToRequest.zoom * 170))),
          essential: true
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
  }, [
    flyToRequest,
    selectedBasemapProvider,
    selectedHexDetails.h3Id,
    selectedTerrainProviderId,
    setSelectedTerrainProvider,
    setViewState
  ]);

  useEffect(() => {
    if (!flyToRequest) return;

    const coordinate = {
      latitude: flyToRequest.latitude,
      longitude: flyToRequest.longitude
    };
    if (!isNorthAmericaTerrainSourceCoordinate(coordinate)) return;
    const role = selectedTerrainProviderId === SOURCE_AUTO_DSM_PROVIDER_ID ? "dsm" : "dtm";
    if (role === "dtm" && selectedTerrainProviderId !== SOURCE_AUTO_DTM_PROVIDER_ID) return;

    const requestId = terrainProbeRequestIdRef.current + 1;
    terrainProbeRequestIdRef.current = requestId;
    const controller = new AbortController();

    setMapStatus({
      terrain: "loading",
      providerId: selectedTerrainProviderId,
      message: `Checking official 1m ${role.toUpperCase()} source coverage for this coordinate`
    });

    const runProbe = async () => {
      const strictProbe = await fetchTerrainSourceProbe({
        coordinate,
        role,
        mode: "strict-1m",
        signal: controller.signal
      });
      const updateTerrainStatusFromTileReadiness = async ({
        template,
        decision,
        sourceProviderId
      }: {
        template: string;
        decision: ReturnType<typeof chooseDtmProviderFromTerrainSourceProbes>;
        sourceProviderId: string | null;
      }) => {
        const tileReadiness = await fetchTerrainSourceTileReadiness({
          template,
          coordinate,
          zoom: SOURCE_PREVIEW_READINESS_ZOOM,
          signal: controller.signal
        });
        if (terrainProbeRequestIdRef.current !== requestId || controller.signal.aborted) return;

        const readyMessage =
          role === "dsm"
            ? `Official 1m DSM worker tile rendered via ${
                tileReadiness.providerId ?? sourceProviderId
              }`
            : `Official ${
                decision.resolutionMeters === 1 ? "1m" : `${decision.resolutionMeters}m`
              } DTM worker tile rendered via ${tileReadiness.providerId ?? sourceProviderId}`;

        useVmeshStore.getState().setMapStatus({
          terrain: tileReadiness.status === "ready" ? "active" : "fallback",
          providerId: decision.providerId,
          message:
            tileReadiness.status === "ready"
              ? readyMessage
              : `Official ${role.toUpperCase()} source is available, but the worker tile is ${
                  tileReadiness.status
                }. ${tileReadiness.reason ?? "The visual terrain fallback remains available."}`
        });
      };

      if (role === "dsm") {
        if (terrainProbeRequestIdRef.current !== requestId || controller.signal.aborted) return;

        const decision = chooseDsmProviderFromTerrainSourceProbe({ probe: strictProbe });
        const store = useVmeshStore.getState();
        if (store.selectedTerrainProviderId !== decision.providerId) {
          store.setSelectedTerrainProvider(decision.providerId);
        }
        store.setMapStatus({
          terrain: decision.terrainStatus,
          providerId: decision.providerId,
          message: decision.message
        });
        if (
          (strictProbe.status === "covered" || strictProbe.status === "source-available") &&
          strictProbe.tileUrlTemplate
        ) {
          await updateTerrainStatusFromTileReadiness({
            template: strictProbe.tileUrlTemplate,
            decision,
            sourceProviderId: strictProbe.providerId
          });
        }
        return;
      }

      const bestProbe =
        strictProbe.status === "covered" || !isCanadaTerrainSourceCoordinate(coordinate)
          ? null
          : await fetchTerrainSourceProbe({
              coordinate,
              role: "dtm",
              mode: "best-available",
              signal: controller.signal
            });

      if (terrainProbeRequestIdRef.current !== requestId || controller.signal.aborted) return;

      const decision = chooseDtmProviderFromTerrainSourceProbes({ strictProbe, bestProbe });
      const store = useVmeshStore.getState();
      if (store.selectedTerrainProviderId !== decision.providerId) {
        store.setSelectedTerrainProvider(decision.providerId);
      }
      store.setMapStatus({
        terrain: decision.terrainStatus,
        providerId: decision.providerId,
        message: decision.message
      });
      const selectedDtmProbe =
        strictProbe.status === "covered" && strictProbe.tileUrlTemplate ? strictProbe : bestProbe;
      if (selectedDtmProbe?.tileUrlTemplate) {
        await updateTerrainStatusFromTileReadiness({
          template: selectedDtmProbe.tileUrlTemplate,
          decision,
          sourceProviderId: selectedDtmProbe.providerId
        });
      }
    };

    void runProbe().catch((error) => {
      if (controller.signal.aborted || terrainProbeRequestIdRef.current !== requestId) return;
      setMapStatus({
        terrain: "error",
        providerId: selectedTerrainProviderId,
        message:
          error instanceof Error
            ? `Official ${role.toUpperCase()} source probe failed: ${error.message}`
            : `Official ${role.toUpperCase()} source probe failed`
      });
    });

    return () => {
      controller.abort();
    };
  }, [flyToRequest, selectedTerrainProviderId, setMapStatus]);

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

    let didApplyTerrain = false;
    const applyTerrain = () => {
      if (didApplyTerrain || mapRef.current !== map) return;
      didApplyTerrain = true;
      runtime.applyTerrainCandidate(0);
    };

    if (map.isStyleLoaded()) {
      applyTerrain();
      return;
    }

    setTerrainStatus("loading", "Waiting for map style before terrain overlay");
    map.once("style.load", applyTerrain);
    const fallbackTimer = window.setTimeout(applyTerrain, 1800);
    return () => {
      window.clearTimeout(fallbackTimer);
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
      data-viewer-mode={effectiveViewerMode}
      data-map-opacity={mapOpacity}
    >
      <TerrainGlobeViewport
        globeShellRef={globeShellRef}
        containerRef={containerRef}
        globeShellClassName={globeShellClassName}
        viewerMode={effectiveViewerMode}
        globeTheme={globeTheme}
        backdropMode={globeBackdropMode}
        mapOpacity={mapOpacity}
        selectedMarkerPosition={selectedMarkerPosition}
        targetCoordinate={{ latitude: viewState.latitude, longitude: viewState.longitude }}
        flightId={flyToRequest?.id ?? null}
        onOrbitWheelZoom={handleOrbitWheelZoom}
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

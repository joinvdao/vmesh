"use client";

import { useEffect } from "react";
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react";
import type { Layer } from "@deck.gl/core";
import type maplibregl from "maplibre-gl";

import { createGlobeRuntime } from "@/components/Map/globeRuntime";
import type { SelectedMarkerPosition } from "@/components/Map/globeRuntime";
import { createGlobeVisualRuntime } from "@/components/Map/globeVisualRuntime";
import { createTerrainRuntime } from "@/components/Map/terrainRuntime";
import type { TerrainRuntime } from "@/components/Map/terrainRuntime";
import { selectBasemapProvider, toMapLibreBasemapStyle } from "@/lib/basemapSources";
import type { GlobeViewerMode } from "@/lib/globeViewer";
import { acquirePmtilesProtocol, isTerrainError } from "@/lib/mapLibreTerrainRuntime";
import { getTerrainProviderCandidates, selectTerrainProvider } from "@/lib/terrainSources";
import type { ViewState } from "@/lib/vmeshTypes";
import { useVmeshStore } from "@/store/useVmeshStore";

type GlobeCapableMap = maplibregl.Map & {
  setProjection?: (projection: { type: "globe" } | { type: "mercator" }) => void;
};
type H3HexagonLayerConstructor = typeof import("@deck.gl/geo-layers").H3HexagonLayer;
type MapboxOverlayConstructor = typeof import("@deck.gl/mapbox").MapboxOverlay;
type MapboxOverlayInstance = InstanceType<MapboxOverlayConstructor>;

interface UseTerrainGlobeRendererOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  globeShellRef: RefObject<HTMLDivElement | null>;
  mapRef: MutableRefObject<maplibregl.Map | null>;
  overlayRef: MutableRefObject<MapboxOverlayInstance | null>;
  layersRef: MutableRefObject<Layer[]>;
  initialViewStateRef: MutableRefObject<ViewState>;
  initialTerrainProviderIdRef: MutableRefObject<string>;
  viewerModeRef: MutableRefObject<GlobeViewerMode>;
  cameraZoomRef: MutableRefObject<number>;
  terrainRuntimeRef: MutableRefObject<TerrainRuntime | null>;
  setH3LayerConstructor: Dispatch<SetStateAction<H3HexagonLayerConstructor | null>>;
  setViewerMode: Dispatch<SetStateAction<GlobeViewerMode>>;
  setCameraZoom: Dispatch<SetStateAction<number>>;
  setTerrainRuntimeReady: Dispatch<SetStateAction<boolean>>;
  setSelectedMarkerPosition: Dispatch<SetStateAction<SelectedMarkerPosition | null>>;
}

export function useTerrainGlobeRenderer({
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
}: UseTerrainGlobeRendererOptions) {
  const basemapProviders = useVmeshStore((state) => state.basemapProviders);
  const selectedBasemapProviderId = useVmeshStore((state) => state.selectedBasemapProviderId);
  const terrainProviders = useVmeshStore((state) => state.terrainProviders);
  const imageryProviders = useVmeshStore((state) => state.imageryProviders);
  const setViewState = useVmeshStore((state) => state.setViewState);
  const setMapStatus = useVmeshStore((state) => state.setMapStatus);
  const setBasemapStatus = useVmeshStore((state) => state.setBasemapStatus);
  const setTerrainStatus = useVmeshStore((state) => state.setTerrainStatus);
  const setActiveBasemapProvider = useVmeshStore((state) => state.setActiveBasemapProvider);
  const setActiveTerrainProvider = useVmeshStore((state) => state.setActiveTerrainProvider);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;
    let releasePmtilesProtocol = () => {};
    const basemapProvider = selectBasemapProvider(basemapProviders, selectedBasemapProviderId);
    const provider = selectTerrainProvider(terrainProviders, initialTerrainProviderIdRef.current);
    setMapStatus({
      map: "loading",
      basemap: "loading",
      terrain: "loading",
      providerId: provider.id,
      basemapProviderId: basemapProvider.id,
      message: "Initializing globe canvas"
    });
    setActiveBasemapProvider(basemapProvider.id, `${basemapProvider.label} basemap loading`);

    const terrainCandidates = getTerrainProviderCandidates(
      terrainProviders,
      initialTerrainProviderIdRef.current
    );

    const initializeRenderer = async () => {
      try {
        const [{ default: mapLibre }, { MapboxOverlay }, { H3HexagonLayer }] = await Promise.all([
          import("maplibre-gl"),
          import("@deck.gl/mapbox"),
          import("@deck.gl/geo-layers")
        ]);

        if (cancelled || !containerRef.current) return;

        setH3LayerConstructor(() => H3HexagonLayer);

        releasePmtilesProtocol =
          terrainCandidates.some((candidate) => candidate.kind === "pmtiles-raster-dem") ||
          basemapProvider.kind === "protomaps-pmtiles" ||
          imageryProviders.some(
            (candidate) =>
              candidate.status === "available" &&
              (candidate.kind === "sentinel2-sen2sr-pmtiles" ||
                candidate.kind === "offline-raster-pmtiles")
          )
            ? acquirePmtilesProtocol(mapLibre)
            : () => {};

        let triedAsyncFallback = false;
        const initialViewState = initialViewStateRef.current;
        const map = new mapLibre.Map({
          container: containerRef.current,
          style: toMapLibreBasemapStyle(basemapProvider),
          center: [initialViewState.longitude, initialViewState.latitude],
          zoom: initialViewState.zoom,
          pitch: initialViewState.pitch,
          bearing: initialViewState.bearing,
          attributionControl: false,
          antialias: true,
          renderWorldCopies: false
        });

        mapRef.current = map;
        map.scrollZoom.disable();
        if (process.env.NODE_ENV !== "production") {
          (
            window as Window & {
              __vmeshMap?: maplibregl.Map;
            }
          ).__vmeshMap = map;
        }
        (map as GlobeCapableMap).setProjection?.({ type: "globe" });

        const globeVisualRuntime = createGlobeVisualRuntime({
          map,
          getShell: () => globeShellRef.current,
          viewerModeRef,
          cameraZoomRef,
          setViewerMode,
          setCameraZoom
        });
        const syncGlobeCameraVisual = globeVisualRuntime.sync;
        syncGlobeCameraVisual();

        const terrainRuntime = createTerrainRuntime({
          map,
          terrainCandidates,
          setActiveTerrainProvider,
          setTerrainStatus
        });
        terrainRuntimeRef.current = terrainRuntime;
        setTerrainRuntimeReady(true);

        let didAttachOverlay = false;
        let didAttachTerrain = false;
        let terrainRetries = 0;
        let terrainRetryTimer: number | undefined;
        let resizeAnimationFrame: number | undefined;
        const globeRuntime = createGlobeRuntime({
          map,
          getCancelled: () => cancelled,
          setSelectedMarkerPosition
        });
        const queueRendererResize = () => {
          if (resizeAnimationFrame !== undefined) {
            window.cancelAnimationFrame(resizeAnimationFrame);
          }
          resizeAnimationFrame = window.requestAnimationFrame(() => {
            resizeAnimationFrame = undefined;
            if (cancelled || mapRef.current !== map) return;
            try {
              map.resize();
            } catch {
              return;
            }
            globeRuntime.syncSelectedMarker();
          });
        };
        const shellResizeObserver =
          globeShellRef.current && "ResizeObserver" in window
            ? new ResizeObserver(queueRendererResize)
            : null;

        if (globeShellRef.current) {
          shellResizeObserver?.observe(globeShellRef.current);
        }

        const attachOverlay = () => {
          if (didAttachOverlay) return;
          didAttachOverlay = true;
          setMapStatus({
            map: "active",
            basemap: "active",
            providerId: provider.id,
            basemapProviderId: basemapProvider.id,
            message: "Globe ready"
          });
          setBasemapStatus("active", `${basemapProvider.label} basemap active`);

          const overlay = new MapboxOverlay({
            interleaved: false,
            layers: layersRef.current
          });
          overlayRef.current = overlay;
          map.addControl(overlay as unknown as maplibregl.IControl);
          globeRuntime.syncSelectedMarker();
          syncGlobeCameraVisual();
          globeRuntime.queueAutoSpin();
        };

        const tryAttachTerrain = () => {
          if (didAttachTerrain) return;

          if (!map.isStyleLoaded()) {
            if (terrainRetries < 20) {
              terrainRetries += 1;
              terrainRetryTimer = window.setTimeout(tryAttachTerrain, 500);
              return;
            }

            if (terrainRuntime.getActiveTerrainProvider()) {
              return;
            }

            setTerrainStatus("fallback", "Map style is still loading; terrain is deferred");
            return;
          }

          didAttachTerrain = true;
          if (!useVmeshStore.getState().activeLayers.terrain) {
            terrainRuntime.clearTerrain("Terrain overlay hidden");
            return;
          }
          terrainRuntime.applyTerrainCandidate(0);
        };

        const onStyleReady = () => {
          attachOverlay();
          tryAttachTerrain();
        };

        if (map.isStyleLoaded()) {
          onStyleReady();
        } else {
          map.once("styledata", onStyleReady);
          map.once("style.load", onStyleReady);
          window.setTimeout(() => {
            attachOverlay();
            tryAttachTerrain();
          }, 2500);
        }

        map.on("moveend", () => {
          const center = map.getCenter();
          setViewState({
            longitude: center.lng,
            latitude: center.lat,
            zoom: map.getZoom(),
            pitch: map.getPitch(),
            bearing: map.getBearing()
          });
          globeRuntime.syncSelectedMarker();
          syncGlobeCameraVisual();
          globeRuntime.queueAutoSpin();
        });

        map.on("move", () => {
          globeRuntime.syncSelectedMarker();
          syncGlobeCameraVisual();
        });
        map.on("dragstart", globeRuntime.pauseAutoSpin);
        map.on("zoomstart", globeRuntime.pauseAutoSpin);
        map.on("rotatestart", globeRuntime.pauseAutoSpin);
        map.on("pitchstart", globeRuntime.pauseAutoSpin);

        map.on("error", (event) => {
          const message = event.error?.message ?? "Map renderer reported an error";
          const activeProvider = terrainRuntime.getActiveTerrainProvider();

          if (!triedAsyncFallback && isTerrainError(activeProvider, message)) {
            triedAsyncFallback = true;
            if (
              terrainRuntime.applyTerrainCandidate(
                terrainRuntime.getActiveTerrainIndex() + 1,
                message
              )
            ) {
              return;
            }
          }

          setMapStatus({ map: "error", message });
        });

        map.once("remove", () => {
          if (terrainRetryTimer !== undefined) {
            window.clearTimeout(terrainRetryTimer);
          }
          if (resizeAnimationFrame !== undefined) {
            window.cancelAnimationFrame(resizeAnimationFrame);
          }
          if (
            process.env.NODE_ENV !== "production" &&
            (
              window as Window & {
                __vmeshMap?: maplibregl.Map;
              }
            ).__vmeshMap === map
          ) {
            delete (
              window as Window & {
                __vmeshMap?: maplibregl.Map;
              }
            ).__vmeshMap;
          }
          shellResizeObserver?.disconnect();
          globeRuntime.clearAutoSpin();
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "WebGL renderer failed to initialize";
        setMapStatus({
          map: "error",
          terrain: "unavailable",
          providerId: provider.id,
          message
        });
      }
    };

    void initializeRenderer();

    return () => {
      cancelled = true;
      overlayRef.current?.finalize();
      overlayRef.current = null;
      terrainRuntimeRef.current = null;
      setTerrainRuntimeReady(false);
      mapRef.current?.remove();
      releasePmtilesProtocol();
      mapRef.current = null;
    };
  }, [
    basemapProviders,
    cameraZoomRef,
    containerRef,
    globeShellRef,
    imageryProviders,
    initialTerrainProviderIdRef,
    initialViewStateRef,
    layersRef,
    mapRef,
    overlayRef,
    selectedBasemapProviderId,
    setActiveBasemapProvider,
    setActiveTerrainProvider,
    setBasemapStatus,
    setCameraZoom,
    setH3LayerConstructor,
    setMapStatus,
    setSelectedMarkerPosition,
    setTerrainRuntimeReady,
    setTerrainStatus,
    setViewerMode,
    setViewState,
    terrainProviders,
    terrainRuntimeRef,
    viewerModeRef
  ]);
}

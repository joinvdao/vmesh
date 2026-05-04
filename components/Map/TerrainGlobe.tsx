"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Layer, PickingInfo } from "@deck.gl/core";
import type maplibregl from "maplibre-gl";

import { EarthGlobeFallback } from "@/components/Map/EarthGlobeFallback";
import { flyToSearchRequest, flyToSelectedHex } from "@/components/Map/globeCamera";
import { createGlobeRuntime } from "@/components/Map/globeRuntime";
import type { SelectedMarkerPosition } from "@/components/Map/globeRuntime";
import { buildH3Layer, layerOpacityForTier } from "@/components/Map/h3LayerFactory";
import { MapControls } from "@/components/Map/MapControls";
import { MeshLegend } from "@/components/Map/MeshLegend";
import { MeshTooltip } from "@/components/Map/MeshTooltip";
import { SelectedCellMarker } from "@/components/Map/SelectedCellMarker";
import { createTerrainRuntime } from "@/components/Map/terrainRuntime";
import { acquirePmtilesProtocol, isTerrainError } from "@/lib/mapLibreTerrainRuntime";
import {
  createLightBasemapStyle,
  getTerrainProviderCandidates,
  selectTerrainProvider
} from "@/lib/terrainSources";
import type { VmeshHexRecord } from "@/lib/vmeshTypes";
import { useVmeshStore } from "@/store/useVmeshStore";

type GlobeCapableMap = maplibregl.Map & {
  setProjection?: (projection: { type: "globe" }) => void;
};
type H3HexagonLayerConstructor = typeof import("@deck.gl/geo-layers").H3HexagonLayer;
type MapboxOverlayConstructor = typeof import("@deck.gl/mapbox").MapboxOverlay;
type MapboxOverlayInstance = InstanceType<MapboxOverlayConstructor>;

export function TerrainGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlayInstance | null>(null);
  const layersRef = useRef<Layer[]>([]);
  const initialViewStateRef = useRef(useVmeshStore.getState().viewState);
  const previousSelectedHexRef = useRef(useVmeshStore.getState().selectedHexId);
  const searchSelectedHexRef = useRef<string | null>(null);
  const [h3LayerConstructor, setH3LayerConstructor] = useState<H3HexagonLayerConstructor | null>(
    null
  );
  const [selectedMarkerPosition, setSelectedMarkerPosition] =
    useState<SelectedMarkerPosition | null>(null);

  const selectedTier = useVmeshStore((state) => state.selectedTier);
  const selectedHexId = useVmeshStore((state) => state.selectedHexId);
  const selectedHexDetails = useVmeshStore((state) => state.selectedHexDetails);
  const activeLayers = useVmeshStore((state) => state.activeLayers);
  const activePanel = useVmeshStore((state) => state.activePanel);
  const hexDataByTier = useVmeshStore((state) => state.hexDataByTier);
  const terrainProviders = useVmeshStore((state) => state.terrainProviders);
  const selectedTerrainProviderId = useVmeshStore((state) => state.selectedTerrainProviderId);
  const selectHex = useVmeshStore((state) => state.selectHex);
  const setHoveredHexInfo = useVmeshStore((state) => state.setHoveredHexInfo);
  const setVisibleHexCount = useVmeshStore((state) => state.setVisibleHexCount);
  const setViewState = useVmeshStore((state) => state.setViewState);
  const setMapStatus = useVmeshStore((state) => state.setMapStatus);
  const setTerrainStatus = useVmeshStore((state) => state.setTerrainStatus);
  const setActiveTerrainProvider = useVmeshStore((state) => state.setActiveTerrainProvider);

  const layers = useMemo(() => {
    if (!h3LayerConstructor) return [];

    const handleHover = (info: PickingInfo<VmeshHexRecord>) => {
      if (!info.object) {
        setHoveredHexInfo(null);
        return;
      }
      setHoveredHexInfo({
        h3Id: info.object.h3Id,
        tier: info.object.tier,
        x: info.x,
        y: info.y
      });
    };

    const handleClick = (info: PickingInfo<VmeshHexRecord>) => {
      if (!info.object) return;
      selectHex(info.object.h3Id, info.object.tier);
    };

    const nextLayers: Layer[] = [];

    if (activeLayers.context && selectedTier !== "U3") {
      nextLayers.push(
        buildH3Layer({
          id: "u3-context",
          data: hexDataByTier.U3,
          selectedHexId,
          opacity: 96,
          H3HexagonLayer: h3LayerConstructor,
          onHover: handleHover,
          onClick: handleClick
        })
      );
    }

    const activeData = hexDataByTier[selectedTier];
    if (activeLayers.macro) {
      nextLayers.push(
        buildH3Layer({
          id: `${selectedTier.toLowerCase()}-active`,
          data: activeData,
          selectedHexId,
          opacity: layerOpacityForTier(selectedTier),
          H3HexagonLayer: h3LayerConstructor,
          onHover: handleHover,
          onClick: handleClick
        })
      );
    }

    return nextLayers;
  }, [
    activeLayers.context,
    activeLayers.macro,
    hexDataByTier,
    h3LayerConstructor,
    selectedHexId,
    selectedTier,
    selectHex,
    setHoveredHexInfo
  ]);

  const visibleHexCount = useMemo(() => {
    const contextCount =
      activeLayers.context && selectedTier !== "U3" ? hexDataByTier.U3.length : 0;
    const activeCount = activeLayers.macro ? hexDataByTier[selectedTier].length : 0;
    return contextCount + activeCount;
  }, [activeLayers.context, activeLayers.macro, hexDataByTier, selectedTier]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;
    let releasePmtilesProtocol = () => {};
    let unsubscribeCameraRequests = () => {};
    const provider = selectTerrainProvider(terrainProviders, selectedTerrainProviderId);
    setMapStatus({
      map: "loading",
      terrain: "loading",
      providerId: provider.id,
      message: "Initializing globe canvas"
    });

    const terrainCandidates = getTerrainProviderCandidates(
      terrainProviders,
      selectedTerrainProviderId
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

        releasePmtilesProtocol = terrainCandidates.some(
          (candidate) => candidate.kind === "pmtiles-raster-dem"
        )
          ? acquirePmtilesProtocol(mapLibre)
          : () => {};

        let triedAsyncFallback = false;
        const initialViewState = initialViewStateRef.current;
        const map = new mapLibre.Map({
          container: containerRef.current,
          style: createLightBasemapStyle(),
          center: [initialViewState.longitude, initialViewState.latitude],
          zoom: initialViewState.zoom,
          pitch: initialViewState.pitch,
          bearing: initialViewState.bearing,
          attributionControl: false,
          antialias: true,
          renderWorldCopies: false
        });

        mapRef.current = map;

        const globeMap = map as GlobeCapableMap;
        globeMap.setProjection?.({ type: "globe" });

        let lastFlyToRequest = useVmeshStore.getState().flyToRequest;
        unsubscribeCameraRequests = useVmeshStore.subscribe((state) => {
          if (!state.flyToRequest || state.flyToRequest === lastFlyToRequest) return;
          lastFlyToRequest = state.flyToRequest;
          searchSelectedHexRef.current = state.selectedHexDetails.h3Id;
          flyToSearchRequest({
            map,
            flyToRequest: state.flyToRequest,
            setViewState,
            isCurrentMap: () => mapRef.current === map
          });
        });

        const terrainRuntime = createTerrainRuntime({
          map,
          terrainCandidates,
          setActiveTerrainProvider,
          setTerrainStatus
        });

        let didAttachOverlay = false;
        let didAttachTerrain = false;
        let terrainRetries = 0;
        let terrainRetryTimer: number | undefined;
        const globeRuntime = createGlobeRuntime({
          map,
          getCancelled: () => cancelled,
          setSelectedMarkerPosition
        });

        const attachOverlay = () => {
          if (didAttachOverlay) return;
          didAttachOverlay = true;
          setMapStatus({
            map: "active",
            providerId: provider.id,
            message: "Globe ready"
          });

          const overlay = new MapboxOverlay({
            interleaved: false,
            layers: layersRef.current
          });
          overlayRef.current = overlay;
          map.addControl(overlay as unknown as maplibregl.IControl);
          globeRuntime.syncSelectedMarker();
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

            setTerrainStatus("fallback", "Map style is still loading; terrain is deferred");
            return;
          }

          didAttachTerrain = true;
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
          globeRuntime.queueAutoSpin();
        });

        map.on("move", globeRuntime.syncSelectedMarker);
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
      unsubscribeCameraRequests();
      mapRef.current?.remove();
      releasePmtilesProtocol();
      mapRef.current = null;
    };
  }, [
    selectedTerrainProviderId,
    setActiveTerrainProvider,
    setMapStatus,
    setTerrainStatus,
    setViewState,
    terrainProviders
  ]);

  useEffect(() => {
    layersRef.current = layers;
    overlayRef.current?.setProps({ layers });
    setVisibleHexCount(visibleHexCount);
  }, [layers, setVisibleHexCount, visibleHexCount]);

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
  }, [selectedHexDetails]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#f3f8f7]">
      <div className="absolute inset-0 bg-[linear-gradient(#e9f1ef_1px,transparent_1px),linear-gradient(90deg,#e9f1ef_1px,transparent_1px)] bg-[size:52px_52px] opacity-70" />
      <div className="vmesh-globe-shell pointer-events-none absolute left-1/2 top-1/2 h-[88vmin] max-h-[1120px] w-[88vmin] max-w-[1120px] rounded-full bg-[#dbecea] shadow-[inset_-92px_-76px_132px_rgba(22,73,79,0.24),inset_42px_34px_84px_rgba(255,255,255,0.52),0_52px_135px_rgba(46,91,96,0.26)]" />
      <div className="vmesh-globe-shell absolute left-1/2 top-1/2 h-[88vmin] max-h-[1120px] w-[88vmin] max-w-[1120px] overflow-hidden rounded-full border border-[#d6e8e4] bg-[#ecf5f3] shadow-[0_46px_130px_rgba(40,78,83,0.22)]">
        <EarthGlobeFallback />
        <div className="pointer-events-none absolute inset-[9%] z-10 rounded-full border border-[#9bbfba]/35 opacity-70" />
        <div
          ref={containerRef}
          className="relative z-10 h-full w-full opacity-[0.62] mix-blend-multiply"
        />
        <div className="pointer-events-none absolute inset-0 z-20 rounded-full bg-[radial-gradient(circle_at_32%_22%,rgba(255,255,255,0.48),transparent_32%),radial-gradient(circle_at_74%_72%,rgba(21,91,99,0.34),transparent_36%),linear-gradient(120deg,rgba(255,255,255,0.16),rgba(12,55,68,0.22))]" />
        <div className="vmesh-atmosphere-drift pointer-events-none absolute inset-[3%] z-20 rounded-full border border-white/45 shadow-[inset_20px_18px_48px_rgba(255,255,255,0.18)]" />
        {selectedMarkerPosition ? <SelectedCellMarker position={selectedMarkerPosition} /> : null}
      </div>
      <MapControls />
      {activePanel === "layers" ? <MeshLegend /> : null}
      <MeshTooltip />
    </div>
  );
}

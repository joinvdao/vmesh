"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Layer, PickingInfo } from "@deck.gl/core";
import { cellToLatLng } from "h3-js";
import type maplibregl from "maplibre-gl";

import { buildH3Layer, layerOpacityForTier } from "@/components/Map/h3LayerFactory";
import { MapControls } from "@/components/Map/MapControls";
import { MeshLegend } from "@/components/Map/MeshLegend";
import { MeshTooltip } from "@/components/Map/MeshTooltip";
import { acquirePmtilesProtocol, isTerrainError } from "@/lib/mapLibreTerrainRuntime";
import {
  createLightBasemapStyle,
  getTerrainProviderCandidates,
  selectTerrainProvider,
  TERRAIN_SOURCE_ID,
  toRasterDemSource
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
  const [h3LayerConstructor, setH3LayerConstructor] = useState<H3HexagonLayerConstructor | null>(
    null
  );

  const selectedTier = useVmeshStore((state) => state.selectedTier);
  const selectedHexId = useVmeshStore((state) => state.selectedHexId);
  const selectedHexDetails = useVmeshStore((state) => state.selectedHexDetails);
  const activeLayers = useVmeshStore((state) => state.activeLayers);
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
    if (activeLayers.macro || selectedTier === "U8") {
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
    const activeCount =
      activeLayers.macro || selectedTier === "U8" ? hexDataByTier[selectedTier].length : 0;
    return contextCount + activeCount;
  }, [activeLayers.context, activeLayers.macro, hexDataByTier, selectedTier]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;
    let releasePmtilesProtocol = () => {};
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

        let activeTerrainIndex = -1;
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

        const clearTerrainSource = () => {
          if (map.getSource(TERRAIN_SOURCE_ID)) {
            map.setTerrain(null);
            map.removeSource(TERRAIN_SOURCE_ID);
          }
        };

        const applyTerrainCandidate = (startIndex: number, fallbackReason?: string): boolean => {
          for (let index = startIndex; index < terrainCandidates.length; index += 1) {
            const candidate = terrainCandidates[index];
            const source = toRasterDemSource(candidate);
            if (!source) continue;

            try {
              clearTerrainSource();
              map.addSource(TERRAIN_SOURCE_ID, source);
              map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: 1.5 });
              activeTerrainIndex = index;

              const status =
                candidate.status === "fallback" || index > 0 || fallbackReason
                  ? "fallback"
                  : "active";
              const message = fallbackReason
                ? `${candidate.label} terrain fallback after ${fallbackReason}`
                : `${candidate.label} terrain active`;

              setActiveTerrainProvider(candidate.id, message);
              setTerrainStatus(status, message);
              return true;
            } catch (error) {
              const message = error instanceof Error ? error.message : "Terrain source failed";
              setTerrainStatus("fallback", `${candidate.label} failed: ${message}`);
            }
          }

          setTerrainStatus("unavailable", "No map-ready terrain provider is currently available");
          return false;
        };

        let didAttachOverlay = false;
        let didAttachTerrain = false;
        let terrainRetries = 0;
        let terrainRetryTimer: number | undefined;

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
          applyTerrainCandidate(0);
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
        });

        map.on("error", (event) => {
          const message = event.error?.message ?? "Map renderer reported an error";
          const activeProvider = terrainCandidates[activeTerrainIndex];

          if (!triedAsyncFallback && isTerrainError(activeProvider, message)) {
            triedAsyncFallback = true;
            if (applyTerrainCandidate(activeTerrainIndex + 1, message)) {
              return;
            }
          }

          setMapStatus({ map: "error", message });
        });

        map.once("remove", () => {
          if (terrainRetryTimer !== undefined) {
            window.clearTimeout(terrainRetryTimer);
          }
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

    const [latitude, longitude] = cellToLatLng(selectedHexDetails.h3Id);
    map.flyTo({
      center: [longitude, latitude],
      zoom: selectedHexDetails.tier === "U8" ? 9 : selectedHexDetails.tier === "U5" ? 5.2 : 2.8,
      pitch: 38,
      bearing: -16,
      duration: 900,
      essential: true
    });
  }, [selectedHexDetails]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#f3f8f7]">
      <div className="absolute inset-0 bg-[linear-gradient(#e9f1ef_1px,transparent_1px),linear-gradient(90deg,#e9f1ef_1px,transparent_1px)] bg-[size:52px_52px] opacity-70" />
      <div className="pointer-events-none absolute left-1/2 top-[42%] h-[min(78vw,980px)] w-[min(78vw,980px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#dbecea] shadow-[inset_-80px_-70px_120px_rgba(22,73,79,0.18),0_34px_80px_rgba(46,91,96,0.16)]" />
      <div className="absolute left-1/2 top-[42%] h-[min(78vw,980px)] w-[min(78vw,980px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border border-[#d6e8e4] bg-[#ecf5f3] shadow-[0_30px_90px_rgba(40,78,83,0.16)]">
        <div ref={containerRef} className="h-full w-full" />
        <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.4),transparent_35%),radial-gradient(circle_at_72%_70%,rgba(21,91,99,0.2),transparent_35%)]" />
      </div>
      <MapControls />
      <MeshLegend />
      <MeshTooltip />
      <div className="absolute left-[42%] top-[23%] z-20 hidden rounded-[8px] border border-[#dfe8e6] bg-white/95 p-3 text-xs text-[#52616f] shadow-lg backdrop-blur lg:block">
        <div className="font-mono text-[11px] text-[#24323f]">{selectedHexId}</div>
        <div className="mt-1">Selected vmesh cell</div>
      </div>
    </div>
  );
}

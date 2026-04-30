"use client";

import { useEffect, useMemo, useRef } from "react";
import { H3HexagonLayer } from "@deck.gl/geo-layers";
import { MapboxOverlay } from "@deck.gl/mapbox";
import type { Layer, PickingInfo } from "@deck.gl/core";
import { cellToLatLng } from "h3-js";
import maplibregl from "maplibre-gl";

import { MapControls } from "@/components/Map/MapControls";
import { MeshLegend } from "@/components/Map/MeshLegend";
import { MeshTooltip } from "@/components/Map/MeshTooltip";
import { getAntifragilityColor } from "@/lib/meshScoring";
import {
  createLightBasemapStyle,
  selectTerrainProvider,
  TERRAIN_SOURCE_ID,
  toRasterDemSource
} from "@/lib/terrainSources";
import type { MeshTier, VmeshHexRecord } from "@/lib/vmeshTypes";
import { useVmeshStore } from "@/store/useVmeshStore";

type GlobeCapableMap = maplibregl.Map & {
  setProjection?: (projection: { type: "globe" }) => void;
};

function layerOpacityForTier(tier: MeshTier): number {
  if (tier === "U3") return 120;
  if (tier === "U8") return 185;
  return 165;
}

function buildH3Layer({
  id,
  data,
  selectedHexId,
  opacity,
  onHover,
  onClick
}: {
  id: string;
  data: VmeshHexRecord[];
  selectedHexId: string;
  opacity: number;
  onHover: (info: PickingInfo<VmeshHexRecord>) => void;
  onClick: (info: PickingInfo<VmeshHexRecord>) => void;
}): Layer {
  return new H3HexagonLayer<VmeshHexRecord>({
    id,
    data,
    highPrecision: true,
    pickable: true,
    extruded: true,
    coverage: 0.88,
    elevationScale: 1,
    getHexagon: (record) => record.h3Id,
    getFillColor: (record) => {
      const [r, g, b] = getAntifragilityColor(record.antifragilityScore);
      return [r, g, b, record.h3Id === selectedHexId ? 230 : opacity];
    },
    getLineColor: (record) =>
      record.h3Id === selectedHexId ? [255, 255, 255, 255] : [45, 151, 144, 170],
    getLineWidth: (record) => (record.h3Id === selectedHexId ? 4 : 1),
    getElevation: (record) => record.antifragilityScore * 10,
    lineWidthMinPixels: 1,
    lineWidthMaxPixels: 5,
    material: {
      ambient: 0.45,
      diffuse: 0.6,
      shininess: 24,
      specularColor: [220, 255, 248]
    },
    onHover,
    onClick,
    updateTriggers: {
      getFillColor: [selectedHexId, opacity],
      getLineColor: [selectedHexId],
      getLineWidth: [selectedHexId]
    }
  });
}

export function TerrainGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const layersRef = useRef<Layer[]>([]);
  const initialViewStateRef = useRef(useVmeshStore.getState().viewState);
  const previousSelectedHexRef = useRef(useVmeshStore.getState().selectedHexId);

  const selectedTier = useVmeshStore((state) => state.selectedTier);
  const selectedHexId = useVmeshStore((state) => state.selectedHexId);
  const selectedHexDetails = useVmeshStore((state) => state.selectedHexDetails);
  const activeLayers = useVmeshStore((state) => state.activeLayers);
  const hexDataByTier = useVmeshStore((state) => state.hexDataByTier);
  const terrainProviders = useVmeshStore((state) => state.terrainProviders);
  const selectHex = useVmeshStore((state) => state.selectHex);
  const setHoveredHexInfo = useVmeshStore((state) => state.setHoveredHexInfo);
  const setVisibleHexCount = useVmeshStore((state) => state.setVisibleHexCount);
  const setViewState = useVmeshStore((state) => state.setViewState);
  const setMapStatus = useVmeshStore((state) => state.setMapStatus);
  const setTerrainStatus = useVmeshStore((state) => state.setTerrainStatus);

  const layers = useMemo(() => {
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

    const provider = selectTerrainProvider(terrainProviders);
    const initialViewState = initialViewStateRef.current;
    const map = new maplibregl.Map({
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
    setMapStatus({
      map: "loading",
      terrain: "loading",
      providerId: provider.id,
      message: "Initializing globe canvas"
    });

    const globeMap = map as GlobeCapableMap;
    globeMap.setProjection?.({ type: "globe" });

    map.on("load", () => {
      setMapStatus({
        map: "active",
        providerId: provider.id,
        message: "Globe ready"
      });

      const source = toRasterDemSource(provider);
      if (source) {
        try {
          if (!map.getSource(TERRAIN_SOURCE_ID)) {
            map.addSource(TERRAIN_SOURCE_ID, source);
          }
          map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: 1.5 });
          setTerrainStatus(
            provider.status === "fallback" ? "fallback" : "active",
            `${provider.label} terrain active`
          );
        } catch (error) {
          setTerrainStatus(
            "fallback",
            error instanceof Error ? error.message : "Terrain failed; basemap remains active"
          );
        }
      } else {
        setTerrainStatus("unavailable", `${provider.label} is cataloged but not map-ready in V1`);
      }

      const overlay = new MapboxOverlay({
        interleaved: false,
        layers: layersRef.current
      });
      overlayRef.current = overlay;
      map.addControl(overlay as unknown as maplibregl.IControl);
    });

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
      setMapStatus({ map: "error", message });
    });

    return () => {
      overlayRef.current?.finalize();
      overlayRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [setMapStatus, setTerrainStatus, setViewState, terrainProviders]);

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

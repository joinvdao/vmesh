"use client";

import { useMemo } from "react";
import type { Layer, PickingInfo } from "@deck.gl/core";

import {
  buildH3Layer,
  buildSourceAvailabilityH3Layer,
  buildSelectedH3OutlineLayer
} from "@/components/Map/h3LayerFactory";
import { isH3MacroLayer } from "@/lib/layerCatalog";
import type { MacroCellSummary, VmeshHexRecord } from "@/lib/vmeshTypes";
import { useVmeshStore } from "@/store/useVmeshStore";

type H3HexagonLayerConstructor = typeof import("@deck.gl/geo-layers").H3HexagonLayer;

export interface TerrainGlobeLayersResult {
  layers: Layer[];
  visibleHexCount: number;
}

export function useTerrainGlobeLayers(
  h3LayerConstructor: H3HexagonLayerConstructor | null
): TerrainGlobeLayersResult {
  const selectedTier = useVmeshStore((state) => state.selectedTier);
  const selectedHexId = useVmeshStore((state) => state.selectedHexId);
  const selectedHexDetails = useVmeshStore((state) => state.selectedHexDetails);
  const activeLayers = useVmeshStore((state) => state.activeLayers);
  const hexDataByTier = useVmeshStore((state) => state.hexDataByTier);
  const macroSummariesByH3 = useVmeshStore((state) => state.macroSummariesByH3);
  const selectedMacroLayer = useVmeshStore((state) => state.selectedMacroLayer);
  const macroLayerOpacity = useVmeshStore((state) => state.macroLayerOpacity);
  const selectHex = useVmeshStore((state) => state.selectHex);
  const setHoveredHexInfo = useVmeshStore((state) => state.setHoveredHexInfo);

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

    const handleMacroHover = (info: PickingInfo<MacroCellSummary>) => {
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

    const handleMacroClick = (info: PickingInfo<MacroCellSummary>) => {
      if (!info.object) return;
      selectHex(info.object.h3Id, info.object.tier);
    };

    const nextLayers: Layer[] = [];

    if (activeLayers.context && selectedTier === "U3") {
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

    if (activeLayers.macro && isH3MacroLayer(selectedMacroLayer)) {
      const activeData = hexDataByTier[selectedTier];
      const macroData = activeData
        .map((record) => macroSummariesByH3[record.h3Id])
        .filter((summary): summary is MacroCellSummary => Boolean(summary));
      nextLayers.push(
        buildSourceAvailabilityH3Layer({
          id: `${selectedTier.toLowerCase()}-${selectedMacroLayer}-macro`,
          data: macroData,
          selectedHexId,
          opacity: macroLayerOpacity,
          H3HexagonLayer: h3LayerConstructor,
          onHover: handleMacroHover,
          onClick: handleMacroClick
        })
      );
    }

    nextLayers.push(
      buildSelectedH3OutlineLayer({
        id: "selected-cell-affordance",
        data: [selectedHexDetails],
        selectedHexId,
        H3HexagonLayer: h3LayerConstructor,
        onHover: handleHover,
        onClick: handleClick
      })
    );

    return nextLayers;
  }, [
    activeLayers.context,
    activeLayers.macro,
    hexDataByTier,
    h3LayerConstructor,
    macroLayerOpacity,
    macroSummariesByH3,
    selectedHexDetails,
    selectedHexId,
    selectedMacroLayer,
    selectedTier,
    selectHex,
    setHoveredHexInfo
  ]);

  const visibleHexCount = useMemo(() => {
    const visibleHexIds = new Set<string>([selectedHexDetails.h3Id]);

    if (activeLayers.context && selectedTier === "U3") {
      hexDataByTier.U3.forEach((record) => visibleHexIds.add(record.h3Id));
    }

    if (activeLayers.macro && isH3MacroLayer(selectedMacroLayer)) {
      hexDataByTier[selectedTier].forEach((record) => visibleHexIds.add(record.h3Id));
    }

    return visibleHexIds.size;
  }, [
    activeLayers.context,
    activeLayers.macro,
    hexDataByTier,
    selectedHexDetails.h3Id,
    selectedMacroLayer,
    selectedTier
  ]);

  return { layers, visibleHexCount };
}

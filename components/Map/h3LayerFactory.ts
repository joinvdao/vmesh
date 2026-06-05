import type { Layer, PickingInfo } from "@deck.gl/core";

import type { MacroCellSummary, MeshTier, VmeshHexRecord } from "@/lib/vmeshTypes";

type H3HexagonLayerConstructor = typeof import("@deck.gl/geo-layers").H3HexagonLayer;

export function layerOpacityForTier(tier: MeshTier): number {
  if (tier === "U3") return 120;
  if (tier === "U8") return 185;
  return 165;
}

export function buildH3Layer({
  id,
  data,
  selectedHexId,
  opacity,
  H3HexagonLayer,
  onHover,
  onClick
}: {
  id: string;
  data: VmeshHexRecord[];
  selectedHexId: string;
  opacity: number;
  H3HexagonLayer: H3HexagonLayerConstructor;
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
    getFillColor: (record) => [44, 158, 151, record.h3Id === selectedHexId ? 210 : opacity],
    getLineColor: (record) =>
      record.h3Id === selectedHexId ? [255, 255, 255, 255] : [45, 151, 144, 170],
    getLineWidth: (record) => (record.h3Id === selectedHexId ? 4 : 1),
    getElevation: (record) => (record.h3Id === selectedHexId ? 40 : 18),
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

export function buildSelectedH3OutlineLayer({
  id,
  data,
  selectedHexId,
  H3HexagonLayer,
  onHover,
  onClick
}: {
  id: string;
  data: VmeshHexRecord[];
  selectedHexId: string;
  H3HexagonLayer: H3HexagonLayerConstructor;
  onHover: (info: PickingInfo<VmeshHexRecord>) => void;
  onClick: (info: PickingInfo<VmeshHexRecord>) => void;
}): Layer {
  return new H3HexagonLayer<VmeshHexRecord>({
    id,
    data,
    highPrecision: true,
    pickable: true,
    extruded: false,
    coverage: 0.98,
    getHexagon: (record) => record.h3Id,
    getFillColor: (record) =>
      record.h3Id === selectedHexId ? [20, 184, 166, 22] : [20, 184, 166, 10],
    getLineColor: (record) =>
      record.h3Id === selectedHexId ? [210, 255, 250, 245] : [20, 184, 166, 130],
    getLineWidth: (record) => (record.h3Id === selectedHexId ? 3 : 1),
    lineWidthMinPixels: 1,
    lineWidthMaxPixels: 4,
    onHover,
    onClick,
    updateTriggers: {
      getFillColor: [selectedHexId],
      getLineColor: [selectedHexId],
      getLineWidth: [selectedHexId]
    }
  });
}

export function buildSourceAvailabilityH3Layer({
  id,
  data,
  selectedHexId,
  opacity,
  H3HexagonLayer,
  onHover,
  onClick
}: {
  id: string;
  data: MacroCellSummary[];
  selectedHexId: string;
  opacity: number;
  H3HexagonLayer: H3HexagonLayerConstructor;
  onHover: (info: PickingInfo<MacroCellSummary>) => void;
  onClick: (info: PickingInfo<MacroCellSummary>) => void;
}): Layer {
  const alpha = Math.round(Math.min(0.86, Math.max(0.16, opacity)) * 255);

  return new H3HexagonLayer<MacroCellSummary>({
    id,
    data,
    highPrecision: true,
    pickable: true,
    extruded: false,
    coverage: 0.82,
    getHexagon: (summary) => summary.h3Id,
    getFillColor: (summary) =>
      summary.h3Id === selectedHexId ? [20, 184, 166, Math.min(245, alpha + 42)] : [47, 151, 147, alpha],
    getLineColor: (summary) =>
      summary.h3Id === selectedHexId ? [255, 255, 255, 245] : [178, 222, 214, 100],
    getLineWidth: (summary) => (summary.h3Id === selectedHexId ? 3 : 0.8),
    lineWidthMinPixels: 1,
    lineWidthMaxPixels: 4,
    onHover,
    onClick,
    updateTriggers: {
      getFillColor: [selectedHexId, alpha],
      getLineColor: [selectedHexId],
      getLineWidth: [selectedHexId]
    }
  });
}

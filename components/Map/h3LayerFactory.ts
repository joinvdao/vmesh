import type { Layer, PickingInfo } from "@deck.gl/core";

import { getAntifragilityColor } from "@/lib/meshScoring";
import type { MeshTier, VmeshHexRecord } from "@/lib/vmeshTypes";

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

import { macroLayerCatalog } from "@/lib/layer-catalog/catalogData";
import type {
  LayerCatalogSummary,
  MacroLayerCategory,
  MacroLayerDefinition
} from "@/lib/layer-catalog/types";
import type { MacroLayerId } from "@/lib/vmeshTypes";

export type {
  LayerCatalogSummary,
  LayerDataStatus,
  LayerReadiness,
  LayerSourceType,
  LayerVisualizationType,
  MacroLayerCategory,
  MacroLayerDefinition
} from "@/lib/layer-catalog/types";

const categoryOrder: MacroLayerCategory[] = [
  "terrain",
  "climate",
  "hazard",
  "solar",
  "vegetation",
  "imagery"
];

function createCategoryCounts(): Record<MacroLayerCategory, number> {
  return {
    terrain: 0,
    climate: 0,
    hazard: 0,
    solar: 0,
    vegetation: 0,
    imagery: 0
  };
}

export function getMacroLayerCatalog(): MacroLayerDefinition[] {
  return [...macroLayerCatalog];
}

export function getMacroLayerCategories(): MacroLayerCategory[] {
  return [...categoryOrder];
}

export function getMacroLayersByCategory(
  layers: MacroLayerDefinition[],
  category: MacroLayerCategory
): MacroLayerDefinition[] {
  return layers.filter((layerDefinition) => layerDefinition.category === category);
}

export function getLayerCatalogEntry(
  layers: MacroLayerDefinition[],
  layerId: MacroLayerId
): MacroLayerDefinition | undefined {
  const legacyLayerMap: Partial<Record<MacroLayerId, MacroLayerId>> = {
    weather: "climate-weather",
    flood: "hazard-flood-lowland",
    fire: "hazard-fire-weather",
    solar: "solar-potential",
    "climate-trend": "climate-heat"
  };
  const normalizedLayerId = legacyLayerMap[layerId] ?? layerId;
  return layers.find((layerDefinition) => layerDefinition.id === normalizedLayerId);
}

export function getMapReadyMacroLayers(layers: MacroLayerDefinition[]): MacroLayerDefinition[] {
  return layers.filter((layerDefinition) => layerDefinition.mapReady);
}

export function isH3MacroLayer(layerId: MacroLayerId): boolean {
  return getLayerCatalogEntry(getMacroLayerCatalog(), layerId)?.visualizationType === "h3";
}

export function createLayerCatalogSummary(
  layers: MacroLayerDefinition[] = getMacroLayerCatalog()
): LayerCatalogSummary {
  const categories = createCategoryCounts();

  layers.forEach((layerDefinition) => {
    categories[layerDefinition.category] += 1;
  });

  return {
    totalLayers: layers.length,
    publicDemoSafeLayers: layers.filter((layerDefinition) => layerDefinition.publicDemoSafe).length,
    mapReadyLayers: layers.filter((layerDefinition) => layerDefinition.mapReady).length,
    preprocessingRequiredLayers: layers.filter(
      (layerDefinition) => layerDefinition.preprocessingRequired
    ).length,
    categories
  };
}

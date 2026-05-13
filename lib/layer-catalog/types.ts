import type { MacroLayerId } from "@/lib/vmeshTypes";

export type MacroLayerCategory =
  | "terrain"
  | "climate"
  | "hazard"
  | "solar"
  | "vegetation"
  | "imagery";

export type LayerReadiness =
  | "active-runtime"
  | "payload-ready"
  | "configured-source"
  | "broker-planned"
  | "research"
  | "premium"
  | "disabled";

export type LayerDataStatus = "idle" | "loading" | "active" | "fallback" | "unavailable" | "error";

export type LayerSourceType = "live" | "cached" | "mock" | "derived" | "static" | "future-provider";

export type LayerVisualizationType =
  | "raster"
  | "vector"
  | "h3"
  | "hillshade"
  | "contour"
  | "marker"
  | "none";

export interface MacroLayerDefinition {
  id: MacroLayerId;
  label: string;
  category: MacroLayerCategory;
  description: string;
  providerIds: string[];
  readiness: LayerReadiness;
  status: LayerDataStatus;
  sourceType: LayerSourceType;
  visualizationType: LayerVisualizationType;
  defaultOpacity: number;
  attribution: string;
  license: string;
  freshness: string;
  confidence: number;
  limitations: string;
  mapReady: boolean;
  preprocessingRequired: boolean;
  publicDemoSafe: boolean;
}

export interface LayerCatalogSummary {
  totalLayers: number;
  publicDemoSafeLayers: number;
  mapReadyLayers: number;
  preprocessingRequiredLayers: number;
  categories: Record<MacroLayerCategory, number>;
}

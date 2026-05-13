import type { MacroProvenance } from "@/lib/types/macro";

export type ImageryLayerId =
  | "sentinel2-recent-clear"
  | "sen2sr-enhanced-preview"
  | "ndvi"
  | "water"
  | "soil-vegetation";

export interface ImageryCloudAssessment {
  sceneCloudCover: number;
  clearPixelRatioAoi: number;
  maskMethod: "metadata-only" | "scl" | "scl-fixture" | "future-processing";
  accepted: boolean;
  reason: string;
}

export interface ImageryTileManifest {
  id: string;
  sourceSceneId: string;
  provider: string;
  acquiredAt: string;
  processedAt: string;
  bands: string[];
  sourceResolutionMeters: number;
  resolutionMeters: number;
  scaleFactor: number;
  superResolutionModel: string;
  upscalerRepositoryUrl: string;
  truthStatus: "imagery-inferred-context" | "source-preview" | "source-backed-raster";
  cloudCoverScene: number;
  clearPixelRatioAoi: number;
  bounds: [number, number, number, number];
  h3Coverage: string[];
  license: string;
  provenance: MacroProvenance;
  tileUrl: string;
  ndviMean: number;
  ndwiMean: number;
  nbrMean: number;
  vegetationCoverProxy: number;
  bareSoilProxy: number;
  waterPresenceProxy: number;
  cloudFreeConfidence: number;
}

export interface SentinelSuperResolutionPlan {
  h3Id: string;
  collection: "sentinel-2-l2a";
  stacApiUrl: string;
  bounds: [number, number, number, number];
  sourceResolutionMeters: number;
  targetResolutionMeters: number;
  scaleFactor: number;
  bands: ["B04", "B03", "B02", "B08"];
  futureBandsMultispectral: string[];
  modelVariant: "SEN2SRLite";
  modelId: string;
  upscalerRepositoryUrl: string;
  cloudGates: {
    sceneCloudCoverMax: number;
    aoiClearPixelRatioMin: number;
    maskMethod: "SCL";
  };
  outputArtifacts: string[];
  processingLocation: "offline-worker" | "local-hub" | "server-job";
  truthStatus: "imagery-inferred-context";
  cacheKey: string;
  warnings: string[];
}

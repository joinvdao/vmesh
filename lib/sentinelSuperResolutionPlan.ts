import type { SentinelSuperResolutionPlan } from "@/lib/vmeshTypes";

export const EARTH_SEARCH_STAC_URL = "https://earth-search.aws.element84.com/v1/search";
export const SENTINEL_L2A_SOURCE_RESOLUTION_METERS = 10;
export const SEN2SR_TARGET_RESOLUTION_METERS = 2.5;
export const SEN2SR_SCALE_FACTOR = 4;
export const SEN2SR_LITE_RGBN_MODEL_ID = "SEN2SRLite/NonReference_RGBN_x4";
export const SEN2SR_REPOSITORY_URL = "https://github.com/ESAOpenSR/SEN2SR";
export const SENTINEL_RGBN_BANDS = ["B04", "B03", "B02", "B08"] as const;
export const SENTINEL_FUTURE_MULTISPECTRAL_BANDS = [
  "B02",
  "B03",
  "B04",
  "B05",
  "B06",
  "B07",
  "B08",
  "B8A",
  "B11",
  "B12"
];

export interface SentinelSuperResolutionPlanInput {
  h3Id: string;
  bounds: [number, number, number, number];
  acquiredAt?: string;
  cloudCoverMax?: number;
  aoiClearPixelRatioMin?: number;
  targetResolutionMeters?: number;
  processingLocation?: SentinelSuperResolutionPlan["processingLocation"];
}

export function createSentinelSuperResolutionPlan({
  h3Id,
  bounds,
  acquiredAt = "latest",
  cloudCoverMax = 10,
  aoiClearPixelRatioMin = 0.95,
  targetResolutionMeters = SEN2SR_TARGET_RESOLUTION_METERS,
  processingLocation = "offline-worker"
}: SentinelSuperResolutionPlanInput): SentinelSuperResolutionPlan {
  if (targetResolutionMeters <= 0) {
    throw new Error("targetResolutionMeters must be greater than 0.");
  }

  const scaleFactor = SENTINEL_L2A_SOURCE_RESOLUTION_METERS / targetResolutionMeters;
  const roundedScaleFactor = Math.round(scaleFactor * 1000) / 1000;
  const targetLabel = targetResolutionMeters.toString().replace(".", "p");
  const cacheKey = [
    "sentinel2-l2a",
    h3Id,
    acquiredAt,
    `cloud${cloudCoverMax}`,
    `clear${aoiClearPixelRatioMin}`,
    `sen2srlite-x${roundedScaleFactor}`,
    `${targetLabel}m`
  ].join(":");

  return {
    h3Id,
    collection: "sentinel-2-l2a",
    stacApiUrl: EARTH_SEARCH_STAC_URL,
    bounds,
    sourceResolutionMeters: SENTINEL_L2A_SOURCE_RESOLUTION_METERS,
    targetResolutionMeters,
    scaleFactor: roundedScaleFactor,
    bands: [...SENTINEL_RGBN_BANDS],
    futureBandsMultispectral: SENTINEL_FUTURE_MULTISPECTRAL_BANDS,
    modelVariant: "SEN2SRLite",
    modelId: SEN2SR_LITE_RGBN_MODEL_ID,
    upscalerRepositoryUrl: SEN2SR_REPOSITORY_URL,
    cloudGates: {
      sceneCloudCoverMax: cloudCoverMax,
      aoiClearPixelRatioMin,
      maskMethod: "SCL"
    },
    outputArtifacts: [
      "source-clipped-cog",
      "cloud-mask-cog",
      "sen2sr-cog",
      "preview-png",
      "manifest-json",
      "raster-pmtiles",
      "derived-h3-summary"
    ],
    processingLocation,
    truthStatus: "imagery-inferred-context",
    cacheKey,
    warnings: [
      "Run Sentinel discovery, SCL cloud validation, SEN2SRLite, COG writing, and tile production outside the browser.",
      "SEN2SR output is AI-assisted imagery context, not measured 2.5 m orthophoto truth.",
      "Do not use super-resolution output for legal boundaries, terrain truth, emergency certification, or exact private infrastructure claims."
    ]
  };
}

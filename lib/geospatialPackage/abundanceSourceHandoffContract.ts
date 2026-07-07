import type {
  BaGeospatialPackage,
  BaGeospatialPackageRequest,
  BaGeospatialSegmentId,
  BaSourceRecord
} from "@/lib/geospatialPackage/baPackage";
import type { BuildingPackageWorkerHandoff } from "@/lib/geospatialPackage/buildingPackageWorker";
import type { TerrainSourceAdapterPlan } from "@/lib/geospatialPackage/terrainSourceAdapters";
import type { PackageArtifactKind, PackageLayerId } from "@/lib/geospatialPackage/types";
import type { SourceRankingReport } from "@/lib/geospatialPackage/sourceRanking";

export const ABUNDANCE_SOURCE_HANDOFF_SCHEMA_VERSION = "vmesh-abundance-source-handoff-v1";

export const ABUNDANCE_SOURCE_HANDOFF_DEFAULT_EDGE_METERS = 3000;
export const ABUNDANCE_SOURCE_HANDOFF_DEFAULT_GRID_SIZE = 257;

export type AbundanceSourceHandoffLayerStatus =
  | "ready-to-execute"
  | "requires-worker"
  | "source-ref-only"
  | "blocked";

export type AbundanceSourceHandoffRecipeKind =
  | "terrain-source-adapter"
  | "building-worker-handoff"
  | "ba-fetch-recipe"
  | "blocked-review";

export type AbundanceExpectedPayloadKind =
  | "terrain-raster"
  | "terrain-derived-vector"
  | "vector-roads"
  | "vector-buildings"
  | "environment-vector"
  | "landcover-raster"
  | "semantic-ground-vector"
  | "climate-context"
  | "imagery-context"
  | "parcel-boundary"
  | "source-ref-only";

export interface AbundanceSourceHandoffRequest extends Omit<
  BaGeospatialPackageRequest,
  "consumerAppId"
> {
  consumerAppId?: string;
  edgeMeters?: number;
  gridSize?: number;
  includeReviewOnly?: boolean;
  parcelBoundaryContext?: {
    provided: boolean;
    vertexCount: number | null;
    label?: string;
  };
}

export interface AbundanceSourceHandoffRecipe {
  id: string;
  kind: AbundanceSourceHandoffRecipeKind;
  sourceId: string | null;
  adapterId: string | null;
  artifactKinds: PackageArtifactKind[];
  parameterSlots: string[];
  steps: string[];
  status: AbundanceSourceHandoffLayerStatus;
  requiredWorker: "vmesh" | "abundance" | "operator-review";
}

export interface AbundanceSourceHandoffLayer {
  layerId: PackageLayerId;
  segmentIds: BaGeospatialSegmentId[];
  expectedPayloadKind: AbundanceExpectedPayloadKind;
  status: AbundanceSourceHandoffLayerStatus;
  selectedSourceIds: string[];
  sourceRefs: BaSourceRecord[];
  recipes: AbundanceSourceHandoffRecipe[];
  warnings: string[];
  gaps: string[];
}

export interface AbundanceSourceHandoff {
  schemaVersion: typeof ABUNDANCE_SOURCE_HANDOFF_SCHEMA_VERSION;
  createdAt: string;
  runClass: "dry-run";
  request: {
    consumerAppId: string;
    edgeMeters: number;
    gridSize: number;
    segments: BaGeospatialSegmentId[];
  };
  frame: {
    role: "source-slice-frame";
    shape: "square";
    edgeMeters: number;
    gridSize: number;
    parcelBoundaryRole: "overlay-only";
    notes: string[];
  };
  parcelBoundaryContext: {
    provided: boolean;
    role: "overlay-only";
    coordinateDisclosure: "redacted-request-geometry" | "not-provided";
    vertexCount: number | null;
    label: string | null;
    notes: string[];
  };
  jurisdiction: {
    status: "h3-only" | "resolved" | "not-resolved";
    h3Id: string;
    countryCode: string | null;
    regionCode: string | null;
    municipality: string | null;
    resolver: "vmesh.jurisdiction_at" | "pending";
    warnings: string[];
  };
  terrain: {
    selectedSourceIds: string[];
    rejectedSourceIds: string[];
    roles: Array<{
      sourceId: string;
      sourceRole: string;
      resolution: string;
      confidence: number;
      selectedForAoi: boolean;
    }>;
  };
  coverageEvidence: BaGeospatialPackage["coverage"];
  sourceRanking: SourceRankingReport;
  baPackage: BaGeospatialPackage;
  layers: AbundanceSourceHandoffLayer[];
  terrainAdapterPlans: TerrainSourceAdapterPlan[];
  buildingWorkerHandoff: BuildingPackageWorkerHandoff | null;
  warnings: string[];
  gaps: string[];
  nextActions: string[];
}

export const ABUNDANCE_SEGMENTS_BY_LAYER: Record<PackageLayerId, BaGeospatialSegmentId[]> = {
  terrain: ["terrain_elevation"],
  contours: ["terrain_elevation"],
  imagery: ["imagery_observation"],
  water: ["water_hydrology"],
  hydrology: ["water_hydrology"],
  roads: ["access_infrastructure"],
  buildings: ["access_infrastructure"],
  parcels: ["land_property_planning"],
  vegetation: ["soils_landcover"],
  landcover: ["soils_landcover"],
  climate: ["climate_weather"],
  "field-boundaries": ["land_property_planning"]
};

export const ABUNDANCE_PAYLOAD_KIND_BY_LAYER: Record<PackageLayerId, AbundanceExpectedPayloadKind> =
  {
    terrain: "terrain-raster",
    contours: "terrain-derived-vector",
    imagery: "imagery-context",
    roads: "vector-roads",
    buildings: "vector-buildings",
    water: "environment-vector",
    vegetation: "semantic-ground-vector",
    parcels: "parcel-boundary",
    climate: "climate-context",
    hydrology: "environment-vector",
    landcover: "landcover-raster",
    "field-boundaries": "parcel-boundary"
  };

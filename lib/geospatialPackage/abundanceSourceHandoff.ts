import {
  createBaGeospatialPackage,
  getBaGeospatialLayersForSegments,
  type BaFetchRecipe,
  type BaGeospatialPackage,
  type BaGeospatialSegmentId,
  type BaSourceRecord
} from "@/lib/geospatialPackage/baPackage";
import {
  createBuildingPackageWorkerHandoff,
  type BuildingPackageWorkerHandoff
} from "@/lib/geospatialPackage/buildingPackageWorker";
import {
  createLiveDtmSourceAdapterPlans,
  createLiveDtmSourceAdapterPlan,
  createTerrainSourceAdapterPlan,
  isSourceNativeTerrainAdapterSupported,
  type TerrainSourceAdapterOptions,
  type TerrainSourceAdapterPlan
} from "@/lib/geospatialPackage/terrainSourceAdapters";
import { getGeospatialSourceRegistry } from "@/lib/geospatialPackage/sourceRegistry";
import { createSourceRanking } from "@/lib/geospatialPackage/sourceRanking";
import {
  parcelBoundaryContext,
  publicBuildingWorkerHandoff
} from "@/lib/geospatialPackage/abundanceSourceHandoffRedaction";
import {
  ABUNDANCE_PAYLOAD_KIND_BY_LAYER,
  ABUNDANCE_SEGMENTS_BY_LAYER,
  ABUNDANCE_SOURCE_HANDOFF_DEFAULT_EDGE_METERS,
  ABUNDANCE_SOURCE_HANDOFF_DEFAULT_GRID_SIZE,
  ABUNDANCE_SOURCE_HANDOFF_SCHEMA_VERSION,
  type AbundanceSourceHandoff,
  type AbundanceSourceHandoffLayer,
  type AbundanceSourceHandoffLayerStatus,
  type AbundanceSourceHandoffRecipe,
  type AbundanceSourceHandoffRequest
} from "@/lib/geospatialPackage/abundanceSourceHandoffContract";
import type {
  PackageArtifactKind,
  PackageAoiInput,
  PackageLayerId,
  PackagePlanRequest
} from "@/lib/geospatialPackage/types";

function createdAt(options: { now?: () => Date }) {
  return (options.now?.() ?? new Date("2026-07-06T00:00:00.000Z")).toISOString();
}

interface AbundanceSourceHandoffOptions {
  now?: () => Date;
  terrainAdapterPlans?: TerrainSourceAdapterPlan[];
}

interface LiveAbundanceSourceHandoffOptions extends AbundanceSourceHandoffOptions {
  terrainSourceAdapterOptions?: TerrainSourceAdapterOptions;
  includeFallbackTerrainPlans?: boolean;
}

function finitePositive(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function wrapLongitude(longitude: number) {
  const wrapped = ((((longitude + 180) % 360) + 360) % 360) - 180;
  return wrapped === 180 ? -180 : wrapped;
}

export function abundanceSourceSliceBoundsFromCentroid({
  centroid,
  edgeMeters
}: {
  centroid: NonNullable<PackageAoiInput["centroid"]>;
  edgeMeters: number;
}): [number, number, number, number] {
  const halfMeters = edgeMeters * 0.5;
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng = Math.max(
    12_000,
    metersPerDegreeLat * Math.cos((centroid.latitude * Math.PI) / 180)
  );
  const halfLatDegrees = halfMeters / metersPerDegreeLat;
  const halfLngDegrees = halfMeters / metersPerDegreeLng;

  return [
    Number(wrapLongitude(centroid.longitude - halfLngDegrees).toFixed(7)),
    Number(clamp(centroid.latitude - halfLatDegrees, -90, 90).toFixed(7)),
    Number(wrapLongitude(centroid.longitude + halfLngDegrees).toFixed(7)),
    Number(clamp(centroid.latitude + halfLatDegrees, -90, 90).toFixed(7))
  ];
}

function sourceSliceAoiForRequest(input: AbundanceSourceHandoffRequest): PackageAoiInput {
  if (input.aoi.bounds || !input.aoi.centroid) return input.aoi;

  const edgeMeters = finitePositive(input.edgeMeters, ABUNDANCE_SOURCE_HANDOFF_DEFAULT_EDGE_METERS);

  return {
    ...input.aoi,
    bounds: abundanceSourceSliceBoundsFromCentroid({
      centroid: input.aoi.centroid,
      edgeMeters
    })
  };
}

function packageRequestFromBaPackage(
  baPackage: BaGeospatialPackage,
  preferredSourceIds: string[]
): PackagePlanRequest {
  return {
    aoi:
      baPackage.h3Context.coordinateDisclosure === "h3-cell"
        ? { h3Id: baPackage.h3Context.h3Id, label: baPackage.h3Context.label }
        : {
            bounds: baPackage.h3Context.bounds,
            label: baPackage.h3Context.label
          },
    layers: ["terrain"],
    preferredSourceIds,
    consumerAppId: baPackage.request.consumerAppId,
    offline: true
  };
}

function terrainAdapterPlansForPackage(
  baPackage: BaGeospatialPackage,
  options: AbundanceSourceHandoffOptions = {}
): TerrainSourceAdapterPlan[] {
  if (options.terrainAdapterPlans) return options.terrainAdapterPlans;

  const terrainSources = baPackage.sourceRecords.filter(
    (source) =>
      source.segment === "terrain_elevation" &&
      source.selectedForAoi &&
      isSourceNativeTerrainAdapterSupported(source.id)
  );

  return terrainSources.map((source) =>
    createTerrainSourceAdapterPlan({
      request: packageRequestFromBaPackage(baPackage, [source.id])
    })
  );
}

function selectedReadyTerrainSourceId(plans: TerrainSourceAdapterPlan[]) {
  return (
    plans.find(
      (plan) =>
        plan.status === "ready" &&
        plan.selectedSource?.id &&
        plan.inputRefs.some(
          (ref) => ref.role === "terrain-source" && ref.kind !== "source-index-required"
        )
    )?.selectedSource?.id ?? null
  );
}

function applyLiveTerrainSelection(
  baPackage: BaGeospatialPackage,
  terrainAdapterPlans: TerrainSourceAdapterPlan[],
  strictLiveResolution = false
): BaGeospatialPackage {
  const selectedTerrainSourceId = selectedReadyTerrainSourceId(terrainAdapterPlans);
  if (!selectedTerrainSourceId && !strictLiveResolution) return baPackage;

  const sourceRecords = baPackage.sourceRecords.map((source) =>
    source.segment !== "terrain_elevation"
      ? source
      : {
          ...source,
          selectedForAoi: selectedTerrainSourceId !== null && source.id === selectedTerrainSourceId,
          warnings:
            source.id === selectedTerrainSourceId
              ? source.warnings.filter((warning) => warning !== "source_ref_only")
              : Array.from(new Set(["source_ref_only", ...source.warnings]))
        }
  );
  const coverage = baPackage.coverage.map((record) =>
    sourceRecords.some(
      (source) =>
        source.segment === "terrain_elevation" &&
        source.id === record.sourceId &&
        source.selectedForAoi
    )
      ? { ...record, coverageStatus: "selected-for-aoi" as const }
      : sourceRecords.some(
            (source) => source.segment === "terrain_elevation" && source.id === record.sourceId
          )
        ? { ...record, coverageStatus: "coverage-check-required" as const }
        : record
  );

  return {
    ...baPackage,
    sourceRecords,
    coverage
  };
}

function findFetchRecipe(recipes: BaFetchRecipe[], sourceId: string): BaFetchRecipe | null {
  return recipes.find((recipe) => recipe.sourceId === sourceId) ?? null;
}

function recipeFromFetchRecipe(recipe: BaFetchRecipe): AbundanceSourceHandoffRecipe {
  return {
    id: recipe.id,
    kind: "ba-fetch-recipe",
    sourceId: recipe.sourceId,
    adapterId: recipe.adapter,
    artifactKinds: recipe.artifactKinds,
    parameterSlots: ["{bbox}", "{lat}", "{lon}", "{h3}"],
    steps: recipe.steps,
    status: "requires-worker",
    requiredWorker: "abundance"
  };
}

function terrainRecipeFromPlan(plan: TerrainSourceAdapterPlan): AbundanceSourceHandoffRecipe {
  return {
    id: `${plan.packageId}:terrain-source-adapter:${plan.selectedSource?.id ?? "unselected"}`,
    kind: "terrain-source-adapter",
    sourceId: plan.selectedSource?.id ?? null,
    adapterId: plan.toolProfile?.toolId ? `terrain:${plan.toolProfile.toolId}` : null,
    artifactKinds: Array.from(new Set(plan.inputRefs.map((ref) => artifactKindForTerrainRef(ref)))),
    parameterSlots: ["{bbox}"],
    steps: plan.workerNextSteps,
    status: plan.status === "ready" ? "ready-to-execute" : "requires-worker",
    requiredWorker: "abundance"
  };
}

function artifactKindForTerrainRef(
  ref: TerrainSourceAdapterPlan["inputRefs"][number]
): PackageArtifactKind {
  if (ref.format === "stac-json" || ref.format === "json") return "api";
  if (ref.format === "zip" || ref.format === "sevenzip") return "api";
  return "cog";
}

function buildingRecipeFromHandoff(
  handoff: BuildingPackageWorkerHandoff
): AbundanceSourceHandoffRecipe {
  return {
    id: handoff.workerRequest.jobId,
    kind: "building-worker-handoff",
    sourceId: handoff.workerRequest.selectedSourceId,
    adapterId: "overture:buildings",
    artifactKinds: ["geoparquet", "manifest"],
    parameterSlots: ["{bbox}"],
    steps: handoff.workerRequest.workerSteps,
    status: handoff.workerRequest.output.status === "blocked" ? "blocked" : "requires-worker",
    requiredWorker: "abundance"
  };
}

function statusForLayer({
  layerId,
  sourceRefs,
  recipes,
  gaps
}: {
  layerId: PackageLayerId;
  sourceRefs: BaSourceRecord[];
  recipes: AbundanceSourceHandoffRecipe[];
  gaps: string[];
}): AbundanceSourceHandoffLayerStatus {
  if (sourceRefs.length === 0) return "blocked";
  if (
    (layerId === "terrain" || layerId === "contours") &&
    sourceRefs.every((source) => !source.selectedForAoi)
  ) {
    return "blocked";
  }
  if (recipes.some((recipe) => recipe.status === "ready-to-execute")) {
    return "ready-to-execute";
  }
  if (recipes.some((recipe) => recipe.status === "requires-worker")) {
    return "requires-worker";
  }
  if (gaps.length > 0) return "blocked";
  if (layerId === "parcels" || layerId === "field-boundaries") return "blocked";
  return "source-ref-only";
}

function layerGaps({
  baPackage,
  segmentIds,
  sourceRefs
}: {
  baPackage: BaGeospatialPackage;
  segmentIds: BaGeospatialSegmentId[];
  sourceRefs: BaSourceRecord[];
}) {
  const segmentGaps = baPackage.gaps.filter((gap) =>
    segmentIds.some((segment) => gap.startsWith(`${segment}:`))
  );

  if (sourceRefs.length > 0) return segmentGaps;

  return segmentGaps.length > 0
    ? segmentGaps
    : ["No reviewed source refs are available for this layer."];
}

function createLayer({
  layerId,
  baPackage,
  terrainAdapterPlans,
  buildingWorkerHandoff
}: {
  layerId: PackageLayerId;
  baPackage: BaGeospatialPackage;
  terrainAdapterPlans: TerrainSourceAdapterPlan[];
  buildingWorkerHandoff: BuildingPackageWorkerHandoff | null;
}): AbundanceSourceHandoffLayer {
  const segmentIds = ABUNDANCE_SEGMENTS_BY_LAYER[layerId];
  const sourceRefs = baPackage.sourceRecords.filter((source) =>
    segmentIds.includes(source.segment)
  );
  const recipes = sourceRefs
    .map((source) => findFetchRecipe(baPackage.fetchRecipes, source.id))
    .filter((recipe): recipe is BaFetchRecipe => recipe !== null)
    .map(recipeFromFetchRecipe);

  if (layerId === "terrain" || layerId === "contours") {
    recipes.unshift(
      ...terrainAdapterPlans.filter((plan) => plan.selectedSource?.id).map(terrainRecipeFromPlan)
    );
  }

  if (layerId === "buildings" && buildingWorkerHandoff) {
    recipes.unshift(buildingRecipeFromHandoff(buildingWorkerHandoff));
  }

  if (sourceRefs.length === 0) {
    recipes.push({
      id: `${layerId}:blocked-review`,
      kind: "blocked-review",
      sourceId: null,
      adapterId: null,
      artifactKinds: ["none"],
      parameterSlots: [],
      steps: ["Review and promote a source before requesting this layer."],
      status: "blocked",
      requiredWorker: "operator-review"
    });
  }

  const gaps = layerGaps({ baPackage, segmentIds, sourceRefs });
  return {
    layerId,
    segmentIds,
    expectedPayloadKind: ABUNDANCE_PAYLOAD_KIND_BY_LAYER[layerId],
    status: statusForLayer({ layerId, sourceRefs, recipes, gaps }),
    selectedSourceIds: sourceRefs
      .filter((source) => source.selectedForAoi)
      .map((source) => source.id),
    sourceRefs,
    recipes,
    warnings: Array.from(
      new Set([
        ...sourceRefs.flatMap((source) => source.warnings),
        ...(layerId === "vegetation" || layerId === "landcover"
          ? ["Abundance must carry decoded semantic masks or vegetation occupancy cells."]
          : []),
        ...(layerId === "soil"
          ? [
              "Soil context is ranked separately from terrain and must preserve model/survey confidence."
            ]
          : []),
        ...(layerId === "ecology"
          ? [
              "Ecology context is ranked separately from terrain and must not imply species-level truth."
            ]
          : []),
        ...(layerId === "buildings"
          ? ["Do not synthesize building footprints when source extraction returns empty."]
          : [])
      ])
    ),
    gaps
  };
}

function terrainSummary(baPackage: BaGeospatialPackage): AbundanceSourceHandoff["terrain"] {
  const terrainSources = baPackage.sourceRecords.filter(
    (source) => source.segment === "terrain_elevation"
  );

  return {
    selectedSourceIds: terrainSources
      .filter((source) => source.selectedForAoi)
      .map((source) => source.id),
    rejectedSourceIds: terrainSources
      .filter((source) => !source.selectedForAoi)
      .map((source) => source.id),
    roles: terrainSources.map((source) => ({
      sourceId: source.id,
      sourceRole: source.sourceRole,
      resolution: source.resolution,
      confidence: source.confidence,
      selectedForAoi: source.selectedForAoi
    }))
  };
}

function selectedSourceIdsByLayer(layers: AbundanceSourceHandoffLayer[]) {
  return Object.fromEntries(
    layers.map((layer) => [layer.layerId, layer.selectedSourceIds])
  ) as Partial<Record<PackageLayerId, string[]>>;
}

export function createAbundanceSourceHandoff(
  input: AbundanceSourceHandoffRequest,
  options: AbundanceSourceHandoffOptions = {}
): AbundanceSourceHandoff {
  const consumerAppId = input.consumerAppId ?? "building-abundance";
  const sourceSliceAoi = sourceSliceAoiForRequest(input);
  const baseBaPackage = createBaGeospatialPackage({
    ...input,
    aoi: sourceSliceAoi,
    consumerAppId
  });
  const terrainAdapterPlans = terrainAdapterPlansForPackage(baseBaPackage, options);
  const baPackage = applyLiveTerrainSelection(
    baseBaPackage,
    terrainAdapterPlans,
    options.terrainAdapterPlans !== undefined
  );
  const layers = getBaGeospatialLayersForSegments(baPackage.request.segments);
  const buildingWorkerHandoff = layers.includes("buildings")
    ? publicBuildingWorkerHandoff(
        createBuildingPackageWorkerHandoff({
          aoi: sourceSliceAoi,
          consumerAppId,
          offline: true
        }),
        input.includeReviewOnly === true
      )
    : null;

  const handoffLayers = layers.map((layerId) =>
    createLayer({
      layerId,
      baPackage,
      terrainAdapterPlans,
      buildingWorkerHandoff
    })
  );
  const gaps = Array.from(
    new Set([...baPackage.gaps, ...handoffLayers.flatMap((layer) => layer.gaps)])
  );
  const sourceRanking = createSourceRanking({
    layerIds: layers,
    registrySources: getGeospatialSourceRegistry(),
    sourceRecords: baPackage.sourceRecords,
    selectedSourceIdsByLayer: selectedSourceIdsByLayer(handoffLayers),
    terrainAdapterPlans
  });

  return {
    schemaVersion: ABUNDANCE_SOURCE_HANDOFF_SCHEMA_VERSION,
    createdAt: createdAt(options),
    runClass: "dry-run",
    request: {
      consumerAppId,
      edgeMeters: input.edgeMeters ?? ABUNDANCE_SOURCE_HANDOFF_DEFAULT_EDGE_METERS,
      gridSize: input.gridSize ?? ABUNDANCE_SOURCE_HANDOFF_DEFAULT_GRID_SIZE,
      segments: baPackage.request.segments
    },
    frame: {
      role: "source-slice-frame",
      shape: "square",
      edgeMeters: input.edgeMeters ?? ABUNDANCE_SOURCE_HANDOFF_DEFAULT_EDGE_METERS,
      gridSize: input.gridSize ?? ABUNDANCE_SOURCE_HANDOFF_DEFAULT_GRID_SIZE,
      parcelBoundaryRole: "overlay-only",
      notes: [
        "The user parcel boundary selects context and renders as an overlay; it does not change the source-slice frame.",
        "This handoff contains source refs and executable recipes, not raw provider payloads."
      ]
    },
    parcelBoundaryContext: parcelBoundaryContext(input),
    jurisdiction: {
      status: "h3-only",
      h3Id: baPackage.h3Context.h3Id,
      countryCode: null,
      regionCode: null,
      municipality: null,
      resolver: "pending",
      warnings: [
        "Jurisdiction deepening is not attached to this in-memory contract yet; use vmesh.jurisdiction_at or the future resolver route before coverage-aware source ranking."
      ]
    },
    terrain: terrainSummary(baPackage),
    coverageEvidence: baPackage.coverage,
    sourceRanking,
    baPackage,
    layers: handoffLayers,
    terrainAdapterPlans,
    buildingWorkerHandoff,
    warnings: Array.from(
      new Set([
        ...baPackage.warnings,
        "Abundance must execute recipes and store payloads outside VMesh before claiming layer readiness.",
        "Generic fallback terrain and synthetic vectors must remain labelled as fallback, not source truth."
      ])
    ),
    gaps,
    nextActions: [
      "Implement an Abundance recipe executor that maps each handoff recipe to existing site-package adapter callbacks.",
      "Attach live terrain/vector/mask worker outputs before converting this handoff into a runtime pack.",
      "Fail closed when provider coverage, license, or payload QA cannot be proven for the AOI."
    ]
  };
}

export async function createLiveAbundanceSourceHandoff(
  input: AbundanceSourceHandoffRequest,
  options: LiveAbundanceSourceHandoffOptions = {}
): Promise<AbundanceSourceHandoff> {
  const consumerAppId = input.consumerAppId ?? "building-abundance";
  const sourceSliceAoi = sourceSliceAoiForRequest(input);
  const terrainRequested = input.segments.includes("terrain_elevation");
  const terrainSourceAdapterOptions = {
    ...options.terrainSourceAdapterOptions,
    maxImageSide:
      options.terrainSourceAdapterOptions?.maxImageSide ??
      input.gridSize ??
      ABUNDANCE_SOURCE_HANDOFF_DEFAULT_GRID_SIZE
  };
  const terrainAdapterPlans = terrainRequested
    ? options.includeFallbackTerrainPlans
      ? await createLiveDtmSourceAdapterPlans(
          {
            request: {
              aoi: sourceSliceAoi,
              layers: ["terrain"],
              consumerAppId
            }
          },
          terrainSourceAdapterOptions
        )
      : [
          await createLiveDtmSourceAdapterPlan(
            {
              request: {
                aoi: sourceSliceAoi,
                layers: ["terrain"],
                consumerAppId
              }
            },
            terrainSourceAdapterOptions
          )
        ]
    : undefined;

  return createAbundanceSourceHandoff(
    {
      ...input,
      aoi: sourceSliceAoi,
      consumerAppId
    },
    {
      now: options.now,
      terrainAdapterPlans
    }
  );
}

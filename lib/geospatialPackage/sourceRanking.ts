import type { BaSourceRecord } from "@/lib/geospatialPackage/baPackage";
import type {
  TerrainSourceAdapterKind,
  TerrainSourceAdapterPlan
} from "@/lib/geospatialPackage/terrainSourceAdapters";
import { getTerrainToolProfileForSource } from "@/lib/geospatialPackage/terrainWorker";
import type {
  GeospatialSourceCandidate,
  PackageLayerId,
  PackageProbeStrategy,
  PackageSourceStatus
} from "@/lib/geospatialPackage/types";

export const VMESH_SOURCE_RANKING_SCHEMA_VERSION = "vmesh-source-ranking-v1";

export type SourceQualityRank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type SourceRankingConfidenceTier = "high" | "medium" | "low" | "fallback" | "blocked";

export type SourceProcessingCost = "low" | "medium" | "high" | "review";

export type SourceRankingEvidence =
  | "source-registry"
  | "ba-reviewed-source"
  | "terrain-adapter-plan";

export type SourceAccessMode =
  | "source-native-raster-api"
  | "source-native-cog-or-geotiff"
  | "official-download-archive"
  | "official-feature-query"
  | "stac-api"
  | "bounded-api"
  | "bulk-open-data"
  | "source-index"
  | "static-download"
  | "configured-cache"
  | "manual-review"
  | "generic-terrain-tiles"
  | "unknown";

export interface SourceRankingCandidate {
  layerId: PackageLayerId;
  dataType: string;
  sourceId: string;
  label: string;
  providerId: string;
  rank: SourceQualityRank;
  rankLabel: string;
  selected: boolean;
  selectedReason: string;
  sourceRole: string;
  sourceSubType: string;
  provider: string;
  attribution: string;
  license: string;
  status: string;
  access: string;
  accessMode: SourceAccessMode;
  retrievalMethod: SourceAccessMode;
  materializerId: string;
  processingCost: SourceProcessingCost;
  confidenceTier: SourceRankingConfidenceTier;
  coverage: string;
  coverageStatus:
    | "exact-frame-proven"
    | "exact-frame-source-ref"
    | "exact-frame-rejected"
    | "selected-for-aoi"
    | "covers-aoi"
    | "probable"
    | "regional-check-required"
    | "unknown"
    | "unavailable";
  resolution: string;
  crs: string | null;
  verticalDatum: string | null;
  evidence: SourceRankingEvidence[];
  workerAction: string;
  warnings: string[];
  blockers: string[];
}

export interface SourceRankingLayerDecision {
  layerId: PackageLayerId;
  dataType: string;
  selectedSourceId: string | null;
  bestAvailableSourceId: string | null;
  bestRank: SourceQualityRank | null;
  candidates: SourceRankingCandidate[];
  rejectedSourceIds: string[];
  warnings: string[];
}

export interface SourceRankingReport {
  schemaVersion: typeof VMESH_SOURCE_RANKING_SCHEMA_VERSION;
  scale: {
    best: 1;
    worst: 10;
    rule: string;
  };
  layerDecisions: SourceRankingLayerDecision[];
  warnings: string[];
}

interface CreateSourceRankingInput {
  layerIds: PackageLayerId[];
  registrySources: GeospatialSourceCandidate[];
  sourceRecords: BaSourceRecord[];
  selectedSourceIdsByLayer: Partial<Record<PackageLayerId, string[]>>;
  terrainAdapterPlans?: TerrainSourceAdapterPlan[];
}

const RANK_LABELS: Record<SourceQualityRank, string> = {
  1: "source-native direct official data",
  2: "official source data requiring deterministic worker processing",
  3: "authoritative open source with strong AOI extraction path",
  4: "official or source-backed derived data requiring QA",
  5: "best-available official or regional context",
  6: "good open contextual source",
  7: "global modelled or lower-resolution context",
  8: "generic visual fallback only",
  9: "gated, restricted, or review-only source",
  10: "unavailable or blocked for operational use"
};

const LAYER_DATA_TYPE: Record<PackageLayerId, string> = {
  terrain: "terrain",
  contours: "terrain-contours",
  imagery: "imagery",
  roads: "roads",
  buildings: "buildings",
  water: "water",
  hydrology: "hydrology",
  vegetation: "vegetation",
  ecology: "ecology",
  soil: "soil",
  landcover: "landcover",
  parcels: "parcel-cadastre",
  "field-boundaries": "field-boundaries",
  climate: "climate-weather"
};

function clampRank(value: number): SourceQualityRank {
  return Math.min(10, Math.max(1, Math.round(value))) as SourceQualityRank;
}

function confidenceTier(rank: SourceQualityRank): SourceRankingConfidenceTier {
  if (rank <= 3) return "high";
  if (rank <= 5) return "medium";
  if (rank <= 7) return "low";
  if (rank === 8) return "fallback";
  return "blocked";
}

function dataSubType({ layerId, sourceRole }: { layerId: PackageLayerId; sourceRole: string }) {
  const normalized = sourceRole.toLowerCase();
  if (normalized.includes("soil")) return "soil";
  if (normalized.includes("ecology") || normalized.includes("biodiversity")) return "ecology";
  if (normalized.includes("building")) return "building-footprint";
  if (layerId === "buildings") return "building-footprint";
  if (layerId === "roads") return "road-network";
  if (normalized.includes("hydrology")) return "hydrology";
  if (normalized.includes("landcover")) return "landcover";
  if (normalized.includes("imagery")) return "imagery";
  if (normalized.includes("weather") || normalized.includes("climate")) return "weather-climate";
  if (normalized.includes("bare-earth")) return "bare-earth-dtm";
  if (normalized.includes("surface-dsm")) return "surface-dsm";
  return LAYER_DATA_TYPE[layerId];
}

function isGated(status: PackageSourceStatus | string, access: string, requiresApiKey = false) {
  return (
    requiresApiKey ||
    access === "token-gated" ||
    access === "license-gated" ||
    access === "paid" ||
    status === "token-gated" ||
    status === "license-gated" ||
    status === "paid"
  );
}

function isUnavailable(status: PackageSourceStatus | string, access: string) {
  return status === "blocked" || status === "missing" || access === "blocked";
}

function accessModeForProbeStrategy(strategy: PackageProbeStrategy): SourceAccessMode {
  const accessModes: Record<PackageProbeStrategy, SourceAccessMode> = {
    "static-url": "static-download",
    "stac-search": "stac-api",
    "catalog-lookup": "source-index",
    "bounded-api": "bounded-api",
    "bulk-preprocess": "bulk-open-data",
    "configured-local-cache": "configured-cache",
    "manual-review": "manual-review",
    "not-available": "unknown"
  };

  return accessModes[strategy];
}

function accessModeForTerrainKind(kind: TerrainSourceAdapterKind): SourceAccessMode {
  switch (kind) {
    case "arcgis-image-export":
    case "wcs-geotiff":
      return "source-native-raster-api";
    case "direct-geotiff":
    case "s3-cog":
    case "stac-cog":
      return "source-native-cog-or-geotiff";
    case "zip-archive":
    case "sevenzip-archive":
    case "ascii-grid":
      return "official-download-archive";
    case "arcgis-feature-query":
      return "official-feature-query";
    case "source-index-required":
      return "source-index";
    default:
      return "unknown";
  }
}

function processingCostForAccessMode(accessMode: SourceAccessMode): SourceProcessingCost {
  if (
    accessMode === "source-native-raster-api" ||
    accessMode === "source-native-cog-or-geotiff" ||
    accessMode === "bounded-api" ||
    accessMode === "stac-api"
  ) {
    return "low";
  }
  if (
    accessMode === "official-download-archive" ||
    accessMode === "official-feature-query" ||
    accessMode === "source-index" ||
    accessMode === "static-download"
  ) {
    return "medium";
  }
  if (accessMode === "manual-review" || accessMode === "unknown") return "review";
  return "high";
}

function bestTerrainPlanForSource(
  sourceId: string,
  terrainAdapterPlans: TerrainSourceAdapterPlan[]
) {
  return terrainAdapterPlans.find((plan) => plan.selectedSource?.id === sourceId) ?? null;
}

function hasTerrainKind(plan: TerrainSourceAdapterPlan | null, kind: TerrainSourceAdapterKind) {
  return Boolean(plan?.inputRefs.some((ref) => ref.kind === kind));
}

function rankFromTerrainPlan(plan: TerrainSourceAdapterPlan | null): SourceQualityRank | null {
  if (!plan) return null;
  if (plan.selectedSource?.id === "mapterhorn-pmtiles-terrain") return 8;
  if (plan.selectedSource?.id === "mapzen-joerd-terrarium") return 8;
  if (hasTerrainKind(plan, "arcgis-image-export") || hasTerrainKind(plan, "wcs-geotiff")) return 1;
  if (
    hasTerrainKind(plan, "direct-geotiff") ||
    hasTerrainKind(plan, "s3-cog") ||
    hasTerrainKind(plan, "stac-cog")
  ) {
    return 1;
  }
  if (
    hasTerrainKind(plan, "zip-archive") ||
    hasTerrainKind(plan, "sevenzip-archive") ||
    hasTerrainKind(plan, "ascii-grid")
  ) {
    return plan.inputRefs.some((ref) => ref.kind === "arcgis-feature-query") ? 4 : 2;
  }
  if (hasTerrainKind(plan, "arcgis-feature-query")) return 4;
  if (plan.selectedSource?.id === "canada-hrdem-best-dtm") return 5;
  return null;
}

function rankTerrainSource({
  sourceId,
  sourceRole,
  plan
}: {
  sourceId: string;
  sourceRole: string;
  plan: TerrainSourceAdapterPlan | null;
}): SourceQualityRank {
  const planRank = rankFromTerrainPlan(plan);
  if (planRank !== null) return planRank;
  if (sourceId === "kamloops-local-lidar-dtm-1m") return 2;
  if (sourceId === "bc-lidarbc") return 2;
  if (sourceId === "usgs-3dep") return 2;
  if (sourceId === "canada-hrdem") return 3;
  if (sourceId === "canada-hrdem-best-dtm") return 5;
  if (sourceId === "usgs-3dep-lpc-dsm" || sourceId === "canada-hrdem-dsm") return 5;
  if (sourceId === "mapterhorn-pmtiles-terrain" || sourceId === "mapzen-joerd-terrarium") return 8;
  if (sourceRole.toLowerCase().includes("generic-dem")) return 8;
  if (sourceRole.toLowerCase().includes("surface-dsm")) return 6;
  return 7;
}

function rankBuildingsSource(sourceId: string, sourceRole: string): SourceQualityRank {
  const role = sourceRole.toLowerCase();
  if (sourceId.includes("official") || role.includes("municipal")) return 1;
  if (sourceId === "overture-maps-geoparquet") return 2;
  if (sourceId === "openstreetmap-pbf-extracts") return 3;
  if (sourceId === "openfreemap-vector-tiles") return 4;
  if (sourceId === "google-open-buildings" || sourceId === "microsoft-building-footprints") {
    return 4;
  }
  if (sourceId === "global-building-atlas-odbl-polygons") return 5;
  if (role.includes("ml-building")) return 5;
  if (role.includes("visual")) return 8;
  return 7;
}

function rankRoadsSource(sourceId: string, sourceRole: string): SourceQualityRank {
  const role = sourceRole.toLowerCase();
  if (sourceId.includes("official") || role.includes("municipal")) return 1;
  if (sourceId === "overture-maps-geoparquet") return 2;
  if (sourceId === "openstreetmap-pbf-extracts") return 3;
  if (sourceId === "openfreemap-vector-tiles") return 4;
  if (sourceId === "openinframap") return 4;
  return 7;
}

function rankWaterOrHydrologySource(sourceId: string): SourceQualityRank {
  if (sourceId.includes("official") || sourceId.includes("municipal")) return 1;
  if (sourceId === "hydrosheds-suite") return 3;
  if (sourceId === "overture-maps-geoparquet") return 4;
  if (sourceId === "openstreetmap-pbf-extracts") return 4;
  if (sourceId === "openfreemap-vector-tiles") return 5;
  if (sourceId === "dynamic-world" || sourceId === "sentinel-2-l2a-earth-search") return 5;
  if (sourceId === "openinframap") return 5;
  return 7;
}

function rankSoilSource(sourceId: string, sourceRole: string): SourceQualityRank {
  const role = sourceRole.toLowerCase();
  if (sourceId === "usda-ssurgo-gssurgo") return 2;
  if (sourceId === "soilgrids") return 6;
  if (role.includes("soil")) return 6;
  return 7;
}

function rankEcologySource(sourceId: string, sourceRole: string): SourceQualityRank {
  const role = sourceRole.toLowerCase();
  if (sourceId === "landfire") return 3;
  if (sourceId === "esa-worldcover" || sourceId === "dynamic-world") return 4;
  if (sourceId === "hansen-global-forest-change" || sourceId === "nasa-gedi-canopy") return 6;
  if (role.includes("ecology") || role.includes("biodiversity")) return 5;
  return 7;
}

function rankLandcoverVegetationSource(sourceId: string, sourceRole: string): SourceQualityRank {
  const role = sourceRole.toLowerCase();
  if (sourceId === "annual-nlcd" || sourceId === "landfire") return 3;
  if (sourceId === "esa-worldcover" || sourceId === "dynamic-world") return 4;
  if (sourceId === "sentinel-2-l2a-earth-search") return 5;
  if (sourceId === "openfreemap-vector-tiles") return 6;
  if (sourceId === "hansen-global-forest-change" || sourceId === "nasa-gedi-canopy") return 6;
  if (sourceId === "fields-of-the-world") return 5;
  if (role.includes("predicted")) return 6;
  return 7;
}

function rankImagerySource(sourceId: string, sourceRole: string): SourceQualityRank {
  const role = sourceRole.toLowerCase();
  if (sourceId.includes("official") || sourceId.includes("orthophoto")) return 2;
  if (sourceId === "sentinel-2-l2a-earth-search") return 4;
  if (sourceId === "sentinel-2-sen2sr-pmtiles") return 5;
  if (sourceId === "mapbox-satellite-global") return 9;
  if (role.includes("visual")) return 8;
  return 7;
}

function rankClimateSource(sourceId: string): SourceQualityRank {
  if (sourceId.includes("official") || sourceId.includes("station")) return 2;
  if (sourceId === "open-meteo-forecast") return 3;
  if (sourceId === "nasa-power-solar-meteo") return 4;
  if (sourceId === "era5-cds-reanalysis") return 6;
  if (sourceId === "landfire") return 5;
  return 7;
}

function rankParcelOrFieldSource(sourceId: string, sourceRole: string): SourceQualityRank {
  const role = sourceRole.toLowerCase();
  if (sourceId === "official-parcel-gis" || role.includes("cadastral")) return 1;
  if (sourceId === "fields-of-the-world") return 5;
  if (sourceId === "openaddresses") return 6;
  if (sourceId === "overture-maps-geoparquet") return 7;
  if (role.includes("predicted")) return 6;
  return 8;
}

function baseRankForLayer({
  layerId,
  sourceId,
  sourceRole,
  plan
}: {
  layerId: PackageLayerId;
  sourceId: string;
  sourceRole: string;
  plan: TerrainSourceAdapterPlan | null;
}): SourceQualityRank {
  switch (layerId) {
    case "terrain":
    case "contours":
      return rankTerrainSource({ sourceId, sourceRole, plan });
    case "buildings":
      return rankBuildingsSource(sourceId, sourceRole);
    case "roads":
      return rankRoadsSource(sourceId, sourceRole);
    case "water":
    case "hydrology":
      return rankWaterOrHydrologySource(sourceId);
    case "vegetation":
    case "landcover":
      return rankLandcoverVegetationSource(sourceId, sourceRole);
    case "ecology":
      return rankEcologySource(sourceId, sourceRole);
    case "soil":
      return rankSoilSource(sourceId, sourceRole);
    case "imagery":
      return rankImagerySource(sourceId, sourceRole);
    case "climate":
      return rankClimateSource(sourceId);
    case "parcels":
    case "field-boundaries":
      return rankParcelOrFieldSource(sourceId, sourceRole);
    default:
      return 7;
  }
}

function planAccessMode(plan: TerrainSourceAdapterPlan | null) {
  if (!plan || plan.inputRefs.length === 0) return null;
  if (plan.selectedSource?.id === "mapterhorn-pmtiles-terrain") return "generic-terrain-tiles";
  const bestKind =
    plan.inputRefs.find((ref) =>
      ["arcgis-image-export", "direct-geotiff", "s3-cog", "stac-cog", "wcs-geotiff"].includes(
        ref.kind
      )
    )?.kind ??
    plan.inputRefs.find((ref) => ref.kind === "zip-archive")?.kind ??
    plan.inputRefs[0]?.kind;
  return bestKind ? accessModeForTerrainKind(bestKind) : null;
}

function coverageStatusForCandidate({
  source,
  selected,
  plan
}: {
  source: GeospatialSourceCandidate;
  selected: boolean;
  plan: TerrainSourceAdapterPlan | null;
}): SourceRankingCandidate["coverageStatus"] {
  if (isUnavailable(source.status, source.access)) return "unavailable";
  if (
    plan?.status === "ready" &&
    plan.warnings.some((warning) =>
      /source pixel coverage probe proved|valid terrain pixels/i.test(warning)
    )
  ) {
    return "exact-frame-proven";
  }
  if (plan?.status === "ready") return "exact-frame-source-ref";
  if (plan?.status === "blocked") return "exact-frame-rejected";
  if (selected) return "selected-for-aoi";
  const coverage = source.coverage.toLowerCase();
  if (coverage.includes("global") || coverage.includes("package aoi")) return "covers-aoi";
  if (
    coverage.includes("jurisdiction") ||
    coverage.includes("regional") ||
    coverage.includes("united states") ||
    coverage.includes("canada") ||
    coverage.includes("british columbia") ||
    coverage.includes("scotland") ||
    coverage.includes("england")
  ) {
    return "regional-check-required";
  }
  if (coverage.length > 0) return "probable";
  return "unknown";
}

function materializerIdForCandidate({
  layerId,
  sourceId,
  plan,
  accessMode
}: {
  layerId: PackageLayerId;
  sourceId: string;
  plan: TerrainSourceAdapterPlan | null;
  accessMode: SourceAccessMode;
}) {
  if (layerId === "terrain" || layerId === "contours") {
    if (plan?.toolProfile?.toolId) return `terrain:${plan.toolProfile.toolId}`;
    const toolProfile = getTerrainToolProfileForSource(sourceId);
    if (toolProfile) return `terrain:${toolProfile.toolId}`;
    if (accessMode === "generic-terrain-tiles") return "terrain:global-baseline-tile-decoder";
    return "terrain:source-adapter";
  }
  if (layerId === "buildings") return "vectors:building-footprints";
  if (layerId === "roads") return "vectors:road-network";
  if (layerId === "water" || layerId === "hydrology") return "environment:water-hydrology";
  if (layerId === "landcover") return "environment:landcover-raster";
  if (layerId === "vegetation") return "environment:vegetation-mask";
  if (layerId === "ecology") return "environment:ecology-context";
  if (layerId === "soil") return "environment:soil-context";
  if (layerId === "parcels" || layerId === "field-boundaries") return "planning:boundary-context";
  if (layerId === "imagery") return "imagery:context";
  if (layerId === "climate") return "climate:context";
  return `${layerId}:${sourceId}`;
}

function workerActionForCandidate({
  selected,
  rank,
  plan,
  sourceId
}: {
  selected: boolean;
  rank: SourceQualityRank;
  plan: TerrainSourceAdapterPlan | null;
  sourceId: string;
}) {
  if (rank >= 9) return "operator review required before operational use";
  if (rank === 8) return "fallback visual terrain/context only; do not claim source truth";
  if (plan?.status === "blocked")
    return "blocked until coverage/probe/materialization gap is fixed";
  if (selected) return "execute recipe in Abundance/GIS worker and retain QA evidence";
  if (sourceId === "mapterhorn-pmtiles-terrain" || sourceId === "mapzen-joerd-terrarium") {
    return "available only as labelled fallback when source-backed data is absent";
  }
  return "candidate source; use if higher-ranked selected source is unavailable";
}

function blockersForCandidate({
  source,
  sourceRecord,
  plan
}: {
  source: GeospatialSourceCandidate;
  sourceRecord: BaSourceRecord | null;
  plan: TerrainSourceAdapterPlan | null;
}) {
  const blockers = [];
  if (isUnavailable(source.status, source.access)) blockers.push("source unavailable or blocked");
  if (isGated(source.status, source.access, source.requiresApiKey)) {
    blockers.push("source is gated or requires review/credentials");
  }
  if (plan?.status === "blocked") blockers.push(...plan.blockedReasons);
  if (sourceRecord?.warnings.includes("source_ref_only")) blockers.push("source ref only");
  return Array.from(new Set(blockers));
}

function candidateFromSource({
  layerId,
  source,
  sourceRecord,
  selectedSourceIds,
  terrainAdapterPlans
}: {
  layerId: PackageLayerId;
  source: GeospatialSourceCandidate;
  sourceRecord: BaSourceRecord | null;
  selectedSourceIds: Set<string>;
  terrainAdapterPlans: TerrainSourceAdapterPlan[];
}): SourceRankingCandidate {
  const plan = bestTerrainPlanForSource(source.id, terrainAdapterPlans);
  const selected = selectedSourceIds.has(source.id);
  const sourceRole = sourceRecord?.sourceRole ?? source.truthRole;
  const baseRank = baseRankForLayer({ layerId, sourceId: source.id, sourceRole, plan });
  const rank = isUnavailable(source.status, source.access)
    ? 10
    : isGated(source.status, source.access, source.requiresApiKey)
      ? clampRank(Math.max(baseRank, 9))
      : baseRank;
  const accessMode = planAccessMode(plan) ?? accessModeForProbeStrategy(source.probeStrategy);
  const blockers = blockersForCandidate({ source, sourceRecord, plan });
  const evidence: SourceRankingEvidence[] = ["source-registry"];
  if (sourceRecord) evidence.push("ba-reviewed-source");
  if (plan) evidence.push("terrain-adapter-plan");

  return {
    layerId,
    dataType: LAYER_DATA_TYPE[layerId],
    sourceId: source.id,
    label: sourceRecord?.label ?? source.label,
    providerId: source.id,
    rank,
    rankLabel: RANK_LABELS[rank],
    selected,
    selectedReason:
      plan?.status === "ready"
        ? "selected after exact-frame resolution returned a materializable source request; payload pixels remain a downstream worker gate"
        : plan?.status === "blocked"
          ? "rejected after exact-frame source probe returned no executable terrain payload"
          : selected
            ? "selected for this AOI/layer by VMesh resolver"
            : "rejected or retained as fallback/context candidate",
    sourceRole,
    sourceSubType: dataSubType({ layerId, sourceRole }),
    provider: sourceRecord?.providerRef ?? source.attribution,
    attribution: source.attribution,
    license: sourceRecord?.license ?? source.license,
    status: sourceRecord?.status ?? source.status,
    access: sourceRecord?.access ?? source.access,
    accessMode,
    retrievalMethod: accessMode,
    materializerId: materializerIdForCandidate({ layerId, sourceId: source.id, plan, accessMode }),
    processingCost: processingCostForAccessMode(accessMode),
    confidenceTier: confidenceTier(rank),
    coverage: sourceRecord?.coverage ?? source.coverage,
    coverageStatus: coverageStatusForCandidate({ source, selected, plan }),
    resolution: sourceRecord?.resolution ?? source.resolution,
    crs: plan?.inputRefs.find((ref) => ref.crs)?.crs ?? plan?.toolProfile?.crs ?? null,
    verticalDatum:
      plan?.inputRefs.find((ref) => ref.verticalDatum)?.verticalDatum ??
      plan?.toolProfile?.verticalDatum ??
      null,
    evidence,
    workerAction: workerActionForCandidate({ selected, rank, plan, sourceId: source.id }),
    warnings: Array.from(new Set([...(sourceRecord?.warnings ?? []), ...source.limitations])),
    blockers
  };
}

function sourceRecordsById(sourceRecords: BaSourceRecord[]) {
  const byId = new Map<string, BaSourceRecord>();
  for (const source of sourceRecords) byId.set(source.id, source);
  return byId;
}

function sortCandidates(left: SourceRankingCandidate, right: SourceRankingCandidate): number {
  if (left.rank !== right.rank) return left.rank - right.rank;
  if (left.selected !== right.selected) return left.selected ? -1 : 1;
  return left.sourceId.localeCompare(right.sourceId);
}

export function createSourceRanking(input: CreateSourceRankingInput): SourceRankingReport {
  const sourceRecordById = sourceRecordsById(input.sourceRecords);
  const terrainAdapterPlans = input.terrainAdapterPlans ?? [];
  const layerDecisions = input.layerIds.map((layerId) => {
    const selectedSourceIds = new Set(input.selectedSourceIdsByLayer[layerId] ?? []);
    const candidates = input.registrySources
      .filter((source) => source.layerIds.includes(layerId))
      .map((source) =>
        candidateFromSource({
          layerId,
          source,
          sourceRecord: sourceRecordById.get(source.id) ?? null,
          selectedSourceIds,
          terrainAdapterPlans
        })
      )
      .sort(sortCandidates);
    const selectedCandidate = candidates.find((candidate) => candidate.selected) ?? null;
    const bestCandidate = candidates[0] ?? null;

    return {
      layerId,
      dataType: LAYER_DATA_TYPE[layerId],
      selectedSourceId: selectedCandidate?.sourceId ?? null,
      bestAvailableSourceId: bestCandidate?.sourceId ?? null,
      bestRank: bestCandidate?.rank ?? null,
      candidates,
      rejectedSourceIds: candidates
        .filter((candidate) => !candidate.selected)
        .map((candidate) => candidate.sourceId),
      warnings: selectedCandidate
        ? selectedCandidate.warnings
        : [`No source is selected for ${layerId}; Abundance must treat this layer as a gap.`]
    } satisfies SourceRankingLayerDecision;
  });

  return {
    schemaVersion: VMESH_SOURCE_RANKING_SCHEMA_VERSION,
    scale: {
      best: 1,
      worst: 10,
      rule: "Ranks are layer-specific source-quality preferences, not proof that payloads have already been generated."
    },
    layerDecisions,
    warnings: [
      "Ranking is deterministic source selection metadata. Abundance/GIS workers must still fetch, materialize, QA, and retain payload evidence.",
      "Fallback or modelled sources remain confidence-capped and must not be promoted to source-backed truth."
    ]
  };
}

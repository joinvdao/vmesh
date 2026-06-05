import { isValidCell, latLngToCell } from "h3-js";

import { normalizePackageAoi, sanitizePublicUrl } from "@/lib/geospatialPackage/plannerUtils";
import {
  getGeospatialSourceRegistry,
  type GeospatialSourceRegistryOptions
} from "@/lib/geospatialPackage/sourceRegistry";
import type {
  GeospatialSourceCandidate,
  PackageAoiInput,
  PackageLayerId,
  PackageProbeStrategy
} from "@/lib/geospatialPackage/types";
import type { IntelBrokerSegmentId } from "@/lib/intelSourceBroker";

export type BaEcosystemSegmentId = Extract<
  IntelBrokerSegmentId,
  | "ecology_biodiversity_carbon"
  | "soils_landcover"
  | "water_hydrology"
  | "climate_weather"
  | "agriculture_operations"
  | "community_economy"
  | "research_only"
>;

export type BaEcosystemSourceClass =
  | "operational_endpoint"
  | "source_reference"
  | "method_reference"
  | "knowledge_reference"
  | "local_project_reference";

export type BaEcosystemSpatialBinding =
  | "spatial"
  | "place_associated"
  | "non_spatial_reference"
  | "internal";

export type BaEcosystemDisplayMode =
  | "default_user_ui"
  | "advanced_user_view"
  | "api_downstream_mode"
  | "operator_review_mode"
  | "hidden_internal_processing";

export interface BaEcosystemPackageRequest {
  aoi: PackageAoiInput;
  segments: BaEcosystemSegmentId[];
  consumerAppId?: string;
}

export interface BaEcosystemRecord {
  id: string;
  label: string;
  segment: BaEcosystemSegmentId;
  sourceClass: BaEcosystemSourceClass;
  spatialBinding: BaEcosystemSpatialBinding;
  providerRef: string;
  sourceUrl: string | null;
  endpointType: string;
  coverage: string;
  license: string;
  reviewState: "reviewed";
  displayModes: BaEcosystemDisplayMode[];
  confidence: number;
  limitations: string[];
  warnings: string[];
}

export interface BaKnowledgeReference {
  id: string;
  title: string;
  targetSystem: "vwiki";
  sourceClass: "method_reference" | "knowledge_reference";
  spatialBinding: "non_spatial_reference";
  relatedSegments: BaEcosystemSegmentId[];
  relatedSourceIds: string[];
  displayModes: BaEcosystemDisplayMode[];
  reviewState: "needs_review" | "reviewed";
  summary: string;
}

export interface BaEcosystemFetchRecipe {
  id: string;
  sourceId: string;
  adapter: string;
  steps: string[];
}

export interface BaEcosystemPackage {
  schemaVersion: "vmesh-ba-ecosystem-package-v1";
  generatedAt: string;
  runClass: "dry-run";
  request: {
    segments: BaEcosystemSegmentId[];
    consumerAppId: string;
  };
  h3Context: {
    h3Id: string;
    resolution: number;
    label: string;
    bounds: [number, number, number, number];
  };
  ecosystemRecords: BaEcosystemRecord[];
  stacRecords: Array<{
    id: string;
    sourceId: string;
    segment: BaEcosystemSegmentId;
    href: string;
    roles: string[];
  }>;
  sourceReferences: BaEcosystemRecord[];
  knowledgeReferences: BaKnowledgeReference[];
  fetchRecipes: BaEcosystemFetchRecipe[];
  coverage: Array<{
    sourceId: string;
    segment: BaEcosystemSegmentId;
    coverage: string;
    spatialBinding: BaEcosystemSpatialBinding;
  }>;
  confidence: {
    min: number;
    max: number;
    average: number;
  };
  warnings: string[];
  gaps: string[];
  provenance: {
    source: "vmesh-reviewed-ecosystem-registry";
    reviewReport: string;
    vwikiHandoff: "available";
  };
}

export const BA_ECOSYSTEM_SEGMENTS: BaEcosystemSegmentId[] = [
  "ecology_biodiversity_carbon",
  "soils_landcover",
  "water_hydrology",
  "climate_weather",
  "agriculture_operations",
  "community_economy",
  "research_only"
];

const SEGMENT_SOURCE_IDS: Record<BaEcosystemSegmentId, string[]> = {
  ecology_biodiversity_carbon: [
    "esa-worldcover",
    "dynamic-world",
    "hansen-global-forest-change",
    "landfire",
    "nasa-gedi-canopy"
  ],
  soils_landcover: [
    "soilgrids",
    "usda-ssurgo-gssurgo",
    "esa-worldcover",
    "dynamic-world",
    "annual-nlcd"
  ],
  water_hydrology: ["hydrosheds-suite", "openstreetmap-pbf-extracts", "overture-maps-geoparquet"],
  climate_weather: ["open-meteo-forecast", "nasa-power-solar-meteo", "landfire"],
  agriculture_operations: ["fields-of-the-world", "sentinel-2-l2a-earth-search"],
  community_economy: [],
  research_only: []
};

const SOURCE_LAYER_SEGMENT_HINTS: Record<string, BaEcosystemSegmentId[]> = {
  hydrology: ["water_hydrology"],
  water: ["water_hydrology"],
  vegetation: ["ecology_biodiversity_carbon", "soils_landcover"],
  landcover: ["soils_landcover", "ecology_biodiversity_carbon"],
  climate: ["climate_weather"],
  "field-boundaries": ["agriculture_operations"],
  imagery: ["agriculture_operations"]
};

function endpointTypeForProbeStrategy(strategy: PackageProbeStrategy): string {
  const endpointTypes: Record<PackageProbeStrategy, string> = {
    "static-url": "static_download",
    "stac-search": "stac",
    "catalog-lookup": "html_catalog",
    "bounded-api": "api_json",
    "bulk-preprocess": "static_download",
    "configured-local-cache": "configured_cache",
    "manual-review": "manual_review",
    "not-available": "unknown"
  };

  return endpointTypes[strategy];
}

function adapterForProbeStrategy(strategy: PackageProbeStrategy): string {
  const adapters: Record<PackageProbeStrategy, string> = {
    "static-url": "static-url",
    "stac-search": "stac-search",
    "catalog-lookup": "provider-catalog-lookup",
    "bounded-api": "bounded-api",
    "bulk-preprocess": "batch-preprocess",
    "configured-local-cache": "configured-cache",
    "manual-review": "operator-review",
    "not-available": "none"
  };

  return adapters[strategy];
}

function sourceClassForSource(source: GeospatialSourceCandidate): BaEcosystemSourceClass {
  if (source.probeStrategy === "bounded-api" || source.probeStrategy === "stac-search") {
    return "operational_endpoint";
  }
  if (source.id === "fields-of-the-world") return "source_reference";
  return "source_reference";
}

function sourceUrlForBa(source: GeospatialSourceCandidate): string | null {
  if (!source.sourceUrl || source.requiresApiKey || source.sourceUrl.startsWith("mapbox://")) {
    return null;
  }

  const sanitized = sanitizePublicUrl(source.sourceUrl);
  return sanitized.startsWith("redacted://") ? null : sanitized;
}

function confidenceForSource(source: GeospatialSourceCandidate): number {
  if (source.probeStrategy === "bounded-api" || source.probeStrategy === "stac-search") return 76;
  if (source.status === "preprocessing-required") return 68;
  return 60;
}

function displayModesForSource(): BaEcosystemDisplayMode[] {
  return ["advanced_user_view", "api_downstream_mode"];
}

function warningsForSource(source: GeospatialSourceCandidate): string[] {
  const warnings = ["not_default_user_ui"];

  if (source.status === "preprocessing-required") warnings.push("requires_preprocessing");
  if (source.id === "fields-of-the-world") warnings.push("ethical_license_review_required");
  if (source.probeStrategy !== "bounded-api") warnings.push("coverage_must_be_checked_per_aoi");

  return warnings;
}

function recordForSource(
  source: GeospatialSourceCandidate,
  segment: BaEcosystemSegmentId
): BaEcosystemRecord {
  return {
    id: source.id,
    label: source.label,
    segment,
    sourceClass: sourceClassForSource(source),
    spatialBinding: "spatial",
    providerRef: source.attribution,
    sourceUrl: sourceUrlForBa(source),
    endpointType: endpointTypeForProbeStrategy(source.probeStrategy),
    coverage: source.coverage,
    license: source.license,
    reviewState: "reviewed",
    displayModes: displayModesForSource(),
    confidence: confidenceForSource(source),
    limitations: source.limitations,
    warnings: warningsForSource(source)
  };
}

function sourceSegmentsFromLayers(source: GeospatialSourceCandidate): BaEcosystemSegmentId[] {
  return Array.from(
    new Set(
      source.layerIds.flatMap(
        (layerId) => SOURCE_LAYER_SEGMENT_HINTS[layerId as PackageLayerId] ?? []
      )
    )
  );
}

function selectedSourceRecords(
  segments: BaEcosystemSegmentId[],
  options: GeospatialSourceRegistryOptions
): BaEcosystemRecord[] {
  const sources = getGeospatialSourceRegistry(options);
  const records: BaEcosystemRecord[] = [];

  for (const segment of segments) {
    const explicitIds = new Set(SEGMENT_SOURCE_IDS[segment]);
    const matchingSources = sources.filter((source) => {
      if (explicitIds.has(source.id)) return true;
      return explicitIds.size === 0 ? false : sourceSegmentsFromLayers(source).includes(segment);
    });

    records.push(...matchingSources.map((source) => recordForSource(source, segment)));
  }

  return Array.from(
    new Map(records.map((record) => [`${record.segment}:${record.id}`, record])).values()
  );
}

function parseSegments(segments: BaEcosystemSegmentId[]): BaEcosystemSegmentId[] {
  const filtered = segments.filter((segment) => BA_ECOSYSTEM_SEGMENTS.includes(segment));
  return filtered.length > 0 ? Array.from(new Set(filtered)) : ["ecology_biodiversity_carbon"];
}

function normalizeH3Context(input: PackageAoiInput) {
  const normalized = normalizePackageAoi(input);
  const h3Id =
    input.h3Id && isValidCell(input.h3Id)
      ? input.h3Id
      : latLngToCell(
          normalized.centroid.latitude,
          normalized.centroid.longitude,
          normalized.resolution
        );

  return {
    h3Id,
    resolution: normalized.resolution,
    label: normalized.label,
    bounds: normalized.bounds
  };
}

function createKnowledgeReferences(records: BaEcosystemRecord[]): BaKnowledgeReference[] {
  const recordIds = records.map((record) => record.id);
  const references: BaKnowledgeReference[] = [
    {
      id: "vwiki:soilgrids-interpretation",
      title: "How to interpret modeled soil properties",
      targetSystem: "vwiki",
      sourceClass: "knowledge_reference",
      spatialBinding: "non_spatial_reference",
      relatedSegments: ["soils_landcover"],
      relatedSourceIds: recordIds.filter((id) => ["soilgrids", "usda-ssurgo-gssurgo"].includes(id)),
      displayModes: ["advanced_user_view", "api_downstream_mode"],
      reviewState: "needs_review",
      summary: "Generic education should live in VWiki and be linked back to VMesh source records."
    },
    {
      id: "vwiki:field-boundary-ethics",
      title: "Predicted field boundaries are not ownership truth",
      targetSystem: "vwiki",
      sourceClass: "method_reference",
      spatialBinding: "non_spatial_reference",
      relatedSegments: ["agriculture_operations"],
      relatedSourceIds: recordIds.filter((id) => id === "fields-of-the-world"),
      displayModes: ["advanced_user_view", "api_downstream_mode"],
      reviewState: "needs_review",
      summary:
        "Field-boundary predictions need ethical-use and limitation notes before downstream product use."
    },
    {
      id: "vwiki:habitat-landcover-methods",
      title: "Using landcover and vegetation layers for habitat context",
      targetSystem: "vwiki",
      sourceClass: "method_reference",
      spatialBinding: "non_spatial_reference",
      relatedSegments: ["ecology_biodiversity_carbon", "soils_landcover"],
      relatedSourceIds: recordIds.filter((id) =>
        ["esa-worldcover", "dynamic-world", "hansen-global-forest-change", "landfire"].includes(id)
      ),
      displayModes: ["advanced_user_view", "api_downstream_mode"],
      reviewState: "needs_review",
      summary: "Method guidance belongs in VWiki; VMesh should provide the source refs and limits."
    }
  ];

  return references.filter((reference) => reference.relatedSourceIds.length > 0);
}

function createStacRecords(records: BaEcosystemRecord[]): BaEcosystemPackage["stacRecords"] {
  return records
    .filter(
      (record) => record.sourceUrl && ["stac", "static_download"].includes(record.endpointType)
    )
    .map((record) => ({
      id: `ecosystem-stac:${record.id}`,
      sourceId: record.id,
      segment: record.segment,
      href: record.sourceUrl as string,
      roles: [record.segment, record.sourceClass, record.spatialBinding]
    }));
}

function createFetchRecipes(records: BaEcosystemRecord[]): BaEcosystemFetchRecipe[] {
  return records.map((record) => ({
    id: `ecosystem-fetch:${record.id}`,
    sourceId: record.id,
    adapter:
      record.endpointType === "stac"
        ? adapterForProbeStrategy("stac-search")
        : record.endpointType === "api_json"
          ? adapterForProbeStrategy("bounded-api")
          : adapterForProbeStrategy("bulk-preprocess"),
    steps: [
      "Read the VMesh ecosystem source record.",
      "Check display mode and do not promote advanced/API records into default UI.",
      "Probe AOI coverage before fetching provider assets.",
      "Preserve provenance, confidence, license, and limitations in BA outputs."
    ]
  }));
}

function confidenceSummary(records: BaEcosystemRecord[]): BaEcosystemPackage["confidence"] {
  if (records.length === 0) return { min: 0, max: 0, average: 0 };
  const values = records.map((record) => record.confidence);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    average: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
  };
}

export function createBaEcosystemPackage(
  input: BaEcosystemPackageRequest,
  options: GeospatialSourceRegistryOptions = {}
): BaEcosystemPackage {
  const segments = parseSegments(input.segments);
  const ecosystemRecords = selectedSourceRecords(segments, options);
  const gaps = segments
    .filter((segment) => ecosystemRecords.every((record) => record.segment !== segment))
    .map((segment) => `${segment}: no reviewed BA ecosystem source refs are available yet`);

  return {
    schemaVersion: "vmesh-ba-ecosystem-package-v1",
    generatedAt: "2026-06-03T00:00:00.000Z",
    runClass: "dry-run",
    request: {
      segments,
      consumerAppId: input.consumerAppId ?? "ba-gis-worker"
    },
    h3Context: normalizeH3Context(input.aoi),
    ecosystemRecords,
    stacRecords: createStacRecords(ecosystemRecords),
    sourceReferences: ecosystemRecords.filter(
      (record) => record.sourceClass === "source_reference"
    ),
    knowledgeReferences: createKnowledgeReferences(ecosystemRecords),
    fetchRecipes: createFetchRecipes(ecosystemRecords),
    coverage: ecosystemRecords.map((record) => ({
      sourceId: record.id,
      segment: record.segment,
      coverage: record.coverage,
      spatialBinding: record.spatialBinding
    })),
    confidence: confidenceSummary(ecosystemRecords),
    warnings: [
      "Ecosystem records are advanced/API mode by default, not default UI map layers.",
      "Research and method references should be handed to VWiki unless they expose operational endpoints.",
      "BA must probe AOI coverage and preserve license/access state before provider fetches."
    ],
    gaps,
    provenance: {
      source: "vmesh-reviewed-ecosystem-registry",
      reviewReport: "docs/GEOSPATIAL_SOURCE_REVIEW.md",
      vwikiHandoff: "available"
    }
  };
}

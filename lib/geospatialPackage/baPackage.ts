import { isValidCell, latLngToCell } from "h3-js";

import { createGeospatialPackagePlan } from "@/lib/geospatialPackage/planner";
import { normalizePackageAoi, sanitizePublicUrl } from "@/lib/geospatialPackage/plannerUtils";
import {
  getGeospatialSourceRegistry,
  type GeospatialSourceRegistryOptions
} from "@/lib/geospatialPackage/sourceRegistry";
import type {
  GeospatialSourceCandidate,
  NormalizedPackageAoi,
  PackageAoiInput,
  PackageArtifactKind,
  PackageLayerId,
  PackagePlanRequest,
  PackageProbeStrategy
} from "@/lib/geospatialPackage/types";
import type { IntelBrokerSegmentId } from "@/lib/intelSourceBroker";

export type BaGeospatialSegmentId = Extract<
  IntelBrokerSegmentId,
  | "terrain_elevation"
  | "imagery_observation"
  | "water_hydrology"
  | "access_infrastructure"
  | "land_property_planning"
  | "soils_landcover"
  | "ecology_biodiversity_carbon"
  | "climate_weather"
>;

export type BaReviewedSourceStatus =
  | "ready_source_ref"
  | "adapter_ready"
  | "viewer_ready"
  | "live_proof_ready";

export type BaDisplayMode = "api_downstream_mode" | "advanced_user_view" | "operator_review_mode";

export interface BaGeospatialPackageRequest {
  aoi: PackageAoiInput;
  segments: BaGeospatialSegmentId[];
  consumerAppId?: string;
  includeFallbacks?: boolean;
}

export interface BaSourceRecord {
  id: string;
  label: string;
  segment: BaGeospatialSegmentId;
  status: BaReviewedSourceStatus;
  sourceRole: string;
  endpointType: string;
  sourceUrl: string | null;
  providerRef: string;
  coverage: string;
  resolution: string;
  license: string;
  access: string;
  displayMode: BaDisplayMode;
  selectedForAoi: boolean;
  confidence: number;
  limitations: string[];
  warnings: string[];
}

export interface BaFetchRecipe {
  id: string;
  sourceId: string;
  adapter: string;
  artifactKinds: PackageArtifactKind[];
  steps: string[];
}

export interface BaStacRecord {
  id: string;
  type: "Feature";
  stac_version: "1.0.0";
  collection: string;
  properties: {
    provider: string;
    segment: BaGeospatialSegmentId;
    sourceRole: string;
    status: BaReviewedSourceStatus;
    runClass: "dry-run" | "live-proof";
  };
  assets: Record<
    string,
    {
      href: string;
      roles: string[];
      title: string;
      type: string;
    }
  >;
}

export interface BaCoverageRecord {
  sourceId: string;
  segment: BaGeospatialSegmentId;
  coverage: string;
  coverageStatus: "selected-for-aoi" | "source-ref-only" | "coverage-check-required";
}

export interface BaLiveProofRecord {
  sourceId: string;
  status: "live-proof-retained";
  role: string;
  evidenceRefs: string[];
  limitations: string[];
}

export interface BaGeospatialPackage {
  schemaVersion: "vmesh-ba-geospatial-package-v1";
  generatedAt: string;
  runClass: "dry-run";
  request: {
    segments: BaGeospatialSegmentId[];
    consumerAppId: string;
    includeFallbacks: boolean;
  };
  h3Context: {
    h3Id: string;
    resolution: number;
    label: string;
    bounds: [number, number, number, number];
    coordinateDisclosure: "h3-cell" | "exact-centroid" | "bounds" | "fallback-sample";
  };
  stac: {
    records: BaStacRecord[];
  };
  sourceRecords: BaSourceRecord[];
  fetchRecipes: BaFetchRecipe[];
  coverage: BaCoverageRecord[];
  liveProof: BaLiveProofRecord[];
  warnings: string[];
  gaps: string[];
  provenance: {
    source: "vmesh-reviewed-source-registry";
    reviewReport: string;
    plannerSchemaVersion: string;
    liveProofEvidence: string[];
  };
}

export const BA_GEOSPATIAL_SEGMENTS: BaGeospatialSegmentId[] = [
  "terrain_elevation",
  "imagery_observation",
  "water_hydrology",
  "access_infrastructure",
  "land_property_planning",
  "soils_landcover",
  "ecology_biodiversity_carbon",
  "climate_weather"
];

const SEGMENT_LAYERS: Record<BaGeospatialSegmentId, PackageLayerId[]> = {
  terrain_elevation: ["terrain", "contours"],
  imagery_observation: ["imagery"],
  water_hydrology: ["water", "hydrology"],
  access_infrastructure: ["roads", "buildings"],
  land_property_planning: ["parcels"],
  soils_landcover: ["soil", "landcover", "vegetation"],
  ecology_biodiversity_carbon: ["ecology", "vegetation", "landcover"],
  climate_weather: ["climate"]
};

const SEGMENT_SOURCE_IDS: Record<BaGeospatialSegmentId, string[]> = {
  terrain_elevation: [
    "kamloops-local-lidar-dtm-1m",
    "usgs-3dep",
    "usgs-3dep-lpc-dsm",
    "canada-hrdem",
    "canada-hrdem-dsm",
    "bc-lidarbc",
    "bc-lidarbc-dsm",
    "environment-agency-lidar-dtm",
    "scottish-remote-sensing-lidar",
    "os-terrain-50"
  ],
  imagery_observation: ["sentinel-2-l2a-earth-search"],
  water_hydrology: ["hydrosheds-suite", "openstreetmap-pbf-extracts", "overture-maps-geoparquet"],
  access_infrastructure: ["openstreetmap-pbf-extracts", "overture-maps-geoparquet"],
  land_property_planning: [],
  soils_landcover: [
    "soilgrids",
    "usda-ssurgo-gssurgo",
    "esa-worldcover",
    "dynamic-world",
    "annual-nlcd",
    "landfire"
  ],
  ecology_biodiversity_carbon: [
    "esa-worldcover",
    "dynamic-world",
    "hansen-global-forest-change",
    "landfire",
    "nasa-gedi-canopy"
  ],
  climate_weather: ["open-meteo-forecast", "nasa-power-solar-meteo", "landfire"]
};

const LIVE_PROOF_EVIDENCE: Record<string, Omit<BaLiveProofRecord, "sourceId">> = {
  "usgs-3dep": {
    status: "live-proof-retained",
    role: "bare-earth-dtm",
    evidenceRefs: [
      ".artifacts/terrain-source-preview/terrain-package-live-proof-latest.json",
      ".artifacts/terrain-source-preview/source-preview-route-live-proof-latest.json"
    ],
    limitations: ["Selected public-safe AOIs only; not universal USA coverage."]
  },
  "usgs-3dep-lpc-dsm": {
    status: "live-proof-retained",
    role: "surface-dsm",
    evidenceRefs: [
      ".artifacts/terrain-source-preview/source-preview-route-live-proof-latest.json",
      ".artifacts/terrain-source-preview/source-preview-viewer-live-proof-latest.json"
    ],
    limitations: ["Selected public-safe AOIs only; DSM is surface context, not bare earth."]
  },
  "canada-hrdem": {
    status: "live-proof-retained",
    role: "bare-earth-dtm",
    evidenceRefs: [
      ".artifacts/terrain-source-preview/source-preview-coordinate-probe-live-proof-latest.json",
      ".artifacts/terrain-source-preview/terrain-package-live-proof-latest.json"
    ],
    limitations: ["Selected public-safe AOIs only; strict 1m gaps fail closed."]
  },
  "canada-hrdem-dsm": {
    status: "live-proof-retained",
    role: "surface-dsm",
    evidenceRefs: [".artifacts/terrain-source-preview/terrain-package-live-proof-latest.json"],
    limitations: ["Selected public-safe AOIs only; DSM is surface context, not bare earth."]
  },
  "bc-lidarbc": {
    status: "live-proof-retained",
    role: "bare-earth-dtm",
    evidenceRefs: [
      ".artifacts/terrain-source-preview/source-preview-probe-route-lidarbc-live-proof-latest.json",
      ".artifacts/terrain-source-preview/source-preview-route-live-proof-latest.json"
    ],
    limitations: [
      "Selected public-safe BC AOIs only; exact Kamloops/Rose proof still needs redacted retained evidence."
    ]
  },
  "bc-lidarbc-dsm": {
    status: "live-proof-retained",
    role: "surface-dsm",
    evidenceRefs: [".artifacts/terrain-source-preview/source-preview-route-live-proof-latest.json"],
    limitations: ["Selected public-safe BC AOIs only; DSM is surface context, not bare earth."]
  }
};

const READY_SOURCE_REF_IDS = new Set([
  "sentinel-2-l2a-earth-search",
  "openstreetmap-pbf-extracts",
  "overture-maps-geoparquet",
  "esa-worldcover",
  "hydrosheds-suite",
  "soilgrids",
  "usda-ssurgo-gssurgo",
  "dynamic-world",
  "annual-nlcd",
  "landfire",
  "nasa-power-solar-meteo",
  "fields-of-the-world"
]);

const ADAPTER_READY_SOURCE_IDS = new Set([
  "open-meteo-forecast",
  "environment-agency-lidar-dtm",
  "scottish-remote-sensing-lidar",
  "os-terrain-50"
]);
const VIEWER_READY_SOURCE_IDS = new Set<string>([]);
const FALLBACK_ONLY_SOURCE_IDS = new Set(["mapterhorn-pmtiles-terrain", "mapzen-joerd-terrarium"]);

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

function statusForSource(source: GeospatialSourceCandidate): BaReviewedSourceStatus | null {
  if (source.id === "kamloops-local-lidar-dtm-1m") {
    return source.status === "configured" ? "adapter_ready" : "ready_source_ref";
  }
  if (LIVE_PROOF_EVIDENCE[source.id]) return "live_proof_ready";
  if (VIEWER_READY_SOURCE_IDS.has(source.id)) return "viewer_ready";
  if (ADAPTER_READY_SOURCE_IDS.has(source.id)) return "adapter_ready";
  if (READY_SOURCE_REF_IDS.has(source.id)) return "ready_source_ref";
  return null;
}

function confidenceForStatus(status: BaReviewedSourceStatus): number {
  const confidence: Record<BaReviewedSourceStatus, number> = {
    live_proof_ready: 92,
    viewer_ready: 86,
    adapter_ready: 78,
    ready_source_ref: 68
  };

  return confidence[status];
}

function selectedSourceIdsForLayers(
  request: BaGeospatialPackageRequest,
  layers: PackageLayerId[],
  options: GeospatialSourceRegistryOptions
): Set<string> {
  const planRequest: PackagePlanRequest = {
    aoi: request.aoi,
    layers,
    consumerAppId: request.consumerAppId ?? "ba-gis-worker",
    offline: false
  };
  const plan = createGeospatialPackagePlan(planRequest, options);

  return new Set(
    Object.values(plan.selectedSources)
      .filter((source): source is GeospatialSourceCandidate => source !== null)
      .map((source) => source.id)
  );
}

function sourceMatchesSegment(source: GeospatialSourceCandidate, segment: BaGeospatialSegmentId) {
  return SEGMENT_SOURCE_IDS[segment].includes(source.id);
}

function sourceLayerMatchesSegment(
  source: GeospatialSourceCandidate,
  segment: BaGeospatialSegmentId
) {
  return source.layerIds.some((layerId) => SEGMENT_LAYERS[segment].includes(layerId));
}

function sourceUrlForBa(source: GeospatialSourceCandidate): string | null {
  if (!source.sourceUrl || source.requiresApiKey || source.sourceUrl.startsWith("mapbox://")) {
    return null;
  }

  const sanitized = sanitizePublicUrl(source.sourceUrl);
  return sanitized.startsWith("redacted://") ? null : sanitized;
}

function warningsForSource(source: GeospatialSourceCandidate, selectedForAoi: boolean): string[] {
  const warnings = [];

  if (!selectedForAoi) warnings.push("source_ref_only");
  if (!source.mapReady) warnings.push("not_viewer_ready_by_default");
  if (source.status === "preprocessing-required") warnings.push("requires_preprocessing");
  if (source.probeStrategy !== "static-url") warnings.push("coverage_must_be_checked_per_aoi");
  if (!LIVE_PROOF_EVIDENCE[source.id]) warnings.push("not_live_proof");

  return warnings;
}

function createSourceRecord({
  source,
  segment,
  status,
  selectedForAoi
}: {
  source: GeospatialSourceCandidate;
  segment: BaGeospatialSegmentId;
  status: BaReviewedSourceStatus;
  selectedForAoi: boolean;
}): BaSourceRecord {
  return {
    id: source.id,
    label: source.label,
    segment,
    status,
    sourceRole: source.truthRole,
    endpointType: endpointTypeForProbeStrategy(source.probeStrategy),
    sourceUrl: sourceUrlForBa(source),
    providerRef: source.attribution,
    coverage: source.coverage,
    resolution: source.resolution,
    license: source.license,
    access: source.access,
    displayMode: "api_downstream_mode",
    selectedForAoi,
    confidence: confidenceForStatus(status),
    limitations: source.limitations,
    warnings: warningsForSource(source, selectedForAoi)
  };
}

function createFetchRecipe(source: GeospatialSourceCandidate): BaFetchRecipe {
  const adapter = adapterForProbeStrategy(source.probeStrategy);

  return {
    id: `fetch:${source.id}`,
    sourceId: source.id,
    adapter,
    artifactKinds: source.artifactKinds,
    steps: [
      "Read the VMesh source record and limitations.",
      "Check license/access state before operational use.",
      "Probe AOI coverage before fetching provider assets.",
      `Use ${adapter} recipe outside the browser for heavy data.`
    ]
  };
}

function createStacRecord(source: BaSourceRecord): BaStacRecord | null {
  if (!source.sourceUrl) return null;
  if (!["stac", "static_download", "html_catalog"].includes(source.endpointType)) return null;

  return {
    id: `stac:${source.id}`,
    type: "Feature",
    stac_version: "1.0.0",
    collection: source.id,
    properties: {
      provider: source.providerRef,
      segment: source.segment,
      sourceRole: source.sourceRole,
      status: source.status,
      runClass: source.status === "live_proof_ready" ? "live-proof" : "dry-run"
    },
    assets: {
      source: {
        href: source.sourceUrl,
        roles: [source.sourceRole, source.segment],
        title: source.label,
        type: source.endpointType === "stac" ? "application/json" : "text/html"
      }
    }
  };
}

function parseSegments(segments: BaGeospatialSegmentId[]): BaGeospatialSegmentId[] {
  const filtered = segments.filter((segment) => BA_GEOSPATIAL_SEGMENTS.includes(segment));
  return filtered.length > 0 ? Array.from(new Set(filtered)) : ["terrain_elevation"];
}

function normalizeBaAoi(input: PackageAoiInput): NormalizedPackageAoi {
  if (input.h3Id && isValidCell(input.h3Id)) return normalizePackageAoi(input);
  if (input.centroid) return normalizePackageAoi(input);
  if (input.bounds) return normalizePackageAoi(input);

  return normalizePackageAoi({
    centroid: { latitude: 51.0447, longitude: -114.0719 },
    label: "Calgary public-safe sample AOI"
  });
}

function disclosureForAoi(
  input: PackageAoiInput
): BaGeospatialPackage["h3Context"]["coordinateDisclosure"] {
  if (input.centroid) return "exact-centroid";
  if (input.h3Id && isValidCell(input.h3Id)) return "h3-cell";
  if (input.bounds) return "bounds";
  return "fallback-sample";
}

function gapForSegment(segment: BaGeospatialSegmentId): string {
  return `${segment}: no reviewed BA source refs are available for this request yet`;
}

export function createBaGeospatialPackage(
  input: BaGeospatialPackageRequest,
  options: GeospatialSourceRegistryOptions = {}
): BaGeospatialPackage {
  const segments = parseSegments(input.segments);
  const requestedLayers = Array.from(
    new Set(segments.flatMap((segment) => SEGMENT_LAYERS[segment]))
  );
  const aoi = normalizeBaAoi(input.aoi);
  const sources = getGeospatialSourceRegistry(options);
  const selectedSourceIds = selectedSourceIdsForLayers(input, requestedLayers, options);
  const sourceRecords: BaSourceRecord[] = [];
  const gaps: string[] = [];

  for (const segment of segments) {
    const segmentSources = sources.filter((source) => sourceMatchesSegment(source, segment));
    const approvedRecords = segmentSources
      .map((source) => {
        const status = statusForSource(source);
        if (!status) return null;
        return createSourceRecord({
          source,
          segment,
          status,
          selectedForAoi: selectedSourceIds.has(source.id)
        });
      })
      .filter((source): source is BaSourceRecord => source !== null);

    if (approvedRecords.length === 0) {
      gaps.push(gapForSegment(segment));
    }

    sourceRecords.push(...approvedRecords);

    const selectedFallbacks = sources.filter(
      (source) =>
        selectedSourceIds.has(source.id) &&
        FALLBACK_ONLY_SOURCE_IDS.has(source.id) &&
        sourceLayerMatchesSegment(source, segment)
    );
    for (const fallback of selectedFallbacks) {
      gaps.push(
        `${segment}: ${fallback.id} is fallback visual/generic terrain only and is not returned as BA source truth`
      );
    }
  }

  const dedupedSourceRecords = Array.from(
    new Map(sourceRecords.map((source) => [`${source.segment}:${source.id}`, source])).values()
  );
  const fetchRecipes = dedupedSourceRecords
    .map((source) => {
      const registrySource = sources.find((candidate) => candidate.id === source.id);
      return registrySource ? createFetchRecipe(registrySource) : null;
    })
    .filter((recipe): recipe is BaFetchRecipe => recipe !== null);
  const stacRecords = dedupedSourceRecords
    .map(createStacRecord)
    .filter((record): record is BaStacRecord => record !== null);
  const liveProof = dedupedSourceRecords
    .filter((source) => source.status === "live_proof_ready")
    .map((source) => ({
      sourceId: source.id,
      ...LIVE_PROOF_EVIDENCE[source.id]
    }));
  const coverage = dedupedSourceRecords.map((source) => ({
    sourceId: source.id,
    segment: source.segment,
    coverage: source.coverage,
    coverageStatus: source.selectedForAoi
      ? "selected-for-aoi"
      : source.status === "live_proof_ready"
        ? "coverage-check-required"
        : "source-ref-only"
  })) satisfies BaCoverageRecord[];
  const liveProofEvidence = Array.from(new Set(liveProof.flatMap((proof) => proof.evidenceRefs)));

  return {
    schemaVersion: "vmesh-ba-geospatial-package-v1",
    generatedAt: "2026-06-03T00:00:00.000Z",
    runClass: "dry-run",
    request: {
      segments,
      consumerAppId: input.consumerAppId ?? "ba-gis-worker",
      includeFallbacks: input.includeFallbacks ?? false
    },
    h3Context: {
      h3Id:
        input.aoi.h3Id && isValidCell(input.aoi.h3Id)
          ? input.aoi.h3Id
          : latLngToCell(aoi.centroid.latitude, aoi.centroid.longitude, aoi.resolution),
      resolution: aoi.resolution,
      label: aoi.label,
      bounds: aoi.bounds,
      coordinateDisclosure: disclosureForAoi(input.aoi)
    },
    stac: {
      records: stacRecords
    },
    sourceRecords: dedupedSourceRecords,
    fetchRecipes,
    coverage,
    liveProof,
    warnings: [
      "BA package is source refs and recipes by default, not raw GIS payloads.",
      "Every provider asset fetch still needs AOI coverage and license checks.",
      "Fallback visual terrain is excluded from BA source truth by default."
    ],
    gaps,
    provenance: {
      source: "vmesh-reviewed-source-registry",
      reviewReport: "docs/GEOSPATIAL_SOURCE_REVIEW.md",
      plannerSchemaVersion: "vmesh-geospatial-package-plan-v1",
      liveProofEvidence
    }
  };
}

export function getBaGeospatialLayersForSegments(
  segments: BaGeospatialSegmentId[]
): PackageLayerId[] {
  return Array.from(new Set(parseSegments(segments).flatMap((segment) => SEGMENT_LAYERS[segment])));
}

export function getReviewedBaSourcesForSegment(
  segment: BaGeospatialSegmentId,
  options: GeospatialSourceRegistryOptions = {}
): BaSourceRecord[] {
  const packageResponse = createBaGeospatialPackage(
    {
      aoi: { h3Id: "85393363fffffff" },
      segments: [segment]
    },
    options
  );

  return packageResponse.sourceRecords;
}

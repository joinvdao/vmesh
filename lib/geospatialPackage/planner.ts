import {
  getDefaultPackageLayers,
  getGeospatialSourceRegistry,
  getPackageSourcesByLayer,
  type GeospatialSourceRegistryOptions
} from "@/lib/geospatialPackage/sourceRegistry";
import type {
  GeospatialPackagePlan,
  GeospatialSourceCandidate,
  NormalizedPackageAoi,
  PackageArtifactKind,
  PackageLayerId,
  PackagePlanArtifact,
  PackagePlanRequest,
  PackageSourceStatus,
  SourceProbeResult
} from "@/lib/geospatialPackage/types";
import {
  containsSecretLikeValue,
  createPackageCacheKey,
  describePackageAoiDisclosure,
  normalizePackageAoi,
  stableId
} from "@/lib/geospatialPackage/plannerUtils";
import {
  isBritishColumbiaTerrainSourceCoordinate,
  isCanadaTerrainSourceCoordinate,
  isKamloopsOperatorLocalTerrainCoordinate,
  isUsaTerrainSourceCoordinate
} from "@/lib/terrainSourcePreview";

export interface PackagePlannerOptions extends GeospatialSourceRegistryOptions {
  now?: () => Date;
}

const SCHEMA_VERSION = "vmesh-geospatial-package-plan-v1";
const DEFAULT_RESOLUTION = 5;
const ALL_PACKAGE_LAYERS: PackageLayerId[] = [
  "terrain",
  "imagery",
  "roads",
  "buildings",
  "water",
  "vegetation",
  "parcels",
  "climate",
  "hydrology",
  "contours",
  "landcover",
  "field-boundaries"
];

function emptySelectedSources(): Record<PackageLayerId, GeospatialSourceCandidate | null> {
  return ALL_PACKAGE_LAYERS.reduce(
    (record, layerId) => ({ ...record, [layerId]: null }),
    {} as Record<PackageLayerId, GeospatialSourceCandidate | null>
  );
}

function statusRank(status: PackageSourceStatus): number {
  const ranks: Record<PackageSourceStatus, number> = {
    cached: 120,
    configured: 115,
    open: 110,
    "preprocessing-required": 75,
    future: 35,
    "token-gated": 25,
    "license-gated": 20,
    paid: 15,
    blocked: 0,
    missing: 0
  };

  return ranks[status];
}

function sourceRank({
  source,
  preferredIds,
  offline,
  layerId,
  aoi
}: {
  source: GeospatialSourceCandidate;
  preferredIds: Set<string>;
  offline: boolean;
  layerId: PackageLayerId;
  aoi: NormalizedPackageAoi;
}): number {
  return (
    statusRank(source.status) +
    (source.access === "open" || source.access === "local" ? 16 : 0) +
    (source.packageReady ? 12 : 0) +
    (source.mapReady ? 8 : 0) +
    (source.cacheable ? 6 : 0) +
    (offline && source.artifactKinds.includes("pmtiles") ? 12 : 0) +
    regionalTerrainPreferenceRank({ source, layerId, aoi }) +
    (preferredIds.has(source.id) ? 120 : 0) -
    source.priority / 100
  );
}

function regionalTerrainPreferenceRank({
  source,
  layerId,
  aoi
}: {
  source: GeospatialSourceCandidate;
  layerId: PackageLayerId;
  aoi: NormalizedPackageAoi;
}): number {
  if (layerId !== "terrain") return 0;

  const coordinate = aoi.centroid;
  const inUsa = isUsaTerrainSourceCoordinate(coordinate);
  const inCanada = isCanadaTerrainSourceCoordinate(coordinate);
  if (isKamloopsOperatorLocalTerrainCoordinate(coordinate)) {
    if (source.id === "kamloops-local-lidar-dtm-1m") return 132;
  }
  if (isBritishColumbiaTerrainSourceCoordinate(coordinate)) {
    if (source.id === "bc-lidarbc") return 112;
    if (source.id === "canada-hrdem") return 102;
    if (source.id === "canada-hrdem-best-dtm") return 92;
    return 0;
  }

  if (inUsa && !inCanada) {
    if (source.id === "usgs-3dep") return 108;
    return 0;
  }

  if (inCanada && !inUsa) {
    if (source.id === "canada-hrdem") return 106;
    if (source.id === "canada-hrdem-best-dtm") return 96;
    return 0;
  }

  return 0;
}

function isSourceSelectable(source: GeospatialSourceCandidate): boolean {
  const statusSelectable =
    source.status !== "blocked" &&
    source.status !== "missing" &&
    source.status !== "paid" &&
    source.status !== "token-gated" &&
    source.status !== "license-gated";
  const accessSelectable = source.access === "open" || source.access === "local";

  return statusSelectable && accessSelectable && !source.requiresApiKey;
}

function selectSourceForLayer({
  candidates,
  preferredIds,
  offline,
  layerId,
  aoi
}: {
  candidates: GeospatialSourceCandidate[];
  preferredIds: Set<string>;
  offline: boolean;
  layerId: PackageLayerId;
  aoi: NormalizedPackageAoi;
}): GeospatialSourceCandidate | null {
  const selectable = candidates.filter(isSourceSelectable);

  return (
    selectable.sort(
      (left, right) =>
        sourceRank({ source: right, preferredIds, offline, layerId, aoi }) -
        sourceRank({ source: left, preferredIds, offline, layerId, aoi })
    )[0] ?? null
  );
}

function coverageStatus(source: GeospatialSourceCandidate): SourceProbeResult["coverageStatus"] {
  if (source.status === "blocked" || source.status === "missing") return "unavailable";
  if (source.coverage.toLowerCase().includes("global")) return "covers-aoi";
  if (source.coverage.toLowerCase().includes("package aoi")) return "covers-aoi";
  if (source.coverage.toLowerCase().includes("jurisdiction")) return "regional-check-required";
  if (source.coverage.toLowerCase().includes("coastal")) return "regional-check-required";
  return "probable";
}

function estimatedSteps(source: GeospatialSourceCandidate, layerId: PackageLayerId): string[] {
  if (source.status === "open" && source.mapReady) {
    return ["Register provider in MapLibre/deck.gl if layer is visual.", "Attach provenance."];
  }
  if (source.status === "configured" || source.status === "cached") {
    return [
      "Read configured manifest or cached tile archive.",
      "Validate provenance and layer role."
    ];
  }
  if (source.status === "preprocessing-required") {
    return [
      `Probe ${layerId} coverage for the requested AOI.`,
      "Clip or transform source data outside the browser.",
      "Generate PMTiles/vector tiles/COG plus H3 summaries where useful.",
      "Write manifest with license, attribution, confidence, and limitations."
    ];
  }
  if (source.status === "license-gated" || source.status === "token-gated") {
    return ["Complete terms/key review before planning live or cached artifacts."];
  }
  return ["Keep as future provider metadata until an adapter exists."];
}

function createProbe({
  source,
  layerId,
  selected
}: {
  source: GeospatialSourceCandidate;
  layerId: PackageLayerId;
  selected: boolean;
}): SourceProbeResult {
  const canGenerateArtifacts = source.packageReady && isSourceSelectable(source);

  return {
    sourceId: source.id,
    sourceLabel: source.label,
    layerId,
    status: source.status,
    access: source.access,
    coverageStatus: coverageStatus(source),
    selected,
    reason: selected
      ? "Selected by open-data-first package ranking."
      : (source.limitations[0] ?? source.notes),
    canGenerateArtifacts,
    artifactKinds: source.artifactKinds,
    estimatedSteps: estimatedSteps(source, layerId)
  };
}

function artifactKindForLayer(
  layerId: PackageLayerId,
  source: GeospatialSourceCandidate
): PackageArtifactKind {
  const preferred: Record<PackageLayerId, PackageArtifactKind[]> = {
    terrain: ["pmtiles", "raster-tiles", "cog"],
    imagery: ["pmtiles", "raster-tiles", "cog"],
    roads: ["pmtiles", "vector-tiles", "geoparquet"],
    buildings: ["pmtiles", "vector-tiles", "geoparquet"],
    water: ["pmtiles", "vector-tiles", "geoparquet"],
    vegetation: ["h3-summary", "pmtiles", "cog"],
    parcels: ["pmtiles", "vector-tiles", "geoparquet"],
    climate: ["h3-summary", "api", "zarr"],
    hydrology: ["h3-summary", "pmtiles", "vector-tiles"],
    contours: ["pmtiles", "vector-tiles"],
    landcover: ["h3-summary", "pmtiles", "cog"],
    "field-boundaries": ["h3-summary", "pmtiles", "geoparquet"]
  };

  return preferred[layerId].find((kind) => source.artifactKinds.includes(kind)) ?? "manifest";
}

function artifactStatus(source: GeospatialSourceCandidate): PackagePlanArtifact["status"] {
  if (source.status === "cached") return "cache-hit";
  if (source.status === "open" && source.mapReady) return "ready-external";
  if (source.status === "configured") return "ready-external";
  if (source.status === "preprocessing-required" || source.status === "future") return "planned";
  return "blocked";
}

function createArtifact({
  packageId,
  layerId,
  source
}: {
  packageId: string;
  layerId: PackageLayerId;
  source: GeospatialSourceCandidate;
}): PackagePlanArtifact {
  const kind = artifactKindForLayer(layerId, source);
  const status = artifactStatus(source);

  return {
    layerId,
    sourceId: source.id,
    kind,
    status,
    cacheKey: createPackageCacheKey({ packageId, layerId, sourceId: source.id }),
    url:
      status === "ready-external" && source.sourceUrl && !containsSecretLikeValue(source.sourceUrl)
        ? source.sourceUrl
        : null,
    generator:
      status === "ready-external"
        ? "external-provider"
        : kind === "h3-summary"
          ? "h3-summary-worker"
          : "geospatial-package-worker",
    provenance: {
      providerId: source.id,
      attribution: source.attribution,
      license: source.license,
      limitations: source.limitations
    }
  };
}

function createPackageId(aoi: NormalizedPackageAoi, requestedLayers: PackageLayerId[]): string {
  return `vmesh-${stableId(aoi.h3Id)}-${stableId(requestedLayers.join("-"))}`;
}

export function createGeospatialPackagePlan(
  request: PackagePlanRequest,
  options: PackagePlannerOptions = {}
): GeospatialPackagePlan {
  const requestedLayers =
    request.layers.length > 0 ? Array.from(new Set(request.layers)) : getDefaultPackageLayers();
  const aoi = normalizePackageAoi(request.aoi, request.maxResolution ?? DEFAULT_RESOLUTION);
  const aoiDisclosure = describePackageAoiDisclosure(request.aoi);
  const packageId = createPackageId(aoi, requestedLayers);
  const preferredIds = new Set(request.preferredSourceIds ?? []);
  const sources = getGeospatialSourceRegistry(options);
  const selectedSources = emptySelectedSources();
  const probes: SourceProbeResult[] = [];
  const artifacts: PackagePlanArtifact[] = [];

  for (const layerId of requestedLayers) {
    const candidates = getPackageSourcesByLayer(sources, layerId);
    const selected = selectSourceForLayer({
      candidates,
      preferredIds,
      offline: request.offline ?? false,
      layerId,
      aoi
    });
    selectedSources[layerId] = selected;

    for (const candidate of candidates) {
      probes.push(
        createProbe({ source: candidate, layerId, selected: candidate.id === selected?.id })
      );
    }

    if (selected) {
      artifacts.push(createArtifact({ packageId, layerId, source: selected }));
    }
  }

  const rejectedSources = probes.filter((probe) => !probe.selected);
  const warnings = [
    "This plan is source-honest metadata; it does not download or generate heavy artifacts in the browser.",
    "Package workers must preserve license, attribution, CRS, timestamp, confidence, and limitations for every output.",
    "Parcel and field-boundary layers are not legal boundary truth unless backed by official reviewed sources."
  ];
  const createdAt = (options.now?.() ?? new Date("2026-05-12T00:00:00.000Z")).toISOString();

  return {
    id: packageId,
    schemaVersion: SCHEMA_VERSION,
    createdAt,
    aoi,
    aoiDisclosure,
    requestedLayers,
    selectedSources,
    probes,
    artifacts,
    manifest: {
      packageId,
      schemaVersion: "vmesh-geospatial-package-manifest-v1",
      manifestUrl: `/api/geospatial-package/plan?id=${packageId}`,
      artifactCount: artifacts.length,
      aoi,
      aoiDisclosure,
      requestedLayers,
      consumerAppId: request.consumerAppId ?? "generic-downstream-app"
    },
    rejectedSources,
    warnings,
    nextActions: [
      "Expose this plan to the requesting app before a package job is run.",
      "Run a local/server package worker for preprocessing-required layers.",
      "Publish generated PMTiles, vector tiles, COGs, and H3 summaries behind clean package URLs.",
      "Keep raw downloads, private AOIs, and generated caches outside Git."
    ],
    apiSurface: {
      listSources: "/api/geospatial-package/sources",
      planPackage: "/api/geospatial-package/plan",
      getManifest: `/api/geospatial-package/plan?id=${packageId}`,
      mcpToolNamespace: "vmesh.geospatial_package"
    }
  };
}

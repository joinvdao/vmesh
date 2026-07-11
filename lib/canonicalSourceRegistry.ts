import { getGeospatialSourceRegistry } from "@/lib/geospatialPackage/sourceRegistry";
import type {
  GeospatialSourceCandidate,
  PackageArtifactKind,
  PackageLayerId,
  PackageProbeStrategy
} from "@/lib/geospatialPackage/types";
import { SupabaseManagementQueryClient } from "@/lib/supabaseManagementQueryClient";
import { operationalSourceIds } from "@/lib/sourcePromotionGate";

interface CanonicalRegistryRow extends Record<string, unknown> {
  id: string;
}

export interface ResolvedCanonicalSourceRegistry {
  sources: GeospatialSourceCandidate[];
  promotedSourceIds: Set<string>;
  mode: "canonical-primary" | "code-fallback";
  warnings: string[];
}

interface CanonicalRegistryLoadOptions {
  query?: () => Promise<Array<Record<string, unknown>>>;
  now?: () => number;
  cacheTtlMs?: number;
}

let cached: { expiresAt: number; value: ResolvedCanonicalSourceRegistry } | undefined;

export async function loadCanonicalSourceRegistry(
  options: CanonicalRegistryLoadOptions = {}
): Promise<ResolvedCanonicalSourceRegistry> {
  const now = options.now?.() ?? Date.now();
  const useSharedCache = !options.query;
  if (useSharedCache && cached && cached.expiresAt > now) return cached.value;

  const codeSources = getGeospatialSourceRegistry();
  try {
    const rows = options.query ? await options.query() : await queryCanonicalPromotedRows();
    const canonicalSources = canonicalRowsToSources(rows, codeSources);
    if (!canonicalSources.length) throw new Error("canonical-promoted-registry-empty");
    const canonicalById = new Map(canonicalSources.map((source) => [source.id, source]));
    const value: ResolvedCanonicalSourceRegistry = {
      sources: codeSources.map((source) => canonicalById.get(source.id) ?? source),
      promotedSourceIds: new Set(canonicalSources.map((source) => source.id)),
      mode: "canonical-primary",
      warnings: [
        `Durable canonical registry supplied ${canonicalSources.length} promoted source records.`
      ]
    };
    for (const source of canonicalSources) {
      if (!value.sources.some((candidate) => candidate.id === source.id))
        value.sources.push(source);
    }
    if (useSharedCache) {
      cached = { expiresAt: now + cacheTtl(options.cacheTtlMs), value };
    }
    return value;
  } catch {
    return {
      sources: codeSources,
      promotedSourceIds: new Set(operationalSourceIds()),
      mode: "code-fallback",
      warnings: [
        "Durable canonical registry was unavailable; source planning used the explicit reviewed code-registry promotion fallback."
      ]
    };
  }
}

export function canonicalRowsToSources(
  rows: Array<Record<string, unknown>>,
  codeSources = getGeospatialSourceRegistry()
): GeospatialSourceCandidate[] {
  const codeById = new Map(codeSources.map((source) => [source.id, source]));
  return rows.flatMap((raw) => {
    if (!isCanonicalRow(raw)) return [];
    const sourceUrl = safePublicUrl(raw.source_url);
    const baseline = codeById.get(raw.id);
    const roles = record(raw.asset_roles);
    const layerIds = stringArray(roles?.layerIds).filter(isPackageLayerId);
    const artifactKinds = stringArray(roles?.artifactKinds).filter(isPackageArtifactKind);
    if (!sourceUrl || !layerIds.length || !artifactKinds.length) return [];
    const coverage = record(raw.coverage);
    return [
      {
        id: raw.id,
        label: stringValue(raw.title) ?? baseline?.label ?? raw.id,
        layerIds,
        status: "open",
        access: "open",
        artifactKinds,
        coverage: stringValue(coverage?.coverageSummary) ?? baseline?.coverage ?? "unknown",
        resolution:
          stringValue(coverage?.resolutionOrScale) ??
          numericResolution(raw.resolution_meters) ??
          baseline?.resolution ??
          "unknown",
        sourceUrl,
        attribution: stringValue(raw.provider) ?? baseline?.attribution ?? "Reviewed source",
        license: stringValue(raw.license) ?? baseline?.license ?? "review-required",
        requiresApiKey: false,
        mapReady: baseline?.mapReady ?? false,
        packageReady: true,
        cacheable: baseline?.cacheable ?? true,
        priority: baseline?.priority ?? 999,
        probeStrategy: baseline?.probeStrategy ?? probeStrategy(raw.endpoint_type),
        truthRole: stringValue(raw.source_role) ?? baseline?.truthRole ?? "source-context",
        limitations: stringArray(raw.limitations),
        notes: "Promoted by the durable canonical VMesh source registry."
      }
    ];
  });
}

async function queryCanonicalPromotedRows() {
  const managementToken = process.env.SUPABASE_ACCESS_TOKEN ?? "";
  const projectRef =
    process.env.SUPABASE_PROJECT_REF ?? process.env.SIMPLELOOP_SUPABASE_PROJECT_REF ?? "";
  if (!managementToken || !projectRef) throw new Error("canonical-registry-not-configured");
  const client = new SupabaseManagementQueryClient({ managementToken, projectRef });
  const result = await client.query(`
    SELECT id,title,provider,source_url,license,source_role,resolution_meters,
      asset_roles,limitations,coverage,endpoint_type,promotion_state,capability_state
    FROM vmesh.source_collections
    WHERE promotion_state = 'promoted'
      AND capability_state = 'abundance-live-proven'
      AND endpoint_status = 'verified'
    ORDER BY data_bucket,id
  `);
  return result.rows;
}

function cacheTtl(value: number | undefined) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  const parsed = Number(process.env.VMESH_CANONICAL_REGISTRY_CACHE_TTL_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60_000;
}

function isCanonicalRow(value: Record<string, unknown>): value is CanonicalRegistryRow {
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    value.promotion_state === "promoted" &&
    value.capability_state === "abundance-live-proven"
  );
}

function safePublicUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function numericResolution(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? `${value} m` : null;
}

function isPackageLayerId(value: string): value is PackageLayerId {
  return new Set([
    "terrain",
    "imagery",
    "roads",
    "buildings",
    "water",
    "vegetation",
    "ecology",
    "soil",
    "parcels",
    "climate",
    "hydrology",
    "contours",
    "landcover",
    "field-boundaries"
  ]).has(value);
}

function isPackageArtifactKind(value: string): value is PackageArtifactKind {
  return new Set([
    "pmtiles",
    "vector-tiles",
    "raster-tiles",
    "cog",
    "zarr",
    "geoparquet",
    "h3-summary",
    "manifest",
    "api",
    "none"
  ]).has(value);
}

function probeStrategy(value: unknown): PackageProbeStrategy {
  const adapter = stringValue(value) ?? "";
  if (adapter.includes("stac")) return "stac-search";
  if (adapter.includes("api") || adapter.includes("feature")) return "bounded-api";
  return "catalog-lookup";
}

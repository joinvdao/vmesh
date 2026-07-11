export const EXECUTABLE_RECIPE_FAMILIES = [
  "stac",
  "cog",
  "arcgis-feature-service",
  "wfs",
  "geoparquet",
  "pmtiles",
  "archive-index",
  "typed-api"
] as const;

export type ExecutableRecipeFamily = (typeof EXECUTABLE_RECIPE_FAMILIES)[number];
export type PromotionDecision = "promoted" | "quarantined" | "demoted";

export interface SourcePromotionCandidate {
  sourceId: string;
  authorityReviewed: boolean;
  endpoint: string;
  licenseReviewed: boolean;
  accessAllowed: boolean;
  coverageStatus: "covered" | "partial" | "not-covered" | "unknown";
  sourceRole: string | null;
  resolutionOrScale: string | null;
  confidence: number | null;
  recipeFamily: string | null;
  assetFormat: string | null;
  fixtureEvidenceRef: string | null;
  liveEvidenceRef: string | null;
  lastHealthyAt: string | null;
  consecutiveFailures: number;
  limitations: string[];
  fallbackBehavior: string | null;
}

export interface SourcePromotionResult {
  sourceId: string;
  decision: PromotionDecision;
  executable: boolean;
  reasons: string[];
  evaluatedAt: string;
}

const SAFE_ASSET_FORMATS = new Set([
  "application/geo+json",
  "application/json",
  "application/vnd.apache.parquet",
  "application/vnd.pmtiles",
  "application/x-geotiff",
  "application/zip",
  "image/tiff; application=geotiff",
  "image/tiff; application=geotiff; profile=cloud-optimized"
]);
const FAILURE_DEMOTION_THRESHOLD = 3;
const MAX_EVIDENCE_AGE_MS = 30 * 24 * 60 * 60 * 1_000;

export function evaluateSourcePromotion(
  candidate: SourcePromotionCandidate,
  options: { now?: Date } = {}
): SourcePromotionResult {
  const now = options.now ?? new Date();
  const reasons: string[] = [];
  if (!candidate.authorityReviewed) reasons.push("authority-unreviewed");
  if (!candidate.licenseReviewed || !candidate.accessAllowed)
    reasons.push("license-or-access-gated");
  if (!new Set(["covered", "partial"]).has(candidate.coverageStatus))
    reasons.push("coverage-unproven");
  if (!candidate.sourceRole) reasons.push("source-role-missing");
  if (!candidate.resolutionOrScale) reasons.push("resolution-or-scale-missing");
  if (candidate.confidence === null || candidate.confidence < 0 || candidate.confidence > 1)
    reasons.push("confidence-invalid");
  if (
    !candidate.recipeFamily ||
    !EXECUTABLE_RECIPE_FAMILIES.includes(candidate.recipeFamily as ExecutableRecipeFamily)
  )
    reasons.push("recipe-family-unsupported");
  if (!candidate.assetFormat || !SAFE_ASSET_FORMATS.has(candidate.assetFormat.toLowerCase()))
    reasons.push("asset-format-unsupported");
  reasons.push(...unsafeEndpointReasons(candidate.endpoint));
  if (!candidate.fixtureEvidenceRef) reasons.push("fixture-evidence-missing");
  if (!candidate.liveEvidenceRef) reasons.push("live-evidence-missing");
  if (!candidate.limitations.length) reasons.push("limitations-missing");
  if (!candidate.fallbackBehavior) reasons.push("fallback-behavior-missing");

  const healthyAt = candidate.lastHealthyAt ? Date.parse(candidate.lastHealthyAt) : Number.NaN;
  if (!Number.isFinite(healthyAt) || now.getTime() - healthyAt > MAX_EVIDENCE_AGE_MS)
    reasons.push("health-evidence-stale");
  if (candidate.consecutiveFailures >= FAILURE_DEMOTION_THRESHOLD)
    reasons.push("consecutive-failure-threshold-reached");

  const demoted = reasons.some((reason) =>
    new Set(["health-evidence-stale", "consecutive-failure-threshold-reached"]).has(reason)
  );
  return {
    sourceId: candidate.sourceId,
    decision: reasons.length === 0 ? "promoted" : demoted ? "demoted" : "quarantined",
    executable: reasons.length === 0,
    reasons,
    evaluatedAt: now.toISOString()
  };
}

export function unsafeEndpointReasons(endpoint: string): string[] {
  if (/^(?:[a-z]:[\\/]|\\\\|\/)|^file:/i.test(endpoint)) return ["local-path-rejected"];
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return ["endpoint-invalid"];
  }
  if (url.protocol !== "https:") return ["endpoint-not-https"];
  if (url.username || url.password) return ["credential-bearing-ref-rejected"];
  if (
    /(?:^|\.)(?:localhost|local|internal)$/i.test(url.hostname) ||
    /^(?:127\.|10\.|192\.168\.|169\.254\.)/.test(url.hostname) ||
    /^\[?(?:::1|fc|fd|fe80)/i.test(url.hostname)
  )
    return ["private-endpoint-rejected"];
  const signedKeys = ["token", "sig", "signature", "x-amz-signature", "x-goog-signature"];
  const queryKeys = [...url.searchParams.keys()].map((key) => key.toLowerCase());
  if (signedKeys.some((key) => queryKeys.includes(key))) return ["signed-or-secret-ref-rejected"];
  if (/\.(?:html?|png|jpe?g|webp)$/i.test(url.pathname)) return ["preview-or-html-ref-rejected"];
  return [];
}

const OPERATIONAL_CANDIDATES: SourcePromotionCandidate[] = [
  operationalCandidate(
    "copernicus-dem-glo30",
    "https://copernicus-dem-30m.s3.amazonaws.com/",
    "cog",
    "image/tiff; application=geotiff; profile=cloud-optimized",
    "global",
    "generic-dem",
    "30 m",
    "docs/evidence/global-terrain-live-matrix-2026-07-11.json"
  ),
  operationalCandidate(
    "usgs-3dep",
    "https://tnmaccess.nationalmap.gov/api/v1/products",
    "typed-api",
    "application/json",
    "partial",
    "bare-earth-dtm",
    "1 m where available",
    "docs/evidence/global-terrain-live-matrix-2026-07-11.json"
  ),
  operationalCandidate(
    "esa-worldcover",
    "https://esa-worldcover.s3.eu-central-1.amazonaws.com/",
    "cog",
    "image/tiff; application=geotiff; profile=cloud-optimized",
    "global",
    "modelled-landcover-context",
    "10 m",
    "docs/evidence/worldcover-live-matrix-2026-07-11.json"
  ),
  operationalCandidate(
    "overture-maps-geoparquet",
    "https://stac.overturemaps.org/catalog.json",
    "pmtiles",
    "application/vnd.pmtiles",
    "global",
    "open-vector-context",
    "source-dependent",
    "docs/evidence/building-live-matrix-2026-07-11.json"
  ),
  operationalCandidate(
    "open-meteo-forecast",
    "https://api.open-meteo.com/v1/forecast",
    "typed-api",
    "application/json",
    "global",
    "modelled-current-weather-context",
    "model grid",
    "docs/evidence/context-live-matrix-2026-07-11.json"
  ),
  operationalCandidate(
    "soilgrids",
    "https://rest.isric.org/soilgrids/v2.0/properties/query",
    "typed-api",
    "application/json",
    "global",
    "modelled-global-soil-context",
    "250 m model",
    "docs/evidence/context-live-matrix-2026-07-11.json"
  )
];

export function operationalPromotionCandidates(): SourcePromotionCandidate[] {
  return OPERATIONAL_CANDIDATES.map((candidate) => ({
    ...candidate,
    limitations: [...candidate.limitations]
  }));
}

function operationalCandidate(
  sourceId: string,
  endpoint: string,
  recipeFamily: ExecutableRecipeFamily,
  assetFormat: string,
  coverage: "global" | "partial",
  sourceRole: string,
  resolutionOrScale: string,
  evidenceRef: string
): SourcePromotionCandidate {
  return {
    sourceId,
    authorityReviewed: true,
    endpoint,
    licenseReviewed: true,
    accessAllowed: true,
    coverageStatus: coverage === "global" ? "covered" : "partial",
    sourceRole,
    resolutionOrScale,
    confidence: coverage === "global" ? 0.8 : 0.9,
    recipeFamily,
    assetFormat,
    fixtureEvidenceRef: "tests/sourcePromotionGate.test.ts",
    liveEvidenceRef: evidenceRef,
    lastHealthyAt: "2026-07-11T00:00:00Z",
    consecutiveFailures: 0,
    limitations: ["Operational only for the published source role and proven coverage semantics."],
    fallbackBehavior:
      "Return explicit failure or no-data and continue the layer-specific ranked ladder."
  };
}

export function operationalPromotionResults(now = new Date()): SourcePromotionResult[] {
  return operationalPromotionCandidates().map((candidate) =>
    evaluateSourcePromotion(candidate, { now })
  );
}

export function isOperationalSourcePromoted(sourceId: string, now = new Date()): boolean {
  return operationalPromotionResults(now).some(
    (result) => result.sourceId === sourceId && result.executable
  );
}

export function operationalSourceIds(now = new Date()): string[] {
  return operationalPromotionResults(now)
    .filter((result) => result.executable)
    .map((result) => result.sourceId)
    .sort();
}

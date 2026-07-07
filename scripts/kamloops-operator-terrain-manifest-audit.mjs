import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_MANIFEST = "config/operator-sources/kamloops-terrain.manifest.json";
const DEFAULT_OUTPUT = ".artifacts/kamloops-operator-terrain-manifest-audit/latest.private.json";
const DEFAULT_EDGE_METERS = 3000;
const DEFAULT_SAMPLES = 12;
const DEFAULT_SEED = 240707;
const KAMLOOPS_TERRAIN_TEST_EXTENT_WGS84 = {
  west: -120.546437,
  south: 50.607833,
  east: -120.025817,
  north: 50.873614
};

function usage() {
  return [
    "Kamloops operator terrain manifest audit",
    "",
    "Usage:",
    "  npm run terrain:kamloops-manifest-audit -- [--manifest config/operator-sources/kamloops-terrain.manifest.json] [--samples 12] [--edge-meters 3000] [--probe-url] [--require-ready]",
    "",
    "The output report omits exact sample coordinates and expanded bbox URLs by default."
  ].join("\n");
}

function valueAfter(args, index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value.`);
  return value;
}

function parseNumber(value, flag) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${flag} must be a finite number.`);
  return parsed;
}

function parseArgs(args) {
  const options = {
    manifest: DEFAULT_MANIFEST,
    output: DEFAULT_OUTPUT,
    samples: DEFAULT_SAMPLES,
    edgeMeters: DEFAULT_EDGE_METERS,
    seed: DEFAULT_SEED,
    probeUrl: false,
    requireReady: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      console.log(usage());
      process.exit(0);
    }
    if (arg === "--manifest") {
      options.manifest = valueAfter(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === "--output") {
      options.output = valueAfter(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === "--samples") {
      options.samples = Math.max(
        1,
        Math.min(100, Math.floor(parseNumber(valueAfter(args, index, arg), arg)))
      );
      index += 1;
      continue;
    }
    if (arg === "--edge-meters") {
      options.edgeMeters = Math.max(
        512,
        Math.min(10000, parseNumber(valueAfter(args, index, arg), arg))
      );
      index += 1;
      continue;
    }
    if (arg === "--seed") {
      options.seed = Math.floor(parseNumber(valueAfter(args, index, arg), arg));
      index += 1;
      continue;
    }
    if (arg === "--probe-url") {
      options.probeUrl = true;
      continue;
    }
    if (arg === "--require-ready") {
      options.requireReady = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function offsetCoordinate({ latitude, longitude, eastMeters, northMeters }) {
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng = Math.max(
    12_000,
    metersPerDegreeLat * Math.cos((latitude * Math.PI) / 180)
  );
  return {
    latitude: latitude + northMeters / metersPerDegreeLat,
    longitude: longitude + eastMeters / metersPerDegreeLng
  };
}

function boundsFromCentroid({ latitude, longitude, edgeMeters }) {
  const half = edgeMeters / 2;
  const southWest = offsetCoordinate({
    latitude,
    longitude,
    eastMeters: -half,
    northMeters: -half
  });
  const northEast = offsetCoordinate({
    latitude,
    longitude,
    eastMeters: half,
    northMeters: half
  });
  return {
    west: southWest.longitude,
    south: southWest.latitude,
    east: northEast.longitude,
    north: northEast.latitude
  };
}

function centerExtentForEdge(edgeMeters) {
  const half = edgeMeters / 2;
  const southWest = offsetCoordinate({
    latitude: KAMLOOPS_TERRAIN_TEST_EXTENT_WGS84.south,
    longitude: KAMLOOPS_TERRAIN_TEST_EXTENT_WGS84.west,
    eastMeters: half,
    northMeters: half
  });
  const northEast = offsetCoordinate({
    latitude: KAMLOOPS_TERRAIN_TEST_EXTENT_WGS84.north,
    longitude: KAMLOOPS_TERRAIN_TEST_EXTENT_WGS84.east,
    eastMeters: -half,
    northMeters: -half
  });
  return {
    west: southWest.longitude,
    south: southWest.latitude,
    east: northEast.longitude,
    north: northEast.latitude
  };
}

function bboxContains(container, target) {
  return (
    target.west >= container.west &&
    target.east <= container.east &&
    target.south >= container.south &&
    target.north <= container.north
  );
}

function lcg(seed) {
  let value = Math.abs(seed || DEFAULT_SEED) % 2147483647;
  if (value === 0) value = 1;
  return () => {
    value = (value * 48271) % 2147483647;
    return value / 2147483647;
  };
}

function randomSamples({ samples, seed, edgeMeters }) {
  const random = lcg(seed);
  const centerExtent = centerExtentForEdge(edgeMeters);
  return Array.from({ length: samples }, (_, index) => {
    const longitude = centerExtent.west + (centerExtent.east - centerExtent.west) * random();
    const latitude = centerExtent.south + (centerExtent.north - centerExtent.south) * random();
    return {
      id: `sample-${String(index + 1).padStart(2, "0")}`,
      latitude,
      longitude,
      bbox: boundsFromCentroid({ latitude, longitude, edgeMeters })
    };
  });
}

function formatCoordinate(value) {
  return Number(value.toFixed(6)).toString();
}

function bboxString(bbox) {
  return [bbox.west, bbox.south, bbox.east, bbox.north].map(formatCoordinate).join(",");
}

function expandUrlTemplate({ template, bbox, packageId, sourceId }) {
  const replacements = {
    bbox: bboxString(bbox),
    west: formatCoordinate(bbox.west),
    south: formatCoordinate(bbox.south),
    east: formatCoordinate(bbox.east),
    north: formatCoordinate(bbox.north),
    packageId,
    sourceId,
    toolId: "kamloops-local-lidar",
    targetResolutionMeters: "1",
    widthPx: "3000",
    heightPx: "3000"
  };
  return template.replace(/\{([a-zA-Z0-9_-]+)\}/g, (match, key) => replacements[key] ?? match);
}

function isRecord(value) {
  return typeof value === "object" && value !== null;
}

function sourceEntries(manifest) {
  if (!isRecord(manifest)) return [];
  if (manifest.schemaVersion !== "vmesh-kamloops-operator-terrain-source-manifest-v1") return [];
  if (Array.isArray(manifest.sources)) return manifest.sources.filter(isRecord);
  return [manifest];
}

function validCoverage(value) {
  if (!isRecord(value)) return null;
  const west = Number(value.west);
  const south = Number(value.south);
  const east = Number(value.east);
  const north = Number(value.north);
  if (![west, south, east, north].every(Number.isFinite)) return null;
  if (west >= east || south >= north) return null;
  return { west, south, east, north };
}

function isPublicHttpsRasterRef(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  ) {
    return false;
  }
  const normalized = url.toString().toLowerCase();
  const pathname = url.pathname.toLowerCase();
  return (
    /\.(tif|tiff)$/i.test(pathname) ||
    normalized.includes("format=tiff") ||
    normalized.includes("format=image/tiff") ||
    pathname.endsWith("/imageserver/exportimage")
  );
}

function validateSource(source, samples) {
  const coverage = validCoverage(source.coverage);
  const urlTemplate = source.source?.urlTemplate;
  const url = source.source?.url;
  const reasons = [];
  if ((source.sourceId ?? "kamloops-local-lidar-dtm-1m") !== "kamloops-local-lidar-dtm-1m") {
    reasons.push("sourceId is not kamloops-local-lidar-dtm-1m");
  }
  if (source.role !== "bare-earth-dtm") reasons.push("role is not bare-earth-dtm");
  if (!Number.isFinite(source.resolutionMeters) || source.resolutionMeters > 1) {
    reasons.push("resolutionMeters is missing or above 1m");
  }
  if (!source.crs) reasons.push("crs is missing");
  if (!source.verticalDatum) reasons.push("verticalDatum is missing");
  if (!coverage) reasons.push("coverage is missing or invalid");
  if (source.qa?.sourceNativeRaster !== true) reasons.push("qa.sourceNativeRaster is not true");
  if (source.qa?.coverageStatus !== "contains-aoi") {
    reasons.push("qa.coverageStatus is not contains-aoi");
  }

  const sampleResults = samples.map((sample) => ({
    id: sample.id,
    covered: coverage ? bboxContains(coverage, sample.bbox) : false,
    frameDisclosure: "redacted-deterministic-seed",
    expandedUrl: urlTemplate
      ? expandUrlTemplate({
          template: urlTemplate,
          bbox: sample.bbox,
          packageId: `kamloops-operator-audit-${sample.id}`,
          sourceId: source.sourceId ?? "kamloops-local-lidar-dtm-1m"
        })
      : url
  }));

  if (sampleResults.some((sample) => !sample.covered)) {
    reasons.push("source coverage does not contain every sampled 3km frame");
  }
  if (
    sampleResults.some(
      (sample) => !sample.expandedUrl || !isPublicHttpsRasterRef(sample.expandedUrl)
    )
  ) {
    reasons.push(
      "source URL/template did not expand to public-safe HTTPS raster refs for every sample"
    );
  }

  return {
    sourceId: source.id ?? source.sourceId ?? "unnamed-source",
    coverage,
    ready: reasons.length === 0,
    reasons,
    probeCandidateUrl: sampleResults.find((sample) => sample.expandedUrl)?.expandedUrl,
    sampleResults: sampleResults.map((sample) => ({
      id: sample.id,
      covered: sample.covered,
      frameDisclosure: sample.frameDisclosure,
      expandedUrlRedacted: Boolean(sample.expandedUrl),
      publicSafeRasterRef: Boolean(sample.expandedUrl && isPublicHttpsRasterRef(sample.expandedUrl))
    }))
  };
}

async function fetchWithTimeout(url, options, timeoutMs = 15_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function probeUrl(url) {
  for (const init of [
    { method: "HEAD", headers: { Accept: "image/tiff,*/*" } },
    { method: "GET", headers: { Accept: "image/tiff,*/*", Range: "bytes=0-0" } }
  ]) {
    try {
      const response = await fetchWithTimeout(url, init);
      if (response.body) await response.body.cancel().catch(() => undefined);
      if (response.ok || response.status === 206) {
        return { reachable: true, status: response.status };
      }
    } catch (error) {
      return {
        reachable: false,
        status: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  return { reachable: false, status: null };
}

function publicSummary(report) {
  return {
    schemaVersion: report.schemaVersion,
    generatedAt: report.generatedAt,
    status: report.status,
    manifest: {
      status: report.manifest.status,
      relativePath: report.manifest.relativePath
    },
    edgeMeters: report.edgeMeters,
    sampleCount: report.samples.length,
    sourceCount: report.sources.length,
    readySourceCount: report.sources.filter((source) => source.ready).length,
    probeUrl: report.probeUrl,
    privacy: {
      exactCoordinatesOmittedFromConsoleSummary: true,
      exactCoordinatesOmittedFromReport: true,
      expandedBboxUrlsOmittedFromReport: true
    },
    output: report.output
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifestRelative = path
    .relative(process.cwd(), path.resolve(options.manifest))
    .replace(/\\/g, "/");
  let manifest;
  let manifestStatus = "loaded";
  let manifestWarnings = [];
  try {
    manifest = JSON.parse(await readFile(options.manifest, "utf8"));
  } catch (error) {
    manifestStatus = "absent-or-invalid";
    manifestWarnings = [
      error instanceof SyntaxError
        ? "Manifest could not be parsed as JSON."
        : "Manifest could not be read from the conventional relative path."
    ];
  }

  const samples = randomSamples(options);
  const sources = sourceEntries(manifest).map((source) => validateSource(source, samples));
  if (options.probeUrl) {
    for (const source of sources) {
      const firstUrl = source.probeCandidateUrl;
      source.endpointProbe = firstUrl
        ? await probeUrl(firstUrl)
        : { reachable: false, status: null };
      source.probeCandidateUrl = undefined;
    }
  }

  const ready = sources.some(
    (source) => source.ready && (!options.probeUrl || source.endpointProbe?.reachable)
  );
  const report = {
    schemaVersion: "vmesh-kamloops-operator-terrain-manifest-audit-v1",
    generatedAt: new Date().toISOString(),
    status: ready ? "ready" : "blocked",
    manifest: {
      status: manifestStatus,
      relativePath: manifestRelative,
      warnings: manifestWarnings
    },
    edgeMeters: options.edgeMeters,
    seed: options.seed,
    probeUrl: options.probeUrl,
    sourceTruthBoundary: [
      "This audit validates source refs and frame coverage only.",
      "Abundance still must window the raster, verify no-data coverage, preserve metadata, and build the live runtime terrain slice.",
      "VMesh remains an index/handoff and does not store the terrain payload."
    ],
    samples: samples.map((sample) => ({
      id: sample.id,
      coordinateDisclosure: "redacted-deterministic-seed",
      frameDisclosure: "redacted"
    })),
    sources,
    output: options.output
  };

  await mkdir(path.dirname(options.output), { recursive: true });
  await writeFile(options.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(publicSummary(report), null, 2));
  if (options.requireReady && !ready) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DEM_GRID_LAYER_URL =
  "https://maps.kamloops.ca/arcgis/rest/services/FeatureDataset/GIS_Administrative_1/MapServer/6";
const DEM_DOWNLOAD_BASE_URL = "https://maps.kamloops.ca/opendata/DEM/2024_CGVD2013";
const LIDAR_DOWNLOAD_BASE_URL = "https://maps.kamloops.ca/opendata/Lidar/2024";
const BC_LIDAR_FEATURE_SERVER_BASE_URL =
  "https://services6.arcgis.com/ubm4tcTYICKBpist/ArcGIS/rest/services/LiDAR_BC_S3_Public/FeatureServer";
const ELEVATION_VECTOR_EXTENT_WGS84 = {
  west: -120.546437,
  south: 50.607833,
  east: -120.025817,
  north: 50.873614
};

function usage() {
  return [
    "Kamloops terrain coverage audit",
    "",
    "Usage:",
    "  npm run terrain:kamloops-audit -- [--grid 5] [--edge-meters 3000] [--output .artifacts/kamloops-terrain-coverage-audit/latest.private.json]",
    "  npm run terrain:kamloops-audit -- --sample-mode random --samples 16 --seed 1701 [--edge-meters 3000] [--probe-timeout-ms 5000]",
    "",
    "The output path is private/operator-local by default because it contains exact sample coordinates."
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
    sampleMode: "grid",
    grid: 5,
    samples: 16,
    seed: 1701,
    edgeMeters: 3000,
    probeTimeoutMs: 5000,
    output: ".artifacts/kamloops-terrain-coverage-audit/latest.private.json"
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      console.log(usage());
      process.exit(0);
    }
    if (arg === "--grid") {
      options.grid = Math.max(
        1,
        Math.min(16, Math.floor(parseNumber(valueAfter(args, index, arg), arg)))
      );
      index += 1;
      continue;
    }
    if (arg === "--sample-mode") {
      const value = valueAfter(args, index, arg).trim().toLowerCase();
      if (value !== "grid" && value !== "random") {
        throw new Error("--sample-mode must be grid or random.");
      }
      options.sampleMode = value;
      index += 1;
      continue;
    }
    if (arg === "--samples") {
      options.samples = Math.max(
        1,
        Math.min(128, Math.floor(parseNumber(valueAfter(args, index, arg), arg)))
      );
      index += 1;
      continue;
    }
    if (arg === "--seed") {
      options.seed = Math.floor(parseNumber(valueAfter(args, index, arg), arg));
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
    if (arg === "--probe-timeout-ms") {
      options.probeTimeoutMs = Math.max(
        1000,
        Math.min(20000, Math.floor(parseNumber(valueAfter(args, index, arg), arg)))
      );
      index += 1;
      continue;
    }
    if (arg === "--output") {
      options.output = valueAfter(args, index, arg);
      index += 1;
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

function bboxContains(container, target) {
  return (
    target.west >= container.west &&
    target.east <= container.east &&
    target.south >= container.south &&
    target.north <= container.north
  );
}

function lcg(seed) {
  let value = Math.abs(seed || 1701) % 2147483647;
  if (value === 0) value = 1;
  return () => {
    value = (value * 48271) % 2147483647;
    return value / 2147483647;
  };
}

function validCenterExtent(edgeMeters) {
  const half = edgeMeters / 2;
  const southWest = offsetCoordinate({
    latitude: ELEVATION_VECTOR_EXTENT_WGS84.south,
    longitude: ELEVATION_VECTOR_EXTENT_WGS84.west,
    eastMeters: half,
    northMeters: half
  });
  const northEast = offsetCoordinate({
    latitude: ELEVATION_VECTOR_EXTENT_WGS84.north,
    longitude: ELEVATION_VECTOR_EXTENT_WGS84.east,
    eastMeters: -half,
    northMeters: -half
  });
  return { southWest, northEast };
}

function formatCoordinate(value) {
  return Number(value.toFixed(6)).toString();
}

function queryUrl(bbox) {
  const url = new URL(`${DEM_GRID_LAYER_URL}/query`);
  url.searchParams.set("f", "json");
  url.searchParams.set("where", "1=1");
  url.searchParams.set(
    "geometry",
    [bbox.west, bbox.south, bbox.east, bbox.north].map(formatCoordinate).join(",")
  );
  url.searchParams.set("geometryType", "esriGeometryEnvelope");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("outFields", "OBJECTID,CELLNAME,PHOTOGRIDLIMITS");
  url.searchParams.set("returnGeometry", "false");
  return url.toString();
}

function lidarBcDtmQueryUrl(bbox) {
  const url = new URL(`${BC_LIDAR_FEATURE_SERVER_BASE_URL}/5/query`);
  const centerLongitude = (bbox.west + bbox.east) / 2;
  const centerLatitude = (bbox.south + bbox.north) / 2;
  url.searchParams.set("f", "json");
  url.searchParams.set("where", "1=1");
  url.searchParams.set(
    "geometry",
    `${formatCoordinate(centerLongitude)},${formatCoordinate(centerLatitude)}`
  );
  url.searchParams.set("geometryType", "esriGeometryPoint");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("outFields", "filename,maptile,path,spacing,year,s3Url,projection");
  url.searchParams.set("returnGeometry", "false");
  return url.toString();
}

function safeCellName(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return /^[A-Z0-9_-]+$/.test(normalized) ? normalized : null;
}

function demZipUrl(cellName) {
  return `${DEM_DOWNLOAD_BASE_URL}/DEM_CGVD2013_${cellName}.zip`;
}

function lidarZipUrl(cellName) {
  return `${LIDAR_DOWNLOAD_BASE_URL}/${cellName}.zip`;
}

const demZipAvailabilityCache = new Map();
const lidarZipAvailabilityCache = new Map();

async function fetchWithTimeout(url, options = {}, timeoutMs = 20_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

function parseCells(payload) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.features)) return [];
  const cells = [];
  for (const feature of payload.features) {
    const attributes =
      feature &&
      typeof feature === "object" &&
      feature.attributes &&
      typeof feature.attributes === "object"
        ? feature.attributes
        : null;
    if (!attributes) continue;
    const cellName = safeCellName(attributes.CELLNAME);
    if (!cellName) continue;
    cells.push({
      objectId: typeof attributes.OBJECTID === "number" ? attributes.OBJECTID : null,
      cellName,
      photoGridLimits:
        typeof attributes.PHOTOGRIDLIMITS === "string" ? attributes.PHOTOGRIDLIMITS : null,
      demZipUrl: demZipUrl(cellName),
      lidarZipUrl: lidarZipUrl(cellName)
    });
  }
  return cells.sort((left, right) => left.cellName.localeCompare(right.cellName));
}

function selectLidarBcOneMeterDtm(payload) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.features)) return null;
  const candidates = [];
  for (const feature of payload.features) {
    const attributes =
      feature &&
      typeof feature === "object" &&
      feature.attributes &&
      typeof feature.attributes === "object"
        ? feature.attributes
        : null;
    if (!attributes) continue;

    const href = typeof attributes.s3Url === "string" ? attributes.s3Url : "";
    const filename = typeof attributes.filename === "string" ? attributes.filename : "unknown";
    const spacing = typeof attributes.spacing === "string" ? attributes.spacing.trim() : "";
    const maptile = typeof attributes.maptile === "string" ? attributes.maptile : filename;
    const year =
      typeof attributes.year === "number" && Number.isFinite(attributes.year)
        ? attributes.year
        : null;
    if (!/^https?:\/\//i.test(href)) continue;
    if (!/1\s*met(re|er)/i.test(spacing) && !/xli1m/i.test(filename)) continue;
    if (/dsm/i.test(filename)) continue;
    candidates.push({
      sourceId: `bc-lidarbc:dtm:${maptile}:${year ?? "unknown"}`,
      href,
      filename,
      spacing: spacing || "1 metre inferred from filename",
      maptile,
      year,
      projection: typeof attributes.projection === "string" ? attributes.projection : null
    });
  }
  return candidates.sort((left, right) => (right.year ?? 0) - (left.year ?? 0))[0] ?? null;
}

async function probeLidarBcDtm(bbox, timeoutMs) {
  try {
    const response = await fetchWithTimeout(
      lidarBcDtmQueryUrl(bbox),
      { headers: { Accept: "application/json" } },
      timeoutMs
    );
    if (!response.ok) {
      return {
        status: "lookup-failed",
        source: null,
        reason: `LidarBC DTM FeatureServer query failed with HTTP ${response.status}.`
      };
    }
    const source = selectLidarBcOneMeterDtm(await response.json());
    return source
      ? { status: "ready", source, reason: null }
      : {
          status: "not-covered",
          source: null,
          reason: "LidarBC DTM FeatureServer did not return a 1m DTM GeoTIFF for this AOI centroid."
        };
  } catch (error) {
    return {
      status: "lookup-failed",
      source: null,
      reason:
        error instanceof Error
          ? `LidarBC DTM FeatureServer query failed: ${error.message}.`
          : "LidarBC DTM FeatureServer query failed."
    };
  }
}

async function verifyDemZip(cell, timeoutMs) {
  const cached = demZipAvailabilityCache.get(cell.demZipUrl);
  if (cached) return cached;

  const promise = verifyDemZipUncached(cell, timeoutMs);
  demZipAvailabilityCache.set(cell.demZipUrl, promise);
  return promise;
}

async function verifyLidarZip(cell, timeoutMs) {
  const cached = lidarZipAvailabilityCache.get(cell.lidarZipUrl);
  if (cached) return cached;

  const promise = verifyArchiveUrlUncached(cell.lidarZipUrl, timeoutMs);
  lidarZipAvailabilityCache.set(cell.lidarZipUrl, promise);
  return promise;
}

async function verifyDemZipUncached(cell, timeoutMs) {
  return {
    ...(await verifyArchiveUrlUncached(cell.demZipUrl, timeoutMs)),
    catalogPhotoGridLimits: cell.photoGridLimits ?? null
  };
}

async function verifyArchiveUrlUncached(url, timeoutMs) {
  const attempts = [
    { method: "HEAD", headers: { Accept: "application/zip,*/*" } },
    { method: "GET", headers: { Accept: "application/zip,*/*", Range: "bytes=0-0" } }
  ];
  let lastStatus = null;
  for (const attempt of attempts) {
    try {
      const response = await fetchWithTimeout(url, attempt, timeoutMs);
      lastStatus = response.status;
      const contentLength = Number(response.headers.get("content-length") ?? "");
      const contentRange = response.headers.get("content-range") ?? "";
      const rangeSize = /\/(\d+)$/i.exec(contentRange)?.[1];
      if (response.body) await response.body.cancel().catch(() => undefined);
      if (response.ok || response.status === 206) {
        return {
          reachable: true,
          status: response.status,
          contentLengthBytes:
            Number.isFinite(contentLength) && contentLength > 0
              ? contentLength
              : rangeSize
                ? Number(rangeSize)
                : null
        };
      }
    } catch {
      lastStatus = null;
    }
  }
  return {
    reachable: false,
    status: lastStatus,
    contentLengthBytes: null
  };
}

function sampleCenters({ grid, edgeMeters }) {
  const { southWest, northEast } = validCenterExtent(edgeMeters);

  const samples = [];
  for (let y = 0; y < grid; y += 1) {
    for (let x = 0; x < grid; x += 1) {
      const longitude =
        grid === 1
          ? (southWest.longitude + northEast.longitude) / 2
          : southWest.longitude + ((northEast.longitude - southWest.longitude) * x) / (grid - 1);
      const latitude =
        grid === 1
          ? (southWest.latitude + northEast.latitude) / 2
          : southWest.latitude + ((northEast.latitude - southWest.latitude) * y) / (grid - 1);
      samples.push({
        id: `grid-${String(y + 1).padStart(2, "0")}-${String(x + 1).padStart(2, "0")}`,
        latitude,
        longitude
      });
    }
  }
  return samples;
}

function randomSampleCenters({ samples, edgeMeters, seed }) {
  const { southWest, northEast } = validCenterExtent(edgeMeters);
  const random = lcg(seed);
  return Array.from({ length: samples }, (_, index) => ({
    id: `random-${String(index + 1).padStart(3, "0")}`,
    latitude: southWest.latitude + (northEast.latitude - southWest.latitude) * random(),
    longitude: southWest.longitude + (northEast.longitude - southWest.longitude) * random()
  }));
}

function auditSampleCenters(options) {
  return options.sampleMode === "random" ? randomSampleCenters(options) : sampleCenters(options);
}

async function classifySample(sample, { edgeMeters, probeTimeoutMs }) {
  const bbox = boundsFromCentroid({
    latitude: sample.latitude,
    longitude: sample.longitude,
    edgeMeters
  });
  let response;
  try {
    response = await fetchWithTimeout(
      queryUrl(bbox),
      { headers: { Accept: "application/json" } },
      probeTimeoutMs
    );
  } catch (error) {
    return {
      ...sample,
      bbox,
      status: "lookup-failed",
      goldenQualityTerrainCandidate: false,
      rasterBacked: false,
      derivedElevationBacked: bboxContains(ELEVATION_VECTOR_EXTENT_WGS84, bbox),
      cells: [],
      blockers: [
        error instanceof Error
          ? `DEM Grid query failed: ${error.message}.`
          : "DEM Grid query failed."
      ]
    };
  }
  if (!response.ok) {
    return {
      ...sample,
      bbox,
      status: "lookup-failed",
      goldenQualityTerrainCandidate: false,
      rasterBacked: false,
      derivedElevationBacked: false,
      cells: [],
      blockers: [`DEM Grid query failed with HTTP ${response.status}.`]
    };
  }

  const cells = parseCells(await response.json());
  const verifiedCells = await Promise.all(
    cells.map(async (cell) => ({
      ...cell,
      demZipAvailability: await verifyDemZip(cell, probeTimeoutMs)
    }))
  );

  const missingCells = verifiedCells.filter((cell) => !cell.demZipAvailability.reachable);
  const missingCellsWithLidar = await Promise.all(
    missingCells.map(async (cell) => ({
      ...cell,
      rawLidarZipAvailability: await verifyLidarZip(cell, probeTimeoutMs)
    }))
  );
  const rasterBacked = verifiedCells.length > 0 && missingCells.length === 0;
  const lidarBcDtm = rasterBacked === false ? await probeLidarBcDtm(bbox, probeTimeoutMs) : null;
  const lidarBcDtmBacked = lidarBcDtm?.status === "ready";
  const missingRasterCellsRawLidarVerified =
    missingCellsWithLidar.length > 0 &&
    missingCellsWithLidar.every((cell) => cell.rawLidarZipAvailability.reachable);
  const derivedElevationBacked = bboxContains(ELEVATION_VECTOR_EXTENT_WGS84, bbox);
  return {
    ...sample,
    bbox,
    status: rasterBacked
      ? "golden-candidate"
      : lidarBcDtmBacked
        ? "bc-lidarbc-dtm-candidate"
        : missingRasterCellsRawLidarVerified
          ? "raw-lidar-repair-candidate"
          : derivedElevationBacked
            ? "derived-elevation"
            : "blocked",
    goldenQualityTerrainCandidate: rasterBacked,
    rasterBacked,
    lidarBcDtmBacked,
    lidarBcDtm,
    missingRasterCellsRawLidarVerified,
    derivedElevationBacked,
    cells: verifiedCells.map((cell) => {
      const lidarProbe = missingCellsWithLidar.find((item) => item.cellName === cell.cellName);
      return lidarProbe
        ? {
            ...cell,
            rawLidarZipAvailability: lidarProbe.rawLidarZipAvailability
          }
        : cell;
    }),
    blockers: rasterBacked
      ? []
      : [
          missingCells.length > 0
            ? `Missing or non-downloadable DEM ZIP cells: ${missingCells.map((cell) => cell.cellName).join(", ")}.`
            : "No DEM Grid cells intersected this exact 3 km frame.",
          missingRasterCellsRawLidarVerified
            ? "Every missing DEM ZIP cell has a reachable public raw LiDAR archive, but a point-cloud-to-DTM worker must materialize and QA it before this can meet the golden terrain bar."
            : "Raw LiDAR ZIP coverage is not verified for every missing DEM raster cell.",
          lidarBcDtmBacked
            ? "LidarBC returned a source-native 1m DTM candidate; Abundance must window and QA the GeoTIFF before this can meet runtime golden terrain."
            : (lidarBcDtm?.reason ??
              "LidarBC DTM was not probed because municipal DEM raster coverage was complete."),
          derivedElevationBacked
            ? "Official DEMPoint/DEMBreakline and contour-derived fallback can produce a labelled slice, but not the golden raster bar."
            : "The exact 3 km frame falls outside the municipal derived-elevation fallback extent."
        ]
  };
}

function publicSummary(report) {
  return {
    schemaVersion: report.schemaVersion,
    generatedAt: report.generatedAt,
    edgeMeters: report.edgeMeters,
    probeTimeoutMs: report.probeTimeoutMs,
    sampleMode: report.sampleMode,
    grid: report.grid,
    seed: report.seed,
    sampleCount: report.samples.length,
    counts: report.counts,
    privacy: {
      exactCoordinatesOmittedFromConsoleSummary: true,
      privateReportPathContainsExactSampleCoordinates: true
    }
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const samples = [];
  for (const sample of auditSampleCenters(options)) {
    samples.push(
      await classifySample(sample, {
        edgeMeters: options.edgeMeters,
        probeTimeoutMs: options.probeTimeoutMs
      })
    );
  }
  const counts = {
    goldenCandidate: samples.filter((sample) => sample.goldenQualityTerrainCandidate).length,
    bcLidarbcDtmCandidate: samples.filter((sample) => sample.status === "bc-lidarbc-dtm-candidate")
      .length,
    rawLidarRepairCandidate: samples.filter(
      (sample) => sample.status === "raw-lidar-repair-candidate"
    ).length,
    derivedElevation: samples.filter((sample) => sample.status === "derived-elevation").length,
    blocked: samples.filter(
      (sample) => sample.status === "blocked" || sample.status === "lookup-failed"
    ).length
  };
  const report = {
    schemaVersion: "vmesh-kamloops-terrain-coverage-audit-v1",
    generatedAt: new Date().toISOString(),
    source: {
      demGridLayer: DEM_GRID_LAYER_URL,
      demDownloadBaseUrl: DEM_DOWNLOAD_BASE_URL,
      lidarDownloadBaseUrl: LIDAR_DOWNLOAD_BASE_URL,
      bcLidarFeatureServerBaseUrl: BC_LIDAR_FEATURE_SERVER_BASE_URL
    },
    edgeMeters: options.edgeMeters,
    probeTimeoutMs: options.probeTimeoutMs,
    sampleMode: options.sampleMode,
    grid: options.grid,
    seed: options.sampleMode === "random" ? options.seed : null,
    counts,
    samples
  };

  await mkdir(path.dirname(options.output), { recursive: true });
  await writeFile(options.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ...publicSummary(report), output: options.output }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

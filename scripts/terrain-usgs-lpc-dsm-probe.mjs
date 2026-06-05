#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const USGS_LPC_INDEX_QUERY_URL =
  "https://index.nationalmap.gov/arcgis/rest/services/3DEPElevationIndex/MapServer/8/query";
const USGS_LPC_FALLBACK_INDEX_QUERY_URL =
  "https://index.nationalmap.gov/arcgis/rest/services/3DEPElevationIndex/MapServer/24/query";

function parseArgs(argv) {
  const args = {
    label: "public-safe USGS LPC DSM source probe",
    output: null,
    includeCoordinate: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--lat") {
      args.lat = Number(next);
      index += 1;
    } else if (arg === "--lon") {
      args.lon = Number(next);
      index += 1;
    } else if (arg === "--tile-z") {
      args.tileZ = Number(next);
      index += 1;
    } else if (arg === "--tile-x") {
      args.tileX = Number(next);
      index += 1;
    } else if (arg === "--tile-y") {
      args.tileY = Number(next);
      index += 1;
    } else if (arg === "--label") {
      args.label = next;
      index += 1;
    } else if (arg === "--output") {
      args.output = next;
      index += 1;
    } else if (arg === "--include-coordinate") {
      args.includeCoordinate = true;
    } else {
      throw new Error(`Unsupported argument: ${arg}`);
    }
  }

  return args;
}

function hasTileArgs(args) {
  return (
    Number.isInteger(args.tileZ) && Number.isInteger(args.tileX) && Number.isInteger(args.tileY)
  );
}

function validateArgs(args) {
  const hasCoordinate = Number.isFinite(args.lat) && Number.isFinite(args.lon);
  const hasTile = hasTileArgs(args);
  if (!hasCoordinate && !hasTile) {
    throw new Error("Provide either --lat/--lon or --tile-z/--tile-x/--tile-y.");
  }
  if (hasCoordinate && (args.lat < -90 || args.lat > 90 || args.lon < -180 || args.lon > 180)) {
    throw new Error("--lat/--lon are outside WGS84 bounds.");
  }
  if (hasTile) {
    const maxTile = 2 ** args.tileZ;
    if (
      args.tileZ < 0 ||
      args.tileZ > 16 ||
      args.tileX < 0 ||
      args.tileY < 0 ||
      args.tileX >= maxTile ||
      args.tileY >= maxTile
    ) {
      throw new Error("--tile-z/--tile-x/--tile-y are outside the supported tile range.");
    }
  }
}

function tileToLonLatCenter(z, x, y) {
  const n = 2 ** z;
  const longitude = ((x + 0.5) / n) * 360 - 180;
  const mercatorY = Math.PI * (1 - (2 * (y + 0.5)) / n);
  const latitude = (Math.atan(Math.sinh(mercatorY)) * 180) / Math.PI;
  return { latitude, longitude };
}

function probeCoordinate(args) {
  if (Number.isFinite(args.lat) && Number.isFinite(args.lon)) {
    return { latitude: args.lat, longitude: args.lon };
  }
  return tileToLonLatCenter(args.tileZ, args.tileX, args.tileY);
}

function queryUrls({ latitude, longitude }) {
  return [USGS_LPC_INDEX_QUERY_URL, USGS_LPC_FALLBACK_INDEX_QUERY_URL].map((endpoint) => {
  const url = new URL(endpoint);
  url.searchParams.set("f", "json");
  url.searchParams.set("where", "1=1");
  url.searchParams.set(
    "geometry",
    `${Number(longitude.toFixed(6))},${Number(latitude.toFixed(6))}`
  );
  url.searchParams.set("geometryType", "esriGeometryPoint");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("outFields", "*");
  url.searchParams.set("returnGeometry", "false");
  return url.toString();
  });
}

function num(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function selectSource(value) {
  const features = Array.isArray(value?.features) ? value.features : [];
  const candidates = [];

  for (const feature of features) {
    const attributes = feature?.attributes;
    if (!attributes || typeof attributes !== "object") continue;

    const lpcLink = str(attributes.lpc_link);
    const workunit = str(attributes.workunit);
    const project = str(attributes.project) ?? workunit;
    const demGsdMeters = num(attributes.dem_gsd_meters);
    const objectId = num(attributes.OBJECTID);
    const lpcCategory = str(attributes.lpc_category);
    const lpcReason = str(attributes.lpc_reason);
    const meetsLpc =
      lpcCategory?.toLowerCase().startsWith("meets") === true ||
      lpcReason?.toLowerCase().includes("meets 3dep lpc requirements") === true;

    if (!lpcLink || !/^https?:\/\//i.test(lpcLink)) continue;
    if (!workunit || !project || demGsdMeters === null) continue;
    if (!meetsLpc || demGsdMeters > 1) continue;

    candidates.push({
      sourceId: `usgs-3dep-lpc-dsm:${objectId ?? workunit}`,
      lpcLink,
      metadataLink: str(attributes.metadata_link),
      sourcedemLink: str(attributes.sourcedem_link),
      workunit,
      project,
      objectId,
      qualityLevel: str(attributes.ql),
      specification: str(attributes.spec),
      pointMethod: str(attributes.p_method),
      demGsdMeters,
      horizontalCrs: str(attributes.horiz_crs),
      verticalCrs: str(attributes.vert_crs),
      geoid: str(attributes.geoid),
      lpcCategory,
      lpcReason,
      collectionEnd: num(attributes.collect_end)
    });
  }

  return (
    candidates.sort((left, right) => {
      if (left.demGsdMeters !== right.demGsdMeters) return left.demGsdMeters - right.demGsdMeters;
      return (right.collectionEnd ?? 0) - (left.collectionEnd ?? 0);
    })[0] ?? null
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  validateArgs(args);
  const coordinate = probeCoordinate(args);
  let selected = null;
  const failedStatuses = [];

  for (const url of queryUrls(coordinate)) {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      failedStatuses.push(response.status);
      continue;
    }

    const data = await response.json();
    selected = selectSource(data);
    if (selected) break;
  }
  if (!selected && failedStatuses.length === 2) {
    throw new Error(`USGS LPC index query failed with HTTP ${failedStatuses.join(", ")}.`);
  }
  const base = {
    schemaVersion: "vmesh-usgs-lpc-dsm-probe-v1",
    generatedAt: new Date().toISOString(),
    runClass: "live-proof",
    providerId: "usgs-3dep-lpc-dsm",
    label: args.label,
    role: "dsm",
    groundModelRole: "surface-dsm",
    coordinateDisclosure: args.includeCoordinate
      ? "exact-coordinate-included"
      : "coordinate-redacted",
    status: selected ? "source-available" : "blocked",
    resolutionMeters: selected ? selected.demGsdMeters : null,
    coverageSourceIds: selected ? [selected.sourceId] : [],
    sourceAsset: selected
      ? {
          collection: "USGS 3DEP Lidar Point Cloud",
          id: selected.sourceId,
          assetRole: "source-index",
          href: selected.lpcLink,
          metadataHref: selected.metadataLink,
          sourceDemHref: selected.sourcedemLink,
          type: "source-index",
          workunit: selected.workunit,
          project: selected.project,
          qualityLevel: selected.qualityLevel,
          specification: selected.specification,
          pointMethod: selected.pointMethod,
          demGsdMeters: selected.demGsdMeters,
          horizontalCrs: selected.horizontalCrs,
          verticalCrs: selected.verticalCrs,
          geoid: selected.geoid
        }
      : null,
    renderedArtifact: null,
    warnings: selected
      ? [
          "This proves source availability only. DSM display requires a point-cloud worker with PDAL/LAZ tooling to derive a retained 1m DSM raster tile."
        ]
      : [],
    reasons: selected
      ? []
      : [
          "USGS 3DEP LPC index did not return a 1m-class source project that meets 3DEP LPC requirements for this coordinate."
        ]
  };

  if (args.includeCoordinate) base.coordinate = coordinate;
  if (hasTileArgs(args)) base.tile = { z: args.tileZ, x: args.tileX, y: args.tileY };

  const output = `${JSON.stringify(base, null, 2)}\n`;
  if (args.output) {
    await mkdir(path.dirname(args.output), { recursive: true });
    await writeFile(args.output, output, "utf8");
  }
  process.stdout.write(output);
  process.exitCode = selected ? 0 : 2;
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        schemaVersion: "vmesh-usgs-lpc-dsm-probe-v1",
        generatedAt: new Date().toISOString(),
        runClass: "live-proof",
        status: "failed",
        reasons: [error instanceof Error ? error.message : "USGS LPC DSM probe failed."]
      },
      null,
      2
    )
  );
  process.exitCode = 1;
});

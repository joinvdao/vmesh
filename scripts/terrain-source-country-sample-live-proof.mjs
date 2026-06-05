#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const artifactDir = path.join(".artifacts", "terrain-source-preview");
const countrySampleArtifactDir = path.join(artifactDir, "country-sample-live-proof");
const defaultReportPath = path.join(
  artifactDir,
  "usa-canada-terrain-country-sample-live-proof-latest.json"
);

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function hasArg(name) {
  return process.argv.includes(name);
}

function normalizeBaseUrl(value) {
  return String(value).replace(/\/+$/, "");
}

const baseUrl = normalizeBaseUrl(
  argValue("--base-url", process.env.VMESH_COUNTRY_SAMPLE_BASE_URL ?? "http://localhost:3000")
);
const reportPath = argValue("--output", defaultReportPath);
const timeoutMs = Number(
  argValue("--timeout-ms", process.env.VMESH_COUNTRY_SAMPLE_TIMEOUT_MS ?? "300000")
);
const renderAllDtm = hasArg("--render-all-dtm");
const maxDtmTileRenders = renderAllDtm
  ? Number.POSITIVE_INFINITY
  : Number(argValue("--max-dtm-tile-renders", process.env.VMESH_COUNTRY_SAMPLE_DTM_RENDERS ?? "10"));

const samples = [
  {
    id: "usa-denver-co",
    country: "USA",
    publicSafeLabel: "Denver, Colorado public-safe coordinate",
    latitude: 39.74,
    longitude: -104.99,
    dtmTileZoom: 13
  },
  {
    id: "usa-seattle-wa",
    country: "USA",
    publicSafeLabel: "Seattle, Washington public-safe coordinate",
    latitude: 47.6062,
    longitude: -122.3321,
    dtmTileZoom: 13
  },
  {
    id: "usa-atlanta-ga",
    country: "USA",
    publicSafeLabel: "Atlanta, Georgia public-safe coordinate",
    latitude: 33.749,
    longitude: -84.388,
    dtmTileZoom: 13
  },
  {
    id: "usa-phoenix-az",
    country: "USA",
    publicSafeLabel: "Phoenix, Arizona public-safe coordinate",
    latitude: 33.4484,
    longitude: -112.074,
    dtmTileZoom: 13
  },
  {
    id: "usa-anchorage-ak",
    country: "USA",
    publicSafeLabel: "Anchorage, Alaska public-safe coordinate",
    latitude: 61.2181,
    longitude: -149.9003,
    dtmTileZoom: 13
  },
  {
    id: "canada-ottawa-on",
    country: "Canada",
    publicSafeLabel: "Ottawa, Ontario public-safe coordinate",
    latitude: 45.4215,
    longitude: -75.6972,
    dtmTileZoom: 13
  },
  {
    id: "canada-vancouver-bc",
    country: "Canada",
    publicSafeLabel: "Vancouver, British Columbia public-safe coordinate",
    latitude: 49.2827,
    longitude: -123.1207,
    dtmTileZoom: 15
  },
  {
    id: "canada-toronto-on",
    country: "Canada",
    publicSafeLabel: "Toronto, Ontario public-safe coordinate",
    latitude: 43.6532,
    longitude: -79.3832,
    dtmTileZoom: 13
  },
  {
    id: "canada-calgary-ab",
    country: "Canada",
    publicSafeLabel: "Calgary, Alberta public-safe coordinate",
    latitude: 51.0447,
    longitude: -114.0719,
    dtmTileZoom: 13
  },
  {
    id: "canada-bc-interior-gap",
    country: "Canada",
    publicSafeLabel: "BC interior public-safe expected-gap coordinate",
    latitude: 50.665,
    longitude: -120.545,
    dtmTileZoom: 13
  }
];

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchOk(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2500) });
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await fetchOk(baseUrl)) return null;

  const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  const child = spawn(process.execPath, [nextBin, "dev", "--port", "3000"], {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await fetchOk(baseUrl)) return child;
    await sleep(1000);
  }

  child.kill();
  throw new Error(`Dev server did not become ready. Output:\n${output}`);
}

function probeUrl(sample, role) {
  const url = new URL(`${baseUrl}/api/terrain/source-preview/probe`);
  url.searchParams.set("lat", String(sample.latitude));
  url.searchParams.set("lon", String(sample.longitude));
  url.searchParams.set("role", role);
  return url.toString();
}

function coordinateToWebMercatorTile({ latitude, longitude, zoom }) {
  const z = Math.max(0, Math.min(22, Math.floor(zoom)));
  const n = 2 ** z;
  const clampedLatitude = Math.max(-85.05112878, Math.min(85.05112878, latitude));
  const latitudeRadians = (clampedLatitude * Math.PI) / 180;
  const x = Math.floor(((longitude + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latitudeRadians) + 1 / Math.cos(latitudeRadians)) / Math.PI) / 2) * n
  );
  return {
    z,
    x: Math.min(n - 1, Math.max(0, x)),
    y: Math.min(n - 1, Math.max(0, y))
  };
}

function createTileUrl({ template, sample, zoom }) {
  const tile = coordinateToWebMercatorTile({
    latitude: sample.latitude,
    longitude: sample.longitude,
    zoom
  });
  return {
    tile,
    url: `${baseUrl}${template
      .replace("{z}", String(tile.z))
      .replace("{x}", String(tile.x))
      .replace("{y}", String(tile.y))}?refresh=1`
  };
}

async function fetchJson(url) {
  let lastError = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal
      });
      const body = (await response.json().catch(() => null)) ?? null;
      return { httpStatus: response.status, body };
    } catch (error) {
      lastError = error;
      if (attempt < 2) await sleep(500 * (attempt + 1));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}

function headerSummary(headers) {
  return {
    contentType: headers.get("content-type"),
    provider: headers.get("x-vmesh-terrain-provider"),
    role: headers.get("x-vmesh-terrain-role"),
    groundModelRole: headers.get("x-vmesh-ground-model-role"),
    resolutionMeters: headers.get("x-vmesh-terrain-resolution-meters"),
    sourceRelease: headers.get("x-vmesh-terrain-source-release"),
    renderMode: headers.get("x-vmesh-terrain-render-mode"),
    sourceStatus: headers.get("x-vmesh-terrain-source-status"),
    sourceReason: headers.get("x-vmesh-terrain-source-reason")
  };
}

async function fetchDtmDisplayTile({ sample, probe }) {
  if (!probe.body?.tileUrlTemplate) {
    return {
      status: "not-rendered",
      reason: "DTM probe did not return a tile template.",
      tileUrl: null,
      headers: null,
      byteSize: 0,
      retainedArtifact: null
    };
  }

  const { tile, url } = createTileUrl({
    template: probe.body.tileUrlTemplate,
    sample,
    zoom: sample.dtmTileZoom
  });
  let lastError = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
    const response = await fetch(url, {
      headers: { Accept: "image/png,image/*,*/*;q=0.8" },
      signal: controller.signal
    });
    const headers = headerSummary(response.headers);
    const body = Buffer.from(await response.arrayBuffer());
    const artifactPath = path.join(
      countrySampleArtifactDir,
      `${sample.id}-dtm-z${tile.z}-${tile.x}-${tile.y}.png`
    );

    const ready =
      response.status === 200 &&
      (headers.contentType ?? "").startsWith("image/png") &&
      headers.role === "dtm" &&
      headers.resolutionMeters === "1" &&
      headers.sourceStatus !== "transparent" &&
      body.byteLength >= 2048;

    if (ready) {
      await writeFile(artifactPath, body);
    }

    return {
      status: ready ? "displayed-1m" : "failed",
      reason: ready
        ? null
        : `Expected a non-trivial 1m DTM PNG tile, got HTTP ${response.status}, provider ${
            headers.provider ?? "none"
          }, role ${headers.role ?? "none"}, resolution ${
            headers.resolutionMeters ?? "none"
          }, byteSize ${body.byteLength}.`,
      tile,
      tileUrl: url,
      httpStatus: response.status,
      headers,
      byteSize: body.byteLength,
      retainedArtifact: ready ? artifactPath : null
    };
    } catch (error) {
      lastError = error;
      if (attempt < 2) await sleep(500 * (attempt + 1));
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    status: "failed",
    reason: `DTM tile request failed: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }.`,
    tile,
    tileUrl: url,
    httpStatus: null,
    headers: null,
    byteSize: 0,
    retainedArtifact: null
  };
}

function isStrictOneMeterCovered(probe, role) {
  return (
    probe.httpStatus === 200 &&
    probe.body?.runClass === "live-proof" &&
    (probe.body?.status === "covered" || probe.body?.status === "source-available") &&
    probe.body?.role === role &&
    typeof probe.body?.resolutionMeters === "number" &&
    probe.body.resolutionMeters > 0 &&
    probe.body.resolutionMeters <= 1
  );
}

async function runSample(sample, renderDtmTile) {
  const dtmProbe = await fetchJson(probeUrl(sample, "dtm"));
  const dsmProbe = await fetchJson(probeUrl(sample, "dsm"));
  const dtmCovered = isStrictOneMeterCovered(dtmProbe, "dtm") && dtmProbe.body.status === "covered";
  const dsmResolved = isStrictOneMeterCovered(dsmProbe, "dsm");
  const dtmDisplayTile =
    dtmCovered && renderDtmTile
      ? await fetchDtmDisplayTile({ sample, probe: dtmProbe })
      : {
          status: dtmCovered ? "not-rendered-budget" : "not-rendered",
          reason: dtmCovered
            ? "DTM source was covered, but this sample was outside the configured DTM tile render budget."
            : "DTM source was not covered at strict 1m.",
          tileUrl: null,
          headers: null,
          byteSize: 0,
          retainedArtifact: null
        };

  return {
    id: sample.id,
    country: sample.country,
    publicSafeLabel: sample.publicSafeLabel,
    coordinateDisclosure: "public-safe-sampled-coordinate",
    dtm: {
      probeUrl: probeUrl(sample, "dtm"),
      httpStatus: dtmProbe.httpStatus,
      status: dtmProbe.body?.status ?? "failed",
      providerId: dtmProbe.body?.providerId ?? null,
      runClass: dtmProbe.body?.runClass ?? null,
      resolutionMeters: dtmProbe.body?.resolutionMeters ?? null,
      groundModelRole: dtmProbe.body?.groundModelRole ?? null,
      tileUrlTemplate: dtmProbe.body?.tileUrlTemplate ?? null,
      coverageSourceIds: dtmProbe.body?.coverageSourceIds ?? [],
      reasons: dtmProbe.body?.reasons ?? [],
      strictOneMeterCovered: dtmCovered,
      displayTile: dtmDisplayTile,
      strictOneMeterDisplayed: dtmDisplayTile.status === "displayed-1m"
    },
    dsm: {
      probeUrl: probeUrl(sample, "dsm"),
      httpStatus: dsmProbe.httpStatus,
      status: dsmProbe.body?.status ?? "failed",
      providerId: dsmProbe.body?.providerId ?? null,
      runClass: dsmProbe.body?.runClass ?? null,
      resolutionMeters: dsmProbe.body?.resolutionMeters ?? null,
      groundModelRole: dsmProbe.body?.groundModelRole ?? null,
      tileUrlTemplate: dsmProbe.body?.tileUrlTemplate ?? null,
      coverageSourceIds: dsmProbe.body?.coverageSourceIds ?? [],
      reasons: dsmProbe.body?.reasons ?? [],
      strictOneMeterResolved: dsmResolved,
      displayTile:
        "not-rendered: DSM display rendering is intentionally excluded from this DTM-first country sampler."
    }
  };
}

await mkdir(countrySampleArtifactDir, { recursive: true });
await mkdir(path.dirname(reportPath), { recursive: true });

let server = null;
try {
  server = await ensureServer();

  const results = [];
  let dtmTilesRendered = 0;
  for (const sample of samples) {
    const renderDtmTile = dtmTilesRendered < maxDtmTileRenders;
    const result = await runSample(sample, renderDtmTile);
    if (result.dtm.strictOneMeterCovered && renderDtmTile) {
      dtmTilesRendered += 1;
    }
    results.push(result);
  }

  const totalSamples = results.length;
  const dtmCovered = results.filter((result) => result.dtm.strictOneMeterCovered).length;
  const dtmDisplayed = results.filter((result) => result.dtm.strictOneMeterDisplayed).length;
  const dsmResolved = results.filter((result) => result.dsm.strictOneMeterResolved).length;
  const probeFailures = results.filter(
    (result) => result.dtm.httpStatus !== 200 || result.dsm.httpStatus !== 200
  );
  const attemptedDtmTiles = results.filter((result) =>
    ["displayed-1m", "failed"].includes(result.dtm.displayTile.status)
  );
  const failedDtmTiles = attemptedDtmTiles.filter(
    (result) => result.dtm.displayTile.status !== "displayed-1m"
  );
  const allRequestsCompleted = probeFailures.length === 0 && failedDtmTiles.length === 0;

  const report = {
    schemaVersion: "vmesh-usa-canada-terrain-country-sample-live-proof-v1",
    generatedAt: new Date().toISOString(),
    runClass: allRequestsCompleted ? "live-proof" : "configured",
    status: allRequestsCompleted ? "country-sample-live-proof-completed" : "failed",
    baseUrl,
    sampleClass: "public-safe-city-and-eval-coordinate-sample",
    samplePolicy:
      "This is a DTM-first source/display sampler. It probes strict 1m-class DTM and DSM for each public-safe coordinate, where 1m-class means 1m or better, renders bounded DTM display tiles for covered samples within the render budget, and does not claim country-wide coverage.",
    universalUsaCanadaOneMeterDtmProven: false,
    universalDsmProven: false,
    allSampledDtmCoordinatesDisplayedAtOneMeter: dtmDisplayed === totalSamples,
    allSampledDsmCoordinatesResolvedAtOneMeter: dsmResolved === totalSamples,
    renderBudget: {
      maxDtmTileRenders: Number.isFinite(maxDtmTileRenders) ? maxDtmTileRenders : "all",
      dtmTilesRendered
    },
    summary: {
      totalSamples,
      dtmStrictOneMeterCovered: dtmCovered,
      dtmStrictOneMeterDisplayed: dtmDisplayed,
      dtmStrictOneMeterBlockedOrFailed: totalSamples - dtmCovered,
      dsmStrictOneMeterResolved: dsmResolved,
      dsmStrictOneMeterBlockedOrFailed: totalSamples - dsmResolved,
      probeFailures: probeFailures.length,
      attemptedDtmTiles: attemptedDtmTiles.length,
      failedDtmTiles: failedDtmTiles.length,
      retainedDtmTileArtifacts: results.filter((result) => result.dtm.displayTile.retainedArtifact)
        .length
    },
    results
  };

  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
  process.exit(allRequestsCompleted ? 0 : 1);
} finally {
  server?.kill();
}

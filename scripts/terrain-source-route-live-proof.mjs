#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const artifactDir = path.join(".artifacts", "terrain-source-preview");
const routeArtifactDir = path.join(artifactDir, "route-live-proof");
const defaultReportPath = path.join(artifactDir, "source-preview-route-live-proof-latest.json");

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
  argValue("--base-url", process.env.VMESH_ROUTE_PROOF_BASE_URL ?? "http://localhost:3000")
);
const reportPath = argValue("--output", defaultReportPath);
const refresh = !hasArg("--no-refresh") && process.env.VMESH_ROUTE_PROOF_REFRESH !== "0";
const timeoutMs = Number(
  argValue("--timeout-ms", process.env.VMESH_ROUTE_PROOF_TIMEOUT_MS ?? "300000")
);

const checks = [
  {
    id: "usa-denver-source-auto-dtm",
    path: "/api/terrain/source-preview/source-auto/dtm/13/1706/3109",
    artifactName: "usa-denver-source-auto-dtm-z13-1706-3109.png",
    minBytes: 2048,
    expected: {
      httpStatus: 200,
      contentTypePrefix: "image/png",
      provider: "usgs-3dep",
      role: "dtm",
      groundModelRole: "bare-earth-dtm",
      resolutionMeters: "1",
      renderMode: "worker-geotiff"
    }
  },
  {
    id: "usa-denver-source-auto-dsm",
    path: "/api/terrain/source-preview/source-auto/dsm/15/6826/12436",
    artifactName: "usa-denver-source-auto-dsm-z15-6826-12436.png",
    minBytes: 2048,
    expected: {
      httpStatus: 200,
      contentTypePrefix: "image/png",
      provider: "usgs-3dep-lpc-dsm",
      role: "dsm",
      groundModelRole: "surface-dsm",
      resolutionMeters: "1",
      renderMode: "worker-point-cloud"
    }
  },
  {
    id: "canada-ottawa-source-auto-dtm",
    path: "/api/terrain/source-preview/source-auto/dtm/13/2373/2933",
    artifactName: "canada-ottawa-source-auto-dtm-z13-2373-2933.png",
    minBytes: 2048,
    expected: {
      httpStatus: 200,
      contentTypePrefix: "image/png",
      provider: "canada-hrdem",
      role: "dtm",
      groundModelRole: "bare-earth-dtm",
      resolutionMeters: "1",
      renderMode: "worker-geotiff"
    }
  },
  {
    id: "canada-ottawa-source-auto-dsm",
    path: "/api/terrain/source-preview/source-auto/dsm/13/2373/2933",
    artifactName: "canada-ottawa-source-auto-dsm-z13-2373-2933.png",
    minBytes: 2048,
    expected: {
      httpStatus: 200,
      contentTypePrefix: "image/png",
      provider: "canada-hrdem",
      role: "dsm",
      groundModelRole: "surface-dsm",
      resolutionMeters: "1",
      renderMode: "worker-geotiff"
    }
  },
  {
    id: "bc-vancouver-source-auto-dtm",
    path: "/api/terrain/source-preview/source-auto/dtm/16/10354/22427",
    artifactName: "bc-vancouver-source-auto-dtm-z16-10354-22427.png",
    minBytes: 2048,
    expected: {
      httpStatus: 200,
      contentTypePrefix: "image/png",
      provider: "bc-lidarbc",
      role: "dtm",
      groundModelRole: "bare-earth-dtm",
      resolutionMeters: "1",
      renderMode: "worker-geotiff"
    }
  },
  {
    id: "bc-vancouver-source-auto-dsm",
    path: "/api/terrain/source-preview/source-auto/dsm/16/10354/22427",
    artifactName: "bc-vancouver-source-auto-dsm-z16-10354-22427.png",
    minBytes: 2048,
    expected: {
      httpStatus: 200,
      contentTypePrefix: "image/png",
      provider: "bc-lidarbc",
      role: "dsm",
      groundModelRole: "surface-dsm",
      resolutionMeters: "1",
      renderMode: "worker-geotiff"
    }
  }
];

function routeUrl(routePath) {
  const url = new URL(`${baseUrl}${routePath}`);
  if (refresh) url.searchParams.set("refresh", "1");
  return url.toString();
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

function expectationMatches({ expected, actual, httpStatus, byteSize, minBytes }) {
  const reasons = [];
  const contentType = actual.contentType ?? "";

  if (httpStatus !== expected.httpStatus) {
    reasons.push(`Expected HTTP ${expected.httpStatus}, got ${httpStatus}.`);
  }
  if (!contentType.startsWith(expected.contentTypePrefix)) {
    reasons.push(
      `Expected content type ${expected.contentTypePrefix}*, got ${contentType || "none"}.`
    );
  }
  if (actual.provider !== expected.provider) {
    reasons.push(`Expected provider ${expected.provider}, got ${actual.provider || "none"}.`);
  }
  if (actual.role !== expected.role) {
    reasons.push(`Expected role ${expected.role}, got ${actual.role || "none"}.`);
  }
  if (actual.groundModelRole !== expected.groundModelRole) {
    reasons.push(
      `Expected ground model role ${expected.groundModelRole}, got ${
        actual.groundModelRole || "none"
      }.`
    );
  }
  if (actual.resolutionMeters !== expected.resolutionMeters) {
    reasons.push(
      `Expected resolution ${expected.resolutionMeters}m, got ${actual.resolutionMeters || "none"}.`
    );
  }
  if (actual.renderMode !== expected.renderMode) {
    reasons.push(
      `Expected render mode ${expected.renderMode}, got ${actual.renderMode || "none"}.`
    );
  }
  if (actual.sourceStatus === "transparent") {
    reasons.push(
      `Route returned transparent fail-soft tile: ${actual.sourceReason || "no reason"}.`
    );
  }
  if (byteSize < minBytes) {
    reasons.push(`Expected retained image to be at least ${minBytes} bytes, got ${byteSize}.`);
  }

  return {
    matchedExpected: reasons.length === 0,
    reasons
  };
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: {
        Accept: "image/png,image/*,*/*;q=0.8"
      },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function runCheck(check) {
  const url = routeUrl(check.path);
  const artifactPath = path.join(routeArtifactDir, check.artifactName);

  try {
    const response = await fetchWithTimeout(url);
    const actual = headerSummary(response.headers);
    const body = Buffer.from(await response.arrayBuffer());
    let retainedArtifact = null;

    if ((actual.contentType ?? "").startsWith("image/") && body.byteLength > 0) {
      await writeFile(artifactPath, body);
      retainedArtifact = artifactPath;
    }

    const matched = expectationMatches({
      expected: check.expected,
      actual,
      httpStatus: response.status,
      byteSize: body.byteLength,
      minBytes: check.minBytes
    });

    return {
      id: check.id,
      url,
      runClass: "live-proof",
      expected: check.expected,
      httpStatus: response.status,
      headers: actual,
      byteSize: body.byteLength,
      retainedArtifact,
      matchedExpected: matched.matchedExpected,
      reasons: matched.reasons
    };
  } catch (error) {
    return {
      id: check.id,
      url,
      runClass: "configured",
      expected: check.expected,
      httpStatus: null,
      headers: null,
      byteSize: 0,
      retainedArtifact: null,
      matchedExpected: false,
      reasons: [`Route request failed: ${error instanceof Error ? error.message : String(error)}.`]
    };
  }
}

await mkdir(routeArtifactDir, { recursive: true });
await mkdir(path.dirname(reportPath), { recursive: true });

const results = [];
for (const check of checks) {
  results.push(await runCheck(check));
}

const allMatched = results.every((result) => result.matchedExpected);
const report = {
  schemaVersion: "vmesh-terrain-source-preview-route-live-proof-v1",
  generatedAt: new Date().toISOString(),
  runClass: allMatched ? "live-proof" : "configured",
  status: allMatched ? "route-live-proof-passed" : "failed",
  baseUrl,
  refresh,
  universalUsaCanadaOneMeterDtmProven: false,
  universalDsmProven: false,
  canadaCoverageExpectation:
    "Canada national/default source expectation is partial 2m HRDEM. Strict 1m is claimed only for tiles where direct HRDEM or provincial source proof succeeds.",
  note: "Public-safe source-preview display-route proof. Mapterhorn tiles are not sampled; each response must identify the official source provider and worker render mode.",
  summary: {
    totalChecks: results.length,
    expectedMatches: results.filter((result) => result.matchedExpected).length,
    retainedArtifacts: results.filter((result) => result.retainedArtifact).length
  },
  checks: results
};

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
process.exit(allMatched ? 0 : 1);

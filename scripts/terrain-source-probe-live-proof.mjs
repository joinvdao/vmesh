#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const artifactDir = path.join(".artifacts", "terrain-source-preview");
const defaultReportPath = path.join(
  artifactDir,
  "source-preview-coordinate-probe-live-proof-latest.json"
);

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function normalizeBaseUrl(value) {
  return String(value).replace(/\/+$/, "");
}

const baseUrl = normalizeBaseUrl(
  argValue("--base-url", process.env.VMESH_ROUTE_PROOF_BASE_URL ?? "http://localhost:3000")
);
const reportPath = argValue("--output", defaultReportPath);
const timeoutMs = Number(
  argValue("--timeout-ms", process.env.VMESH_PROBE_PROOF_TIMEOUT_MS ?? "180000")
);

const checks = [
  {
    id: "usa-denver-strict-dtm",
    query: { lat: "39.74", lon: "-104.99", role: "dtm" },
    expected: {
      status: "covered",
      providerId: "usgs-3dep",
      role: "dtm",
      groundModelRole: "bare-earth-dtm",
      resolutionMeters: 1,
      tileUrlTemplate: "/api/terrain/source-preview/source-auto/dtm/{z}/{x}/{y}"
    }
  },
  {
    id: "canada-ottawa-strict-dtm",
    query: { lat: "45.4215", lon: "-75.6972", role: "dtm" },
    expected: {
      status: "covered",
      providerId: "canada-hrdem",
      role: "dtm",
      groundModelRole: "bare-earth-dtm",
      resolutionMeters: 1,
      tileUrlTemplate: "/api/terrain/source-preview/source-auto/dtm/{z}/{x}/{y}"
    }
  },
  {
    id: "bc-vancouver-strict-dtm",
    query: { lat: "49.2827", lon: "-123.1207", role: "dtm" },
    expected: {
      status: "covered",
      providerId: "bc-lidarbc",
      role: "dtm",
      groundModelRole: "bare-earth-dtm",
      resolutionMeters: 1,
      tileUrlTemplate: "/api/terrain/source-preview/bc-lidarbc/dtm/{z}/{x}/{y}"
    }
  },
  {
    id: "bc-interior-strict-dtm-gap",
    query: { lat: "50.665", lon: "-120.545", role: "dtm" },
    expected: {
      status: "blocked",
      providerId: "canada-hrdem",
      role: "dtm",
      groundModelRole: "bare-earth-dtm",
      resolutionMeters: 1,
      tileUrlTemplate: null
    }
  },
  {
    id: "usa-denver-dsm-source",
    query: { lat: "39.74", lon: "-104.99", role: "dsm" },
    expected: {
      status: "source-available",
      providerId: "usgs-3dep-lpc-dsm",
      role: "dsm",
      groundModelRole: "surface-dsm",
      resolutionMeters: 1,
      tileUrlTemplate: "/api/terrain/source-preview/source-auto/dsm/{z}/{x}/{y}"
    }
  },
  {
    id: "canada-ottawa-strict-dsm",
    query: { lat: "45.4215", lon: "-75.6972", role: "dsm" },
    expected: {
      status: "covered",
      providerId: "canada-hrdem",
      role: "dsm",
      groundModelRole: "surface-dsm",
      resolutionMeters: 1,
      tileUrlTemplate: "/api/terrain/source-preview/source-auto/dsm/{z}/{x}/{y}"
    }
  },
  {
    id: "bc-vancouver-strict-dsm",
    query: { lat: "49.2827", lon: "-123.1207", role: "dsm" },
    expected: {
      status: "covered",
      providerId: "bc-lidarbc",
      role: "dsm",
      groundModelRole: "surface-dsm",
      resolutionMeters: 1,
      tileUrlTemplate: "/api/terrain/source-preview/bc-lidarbc/dsm/{z}/{x}/{y}"
    }
  }
];

function checkUrl(query) {
  const url = new URL(`${baseUrl}/api/terrain/source-preview/probe`);
  Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

function compareExpected(body, expected) {
  const reasons = [];
  for (const [key, value] of Object.entries(expected)) {
    if (body?.[key] !== value) {
      reasons.push(`Expected ${key}=${String(value)}, got ${String(body?.[key])}.`);
    }
  }
  if (body?.runClass !== "live-proof") {
    reasons.push(`Expected runClass=live-proof, got ${String(body?.runClass)}.`);
  }
  return {
    matchedExpected: reasons.length === 0,
    reasons
  };
}

async function fetchJsonWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    const body = (await response.json().catch(() => null)) ?? null;
    return { response, body };
  } finally {
    clearTimeout(timeout);
  }
}

async function runCheck(check) {
  const url = checkUrl(check.query);
  try {
    const { response, body } = await fetchJsonWithTimeout(url);
    const matched = compareExpected(body, check.expected);
    if (response.status !== 200) {
      matched.reasons.push(`Expected HTTP 200, got ${response.status}.`);
      matched.matchedExpected = false;
    }

    return {
      id: check.id,
      url,
      expected: check.expected,
      httpStatus: response.status,
      body,
      matchedExpected: matched.matchedExpected,
      reasons: matched.reasons
    };
  } catch (error) {
    return {
      id: check.id,
      url,
      expected: check.expected,
      httpStatus: null,
      body: null,
      matchedExpected: false,
      reasons: [`Probe request failed: ${error instanceof Error ? error.message : String(error)}.`]
    };
  }
}

await mkdir(path.dirname(reportPath), { recursive: true });

const results = [];
for (const check of checks) {
  results.push(await runCheck(check));
}

const allMatched = results.every((result) => result.matchedExpected);
const report = {
  schemaVersion: "vmesh-terrain-source-preview-coordinate-probe-live-proof-v1",
  generatedAt: new Date().toISOString(),
  runClass: allMatched ? "live-proof" : "configured",
  status: allMatched ? "coordinate-probe-live-proof-passed" : "failed",
  baseUrl,
  universalUsaCanadaOneMeterDtmProven: false,
  universalDsmProven: false,
  note: "Public-safe coordinate probe proof for the address/search decision path. These probes prove selected strict 1m DTM/DSM coverage and an intentional fail-closed gap; they do not prove country-wide 1m USA/Canada coverage.",
  summary: {
    totalChecks: results.length,
    expectedMatches: results.filter((result) => result.matchedExpected).length
  },
  checks: results
};

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
process.exit(allMatched ? 0 : 1);

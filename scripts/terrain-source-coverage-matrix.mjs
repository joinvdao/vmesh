#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const artifactDir = path.join(".artifacts", "terrain-source-preview");
const matrixPath = path.join(artifactDir, "usa-canada-1m-terrain-coverage-matrix-latest.json");

const probes = [
  {
    id: "usa-denver-dtm",
    expectedStatus: "covered",
    command: [
      "python",
      "scripts/terrain-usgs-3dep-render.py",
      "--tile-z",
      "13",
      "--tile-x",
      "1706",
      "--tile-y",
      "3109",
      "--role",
      "dtm",
      "--label",
      "Denver public-safe USGS 3DEP 1m DTM matrix proof",
      "--output",
      path.join(artifactDir, "matrix-denver-usgs-dtm.json"),
      "--render-output",
      path.join(artifactDir, "matrix-denver-usgs-dtm.png")
    ]
  },
  {
    id: "usa-denver-usgs-dem-dsm-route-blocked",
    expectedStatus: "blocked",
    command: [
      "python",
      "scripts/terrain-usgs-3dep-render.py",
      "--tile-z",
      "13",
      "--tile-x",
      "1706",
      "--tile-y",
      "3109",
      "--role",
      "dsm",
      "--label",
      "Denver public-safe USGS DSM blocked matrix proof",
      "--output",
      path.join(artifactDir, "matrix-denver-usgs-dsm-blocked.json")
    ]
  },
  {
    id: "usa-denver-usgs-lpc-dsm-render",
    expectedStatus: "covered",
    command: [
      "python",
      "scripts/terrain-usgs-lpc-dsm-render.py",
      "--tile-z",
      "15",
      "--tile-x",
      "6826",
      "--tile-y",
      "12436",
      "--label",
      "Denver public-safe USGS LPC 1m DSM render matrix proof",
      "--output",
      path.join(artifactDir, "matrix-denver-usgs-lpc-dsm-render.json"),
      "--render-output",
      path.join(artifactDir, "matrix-denver-usgs-lpc-dsm-render.png"),
      "--geotiff-output",
      path.join(artifactDir, "matrix-denver-usgs-lpc-dsm-render.tif"),
      "--max-assets",
      "6",
      "--download-budget-mb",
      "512"
    ]
  },
  {
    id: "canada-ottawa-hrdem-dtm",
    expectedStatus: "covered",
    command: [
      "python",
      "scripts/terrain-cog-probe.py",
      "--provider",
      "canada-hrdem",
      "--tile-z",
      "13",
      "--tile-x",
      "2373",
      "--tile-y",
      "2933",
      "--role",
      "dtm",
      "--label",
      "Ottawa public-safe HRDEM 1m DTM matrix proof",
      "--output",
      path.join(artifactDir, "matrix-ottawa-hrdem-dtm.json"),
      "--render-output",
      path.join(artifactDir, "matrix-ottawa-hrdem-dtm.png")
    ]
  },
  {
    id: "canada-ottawa-hrdem-dsm",
    expectedStatus: "covered",
    command: [
      "python",
      "scripts/terrain-cog-probe.py",
      "--provider",
      "canada-hrdem",
      "--tile-z",
      "13",
      "--tile-x",
      "2373",
      "--tile-y",
      "2933",
      "--role",
      "dsm",
      "--label",
      "Ottawa public-safe HRDEM 1m DSM matrix proof",
      "--output",
      path.join(artifactDir, "matrix-ottawa-hrdem-dsm.json"),
      "--render-output",
      path.join(artifactDir, "matrix-ottawa-hrdem-dsm.png")
    ]
  },
  {
    id: "bc-vancouver-lidarbc-dtm",
    expectedStatus: "covered",
    command: [
      "python",
      "scripts/terrain-cog-probe.py",
      "--provider",
      "bc-lidarbc",
      "--lat",
      "49.2827",
      "--lon",
      "-123.1207",
      "--role",
      "dtm",
      "--window",
      "128",
      "--label",
      "Vancouver public-safe LidarBC 1m DTM matrix proof",
      "--output",
      path.join(artifactDir, "matrix-vancouver-lidarbc-dtm.json"),
      "--render-output",
      path.join(artifactDir, "matrix-vancouver-lidarbc-dtm.png"),
      "--include-coordinate"
    ]
  },
  {
    id: "bc-vancouver-lidarbc-dsm",
    expectedStatus: "covered",
    command: [
      "python",
      "scripts/terrain-cog-probe.py",
      "--provider",
      "bc-lidarbc",
      "--lat",
      "49.2827",
      "--lon",
      "-123.1207",
      "--role",
      "dsm",
      "--window",
      "128",
      "--label",
      "Vancouver public-safe LidarBC 1m DSM matrix proof",
      "--output",
      path.join(artifactDir, "matrix-vancouver-lidarbc-dsm.json"),
      "--render-output",
      path.join(artifactDir, "matrix-vancouver-lidarbc-dsm.png"),
      "--include-coordinate"
    ]
  },
  {
    id: "bc-interior-public-gap-lidarbc-dtm",
    expectedStatus: "blocked",
    command: [
      "python",
      "scripts/terrain-cog-probe.py",
      "--provider",
      "bc-lidarbc",
      "--lat",
      "50.665",
      "--lon",
      "-120.545",
      "--role",
      "dtm",
      "--window",
      "64",
      "--label",
      "BC interior public-safe LidarBC 1m DTM gap matrix proof",
      "--output",
      path.join(artifactDir, "matrix-bc-interior-lidarbc-dtm-gap.json")
    ]
  },
  {
    id: "bc-interior-public-gap-hrdem-dtm",
    expectedStatus: "blocked",
    command: [
      "python",
      "scripts/terrain-cog-probe.py",
      "--provider",
      "canada-hrdem",
      "--lat",
      "50.665",
      "--lon",
      "-120.545",
      "--role",
      "dtm",
      "--window",
      "64",
      "--label",
      "BC interior public-safe HRDEM 1m DTM gap matrix proof",
      "--output",
      path.join(artifactDir, "matrix-bc-interior-hrdem-dtm-gap.json")
    ]
  }
];

function runProbe(probe) {
  const [cmd, ...args] = probe.command;
  const result = spawnSync(cmd, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 16
  });

  let parsed = null;
  const outputPathIndex = args.indexOf("--output");
  const outputPath = outputPathIndex >= 0 ? args[outputPathIndex + 1] : null;
  if (outputPath) {
    try {
      parsed = JSON.parse(readFileSync(outputPath, "utf8"));
    } catch {
      parsed = null;
    }
  }
  if (!parsed && result.stdout.trim()) {
    try {
      parsed = JSON.parse(result.stdout);
    } catch {
      parsed = null;
    }
  }

  const actualStatus = parsed?.status ?? (result.status === 0 ? "covered" : "failed");
  const matchedExpected = actualStatus === probe.expectedStatus;

  return {
    id: probe.id,
    expectedStatus: probe.expectedStatus,
    actualStatus,
    matchedExpected,
    exitCode: result.status,
    providerId: parsed?.providerId ?? null,
    role: parsed?.role ?? null,
    groundModelRole: parsed?.groundModelRole ?? null,
    resolutionMeters: parsed?.resolutionMeters ?? null,
    coverageSourceIds: parsed?.coverageSourceIds ?? [],
    renderedArtifact: parsed?.renderedArtifact ?? null,
    retainedJson: outputPath,
    reasons: parsed?.reasons ?? [result.stderr.trim() || result.stdout.trim()].filter(Boolean)
  };
}

mkdirSync(artifactDir, { recursive: true });

const results = probes.map(runProbe);
const allExpected = results.every((result) => result.matchedExpected);
const coveredDtmResults = results.filter(
  (result) => result.actualStatus === "covered" && result.groundModelRole === "bare-earth-dtm"
);
const coveredDsmResults = results.filter(
  (result) => result.actualStatus === "covered" && result.groundModelRole === "surface-dsm"
);
const blockedDtmResults = results.filter(
  (result) => result.actualStatus === "blocked" && result.groundModelRole === "bare-earth-dtm"
);

const matrix = {
  schemaVersion: "vmesh-usa-canada-1m-terrain-coverage-matrix-v1",
  generatedAt: new Date().toISOString(),
  runClass: "live-proof",
  status: allExpected ? "expected-source-coverage-state-proven" : "failed",
  universalUsaCanadaOneMeterDtmProven: false,
  universalDsmProven: false,
  summary: {
    totalProbes: results.length,
    expectedMatches: results.filter((result) => result.matchedExpected).length,
    coveredDtmProbes: coveredDtmResults.length,
    coveredDsmProbes: coveredDsmResults.length,
    blockedDtmProbes: blockedDtmResults.length,
    note:
      "The matrix proves source-native 1m coverage for selected official-source AOIs, including a bounded USA LPC DSM render, and proves fail-closed gaps. It does not prove universal 1m USA/Canada coverage."
  },
  sourcePolicy: {
    mapterhornUse:
      "Attribution/source-family clue only. Do not render or sample Mapterhorn tiles as source-native DTM/DSM truth.",
    dtmRule:
      "Only official 1m DTM/DEM source refs with non-no-data pixels can satisfy DTM coverage.",
    dsmRule:
      "DSM is separate surface context and must not be promoted to bare-earth DTM."
  },
  results
};

writeFileSync(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
console.log(JSON.stringify(matrix, null, 2));
process.exit(allExpected ? 0 : 1);

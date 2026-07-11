#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const baseUrl = new URL(process.argv[2] ?? "http://127.0.0.1:3001");
const outputPath = resolve(
  process.argv[3] ?? ".artifacts/source-registry/building-live-matrix/latest.json"
);
const samples = [
  ["canada-kamloops-public", 50.67, -120.33],
  ["north-america-denver", 39.74, -104.99],
  ["europe-lisbon", 38.72, -9.14],
  ["asia-tokyo", 35.68, 139.69],
  ["africa-cape-town", -33.92, 18.42],
  ["ocean-pacific", 0, -140]
];
const rows = [];
for (const [id, lat, lng] of samples) {
  const startedAt = Date.now();
  try {
    const response = await fetch(new URL("/api/geospatial-package/buildings/live", baseUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lat, lng, maxFeatures: 12_000 })
    });
    const result = await response.json();
    const features = result.featureCollection?.features ?? [];
    rows.push({
      id,
      httpStatus: response.status,
      durationMs: Date.now() - startedAt,
      status: result.status,
      runClass: result.runClass,
      release: result.release,
      license: result.license,
      tileCount: result.query?.tileCount ?? 0,
      featureCount: features.length,
      semantics: {
        classCount: countPresent(features, "class"),
        subtypeCount: countPresent(features, "subtype"),
        heightCount: countPresent(features, "heightMeters"),
        levelsCount: countPresent(features, "levels"),
        facadeMaterialCount: countPresent(features, "facadeMaterial"),
        roofShapeCount: countPresent(features, "roofShape")
      },
      error: result.error
    });
  } catch (error) {
    rows.push({
      id,
      durationMs: Date.now() - startedAt,
      status: "request-failed",
      error: error instanceof Error ? error.message : "request-failed"
    });
  }
}
const report = {
  schemaVersion: "vmesh-building-live-matrix-v1",
  generatedAt: new Date().toISOString(),
  runClass: "live-proof",
  coordinateDisclosure: "public-safe-labels-only",
  rows
};
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (rows.some((row) => row.status === "provider-failed" || row.status === "request-failed")) {
  process.exitCode = 1;
}

function countPresent(features, property) {
  return features.filter((feature) => feature.properties?.[property] != null).length;
}

#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const baseUrl = new URL(process.argv[2] ?? "http://127.0.0.1:3001");
const outputPath = resolve(
  process.argv[3] ?? ".artifacts/source-registry/context-live-matrix/latest.json"
);
const samples = [
  ["canada-kamloops-public", 50.67, -120.33],
  ["north-america-denver", 39.74, -104.99],
  ["europe-lisbon", 38.72, -9.14],
  ["asia-tokyo", 35.68, 139.69],
  ["africa-cape-town", -33.92, 18.42],
  ["ocean-pacific", 0, -140]
];
const rows = await Promise.all(samples.map(prove));
const report = {
  schemaVersion: "vmesh-context-live-matrix-v1",
  generatedAt: new Date().toISOString(),
  runClass: "live-proof",
  coordinateDisclosure: "public-safe-labels-only",
  rows
};
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (rows.some((row) => row.error)) process.exitCode = 1;

async function prove([id, lat, lng]) {
  const startedAt = Date.now();
  try {
    const response = await fetch(new URL("/api/geospatial-package/context/live", baseUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lat, lng })
    });
    const result = await response.json();
    const roads = result.roads?.featureCollection?.features ?? [];
    const water = result.water?.featureCollection?.features ?? [];
    return {
      id,
      httpStatus: response.status,
      durationMs: Date.now() - startedAt,
      roads: summarizeFeatures(result.roads, roads, [
        "class",
        "subclass",
        "road_surface",
        "access_restrictions"
      ]),
      water: summarizeFeatures(result.water, water, [
        "class",
        "subtype",
        "is_intermittent",
        "is_salt"
      ]),
      weather: {
        status: result.weather?.status,
        role: result.weather?.role,
        observedAtPresent: Boolean(result.weather?.observedAt),
        valueCount: Object.values(result.weather?.values ?? {}).filter((value) => value != null)
          .length
      },
      soil: {
        status: result.soil?.status,
        role: result.soil?.role,
        valueCount: Object.values(result.soil?.values ?? {}).filter((value) => value != null)
          .length,
        errorClass: result.soil?.error ? "provider-timeout-or-failure" : null
      },
      parcels: result.parcels?.status,
      fieldBoundaries: result.fieldBoundaries?.status
    };
  } catch (error) {
    return {
      id,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "request-failed"
    };
  }
}

function summarizeFeatures(result, features, properties) {
  return {
    status: result?.status,
    release: result?.release,
    featureCount: features.length,
    semantics: Object.fromEntries(
      properties.map((property) => [
        `${property}Count`,
        features.filter((feature) => feature.properties?.[property] != null).length
      ])
    )
  };
}

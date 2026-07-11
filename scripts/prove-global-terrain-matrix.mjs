#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const baseUrl = new URL(process.argv[2] ?? "http://127.0.0.1:3001");
const outputPath = resolve(
  process.argv[3] ?? ".artifacts/source-registry/global-terrain-live-matrix/latest.json"
);
const samples = [
  ["africa-cape-town", -33.92, 18.42],
  ["europe-lisbon", 38.72, -9.14],
  ["asia-tokyo", 35.68, 139.69],
  ["australia-sydney", -33.86, 151.21],
  ["south-america-buenos-aires", -34.6, -58.38],
  ["north-america-denver", 39.74, -104.99],
  ["canada-kamloops-public", 50.67, -120.33],
  ["uk-scotland-edinburgh", 55.95, -3.19],
  ["anti-meridian-fiji", -17.7, 179.99],
  ["high-latitude-svalbard", 78.22, 15.64],
  ["ocean-pacific", 0, -140]
];

const rows = [];
for (let index = 0; index < samples.length; index += 3) {
  rows.push(...(await Promise.all(samples.slice(index, index + 3).map(proveSample))));
}
const report = {
  schemaVersion: "vmesh-global-terrain-live-matrix-v1",
  generatedAt: new Date().toISOString(),
  runClass: "live-proof",
  coordinateDisclosure: "public-safe-labels-only",
  rows
};
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (rows.some((row) => row.error)) process.exitCode = 1;

async function proveSample([id, latitude, longitude]) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const url = new URL("/api/geospatial-package/resolve", baseUrl);
    for (const [key, value] of Object.entries({
      lat: latitude,
      lng: longitude,
      segments: "terrain_elevation",
      liveTerrain: "true",
      probeTimeoutMs: "10000",
      label: id
    })) {
      url.searchParams.set(key, String(value));
    }
    const response = await fetch(url, { signal: controller.signal });
    const handoff = await response.json();
    const selectedId = handoff.terrain?.selectedSourceIds?.[0] ?? null;
    const selectedPlan =
      handoff.terrainAdapterPlans?.find(
        (plan) => plan.status === "ready" && plan.selectedSource?.id === selectedId
      ) ?? handoff.terrainAdapterPlans?.at(-1);
    return {
      id,
      httpStatus: response.status,
      durationMs: Date.now() - startedAt,
      layerStatus: handoff.layers?.find((layer) => layer.layerId === "terrain")?.status ?? null,
      selectedSourceIds: handoff.terrain?.selectedSourceIds ?? [],
      planStatus: selectedPlan?.status ?? null,
      runClass: selectedPlan?.runClass ?? null,
      provider: selectedPlan?.toolProfile?.provider ?? null,
      groundModelRole: selectedPlan?.toolProfile?.groundModelRole ?? null,
      resolutionMeters: selectedPlan?.targetResolutionMeters ?? null,
      inputRefCount: selectedPlan?.inputRefs?.length ?? 0,
      inputKinds: Array.from(new Set(selectedPlan?.inputRefs?.map((ref) => ref.kind) ?? [])),
      blockedReasons: selectedPlan?.blockedReasons ?? [],
      gapCount: handoff.gaps?.length ?? 0
    };
  } catch (error) {
    return {
      id,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? `${error.name}: ${error.message}` : "request-failed"
    };
  } finally {
    clearTimeout(timer);
  }
}

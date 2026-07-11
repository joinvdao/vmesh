#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const baseUrl = new URL(process.argv[2] ?? "http://127.0.0.1:3001");
const outputPath = resolve(
  process.argv[3] ?? ".artifacts/source-registry/worldwide-acceptance/latest.json"
);
const samples = [
  ["canada-kamloops-public", 50.67, -120.33, "regional-lidar"],
  ["canada-calgary", 51.05, -114.07, "regional-dem"],
  ["usa-denver", 39.74, -104.99, "regional-lidar"],
  ["uk-scotland-edinburgh", 55.95, -3.19, "regional-dem"],
  ["europe-lisbon-urban", 38.72, -9.14, "global-floor"],
  ["asia-tokyo-urban", 35.68, 139.69, "global-floor"],
  ["africa-cape-town", -33.92, 18.42, "global-floor"],
  ["australia-sydney", -33.87, 151.21, "global-floor"],
  ["south-america-patagonia-sparse", -49.33, -72.89, "global-floor"],
  ["north-america-florida-coastal", 29.89, -81.31, "coastal"],
  ["pacific-ocean-empty", 0, -140, "ocean"],
  ["anti-meridian-land", -16.52, 179.99, "anti-meridian"],
  ["high-latitude-land", 78.22, 15.65, "high-latitude"]
];

const rows = [];
for (let index = 0; index < samples.length; index += 2) {
  rows.push(...(await Promise.all(samples.slice(index, index + 2).map(prove))));
}
const failures = rows.flatMap((row) =>
  row.acceptanceFailures.map((failure) => `${row.id}:${failure}`)
);
const report = {
  schemaVersion: "vmesh-worldwide-acceptance-v1",
  generatedAt: new Date().toISOString(),
  runClass: "live-proof",
  coordinateDisclosure: "public-safe-labels-only",
  sampleCount: rows.length,
  passCount: rows.filter((row) => row.acceptanceFailures.length === 0).length,
  failureCount: failures.length,
  failures,
  rows
};
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failures.length) process.exitCode = 1;

async function prove([id, lat, lng, scenario]) {
  const request = {
    lat,
    lng,
    edgeMeters: 3000,
    gridSize: 257,
    liveTerrain: false,
    segments: [
      "terrain_elevation",
      "access_infrastructure",
      "water_hydrology",
      "soils_landcover",
      "ecology_biodiversity_carbon",
      "climate_weather",
      "land_property_planning"
    ]
  };
  const firstPlan = await timedJson("/api/geospatial-package/resolve", request);
  const warmPlan = await timedJson("/api/geospatial-package/resolve", request);
  const [terrain, buildings, context] = await Promise.all([
    timedJson("/api/geospatial-package/resolve", {
      ...request,
      liveTerrain: true,
      probeTimeoutMs: 2500
    }),
    timedJson("/api/geospatial-package/buildings/live", { lat, lng, maxFeatures: 2000 }),
    timedJson("/api/geospatial-package/context/live", { lat, lng, maxFeatures: 2000 })
  ]);
  const handoff = terrain.body;
  const terrainDecision = decision(handoff, "terrain");
  const landcoverDecision = decision(handoff, "landcover");
  const terrainPlan = (handoff.terrainAdapterPlans ?? []).find(
    (plan) => plan.selectedSource?.id === handoff.terrain?.selectedSourceIds?.[0]
  );
  const buildingFeatures = buildings.body.featureCollection?.features ?? [];
  const roadFeatures = context.body.roads?.featureCollection?.features ?? [];
  const waterFeatures = context.body.water?.featureCollection?.features ?? [];
  const acceptanceFailures = [];
  if (handoff.schemaVersion !== "vmesh-abundance-source-handoff-v1")
    acceptanceFailures.push("handoff-schema-invalid");
  if (warmPlan.durationMs > 2000) acceptanceFailures.push("warm-plan-over-2s");
  if (terrain.durationMs > 10000) acceptanceFailures.push("cold-plan-over-10s");
  if (scenario !== "ocean" && !terrainDecision?.selectedSourceId)
    acceptanceFailures.push("terrain-source-missing");
  if (scenario !== "ocean" && terrainPlan?.status !== "ready")
    acceptanceFailures.push("terrain-recipe-not-ready");
  if (!landcoverDecision?.bestAvailableSourceId) acceptanceFailures.push("landcover-plan-missing");
  if (!String(buildings.body.status ?? "").startsWith("query-succeeded"))
    acceptanceFailures.push("buildings-query-failed");
  if (!String(context.body.roads?.status ?? "").startsWith("query-succeeded"))
    acceptanceFailures.push("roads-query-failed");
  if (!String(context.body.water?.status ?? "").startsWith("query-succeeded"))
    acceptanceFailures.push("water-query-failed");

  return {
    id,
    scenario,
    frame: { edgeMeters: handoff.request?.edgeMeters, gridSize: handoff.request?.gridSize },
    timingMs: {
      initialPlan: firstPlan.durationMs,
      warmPlan: warmPlan.durationMs,
      coldLiveTerrainPlan: terrain.durationMs,
      buildings: buildings.durationMs,
      context: context.durationMs
    },
    responseBytes: {
      handoff: terrain.bytes,
      buildings: buildings.bytes,
      context: context.bytes
    },
    terrain: {
      selectedSourceId: terrainDecision?.selectedSourceId ?? null,
      bestAvailableSourceId: terrainDecision?.bestAvailableSourceId ?? null,
      rank: terrainDecision?.bestRank ?? null,
      role: terrainDecision?.candidates?.find((item) => item.selected)?.sourceRole ?? null,
      resolution: terrainDecision?.candidates?.find((item) => item.selected)?.resolution ?? null,
      confidence:
        terrainDecision?.candidates?.find((item) => item.selected)?.confidenceTier ?? null,
      recipeStatus: terrainPlan?.status ?? "blocked",
      runClass: terrainPlan?.runClass ?? null,
      downstreamMaterializationProven: Boolean(
        terrainPlan?.warnings?.some((warning) =>
          /valid terrain pixels|pixel coverage probe proved/i.test(warning)
        )
      ),
      rejectedSourceIds: terrainDecision?.rejectedSourceIds?.slice(0, 8) ?? []
    },
    landcover: summarizeDecision(landcoverDecision),
    buildings: summarizeFeatures(buildings.body, buildingFeatures, ["class", "subtype", "height"]),
    roads: summarizeFeatures(context.body.roads, roadFeatures, [
      "class",
      "subclass",
      "road_surface"
    ]),
    water: summarizeFeatures(context.body.water, waterFeatures, ["class", "subtype"]),
    weather: { status: context.body.weather?.status, role: context.body.weather?.role },
    soil: { status: context.body.soil?.status, role: context.body.soil?.role },
    parcels: context.body.parcels?.status ?? "explicit-gap",
    gaps: (handoff.gaps ?? []).slice(0, 12),
    acceptanceFailures
  };
}

async function timedJson(pathname, body) {
  const startedAt = Date.now();
  const response = await fetch(new URL(pathname, baseUrl), {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    value = { status: "invalid-json", error: `HTTP ${response.status}` };
  }
  return { durationMs: Date.now() - startedAt, bytes: Buffer.byteLength(text), body: value };
}

function decision(handoff, layerId) {
  return handoff.sourceRanking?.layerDecisions?.find((item) => item.layerId === layerId);
}

function summarizeDecision(value) {
  return {
    selectedSourceId: value?.selectedSourceId ?? null,
    bestAvailableSourceId: value?.bestAvailableSourceId ?? null,
    rank: value?.bestRank ?? null,
    rejectedSourceIds: value?.rejectedSourceIds?.slice(0, 6) ?? []
  };
}

function summarizeFeatures(result, features, properties) {
  return {
    status: result?.status,
    featureCount: features.length,
    semanticCounts: Object.fromEntries(
      properties.map((property) => [
        property,
        features.filter((feature) => feature.properties?.[property] != null).length
      ])
    )
  };
}

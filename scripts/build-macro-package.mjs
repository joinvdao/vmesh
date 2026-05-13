import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { cellToLatLng, getResolution, latLngToCell } from "h3-js";
import { format, resolveConfig } from "prettier";

const schemaVersion = "vmesh-macro-package-v1";
const generatedAt = "2026-05-11T00:00:00.000Z";
const validFrom = "2026-05-01T00:00:00.000Z";
const validTo = "2026-05-04T00:00:00.000Z";
const packageId = "western-europe-demo";
const packageVersion = "2026.05.fixture";
const fixtureVariables = [
  "temperature_2m",
  "precipitation",
  "wind_speed_10m",
  "cloud_cover",
  "shortwave_radiation_proxy"
];
const layerIds = [
  "climate-trend",
  "climate-weather",
  "climate-rainfall",
  "hazard-flood-lowland",
  "hazard-fire-weather",
  "solar-potential"
];
const seedPlaces = [
  ["Lisbon Estuary", 38.7223, -9.1393],
  ["Porto Watershed", 41.1579, -8.6291],
  ["Douro Valley", 41.16, -7.79],
  ["Alentejo Agro-Solar", 38.05, -7.87],
  ["Algarve Coast", 37.0194, -7.9304],
  ["Galicia Food Belt", 42.8782, -8.5448],
  ["Basque Circular Coast", 43.263, -2.935],
  ["Madrid Water Grid", 40.4168, -3.7038],
  ["Barcelona Commons", 41.3874, 2.1686],
  ["Valencia Huerta", 39.4699, -0.3763],
  ["Seville Heat Commons", 37.3891, -5.9845],
  ["Pyrenees Headwaters", 42.5063, 1.5218],
  ["Bordeaux Basin", 44.8378, -0.5792],
  ["Occitanie Food Web", 43.6047, 1.4442],
  ["Marseille Littoral", 43.2965, 5.3698],
  ["Lyon Energy Valley", 45.764, 4.8357],
  ["Zurich Circular Hub", 47.3769, 8.5417],
  ["Milan Po Valley", 45.4642, 9.19],
  ["Copenhagen Blue-Green", 55.6761, 12.5683],
  ["Stockholm Resilience", 59.3293, 18.0686]
];

function parseArgs(argv) {
  const args = { fixture: false, out: "fixtures/macro-packages", tier: "U5", maxCells: 20 };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--fixture") args.fixture = true;
    if (arg === "--out") args.out = argv[index + 1] ?? args.out;
    if (arg === "--tier") args.tier = argv[index + 1] ?? args.tier;
    if (arg === "--max-cells") args.maxCells = Number(argv[index + 1] ?? args.maxCells);
    if (arg === "--live") {
      throw new Error("Live macro package builds are not implemented; use --fixture.");
    }
  }
  return args;
}

function hash(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

async function formatJson(value, filePath) {
  const options = (await resolveConfig(filePath)) ?? {};
  return format(JSON.stringify(value), { ...options, parser: "json" });
}

function classLabel(score) {
  if (score >= 78) return "severe";
  if (score >= 58) return "high";
  if (score >= 34) return "moderate";
  return "low";
}

function solarClass(score) {
  if (score >= 72) return "high";
  if (score >= 42) return "medium";
  return "low";
}

function seedForH3Id(h3Id) {
  return [...h3Id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 97;
}

function createRecord([label, latitude, longitude]) {
  const h3Id = latLngToCell(latitude, longitude, 5);
  const seed = seedForH3Id(h3Id);
  const [cellLatitude, cellLongitude] = cellToLatLng(h3Id);
  const heat = 24 + ((seed * 7) % 48);
  const rain = 2 + ((seed * 3) % 34);
  const wind = 8 + ((seed * 5) % 42);
  const cloud = 18 + ((seed * 11) % 70);
  const floodScore = Math.min(100, Math.round(48 * 0.35 + rain * 1.2));
  const fireScore = Math.min(100, Math.round(42 * 0.45 + heat * 0.62 + wind * 0.28 - rain * 0.18));
  const solarScore = Math.max(
    0,
    Math.min(100, Math.round(68 * 0.5 + (100 - cloud) * 0.38 + heat * 0.12))
  );

  return {
    h3Id,
    tier: "U5",
    resolution: getResolution(h3Id),
    centroid: { latitude: cellLatitude, longitude: cellLongitude },
    weather: {
      temperatureC: Math.round((14 + heat * 0.28) * 10) / 10,
      apparentTemperatureC: Math.round((15 + heat * 0.32) * 10) / 10,
      precipitationMm: Math.round((rain / 12) * 10) / 10,
      rainfallMm: Math.round((rain / 14) * 10) / 10,
      windSpeedKph: wind,
      windGustKph: wind + 12,
      relativeHumidityPercent: Math.max(20, Math.min(96, 78 - heat * 0.35 + rain * 0.5)),
      cloudCoverPercent: cloud
    },
    forecast: {
      next72hRainMm: rain,
      maxTemperatureC: Math.round((17 + heat * 0.31) * 10) / 10,
      minTemperatureC: Math.round((8 + heat * 0.13) * 10) / 10,
      maxWindGustKph: wind + 18,
      dominantCondition:
        rain > 24 ? "Wet spell" : cloud > 70 ? "Cloudy" : heat > 58 ? "Heat watch" : "Settled",
      stressScore: Math.min(100, Math.round(heat * 0.42 + rain * 0.32 + wind * 0.26))
    },
    climateTrend: {
      baselineLabel: "Fixture 1991-2020 baseline",
      temperatureAnomalyC: Math.round((((seed % 15) - 4) / 10) * 10) / 10,
      rainfallAnomalyPercent: ((seed * 7) % 46) - 18,
      trendDirection: seed % 4 === 0 ? "stable" : "warming",
      confidence: 62 + (seed % 18)
    },
    flood: {
      exposureScore: floodScore,
      classLabel: classLabel(floodScore),
      drivers: ["72h rainfall fixture", "water stress proxy", "DEM/HAND future input"],
      confidence: 64 + (seed % 18)
    },
    fire: {
      exposureScore: fireScore,
      classLabel: classLabel(fireScore),
      drivers: ["heat proxy", "wind proxy", "vegetation dryness future input"],
      confidence: 62 + (seed % 20)
    },
    solar: {
      practicalityScore: solarScore,
      irradianceKwhM2Day: Math.round((2.1 + solarScore * 0.045) * 10) / 10,
      cloudPenalty: cloud,
      classLabel: solarClass(solarScore),
      interpretation: "Fixture signal for local hub charging, refrigeration, and comms timing.",
      confidence: 60 + (seed % 20)
    },
    provenance: {
      providerId: "open-meteo-fixture-package",
      providerLabel: "Open-Meteo fixture package",
      sourceType: "fixture",
      observedAt: validFrom,
      generatedAt,
      freshnessLabel: "fixture package 2026-05-01 to 2026-05-04",
      confidence: 76,
      limitations:
        "Fixture package for local macro pipeline validation. It is not a live provider result and not operational intelligence.",
      license: "Fictional fixture generated from deterministic vmesh mock data"
    },
    packageId,
    packageVersion,
    packageMode: "fixture-package",
    qualityFlags: ["fixture", "bounded-aoi", "no-live-network", label],
    inputVariables: fixtureVariables,
    modelRunAt: generatedAt,
    validFrom,
    validTo,
    license: "Fictional fixture generated from deterministic vmesh mock data",
    limitations: "Fixture package for pipeline and UI validation. Not operational intelligence."
  };
}

const args = parseArgs(process.argv.slice(2));
if (!args.fixture) {
  throw new Error("Default macro package builds must use --fixture.");
}
if (args.tier !== "U5") {
  throw new Error("The current fixture builder supports --tier U5 only.");
}
if (!Number.isFinite(args.maxCells) || args.maxCells < 1 || args.maxCells > 64) {
  throw new Error("--max-cells must be between 1 and 64.");
}

const unique = new Map();
for (const place of seedPlaces) {
  const record = createRecord(place);
  unique.set(record.h3Id, record);
}
const records = [...unique.values()].slice(0, args.maxCells);
const confidenceValues = records.map((record) => record.provenance.confidence);
const summary = {
  schemaVersion,
  packageId,
  packageVersion,
  generatedAt,
  records
};
const manifest = {
  schemaVersion,
  packageId,
  packageVersion,
  generatedAt,
  mode: "fixture-package",
  aoi: {
    label: "Western Europe demo AOI",
    bounds: [-10.8, 36.4, 18.8, 60.2],
    centroid: { latitude: 45.2, longitude: 2.8 },
    privacy: "public-demo"
  },
  h3Resolution: 5,
  h3Tiers: ["U5"],
  timeWindow: { validFrom, validTo, cadence: "fixture" },
  sourceRun: {
    id: "fixture-run-20260511",
    generatedBy: "fixture-builder",
    liveNetworkUsed: false
  },
  providers: [
    {
      providerId: "open-meteo-fixture-package",
      providerLabel: "Open-Meteo fixture package",
      sourceType: "fixture",
      status: "fixture-package",
      requestedAt: generatedAt,
      modelRunAt: generatedAt,
      variables: fixtureVariables,
      license: "Fictional fixture generated from deterministic vmesh mock data",
      limitations:
        "Fixture provider run. Replace with reviewed package output before production use.",
      confidence: 78
    }
  ],
  layers: layerIds,
  artifacts: [
    {
      kind: "h3-summary-json",
      path: "western-europe-demo.h3-summary.json",
      contentHash: hash(records),
      recordCount: records.length,
      h3Resolution: 5,
      layerIds,
      generatedAt
    }
  ],
  summaryStats: {
    cellCount: records.length,
    minConfidence: Math.min(...confidenceValues),
    maxConfidence: Math.max(...confidenceValues),
    meanConfidence: Math.round(
      confidenceValues.reduce((sum, confidence) => sum + confidence, 0) / confidenceValues.length
    )
  },
  qualityGates: {
    maxCells: args.maxCells,
    fixtureOnly: true,
    noPrivateAddresses: true,
    noBrowserGridFetches: true,
    noPaidProviderCalls: true,
    h3ResolutionAligned: true,
    provenanceComplete: true,
    providerTermsReviewed: false,
    licenseAttributionComplete: true,
    freshnessWindowBounded: true,
    confidenceDocumented: true,
    limitationsDocumented: true,
    noAuthorityClaims: true
  },
  privacy: {
    containsUserRecords: false,
    containsExactPrivateAddresses: false,
    aoiPrecision: "coarse-region"
  },
  limitations: [
    "Fixture-only package generated from deterministic records.",
    "Not operational weather, climate, fire, flood, solar, wind, or emergency intelligence.",
    "Use reviewed package workers and provider terms before production ingestion."
  ]
};

const outDir = path.resolve(args.out);
const manifestPath = path.join(outDir, "western-europe-demo.manifest.json");
const summaryPath = path.join(outDir, "western-europe-demo.h3-summary.json");
await mkdir(outDir, { recursive: true });
await writeFile(manifestPath, await formatJson(manifest, manifestPath));
await writeFile(summaryPath, await formatJson(summary, summaryPath));
console.log(`Wrote ${records.length} U5 macro package records to ${outDir}`);

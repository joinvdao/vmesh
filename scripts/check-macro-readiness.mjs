import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { getResolution, isValidCell } from "h3-js";

const schemaVersion = "vmesh-macro-package-v1";
const tierResolutions = { U3: 3, U5: 5, U8: 8 };
const productionModes = ["live-selected-cell", "cached-package"];
const productionSourceTypes = ["live", "cached", "package", "derived"];
const nonProductionTextPattern =
  /\b(fictional|fixture|mock|prototype|future-provider|future provider|not operational|replace with reviewed)\b/i;

const coreLayerGroups = [
  ["Weather", ["climate-weather"]],
  ["Rainfall", ["climate-rainfall"]],
  ["Climate trend", ["climate-trend"]],
  ["Flood / lowland", ["hazard-flood-lowland"]],
  ["Fire weather", ["hazard-fire-weather"]],
  ["Solar potential", ["solar-potential"]]
];

const fullAtlasLayerGroups = [
  ...coreLayerGroups,
  [
    "Terrain and derived topography",
    [
      "terrain-elevation",
      "terrain-hillshade",
      "terrain-contours",
      "terrain-slope",
      "terrain-aspect"
    ]
  ],
  [
    "Vegetation and land cover",
    ["vegetation-ndvi", "vegetation-ndwi", "vegetation-landcover", "vegetation-crop-condition"]
  ],
  ["Satellite imagery", ["imagery-sentinel2", "imagery-sen2sr"]]
];

function parseArgs(argv) {
  const args = {
    profile: "fixture",
    dir: "fixtures/macro-packages",
    manifest: "western-europe-demo.manifest.json",
    summary: "western-europe-demo.h3-summary.json"
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--fixture") args.profile = "fixture";
    if (arg === "--production") args.profile = "production-core";
    if (arg === "--full-atlas") args.profile = "production-full-atlas";
    if (arg === "--profile") args.profile = argv[index + 1] ?? args.profile;
    if (arg === "--dir") args.dir = argv[index + 1] ?? args.dir;
    if (arg === "--manifest") args.manifest = argv[index + 1] ?? args.manifest;
    if (arg === "--summary") args.summary = argv[index + 1] ?? args.summary;
  }
  return args;
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

function isIsoDate(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function confidenceValid(value) {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

function finite(
  value,
  pathName,
  errors,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY
) {
  assert(
    Number.isFinite(value) && value >= min && value <= max,
    `${pathName} must be a finite number from ${min} to ${max}`,
    errors
  );
}

function textLooksProductionReady(value) {
  return typeof value === "string" && !nonProductionTextPattern.test(value);
}

function layerGroupsForProfile(profile) {
  return profile === "production-full-atlas" ? fullAtlasLayerGroups : coreLayerGroups;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function validateBase(manifest, summary) {
  const errors = [];
  const warnings = [];

  assert(manifest.schemaVersion === schemaVersion, "manifest.schemaVersion is unsupported", errors);
  assert(summary.schemaVersion === schemaVersion, "summary.schemaVersion is unsupported", errors);
  assert(manifest.packageId === summary.packageId, "summary.packageId mismatch", errors);
  assert(
    manifest.packageVersion === summary.packageVersion,
    "summary.packageVersion mismatch",
    errors
  );
  assert(isIsoDate(manifest.generatedAt), "manifest.generatedAt must be ISO date", errors);
  assert(
    Array.isArray(manifest.layers) && manifest.layers.length > 0,
    "manifest.layers required",
    errors
  );
  assert(
    Array.isArray(manifest.providers) && manifest.providers.length > 0,
    "manifest.providers required",
    errors
  );
  assert(
    Array.isArray(summary.records) && summary.records.length > 0,
    "summary.records required",
    errors
  );
  assert(
    summary.records.length === manifest.summaryStats.cellCount,
    "record count mismatch",
    errors
  );
  assert(
    summary.records.length <= manifest.qualityGates.maxCells,
    "record count exceeds maxCells",
    errors
  );
  assert(
    manifest.qualityGates.noBrowserGridFetches,
    "browser grid fetches must be blocked",
    errors
  );
  assert(manifest.qualityGates.noPaidProviderCalls, "paid provider calls must be blocked", errors);
  assert(manifest.qualityGates.provenanceComplete, "provenance gate must be complete", errors);
  assert(
    manifest.qualityGates.licenseAttributionComplete,
    "license/attribution gate must be complete",
    errors
  );
  assert(
    manifest.qualityGates.freshnessWindowBounded,
    "freshness window gate must be complete",
    errors
  );
  assert(manifest.qualityGates.confidenceDocumented, "confidence gate must be complete", errors);
  assert(manifest.qualityGates.limitationsDocumented, "limitations gate must be complete", errors);
  assert(
    manifest.qualityGates.noAuthorityClaims,
    "authoritative hazard/survey claims must be blocked",
    errors
  );
  assert(
    !manifest.privacy.containsExactPrivateAddresses,
    "exact private addresses are not allowed",
    errors
  );
  if (manifest.privacy.containsUserRecords) warnings.push("manifest contains user records");
  assert(
    Array.isArray(manifest.limitations) && manifest.limitations.length > 0,
    "limitations required",
    errors
  );

  for (const [index, provider] of manifest.providers.entries()) {
    assert(Boolean(provider.providerId), `providers[${index}].providerId required`, errors);
    assert(Boolean(provider.license), `providers[${index}].license required`, errors);
    assert(Boolean(provider.limitations), `providers[${index}].limitations required`, errors);
    assert(confidenceValid(provider.confidence), `providers[${index}].confidence invalid`, errors);
  }

  const artifactLayerIds = new Set(
    manifest.artifacts.flatMap((artifact) => artifact.layerIds.map((layerId) => layerId))
  );
  for (const layerId of manifest.layers) {
    assert(
      artifactLayerIds.has(layerId),
      `manifest.layers includes ${layerId}, but no artifact declares it`,
      errors
    );
  }

  for (const [index, record] of summary.records.entries()) {
    const prefix = `records[${index}]`;
    assert(isValidCell(record.h3Id), `${prefix}.h3Id invalid`, errors);
    if (isValidCell(record.h3Id)) {
      assert(
        getResolution(record.h3Id) === record.resolution,
        `${prefix}.resolution mismatch`,
        errors
      );
    }
    assert(
      record.resolution === manifest.h3Resolution,
      `${prefix}.manifest resolution mismatch`,
      errors
    );
    assert(record.resolution === tierResolutions[record.tier], `${prefix}.tier mismatch`, errors);
    assert(manifest.h3Tiers.includes(record.tier), `${prefix}.tier missing from manifest`, errors);
    assert(
      Boolean(record.provenance?.providerId),
      `${prefix}.provenance.providerId required`,
      errors
    );
    assert(Boolean(record.provenance?.license), `${prefix}.provenance.license required`, errors);
    assert(
      Boolean(record.provenance?.limitations),
      `${prefix}.provenance.limitations required`,
      errors
    );
    assert(confidenceValid(record.provenance?.confidence), `${prefix}.confidence invalid`, errors);
    assert(Boolean(record.license), `${prefix}.license required`, errors);
    assert(Boolean(record.limitations), `${prefix}.limitations required`, errors);
    assert(
      isIsoDate(record.validFrom) && isIsoDate(record.validTo),
      `${prefix}.valid window invalid`,
      errors
    );
    finite(record.weather.temperatureC, `${prefix}.weather.temperatureC`, errors);
    finite(record.weather.apparentTemperatureC, `${prefix}.weather.apparentTemperatureC`, errors);
    finite(record.weather.precipitationMm, `${prefix}.weather.precipitationMm`, errors);
    finite(record.weather.rainfallMm, `${prefix}.weather.rainfallMm`, errors);
    finite(record.weather.windSpeedKph, `${prefix}.weather.windSpeedKph`, errors);
    finite(record.weather.windGustKph, `${prefix}.weather.windGustKph`, errors);
    finite(
      record.weather.relativeHumidityPercent,
      `${prefix}.weather.relativeHumidityPercent`,
      errors,
      0,
      100
    );
    finite(record.weather.cloudCoverPercent, `${prefix}.weather.cloudCoverPercent`, errors, 0, 100);
    finite(record.forecast.next72hRainMm, `${prefix}.forecast.next72hRainMm`, errors);
    finite(
      record.climateTrend.temperatureAnomalyC,
      `${prefix}.climateTrend.temperatureAnomalyC`,
      errors
    );
    finite(
      record.climateTrend.rainfallAnomalyPercent,
      `${prefix}.climateTrend.rainfallAnomalyPercent`,
      errors
    );
    finite(record.solar.irradianceKwhM2Day, `${prefix}.solar.irradianceKwhM2Day`, errors);
  }

  return { errors, warnings };
}

function validateFixtureProfile(manifest) {
  const errors = [];

  assert(
    manifest.mode === "fixture-package",
    "fixture profile requires fixture-package mode",
    errors
  );
  assert(manifest.qualityGates.fixtureOnly, "fixture profile requires fixtureOnly", errors);
  assert(
    !manifest.sourceRun.liveNetworkUsed,
    "fixture profile must not use live network calls",
    errors
  );
  assert(
    manifest.sourceRun.generatedBy === "fixture-builder",
    "fixture profile requires fixture-builder output",
    errors
  );

  return errors;
}

function validateProductionProfile(manifest, summary, layerGroups) {
  const errors = [];

  assert(
    productionModes.includes(manifest.mode),
    "production profile requires production package mode",
    errors
  );
  assert(!manifest.qualityGates.fixtureOnly, "production profile cannot be fixture-only", errors);
  assert(manifest.qualityGates.providerTermsReviewed, "provider terms review is required", errors);
  assert(
    manifest.timeWindow.cadence !== "fixture",
    "production profile cannot use fixture cadence",
    errors
  );
  assert(
    manifest.sourceRun.generatedBy !== "fixture-builder",
    "production profile cannot use fixture-builder",
    errors
  );
  if (manifest.mode === "live-selected-cell") {
    assert(
      summary.records.length === 1,
      "live-selected-cell production must contain one H3 record",
      errors
    );
  }
  assert(
    !manifest.limitations.some((limitation) => !textLooksProductionReady(limitation)),
    "manifest.limitations are not production-ready",
    errors
  );

  for (const [index, provider] of manifest.providers.entries()) {
    assert(
      productionSourceTypes.includes(provider.sourceType),
      `providers[${index}].sourceType not promotable`,
      errors
    );
    assert(
      productionModes.includes(provider.status),
      `providers[${index}].status not promotable`,
      errors
    );
    assert(
      textLooksProductionReady(provider.license),
      `providers[${index}].license is not production-ready`,
      errors
    );
    assert(
      textLooksProductionReady(provider.limitations),
      `providers[${index}].limitations are not production-ready`,
      errors
    );
  }

  for (const [index, record] of summary.records.entries()) {
    const prefix = `records[${index}]`;
    assert(
      productionModes.includes(record.packageMode),
      `${prefix}.packageMode not promotable`,
      errors
    );
    assert(
      productionSourceTypes.includes(record.provenance.sourceType),
      `${prefix}.provenance.sourceType not promotable`,
      errors
    );
    assert(
      !record.qualityFlags.some((flag) => /fixture|mock/i.test(flag)),
      `${prefix}.qualityFlags not promotable`,
      errors
    );
    assert(
      textLooksProductionReady(record.license),
      `${prefix}.license is not production-ready`,
      errors
    );
    assert(
      textLooksProductionReady(record.limitations),
      `${prefix}.limitations are not production-ready`,
      errors
    );
    assert(
      textLooksProductionReady(record.provenance.license),
      `${prefix}.provenance.license is not production-ready`,
      errors
    );
    assert(
      textLooksProductionReady(record.provenance.limitations),
      `${prefix}.provenance.limitations are not production-ready`,
      errors
    );
  }

  for (const [label, layerIds] of layerGroups) {
    const missing = layerIds.filter((layerId) => !manifest.layers.includes(layerId));
    if (missing.length > 0) {
      errors.push(`missing production macro layer group ${label}: ${missing.join(", ")}`);
    }
  }

  return errors;
}

const args = parseArgs(process.argv.slice(2));
const dir = path.resolve(args.dir);
const manifest = await readJson(path.join(dir, args.manifest));
const summary = await readJson(path.join(dir, args.summary));
const base = validateBase(manifest, summary);
const layerGroups = layerGroupsForProfile(args.profile);
const profileErrors =
  args.profile === "fixture"
    ? validateFixtureProfile(manifest)
    : validateProductionProfile(manifest, summary, layerGroups);
const errors = [...base.errors, ...profileErrors];
const warnings = [...base.warnings];

if (!manifest.qualityGates.providerTermsReviewed) {
  warnings.push("provider terms are not marked reviewed; production promotion will be blocked");
}
if (args.profile === "fixture") {
  const missingFullAtlas = fullAtlasLayerGroups
    .map(([label, layerIds]) => [
      label,
      layerIds.filter((layerId) => !manifest.layers.includes(layerId))
    ])
    .filter(([, missing]) => missing.length > 0)
    .map(([label]) => label);
  if (missingFullAtlas.length > 0) {
    warnings.push(`fixture does not cover full atlas groups: ${missingFullAtlas.join(", ")}`);
  }
}

if (errors.length > 0) {
  console.error(`Macro readiness failed (${args.profile}).`);
  for (const error of errors) console.error(`FAIL: ${error}`);
  for (const warning of warnings) console.warn(`WARN: ${warning}`);
  process.exit(1);
}

const status = args.profile === "fixture" ? "fixture-safe" : "production-ready";
console.log(
  `Macro readiness passed (${args.profile}): ${status}, ${summary.records.length} records`
);
for (const warning of warnings) console.warn(`WARN: ${warning}`);

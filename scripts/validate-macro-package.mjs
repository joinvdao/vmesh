import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { getResolution, isValidCell } from "h3-js";

const schemaVersion = "vmesh-macro-package-v1";
const tierResolutions = { U3: 3, U5: 5, U8: 8 };

function parseArgs(argv) {
  const args = {
    fixture: false,
    dir: "fixtures/macro-packages",
    manifest: "western-europe-demo.manifest.json",
    summary: "western-europe-demo.h3-summary.json"
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--fixture") args.fixture = true;
    if (arg === "--dir") args.dir = argv[index + 1] ?? args.dir;
    if (arg === "--manifest") args.manifest = argv[index + 1] ?? args.manifest;
    if (arg === "--summary") args.summary = argv[index + 1] ?? args.summary;
  }
  return args;
}

function isIsoDate(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function confidenceValid(value) {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

const args = parseArgs(process.argv.slice(2));
if (!args.fixture) {
  throw new Error("Default macro package validation must use --fixture.");
}

const dir = path.resolve(args.dir);
const manifestPath = path.join(dir, args.manifest);
const summaryPath = path.join(dir, args.summary);
const manifest = await readJson(manifestPath);
const summary = await readJson(summaryPath);
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
assert(summary.records.length === manifest.summaryStats.cellCount, "record count mismatch", errors);
assert(
  summary.records.length <= manifest.qualityGates.maxCells,
  "record count exceeds maxCells",
  errors
);
assert(manifest.qualityGates.noBrowserGridFetches, "browser grid fetches must be blocked", errors);
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

for (const [index, artifact] of manifest.artifacts.entries()) {
  assert(Boolean(artifact.path), `artifacts[${index}].path required`, errors);
  assert(
    artifact.recordCount === summary.records.length,
    `artifacts[${index}].recordCount mismatch`,
    errors
  );
  await access(path.join(dir, artifact.path)).catch(() => {
    errors.push(`artifacts[${index}].path does not exist: ${artifact.path}`);
  });
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
}

if (errors.length > 0) {
  console.error("Macro package validation failed.");
  for (const error of errors) console.error(`FAIL: ${error}`);
  for (const warning of warnings) console.warn(`WARN: ${warning}`);
  process.exit(1);
}

console.log(`Macro package validation passed: ${summary.records.length} records`);
for (const warning of warnings) console.warn(`WARN: ${warning}`);

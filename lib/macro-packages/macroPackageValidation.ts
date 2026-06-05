import { getResolution, isValidCell } from "h3-js";

import {
  MACRO_PACKAGE_SCHEMA_VERSION,
  type MacroPackageH3SummaryArtifact,
  type MacroPackageManifest,
  type PackagedMacroCellSummary
} from "@/lib/macro-packages/macroPackages";
import { meshTierToResolution } from "@/lib/h3Mesh";

export interface MacroPackageValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function isIsoDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function confidenceValid(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

function validateSummaryRecord(
  record: PackagedMacroCellSummary,
  manifest: MacroPackageManifest,
  index: number
): string[] {
  const prefix = `records[${index}]`;
  const errors: string[] = [];

  if (!isValidCell(record.h3Id)) errors.push(`${prefix}.h3Id is not a valid H3 cell`);
  if (record.resolution !== manifest.h3Resolution) {
    errors.push(`${prefix}.resolution does not match manifest h3Resolution`);
  }
  if (isValidCell(record.h3Id) && getResolution(record.h3Id) !== record.resolution) {
    errors.push(`${prefix}.h3Id resolution does not match record resolution`);
  }
  if (record.resolution !== meshTierToResolution(record.tier)) {
    errors.push(`${prefix}.tier does not match record resolution`);
  }
  if (!manifest.h3Tiers.includes(record.tier)) errors.push(`${prefix}.tier is not in manifest`);
  if (!confidenceValid(record.provenance.confidence)) {
    errors.push(`${prefix}.provenance.confidence must be 0-100`);
  }
  if (!record.provenance.providerId) errors.push(`${prefix}.provenance.providerId is required`);
  if (!record.provenance.license) errors.push(`${prefix}.provenance.license is required`);
  if (!record.provenance.limitations) errors.push(`${prefix}.provenance.limitations is required`);
  if (!record.license) errors.push(`${prefix}.license is required`);
  if (!record.limitations) errors.push(`${prefix}.limitations is required`);
  if (!isIsoDate(record.validFrom) || !isIsoDate(record.validTo)) {
    errors.push(`${prefix}.validFrom/validTo must be ISO dates`);
  }
  if (record.packageId !== manifest.packageId) errors.push(`${prefix}.packageId mismatch`);
  if (record.packageVersion !== manifest.packageVersion) {
    errors.push(`${prefix}.packageVersion mismatch`);
  }

  return errors;
}

export function validateMacroPackage(
  manifest: MacroPackageManifest,
  summary: MacroPackageH3SummaryArtifact
): MacroPackageValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (manifest.schemaVersion !== MACRO_PACKAGE_SCHEMA_VERSION) {
    errors.push("manifest.schemaVersion is unsupported");
  }
  if (summary.schemaVersion !== MACRO_PACKAGE_SCHEMA_VERSION) {
    errors.push("summary.schemaVersion is unsupported");
  }
  if (manifest.packageId !== summary.packageId) errors.push("summary.packageId mismatch");
  if (manifest.packageVersion !== summary.packageVersion) {
    errors.push("summary.packageVersion mismatch");
  }
  if (!manifest.packageId) errors.push("manifest.packageId is required");
  if (!isIsoDate(manifest.generatedAt)) errors.push("manifest.generatedAt must be an ISO date");
  if (manifest.h3Tiers.length === 0) errors.push("manifest.h3Tiers must not be empty");
  if (manifest.layers.length === 0) errors.push("manifest.layers must not be empty");
  if (manifest.providers.length === 0) errors.push("manifest.providers must not be empty");
  if (summary.records.length === 0) errors.push("summary.records must not be empty");
  if (summary.records.length > manifest.qualityGates.maxCells) {
    errors.push("summary.records exceeds manifest maxCells gate");
  }
  if (summary.records.length !== manifest.summaryStats.cellCount) {
    errors.push("summary record count does not match manifest summaryStats.cellCount");
  }
  if (manifest.privacy.containsExactPrivateAddresses) {
    errors.push("manifest privacy gate reports exact private addresses");
  }
  if (manifest.privacy.containsUserRecords) {
    warnings.push("manifest contains user records; this should remain private-local");
  }
  if (!manifest.qualityGates.noBrowserGridFetches) {
    errors.push("manifest must block browser grid fetches");
  }
  if (!manifest.qualityGates.noPaidProviderCalls) {
    errors.push("manifest must block paid provider calls in fixture/default mode");
  }
  if (!manifest.qualityGates.provenanceComplete) {
    errors.push("manifest provenance gate is incomplete");
  }
  if (!manifest.qualityGates.licenseAttributionComplete) {
    errors.push("manifest license/attribution gate is incomplete");
  }
  if (!manifest.qualityGates.freshnessWindowBounded) {
    errors.push("manifest freshness window gate is incomplete");
  }
  if (!manifest.qualityGates.confidenceDocumented) {
    errors.push("manifest confidence gate is incomplete");
  }
  if (!manifest.qualityGates.limitationsDocumented) {
    errors.push("manifest limitations gate is incomplete");
  }
  if (!manifest.qualityGates.noAuthorityClaims) {
    errors.push("manifest must block authoritative hazard/survey claims");
  }
  if (manifest.limitations.length === 0) errors.push("manifest.limitations must not be empty");
  if (manifest.artifacts.length === 0) errors.push("manifest.artifacts must not be empty");

  manifest.providers.forEach((provider, index) => {
    if (!provider.providerId) errors.push(`providers[${index}].providerId is required`);
    if (!provider.license) errors.push(`providers[${index}].license is required`);
    if (!provider.limitations) errors.push(`providers[${index}].limitations is required`);
    if (!confidenceValid(provider.confidence)) {
      errors.push(`providers[${index}].confidence must be 0-100`);
    }
  });

  summary.records.forEach((record, index) => {
    errors.push(...validateSummaryRecord(record, manifest, index));
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

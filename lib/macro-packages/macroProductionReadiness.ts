import {
  type MacroPackageH3SummaryArtifact,
  type MacroPackageManifest,
  type MacroPackageMode,
  type PackagedMacroCellSummary
} from "@/lib/macro-packages/macroPackages";
import { validateMacroPackage } from "@/lib/macro-packages/macroPackageValidation";
import type { MacroDataSourceKind, MacroLayerId } from "@/lib/vmeshTypes";

export type MacroProductionReadinessProfile =
  | "fixture"
  | "production-core"
  | "production-full-atlas";

export type MacroProductionReadinessStatus = "fixture-safe" | "production-ready" | "blocked";

export interface MacroLayerGroupRequirement {
  id: string;
  label: string;
  requiredLayerIds: MacroLayerId[];
}

export interface MacroLayerGroupReadiness extends MacroLayerGroupRequirement {
  missingLayerIds: MacroLayerId[];
  covered: boolean;
}

export interface MacroProductionReadinessReport {
  profile: MacroProductionReadinessProfile;
  status: MacroProductionReadinessStatus;
  valid: boolean;
  errors: string[];
  warnings: string[];
  checkedLayerGroups: MacroLayerGroupReadiness[];
}

export const CORE_MACRO_LAYER_GROUPS: MacroLayerGroupRequirement[] = [
  {
    id: "weather",
    label: "Weather",
    requiredLayerIds: ["climate-weather"]
  },
  {
    id: "rainfall",
    label: "Rainfall",
    requiredLayerIds: ["climate-rainfall"]
  },
  {
    id: "climate-trend",
    label: "Climate trend",
    requiredLayerIds: ["climate-trend"]
  },
  {
    id: "flood",
    label: "Flood / lowland",
    requiredLayerIds: ["hazard-flood-lowland"]
  },
  {
    id: "fire",
    label: "Fire weather",
    requiredLayerIds: ["hazard-fire-weather"]
  },
  {
    id: "solar",
    label: "Solar potential",
    requiredLayerIds: ["solar-potential"]
  }
];

export const FULL_ATLAS_MACRO_LAYER_GROUPS: MacroLayerGroupRequirement[] = [
  ...CORE_MACRO_LAYER_GROUPS,
  {
    id: "terrain",
    label: "Terrain and derived topography",
    requiredLayerIds: [
      "terrain-elevation",
      "terrain-hillshade",
      "terrain-contours",
      "terrain-slope",
      "terrain-aspect"
    ]
  },
  {
    id: "vegetation",
    label: "Vegetation and land cover",
    requiredLayerIds: [
      "vegetation-ndvi",
      "vegetation-ndwi",
      "vegetation-landcover",
      "vegetation-crop-condition"
    ]
  },
  {
    id: "imagery",
    label: "Satellite imagery",
    requiredLayerIds: ["imagery-sentinel2", "imagery-sen2sr"]
  }
];

const productionSourceTypes: MacroDataSourceKind[] = ["live", "cached", "package", "derived"];
const productionModes: MacroPackageMode[] = ["live-selected-cell", "cached-package"];
const nonProductionTextPattern =
  /\b(fictional|fixture|mock|prototype|future-provider|future provider|not operational|replace with reviewed)\b/i;

function layerGroupsForProfile(
  profile: MacroProductionReadinessProfile
): MacroLayerGroupRequirement[] {
  return profile === "production-full-atlas"
    ? FULL_ATLAS_MACRO_LAYER_GROUPS
    : CORE_MACRO_LAYER_GROUPS;
}

function checkLayerGroups(
  manifest: MacroPackageManifest,
  profile: MacroProductionReadinessProfile
): MacroLayerGroupReadiness[] {
  return layerGroupsForProfile(profile).map((group) => {
    const missingLayerIds = group.requiredLayerIds.filter(
      (layerId) => !manifest.layers.includes(layerId)
    );
    return {
      ...group,
      missingLayerIds,
      covered: missingLayerIds.length === 0
    };
  });
}

function addFiniteNumberError(
  errors: string[],
  value: number,
  path: string,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY
): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    errors.push(`${path} must be a finite number from ${min} to ${max}`);
  }
}

function validateRecordNumerics(record: PackagedMacroCellSummary, index: number): string[] {
  const errors: string[] = [];
  const prefix = `records[${index}]`;

  addFiniteNumberError(errors, record.weather.temperatureC, `${prefix}.weather.temperatureC`);
  addFiniteNumberError(
    errors,
    record.weather.apparentTemperatureC,
    `${prefix}.weather.apparentTemperatureC`
  );
  addFiniteNumberError(errors, record.weather.precipitationMm, `${prefix}.weather.precipitationMm`);
  addFiniteNumberError(errors, record.weather.rainfallMm, `${prefix}.weather.rainfallMm`);
  addFiniteNumberError(errors, record.weather.windSpeedKph, `${prefix}.weather.windSpeedKph`);
  addFiniteNumberError(errors, record.weather.windGustKph, `${prefix}.weather.windGustKph`);
  addFiniteNumberError(
    errors,
    record.weather.relativeHumidityPercent,
    `${prefix}.weather.relativeHumidityPercent`,
    0,
    100
  );
  addFiniteNumberError(
    errors,
    record.weather.cloudCoverPercent,
    `${prefix}.weather.cloudCoverPercent`,
    0,
    100
  );
  addFiniteNumberError(errors, record.forecast.next72hRainMm, `${prefix}.forecast.next72hRainMm`);
  addFiniteNumberError(
    errors,
    record.forecast.stressScore,
    `${prefix}.forecast.stressScore`,
    0,
    100
  );
  addFiniteNumberError(
    errors,
    record.climateTrend.temperatureAnomalyC,
    `${prefix}.climateTrend.temperatureAnomalyC`
  );
  addFiniteNumberError(
    errors,
    record.climateTrend.rainfallAnomalyPercent,
    `${prefix}.climateTrend.rainfallAnomalyPercent`
  );
  addFiniteNumberError(errors, record.flood.exposureScore, `${prefix}.flood.exposureScore`, 0, 100);
  addFiniteNumberError(errors, record.fire.exposureScore, `${prefix}.fire.exposureScore`, 0, 100);
  addFiniteNumberError(
    errors,
    record.solar.practicalityScore,
    `${prefix}.solar.practicalityScore`,
    0,
    100
  );
  addFiniteNumberError(
    errors,
    record.solar.irradianceKwhM2Day,
    `${prefix}.solar.irradianceKwhM2Day`
  );

  return errors;
}

function artifactCoversManifestLayers(manifest: MacroPackageManifest): string[] {
  const artifactLayerIds = new Set(
    manifest.artifacts.flatMap((artifact) => artifact.layerIds.map((layerId) => layerId))
  );

  return manifest.layers
    .filter((layerId) => !artifactLayerIds.has(layerId))
    .map((layerId) => `manifest.layers includes ${layerId}, but no artifact declares it`);
}

function textLooksProductionReady(value: string): boolean {
  return !nonProductionTextPattern.test(value);
}

function applyFixtureProfileGates(manifest: MacroPackageManifest): string[] {
  const errors: string[] = [];

  if (manifest.mode !== "fixture-package") {
    errors.push("fixture profile requires manifest.mode to be fixture-package");
  }
  if (!manifest.qualityGates.fixtureOnly) {
    errors.push("fixture profile requires qualityGates.fixtureOnly");
  }
  if (manifest.sourceRun.liveNetworkUsed) {
    errors.push("fixture profile must not use live network calls");
  }
  if (manifest.sourceRun.generatedBy !== "fixture-builder") {
    errors.push("fixture profile must be generated by fixture-builder");
  }

  return errors;
}

function applyProductionProfileGates(
  manifest: MacroPackageManifest,
  summary: MacroPackageH3SummaryArtifact,
  layerGroups: MacroLayerGroupReadiness[]
): string[] {
  const errors: string[] = [];

  if (!productionModes.includes(manifest.mode)) {
    errors.push("production profile requires cached-package or live-selected-cell mode");
  }
  if (manifest.qualityGates.fixtureOnly) {
    errors.push("production profile cannot use a fixture-only package");
  }
  if (!manifest.qualityGates.providerTermsReviewed) {
    errors.push("production profile requires provider terms review");
  }
  if (manifest.timeWindow.cadence === "fixture") {
    errors.push("production profile cannot use fixture cadence");
  }
  if (manifest.sourceRun.generatedBy === "fixture-builder") {
    errors.push("production profile cannot be generated by fixture-builder");
  }
  if (manifest.mode === "live-selected-cell" && summary.records.length > 1) {
    errors.push("live-selected-cell production profile may contain only one selected H3 record");
  }
  if (manifest.limitations.some((limitation) => !textLooksProductionReady(limitation))) {
    errors.push("manifest.limitations still read as fixture/mock/future review");
  }

  manifest.providers.forEach((provider, index) => {
    if (!productionSourceTypes.includes(provider.sourceType)) {
      errors.push(`providers[${index}].sourceType is not production-promotable`);
    }
    if (!productionModes.includes(provider.status)) {
      errors.push(`providers[${index}].status is not production-promotable`);
    }
    if (!textLooksProductionReady(provider.license)) {
      errors.push(`providers[${index}].license still reads as fixture/mock/future review`);
    }
    if (!textLooksProductionReady(provider.limitations)) {
      errors.push(`providers[${index}].limitations still reads as fixture/mock/future review`);
    }
  });

  summary.records.forEach((record, index) => {
    const prefix = `records[${index}]`;
    if (!productionModes.includes(record.packageMode)) {
      errors.push(`${prefix}.packageMode is not production-promotable`);
    }
    if (!productionSourceTypes.includes(record.provenance.sourceType)) {
      errors.push(`${prefix}.provenance.sourceType is not production-promotable`);
    }
    if (record.qualityFlags.some((flag) => /fixture|mock/i.test(flag))) {
      errors.push(`${prefix}.qualityFlags contains fixture/mock flags`);
    }
    if (!textLooksProductionReady(record.license)) {
      errors.push(`${prefix}.license still reads as fixture/mock/future review`);
    }
    if (!textLooksProductionReady(record.limitations)) {
      errors.push(`${prefix}.limitations still reads as fixture/mock/future review`);
    }
    if (!textLooksProductionReady(record.provenance.license)) {
      errors.push(`${prefix}.provenance.license still reads as fixture/mock/future review`);
    }
    if (!textLooksProductionReady(record.provenance.limitations)) {
      errors.push(`${prefix}.provenance.limitations still reads as fixture/mock/future review`);
    }
  });

  layerGroups
    .filter((group) => !group.covered)
    .forEach((group) => {
      errors.push(
        `missing production macro layer group ${group.label}: ${group.missingLayerIds.join(", ")}`
      );
    });

  return errors;
}

function createWarnings(
  manifest: MacroPackageManifest,
  layerGroups: MacroLayerGroupReadiness[],
  profile: MacroProductionReadinessProfile
): string[] {
  const warnings: string[] = [];

  if (!manifest.qualityGates.providerTermsReviewed) {
    warnings.push("provider terms are not marked reviewed; production promotion will be blocked");
  }
  if (profile === "fixture") {
    const fullAtlasGroups = checkLayerGroups(manifest, "production-full-atlas").filter(
      (group) => !group.covered
    );
    if (fullAtlasGroups.length > 0) {
      warnings.push(
        `fixture does not cover full atlas groups: ${fullAtlasGroups
          .map((group) => group.label)
          .join(", ")}`
      );
    }
  }
  layerGroups
    .filter((group) => !group.covered)
    .forEach((group) => {
      warnings.push(`missing layer group ${group.label}: ${group.missingLayerIds.join(", ")}`);
    });

  return warnings;
}

export function assessMacroPackageProductionReadiness(
  manifest: MacroPackageManifest,
  summary: MacroPackageH3SummaryArtifact,
  profile: MacroProductionReadinessProfile = "fixture"
): MacroProductionReadinessReport {
  const baseValidation = validateMacroPackage(manifest, summary);
  const checkedLayerGroups = checkLayerGroups(manifest, profile);
  const errors = [
    ...baseValidation.errors,
    ...artifactCoversManifestLayers(manifest),
    ...summary.records.flatMap(validateRecordNumerics)
  ];

  if (profile === "fixture") {
    errors.push(...applyFixtureProfileGates(manifest));
  } else {
    errors.push(...applyProductionProfileGates(manifest, summary, checkedLayerGroups));
  }

  const warnings = [
    ...baseValidation.warnings,
    ...createWarnings(manifest, checkedLayerGroups, profile)
  ];
  const valid = errors.length === 0;

  return {
    profile,
    status:
      valid && profile === "fixture" ? "fixture-safe" : valid ? "production-ready" : "blocked",
    valid,
    errors,
    warnings,
    checkedLayerGroups
  };
}

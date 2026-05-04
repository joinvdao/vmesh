import type {
  HazardRiskSummary,
  MacroClimateSummary,
  MacroPillars,
  SolarPotentialSummary
} from "@/lib/vmeshTypes";

export function scoreWeatherStress(summary: MacroClimateSummary): number {
  return Math.round(
    (summary.heatStress * 0.3 +
      summary.coldStress * 0.15 +
      summary.windExposure * 0.2 +
      summary.rainfallOutlook * 0.2 +
      summary.droughtIndicator * 0.15) *
      (summary.provenance.confidence / 100)
  );
}

export function scoreFloodExposure(risk: HazardRiskSummary): number {
  return Math.round(risk.floodExposureScore * (risk.confidence / 100));
}

export function scoreFireExposure(risk: HazardRiskSummary): number {
  const classWeight = {
    low: 0.65,
    moderate: 0.82,
    high: 1,
    severe: 1.15
  }[risk.fireRiskClass];
  return Math.min(100, Math.round(risk.fireRiskScore * classWeight * (risk.confidence / 100)));
}

export function scoreSolarPracticality(summary: SolarPotentialSummary): number {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        summary.score * 0.55 +
          summary.slopeReadiness * 0.18 +
          summary.aspectReadiness * 0.17 -
          summary.cloudinessPenalty * 0.1
      )
    )
  );
}

export function deriveMacroLayerScores(
  macro: MacroPillars,
  climate: MacroClimateSummary,
  hazards: HazardRiskSummary,
  solar: SolarPotentialSummary
) {
  return {
    weatherStress: scoreWeatherStress(climate),
    floodExposure: scoreFloodExposure(hazards),
    fireExposure: scoreFireExposure(hazards),
    solarPracticality: scoreSolarPracticality(solar),
    resilienceSignal: Math.round(
      macro.climate * 0.22 +
        macro.water * 0.2 +
        macro.energy * 0.18 +
        macro.infrastructure * 0.16 +
        macro.biodiversity * 0.12 +
        (100 - macro.risk) * 0.12
    )
  };
}

import type {
  HazardRiskSummary,
  MacroCellSummary,
  MacroClimateSummary,
  MacroLayerId,
  MacroPillars,
  SolarPotentialSummary
} from "@/lib/vmeshTypes";
import { interpolateRgb, type RgbColor } from "@/lib/meshScoring";

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

export function scoreMacroCellLayer(summary: MacroCellSummary, layerId: MacroLayerId): number {
  if (layerId === "weather" || layerId === "climate-weather" || layerId === "climate-heat") {
    return summary.forecast.stressScore;
  }
  if (layerId === "climate-rainfall") return Math.min(100, summary.forecast.next72hRainMm * 4);
  if (layerId === "flood" || layerId === "hazard-flood-lowland") {
    return summary.flood.exposureScore;
  }
  if (layerId === "fire" || layerId === "hazard-fire-weather") {
    return summary.fire.exposureScore;
  }
  if (layerId === "hazard-drought") {
    return Math.max(0, Math.min(100, 100 - summary.weather.relativeHumidityPercent));
  }
  if (layerId === "solar" || layerId === "solar-potential") {
    return summary.solar.practicalityScore;
  }
  if (
    layerId === "vegetation-ndvi" ||
    layerId === "vegetation-landcover" ||
    layerId === "vegetation-crop-condition"
  ) {
    return Math.max(
      0,
      Math.min(100, 58 + summary.solar.cloudPenalty - summary.fire.exposureScore / 5)
    );
  }
  if (layerId === "vegetation-ndwi") {
    return Math.max(0, Math.min(100, 55 + summary.flood.exposureScore / 3));
  }
  if (layerId.startsWith("terrain-"))
    return Math.max(0, Math.min(100, 45 + summary.resolution * 4));
  if (layerId.startsWith("imagery-")) return summary.provenance.confidence;
  return Math.max(0, Math.min(100, Math.round(50 + summary.climateTrend.temperatureAnomalyC * 18)));
}

export function getMacroLayerColor(layerId: MacroLayerId, score: number): RgbColor {
  const normalized = Math.min(1, Math.max(0, score / 100));
  if (layerId === "flood" || layerId === "hazard-flood-lowland" || layerId === "vegetation-ndwi") {
    return interpolateRgb([80, 150, 188], [61, 72, 156], normalized);
  }
  if (layerId === "fire" || layerId === "hazard-fire-weather") {
    return interpolateRgb([232, 194, 111], [202, 74, 63], normalized);
  }
  if (layerId === "solar" || layerId === "solar-potential") {
    return interpolateRgb([223, 188, 83], [165, 230, 203], normalized);
  }
  if (layerId === "climate-trend" || layerId === "climate-heat" || layerId === "climate-rainfall") {
    return interpolateRgb([65, 126, 171], [236, 155, 83], normalized);
  }
  if (layerId.startsWith("terrain-")) {
    return interpolateRgb([99, 129, 118], [232, 216, 174], normalized);
  }
  if (layerId.startsWith("vegetation-")) {
    return interpolateRgb([174, 205, 171], [28, 115, 107], normalized);
  }
  if (layerId.startsWith("imagery-")) {
    return interpolateRgb([88, 139, 164], [165, 230, 203], normalized);
  }
  return interpolateRgb([47, 151, 147], [232, 194, 111], normalized);
}

import type { DataProvenance, MeshTier } from "@/lib/types/core";

export type MacroLayerId =
  | "weather"
  | "flood"
  | "fire"
  | "solar"
  | "climate-trend"
  | "terrain-elevation"
  | "terrain-hillshade"
  | "terrain-contours"
  | "terrain-slope"
  | "terrain-aspect"
  | "climate-weather"
  | "climate-heat"
  | "climate-rainfall"
  | "hazard-fire-weather"
  | "hazard-flood-lowland"
  | "hazard-drought"
  | "solar-potential"
  | "vegetation-ndvi"
  | "vegetation-ndwi"
  | "vegetation-landcover"
  | "vegetation-crop-condition"
  | "imagery-sentinel2"
  | "imagery-sen2sr";

export type MacroDataSourceKind =
  | "live"
  | "cached"
  | "package"
  | "fixture"
  | "mock"
  | "derived"
  | "future-provider";

export interface MacroProvenance {
  providerId: string;
  providerLabel: string;
  sourceType: MacroDataSourceKind;
  observedAt: string;
  generatedAt: string;
  freshnessLabel: string;
  confidence: number;
  limitations: string;
  license: string;
}

export interface WeatherObservation {
  temperatureC: number;
  apparentTemperatureC: number;
  precipitationMm: number;
  rainfallMm: number;
  windSpeedKph: number;
  windGustKph: number;
  relativeHumidityPercent: number;
  cloudCoverPercent: number;
}

export interface WeatherForecastSummary {
  next72hRainMm: number;
  maxTemperatureC: number;
  minTemperatureC: number;
  maxWindGustKph: number;
  dominantCondition: string;
}

export interface ClimateAnomalySummary {
  baselineLabel: string;
  temperatureAnomalyC: number;
  rainfallAnomalyPercent: number;
  trendDirection: "cooling" | "stable" | "warming";
  confidence: number;
}

export interface FloodRiskSignal {
  classLabel: "low" | "moderate" | "high" | "severe";
  drivers: string[];
  confidence: number;
}

export interface FireRiskSignal {
  classLabel: "low" | "moderate" | "high" | "severe";
  drivers: string[];
  confidence: number;
}

export interface SolarPotentialSignal {
  irradianceKwhM2Day: number;
  cloudPenalty: number;
  classLabel: "low" | "medium" | "high";
  interpretation: string;
  confidence: number;
}

export interface MacroCellSummary {
  h3Id: string;
  tier: MeshTier;
  resolution: number;
  centroid: {
    latitude: number;
    longitude: number;
  };
  weather: WeatherObservation;
  forecast: WeatherForecastSummary;
  climateTrend: ClimateAnomalySummary;
  flood: FloodRiskSignal;
  fire: FireRiskSignal;
  solar: SolarPotentialSignal;
  provenance: MacroProvenance;
}

export interface MacroClimateSummary {
  currentConditions: string;
  forecastSummary: string;
  provenance: DataProvenance;
}

export interface HazardRiskSummary {
  floodInputs: string[];
  fireRiskClass: "low" | "moderate" | "high" | "severe";
  fireInputs: string[];
  confidence: number;
  provenance: DataProvenance;
}

export interface SolarPotentialSummary {
  slopeReadiness: number;
  aspectReadiness: number;
  cloudinessPenalty: number;
  irradianceBand: "low" | "medium" | "high";
  hubUseInterpretation: string;
  provenance: DataProvenance;
}

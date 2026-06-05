import { OPEN_METEO_BASE_URL, OPEN_METEO_PROVIDER_ID } from "@/lib/macroProviderIds";
import type {
  MacroCellSummary,
  MacroDataSourceKind,
  MacroProvenance,
  MeshTier
} from "@/lib/vmeshTypes";

export interface OpenMeteoRequestConfig {
  latitude: number;
  longitude: number;
}

export interface FetchMacroSummaryOptions {
  h3Id: string;
  tier: MeshTier;
  resolution: number;
  centroid: {
    latitude: number;
    longitude: number;
  };
  signal?: AbortSignal;
  timeoutMs?: number;
  fetcher?: typeof fetch;
}

interface OpenMeteoParsedPayload {
  current: Record<string, number | string>;
  hourly: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    precipitation: number[];
    rain: number[];
    relative_humidity_2m: number[];
    cloud_cover: number[];
    wind_speed_10m: number[];
    wind_gusts_10m: number[];
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function numberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.map((entry) => numberValue(entry)).filter((entry) => Number.isFinite(entry))
    : [];
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function max(values: number[]): number {
  return values.length === 0 ? 0 : Math.max(...values);
}

function min(values: number[]): number {
  return values.length === 0 ? 0 : Math.min(...values);
}

function riskClass(value: number): "low" | "moderate" | "high" | "severe" {
  if (value >= 78) return "severe";
  if (value >= 58) return "high";
  if (value >= 34) return "moderate";
  return "low";
}

function solarClass(value: number): "low" | "medium" | "high" {
  if (value >= 72) return "high";
  if (value >= 42) return "medium";
  return "low";
}

function providerProvenance(sourceType: MacroDataSourceKind, generatedAt: string): MacroProvenance {
  return {
    providerId: OPEN_METEO_PROVIDER_ID,
    providerLabel: "Open-Meteo Forecast API",
    sourceType,
    observedAt: generatedAt,
    generatedAt,
    freshnessLabel: sourceType === "live" ? "live forecast" : "cached forecast",
    confidence: 78,
    limitations:
      "Point forecast sampled at the selected H3 centroid. It is decision-support context, not an official risk warning.",
    license: "Open-Meteo terms; no API key for non-commercial prototype use"
  };
}

export function buildOpenMeteoForecastUrl({ latitude, longitude }: OpenMeteoRequestConfig): string {
  const url = new URL(OPEN_METEO_BASE_URL);
  url.searchParams.set("latitude", latitude.toFixed(5));
  url.searchParams.set("longitude", longitude.toFixed(5));
  url.searchParams.set(
    "current",
    [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "precipitation",
      "rain",
      "cloud_cover",
      "wind_speed_10m",
      "wind_gusts_10m"
    ].join(",")
  );
  url.searchParams.set(
    "hourly",
    [
      "temperature_2m",
      "apparent_temperature",
      "precipitation",
      "rain",
      "relative_humidity_2m",
      "cloud_cover",
      "wind_speed_10m",
      "wind_gusts_10m"
    ].join(",")
  );
  url.searchParams.set("forecast_days", "3");
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("precipitation_unit", "mm");
  return url.toString();
}

export function parseOpenMeteoForecastPayload(payload: unknown): OpenMeteoParsedPayload | null {
  if (!isRecord(payload) || !isRecord(payload.current) || !isRecord(payload.hourly)) return null;

  const current = Object.fromEntries(
    Object.entries(payload.current).filter(
      ([, value]) => typeof value === "number" || typeof value === "string"
    )
  ) as Record<string, number | string>;

  const hourly: OpenMeteoParsedPayload["hourly"] = {
    time: stringArray(payload.hourly.time),
    temperature_2m: numberArray(payload.hourly.temperature_2m),
    apparent_temperature: numberArray(payload.hourly.apparent_temperature),
    precipitation: numberArray(payload.hourly.precipitation),
    rain: numberArray(payload.hourly.rain),
    relative_humidity_2m: numberArray(payload.hourly.relative_humidity_2m),
    cloud_cover: numberArray(payload.hourly.cloud_cover),
    wind_speed_10m: numberArray(payload.hourly.wind_speed_10m),
    wind_gusts_10m: numberArray(payload.hourly.wind_gusts_10m)
  };

  return { current, hourly };
}

export function createMacroSummaryFromOpenMeteo({
  h3Id,
  tier,
  resolution,
  centroid,
  payload,
  sourceType = "live",
  generatedAt = new Date().toISOString()
}: {
  h3Id: string;
  tier: MeshTier;
  resolution: number;
  centroid: { latitude: number; longitude: number };
  payload: unknown;
  sourceType?: MacroDataSourceKind;
  generatedAt?: string;
}): MacroCellSummary | null {
  const parsed = parseOpenMeteoForecastPayload(payload);
  if (!parsed) return null;

  const temperatureSeries = parsed.hourly.temperature_2m.slice(0, 72);
  const apparentSeries = parsed.hourly.apparent_temperature.slice(0, 72);
  const rainSeries = parsed.hourly.rain.slice(0, 72);
  const precipitationSeries = parsed.hourly.precipitation.slice(0, 72);
  const humiditySeries = parsed.hourly.relative_humidity_2m.slice(0, 72);
  const cloudSeries = parsed.hourly.cloud_cover.slice(0, 72);
  const windSeries = parsed.hourly.wind_speed_10m.slice(0, 72);
  const gustSeries = parsed.hourly.wind_gusts_10m.slice(0, 72);

  const maxTemp = max(temperatureSeries);
  const minTemp = min(temperatureSeries);
  const rain72h = sum(rainSeries.length > 0 ? rainSeries : precipitationSeries);
  const maxGust = max(gustSeries);
  const averageHumidity = average(humiditySeries);
  const averageCloud = average(cloudSeries);
  const heatSignal = clamp((maxTemp - 24) * 4 + (averageHumidity - 55) * 0.25);
  const windSignal = clamp(maxGust * 1.2);
  const rainSignal = clamp(rain72h * 2.2);
  const droughtProxy = clamp(70 - rain72h * 4 - averageHumidity * 0.35);
  const fireLevel = Math.round(
    clamp(heatSignal * 0.34 + droughtProxy * 0.38 + windSignal * 0.22 + (100 - averageCloud) * 0.06)
  );
  const floodLevel = Math.round(clamp(rainSignal * 0.55 + rain72h * 1.1 + windSignal * 0.1));
  const solarLevel = Math.round(
    clamp(100 - averageCloud * 0.72 + Math.max(0, maxTemp - 18) * 0.6)
  );

  return {
    h3Id,
    tier,
    resolution,
    centroid,
    weather: {
      temperatureC: numberValue(parsed.current.temperature_2m, temperatureSeries[0] ?? 0),
      apparentTemperatureC: numberValue(
        parsed.current.apparent_temperature,
        apparentSeries[0] ?? 0
      ),
      precipitationMm: numberValue(parsed.current.precipitation, precipitationSeries[0] ?? 0),
      rainfallMm: numberValue(parsed.current.rain, rainSeries[0] ?? 0),
      windSpeedKph: numberValue(parsed.current.wind_speed_10m, windSeries[0] ?? 0),
      windGustKph: numberValue(parsed.current.wind_gusts_10m, gustSeries[0] ?? 0),
      relativeHumidityPercent: numberValue(
        parsed.current.relative_humidity_2m,
        humiditySeries[0] ?? 0
      ),
      cloudCoverPercent: numberValue(parsed.current.cloud_cover, cloudSeries[0] ?? 0)
    },
    forecast: {
      next72hRainMm: Math.round(rain72h * 10) / 10,
      maxTemperatureC: Math.round(maxTemp * 10) / 10,
      minTemperatureC: Math.round(minTemp * 10) / 10,
      maxWindGustKph: Math.round(maxGust * 10) / 10,
      dominantCondition:
        rain72h > 20
          ? "Wet spell"
          : averageCloud > 72
            ? "Cloudy"
            : maxTemp > 30
              ? "Heat watch"
              : "Settled"
    },
    climateTrend: {
      baselineLabel: "Open-Meteo point forecast; climate trend requires reanalysis",
      temperatureAnomalyC: 0,
      rainfallAnomalyPercent: 0,
      trendDirection: "stable",
      confidence: 35
    },
    flood: {
      classLabel: riskClass(floodLevel),
      drivers: ["72h rainfall forecast", "wind-driven storm proxy", "terrain/HAND future input"],
      confidence: 58
    },
    fire: {
      classLabel: riskClass(fireLevel),
      drivers: ["heat stress", "humidity/drought proxy", "wind gust forecast"],
      confidence: 62
    },
    solar: {
      irradianceKwhM2Day: Math.round((2.4 + (solarLevel / 100) * 4.2) * 10) / 10,
      cloudPenalty: Math.round(averageCloud),
      classLabel: solarClass(solarLevel),
      interpretation:
        "Point forecast proxy for charging, refrigeration, and local hub load timing.",
      confidence: 58
    },
    provenance: providerProvenance(sourceType, generatedAt)
  };
}

export async function fetchOpenMeteoMacroSummary({
  h3Id,
  tier,
  resolution,
  centroid,
  signal,
  timeoutMs = 5000,
  fetcher = fetch
}: FetchMacroSummaryOptions): Promise<MacroCellSummary | null> {
  const timeoutController = new AbortController();
  const timeout = globalThis.setTimeout(() => timeoutController.abort(), timeoutMs);
  const relayAbort = () => timeoutController.abort();
  signal?.addEventListener("abort", relayAbort, { once: true });

  try {
    const response = await fetcher(
      buildOpenMeteoForecastUrl({
        latitude: centroid.latitude,
        longitude: centroid.longitude
      }),
      { signal: timeoutController.signal }
    );
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    return createMacroSummaryFromOpenMeteo({
      h3Id,
      tier,
      resolution,
      centroid,
      payload,
      sourceType: "live"
    });
  } catch {
    return null;
  } finally {
    globalThis.clearTimeout(timeout);
    signal?.removeEventListener("abort", relayAbort);
  }
}

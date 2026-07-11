export interface TypedPointContextResult {
  schemaVersion: "vmesh-typed-point-context-v1";
  dataType: "weather" | "soil";
  status: "query-succeeded" | "query-succeeded-no-data" | "provider-failed";
  runClass: "configured" | "live-proof";
  provider: string;
  role: string;
  observedAt: string | null;
  units: Record<string, string>;
  values: Record<string, number | string | null>;
  limitations: string[];
  policy: {
    timeoutMs: number;
    maxAttempts: number;
    cacheTtlSeconds: number;
  };
  error: string | null;
}

const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_ATTEMPTS = 2;

export async function queryOpenMeteoCurrent(
  latitude: number,
  longitude: number,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}
): Promise<TypedPointContextResult> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("current", "temperature_2m,precipitation,weather_code,wind_speed_10m");
  url.searchParams.set("timezone", "UTC");
  try {
    const value = await boundedJson(url, options);
    const current = isRecord(value.current) ? value.current : {};
    const units = isRecord(value.current_units) ? value.current_units : {};
    const values = {
      temperature2m: numberValue(current.temperature_2m),
      precipitation: numberValue(current.precipitation),
      weatherCode: numberValue(current.weather_code),
      windSpeed10m: numberValue(current.wind_speed_10m),
      modelElevationMeters: numberValue(value.elevation)
    };
    return {
      schemaVersion: "vmesh-typed-point-context-v1",
      dataType: "weather",
      status: Object.values(values).some((item) => item !== null)
        ? "query-succeeded"
        : "query-succeeded-no-data",
      runClass: options.fetchImpl ? "configured" : "live-proof",
      provider: "Open-Meteo",
      role: "modelled-current-weather-context",
      observedAt: stringValue(current.time),
      units: {
        temperature2m: stringValue(units.temperature_2m) ?? "unknown",
        precipitation: stringValue(units.precipitation) ?? "unknown",
        weatherCode: stringValue(units.weather_code) ?? "WMO code",
        windSpeed10m: stringValue(units.wind_speed_10m) ?? "unknown",
        modelElevationMeters: "m"
      },
      values,
      limitations: [
        "Modelled weather context is time-sensitive and is not an on-site observation or forecast guarantee."
      ],
      policy: {
        timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        maxAttempts: MAX_ATTEMPTS,
        cacheTtlSeconds: 900
      },
      error: null
    };
  } catch (error) {
    return failed("weather", "Open-Meteo", "modelled-current-weather-context", options, error);
  }
}

export async function querySoilGridsSurface(
  latitude: number,
  longitude: number,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}
): Promise<TypedPointContextResult> {
  const url = new URL("https://rest.isric.org/soilgrids/v2.0/properties/query");
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("lat", String(latitude));
  for (const property of ["clay", "sand", "soc", "phh2o"])
    url.searchParams.append("property", property);
  url.searchParams.set("depth", "0-5cm");
  url.searchParams.set("value", "mean");
  try {
    const value = await boundedJson(url, { ...options, timeoutMs: options.timeoutMs ?? 4_000 });
    const properties = isRecord(value.properties) ? value.properties : {};
    const layers = Array.isArray(properties.layers) ? properties.layers : [];
    const values: Record<string, number | null> = {};
    const units: Record<string, string> = {};
    for (const layer of layers) {
      if (!isRecord(layer) || typeof layer.name !== "string") continue;
      const depth = Array.isArray(layer.depths) && isRecord(layer.depths[0]) ? layer.depths[0] : {};
      const depthValues = isRecord(depth.values) ? depth.values : {};
      const unitMeasure = isRecord(layer.unit_measure) ? layer.unit_measure : {};
      values[`${layer.name}Mean0To5cm`] = numberValue(depthValues.mean);
      units[`${layer.name}Mean0To5cm`] = stringValue(unitMeasure.target_units) ?? "unknown";
    }
    return {
      schemaVersion: "vmesh-typed-point-context-v1",
      dataType: "soil",
      status: Object.values(values).some((item) => item !== null)
        ? "query-succeeded"
        : "query-succeeded-no-data",
      runClass: options.fetchImpl ? "configured" : "live-proof",
      provider: "ISRIC SoilGrids",
      role: "modelled-global-soil-context",
      observedAt: null,
      units,
      values,
      limitations: [
        "SoilGrids is modelled global context and not a field sample, geotechnical report, contamination assessment, or legal soil classification."
      ],
      policy: {
        timeoutMs: options.timeoutMs ?? 4_000,
        maxAttempts: MAX_ATTEMPTS,
        cacheTtlSeconds: 86_400
      },
      error: null
    };
  } catch (error) {
    return failed("soil", "ISRIC SoilGrids", "modelled-global-soil-context", options, error);
  }
}

async function boundedJson(url: URL, options: { fetchImpl?: typeof fetch; timeoutMs?: number }) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    try {
      const response = await (options.fetchImpl ?? fetch)(url, {
        signal: controller.signal,
        headers: { accept: "application/json", "user-agent": "VMesh typed source adapter" }
      });
      if (!response.ok) {
        const error = new Error(`provider-http-${response.status}`);
        if (response.status < 500 && response.status !== 429) throw error;
        lastError = error;
        continue;
      }
      const text = await response.text();
      if (Buffer.byteLength(text, "utf8") > 1_000_000)
        throw new Error("provider-response-too-large");
      const value = JSON.parse(text) as unknown;
      if (!isRecord(value)) throw new Error("provider-response-invalid");
      return value;
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS) throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("provider-query-failed");
}

function failed(
  dataType: "weather" | "soil",
  provider: string,
  role: string,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number },
  error: unknown
): TypedPointContextResult {
  return {
    schemaVersion: "vmesh-typed-point-context-v1",
    dataType,
    status: "provider-failed",
    runClass: options.fetchImpl ? "configured" : "live-proof",
    provider,
    role,
    observedAt: null,
    units: {},
    values: {},
    limitations: ["Provider failure is not a valid no-data result and must remain explicit."],
    policy: {
      timeoutMs: options.timeoutMs ?? (dataType === "soil" ? 4_000 : DEFAULT_TIMEOUT_MS),
      maxAttempts: MAX_ATTEMPTS,
      cacheTtlSeconds: dataType === "soil" ? 86_400 : 900
    },
    error: error instanceof Error ? error.message : "provider-query-failed"
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

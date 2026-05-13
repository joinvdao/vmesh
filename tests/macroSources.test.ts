import { describe, expect, it } from "vitest";

import { DEFAULT_SELECTED_HEX_ID, initialMacroSummariesByH3 } from "@/data/mockVmeshData";
import {
  buildOpenMeteoForecastUrl,
  createMacroCacheKey,
  createMacroSummaryFromOpenMeteo,
  getMacroLayerValue,
  getMacroProviderRegistry,
  OPEN_METEO_PROVIDER_ID,
  parseOpenMeteoForecastPayload,
  selectMacroProvider
} from "@/lib/macroSources";

const openMeteoFixture = {
  current: {
    temperature_2m: 26.2,
    relative_humidity_2m: 56,
    apparent_temperature: 27.8,
    precipitation: 0,
    rain: 0,
    cloud_cover: 28,
    wind_speed_10m: 18,
    wind_gusts_10m: 34
  },
  hourly: {
    time: Array.from(
      { length: 72 },
      (_, index) => `2026-05-01T${String(index % 24).padStart(2, "0")}:00`
    ),
    temperature_2m: Array.from({ length: 72 }, (_, index) => 18 + (index % 12)),
    apparent_temperature: Array.from({ length: 72 }, (_, index) => 19 + (index % 12)),
    precipitation: Array.from({ length: 72 }, (_, index) => (index % 9 === 0 ? 1.4 : 0)),
    rain: Array.from({ length: 72 }, (_, index) => (index % 9 === 0 ? 1.1 : 0)),
    relative_humidity_2m: Array.from({ length: 72 }, () => 58),
    cloud_cover: Array.from({ length: 72 }, (_, index) => 30 + (index % 20)),
    wind_speed_10m: Array.from({ length: 72 }, () => 17),
    wind_gusts_10m: Array.from({ length: 72 }, (_, index) => 25 + (index % 18))
  }
};

describe("macro provider registry and Open-Meteo parsing", () => {
  it("selects Open-Meteo as the live-capable no-secret macro provider", () => {
    const providers = getMacroProviderRegistry();
    const selected = selectMacroProvider(providers);

    expect(selected.id).toBe(OPEN_METEO_PROVIDER_ID);
    expect(selected.requiresApiKey).toBe(false);
    expect(selected.status).toBe("available");
  });

  it("builds a selected-centroid forecast URL without secrets", () => {
    const url = buildOpenMeteoForecastUrl({ latitude: 38.7223, longitude: -9.1393 });

    expect(url).toContain("api.open-meteo.com");
    expect(url).toContain("latitude=38.72230");
    expect(url).toContain("longitude=-9.13930");
    expect(url).not.toContain("key=");
    expect(url).not.toContain("token=");
  });

  it("parses Open-Meteo fixtures into a macro cell summary with provenance", () => {
    const parsed = parseOpenMeteoForecastPayload(openMeteoFixture);
    const fallback = initialMacroSummariesByH3[DEFAULT_SELECTED_HEX_ID];
    const summary = createMacroSummaryFromOpenMeteo({
      h3Id: fallback.h3Id,
      tier: fallback.tier,
      resolution: fallback.resolution,
      centroid: fallback.centroid,
      payload: openMeteoFixture,
      generatedAt: "2026-05-01T12:00:00.000Z"
    });

    expect(parsed?.hourly.temperature_2m).toHaveLength(72);
    expect(summary?.provenance.sourceType).toBe("live");
    expect(summary?.forecast.next72hRainMm).toBeGreaterThan(0);
    expect(summary ? getMacroLayerValue(summary, "weather") : 0).toBeGreaterThan(0);
  });

  it("keys cache entries by provider, H3 cell, and UTC hour", () => {
    expect(
      createMacroCacheKey({
        providerId: OPEN_METEO_PROVIDER_ID,
        h3Id: DEFAULT_SELECTED_HEX_ID,
        at: new Date("2026-05-01T12:44:00.000Z")
      })
    ).toBe(`${OPEN_METEO_PROVIDER_ID}:${DEFAULT_SELECTED_HEX_ID}:2026-05-01T12`);
  });
});

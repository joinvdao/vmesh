import { describe, expect, it } from "vitest";

import {
  createClimateDataFunnelSummary,
  createClimateH3CacheKey,
  ERA5_CDS_CLIMATE_SOURCE_ID,
  getClimateDataSourceRegistry,
  getClimateSourcesForLayer,
  NASA_FIRMS_CLIMATE_SOURCE_ID,
  NOAA_GFS_CLIMATE_SOURCE_ID,
  OPEN_METEO_FORECAST_CLIMATE_SOURCE_ID,
  selectClimateSourceForLayer
} from "@/lib/climateDataSources";

describe("climate data source funnel", () => {
  it("uses Open-Meteo as the selected-H3 live weather prototype", () => {
    const providers = getClimateDataSourceRegistry();
    const selected = selectClimateSourceForLayer(providers, "weather");

    expect(selected?.id).toBe(OPEN_METEO_FORECAST_CLIMATE_SOURCE_ID);
    expect(selected?.queryMode).toBe("selected-h3-centroid");
    expect(selected?.requiresApiKey).toBe(false);
    expect(selected?.status).toBe("available");
  });

  it("keeps gridded climate data in offline H3 preprocessing paths", () => {
    const providers = getClimateDataSourceRegistry();
    const climateTrendSources = getClimateSourcesForLayer(providers, "climate-trend");

    expect(climateTrendSources.map((provider) => provider.id)).toContain(
      ERA5_CDS_CLIMATE_SOURCE_ID
    );
    expect(
      climateTrendSources.some((provider) => provider.queryMode === "offline-h3-precompute")
    ).toBe(true);
    expect(providers.find((provider) => provider.id === NOAA_GFS_CLIMATE_SOURCE_ID)?.status).toBe(
      "preprocessing-required"
    );
  });

  it("keeps active-fire access gated until terms and credentials are reviewed", () => {
    const firms = getClimateDataSourceRegistry().find(
      (provider) => provider.id === NASA_FIRMS_CLIMATE_SOURCE_ID
    );

    expect(firms?.requiresApiKey).toBe(true);
    expect(firms?.status).toBe("requires-api-key");
    expect(firms?.notes).toContain("not complete fire-risk truth");
  });

  it("summarizes available, token-free, and preprocessing climate optionality", () => {
    const summary = createClimateDataFunnelSummary(getClimateDataSourceRegistry());

    expect(summary.totalSources).toBeGreaterThanOrEqual(6);
    expect(summary.liveCapableSources).toBe(1);
    expect(summary.preprocessingSources).toBeGreaterThan(2);
    expect(summary.layers.solar).toBeGreaterThan(0);
    expect(summary.layers.fire).toBeGreaterThan(0);
  });

  it("builds deterministic H3 cache keys by provider, layer, cell, and period", () => {
    expect(
      createClimateH3CacheKey({
        providerId: OPEN_METEO_FORECAST_CLIMATE_SOURCE_ID,
        h3Id: "85393363fffffff",
        layerId: "weather",
        period: "2026-05-07T15"
      })
    ).toBe(`${OPEN_METEO_FORECAST_CLIMATE_SOURCE_ID}:weather:85393363fffffff:2026-05-07T15`);
  });
});

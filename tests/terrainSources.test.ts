import { describe, expect, it } from "vitest";

import {
  getTerrainProviderRegistry,
  selectTerrainProvider,
  toRasterDemSource
} from "@/lib/terrainSources";

describe("terrain provider registry", () => {
  it("prioritizes an environment TileJSON provider when configured", () => {
    const providers = getTerrainProviderRegistry("https://example.test/terrain.json");
    const selected = selectTerrainProvider(providers);
    expect(selected.id).toBe("env-raster-dem");
    expect(toRasterDemSource(selected)).toMatchObject({
      type: "raster-dem",
      url: "https://example.test/terrain.json"
    });
  });

  it("falls back to a no-token map-ready provider", () => {
    const providers = getTerrainProviderRegistry();
    const selected = selectTerrainProvider(providers);
    expect(selected.id).toBe("maplibre-demo-dem");
    expect(selected.requiresApiKey).toBe(false);
  });

  it("catalogs future dataset and API sources without map-ready specs", () => {
    const providers = getTerrainProviderRegistry();
    const fabdem = providers.find((provider) => provider.id === "fabdem-v1-2");
    const opentopo = providers.find((provider) => provider.id === "opentopography-globaldem");
    expect(fabdem?.status).toBe("requires-license");
    expect(opentopo?.requiresApiKey).toBe(true);
    expect(fabdem ? toRasterDemSource(fabdem) : null).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import {
  getTerrainProviderCandidates,
  getContourProviderRegistry,
  getTerrainProviderRegistry,
  MAPTERHORN_DEFAULT_PMTILES_URL,
  MAPTERHORN_PROVIDER_ID,
  MAPZEN_DEFAULT_TERRARIUM_URL,
  MAPZEN_PROVIDER_ID,
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

  it("selects Mapterhorn PMTiles as the default map-ready provider", () => {
    const providers = getTerrainProviderRegistry();
    const selected = selectTerrainProvider(providers);
    expect(selected.id).toBe(MAPTERHORN_PROVIDER_ID);
    expect(selected.requiresApiKey).toBe(false);
    expect(toRasterDemSource(selected)).toMatchObject({
      type: "raster-dem",
      url: `pmtiles://${MAPTERHORN_DEFAULT_PMTILES_URL}`,
      encoding: "terrarium",
      tileSize: 512
    });
  });

  it("keeps Mapzen Terrarium as the no-token XYZ fallback candidate", () => {
    const providers = getTerrainProviderRegistry();
    const candidates = getTerrainProviderCandidates(providers);
    const mapzen = candidates.find((provider) => provider.id === MAPZEN_PROVIDER_ID);

    expect(candidates.map((provider) => provider.id)).toContain(MAPZEN_PROVIDER_ID);
    expect(mapzen?.requiresApiKey).toBe(false);
    expect(toRasterDemSource(mapzen!)).toMatchObject({
      type: "raster-dem",
      tiles: [MAPZEN_DEFAULT_TERRARIUM_URL],
      encoding: "terrarium"
    });
  });

  it("can prefer Mapzen without losing env provider priority", () => {
    const providers = getTerrainProviderRegistry({
      envTileJsonUrl: "https://example.test/terrain.json",
      preferredProviderId: MAPZEN_PROVIDER_ID
    });

    expect(selectTerrainProvider(providers, MAPZEN_PROVIDER_ID).id).toBe("env-raster-dem");
    expect(getTerrainProviderCandidates(providers, MAPZEN_PROVIDER_ID)[1]?.id).toBe(
      MAPZEN_PROVIDER_ID
    );
  });

  it("catalogs future dataset and API sources without map-ready specs", () => {
    const providers = getTerrainProviderRegistry();
    const fabdem = providers.find((provider) => provider.id === "fabdem-v1-2");
    const opentopo = providers.find((provider) => provider.id === "opentopography-globaldem");
    expect(fabdem?.status).toBe("requires-license");
    expect(opentopo?.requiresApiKey).toBe(true);
    expect(fabdem ? toRasterDemSource(fabdem) : null).toBeNull();
  });

  it("exposes contour providers as derived or precomputed, not fake live extraction", () => {
    const contours = getContourProviderRegistry();
    expect(contours[0]).toMatchObject({
      kind: "derived-dem-placeholder",
      status: "fallback"
    });
    expect(contours[1]).toMatchObject({
      kind: "precomputed-vector-pmtiles",
      status: "unavailable"
    });
  });
});

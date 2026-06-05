import { describe, expect, it } from "vitest";

import {
  getTerrainProviderCandidates,
  getContourProviderRegistry,
  getTerrainProviderRegistry,
  isMapReadyTerrainProvider,
  MAPTERHORN_DEFAULT_PMTILES_URL,
  MAPTERHORN_PROVIDER_ID,
  MAPZEN_DEFAULT_TERRARIUM_URL,
  MAPZEN_PROVIDER_ID,
  selectTerrainProvider,
  SOURCE_AUTO_BEST_DTM_PROVIDER_ID,
  SOURCE_AUTO_DSM_PROVIDER_ID,
  SOURCE_AUTO_DTM_PROVIDER_ID,
  toRasterPreviewSource,
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

  it("exposes an official source-backed DTM preview provider without making it the global default", () => {
    const providers = getTerrainProviderRegistry();
    const sourcePreview = providers.find((provider) => provider.id === SOURCE_AUTO_DTM_PROVIDER_ID);

    expect(selectTerrainProvider(providers).id).toBe(MAPTERHORN_PROVIDER_ID);
    expect(sourcePreview?.requiresApiKey).toBe(false);
    expect(sourcePreview?.resolution).toContain("1m DTM only");
    expect(sourcePreview?.resolution).toContain("lower-resolution");
    expect(isMapReadyTerrainProvider(sourcePreview!)).toBe(true);
    expect(toRasterPreviewSource(sourcePreview!)).toMatchObject({
      type: "raster",
      tiles: ["/api/terrain/source-preview/source-auto/dtm/{z}/{x}/{y}"],
      tileSize: 256
    });

    const bestPreview = providers.find(
      (provider) => provider.id === SOURCE_AUTO_BEST_DTM_PROVIDER_ID
    );
    expect(bestPreview?.resolution).toContain("2m HRDEM");
    expect(bestPreview?.notes).toContain("does not satisfy strict 1m");
    expect(toRasterPreviewSource(bestPreview!)).toMatchObject({
      type: "raster",
      tiles: ["/api/terrain/source-preview/source-auto-best/dtm/{z}/{x}/{y}"],
      tileSize: 256
    });

    const dsmPreview = providers.find((provider) => provider.id === SOURCE_AUTO_DSM_PROVIDER_ID);
    expect(dsmPreview?.resolution).toContain("surface DSM preview");
    expect(dsmPreview?.notes).toContain("point-cloud derivation");
    expect(toRasterPreviewSource(dsmPreview!)).toMatchObject({
      type: "raster",
      tiles: ["/api/terrain/source-preview/source-auto/dsm/{z}/{x}/{y}"],
      tileSize: 256
    });
  });

  it("can prefer the official DTM source preview for searched USA/Canada coordinates", () => {
    const providers = getTerrainProviderRegistry();

    expect(selectTerrainProvider(providers, SOURCE_AUTO_DTM_PROVIDER_ID).id).toBe(
      SOURCE_AUTO_DTM_PROVIDER_ID
    );
    expect(getTerrainProviderCandidates(providers, SOURCE_AUTO_DTM_PROVIDER_ID)[0]?.id).toBe(
      SOURCE_AUTO_DTM_PROVIDER_ID
    );
    expect(getTerrainProviderCandidates(providers, SOURCE_AUTO_BEST_DTM_PROVIDER_ID)[0]?.id).toBe(
      SOURCE_AUTO_BEST_DTM_PROVIDER_ID
    );
    expect(getTerrainProviderCandidates(providers, SOURCE_AUTO_DSM_PROVIDER_ID)[0]?.id).toBe(
      SOURCE_AUTO_DSM_PROVIDER_ID
    );
  });

  it("keeps Mapzen Terrarium as the no-token XYZ fallback candidate", () => {
    const providers = getTerrainProviderRegistry();
    const candidates = getTerrainProviderCandidates(providers);
    const mapzen = candidates.find((provider) => provider.id === MAPZEN_PROVIDER_ID);

    expect(candidates.slice(0, 2).map((provider) => provider.id)).toEqual([
      MAPTERHORN_PROVIDER_ID,
      MAPZEN_PROVIDER_ID
    ]);
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
    expect(fabdem ? isMapReadyTerrainProvider(fabdem) : null).toBe(false);
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

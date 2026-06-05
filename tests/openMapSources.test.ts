import { describe, expect, it } from "vitest";

import {
  createOpenMapFunnelSummary,
  getMapReadyOpenMapSources,
  getOpenMapSourceRegistry,
  getOpenMapSourcesByLayer,
  OSM_PBF_EXTRACT_SOURCE_ID,
  OVERTURE_OPEN_MAP_SOURCE_ID,
  PROTOMAPS_OPEN_MAP_SOURCE_ID
} from "@/lib/openMapSources";

describe("open map data funnel", () => {
  it("keeps token-free map-ready sources separate from preprocessing catalogs", () => {
    const providers = getOpenMapSourceRegistry({
      protomapsPmtilesUrl: "https://example.test/open-basemap.pmtiles"
    });
    const mapReady = getMapReadyOpenMapSources(providers);
    const protomaps = providers.find((provider) => provider.id === PROTOMAPS_OPEN_MAP_SOURCE_ID);
    const overture = providers.find((provider) => provider.id === OVERTURE_OPEN_MAP_SOURCE_ID);

    expect(protomaps?.status).toBe("available");
    expect(protomaps?.processingMode).toBe("pmtiles-ready");
    expect(overture?.status).toBe("preprocessing-required");
    expect(mapReady.map((provider) => provider.id)).toContain(PROTOMAPS_OPEN_MAP_SOURCE_ID);
    expect(mapReady.every((provider) => !provider.requiresApiKey)).toBe(true);
  });

  it("routes buildings through source-backed preprocessing rather than public raster tiles", () => {
    const providers = getOpenMapSourceRegistry();
    const buildingSources = getOpenMapSourcesByLayer(providers, "buildings");

    expect(buildingSources.map((provider) => provider.id)).toContain(OVERTURE_OPEN_MAP_SOURCE_ID);
    expect(buildingSources.map((provider) => provider.id)).toContain(OSM_PBF_EXTRACT_SOURCE_ID);
    expect(buildingSources.every((provider) => provider.processingMode !== "map-ready")).toBe(true);
  });

  it("summarizes optionality across OSM, Overture, PMTiles, addresses, and point-cloud paths", () => {
    const summary = createOpenMapFunnelSummary(getOpenMapSourceRegistry());

    expect(summary.totalSources).toBeGreaterThanOrEqual(7);
    expect(summary.tokenFreeSources).toBe(summary.totalSources);
    expect(summary.layers.roads).toBeGreaterThan(0);
    expect(summary.layers.buildings).toBeGreaterThan(0);
    expect(summary.layers.addresses).toBeGreaterThan(0);
    expect(summary.layers["point-cloud"]).toBe(1);
  });
});

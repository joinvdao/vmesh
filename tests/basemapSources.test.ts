import { describe, expect, it } from "vitest";

import {
  ENV_BASEMAP_PROVIDER_ID,
  getBasemapProviderCandidates,
  getBasemapProviderRegistry,
  MAPLIBRE_DEMO_BASEMAP_PROVIDER_ID,
  PROTOMAPS_BASEMAP_PROVIDER_ID,
  selectBasemapProvider,
  toMapLibreBasemapStyle
} from "@/lib/basemapSources";

describe("basemap provider registry", () => {
  it("prioritizes an env style URL over all default providers", () => {
    const providers = getBasemapProviderRegistry({
      customStyleUrl: "https://example.test/style.json",
      preferredProviderId: PROTOMAPS_BASEMAP_PROVIDER_ID
    });

    const selected = selectBasemapProvider(providers, PROTOMAPS_BASEMAP_PROVIDER_ID);
    expect(selected.id).toBe(ENV_BASEMAP_PROVIDER_ID);
    expect(toMapLibreBasemapStyle(selected)).toBe("https://example.test/style.json");
  });

  it("uses the no-token MapLibre/OSM raster style as the default map-ready basemap", () => {
    const providers = getBasemapProviderRegistry();
    const selected = selectBasemapProvider(providers);
    const style = toMapLibreBasemapStyle(selected);

    expect(selected.id).toBe(MAPLIBRE_DEMO_BASEMAP_PROVIDER_ID);
    expect(typeof style).toBe("object");
    expect(typeof style === "object" ? style.sources["osm-raster"] : null).toBeDefined();
  });

  it("keeps Protomaps available as a configured PMTiles candidate", () => {
    const providers = getBasemapProviderRegistry({
      protomapsPmtilesUrl: "https://example.test/basemap.pmtiles"
    });
    const candidates = getBasemapProviderCandidates(providers, PROTOMAPS_BASEMAP_PROVIDER_ID);
    const protomaps = candidates.find((provider) => provider.id === PROTOMAPS_BASEMAP_PROVIDER_ID);

    expect(protomaps?.status).toBe("available");
    expect(toMapLibreBasemapStyle(protomaps!)).toMatchObject({
      sources: {
        protomaps: {
          url: "pmtiles://https://example.test/basemap.pmtiles"
        }
      }
    });
  });
});

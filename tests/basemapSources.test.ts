import { describe, expect, it } from "vitest";

import {
  ENV_BASEMAP_PROVIDER_ID,
  getBasemapProviderCandidates,
  getBasemapProviderRegistry,
  isMapReadyBasemapProvider,
  MAPLIBRE_DEMO_BASEMAP_PROVIDER_ID,
  MAPBOX_SATELLITE_BASEMAP_PROVIDER_ID,
  PROTOMAPS_BASEMAP_PROVIDER_ID,
  selectBasemapProvider,
  toMapLibreBasemapStyle
} from "@/lib/basemapSources";
import { MAPBOX_SATELLITE_PROXY_TILE_URL } from "@/lib/mapboxSatelliteProxy";

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

  it("keeps Mapbox satellite as an optional token-gated base globe provider", () => {
    const providers = getBasemapProviderRegistry({
      preferredProviderId: MAPBOX_SATELLITE_BASEMAP_PROVIDER_ID
    });
    const mapbox = providers.find(
      (provider) => provider.id === MAPBOX_SATELLITE_BASEMAP_PROVIDER_ID
    );

    expect(mapbox?.status).toBe("requires-api-key");
    expect(isMapReadyBasemapProvider(mapbox!)).toBe(false);
    expect(selectBasemapProvider(providers, MAPBOX_SATELLITE_BASEMAP_PROVIDER_ID).id).toBe(
      MAPLIBRE_DEMO_BASEMAP_PROVIDER_ID
    );
  });

  it("can use the server-side Mapbox proxy as the selected base globe without exposing a token", () => {
    const providers = getBasemapProviderRegistry({
      preferredProviderId: MAPBOX_SATELLITE_BASEMAP_PROVIDER_ID,
      mapboxProxyUrl: MAPBOX_SATELLITE_PROXY_TILE_URL
    });
    const selected = selectBasemapProvider(providers, MAPBOX_SATELLITE_BASEMAP_PROVIDER_ID);
    const style = toMapLibreBasemapStyle(selected);

    expect(selected.id).toBe(MAPBOX_SATELLITE_BASEMAP_PROVIDER_ID);
    expect(selected.sourceUrl).toBe(MAPBOX_SATELLITE_PROXY_TILE_URL);
    expect(selected.sourceUrl).not.toContain("access_token");
    expect(typeof style === "object" ? style.sources["osm-raster"] : null).toMatchObject({
      tiles: [MAPBOX_SATELLITE_PROXY_TILE_URL],
      tileSize: 512
    });
  });
});

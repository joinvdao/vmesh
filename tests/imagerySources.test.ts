import { describe, expect, it } from "vitest";

import {
  assessAoiCloudMask,
  buildSentinelStacSearchPayload,
  createSentinelSuperResolutionPlan,
  createH3CoverageFromBounds,
  createMockSentinelManifest,
  getImageryProviderRegistry,
  MAPBOX_SATELLITE_PROVIDER_ID,
  passesSceneCloudGate,
  SENTINEL_COG_PREVIEW_PROVIDER_ID,
  toImageryRasterSource,
  validateImageryTileManifest
} from "@/lib/imagerySources";
import { MAPBOX_SATELLITE_PROXY_TILE_URL } from "@/lib/mapboxSatelliteProxy";

describe("Sentinel imagery provider foundation", () => {
  it("builds an Earth Search STAC query for recent low-cloud Sentinel-2 L2A scenes", () => {
    const payload = buildSentinelStacSearchPayload({
      bbox: [-9.5, 38.5, -8.8, 39.1],
      datetime: "2026-04-01/2026-05-01",
      cloudCoverMax: 10
    });

    expect(payload.collections).toEqual(["sentinel-2-l2a"]);
    expect(payload.query).toEqual({ "eo:cloud_cover": { lte: 10 } });
    expect(payload.limit).toBe(12);
  });

  it("rejects scenes by metadata before pixel-level cloud validation", () => {
    expect(
      passesSceneCloudGate({ id: "clear", cloudCover: 4, productType: "S2MSI2A" }).accepted
    ).toBe(true);
    expect(
      passesSceneCloudGate({ id: "cloudy", cloudCover: 42, productType: "S2MSI2A" }).accepted
    ).toBe(false);
  });

  it("calculates AOI clear-pixel ratio from SCL classes", () => {
    const clearMask = Array.from({ length: 96 }, () => 4).concat([8, 9, 10, 11]);
    const assessment = assessAoiCloudMask(clearMask, 0.95);

    expect(assessment.clearPixelRatioAoi).toBe(0.96);
    expect(assessment.accepted).toBe(true);
    expect(assessAoiCloudMask([4, 8, 9, 10], 0.95).accepted).toBe(false);
  });

  it("keeps Mapbox disabled unless a token is explicitly configured", () => {
    const providers = getImageryProviderRegistry();
    const mapbox = providers.find((provider) => provider.id === MAPBOX_SATELLITE_PROVIDER_ID);
    const sentinel = providers.find((provider) => provider.id === SENTINEL_COG_PREVIEW_PROVIDER_ID);

    expect(MAPBOX_SATELLITE_PROVIDER_ID).toBe("mapbox-satellite-global");
    expect(mapbox?.status).toBe("requires-api-key");
    expect(mapbox?.kind).toBe("mapbox-satellite-global");
    expect(mapbox?.notes).toContain("visual context");
    expect(toImageryRasterSource(mapbox!)).toBeNull();
    expect(toImageryRasterSource(sentinel!)).toMatchObject({
      type: "raster",
      tiles: [expect.stringContaining("s2cloudless")]
    });
  });

  it("supports Mapbox Satellite global imagery through the server-side proxy without exposing a token", () => {
    const providers = getImageryProviderRegistry({
      mapboxProxyUrl: MAPBOX_SATELLITE_PROXY_TILE_URL
    });
    const mapbox = providers.find((provider) => provider.id === MAPBOX_SATELLITE_PROVIDER_ID);

    expect(mapbox?.status).toBe("available");
    expect(mapbox?.sourceUrl).toBe(MAPBOX_SATELLITE_PROXY_TILE_URL);
    expect(mapbox?.label).toContain("global ortho-style imagery");
    expect(mapbox?.license).toContain("visual-context");
    expect(toImageryRasterSource(mapbox!)).toMatchObject({
      type: "raster",
      tiles: [MAPBOX_SATELLITE_PROXY_TILE_URL],
      tileSize: 512
    });
    expect(mapbox?.sourceUrl).not.toContain("access_token");
  });

  it("accepts only restricted public Mapbox tokens for direct browser tile URLs", () => {
    const withPublicToken = getImageryProviderRegistry({
      mapboxToken: "pk.public-token"
    }).find((provider) => provider.id === MAPBOX_SATELLITE_PROVIDER_ID);
    const withSecretToken = getImageryProviderRegistry({
      mapboxToken: "sk.secret-token"
    }).find((provider) => provider.id === MAPBOX_SATELLITE_PROVIDER_ID);

    expect(withPublicToken?.status).toBe("available");
    expect(withPublicToken?.sourceUrl).toContain("access_token=pk.public-token");
    expect(withSecretToken?.status).toBe("requires-api-key");
    expect(withSecretToken?.sourceUrl).toBe("");
  });

  it("validates manifest-backed Sentinel/SEN2SR output metadata", () => {
    const h3Coverage = createH3CoverageFromBounds([-9.55, 38.48, -8.75, 39.05]);
    const manifest = createMockSentinelManifest({ h3Coverage });

    expect(h3Coverage.length).toBeGreaterThan(0);
    expect(validateImageryTileManifest(manifest)).toBe(true);
    expect(manifest.sourceResolutionMeters).toBe(10);
    expect(manifest.resolutionMeters).toBe(2.5);
    expect(manifest.scaleFactor).toBe(4);
    expect(manifest.superResolutionModel).toContain("SEN2SRLite");
    expect(manifest.provenance.limitations).toContain("offline/server-side");
  });

  it("creates a server-side Sentinel/SEN2SRLite plan for 10m to 2.5m imagery", () => {
    const plan = createSentinelSuperResolutionPlan({
      h3Id: "85393363fffffff",
      bounds: [-9.55, 38.48, -8.75, 39.05],
      acquiredAt: "2026-05-01T10:30:00.000Z"
    });

    expect(plan.sourceResolutionMeters).toBe(10);
    expect(plan.targetResolutionMeters).toBe(2.5);
    expect(plan.scaleFactor).toBe(4);
    expect(plan.bands).toEqual(["B04", "B03", "B02", "B08"]);
    expect(plan.truthStatus).toBe("imagery-inferred-context");
    expect(plan.cacheKey).toContain("sen2srlite-x4");
    expect(plan.warnings.join(" ")).toContain("outside the browser");
  });
});

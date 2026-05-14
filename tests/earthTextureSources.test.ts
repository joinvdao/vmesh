import { describe, expect, it } from "vitest";

import {
  getEarthTextureSources,
  selectEarthTextureSource
} from "@/components/Map/earthTextureSources";

describe("earth texture source registry", () => {
  it("defaults to an available no-token Blue Marble style texture", () => {
    const sources = getEarthTextureSources();
    const selected = selectEarthTextureSource(sources);

    expect(selected.id).toBe("blue-marble");
    expect(selected.kind).toBe("bundled-raster");
    expect(selected.sourceUrl).toContain("svs.gsfc.nasa.gov");
    expect(selected.requiresToken).toBe(false);
    expect(selected.status).toBe("available");
  });

  it("keeps optional Mapbox satellite disabled unless explicitly configured", () => {
    const withoutToken = getEarthTextureSources();
    const withToken = getEarthTextureSources({ mapboxTokenAvailable: true });

    expect(withoutToken.find((source) => source.id === "mapbox-satellite")?.status).toBe(
      "disabled"
    );
    expect(withToken.find((source) => source.id === "mapbox-satellite")?.status).toBe("available");
  });

  it("models Sentinel package imagery as a package-backed future texture", () => {
    const sources = getEarthTextureSources();
    const sentinel = sources.find((source) => source.id === "sentinel-package");

    expect(sentinel?.kind).toBe("package-raster");
    expect(sentinel?.status).toBe("future-package");
  });
});

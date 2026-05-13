import { describe, expect, it } from "vitest";

import {
  createLayerCatalogSummary,
  getMacroLayerCatalog,
  getMacroLayersByCategory,
  getMapReadyMacroLayers,
  isH3MacroLayer
} from "@/lib/layerCatalog";

describe("macro atlas layer catalog", () => {
  it("covers terrain, climate, hazard, solar, vegetation, and imagery macro families", () => {
    const catalog = getMacroLayerCatalog();
    const summary = createLayerCatalogSummary(catalog);

    expect(summary.categories.terrain).toBeGreaterThan(0);
    expect(summary.categories.climate).toBeGreaterThan(0);
    expect(summary.categories.hazard).toBeGreaterThan(0);
    expect(summary.categories.solar).toBeGreaterThan(0);
    expect(summary.categories.vegetation).toBeGreaterThan(0);
    expect(summary.categories.imagery).toBeGreaterThan(0);
    expect(summary.publicDemoSafeLayers).toBe(summary.totalLayers);
  });

  it("separates map-ready visual layers from preprocessing-only products", () => {
    const catalog = getMacroLayerCatalog();
    const mapReady = getMapReadyMacroLayers(catalog);
    const contours = catalog.find((layer) => layer.id === "terrain-contours");
    const landcover = catalog.find((layer) => layer.id === "vegetation-landcover");

    expect(mapReady.map((layer) => layer.id)).toContain("climate-weather");
    expect(mapReady.map((layer) => layer.id)).toContain("imagery-sentinel2");
    expect(contours?.preprocessingRequired).toBe(true);
    expect(contours?.limitations).toContain("precomputed");
    expect(landcover?.status).toBe("unavailable");
  });

  it("marks only analytical summary layers as H3-renderable overlays", () => {
    expect(isH3MacroLayer("climate-weather")).toBe(true);
    expect(isH3MacroLayer("hazard-flood-lowland")).toBe(true);
    expect(isH3MacroLayer("vegetation-ndvi")).toBe(true);
    expect(isH3MacroLayer("terrain-elevation")).toBe(false);
    expect(isH3MacroLayer("imagery-sentinel2")).toBe(false);
  });

  it("keeps vegetation as a first-class macro group", () => {
    const vegetationLayers = getMacroLayersByCategory(getMacroLayerCatalog(), "vegetation");

    expect(vegetationLayers.map((layer) => layer.id)).toEqual(
      expect.arrayContaining([
        "vegetation-ndvi",
        "vegetation-ndwi",
        "vegetation-landcover",
        "vegetation-crop-condition"
      ])
    );
  });
});

import { describe, expect, it } from "vitest";

import {
  createGeospatialPackagePlan,
  createPackageCacheKey,
  getGeospatialSourceRegistry,
  getPackageSourcesByLayer,
  normalizePackageAoi,
  validateGeospatialPackagePlan,
  VMESH_GEOSPATIAL_PACKAGE_MCP_TOOLS
} from "@/lib/geospatialPackage";

describe("geospatial package service", () => {
  it("normalizes coordinate AOIs into H3-backed package requests", () => {
    const aoi = normalizePackageAoi({
      centroid: { latitude: 38.7223, longitude: -9.1393 },
      label: "Lisbon"
    });

    expect(aoi.h3Id).toMatch(/^85/);
    expect(aoi.resolution).toBe(5);
    expect(aoi.bounds[0]).toBeLessThan(aoi.bounds[2]);
    expect(aoi.label).toBe("Lisbon");
  });

  it("registers open, gated, package-ready, and preprocessing sources by layer", () => {
    const sources = getGeospatialSourceRegistry({
      sen2srPmtilesUrl: "https://tiles.example.test/sentinel-sr.pmtiles"
    });
    const terrain = getPackageSourcesByLayer(sources, "terrain");
    const roads = getPackageSourcesByLayer(sources, "roads");
    const fields = getPackageSourcesByLayer(sources, "field-boundaries");
    const climate = getPackageSourcesByLayer(sources, "climate");

    expect(terrain.map((source) => source.id)).toContain("mapterhorn-pmtiles-terrain");
    expect(terrain.map((source) => source.id)).toContain("mapzen-joerd-terrarium");
    expect(terrain.map((source) => source.id)).toContain("usgs-3dep");
    expect(terrain.map((source) => source.id)).toContain("opentopography");
    expect(terrain.map((source) => source.id)).toContain("spain-cnig-mdt");
    expect(terrain.map((source) => source.id)).toContain("usgs-3dep-lpc-dsm");
    expect(terrain.map((source) => source.id)).toContain("canada-hrdem");
    expect(terrain.map((source) => source.id)).toContain("canada-hrdem-best-dtm");
    expect(terrain.map((source) => source.id)).toContain("canada-hrdem-dsm");
    expect(terrain.map((source) => source.id)).toContain("bc-lidarbc-dsm");
    expect(sources.find((source) => source.id === "usgs-3dep-lpc-dsm")?.truthRole).toBe(
      "surface-dsm"
    );
    expect(sources.find((source) => source.id === "canada-hrdem-dsm")?.truthRole).toBe(
      "surface-dsm"
    );
    expect(sources.find((source) => source.id === "bc-lidarbc-dsm")?.truthRole).toBe("surface-dsm");
    expect(roads.map((source) => source.id)).toContain("overture-maps-geoparquet");
    expect(roads.map((source) => source.id)).toContain("openinframap");
    expect(fields.map((source) => source.id)).toContain("fields-of-the-world");
    expect(sources.map((source) => source.id)).toContain("soilgrids");
    expect(sources.map((source) => source.id)).toContain("microsoft-building-footprints");
    expect(climate.map((source) => source.id)).toContain("open-meteo-forecast");
    expect(sources.find((source) => source.id === "fabdem-v1-2")?.status).toBe("license-gated");
    expect(
      sources.find((source) => source.id === "global-building-atlas-nc-lod1-height")?.status
    ).toBe("license-gated");
  });

  it("creates a source-honest package plan without selecting paid or token-gated sources", () => {
    const plan = createGeospatialPackagePlan(
      {
        aoi: {
          centroid: { latitude: 38.7223, longitude: -9.1393 },
          label: "Generic downstream AOI"
        },
        layers: [
          "terrain",
          "imagery",
          "roads",
          "buildings",
          "water",
          "vegetation",
          "climate",
          "hydrology",
          "field-boundaries"
        ],
        offline: true
      },
      {
        now: () => new Date("2026-05-12T00:00:00.000Z")
      }
    );

    expect(validateGeospatialPackagePlan(plan)).toBe(true);
    expect(plan.selectedSources.terrain?.id).toBe("mapterhorn-pmtiles-terrain");
    expect(plan.selectedSources.roads?.id).toBe("openstreetmap-pbf-extracts");
    expect(plan.selectedSources.buildings?.id).toBe("openstreetmap-pbf-extracts");
    expect(plan.selectedSources.climate?.id).toBe("open-meteo-forecast");
    expect(plan.selectedSources["field-boundaries"]?.id).toBe("fields-of-the-world");
    expect(plan.artifacts.some((artifact) => artifact.kind === "pmtiles")).toBe(true);
    expect(plan.artifacts.some((artifact) => artifact.kind === "h3-summary")).toBe(true);
    expect(plan.probes.some((probe) => probe.sourceId === "mapbox-satellite-global")).toBe(true);
    expect(
      plan.probes
        .filter((probe) => probe.selected)
        .every(
          (probe) =>
            probe.status !== "token-gated" &&
            probe.status !== "paid" &&
            probe.access !== "token-gated" &&
            probe.access !== "paid"
        )
    ).toBe(true);
  });

  it("does not let preferred gated or API-key sources override open defaults", () => {
    const imageryPlan = createGeospatialPackagePlan(
      {
        aoi: { h3Id: "85393363fffffff" },
        layers: ["imagery"],
        preferredSourceIds: ["mapbox-satellite-global"]
      },
      { mapboxConfigured: true }
    );
    const climatePlan = createGeospatialPackagePlan({
      aoi: { h3Id: "85393363fffffff" },
      layers: ["climate"],
      preferredSourceIds: ["era5-cds-reanalysis"]
    });

    expect(imageryPlan.selectedSources.imagery?.id).not.toBe("mapbox-satellite-global");
    expect(imageryPlan.selectedSources.imagery?.access).toBe("open");
    expect(climatePlan.selectedSources.climate?.id).toBe("open-meteo-forecast");
  });

  it("records the requested AOI disclosure precision separately from normalized centroids", () => {
    const h3Plan = createGeospatialPackagePlan({
      aoi: { h3Id: "85393363fffffff" },
      layers: ["terrain"]
    });
    const boundsPlan = createGeospatialPackagePlan({
      aoi: { bounds: [-9.3, 38.6, -9.0, 38.9] },
      layers: ["terrain"]
    });

    expect(h3Plan.aoi.centroid).toBeDefined();
    expect(h3Plan.aoiDisclosure).toBe("h3-cell");
    expect(h3Plan.manifest.aoiDisclosure).toBe("h3-cell");
    expect(boundsPlan.aoiDisclosure).toBe("bounds");
  });

  it("honors explicit open source preferences while preserving validation", () => {
    const plan = createGeospatialPackagePlan({
      aoi: { h3Id: "85393363fffffff" },
      layers: ["terrain"],
      preferredSourceIds: ["mapzen-joerd-terrarium"]
    });

    expect(plan.selectedSources.terrain?.id).toBe("mapzen-joerd-terrarium");
    expect(validateGeospatialPackagePlan(plan)).toBe(true);
  });

  it("prefers source-native USGS terrain for USA package AOIs by default", () => {
    const plan = createGeospatialPackagePlan({
      aoi: {
        centroid: { latitude: 39.74, longitude: -104.99 },
        label: "Denver public-safe AOI"
      },
      layers: ["terrain"]
    });

    expect(plan.selectedSources.terrain?.id).toBe("usgs-3dep");
    expect(plan.artifacts[0].sourceId).toBe("usgs-3dep");
    expect(plan.artifacts[0].status).toBe("planned");
  });

  it("prefers LidarBC before HRDEM for British Columbia package AOIs by default", () => {
    const plan = createGeospatialPackagePlan({
      aoi: {
        centroid: { latitude: 49.2827, longitude: -123.1207 },
        label: "Vancouver public-safe AOI"
      },
      layers: ["terrain"]
    });

    expect(plan.selectedSources.terrain?.id).toBe("bc-lidarbc");
    expect(plan.artifacts[0].sourceId).toBe("bc-lidarbc");
  });

  it("prefers strict Canada HRDEM for unambiguous non-BC Canada package AOIs by default", () => {
    const plan = createGeospatialPackagePlan({
      aoi: {
        centroid: { latitude: 62.454, longitude: -114.3718 },
        label: "Yellowknife public-safe AOI"
      },
      layers: ["terrain"]
    });

    expect(plan.selectedSources.terrain?.id).toBe("canada-hrdem");
    expect(plan.artifacts[0].sourceId).toBe("canada-hrdem");
  });

  it("keeps global fallback terrain outside USA and Canada", () => {
    const plan = createGeospatialPackagePlan({
      aoi: {
        centroid: { latitude: 38.7223, longitude: -9.1393 },
        label: "Lisbon public-safe AOI"
      },
      layers: ["terrain"]
    });

    expect(plan.selectedSources.terrain?.id).toBe("mapterhorn-pmtiles-terrain");
  });

  it("lets explicit terrain source preferences outrank regional defaults", () => {
    const plan = createGeospatialPackagePlan({
      aoi: {
        centroid: { latitude: 39.74, longitude: -104.99 },
        label: "Denver public-safe AOI"
      },
      layers: ["terrain"],
      preferredSourceIds: ["mapzen-joerd-terrarium"]
    });

    expect(plan.selectedSources.terrain?.id).toBe("mapzen-joerd-terrarium");
  });

  it("generates stable cache keys and a small MCP-style API descriptor", () => {
    expect(
      createPackageCacheKey({
        packageId: "vmesh-abc",
        layerId: "field-boundaries",
        sourceId: "Fields Of The World!"
      })
    ).toBe("vmesh-abc/field-boundaries/fields-of-the-world");
    expect(VMESH_GEOSPATIAL_PACKAGE_MCP_TOOLS.map((tool) => tool.name)).toContain(
      "vmesh.geospatial_package.plan_package"
    );
  });
});

import { describe, expect, it } from "vitest";

import {
  ABUNDANCE_SOURCE_HANDOFF_SCHEMA_VERSION,
  createAbundanceSourceHandoff
} from "@/lib/geospatialPackage";

const FIXED_NOW = () => new Date("2026-07-06T00:00:00.000Z");

describe("Abundance source handoff", () => {
  it("builds a recipe-first handoff for the Abundance 3 km source-slice frame", () => {
    const handoff = createAbundanceSourceHandoff(
      {
        aoi: {
          centroid: { latitude: 49.2827, longitude: -123.1207 },
          label: "Vancouver public-safe sample"
        },
        segments: ["terrain_elevation", "access_infrastructure", "soils_landcover"],
        consumerAppId: "building-abundance"
      },
      { now: FIXED_NOW }
    );

    expect(handoff.schemaVersion).toBe(ABUNDANCE_SOURCE_HANDOFF_SCHEMA_VERSION);
    expect(handoff.request).toMatchObject({
      consumerAppId: "building-abundance",
      edgeMeters: 3000,
      gridSize: 257
    });
    expect(handoff.frame).toMatchObject({
      role: "source-slice-frame",
      shape: "square",
      parcelBoundaryRole: "overlay-only"
    });
    expect(handoff.jurisdiction).toMatchObject({
      status: "h3-only",
      resolver: "pending",
      countryCode: null
    });
    expect(handoff.layers.map((layer) => layer.layerId)).toEqual([
      "terrain",
      "contours",
      "roads",
      "buildings",
      "landcover",
      "vegetation"
    ]);
    expect(handoff.warnings.join(" ")).toContain("not raw GIS payloads");
  });

  it("carries terrain adapter plans and a buildings worker handoff without materializing payloads", () => {
    const handoff = createAbundanceSourceHandoff(
      {
        aoi: {
          centroid: { latitude: 49.2827, longitude: -123.1207 },
          label: "Vancouver public-safe sample"
        },
        segments: ["terrain_elevation", "access_infrastructure"]
      },
      { now: FIXED_NOW }
    );
    const terrainLayer = handoff.layers.find((layer) => layer.layerId === "terrain");
    const buildingsLayer = handoff.layers.find((layer) => layer.layerId === "buildings");

    expect(handoff.terrainAdapterPlans.map((plan) => plan.selectedSource?.id)).toContain(
      "bc-lidarbc"
    );
    expect(handoff.terrain.selectedSourceIds).toContain("bc-lidarbc");
    expect(handoff.terrain.rejectedSourceIds).toContain("bc-lidarbc-dsm");
    expect(handoff.terrain.roles.map((role) => role.sourceRole)).toEqual(
      expect.arrayContaining(["bare-earth-dtm", "surface-dsm"])
    );
    expect(handoff.coverageEvidence.map((coverage) => coverage.sourceId)).toContain("bc-lidarbc");
    expect(terrainLayer?.recipes.map((recipe) => recipe.kind)).toContain("terrain-source-adapter");
    expect(terrainLayer?.recipes.every((recipe) => Array.isArray(recipe.parameterSlots))).toBe(
      true
    );
    expect(terrainLayer?.status).toMatch(/ready-to-execute|requires-worker/);
    expect(handoff.buildingWorkerHandoff?.schemaVersion).toBe("vmesh-building-package-worker-v1");
    expect(handoff.buildingWorkerHandoff?.workerRequest.output).toMatchObject({
      fileName: "buildings.json",
      status: "planned",
      featureCount: null
    });
    expect(buildingsLayer?.recipes[0]).toMatchObject({
      kind: "building-worker-handoff",
      status: "requires-worker",
      requiredWorker: "abundance"
    });
    expect(buildingsLayer?.warnings.join(" ")).toContain("Do not synthesize building footprints");
  });

  it("keeps parcel/property layers blocked when no reviewed source refs exist", () => {
    const handoff = createAbundanceSourceHandoff(
      {
        aoi: { h3Id: "85393363fffffff", label: "Public sample cell" },
        segments: ["land_property_planning"]
      },
      { now: FIXED_NOW }
    );
    const parcelsLayer = handoff.layers.find((layer) => layer.layerId === "parcels");

    expect(parcelsLayer).toMatchObject({
      layerId: "parcels",
      status: "blocked",
      selectedSourceIds: []
    });
    expect(parcelsLayer?.recipes[0]).toMatchObject({
      kind: "blocked-review",
      requiredWorker: "operator-review"
    });
    expect(handoff.gaps.join(" ")).toContain("land_property_planning");
  });

  it("blocks terrain outside promoted source-native coverage instead of using generic fallback truth", () => {
    const handoff = createAbundanceSourceHandoff(
      {
        aoi: {
          centroid: { latitude: 38.7223, longitude: -9.1393 },
          label: "Lisbon public-safe sample"
        },
        segments: ["terrain_elevation"]
      },
      { now: FIXED_NOW }
    );
    const terrainLayer = handoff.layers.find((layer) => layer.layerId === "terrain");

    expect(terrainLayer).toMatchObject({
      layerId: "terrain",
      status: "blocked",
      selectedSourceIds: []
    });
    expect(handoff.terrain.selectedSourceIds).toEqual([]);
    expect(handoff.gaps.join(" ")).toContain("fallback visual/generic terrain only");
  });

  it("emits parameterized recipe slots and avoids obvious secret or local-path refs", () => {
    const handoff = createAbundanceSourceHandoff(
      {
        aoi: { h3Id: "85393363fffffff", label: "Public sample cell" },
        segments: ["imagery_observation", "soils_landcover", "climate_weather"]
      },
      { now: FIXED_NOW }
    );
    const recipeSlots = handoff.layers.flatMap((layer) =>
      layer.recipes.flatMap((recipe) => recipe.parameterSlots)
    );
    const serialized = JSON.stringify(handoff);

    expect(recipeSlots).toEqual(expect.arrayContaining(["{bbox}", "{lat}", "{lon}", "{h3}"]));
    expect(serialized).not.toMatch(/signature=|access_token=|token=|secret/i);
    expect(serialized).not.toMatch(/[A-Z]:\\/);
    expect(serialized).not.toContain("file://");
  });
});

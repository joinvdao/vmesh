import { afterEach, describe, expect, it } from "vitest";

import {
  ABUNDANCE_SOURCE_HANDOFF_SCHEMA_VERSION,
  createAbundanceSourceHandoff,
  createLiveAbundanceSourceHandoff
} from "@/lib/geospatialPackage";

const FIXED_NOW = () => new Date("2026-07-06T00:00:00.000Z");
const EMPTY_FEATURES = { features: [] };
const KAMLOOPS_DEM_GRID_RESPONSE = {
  features: [
    {
      attributes: {
        OBJECTID: 42,
        CELLNAME: "5156",
        PHOTOGRIDLIMITS: "YES"
      }
    }
  ]
};
const CANADA_HRDEM_ONE_METER_STAC = {
  features: [
    {
      collection: "hrdem-mosaic-1m",
      id: "2_4-mosaic-1m",
      assets: {
        dtm: {
          href: "https://canelevation-dem.s3.ca-central-1.amazonaws.com/hrdem-mosaic-1m/2_4-mosaic-1m-dtm.tif",
          type: "image/tiff; application=geotiff; profile=cloud-optimized"
        }
      }
    }
  ]
};

afterEach(() => {
  delete process.env.VMESH_KAMLOOPS_LOCAL_LIDAR_MODE;
  delete process.env.VMESH_KAMLOOPS_LOCAL_LIDAR_GEOTIFF_URL;
  delete process.env.VMESH_KAMLOOPS_LOCAL_LIDAR_GEOTIFF_URL_TEMPLATE;
});

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

  it("can live-resolve a BC handoff to Canada HRDEM when LidarBC has no 1m tile", async () => {
    const requests: string[] = [];
    const fetchImpl: typeof fetch = async (url) => {
      const requestUrl = String(url);
      requests.push(requestUrl);
      if (
        requestUrl.includes("OpenDataAdminCad/MapServer/25/query") ||
        requestUrl.includes("LiDAR_BC_S3_Public")
      ) {
        return new Response(JSON.stringify(EMPTY_FEATURES), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify(CANADA_HRDEM_ONE_METER_STAC), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    };

    const handoff = await createLiveAbundanceSourceHandoff(
      {
        aoi: {
          centroid: { latitude: 50.64, longitude: -120.26 },
          label: "Kamloops public-safe neighbour"
        },
        segments: ["terrain_elevation", "access_infrastructure"],
        consumerAppId: "building-abundance"
      },
      { now: FIXED_NOW, terrainSourceAdapterOptions: { env: {}, fetchImpl } }
    );
    const terrainLayer = handoff.layers.find((layer) => layer.layerId === "terrain");

    expect(requests[0]).toContain("OpenDataAdminCad/MapServer/25/query");
    expect(requests[1]).toContain("LiDAR_BC_S3_Public");
    expect(requests[2]).toBe("https://datacube.services.geo.ca/stac/api/search");
    expect(handoff.terrain.selectedSourceIds).toEqual(["canada-hrdem"]);
    expect(terrainLayer?.selectedSourceIds).toEqual(["canada-hrdem"]);
    expect(handoff.terrainAdapterPlans[0]).toMatchObject({
      status: "ready",
      selectedSource: { id: "canada-hrdem" },
      toolProfile: { toolId: "canada-hrdem" }
    });
    expect(handoff.terrainAdapterPlans[0].inputRefs[0].url).toContain("mosaic-1m-dtm.tif");
  });

  it("can live-resolve Kamloops municipal DEM-grid coverage without treating VMesh as terrain storage", async () => {
    const requests: string[] = [];
    const fetchImpl: typeof fetch = async (url) => {
      requests.push(String(url));
      return new Response(JSON.stringify(KAMLOOPS_DEM_GRID_RESPONSE), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    };

    const handoff = await createLiveAbundanceSourceHandoff(
      {
        aoi: {
          centroid: { latitude: 50.64, longitude: -120.26 },
          label: "Kamloops public-safe municipal AOI"
        },
        segments: ["terrain_elevation"],
        consumerAppId: "building-abundance"
      },
      { now: FIXED_NOW, terrainSourceAdapterOptions: { env: {}, fetchImpl } }
    );

    expect(handoff.terrain.selectedSourceIds).toEqual(["kamloops-local-lidar-dtm-1m"]);
    expect(handoff.layers.find((layer) => layer.layerId === "terrain")).toMatchObject({
      status: "ready-to-execute",
      selectedSourceIds: ["kamloops-local-lidar-dtm-1m"]
    });
    expect(handoff.terrainAdapterPlans[0]).toMatchObject({
      status: "ready",
      selectedSource: { id: "kamloops-local-lidar-dtm-1m" },
      toolProfile: { toolId: "kamloops-local-lidar" }
    });
    expect(handoff.terrainAdapterPlans[0].inputRefs[0]).toMatchObject({
      kind: "source-index-required",
      role: "source-index"
    });
    expect(handoff.terrainAdapterPlans[0].inputRefs[0].notes.join(" ")).toContain(
      "DEM grid CELLNAME 5156"
    );
    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain("OpenDataAdminCad/MapServer/25/query");
    expect(handoff.warnings.join(" ")).toContain("source refs and recipes");
  });

  it("can live-resolve configured Kamloops municipal DTM override without treating VMesh as terrain storage", async () => {
    process.env.VMESH_KAMLOOPS_LOCAL_LIDAR_MODE = "configured-geotiff";
    const fetchImpl: typeof fetch = async () => {
      throw new Error("configured municipal DTM handoff should not call public catalogs");
    };

    const handoff = await createLiveAbundanceSourceHandoff(
      {
        aoi: {
          centroid: { latitude: 50.64, longitude: -120.26 },
          label: "Kamloops public-safe municipal AOI"
        },
        segments: ["terrain_elevation"],
        consumerAppId: "building-abundance"
      },
      {
        now: FIXED_NOW,
        terrainSourceAdapterOptions: {
          env: {},
          fetchImpl,
          kamloopsLocalLidarGeoTiffUrlTemplate:
            "https://terrain.example.test/kamloops/{packageId}.tif?bbox={bbox}"
        }
      }
    );

    expect(handoff.terrain.selectedSourceIds).toEqual(["kamloops-local-lidar-dtm-1m"]);
    expect(handoff.layers.find((layer) => layer.layerId === "terrain")).toMatchObject({
      status: "ready-to-execute",
      selectedSourceIds: ["kamloops-local-lidar-dtm-1m"]
    });
    expect(handoff.terrainAdapterPlans[0]).toMatchObject({
      status: "ready",
      selectedSource: { id: "kamloops-local-lidar-dtm-1m" },
      toolProfile: { toolId: "kamloops-local-lidar" }
    });
    expect(handoff.terrainAdapterPlans[0].inputRefs[0].url).toContain(
      "terrain.example.test/kamloops/"
    );
    expect(handoff.warnings.join(" ")).toContain("source refs and recipes");
  });

  it("keeps global live fallback terrain out of selected source truth", async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new Error("global fallback should not perform a source-native fetch");
    };
    const handoff = await createLiveAbundanceSourceHandoff(
      {
        aoi: {
          centroid: { latitude: 38.7223, longitude: -9.1393 },
          label: "Global fallback sample"
        },
        segments: ["terrain_elevation"]
      },
      { now: FIXED_NOW, terrainSourceAdapterOptions: { env: {}, fetchImpl } }
    );

    expect(handoff.terrain.selectedSourceIds).toEqual([]);
    expect(handoff.layers.find((layer) => layer.layerId === "terrain")).toMatchObject({
      status: "blocked",
      selectedSourceIds: []
    });
    expect(handoff.terrainAdapterPlans[0]).toMatchObject({
      status: "blocked",
      selectedSource: { id: "mapterhorn-pmtiles-terrain" }
    });
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

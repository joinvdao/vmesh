import { afterEach, describe, expect, it } from "vitest";

import {
  ABUNDANCE_SOURCE_HANDOFF_SCHEMA_VERSION,
  abundanceSourceSliceBoundsFromCentroid,
  createAbundanceSourceHandoff,
  createLiveAbundanceSourceHandoff,
  isSourceNativeTerrainAdapterSupported
} from "@/lib/geospatialPackage";

const FIXED_NOW = () => new Date("2026-07-06T00:00:00.000Z");
const EMPTY_FEATURES = { features: [] };
const KAMLOOPS_DEM_GRID_RESPONSE = {
  features: [
    {
      attributes: {
        OBJECTID: 42,
        CELLNAME: "5156B",
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
  it("preserves the physical width of centroid frames across the antimeridian", async () => {
    const bounds = abundanceSourceSliceBoundsFromCentroid({
      centroid: { latitude: 10, longitude: 179.999 },
      edgeMeters: 3_000
    });

    expect(bounds[0]).toBeGreaterThan(179);
    expect(bounds[2]).toBeLessThan(-179);
    expect(bounds[0]).toBeGreaterThan(bounds[2]);

    const handoff = await createLiveAbundanceSourceHandoff(
      {
        aoi: { centroid: { latitude: 10, longitude: 179.999 } },
        edgeMeters: 3_000,
        segments: ["terrain_elevation"]
      },
      {
        terrainSourceAdapterOptions: {
          env: {},
          fetchImpl: async () => {
            throw new Error("fallback plan should not fetch source-native data");
          }
        }
      }
    );
    expect(handoff.terrainAdapterPlans[0]?.bbox?.west).toBeGreaterThan(
      handoff.terrainAdapterPlans[0]?.bbox?.east ?? 180
    );
  });

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
      "soil",
      "landcover",
      "vegetation"
    ]);
    expect(handoff.sourceRanking.schemaVersion).toBe("vmesh-source-ranking-v1");
    expect(handoff.sourceRanking.layerDecisions.map((decision) => decision.layerId)).toEqual([
      "terrain",
      "contours",
      "roads",
      "buildings",
      "soil",
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

    const terrainDecision = handoff.sourceRanking.layerDecisions.find(
      (decision) => decision.layerId === "terrain"
    );
    const buildingsDecision = handoff.sourceRanking.layerDecisions.find(
      (decision) => decision.layerId === "buildings"
    );
    const roadsDecision = handoff.sourceRanking.layerDecisions.find(
      (decision) => decision.layerId === "roads"
    );

    expect(
      terrainDecision?.candidates.find((candidate) => candidate.sourceId === "bc-lidarbc")
    ).toMatchObject({
      rank: 2,
      dataType: "terrain",
      sourceSubType: "bare-earth-dtm"
    });
    expect(
      buildingsDecision?.candidates.find(
        (candidate) => candidate.sourceId === "overture-maps-geoparquet"
      )
    ).toMatchObject({
      rank: 2,
      dataType: "buildings",
      sourceSubType: "building-footprint"
    });
    expect(
      buildingsDecision?.candidates.find(
        (candidate) => candidate.sourceId === "openstreetmap-pbf-extracts"
      )
    ).toMatchObject({ rank: 3 });
    expect(
      roadsDecision?.candidates.find(
        (candidate) => candidate.sourceId === "overture-maps-geoparquet"
      )
    ).toMatchObject({ rank: 2, dataType: "roads" });
    expect(
      buildingsDecision?.candidates.find(
        (candidate) => candidate.sourceId === "openfreemap-vector-tiles"
      )
    ).toMatchObject({
      rank: 4,
      accessMode: "bounded-api",
      coverageStatus: "covers-aoi",
      providerId: "openfreemap-vector-tiles"
    });
    expect(
      roadsDecision?.candidates.find(
        (candidate) => candidate.sourceId === "openfreemap-vector-tiles"
      )
    ).toMatchObject({ rank: 4, dataType: "roads", processingCost: "low" });
  });

  it("returns independent ranked source decisions for the full 057 land-intelligence spine", () => {
    const handoff = createAbundanceSourceHandoff(
      {
        aoi: {
          centroid: { latitude: 49.2827, longitude: -123.1207 },
          label: "Vancouver public-safe full-spine sample"
        },
        segments: [
          "terrain_elevation",
          "access_infrastructure",
          "water_hydrology",
          "soils_landcover",
          "ecology_biodiversity_carbon",
          "land_property_planning"
        ],
        consumerAppId: "building-abundance"
      },
      { now: FIXED_NOW }
    );
    const decisions = new Map(
      handoff.sourceRanking.layerDecisions.map((decision) => [decision.layerId, decision])
    );

    expect(Array.from(decisions.keys())).toEqual(
      expect.arrayContaining([
        "terrain",
        "roads",
        "buildings",
        "water",
        "soil",
        "landcover",
        "vegetation",
        "ecology",
        "parcels"
      ])
    );
    expect(
      decisions.get("terrain")?.candidates.find((candidate) => candidate.sourceId === "bc-lidarbc")
    ).toMatchObject({
      dataType: "terrain",
      providerId: "bc-lidarbc",
      materializerId: "terrain:bc-lidarbc",
      retrievalMethod: "source-index",
      license: expect.any(String),
      coverageStatus: "exact-frame-rejected"
    });
    expect(
      decisions.get("soil")?.candidates.find((candidate) => candidate.sourceId === "soilgrids")
    ).toMatchObject({
      dataType: "soil",
      sourceSubType: "soil",
      materializerId: "environment:soil-context",
      retrievalMethod: "bulk-open-data"
    });
    expect(
      decisions
        .get("ecology")
        ?.candidates.find((candidate) => candidate.sourceId === "dynamic-world")
    ).toMatchObject({
      dataType: "ecology",
      materializerId: "environment:ecology-context"
    });
    expect(
      decisions
        .get("buildings")
        ?.candidates.find((candidate) => candidate.sourceId === "overture-maps-geoparquet")
    ).toMatchObject({
      dataType: "buildings",
      materializerId: "vectors:building-footprints"
    });
    expect(decisions.get("parcels")?.bestAvailableSourceId).toBe("official-parcel-gis");
    expect(decisions.get("soil")?.bestRank).not.toBe(decisions.get("terrain")?.bestRank);
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
      if (requestUrl.includes("LiDAR_BC_S3_Public")) {
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
          centroid: { latitude: 50.32, longitude: -122.8 },
          label: "BC public-safe HRDEM fallback sample"
        },
        segments: ["terrain_elevation", "access_infrastructure"],
        consumerAppId: "building-abundance"
      },
      { now: FIXED_NOW, terrainSourceAdapterOptions: { env: {}, fetchImpl } }
    );
    const terrainLayer = handoff.layers.find((layer) => layer.layerId === "terrain");

    expect(requests[0]).toContain("LiDAR_BC_S3_Public");
    expect(requests[1]).toBe("https://datacube.services.geo.ca/stac/api/search");
    expect(handoff.terrain.selectedSourceIds).toEqual(["canada-hrdem"]);
    expect(terrainLayer?.selectedSourceIds).toEqual(["canada-hrdem"]);
    expect(handoff.terrainAdapterPlans[0]).toMatchObject({
      status: "ready",
      selectedSource: { id: "canada-hrdem" },
      toolProfile: { toolId: "canada-hrdem" }
    });
    expect(handoff.terrainAdapterPlans[0].inputRefs[0].url).toContain("mosaic-1m-dtm.tif");
  });

  it("caps USGS ImageServer exports to the requested runtime grid", async () => {
    const handoff = await createLiveAbundanceSourceHandoff(
      {
        aoi: {
          centroid: { latitude: 39.7, longitude: -105 },
          label: "US public 3DEP sample"
        },
        segments: ["terrain_elevation"],
        gridSize: 257
      },
      {
        terrainSourceAdapterOptions: {
          env: {},
          fetchImpl: async () =>
            new Response(JSON.stringify({ features: [{ attributes: {} }] }), {
              status: 200,
              headers: { "Content-Type": "application/json" }
            })
        }
      }
    );
    const plan = handoff.terrainAdapterPlans.find(
      (candidate) => candidate.selectedSource?.id === "usgs-3dep"
    );
    const sourceUrl = new URL(plan?.inputRefs[0]?.url ?? "about:blank");

    expect(plan?.status).toBe("ready");
    expect(sourceUrl.searchParams.get("size")).toBe("257,257");
  });

  it("keeps Scotland index context but selects the executable global floor", async () => {
    const handoff = await createLiveAbundanceSourceHandoff(
      {
        aoi: {
          centroid: { latitude: 56.45, longitude: -3.69 },
          label: "Scotland public SRSP sample"
        },
        segments: ["terrain_elevation"],
        gridSize: 257
      },
      {
        includeFallbackTerrainPlans: true,
        terrainSourceAdapterOptions: { fetchImpl: async () => new Response(null) }
      }
    );
    const plan = handoff.terrainAdapterPlans.find(
      (candidate) => candidate.selectedSource?.id === "scottish-remote-sensing-lidar"
    );

    expect(handoff.terrain.selectedSourceIds).toEqual(["copernicus-dem-glo30"]);
    expect(plan).toMatchObject({
      status: "blocked",
      toolProfile: {
        toolId: "scottish-remote-sensing-lidar",
        crs: "EPSG:27700 / British National Grid",
        verticalDatum: "Ordnance Datum Newlyn"
      },
      inputRefs: [
        {
          kind: "source-index-required",
          role: "source-index"
        }
      ]
    });
  });

  it.each(["environment-agency-lidar-dtm", "scottish-remote-sensing-lidar", "os-terrain-50"])(
    "keeps the indexed UK source %s adapter-addressable through the BA handoff",
    (sourceId) => {
      expect(isSourceNativeTerrainAdapterSupported(sourceId)).toBe(true);
    }
  );

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
    const kamloopsRefs = handoff.terrainAdapterPlans[0].inputRefs;
    const dem5156BRef = kamloopsRefs.find((inputRef) => inputRef.url.includes("5156B.zip"));
    expect(dem5156BRef).toMatchObject({
      kind: "zip-archive",
      role: "terrain-source",
      format: "zip",
      url: "https://maps.kamloops.ca/opendata/DEM/2024_CGVD2013/DEM_CGVD2013_5156B.zip"
    });
    expect(dem5156BRef?.notes.join(" ")).toContain("DEM grid CELLNAME 5156B");
    expect(
      handoff.sourceRanking.layerDecisions
        .find((decision) => decision.layerId === "terrain")
        ?.candidates.find((candidate) => candidate.sourceId === "kamloops-local-lidar-dtm-1m")
    ).toMatchObject({
      selected: true,
      rank: 2,
      coverageStatus: "exact-frame-source-ref",
      accessMode: "official-download-archive",
      processingCost: "medium",
      crs: "EPSG:26910 / NAD83(CSRS) UTM Zone 10N",
      verticalDatum: "CGVD2013"
    });
    expect(requests.length).toBeGreaterThan(2);
    expect(requests[0]).toContain("FeatureDataset/GIS_Administrative_1/MapServer/6/query");
    expect(requests[0]).toContain("geometryType=esriGeometryEnvelope");
    expect(requests).toContain(
      "https://maps.kamloops.ca/opendata/DEM/2024_CGVD2013/DEM_CGVD2013_5156B.zip"
    );
    const geometry = new URL(requests[0]).searchParams.get("geometry")?.split(",").map(Number);
    expect(geometry).toHaveLength(4);
    if (!geometry) throw new Error("Expected Kamloops DEM query geometry.");
    const [west, south, east, north] = geometry;
    expect(east - west).toBeLessThan(0.05);
    expect(north - south).toBeLessThan(0.04);
    expect(
      handoff.baPackage.h3Context.bounds[2] - handoff.baPackage.h3Context.bounds[0]
    ).toBeLessThan(0.05);
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
    expect(
      handoff.sourceRanking.layerDecisions
        .find((decision) => decision.layerId === "terrain")
        ?.candidates.find((candidate) => candidate.sourceId === "kamloops-local-lidar-dtm-1m")
    ).toMatchObject({
      selected: true,
      rank: 1,
      accessMode: "source-native-cog-or-geotiff",
      processingCost: "low"
    });
    expect(handoff.warnings.join(" ")).toContain("source refs and recipes");
  });

  it("keeps unavailable global terrain out of selected source truth", async () => {
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
      selectedSource: { id: "copernicus-dem-glo30" }
    });
    expect(
      handoff.sourceRanking.layerDecisions
        .find((decision) => decision.layerId === "terrain")
        ?.candidates.find((candidate) => candidate.sourceId === "mapterhorn-pmtiles-terrain")
    ).toMatchObject({
      rank: 8,
      confidenceTier: "fallback",
      materializerId: "terrain:mapterhorn-pmtiles",
      workerAction: "fallback visual terrain/context only; do not claim source truth"
    });
    expect(handoff.gaps.join(" ")).toContain("fallback visual/generic terrain only");
  });

  it("returns verified Copernicus COGs as the executable global terrain floor", async () => {
    const fetchImpl: typeof fetch = async (_input, init) => {
      expect(init?.method).toBe("HEAD");
      return new Response(null, { status: 200 });
    };
    const handoff = await createLiveAbundanceSourceHandoff(
      {
        aoi: {
          centroid: { latitude: -33.92, longitude: 18.42 },
          label: "Global terrain sample"
        },
        segments: ["terrain_elevation"]
      },
      { now: FIXED_NOW, terrainSourceAdapterOptions: { env: {}, fetchImpl } }
    );

    expect(handoff.terrain.selectedSourceIds).toEqual(["copernicus-dem-glo30"]);
    expect(handoff.layers.find((layer) => layer.layerId === "terrain")).toMatchObject({
      status: "ready-to-execute",
      selectedSourceIds: ["copernicus-dem-glo30"]
    });
    expect(handoff.terrainAdapterPlans[0]).toMatchObject({
      status: "ready",
      runClass: "configured",
      selectedSource: { id: "copernicus-dem-glo30" },
      inputRefs: [{ kind: "s3-cog", groundModelRole: "surface-dsm" }]
    });
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

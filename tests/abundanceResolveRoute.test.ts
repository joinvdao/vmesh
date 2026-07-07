import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "@/app/api/geospatial-package/resolve/route";
import { probeTerrainCogCoordinate } from "@/lib/terrainSourceProbeWorker";

vi.mock("@/lib/terrainSourceProbeWorker", () => ({
  probeTerrainCogCoordinate: vi.fn()
}));

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/geospatial-package/resolve", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

const lidarBcOneMeterDemResponse = {
  features: [
    {
      attributes: {
        filename: "bc_092g025_3_4_2_xli1m_utm10_20250826_20250826.tif",
        maptile: "092g025_3_4_2",
        spacing: "1 metre",
        year: 2025,
        s3Url:
          "https://nrs.objectstore.gov.bc.ca/gdwuts/092/092g/2025/dem/bc_092g025_3_4_2_xli1m_utm10_20250826_20250826.tif",
        projection: "utm10"
      }
    }
  ]
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(probeTerrainCogCoordinate).mockReset();
});

describe("Abundance resolver route", () => {
  it("returns a terrain-first 3 km Abundance handoff from GET coordinates", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/geospatial-package/resolve?lat=49.2827&lng=-123.1207&consumer=abundance&segments=terrain_elevation,access_infrastructure"
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.schemaVersion).toBe("vmesh-abundance-source-handoff-v1");
    expect(payload.request).toMatchObject({
      consumerAppId: "building-abundance",
      edgeMeters: 3000,
      gridSize: 257
    });
    expect(payload.layers[0]).toMatchObject({
      layerId: "terrain",
      selectedSourceIds: ["bc-lidarbc"]
    });
    expect(
      payload.buildingWorkerHandoff.workerRequest.sourceLadder.every(
        (source: { workerRole: string }) => source.workerRole !== "review-required"
      )
    ).toBe(true);
  });

  it("requires source-pixel proof before live terrain marks a BC DTM candidate ready", async () => {
    const requests: string[] = [];
    vi.stubGlobal("fetch", async (url: RequestInfo | URL) => {
      requests.push(String(url));
      return new Response(JSON.stringify(lidarBcOneMeterDemResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    });
    vi.mocked(probeTerrainCogCoordinate).mockResolvedValue({
      runClass: "live-proof",
      providerId: "bc-lidarbc",
      role: "dtm",
      groundModelRole: "bare-earth-dtm",
      status: "covered",
      resolutionMeters: 1,
      coverageSourceIds: ["bc-lidarbc:dtm:092g025_3_4_2:2025"],
      sourceAsset: null,
      renderedArtifact: null,
      reasons: []
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/geospatial-package/resolve?lat=49.2827&lng=-123.1207&consumer=abundance&segments=terrain_elevation&liveTerrain=1"
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.terrain.selectedSourceIds).toEqual(["bc-lidarbc"]);
    expect(payload.terrainAdapterPlans[0].warnings.join(" ")).toContain(
      "Source pixel coverage probe proved"
    );
    expect(requests).toHaveLength(1);
    expect(vi.mocked(probeTerrainCogCoordinate)).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: "bc-lidarbc",
        role: "dtm",
        allowTwoMeterFallback: false
      })
    );
  });

  it("preserves H3 disclosure and parcel boundary as redacted overlay context on POST", async () => {
    const response = await POST(
      jsonRequest({
        aoi: { h3Id: "85393363fffffff", label: "Public sample cell" },
        segments: ["terrain_elevation", "land_property_planning"],
        parcelBoundary: {
          type: "Polygon",
          coordinates: [
            [
              [-114.1, 51.0],
              [-114.0, 51.0],
              [-114.0, 51.1],
              [-114.1, 51.1],
              [-114.1, 51.0]
            ]
          ]
        },
        parcelBoundaryLabel: "Selected parcel"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.baPackage.h3Context.coordinateDisclosure).toBe("h3-cell");
    expect(payload.parcelBoundaryContext).toMatchObject({
      provided: true,
      role: "overlay-only",
      coordinateDisclosure: "redacted-request-geometry",
      vertexCount: 5,
      label: "Selected parcel"
    });
    expect(payload.frame).toMatchObject({
      edgeMeters: 3000,
      parcelBoundaryRole: "overlay-only"
    });
    expect(
      payload.layers.find((layer: { layerId: string }) => layer.layerId === "parcels")
    ).toMatchObject({
      status: "blocked"
    });
  });

  it("labels fallback terrain gaps instead of returning generic DEM as selected truth", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/geospatial-package/resolve?lat=38.7223&lng=-9.1393&segments=terrain_elevation"
      )
    );
    const payload = await response.json();
    const terrainLayer = payload.layers.find(
      (layer: { layerId: string }) => layer.layerId === "terrain"
    );

    expect(response.status).toBe(200);
    expect(terrainLayer).toMatchObject({
      status: "blocked",
      selectedSourceIds: []
    });
    expect(payload.gaps.join(" ")).toContain("fallback visual/generic terrain only");
  });

  it("does not expose obvious secret-bearing refs or local paths", async () => {
    const response = await POST(
      jsonRequest({
        aoi: { h3Id: "85393363fffffff" },
        segments: ["imagery_observation", "soils_landcover", "climate_weather"]
      })
    );
    const serialized = JSON.stringify(await response.json());

    expect(response.status).toBe(200);
    expect(serialized).not.toMatch(/signature=|access_token=|token=|secret/i);
    expect(serialized).not.toMatch(/[A-Z]:\\/);
    expect(serialized).not.toContain("file://");
  });

  it("reports public-safe resolver capability across required sample regions", async () => {
    const samples = [
      {
        label: "usa-high-resolution",
        lat: 39.74,
        lng: -104.99,
        expectedTerrain: "usgs-3dep"
      },
      {
        label: "bc-lidarbc",
        lat: 49.2827,
        lng: -123.1207,
        expectedTerrain: "bc-lidarbc"
      },
      {
        label: "canada-non-bc-hrdem",
        lat: 62.454,
        lng: -114.3718,
        expectedTerrain: "canada-hrdem"
      },
      {
        label: "england",
        lat: 51.5074,
        lng: -0.1278,
        expectedTerrain: null
      },
      {
        label: "scotland",
        lat: 56.0,
        lng: -3.5,
        expectedTerrain: null
      },
      {
        label: "generic-fallback",
        lat: 38.7223,
        lng: -9.1393,
        expectedTerrain: null
      }
    ];

    const matrix = [];
    for (const sample of samples) {
      const response = await GET(
        new NextRequest(
          `http://localhost/api/geospatial-package/resolve?lat=${sample.lat}&lng=${sample.lng}&segments=terrain_elevation,access_infrastructure,soils_landcover`
        )
      );
      const payload = await response.json();
      const terrainLayer = payload.layers.find(
        (layer: { layerId: string }) => layer.layerId === "terrain"
      );
      matrix.push({
        label: sample.label,
        terrain: payload.terrain.selectedSourceIds[0] ?? null,
        status: terrainLayer.status,
        vectorStatus: payload.layers.find((layer: { layerId: string }) => layer.layerId === "roads")
          .status,
        gaps: payload.gaps
      });
    }

    expect(matrix).toEqual([
      expect.objectContaining({ label: "usa-high-resolution", terrain: "usgs-3dep" }),
      expect.objectContaining({ label: "bc-lidarbc", terrain: "bc-lidarbc" }),
      expect.objectContaining({ label: "canada-non-bc-hrdem", terrain: "canada-hrdem" }),
      expect.objectContaining({ label: "england", terrain: null, status: "blocked" }),
      expect.objectContaining({ label: "scotland", terrain: null, status: "blocked" }),
      expect.objectContaining({ label: "generic-fallback", terrain: null, status: "blocked" })
    ]);
    expect(matrix.every((row) => row.vectorStatus === "requires-worker")).toBe(true);
    expect(
      matrix
        .filter((row) => row.terrain === null)
        .every((row) => row.gaps.join(" ").includes("fallback visual/generic terrain only"))
    ).toBe(true);
  });
});

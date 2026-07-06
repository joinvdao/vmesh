import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET, POST } from "@/app/api/geospatial-package/resolve/route";

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/geospatial-package/resolve", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

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

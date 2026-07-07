import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/geospatial-package/kamloops-terrain-preflight/route";

const fullCoverageDemGridResponse = {
  features: [
    {
      attributes: {
        OBJECTID: 42,
        CELLNAME: "5156B",
        PHOTOGRIDLIMITS: "YES"
      }
    },
    {
      attributes: {
        OBJECTID: 43,
        CELLNAME: "5156C",
        PHOTOGRIDLIMITS: "YES"
      }
    }
  ]
};

const partialCoverageDemGridResponse = {
  features: [
    {
      attributes: {
        OBJECTID: 42,
        CELLNAME: "5156B",
        PHOTOGRIDLIMITS: "YES"
      }
    },
    {
      attributes: {
        OBJECTID: 44,
        CELLNAME: "5156D",
        PHOTOGRIDLIMITS: "NO"
      }
    }
  ]
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Kamloops terrain preflight route", () => {
  it("reports source-backed coverage for a 3 km slice whose municipal DEM cells are downloadable", async () => {
    const requests: string[] = [];
    vi.stubGlobal("fetch", async (url: RequestInfo | URL) => {
      requests.push(String(url));
      return new Response(JSON.stringify(fullCoverageDemGridResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/geospatial-package/kamloops-terrain-preflight?lat=50.64&lng=-120.26&consumer=abundance"
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      schemaVersion: "vmesh-kamloops-municipal-dem-coverage-preflight-v1",
      status: "source-backed",
      sourceBacked: true,
      rasterBacked: true,
      derivedElevationBacked: false,
      goldenQualityTerrainCandidate: true,
      terrainSourceId: "kamloops-local-lidar-dtm-1m",
      role: "bare-earth-dtm",
      resolutionMeters: 1,
      selectedSourceIds: ["kamloops-local-lidar-dtm-1m"],
      inputRefCount: 2,
      inputRefKinds: ["zip-archive"],
      request: {
        edgeMeters: 3000,
        gridSize: 257
      },
      frame: {
        role: "source-slice-frame",
        shape: "square",
        parcelBoundaryRole: "overlay-only"
      }
    });
    expect(payload.cells.downloadable.map((cell: { cellName: string }) => cell.cellName)).toEqual([
      "5156B",
      "5156C"
    ]);
    expect(payload.cells.nonDownloadable).toEqual([]);
    expect(payload.goldenQualityBlockers).toEqual([]);
    expect(requests).toHaveLength(3);
    expect(requests[0]).toContain("FeatureDataset/GIS_Administrative_1/MapServer/6/query");
    expect(requests[0]).toContain("geometryType=esriGeometryEnvelope");
    expect(requests.slice(1)).toEqual([
      "https://maps.kamloops.ca/opendata/DEM/2024_CGVD2013/DEM_CGVD2013_5156B.zip",
      "https://maps.kamloops.ca/opendata/DEM/2024_CGVD2013/DEM_CGVD2013_5156C.zip"
    ]);
  });

  it("selects the contour-derived municipal rail when the exact slice intersects non-downloadable DEM cells", async () => {
    vi.stubGlobal("fetch", async (url: RequestInfo | URL) => {
      const requestUrl = String(url);
      if (requestUrl.includes("/opendata/DEM/2024_CGVD2013/")) {
        return new Response(null, {
          status: requestUrl.includes("DEM_CGVD2013_5156D.zip") ? 404 : 200
        });
      }
      return new Response(JSON.stringify(partialCoverageDemGridResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/geospatial-package/kamloops-terrain-preflight?lat=50.68&lng=-120.23"
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      status: "source-backed",
      sourceBacked: true,
      rasterBacked: false,
      derivedElevationBacked: true,
      contourDerived: true,
      pointBreakDerived: true,
      goldenQualityTerrainCandidate: false,
      selectedSourceIds: ["kamloops-local-lidar-dtm-1m"],
      inputRefKinds: ["zip-archive", "arcgis-feature-query"]
    });
    expect(payload.cells.downloadable.map((cell: { cellName: string }) => cell.cellName)).toEqual([
      "5156B"
    ]);
    expect(
      payload.cells.nonDownloadable.map((cell: { cellName: string }) => cell.cellName)
    ).toEqual(["5156D"]);
    expect(payload.warnings.join(" ")).toContain("non-downloadable raster cell");
    expect(payload.goldenQualityBlockers.join(" ")).toContain("DEMPoint/DEMBreakline-derived");
    expect(payload.goldenQualityBlockers.join(" ")).toContain("contour-derived");
    expect(payload.nextActions.join(" ")).toContain("derived-elevation");
    expect(payload.nextActions.join(" ")).toContain("not label this path as a 1m LiDAR raster");
    expect(payload.suggestedSourceBackedFrame).toBeNull();
  });

  it("suggests a nearby golden-quality frame when the exact slice is derived-only", async () => {
    let gridQueryCount = 0;
    vi.stubGlobal("fetch", async (url: RequestInfo | URL) => {
      const requestUrl = String(url);
      if (requestUrl.includes("/opendata/DEM/2024_CGVD2013/")) {
        return new Response(null, {
          status: requestUrl.includes("DEM_CGVD2013_5156D.zip") ? 404 : 200
        });
      }
      gridQueryCount += 1;
      return new Response(
        JSON.stringify(
          gridQueryCount === 1 ? partialCoverageDemGridResponse : fullCoverageDemGridResponse
        ),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/geospatial-package/kamloops-terrain-preflight?lat=50.68&lng=-120.23&suggestion=1&suggestionStepMeters=250&suggestionMaxMeters=250&suggestionLimit=1"
      )
    );
    const payload = await response.json();
    const serialized = JSON.stringify(payload);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      status: "source-backed",
      sourceBacked: true,
      rasterBacked: false,
      derivedElevationBacked: true,
      goldenQualityTerrainCandidate: false,
      inputRefKinds: ["zip-archive", "arcgis-feature-query"],
      suggestedGoldenQualityFrame: {
        status: "available",
        centerDisclosure: "relative-offset-only",
        rasterBacked: true,
        rasterZipVerified: true,
        goldenQualityTerrainCandidate: true,
        downloadableCellCount: 2,
        nonDownloadableCellCount: 0
      },
      suggestedSourceBackedFrame: {
        status: "available",
        rasterBacked: true,
        rasterZipVerified: true,
        goldenQualityTerrainCandidate: true
      }
    });
    expect(gridQueryCount).toBe(2);
    expect(serialized).not.toContain("50.68");
    expect(serialized).not.toContain("-120.23");
  });

  it("requires explicit coordinates", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/geospatial-package/kamloops-terrain-preflight")
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("lat and lng");
  });
});

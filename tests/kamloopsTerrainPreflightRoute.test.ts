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
    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain("FeatureDataset/GIS_Administrative_1/MapServer/6/query");
    expect(requests[0]).toContain("geometryType=esriGeometryEnvelope");
  });

  it("fails the source-backed claim quickly when the exact slice intersects non-downloadable cells", async () => {
    vi.stubGlobal("fetch", async () => {
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
      status: "partial",
      sourceBacked: false,
      selectedSourceIds: []
    });
    expect(payload.cells.downloadable.map((cell: { cellName: string }) => cell.cellName)).toEqual([
      "5156B"
    ]);
    expect(
      payload.cells.nonDownloadable.map((cell: { cellName: string }) => cell.cellName)
    ).toEqual(["5156D"]);
    expect(payload.blockedReasons.join(" ")).toContain("non-downloadable");
    expect(payload.nextActions.join(" ")).toContain("Do not claim golden-quality terrain");
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

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/geospatial-package/kamloops-terrain-coverage/route";

const ORIGINAL_CWD = process.cwd();

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
        OBJECTID: 52,
        CELLNAME: "5257B",
        PHOTOGRIDLIMITS: "YES"
      }
    },
    {
      attributes: {
        OBJECTID: 53,
        CELLNAME: "5357D",
        PHOTOGRIDLIMITS: "NO"
      }
    }
  ]
};

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/geospatial-package/kamloops-terrain-coverage", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  process.chdir(ORIGINAL_CWD);
});

describe("Kamloops terrain coverage route", () => {
  it("uses the operator manifest before probing public DEM grid cells", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "vmesh-kamloops-manifest-"));
    await mkdir(path.join(tempRoot, "config", "operator-sources"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "config", "operator-sources", "kamloops-terrain.manifest.json"),
      JSON.stringify({
        schemaVersion: "vmesh-kamloops-operator-terrain-source-manifest-v1",
        sources: [
          {
            id: "kamloops-municipal-dtm-cog-route-fixture",
            sourceId: "kamloops-local-lidar-dtm-1m",
            role: "bare-earth-dtm",
            resolutionMeters: 1,
            crs: "EPSG:26910",
            verticalDatum: "CGVD2013",
            coverage: {
              west: -121,
              south: 50,
              east: -120,
              north: 51
            },
            qa: {
              sourceNativeRaster: true,
              coverageStatus: "contains-aoi",
              maxNoDataRatio: 0
            },
            source: {
              url: "https://terrain.example.test/kamloops/municipal-dtm-1m.cog.tif"
            }
          }
        ]
      })
    );
    process.chdir(tempRoot);

    const fetchImpl = vi.fn(async () => {
      throw new Error("manifest-backed coverage should not call the public DEM grid");
    });
    vi.stubGlobal("fetch", fetchImpl);

    try {
      const response = await POST(
        jsonRequest({
          samples: [{ id: "manifest-covered", lat: 50.64, lng: -120.26 }],
          consumer: "abundance"
        })
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(fetchImpl).not.toHaveBeenCalled();
      expect(payload.operatorTerrainManifest).toMatchObject({
        status: "loaded",
        pathDisclosure: "relative-conventional-path-only"
      });
      expect(payload.summary).toMatchObject({
        sourceBackedCount: 1,
        rasterBackedCount: 1,
        goldenQualityCandidateCount: 1,
        blockedCount: 0
      });
      expect(payload.samples).toEqual([
        expect.objectContaining({
          id: "manifest-covered",
          status: "source-backed",
          sourceBacked: true,
          rasterBacked: true,
          derivedElevationBacked: false,
          goldenQualityTerrainCandidate: true,
          downloadableCellCount: 0,
          nonDownloadableCellCount: 0,
          selectedSourceIds: ["kamloops-local-lidar-dtm-1m"]
        })
      ]);
    } finally {
      process.chdir(ORIGINAL_CWD);
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("classifies a batch of candidate centers without echoing coordinates", async () => {
    let gridQueryCount = 0;
    vi.stubGlobal("fetch", async (url: RequestInfo | URL) => {
      const requestUrl = String(url);
      if (requestUrl.includes("/opendata/DEM/2024_CGVD2013/")) {
        return new Response(null, {
          status: requestUrl.includes("DEM_CGVD2013_5357D.zip") ? 404 : 200
        });
      }
      if (requestUrl.includes("/opendata/Lidar/2024/")) {
        return new Response(null, { status: 404 });
      }
      if (requestUrl.includes("/CityWorks/UtilityBaseMap/MapServer/4/query")) {
        return new Response(JSON.stringify({ count: 12 }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      gridQueryCount += 1;
      return new Response(
        JSON.stringify(
          gridQueryCount === 1 ? fullCoverageDemGridResponse : partialCoverageDemGridResponse
        ),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    });

    const response = await POST(
      jsonRequest({
        samples: [
          { id: "covered-cell", lat: 50.64, lng: -120.26 },
          { id: "partial-cell", lat: 50.68, lng: -120.23 }
        ],
        consumer: "abundance"
      })
    );
    const payload = await response.json();
    const serialized = JSON.stringify(payload);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      schemaVersion: "vmesh-kamloops-municipal-dem-coverage-batch-v1",
      request: {
        edgeMeters: 3000,
        gridSize: 257,
        sampleCount: 2
      },
      privacy: {
        exactCoordinatesEchoed: false,
        callerOwnedSampleIdsOnly: true
      },
      summary: {
        sourceBackedCount: 2,
        rasterBackedCount: 2,
        goldenQualityCandidateCount: 1,
        partialCount: 0,
        blockedCount: 0
      }
    });
    expect(payload.samples).toEqual([
      expect.objectContaining({
        id: "covered-cell",
        status: "source-backed",
        sourceBacked: true,
        rasterBacked: true,
        rasterZipVerified: true,
        rasterSourceVerified: true,
        rawLidarDtmMaterializerReady: false,
        derivedElevationBacked: false,
        goldenQualityTerrainCandidate: true,
        downloadableCellCount: expect.any(Number),
        nonDownloadableCellCount: 0,
        selectedSourceIds: ["kamloops-local-lidar-dtm-1m"]
      }),
      expect.objectContaining({
        id: "partial-cell",
        status: "source-backed",
        sourceBacked: true,
        rasterBacked: true,
        rasterZipVerified: true,
        rasterSourceVerified: true,
        rawLidarArchiveBacked: false,
        rawLidarZipVerified: false,
        missingRasterCellsRawLidarVerified: false,
        rawLidarDtmMaterializerReady: false,
        derivedElevationBacked: true,
        derivedElevationSupport: "supported",
        contourSupportFeatureCount: 12,
        goldenQualityTerrainCandidate: false,
        downloadableCellCount: expect.any(Number),
        nonDownloadableCellCount: expect.any(Number),
        selectedSourceIds: ["kamloops-local-lidar-dtm-1m"],
        goldenQualityBlockers: expect.arrayContaining([
          expect.stringContaining("non-downloadable"),
          expect.stringContaining("contour-derived")
        ]),
        warnings: expect.arrayContaining([expect.stringContaining("contour")])
      })
    ]);
    expect(serialized).not.toContain("50.64");
    expect(serialized).not.toContain("-120.26");
    expect(serialized).not.toContain("50.68");
    expect(serialized).not.toContain("-120.23");
  });

  it("marks invalid and out-of-envelope samples without calling the municipal endpoint", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("coverage route should not fetch invalid or outside samples");
    });
    vi.stubGlobal("fetch", fetchImpl);

    const response = await POST(
      jsonRequest({
        samples: [
          { id: "bad", lat: "not-a-number", lng: -120.26 },
          { id: "outside", lat: 49.0, lng: -123.0 }
        ]
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(payload.summary).toMatchObject({
      sourceBackedCount: 0,
      rasterBackedCount: 0,
      goldenQualityCandidateCount: 0,
      partialCount: 0,
      blockedCount: 2
    });
    expect(payload.samples).toEqual([
      expect.objectContaining({
        id: "bad",
        status: "invalid-coordinate",
        sourceBacked: false,
        rasterBacked: false,
        goldenQualityTerrainCandidate: false
      }),
      expect.objectContaining({
        id: "outside",
        status: "outside-kamloops-municipal-index",
        sourceBacked: false,
        rasterBacked: false,
        goldenQualityTerrainCandidate: false
      })
    ]);
  });

  it("bounds request size", async () => {
    const response = await POST(
      jsonRequest({
        samples: Array.from({ length: 65 }, (_, index) => ({
          id: `candidate-${index}`,
          lat: 50.6,
          lng: -120.3
        }))
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("between 1 and 64");
  });
});

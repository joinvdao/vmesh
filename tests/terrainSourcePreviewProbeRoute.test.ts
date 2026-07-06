import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/terrain/source-preview/probe/route";
import {
  probeTerrainCogCoordinate,
  type TerrainCogProbeWorkerResult
} from "@/lib/terrainSourceProbeWorker";

vi.mock("@/lib/terrainSourceProbeWorker", () => ({
  probeTerrainCogCoordinate: vi.fn()
}));

function cogProbeResult({
  providerId,
  role = "dtm",
  status = "covered",
  resolutionMeters = 1,
  sourceId = "source:test"
}: {
  providerId: "bc-lidarbc" | "canada-hrdem";
  role?: "dtm" | "dsm";
  status?: "covered" | "blocked" | "failed";
  resolutionMeters?: number | null;
  sourceId?: string;
}): TerrainCogProbeWorkerResult {
  return {
    schemaVersion: "vmesh-terrain-cog-probe-v1",
    runClass: "live-proof",
    providerId,
    role,
    groundModelRole: role === "dtm" ? "bare-earth-dtm" : "surface-dsm",
    status,
    resolutionMeters,
    coverageSourceIds: status === "covered" || sourceId ? [sourceId] : [],
    sourceAsset:
      status === "covered" || sourceId
        ? {
            collection: providerId === "bc-lidarbc" ? "LiDAR_BC_S3_Public" : "hrdem-mosaic-1m",
            id: sourceId,
            assetRole: role,
            href: `https://example.test/${sourceId}.tif`,
            type: "image/tiff"
          }
        : null,
    renderedArtifact: null,
    reasons: status === "covered" ? [] : [`${sourceId} did not prove source pixels.`]
  };
}

describe("terrain source preview probe route", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(probeTerrainCogCoordinate).mockReset();
  });

  it("prefers LidarBC for southern BC coordinates before the coarse USA bbox can match", async () => {
    vi.mocked(probeTerrainCogCoordinate).mockResolvedValue(
      cogProbeResult({
        providerId: "bc-lidarbc",
        sourceId: "bc-lidarbc:dtm:092g025_3_4_2:2025"
      })
    );

    const response = await GET(
      new NextRequest(
        "http://localhost/api/terrain/source-preview/probe?lat=49.2827&lon=-123.1207&role=dtm"
      )
    );
    const body = (await response.json()) as {
      status: string;
      providerId: string;
      coverageSourceIds: string[];
      tileUrlTemplate: string | null;
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("covered");
    expect(body.providerId).toBe("bc-lidarbc");
    expect(body.coverageSourceIds[0]).toBe("bc-lidarbc:dtm:092g025_3_4_2:2025");
    expect(body.tileUrlTemplate).toBe("/api/terrain/source-preview/bc-lidarbc/dtm/{z}/{x}/{y}");
    expect(vi.mocked(probeTerrainCogCoordinate)).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: "bc-lidarbc",
        role: "dtm",
        coordinate: { latitude: 49.2827, longitude: -123.1207 }
      })
    );
  });

  it("falls through to USGS when a coordinate in the broad BC bbox has no LidarBC source pixels", async () => {
    vi.mocked(probeTerrainCogCoordinate).mockResolvedValue(
      cogProbeResult({
        providerId: "bc-lidarbc",
        status: "blocked",
        resolutionMeters: null,
        sourceId: "bc-lidarbc:gap"
      })
    );
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("3DEPElevationIndex/MapServer/1/query")) {
        return Response.json({ features: [{ attributes: { resolution: "1 meter" } }] });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new NextRequest(
        "http://localhost/api/terrain/source-preview/probe?lat=48.76&lon=-122.49&role=dtm"
      )
    );
    const body = (await response.json()) as { status: string; providerId: string };

    expect(response.status).toBe(200);
    expect(body.status).toBe("covered");
    expect(body.providerId).toBe("usgs-3dep");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses USGS source DEM evidence when the 1m product index misses a valid source DEM", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("3DEPElevationIndex/MapServer/1/query")) {
        return Response.json({ features: [] });
      }
      if (url.includes("3DEPElevationIndex/MapServer/11/query")) {
        return Response.json({
          features: [
            {
              attributes: {
                OBJECTID: 646,
                workunit: "AK_Anchorage_2015",
                project: "Anchorage_Lidar",
                collect_end: 1475107200000,
                ql: "QL 2",
                spec: "USGS Lidar Base Specification 1.2",
                p_method: "linear-mode lidar",
                dem_gsd_meters: 1,
                horiz_crs: "26906",
                vert_crs: "5703",
                geoid: "GEOID12A",
                sourcedem_category: "Meets",
                sourcedem_reason: "Meets 3DEP source DEM requirements",
                onemeter_category: "Meets",
                onemeter_reason: "Meets 3DEP 1-m DEM requirements",
                sourcedem_link:
                  "https://prd-tnm.s3.amazonaws.com/index.html?prefix=StagedProducts/Elevation/OPR/Projects/Anchorage_Lidar/AK_Anchorage_2015"
              }
            }
          ]
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new NextRequest(
        "http://localhost/api/terrain/source-preview/probe?lat=61.2176&lon=-149.8997&role=dtm"
      )
    );
    const body = (await response.json()) as {
      status: string;
      providerId: string;
      resolutionMeters: number | null;
      coverageSourceIds: string[];
      sourceAsset: { href: string; assetRole: string } | null;
      tileUrlTemplate: string | null;
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("covered");
    expect(body.providerId).toBe("usgs-3dep");
    expect(body.resolutionMeters).toBe(1);
    expect(body.coverageSourceIds[0]).toBe("usgs-3dep-source-dem:646");
    expect(body.sourceAsset?.assetRole).toBe("dtm");
    expect(body.sourceAsset?.href).toContain("AK_Anchorage_2015");
    expect(body.tileUrlTemplate).toBe("/api/terrain/source-preview/source-auto/dtm/{z}/{x}/{y}");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("can report Canada 2m HRDEM as best available without passing strict 1m", async () => {
    vi.mocked(probeTerrainCogCoordinate)
      .mockResolvedValueOnce(
        cogProbeResult({
          providerId: "canada-hrdem",
          status: "blocked",
          resolutionMeters: 2,
          sourceId: "hrdem-mosaic-2m:9_2-mosaic-2m"
        })
      )
      .mockResolvedValueOnce(
        cogProbeResult({
          providerId: "canada-hrdem",
          status: "covered",
          resolutionMeters: 2,
          sourceId: "hrdem-mosaic-2m:9_2-mosaic-2m"
        })
      );

    const strictResponse = await GET(
      new NextRequest(
        "http://localhost/api/terrain/source-preview/probe?lat=51.05&lon=-114.07&role=dtm"
      )
    );
    const strictBody = (await strictResponse.json()) as {
      status: string;
      selectionMode: string;
      resolutionMeters: number | null;
      tileUrlTemplate: string | null;
    };

    const bestResponse = await GET(
      new NextRequest(
        "http://localhost/api/terrain/source-preview/probe?lat=51.05&lon=-114.07&role=dtm&mode=best"
      )
    );
    const bestBody = (await bestResponse.json()) as {
      status: string;
      selectionMode: string;
      resolutionMeters: number | null;
      tileUrlTemplate: string | null;
    };

    expect(strictBody.status).toBe("blocked");
    expect(strictBody.selectionMode).toBe("strict-1m");
    expect(strictBody.resolutionMeters).toBe(2);
    expect(strictBody.tileUrlTemplate).toBeNull();
    expect(bestBody.status).toBe("covered");
    expect(bestBody.selectionMode).toBe("best-available");
    expect(bestBody.resolutionMeters).toBe(2);
    expect(bestBody.tileUrlTemplate).toBe(
      "/api/terrain/source-preview/source-auto-best/dtm/{z}/{x}/{y}"
    );
    expect(vi.mocked(probeTerrainCogCoordinate)).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ allowTwoMeterFallback: false })
    );
    expect(vi.mocked(probeTerrainCogCoordinate)).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ allowTwoMeterFallback: true })
    );
  });

  it("reports USA DSM LPC source availability without a display tile template", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("3DEPElevationIndex/MapServer/8/query")) {
        return Response.json({
          features: [
            {
              attributes: {
                OBJECTID: 2238,
                workunit: "CO_DRCOG_2_2020",
                project: "CO_DRCOG_2020_B20",
                collect_end: 1591920000000,
                ql: "QL 2",
                spec: "USGS Lidar Base Specification 2.1",
                p_method: "linear-mode lidar",
                dem_gsd_meters: 1,
                horiz_crs: "6342",
                vert_crs: "5703",
                geoid: "GEOID18",
                lpc_category: "Meets",
                lpc_reason: "Meets 3DEP LPC requirements",
                lpc_link:
                  "https://rockyweb.usgs.gov/vdelivery/Datasets/Staged/Elevation/LPC/Projects/CO_DRCOG_2020_B20/CO_DRCOG_2_2020"
              }
            }
          ]
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new NextRequest(
        "http://localhost/api/terrain/source-preview/probe?lat=39.74&lon=-104.99&role=dsm"
      )
    );
    const body = (await response.json()) as {
      status: string;
      providerId: string;
      resolutionMeters: number | null;
      coverageSourceIds: string[];
      tileUrlTemplate: string | null;
      reasons: string[];
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("source-available");
    expect(body.providerId).toBe("usgs-3dep-lpc-dsm");
    expect(body.resolutionMeters).toBe(1);
    expect(body.coverageSourceIds[0]).toBe("usgs-3dep-lpc-dsm:2238");
    expect(body.tileUrlTemplate).toBe("/api/terrain/source-preview/source-auto/dsm/{z}/{x}/{y}");
    expect(body.reasons.join(" ")).toContain("derived per requested tile");
  });

  it("keeps USA DSM LPC source availability from falling through to Canada HRDEM in the broad overlap bbox", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("3DEPElevationIndex/MapServer/8/query")) {
        return Response.json({
          features: [
            {
              attributes: {
                OBJECTID: 9001,
                workunit: "WA_PUBLIC_TEST_2024",
                project: "WA_PUBLIC_TEST",
                collect_end: 1711920000000,
                ql: "QL 1",
                spec: "USGS Lidar Base Specification 2.1",
                p_method: "linear-mode lidar",
                dem_gsd_meters: 1,
                horiz_crs: "6340",
                vert_crs: "5703",
                geoid: "GEOID18",
                lpc_category: "Meets",
                lpc_reason: "Meets 3DEP LPC requirements",
                lpc_link:
                  "https://rockyweb.usgs.gov/vdelivery/Datasets/Staged/Elevation/LPC/Projects/WA_PUBLIC_TEST/WA_PUBLIC_TEST_2024"
              }
            }
          ]
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new NextRequest(
        "http://localhost/api/terrain/source-preview/probe?lat=47.6062&lon=-122.3321&role=dsm"
      )
    );
    const body = (await response.json()) as {
      status: string;
      providerId: string;
      resolutionMeters: number | null;
      coverageSourceIds: string[];
      tileUrlTemplate: string | null;
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("source-available");
    expect(body.providerId).toBe("usgs-3dep-lpc-dsm");
    expect(body.resolutionMeters).toBe(1);
    expect(body.coverageSourceIds[0]).toBe("usgs-3dep-lpc-dsm:9001");
    expect(body.tileUrlTemplate).toBe("/api/terrain/source-preview/source-auto/dsm/{z}/{x}/{y}");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.mocked(probeTerrainCogCoordinate)).not.toHaveBeenCalled();
  });

  it("falls back to the USGS LPC query layer and accepts meets-with-variance DSM sources", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("3DEPElevationIndex/MapServer/8/query")) {
        return Response.json({ error: "temporary" }, { status: 503 });
      }
      if (url.includes("3DEPElevationIndex/MapServer/24/query")) {
        return Response.json({
          features: [
            {
              attributes: {
                OBJECTID: 2294,
                workunit: "AZ_MaricopaPinal_1_2020",
                project: "AZ_MaricopaPinal_2020_B20",
                collect_end: 1639785600000,
                ql: "QL 1",
                spec: "USGS Lidar Base Specification 2.1",
                p_method: "Geiger-mode LIDAR",
                dem_gsd_meters: 0.5,
                horiz_crs: "6341",
                vert_crs: "5703",
                geoid: "GEOID18",
                lpc_category: "Meets with variance",
                lpc_reason: "Ground conditions during collection - delineated",
                lpc_link:
                  "https://rockyweb.usgs.gov/vdelivery/Datasets/Staged/Elevation/LPC/Projects/AZ_MaricopaPinal_2020_B20/AZ_MaricopaPinal_1_2020"
              }
            }
          ]
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new NextRequest(
        "http://localhost/api/terrain/source-preview/probe?lat=33.4484&lon=-112.074&role=dsm"
      )
    );
    const body = (await response.json()) as {
      status: string;
      providerId: string;
      resolutionMeters: number | null;
      coverageSourceIds: string[];
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("source-available");
    expect(body.providerId).toBe("usgs-3dep-lpc-dsm");
    expect(body.resolutionMeters).toBe(0.5);
    expect(body.coverageSourceIds[0]).toBe("usgs-3dep-lpc-dsm:2294");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

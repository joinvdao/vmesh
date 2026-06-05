import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/terrain/source-preview/[provider]/[role]/[z]/[x]/[y]/route";
import {
  renderCanadaHrdemTerrainTile,
  renderLidarBcTerrainTile,
  renderUsgs3depTerrainTile,
  renderUsgsLpcDsmTerrainTile
} from "@/lib/terrainSourceTileRenderer";

vi.mock("@/lib/terrainSourceTileRenderer", () => ({
  renderCanadaHrdemTerrainTile: vi.fn(),
  renderLidarBcTerrainTile: vi.fn(),
  renderUsgs3depTerrainTile: vi.fn(),
  renderUsgsLpcDsmTerrainTile: vi.fn()
}));

function lidarBcDtmFeature() {
  return {
    attributes: {
      filename: "bc_092g025_3_4_2_xli1m_utm10_20250826_20250826.tif",
      maptile: "092g025_3_4_2",
      spacing: "1 metre",
      year: 2025,
      s3Url:
        "https://nrs.objectstore.gov.bc.ca/gdwuts/092/092g/2025/dem/bc_092g025_3_4_2_xli1m_utm10_20250826_20250826.tif",
      projection: "utm10"
    }
  };
}

describe("terrain source preview tile route", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(renderCanadaHrdemTerrainTile).mockReset();
    vi.mocked(renderLidarBcTerrainTile).mockReset();
    vi.mocked(renderUsgs3depTerrainTile).mockReset();
    vi.mocked(renderUsgsLpcDsmTerrainTile).mockReset();
  });

  it("renders source-auto southern BC DTM tiles through the LidarBC worker renderer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("LiDAR_BC_S3_Public/FeatureServer/5/query")) {
          return Response.json({ features: [lidarBcDtmFeature()] });
        }

        throw new Error(`Unexpected fetch: ${url}`);
      })
    );
    vi.mocked(renderLidarBcTerrainTile).mockResolvedValue({
      status: "ready",
      body: Buffer.from([137, 80, 78, 71]),
      contentType: "image/png",
      byteSize: 4,
      artifactJsonPath: ".artifacts/terrain-source-preview/tile-cache/test.json",
      artifactPngPath: ".artifacts/terrain-source-preview/tile-cache/test.png"
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/terrain/source-preview/source-auto/dtm/16/10354/22427?refresh=1"
      ),
      {
        params: {
          provider: "source-auto",
          role: "dtm",
          z: "16",
          x: "10354",
          y: "22427"
        }
      }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("x-vmesh-terrain-provider")).toBe("bc-lidarbc");
    expect(response.headers.get("x-vmesh-terrain-render-mode")).toBe("worker-geotiff");
    expect(vi.mocked(renderLidarBcTerrainTile)).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "dtm",
        refresh: true,
        tile: { z: 16, x: 10354, y: 22427 }
      })
    );
  });

  it("renders BC DTM tiles when LidarBC coverage is only in the 1:20,000 DEM layer", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("LiDAR_BC_S3_Public/FeatureServer/5/query")) {
        return Response.json({ features: [] });
      }
      if (url.includes("LiDAR_BC_S3_Public/FeatureServer/6/query")) {
        return Response.json({ features: [lidarBcDtmFeature()] });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(renderLidarBcTerrainTile).mockResolvedValue({
      status: "ready",
      body: Buffer.from([137, 80, 78, 71]),
      contentType: "image/png",
      byteSize: 4,
      artifactJsonPath: ".artifacts/terrain-source-preview/tile-cache/bc-20k.json",
      artifactPngPath: ".artifacts/terrain-source-preview/tile-cache/bc-20k.png"
    });

    const response = await GET(
      new NextRequest("http://localhost/api/terrain/source-preview/source-auto/dtm/13/1352/2754"),
      {
        params: {
          provider: "source-auto",
          role: "dtm",
          z: "13",
          x: "1352",
          y: "2754"
        }
      }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-vmesh-terrain-provider")).toBe("bc-lidarbc");
    expect(response.headers.get("x-vmesh-terrain-resolution-meters")).toBe("1");
    expect(vi.mocked(renderLidarBcTerrainTile)).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "dtm",
        tile: { z: 13, x: 1352, y: 2754 }
      })
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("returns a transparent tile when the LidarBC worker renderer cannot prove pixels", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("LiDAR_BC_S3_Public/FeatureServer/5/query")) {
          return Response.json({ features: [lidarBcDtmFeature()] });
        }

        throw new Error(`Unexpected fetch: ${url}`);
      })
    );
    vi.mocked(renderLidarBcTerrainTile).mockResolvedValue({
      status: "blocked",
      reason: "LidarBC did not return valid 1m source pixels for this tile.",
      artifactJsonPath: ".artifacts/terrain-source-preview/tile-cache/test.json",
      artifactPngPath: ".artifacts/terrain-source-preview/tile-cache/test.png"
    });

    const response = await GET(
      new NextRequest("http://localhost/api/terrain/source-preview/bc-lidarbc/dtm/16/10354/22427"),
      {
        params: {
          provider: "bc-lidarbc",
          role: "dtm",
          z: "16",
          x: "10354",
          y: "22427"
        }
      }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-vmesh-terrain-source-status")).toBe("transparent");
    expect(response.headers.get("x-vmesh-terrain-source-reason")).toContain("valid 1m");
  });

  it("renders Canada best-available DTM tiles with explicit 2m HRDEM headers", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("3DEPElevationIndex/MapServer/1/query")) {
        return Response.json({ features: [] });
      }

      if (url.includes("3DEPElevationIndex/MapServer/11/query")) {
        return Response.json({ features: [] });
      }

      if (url.includes("datacube.services.geo.ca/stac/api/search")) {
        return Response.json({
          features: [
            {
              collection: "hrdem-mosaic-2m",
              id: "9_2-mosaic-2m",
              assets: {
                dtm: {
                  href: "https://canelevation-dem.s3.ca-central-1.amazonaws.com/hrdem-mosaic-2m/9_2-mosaic-2m-dtm.tif",
                  type: "image/tiff; application=geotiff; profile=cloud-optimized"
                }
              }
            }
          ]
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(renderCanadaHrdemTerrainTile).mockResolvedValue({
      status: "ready",
      body: Buffer.from([137, 80, 78, 71]),
      contentType: "image/png",
      byteSize: 4,
      artifactJsonPath: ".artifacts/terrain-source-preview/tile-cache/canada.json",
      artifactPngPath: ".artifacts/terrain-source-preview/tile-cache/canada.png"
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/terrain/source-preview/source-auto-best/dtm/12/750/1370"
      ),
      {
        params: {
          provider: "source-auto-best",
          role: "dtm",
          z: "12",
          x: "750",
          y: "1370"
        }
      }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-vmesh-terrain-provider")).toBe("canada-hrdem");
    expect(response.headers.get("x-vmesh-terrain-resolution-meters")).toBe("2");
    expect(response.headers.get("x-vmesh-terrain-source-release")).toContain(
      "best-available fallback"
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.mocked(renderCanadaHrdemTerrainTile)).toHaveBeenCalledWith(
      expect.objectContaining({
        allowTwoMeterFallback: true,
        refresh: false,
        role: "dtm",
        tile: { z: 12, x: 750, y: 1370 }
      })
    );
  });

  it("renders Canada strict DTM tiles through the HRDEM COG worker", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("3DEPElevationIndex/MapServer/1/query")) {
        return Response.json({ features: [] });
      }

      if (url.includes("datacube.services.geo.ca/stac/api/search")) {
        return Response.json({
          features: [
            {
              collection: "hrdem-mosaic-1m",
              id: "9_2-mosaic-1m",
              assets: {
                dtm: {
                  href: "https://canelevation-dem.s3.ca-central-1.amazonaws.com/hrdem-mosaic-1m/9_2-mosaic-1m-dtm.tif",
                  type: "image/tiff; application=geotiff; profile=cloud-optimized"
                }
              }
            }
          ]
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(renderCanadaHrdemTerrainTile).mockResolvedValue({
      status: "ready",
      body: Buffer.from([137, 80, 78, 71]),
      contentType: "image/png",
      byteSize: 4,
      artifactJsonPath: ".artifacts/terrain-source-preview/tile-cache/canada-strict.json",
      artifactPngPath: ".artifacts/terrain-source-preview/tile-cache/canada-strict.png"
    });

    const response = await GET(
      new NextRequest("http://localhost/api/terrain/source-preview/source-auto/dtm/13/2373/2933"),
      {
        params: {
          provider: "source-auto",
          role: "dtm",
          z: "13",
          x: "2373",
          y: "2933"
        }
      }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-vmesh-terrain-provider")).toBe("canada-hrdem");
    expect(response.headers.get("x-vmesh-terrain-render-mode")).toBe("worker-geotiff");
    expect(response.headers.get("x-vmesh-terrain-resolution-meters")).toBe("1");
    expect(vi.mocked(renderCanadaHrdemTerrainTile)).toHaveBeenCalledWith(
      expect.objectContaining({
        allowTwoMeterFallback: false,
        refresh: false,
        role: "dtm",
        tile: { z: 13, x: 2373, y: 2933 }
      })
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("renders source-auto USA DTM tiles through the USGS 3DEP worker renderer", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("3DEPElevationIndex/MapServer/1/query")) {
        return Response.json({ features: [{ attributes: { OBJECTID: 1 } }] });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(renderUsgs3depTerrainTile).mockResolvedValue({
      status: "ready",
      body: Buffer.from([137, 80, 78, 71]),
      contentType: "image/png",
      byteSize: 4,
      artifactJsonPath: ".artifacts/terrain-source-preview/tile-cache/usgs-dtm.json",
      artifactPngPath: ".artifacts/terrain-source-preview/tile-cache/usgs-dtm.png"
    });

    const response = await GET(
      new NextRequest("http://localhost/api/terrain/source-preview/source-auto/dtm/13/1706/3109"),
      {
        params: {
          provider: "source-auto",
          role: "dtm",
          z: "13",
          x: "1706",
          y: "3109"
        }
      }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-vmesh-terrain-provider")).toBe("usgs-3dep");
    expect(response.headers.get("x-vmesh-terrain-render-mode")).toBe("worker-geotiff");
    expect(response.headers.get("x-vmesh-terrain-resolution-meters")).toBe("1");
    expect(vi.mocked(renderUsgs3depTerrainTile)).toHaveBeenCalledWith(
      expect.objectContaining({
        refresh: false,
        tile: { z: 13, x: 1706, y: 3109 }
      })
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("renders source-auto USA DTM tiles when only the USGS source DEM index proves 1m coverage", async () => {
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
    vi.mocked(renderUsgs3depTerrainTile).mockResolvedValue({
      status: "ready",
      body: Buffer.from([137, 80, 78, 71]),
      contentType: "image/png",
      byteSize: 4,
      artifactJsonPath: ".artifacts/terrain-source-preview/tile-cache/anchorage.json",
      artifactPngPath: ".artifacts/terrain-source-preview/tile-cache/anchorage.png"
    });

    const response = await GET(
      new NextRequest("http://localhost/api/terrain/source-preview/source-auto/dtm/13/684/2322"),
      {
        params: {
          provider: "source-auto",
          role: "dtm",
          z: "13",
          x: "684",
          y: "2322"
        }
      }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-vmesh-terrain-provider")).toBe("usgs-3dep");
    expect(response.headers.get("x-vmesh-terrain-resolution-meters")).toBe("1");
    expect(vi.mocked(renderUsgs3depTerrainTile)).toHaveBeenCalledWith(
      expect.objectContaining({
        refresh: false,
        tile: { z: 13, x: 684, y: 2322 }
      })
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("renders source-auto USA DSM tiles through the USGS LPC point-cloud worker", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
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
      })
    );
    vi.mocked(renderUsgsLpcDsmTerrainTile).mockResolvedValue({
      status: "ready",
      body: Buffer.from([137, 80, 78, 71]),
      contentType: "image/png",
      byteSize: 4,
      artifactJsonPath: ".artifacts/terrain-source-preview/tile-cache/usgs.json",
      artifactPngPath: ".artifacts/terrain-source-preview/tile-cache/usgs.png"
    });

    const response = await GET(
      new NextRequest("http://localhost/api/terrain/source-preview/source-auto/dsm/15/6826/12436"),
      {
        params: {
          provider: "source-auto",
          role: "dsm",
          z: "15",
          x: "6826",
          y: "12436"
        }
      }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("x-vmesh-terrain-provider")).toBe("usgs-3dep-lpc-dsm");
    expect(response.headers.get("x-vmesh-ground-model-role")).toBe("surface-dsm");
    expect(response.headers.get("x-vmesh-terrain-render-mode")).toBe("worker-point-cloud");
    expect(vi.mocked(renderUsgsLpcDsmTerrainTile)).toHaveBeenCalledWith(
      expect.objectContaining({
        refresh: false,
        tile: { z: 15, x: 6826, y: 12436 }
      })
    );
  });
});

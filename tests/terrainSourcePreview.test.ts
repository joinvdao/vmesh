import { describe, expect, it } from "vitest";

import {
  BC_LIDARBC_TERRAIN_PROVIDER,
  CANADA_HRDEM_TERRAIN_PROVIDER,
  createBcLidarFeatureServerQueryUrl,
  createCanadaHrdemLocalPreviewUrl,
  createCanadaHrdemStacSearchBody,
  createTerrainSourcePreviewRequest,
  createUsgs3depOneMeterCoverageQueryUrl,
  createUsgs3depSourceDemIndexQueryUrl,
  createUsgsLpcDsmSourceIndexQueryUrl,
  getCanadaHrdemStacAssetSelections,
  isNorthAmericaTerrainSourceCoordinate,
  isBritishColumbiaTerrainSourceCoordinate,
  isLikelyBlankTerrainSourcePreviewImage,
  normalizeTerrainSourcePreviewTile,
  selectBcLidarFeatureServerAsset,
  selectCanadaHrdemStacAsset,
  selectUsgs3depDtmSource,
  selectUsgsLpcDsmSource,
  SOURCE_AUTO_BEST_TERRAIN_PROVIDER,
  SOURCE_AUTO_TERRAIN_PROVIDER,
  tileToLonLatCenter,
  TRANSPARENT_PNG_BASE64,
  USGS_3DEP_LPC_DSM_TERRAIN_PROVIDER,
  USGS_3DEP_TERRAIN_PROVIDER
} from "@/lib/terrainSourcePreview";

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function validatePngChunkCrcs(bytes: Buffer): boolean {
  if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return false;
  }

  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const chunkStart = offset + 4;
    const chunkEnd = chunkStart + 4 + length;
    const crcOffset = chunkEnd;
    if (crcOffset + 4 > bytes.length) return false;
    const expected = bytes.readUInt32BE(crcOffset);
    const actual = crc32(bytes.subarray(chunkStart, chunkEnd));
    if (expected !== actual) return false;
    const chunkType = bytes.subarray(chunkStart, chunkStart + 4).toString("ascii");
    offset = crcOffset + 4;
    if (chunkType === "IEND") return offset === bytes.length;
  }

  return false;
}

describe("terrain source preview", () => {
  it("routes USGS 3DEP 1m DTM previews to the worker renderer", () => {
    const request = createTerrainSourcePreviewRequest({
      provider: USGS_3DEP_TERRAIN_PROVIDER,
      role: "dtm",
      tile: normalizeTerrainSourcePreviewTile({ z: 14, x: 3418, y: 6350 })
    });

    expect(request.status).toBe("worker-render");
    if (request.status !== "worker-render") throw new Error("expected worker-render request");
    expect(request.sourceSummary.providerId).toBe(USGS_3DEP_TERRAIN_PROVIDER);
    expect(request.sourceSummary.resolutionMeters).toBe(1);
    expect(request.sourceSummary.groundModelRole).toBe("bare-earth-dtm");
    expect(request.sourceSummary.sourceRelease).toContain("product-index/source-DEM gated");
  });

  it("blocks USA DSM because the DEM source is DTM only", () => {
    const request = createTerrainSourcePreviewRequest({
      provider: USGS_3DEP_TERRAIN_PROVIDER,
      role: "dsm",
      tile: normalizeTerrainSourcePreviewTile({ z: 14, x: 3418, y: 6350 })
    });

    expect(request.status).toBe("blocked");
    if (request.status !== "blocked") throw new Error("expected blocked request");
    expect(request.reason).toContain("DTM");
  });

  it("routes USA DSM previews to the USGS LPC point-cloud worker", () => {
    const explicit = createTerrainSourcePreviewRequest({
      provider: USGS_3DEP_LPC_DSM_TERRAIN_PROVIDER,
      role: "dsm",
      tile: normalizeTerrainSourcePreviewTile({ z: 15, x: 6826, y: 12436 })
    });
    const automatic = createTerrainSourcePreviewRequest({
      provider: SOURCE_AUTO_TERRAIN_PROVIDER,
      role: "dsm",
      tile: normalizeTerrainSourcePreviewTile({ z: 15, x: 6826, y: 12436 })
    });

    expect(explicit.status).toBe("worker-render");
    expect(automatic.status).toBe("worker-render");
    if (explicit.status !== "worker-render" || automatic.status !== "worker-render") {
      throw new Error("expected USA DSM worker-render requests");
    }
    expect(explicit.sourceSummary.providerId).toBe(USGS_3DEP_LPC_DSM_TERRAIN_PROVIDER);
    expect(explicit.sourceSummary.groundModelRole).toBe("surface-dsm");
    expect(explicit.sourceSummary.sourceRelease).toContain("Lidar Point Cloud");
    expect(automatic.sourceSummary.providerId).toBe(USGS_3DEP_LPC_DSM_TERRAIN_PROVIDER);
  });

  it("routes Canada HRDEM DTM and DSM previews to the COG worker", () => {
    const tile = normalizeTerrainSourcePreviewTile({ z: 12, x: 678, y: 1377 });
    const dtm = createTerrainSourcePreviewRequest({
      provider: CANADA_HRDEM_TERRAIN_PROVIDER,
      role: "dtm",
      tile
    });
    const dsm = createTerrainSourcePreviewRequest({
      provider: CANADA_HRDEM_TERRAIN_PROVIDER,
      role: "dsm",
      tile
    });

    expect(dtm.status).toBe("worker-render");
    expect(dsm.status).toBe("worker-render");
    if (dtm.status !== "worker-render" || dsm.status !== "worker-render") {
      throw new Error("expected Canada source requests to use the COG worker");
    }

    expect(dtm.sourceSummary.providerId).toBe(CANADA_HRDEM_TERRAIN_PROVIDER);
    expect(dsm.sourceSummary.groundModelRole).toBe("surface-dsm");
  });

  it("routes auto DTM tiles to USA or Canada sources by tile center", () => {
    const usa = createTerrainSourcePreviewRequest({
      provider: SOURCE_AUTO_TERRAIN_PROVIDER,
      role: "dtm",
      tile: normalizeTerrainSourcePreviewTile({ z: 14, x: 3418, y: 6350 })
    });
    const canada = createTerrainSourcePreviewRequest({
      provider: SOURCE_AUTO_TERRAIN_PROVIDER,
      role: "dtm",
      tile: normalizeTerrainSourcePreviewTile({ z: 12, x: 678, y: 1377 })
    });

    expect(usa.status).toBe("worker-render");
    expect(canada.status).toBe("worker-render");
    if (usa.status !== "worker-render" || canada.status !== "worker-render") {
      throw new Error("expected source-backed auto requests");
    }
    expect(usa.sourceSummary.providerId).toBe(USGS_3DEP_TERRAIN_PROVIDER);
    expect(canada.sourceSummary.providerId).toBe(CANADA_HRDEM_TERRAIN_PROVIDER);
  });

  it("can label a Canada best-available preview as explicit 2m HRDEM", () => {
    const request = createTerrainSourcePreviewRequest({
      provider: SOURCE_AUTO_BEST_TERRAIN_PROVIDER,
      role: "dtm",
      tile: normalizeTerrainSourcePreviewTile({ z: 12, x: 678, y: 1377 }),
      sourceResolutionMeters: 2
    });

    expect(request.status).toBe("worker-render");
    if (request.status !== "worker-render") throw new Error("expected worker-render request");
    expect(request.sourceSummary.providerId).toBe(CANADA_HRDEM_TERRAIN_PROVIDER);
    expect(request.sourceSummary.resolutionMeters).toBe(2);
    expect(request.sourceSummary.sourceRelease).toContain("best-available fallback");
  });

  it("marks direct LidarBC browser tile previews for worker-side rendering", () => {
    const request = createTerrainSourcePreviewRequest({
      provider: BC_LIDARBC_TERRAIN_PROVIDER,
      role: "dtm",
      tile: normalizeTerrainSourcePreviewTile({ z: 12, x: 646, y: 1404 })
    });

    expect(request.status).toBe("worker-render");
    if (request.status !== "worker-render") throw new Error("expected worker-render request");
    expect(request.sourceSummary.providerId).toBe(BC_LIDARBC_TERRAIN_PROVIDER);
    expect(request.sourceSummary.resolutionMeters).toBe(1);
  });

  it("returns transparent auto tiles outside the USA/Canada source area", () => {
    const request = createTerrainSourcePreviewRequest({
      provider: SOURCE_AUTO_TERRAIN_PROVIDER,
      role: "dtm",
      tile: normalizeTerrainSourcePreviewTile({ z: 8, x: 128, y: 128 })
    });

    expect(request.status).toBe("transparent");
  });

  it("builds official live coverage probe requests", () => {
    const usgsUrl = new URL(
      createUsgs3depOneMeterCoverageQueryUrl({ latitude: 39.7392, longitude: -104.9903 })
    );
    const canadaBody = JSON.parse(
      createCanadaHrdemStacSearchBody({ latitude: 45.4215, longitude: -75.6972 }, "dtm")
    ) as {
      collections: string[];
      intersects: { type: string; coordinates: number[] };
    };

    expect(usgsUrl.hostname).toBe("index.nationalmap.gov");
    expect(usgsUrl.searchParams.get("geometry")).toBe("-104.9903,39.7392");
    expect(canadaBody.collections).toEqual(["hrdem-mosaic-1m", "hrdem-mosaic-2m"]);
    expect(canadaBody.intersects.coordinates).toEqual([-75.6972, 45.4215]);

    const localPreviewUrl = new URL(
      createCanadaHrdemLocalPreviewUrl({
        coordinate: { latitude: 45.4215, longitude: -75.6972 },
        role: "dtm"
      })
    );
    expect(localPreviewUrl.searchParams.get("layers")).toBe("dtm-hillshade");
    expect(localPreviewUrl.searchParams.get("crs")).toBe("EPSG:4326");
  });

  it("selects USA LPC DSM source-index projects without treating them as display tiles", () => {
    const lpcUrl = new URL(
      createUsgsLpcDsmSourceIndexQueryUrl({ latitude: 39.74, longitude: -104.99 })
    );
    const selected = selectUsgsLpcDsmSource({
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

    expect(lpcUrl.hostname).toBe("index.nationalmap.gov");
    expect(lpcUrl.pathname).toContain("/3DEPElevationIndex/MapServer/8/query");
    expect(lpcUrl.searchParams.get("geometry")).toBe("-104.99,39.74");
    expect(selected?.sourceId).toBe(`${USGS_3DEP_LPC_DSM_TERRAIN_PROVIDER}:2238`);
    expect(selected?.demGsdMeters).toBe(1);
    expect(selected?.lpcLink).toContain("CO_DRCOG_2_2020");
  });

  it("accepts USGS LPC DSM sources that meet 3DEP requirements with variance", () => {
    const selected = selectUsgsLpcDsmSource({
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

    expect(selected?.sourceId).toBe(`${USGS_3DEP_LPC_DSM_TERRAIN_PROVIDER}:2294`);
    expect(selected?.demGsdMeters).toBe(0.5);
    expect(selected?.lpcCategory).toBe("Meets with variance");
  });

  it("selects USGS source DEM entries as 1m DTM evidence when product coverage misses", () => {
    const sourceDemUrl = new URL(
      createUsgs3depSourceDemIndexQueryUrl({ latitude: 61.2176, longitude: -149.8997 })
    );
    const selected = selectUsgs3depDtmSource({
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

    expect(sourceDemUrl.hostname).toBe("index.nationalmap.gov");
    expect(sourceDemUrl.pathname).toContain("/3DEPElevationIndex/MapServer/11/query");
    expect(sourceDemUrl.searchParams.get("geometry")).toBe("-149.8997,61.2176");
    expect(selected?.sourceId).toBe("usgs-3dep-source-dem:646");
    expect(selected?.demGsdMeters).toBe(1);
    expect(selected?.sourceDemLink).toContain("AK_Anchorage_2015");
  });

  it("selects Canada HRDEM 1m COG assets from STAC without accepting 2m-only results", () => {
    const stac = {
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
        },
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
    };

    const selections = getCanadaHrdemStacAssetSelections(stac, "dtm");
    const selected = selectCanadaHrdemStacAsset({ value: stac, role: "dtm" });
    const twoMeterOnly = selectCanadaHrdemStacAsset({
      value: { features: [stac.features[0]] },
      role: "dtm"
    });

    expect(selections.map((selection) => selection.resolutionMeters)).toEqual([1, 2]);
    expect(selected?.sourceId).toBe("hrdem-mosaic-1m:9_2-mosaic-1m");
    expect(selected?.href).toContain("hrdem-mosaic-1m");
    expect(twoMeterOnly).toBeNull();
  });

  it("selects LidarBC 1m DEM and DSM GeoTIFF refs from the official FeatureServer shape", () => {
    const dtmUrl = new URL(
      createBcLidarFeatureServerQueryUrl({
        coordinate: { latitude: 49.2827, longitude: -123.1207 },
        role: "dtm"
      })
    );
    const featureServerResponse = {
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
        },
        {
          attributes: {
            filename: "bc_092g025_3_4_2_xli1m_utm10_20250826_20250826_dsm.tif",
            maptile: "092g025_3_4_2",
            spacing: "1 metre",
            year: 2025,
            s3Url:
              "https://nrs.objectstore.gov.bc.ca/gdwuts/092/092g/2025/dsm/bc_092g025_3_4_2_xli1m_utm10_20250826_20250826_dsm.tif",
            projection: "utm10"
          }
        }
      ]
    };

    expect(dtmUrl.hostname).toBe("services6.arcgis.com");
    expect(dtmUrl.pathname).toContain("/FeatureServer/5/query");
    expect(dtmUrl.searchParams.get("geometry")).toBe("-123.1207,49.2827");
    expect(selectBcLidarFeatureServerAsset(featureServerResponse, "dtm")?.sourceId).toBe(
      "bc-lidarbc:dtm:092g025_3_4_2:2025"
    );
    expect(selectBcLidarFeatureServerAsset(featureServerResponse, "dsm")?.href).toContain(
      "/2025/dsm/"
    );
    expect(
      selectBcLidarFeatureServerAsset(
        { features: [{ attributes: { filename: "coarse.tif", spacing: "5 metres" } }] },
        "dtm"
      )
    ).toBeNull();
  });

  it("recognizes USA and Canada source coordinates", () => {
    expect(
      isNorthAmericaTerrainSourceCoordinate(tileToLonLatCenter({ z: 14, x: 3418, y: 6350 }))
    ).toBe(true);
    expect(isNorthAmericaTerrainSourceCoordinate({ latitude: 45.4215, longitude: -75.6972 })).toBe(
      true
    );
    expect(
      isBritishColumbiaTerrainSourceCoordinate({ latitude: 49.2827, longitude: -123.1207 })
    ).toBe(true);
    expect(BC_LIDARBC_TERRAIN_PROVIDER).toBe("bc-lidarbc");
    expect(isNorthAmericaTerrainSourceCoordinate({ latitude: 51.5, longitude: -0.12 })).toBe(false);
  });

  it("recognizes tiny transparent source-preview images as blank/no-data", () => {
    expect(
      isLikelyBlankTerrainSourcePreviewImage({
        byteLength: 516,
        contentType: "image/png"
      })
    ).toBe(true);
    expect(
      isLikelyBlankTerrainSourcePreviewImage({
        byteLength: 46_608,
        contentType: "image/png"
      })
    ).toBe(false);
    expect(
      isLikelyBlankTerrainSourcePreviewImage({
        byteLength: 516,
        contentType: "image/jpeg"
      })
    ).toBe(false);
  });

  it("uses a PNG-decodable transparent fallback tile for map-safe no-data responses", () => {
    const transparentPng = Buffer.from(TRANSPARENT_PNG_BASE64, "base64");

    expect(transparentPng.byteLength).toBeGreaterThan(0);
    expect(validatePngChunkCrcs(transparentPng)).toBe(true);
  });
});

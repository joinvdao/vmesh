import { afterEach, describe, expect, it } from "vitest";

import {
  abundanceSourceSliceBoundsFromCentroid,
  createLiveNorthAmericaDsmSourceAdapterPlan,
  createLiveNorthAmericaDtmSourceAdapterPlan,
  createLiveTerrainSourceAdapterPlan,
  createTerrainSourceAdapterPlan,
  expandTerrainSourceUrlTemplate,
  isSourceNativeTerrainAdapterSupported
} from "@/lib/geospatialPackage";

const sampleAoi = {
  centroid: { latitude: 38.7223, longitude: -9.1393 },
  bounds: [-120.55, 50.66, -120.54, 50.67] as [number, number, number, number],
  label: "Golden eval AOI"
};
function kamloopsThreeKmAoi(latitude: number, longitude: number, label: string) {
  return {
    bounds: abundanceSourceSliceBoundsFromCentroid({
      centroid: { latitude, longitude },
      edgeMeters: 3000
    }),
    label
  };
}
const canadaHrdemOneMeterStac = {
  features: [
    {
      collection: "hrdem-mosaic-1m",
      id: "2_4-mosaic-1m",
      assets: {
        dtm: {
          href: "https://canelevation-dem.s3.ca-central-1.amazonaws.com/hrdem-mosaic-1m/2_4-mosaic-1m-dtm.tif",
          type: "image/tiff; application=geotiff; profile=cloud-optimized"
        },
        dsm: {
          href: "https://canelevation-dem.s3.ca-central-1.amazonaws.com/hrdem-mosaic-1m/2_4-mosaic-1m-dsm.tif",
          type: "image/tiff; application=geotiff; profile=cloud-optimized"
        }
      }
    }
  ]
};
const canadaHrdemTwoMeterOnlyStac = {
  features: [
    {
      collection: "hrdem-mosaic-2m",
      id: "2_4-mosaic-2m",
      assets: {
        dtm: {
          href: "https://canelevation-dem.s3.ca-central-1.amazonaws.com/hrdem-mosaic-2m/2_4-mosaic-2m-dtm.tif",
          type: "image/tiff; application=geotiff; profile=cloud-optimized"
        }
      }
    }
  ]
};
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
const lidarBcOneMeterDsmResponse = {
  features: [
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
const usgsLpcDsmResponse = {
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
          "https://rockyweb.usgs.gov/vdelivery/Datasets/Staged/Elevation/LPC/Projects/CO_DRCOG_2020_B20/CO_DRCOG_2_2020",
        sourcedem_link:
          "https://prd-tnm.s3.amazonaws.com/index.html?prefix=StagedProducts/Elevation/OPR/Projects/CO_DRCOG_2020_B20/CO_DRCOG_2_2020",
        metadata_link:
          "https://prd-tnm.s3.amazonaws.com/index.html?prefix=StagedProducts/Elevation/metadata/CO_DRCOG_2020_B20/CO_DRCOG_2_2020"
      }
    }
  ]
};
const usgsLpcVarianceDsmResponse = {
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
};
const usgsLpcNonQualifyingResponse = {
  features: [
    {
      attributes: {
        OBJECTID: 236,
        workunit: "CO_DENVERDNC_2008",
        project: "CO_DENVERDNC_2008_Legacy_Data",
        ql: "Other",
        p_method: "linear-mode lidar",
        dem_gsd_meters: 3,
        lpc_category: "Does not meet",
        lpc_reason: "LPC predates v.1.0 or draft LBS",
        lpc_link:
          "https://rockyweb.usgs.gov/vdelivery/Datasets/Staged/Elevation/LPC/Projects/legacy/CO_DENVERDNC_2008"
      }
    }
  ]
};
const usgsOneMeterCoverageResponse = {
  features: [{ attributes: { OBJECTID: 1 } }]
};
const emptyCoverageResponse = {
  features: []
};
const kamloopsDemGridResponse = {
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
const kamloopsPartialDemGridResponse = {
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
        CELLNAME: "5156D",
        PHOTOGRIDLIMITS: "NO"
      }
    }
  ]
};

afterEach(() => {
  delete process.env.VMESH_KAMLOOPS_LOCAL_LIDAR_MODE;
  delete process.env.VMESH_KAMLOOPS_LOCAL_LIDAR_GEOTIFF_URL;
  delete process.env.VMESH_KAMLOOPS_LOCAL_LIDAR_GEOTIFF_URL_TEMPLATE;
});

describe("terrain source adapters", () => {
  it("plans an official USGS 3DEP ArcGIS ImageServer export without fetching data", () => {
    const plan = createTerrainSourceAdapterPlan(
      {
        request: {
          aoi: sampleAoi,
          layers: ["terrain"],
          preferredSourceIds: ["usgs-3dep"]
        }
      },
      { env: {}, maxImageSide: 2048 }
    );

    expect(plan.status).toBe("ready");
    expect(plan.runClass).toBe("dry-run");
    expect(plan.selectedSource?.id).toBe("usgs-3dep");
    expect(plan.toolProfile?.toolId).toBe("usgs-3dep");
    expect(plan.inputRefs).toHaveLength(1);
    expect(plan.inputRefs[0].kind).toBe("arcgis-image-export");
    expect(plan.inputRefs[0].format).toBe("geotiff");
    expect(plan.inputRefs[0].requiresAuth).toBe(false);

    const url = new URL(plan.inputRefs[0].url);
    expect(url.hostname).toBe("elevation.nationalmap.gov");
    expect(url.searchParams.get("bbox")).toBe("-120.55,50.66,-120.54,50.67");
    expect(url.searchParams.get("format")).toBe("tiff");
    expect(url.searchParams.get("pixelType")).toBe("F32");
    expect(url.searchParams.get("size")).toMatch(/^\d+,\d+$/);
    expect(plan.warnings.join(" ")).toContain("did not fetch");
  });

  it("blocks USGS 3DEP adapter plans when a live 1m product-index check returns no coverage", () => {
    const plan = createTerrainSourceAdapterPlan(
      {
        request: {
          aoi: {
            bounds: [-75.71, 45.41, -75.69, 45.43],
            label: "Ottawa public-safe AOI"
          },
          layers: ["terrain"],
          preferredSourceIds: ["usgs-3dep"]
        }
      },
      { env: {}, usgs3depCoverageResponse: emptyCoverageResponse }
    );

    expect(plan.status).toBe("blocked");
    expect(plan.inputRefs).toHaveLength(0);
    expect(plan.blockedReasons.join(" ")).toContain("product index did not cover");
  });

  it("can fetch USGS 3DEP coverage before creating a live DTM adapter plan", async () => {
    const requests: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetchImpl: typeof fetch = async (url, init) => {
      requests.push({ url: String(url), init });
      return new Response(JSON.stringify(usgsOneMeterCoverageResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    };

    const plan = await createLiveTerrainSourceAdapterPlan(
      {
        request: {
          aoi: {
            bounds: [-105.0, 39.735, -104.98, 39.745],
            label: "Denver public-safe AOI"
          },
          layers: ["terrain"],
          preferredSourceIds: ["usgs-3dep"]
        }
      },
      { env: {}, fetchImpl }
    );

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toContain("/3DEPElevationIndex/MapServer/1/query");
    expect(plan.status).toBe("ready");
    expect(plan.inputRefs[0].notes.join(" ")).toContain("coverage was checked");
  });

  it("resolves a USGS 3DEP LPC source-index hit into a DSM worker input", () => {
    const plan = createTerrainSourceAdapterPlan(
      {
        request: {
          aoi: {
            bounds: [-105.0, 39.735, -104.98, 39.745],
            label: "Denver public-safe AOI"
          },
          layers: ["terrain"],
          preferredSourceIds: ["usgs-3dep-lpc-dsm"]
        }
      },
      {
        env: {},
        usgsLpcSourceIndexResponse: usgsLpcDsmResponse
      }
    );

    expect(plan.status).toBe("ready");
    expect(plan.selectedSource?.id).toBe("usgs-3dep-lpc-dsm");
    expect(plan.toolProfile?.groundModelRole).toBe("surface-dsm");
    expect(plan.inputRefs[0].kind).toBe("source-index-required");
    expect(plan.inputRefs[0].role).toBe("source-index");
    expect(plan.inputRefs[0].format).toBe("json");
    expect(plan.inputRefs[0].url).toContain("CO_DRCOG_2_2020");
    expect(plan.inputRefs[0].groundModelRole).toBe("surface-dsm");
    expect(plan.inputRefs[0].notes.join(" ")).toContain("DSM derivation");
    expect(plan.warnings.join(" ")).toContain("PDAL");
  });

  it("accepts USGS 3DEP LPC DSM sources that meet with variance", () => {
    const plan = createTerrainSourceAdapterPlan(
      {
        request: {
          aoi: {
            bounds: [-112.08, 33.44, -112.07, 33.45],
            label: "Phoenix public-safe AOI"
          },
          layers: ["terrain"],
          preferredSourceIds: ["usgs-3dep-lpc-dsm"]
        }
      },
      {
        env: {},
        usgsLpcSourceIndexResponse: usgsLpcVarianceDsmResponse
      }
    );

    expect(plan.status).toBe("ready");
    expect(plan.inputRefs[0].url).toContain("AZ_MaricopaPinal_1_2020");
    expect(plan.inputRefs[0].notes.join(" ")).toContain("source DEM GSD 0.5m");
  });

  it("blocks USGS LPC DSM responses that do not meet 1m-class source requirements", () => {
    const plan = createTerrainSourceAdapterPlan(
      {
        request: {
          aoi: {
            bounds: [-105.0, 39.735, -104.98, 39.745],
            label: "Denver public-safe AOI"
          },
          layers: ["terrain"],
          preferredSourceIds: ["usgs-3dep-lpc-dsm"]
        }
      },
      {
        env: {},
        usgsLpcSourceIndexResponse: usgsLpcNonQualifyingResponse
      }
    );

    expect(plan.status).toBe("blocked");
    expect(plan.inputRefs).toHaveLength(0);
    expect(plan.blockedReasons.join(" ")).toContain("1m-class");
  });

  it("can fetch the official USGS LPC source index before creating a DSM adapter plan", async () => {
    const requests: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetchImpl: typeof fetch = async (url, init) => {
      requests.push({ url: String(url), init });
      return new Response(JSON.stringify(usgsLpcDsmResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    };

    const plan = await createLiveTerrainSourceAdapterPlan(
      {
        request: {
          aoi: {
            bounds: [-105.0, 39.735, -104.98, 39.745],
            label: "Denver public-safe AOI"
          },
          layers: ["terrain"],
          preferredSourceIds: ["usgs-3dep-lpc-dsm"]
        }
      },
      { env: {}, fetchImpl }
    );

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toContain("/3DEPElevationIndex/MapServer/8/query");
    expect(requests[0].url).toContain("geometry=-104.99%2C39.74");
    expect(plan.status).toBe("ready");
    expect(plan.inputRefs[0].url).toContain("CO_DRCOG_2_2020");
  });

  it("uses the configured USGS LPC source index endpoint when provided", async () => {
    const requests: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetchImpl: typeof fetch = async (url, init) => {
      requests.push({ url: String(url), init });
      return new Response(JSON.stringify(usgsLpcDsmResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    };

    const plan = await createLiveTerrainSourceAdapterPlan(
      {
        request: {
          aoi: {
            bounds: [-105.0, 39.735, -104.98, 39.745],
            label: "Denver public-safe AOI"
          },
          layers: ["terrain"],
          preferredSourceIds: ["usgs-3dep-lpc-dsm"]
        }
      },
      {
        env: {
          VMESH_USGS_LPC_SOURCE_INDEX_URL:
            "https://example.test/arcgis/rest/services/3DEPElevationIndex/MapServer/8/query"
        },
        fetchImpl
      }
    );

    expect(requests).toHaveLength(1);
    expect(new URL(requests[0].url).hostname).toBe("example.test");
    expect(plan.status).toBe("ready");
  });

  it("blocks Canada HRDEM until a source index or configured GeoTIFF template exists", () => {
    const plan = createTerrainSourceAdapterPlan(
      {
        request: {
          aoi: sampleAoi,
          layers: ["terrain"],
          preferredSourceIds: ["canada-hrdem"]
        }
      },
      { env: {} }
    );

    expect(plan.status).toBe("blocked");
    expect(plan.runClass).toBe("configured");
    expect(plan.selectedSource?.id).toBe("canada-hrdem");
    expect(plan.inputRefs).toHaveLength(0);
    expect(plan.blockedReasons.join(" ")).toContain("AOI-to-tile source index");
  });

  it("expands a configured Canada HRDEM source URL template", () => {
    const plan = createTerrainSourceAdapterPlan(
      {
        request: {
          aoi: sampleAoi,
          layers: ["terrain"],
          preferredSourceIds: ["canada-hrdem"]
        }
      },
      {
        env: {},
        canadaHrdemGeoTiffUrlTemplate:
          "https://data.example.test/hrdem/{sourceId}/{packageId}.tif?bbox={bbox}&size={widthPx}x{heightPx}"
      }
    );

    expect(plan.status).toBe("ready");
    expect(plan.runClass).toBe("configured");
    expect(plan.inputRefs[0].kind).toBe("direct-geotiff");
    expect(plan.inputRefs[0].format).toBe("geotiff");
    expect(plan.inputRefs[0].url).toContain("/hrdem/canada-hrdem/");
    expect(plan.inputRefs[0].url).toContain("bbox=-120.55,50.66,-120.54,50.67");
  });

  it("resolves a Canada HRDEM 1m STAC COG into a source-native worker input", () => {
    const plan = createTerrainSourceAdapterPlan(
      {
        request: {
          aoi: sampleAoi,
          layers: ["terrain"],
          preferredSourceIds: ["canada-hrdem"]
        }
      },
      {
        env: {},
        canadaHrdemStacSearchResponse: canadaHrdemOneMeterStac
      }
    );

    expect(plan.status).toBe("ready");
    expect(plan.runClass).toBe("dry-run");
    expect(plan.inputRefs[0].kind).toBe("stac-cog");
    expect(plan.inputRefs[0].format).toBe("cog");
    expect(plan.inputRefs[0].url).toContain("hrdem-mosaic-1m");
    expect(plan.inputRefs[0].notes.join(" ")).toContain("direct official HRDEM 1m COG");
  });

  it("resolves a Canada HRDEM 1m DSM STAC COG when the DSM source is selected", () => {
    const plan = createTerrainSourceAdapterPlan(
      {
        request: {
          aoi: sampleAoi,
          layers: ["terrain"],
          preferredSourceIds: ["canada-hrdem-dsm"]
        }
      },
      {
        env: {},
        canadaHrdemStacSearchResponse: canadaHrdemOneMeterStac
      }
    );

    expect(plan.status).toBe("ready");
    expect(plan.selectedSource?.id).toBe("canada-hrdem-dsm");
    expect(plan.toolProfile?.groundModelRole).toBe("surface-dsm");
    expect(plan.inputRefs[0].kind).toBe("stac-cog");
    expect(plan.inputRefs[0].url).toContain("2_4-mosaic-1m-dsm.tif");
    expect(plan.inputRefs[0].groundModelRole).toBe("surface-dsm");
  });

  it("blocks Canada HRDEM STAC responses that only prove 2m coverage", () => {
    const plan = createTerrainSourceAdapterPlan(
      {
        request: {
          aoi: sampleAoi,
          layers: ["terrain"],
          preferredSourceIds: ["canada-hrdem"]
        }
      },
      {
        env: {},
        canadaHrdemStacSearchResponse: canadaHrdemTwoMeterOnlyStac
      }
    );

    expect(plan.status).toBe("blocked");
    expect(plan.inputRefs).toHaveLength(0);
    expect(plan.blockedReasons.join(" ")).toContain("1m");
    expect(plan.blockedReasons.join(" ")).toContain("Lower-resolution");
  });

  it("resolves Canada HRDEM best-available DTM to explicit 2m when strict 1m is absent", () => {
    const plan = createTerrainSourceAdapterPlan(
      {
        request: {
          aoi: sampleAoi,
          layers: ["terrain"],
          preferredSourceIds: ["canada-hrdem-best-dtm"]
        }
      },
      {
        env: {},
        canadaHrdemStacSearchResponse: canadaHrdemTwoMeterOnlyStac
      }
    );

    expect(plan.status).toBe("ready");
    expect(plan.selectedSource?.id).toBe("canada-hrdem-best-dtm");
    expect(plan.toolProfile?.toolId).toBe("canada-hrdem");
    expect(plan.toolProfile?.targetResolutionMeters).toBe(2);
    expect(plan.inputRefs[0].kind).toBe("stac-cog");
    expect(plan.inputRefs[0].url).toContain("hrdem-mosaic-2m");
    expect(plan.inputRefs[0].targetResolutionMeters).toBe(2);
    expect(plan.inputRefs[0].notes.join(" ")).toContain("must not be counted as strict 1m");
    expect(plan.warnings.join(" ")).toContain("not strict 1m evidence");
  });

  it("can fetch Canada HRDEM STAC before creating a live source adapter plan", async () => {
    const requests: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetchImpl: typeof fetch = async (url, init) => {
      requests.push({ url: String(url), init });
      return new Response(JSON.stringify(canadaHrdemOneMeterStac), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    };

    const plan = await createLiveTerrainSourceAdapterPlan(
      {
        request: {
          aoi: sampleAoi,
          layers: ["terrain"],
          preferredSourceIds: ["canada-hrdem"]
        }
      },
      { env: {}, fetchImpl }
    );

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe("https://datacube.services.geo.ca/stac/api/search");
    expect(String(requests[0].init?.body)).toContain("hrdem-mosaic-1m");
    expect(plan.status).toBe("ready");
    expect(plan.inputRefs[0].url).toContain("2_4-mosaic-1m-dtm.tif");
  });

  it("can fetch Canada HRDEM DSM STAC before creating a live source adapter plan", async () => {
    const requests: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetchImpl: typeof fetch = async (url, init) => {
      requests.push({ url: String(url), init });
      return new Response(JSON.stringify(canadaHrdemOneMeterStac), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    };

    const plan = await createLiveTerrainSourceAdapterPlan(
      {
        request: {
          aoi: sampleAoi,
          layers: ["terrain"],
          preferredSourceIds: ["canada-hrdem-dsm"]
        }
      },
      { env: {}, fetchImpl }
    );

    expect(requests).toHaveLength(1);
    expect(String(requests[0].init?.body)).toContain("hrdem-mosaic-1m");
    expect(plan.status).toBe("ready");
    expect(plan.inputRefs[0].url).toContain("2_4-mosaic-1m-dsm.tif");
    expect(plan.inputRefs[0].groundModelRole).toBe("surface-dsm");
  });

  it("accepts a configured LidarBC S3 COG ref", () => {
    const plan = createTerrainSourceAdapterPlan(
      {
        request: {
          aoi: sampleAoi,
          layers: ["terrain"],
          preferredSourceIds: ["bc-lidarbc"]
        }
      },
      {
        env: {},
        bcLidarGeoTiffUrl: "s3://bc-lidar-public/golden-eval/terrain.cog.tif"
      }
    );

    expect(plan.status).toBe("ready");
    expect(plan.runClass).toBe("configured");
    expect(plan.inputRefs[0].kind).toBe("s3-cog");
    expect(plan.inputRefs[0].format).toBe("cog");
    expect(plan.inputRefs[0].provider).toBe("Government of British Columbia LidarBC");
  });

  it("resolves a LidarBC 1m DEM FeatureServer hit into a source-native worker input", () => {
    const plan = createTerrainSourceAdapterPlan(
      {
        request: {
          aoi: sampleAoi,
          layers: ["terrain"],
          preferredSourceIds: ["bc-lidarbc"]
        }
      },
      {
        env: {},
        bcLidarFeatureServerResponse: lidarBcOneMeterDemResponse
      }
    );

    expect(plan.status).toBe("ready");
    expect(plan.selectedSource?.id).toBe("bc-lidarbc");
    expect(plan.inputRefs[0].kind).toBe("direct-geotiff");
    expect(plan.inputRefs[0].format).toBe("geotiff");
    expect(plan.inputRefs[0].url).toContain("/2025/dem/");
    expect(plan.inputRefs[0].groundModelRole).toBe("bare-earth-dtm");
  });

  it("resolves a LidarBC 1m DSM FeatureServer hit into a source-native worker input", () => {
    const plan = createTerrainSourceAdapterPlan(
      {
        request: {
          aoi: sampleAoi,
          layers: ["terrain"],
          preferredSourceIds: ["bc-lidarbc-dsm"]
        }
      },
      {
        env: {},
        bcLidarFeatureServerResponse: lidarBcOneMeterDsmResponse
      }
    );

    expect(plan.status).toBe("ready");
    expect(plan.selectedSource?.id).toBe("bc-lidarbc-dsm");
    expect(plan.toolProfile?.groundModelRole).toBe("surface-dsm");
    expect(plan.inputRefs[0].url).toContain("/2025/dsm/");
    expect(plan.inputRefs[0].groundModelRole).toBe("surface-dsm");
  });

  it("blocks LidarBC FeatureServer responses without a 1m source tile", () => {
    const plan = createTerrainSourceAdapterPlan(
      {
        request: {
          aoi: sampleAoi,
          layers: ["terrain"],
          preferredSourceIds: ["bc-lidarbc"]
        }
      },
      {
        env: {},
        bcLidarFeatureServerResponse: { features: [] }
      }
    );

    expect(plan.status).toBe("blocked");
    expect(plan.blockedReasons.join(" ")).toContain("did not return a 1m DTM");
  });

  it("can fetch LidarBC FeatureServer before creating a live source adapter plan", async () => {
    const requests: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetchImpl: typeof fetch = async (url, init) => {
      requests.push({ url: String(url), init });
      return new Response(JSON.stringify(lidarBcOneMeterDemResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    };

    const plan = await createLiveTerrainSourceAdapterPlan(
      {
        request: {
          aoi: sampleAoi,
          layers: ["terrain"],
          preferredSourceIds: ["bc-lidarbc"]
        }
      },
      { env: {}, fetchImpl }
    );

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toContain("/FeatureServer/5/query");
    expect(requests[0].url).toContain("geometry=-120.545%2C50.665");
    expect(plan.status).toBe("ready");
    expect(plan.inputRefs[0].url).toContain("xli1m");
  });

  it("resolves a live North America DTM chain to USGS for covered USA AOIs", async () => {
    const requests: string[] = [];
    const fetchImpl: typeof fetch = async (url) => {
      requests.push(String(url));
      return new Response(JSON.stringify(usgsOneMeterCoverageResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    };

    const plan = await createLiveNorthAmericaDtmSourceAdapterPlan(
      {
        request: {
          aoi: {
            centroid: { latitude: 39.74, longitude: -104.99 },
            label: "Denver public-safe AOI"
          },
          layers: ["terrain"]
        }
      },
      { env: {}, fetchImpl }
    );

    expect(plan.status).toBe("ready");
    expect(plan.selectedSource?.id).toBe("usgs-3dep");
    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain("/3DEPElevationIndex/MapServer/1/query");
  });

  it("resolves a live North America DTM chain to LidarBC before broader Canada/USA fallbacks", async () => {
    const requests: string[] = [];
    const fetchImpl: typeof fetch = async (url) => {
      requests.push(String(url));
      return new Response(JSON.stringify(lidarBcOneMeterDemResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    };

    const plan = await createLiveNorthAmericaDtmSourceAdapterPlan(
      {
        request: {
          aoi: {
            centroid: { latitude: 49.2827, longitude: -123.1207 },
            label: "Vancouver public-safe AOI"
          },
          layers: ["terrain"]
        }
      },
      { env: {}, fetchImpl }
    );

    expect(plan.status).toBe("ready");
    expect(plan.selectedSource?.id).toBe("bc-lidarbc");
    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain("/FeatureServer/5/query");
  });

  it("keeps a live LidarBC DTM candidate only after required source pixel proof covers the AOI", async () => {
    const requests: string[] = [];
    const probes: Array<{
      providerId: string;
      role: string;
      allowTwoMeterFallback: boolean | undefined;
    }> = [];
    const fetchImpl: typeof fetch = async (url) => {
      requests.push(String(url));
      return new Response(JSON.stringify(lidarBcOneMeterDemResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    };

    const plan = await createLiveNorthAmericaDtmSourceAdapterPlan(
      {
        request: {
          aoi: {
            centroid: { latitude: 49.2827, longitude: -123.1207 },
            label: "Vancouver public-safe AOI"
          },
          layers: ["terrain"]
        }
      },
      {
        env: {},
        fetchImpl,
        requireSourcePixelCoverage: true,
        terrainCogCoordinateProbe: async (probeOptions) => {
          probes.push({
            providerId: probeOptions.providerId,
            role: probeOptions.role,
            allowTwoMeterFallback: probeOptions.allowTwoMeterFallback
          });
          return {
            runClass: "live-proof",
            providerId: probeOptions.providerId,
            role: probeOptions.role,
            groundModelRole: "bare-earth-dtm",
            status: "covered",
            resolutionMeters: 1,
            coverageSourceIds: ["bc-lidarbc:dtm:092g025_3_4_2:2025"],
            sourceAsset: null,
            renderedArtifact: null,
            reasons: []
          };
        }
      }
    );

    expect(plan.status).toBe("ready");
    expect(plan.selectedSource?.id).toBe("bc-lidarbc");
    expect(requests).toHaveLength(1);
    expect(probes).toEqual([
      {
        providerId: "bc-lidarbc",
        role: "dtm",
        allowTwoMeterFallback: false
      }
    ]);
    expect(plan.warnings.join(" ")).toContain("Source pixel coverage probe proved");
  });

  it("blocks live BC and HRDEM DTM candidates when required source pixel proof finds no valid terrain pixels", async () => {
    const requests: string[] = [];
    const probes: Array<{
      providerId: string;
      role: string;
      allowTwoMeterFallback: boolean | undefined;
    }> = [];
    const fetchImpl: typeof fetch = async (url) => {
      const requestUrl = String(url);
      requests.push(requestUrl);
      if (requestUrl.includes("/FeatureServer/5/query")) {
        return new Response(JSON.stringify(lidarBcOneMeterDemResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (requestUrl.includes("/3DEPElevationIndex/MapServer/1/query")) {
        return new Response(JSON.stringify(emptyCoverageResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify(canadaHrdemOneMeterStac), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    };

    const plan = await createLiveNorthAmericaDtmSourceAdapterPlan(
      {
        request: {
          aoi: {
            centroid: { latitude: 49.2827, longitude: -123.1207 },
            label: "Vancouver public-safe AOI"
          },
          layers: ["terrain"]
        }
      },
      {
        env: {},
        fetchImpl,
        requireSourcePixelCoverage: true,
        terrainCogCoordinateProbe: async (probeOptions) => {
          probes.push({
            providerId: probeOptions.providerId,
            role: probeOptions.role,
            allowTwoMeterFallback: probeOptions.allowTwoMeterFallback
          });
          return {
            runClass: "live-proof",
            providerId: probeOptions.providerId,
            role: probeOptions.role,
            groundModelRole: "bare-earth-dtm",
            status: "blocked",
            resolutionMeters: null,
            coverageSourceIds: [],
            sourceAsset: null,
            renderedArtifact: null,
            reasons: ["sampled window contains no valid pixels"]
          };
        }
      }
    );

    expect(plan.status).toBe("blocked");
    expect(plan.inputRefs).toHaveLength(0);
    expect(requests).toHaveLength(4);
    expect(probes).toEqual([
      {
        providerId: "bc-lidarbc",
        role: "dtm",
        allowTwoMeterFallback: false
      },
      {
        providerId: "canada-hrdem",
        role: "dtm",
        allowTwoMeterFallback: false
      },
      {
        providerId: "canada-hrdem",
        role: "dtm",
        allowTwoMeterFallback: true
      }
    ]);
    expect(plan.blockedReasons.join(" ")).toContain("source pixel coverage probe failed");
    expect(plan.blockedReasons.join(" ")).toContain("sampled window contains no valid pixels");
    expect(plan.warnings.join(" ")).toContain("must not claim heightfield-ready terrain");
    expect(plan.warnings.join(" ")).toContain("No official USA/Canada DTM source adapter");
  });

  it("resolves configured Kamloops municipal DTM override before public catalog fetches", async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new Error("configured Kamloops municipal DTM should not need a catalog fetch");
    };

    const plan = await createLiveNorthAmericaDtmSourceAdapterPlan(
      {
        request: {
          aoi: {
            centroid: { latitude: 50.64, longitude: -120.26 },
            label: "Kamloops public-safe municipal AOI"
          },
          layers: ["terrain"]
        }
      },
      {
        env: {},
        fetchImpl,
        kamloopsLocalLidarGeoTiffUrlTemplate:
          "https://terrain.example.test/kamloops/{packageId}.tif?bbox={bbox}"
      }
    );

    expect(plan.status).toBe("ready");
    expect(plan.selectedSource?.id).toBe("kamloops-local-lidar-dtm-1m");
    expect(plan.toolProfile?.toolId).toBe("kamloops-local-lidar");
    expect(plan.inputRefs[0]).toMatchObject({
      kind: "direct-geotiff",
      format: "geotiff",
      provider: "City of Kamloops municipal LiDAR/DEM Open Data",
      groundModelRole: "bare-earth-dtm",
      targetResolutionMeters: 1
    });
    expect(plan.inputRefs[0].url).toContain("terrain.example.test/kamloops/");
    expect(plan.inputRefs[0].notes.join(" ")).toContain("Abundance must window");
  });

  it("resolves Kamloops municipal public DEM-grid coverage before BC/Canada fallbacks", async () => {
    const requests: string[] = [];
    const fetchImpl: typeof fetch = async (url) => {
      requests.push(String(url));
      return new Response(JSON.stringify(kamloopsDemGridResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    };

    const plan = await createLiveNorthAmericaDtmSourceAdapterPlan(
      {
        request: {
          aoi: {
            centroid: { latitude: 50.64, longitude: -120.26 },
            label: "Kamloops public-safe municipal AOI"
          },
          layers: ["terrain"]
        }
      },
      { env: {}, fetchImpl }
    );

    expect(plan.status).toBe("ready");
    expect(plan.selectedSource?.id).toBe("kamloops-local-lidar-dtm-1m");
    expect(plan.toolProfile?.toolId).toBe("kamloops-local-lidar");
    expect(plan.inputRefs[0]).toMatchObject({
      kind: "zip-archive",
      format: "zip",
      role: "terrain-source",
      provider: "City of Kamloops municipal LiDAR/DEM Open Data",
      groundModelRole: "bare-earth-dtm",
      targetResolutionMeters: 1
    });
    expect(plan.inputRefs[0].url).toBe(
      "https://maps.kamloops.ca/opendata/DEM/2024_CGVD2013/DEM_CGVD2013_5156B.zip"
    );
    expect(plan.inputRefs[0].notes.join(" ")).toContain("DEM grid CELLNAME 5156B");
    expect(plan.inputRefs[0].notes.join(" ")).toContain(
      "https://maps.kamloops.ca/opendata/Lidar/2024/5156B.zip"
    );
    expect(plan.inputRefs[0].notes.join(" ")).toContain("not emitted");
    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain("/FeatureDataset/GIS_Administrative_1/MapServer/6/query");
    expect(requests[0]).toContain("geometryType=esriGeometryEnvelope");
    expect(requests[0]).toMatch(/geometry=-120\.[0-9]+%2C50\.[0-9]+%2C-120\.[0-9]+%2C50\.[0-9]+/);
  });

  it("uses official Kamloops derived-elevation refs when the municipal DEM grid has no raster cells", async () => {
    const requests: string[] = [];
    const fetchImpl: typeof fetch = async (url) => {
      const requestUrl = String(url);
      requests.push(requestUrl);
      if (requestUrl.includes("/FeatureDataset/GIS_Administrative_1/MapServer/6/query")) {
        return new Response(JSON.stringify(emptyCoverageResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      throw new Error(
        "municipal derived-elevation fallback should avoid provincial fallback fetches"
      );
    };

    const plan = await createLiveNorthAmericaDtmSourceAdapterPlan(
      {
        request: {
          aoi: kamloopsThreeKmAoi(50.64, -120.26, "Kamloops public-safe fallback AOI"),
          layers: ["terrain"]
        }
      },
      { env: {}, fetchImpl }
    );

    expect(plan.status).toBe("ready");
    expect(plan.selectedSource?.id).toBe("kamloops-local-lidar-dtm-1m");
    expect(plan.toolProfile?.toolId).toBe("kamloops-local-lidar");
    expect(plan.inputRefs).toHaveLength(2);
    expect(plan.inputRefs[0]).toMatchObject({
      kind: "zip-archive",
      format: "zip",
      role: "terrain-source",
      url: "https://maps.kamloops.ca/OpenData/zipfiles/DEMPointBreakSHP.zip"
    });
    expect(plan.inputRefs[1]).toMatchObject({
      kind: "arcgis-feature-query",
      format: "json",
      role: "terrain-source",
      url: "https://maps.kamloops.ca/arcgis/rest/services/CityWorks/UtilityBaseMap/MapServer/4"
    });
    expect(plan.warnings.join(" ")).toContain("contour");
    expect(plan.warnings.join(" ")).toContain("Do not label");
    expect(plan.warnings.join(" ")).toContain("1m LiDAR raster");
    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain("/FeatureDataset/GIS_Administrative_1/MapServer/6/query");
  });

  it("uses official Kamloops derived-elevation refs when partial DEM-grid cells are not downloadable", async () => {
    const requests: string[] = [];
    const fetchImpl: typeof fetch = async (url) => {
      const requestUrl = String(url);
      requests.push(requestUrl);
      if (requestUrl.includes("/FeatureDataset/GIS_Administrative_1/MapServer/6/query")) {
        return new Response(JSON.stringify(kamloopsPartialDemGridResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      throw new Error(
        "municipal derived-elevation fallback should avoid provincial fallback fetches"
      );
    };

    const plan = await createLiveNorthAmericaDtmSourceAdapterPlan(
      {
        request: {
          aoi: kamloopsThreeKmAoi(50.68, -120.23, "Kamloops partial public-safe AOI"),
          layers: ["terrain"]
        }
      },
      { env: {}, fetchImpl }
    );

    expect(plan.status).toBe("ready");
    expect(plan.selectedSource?.id).toBe("kamloops-local-lidar-dtm-1m");
    expect(plan.toolProfile?.toolId).toBe("kamloops-local-lidar");
    expect(plan.inputRefs).toHaveLength(2);
    expect(plan.inputRefs[0]).toMatchObject({
      kind: "zip-archive",
      format: "zip",
      role: "terrain-source",
      url: "https://maps.kamloops.ca/OpenData/zipfiles/DEMPointBreakSHP.zip"
    });
    expect(plan.inputRefs[1]).toMatchObject({
      kind: "arcgis-feature-query",
      format: "json",
      role: "terrain-source",
      url: "https://maps.kamloops.ca/arcgis/rest/services/CityWorks/UtilityBaseMap/MapServer/4"
    });
    expect(plan.warnings.join(" ")).toContain("non-downloadable raster cell");
    expect(plan.warnings.join(" ")).toContain("Do not label");
    expect(plan.warnings.join(" ")).toContain("1m LiDAR raster");
    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain("/FeatureDataset/GIS_Administrative_1/MapServer/6/query");
  });

  it("resolves an ambiguous border-box Canada DTM chain by blocking USGS then selecting HRDEM", async () => {
    const requests: string[] = [];
    const fetchImpl: typeof fetch = async (url) => {
      const requestUrl = String(url);
      requests.push(requestUrl);
      if (requestUrl.includes("/3DEPElevationIndex/MapServer/1/query")) {
        return new Response(JSON.stringify(emptyCoverageResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify(canadaHrdemOneMeterStac), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    };

    const plan = await createLiveNorthAmericaDtmSourceAdapterPlan(
      {
        request: {
          aoi: {
            centroid: { latitude: 45.4215, longitude: -75.6972 },
            label: "Ottawa public-safe AOI"
          },
          layers: ["terrain"]
        }
      },
      { env: {}, fetchImpl }
    );

    expect(plan.status).toBe("ready");
    expect(plan.selectedSource?.id).toBe("canada-hrdem");
    expect(requests).toHaveLength(2);
    expect(requests[0]).toContain("/3DEPElevationIndex/MapServer/1/query");
    expect(requests[1]).toBe("https://datacube.services.geo.ca/stac/api/search");
  });

  it("resolves a live North America DSM chain to USGS LPC for covered USA AOIs", async () => {
    const requests: string[] = [];
    const fetchImpl: typeof fetch = async (url) => {
      requests.push(String(url));
      return new Response(JSON.stringify(usgsLpcDsmResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    };

    const plan = await createLiveNorthAmericaDsmSourceAdapterPlan(
      {
        request: {
          aoi: {
            centroid: { latitude: 39.74, longitude: -104.99 },
            label: "Denver public-safe AOI"
          },
          layers: ["terrain"]
        }
      },
      { env: {}, fetchImpl }
    );

    expect(plan.status).toBe("ready");
    expect(plan.selectedSource?.id).toBe("usgs-3dep-lpc-dsm");
    expect(plan.inputRefs[0].groundModelRole).toBe("surface-dsm");
    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain("/3DEPElevationIndex/MapServer/8/query");
  });

  it("resolves a live North America DSM chain to LidarBC before broader Canada fallbacks", async () => {
    const requests: string[] = [];
    const fetchImpl: typeof fetch = async (url) => {
      requests.push(String(url));
      return new Response(JSON.stringify(lidarBcOneMeterDsmResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    };

    const plan = await createLiveNorthAmericaDsmSourceAdapterPlan(
      {
        request: {
          aoi: {
            centroid: { latitude: 49.2827, longitude: -123.1207 },
            label: "Vancouver public-safe AOI"
          },
          layers: ["terrain"]
        }
      },
      { env: {}, fetchImpl }
    );

    expect(plan.status).toBe("ready");
    expect(plan.selectedSource?.id).toBe("bc-lidarbc-dsm");
    expect(plan.inputRefs[0].groundModelRole).toBe("surface-dsm");
    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain("/FeatureServer/1/query");
  });

  it("resolves an ambiguous border-box Canada DSM chain by blocking USGS LPC then selecting HRDEM DSM", async () => {
    const requests: string[] = [];
    const fetchImpl: typeof fetch = async (url) => {
      const requestUrl = String(url);
      requests.push(requestUrl);
      if (requestUrl.includes("/3DEPElevationIndex/MapServer/8/query")) {
        return new Response(JSON.stringify(usgsLpcNonQualifyingResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify(canadaHrdemOneMeterStac), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    };

    const plan = await createLiveNorthAmericaDsmSourceAdapterPlan(
      {
        request: {
          aoi: {
            centroid: { latitude: 45.4215, longitude: -75.6972 },
            label: "Ottawa public-safe AOI"
          },
          layers: ["terrain"]
        }
      },
      { env: {}, fetchImpl }
    );

    expect(plan.status).toBe("ready");
    expect(plan.selectedSource?.id).toBe("canada-hrdem-dsm");
    expect(plan.inputRefs[0].groundModelRole).toBe("surface-dsm");
    expect(requests).toHaveLength(2);
    expect(requests[0]).toContain("/3DEPElevationIndex/MapServer/8/query");
    expect(requests[1]).toBe("https://datacube.services.geo.ca/stac/api/search");
  });

  it("rejects secret-bearing configured source refs without emitting them", () => {
    const plan = createTerrainSourceAdapterPlan(
      {
        request: {
          aoi: sampleAoi,
          layers: ["terrain"],
          preferredSourceIds: ["canada-hrdem"]
        }
      },
      {
        env: {},
        canadaHrdemGeoTiffUrl: "https://data.example.test/hrdem.tif?signature=secret"
      }
    );

    expect(plan.status).toBe("blocked");
    expect(plan.inputRefs).toHaveLength(0);
    expect(plan.blockedReasons.join(" ")).toContain("secret-bearing");
    expect(plan.blockedReasons.join(" ")).not.toContain("signature=secret");
  });

  it("blocks map-ready fallback terrain as non-source-native package input", () => {
    const plan = createTerrainSourceAdapterPlan(
      {
        request: {
          aoi: sampleAoi,
          layers: ["terrain"],
          preferredSourceIds: ["mapterhorn-pmtiles-terrain"]
        }
      },
      { env: {} }
    );

    expect(plan.status).toBe("blocked");
    expect(plan.runClass).toBe("dry-run");
    expect(plan.selectedSource?.id).toBe("mapterhorn-pmtiles-terrain");
    expect(plan.blockedReasons.join(" ")).toContain("not an official source-native");
  });

  it("reports source-native support for the initial USA and Canada adapters", () => {
    expect(isSourceNativeTerrainAdapterSupported("usgs-3dep")).toBe(true);
    expect(isSourceNativeTerrainAdapterSupported("usgs-3dep-lpc-dsm")).toBe(true);
    expect(isSourceNativeTerrainAdapterSupported("canada-hrdem")).toBe(true);
    expect(isSourceNativeTerrainAdapterSupported("canada-hrdem-best-dtm")).toBe(true);
    expect(isSourceNativeTerrainAdapterSupported("canada-hrdem-dsm")).toBe(true);
    expect(isSourceNativeTerrainAdapterSupported("bc-lidarbc")).toBe(true);
    expect(isSourceNativeTerrainAdapterSupported("bc-lidarbc-dsm")).toBe(true);
    expect(isSourceNativeTerrainAdapterSupported("mapterhorn-pmtiles-terrain")).toBe(false);
  });

  it("expands common source URL placeholders deterministically", () => {
    const expanded = expandTerrainSourceUrlTemplate({
      template:
        "https://example.test/{toolId}/{sourceId}/{packageId}?bbox={bbox}&r={targetResolutionMeters}",
      bbox: { west: -1.1234567, south: 2.5, east: 3.25, north: 4.75 },
      packageId: "pkg-1",
      sourceId: "src-1",
      toolId: "tool-1",
      targetResolutionMeters: 2,
      widthPx: 256,
      heightPx: 512
    });

    expect(expanded).toBe(
      "https://example.test/tool-1/src-1/pkg-1?bbox=-1.123457,2.5,3.25,4.75&r=2"
    );
  });
});

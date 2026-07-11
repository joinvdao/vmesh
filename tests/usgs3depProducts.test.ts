import { describe, expect, it } from "vitest";

import {
  createUsgs3depProductsQueryUrl,
  selectUsgs3depProductAssets
} from "@/lib/geospatialPackage/usgs3depProducts";

describe("USGS 3DEP product resolver", () => {
  it("creates a bounded exact-frame 1 m GeoTIFF query", () => {
    const url = new URL(
      createUsgs3depProductsQueryUrl({ west: -105, south: 39.7, east: -104.9, north: 39.8 })
    );
    expect(url.hostname).toBe("tnmaccess.nationalmap.gov");
    expect(url.searchParams.get("datasets")).toContain("1 meter");
    expect(url.searchParams.get("max")).toBe("100");
  });

  it("accepts only unsigned official TNM GeoTIFF refs", () => {
    const assets = selectUsgs3depProductAssets({
      items: [
        {
          sourceId: "valid",
          title: "USGS 1 Meter",
          downloadURL: "https://prd-tnm.s3.amazonaws.com/path/dem.tif"
        },
        { downloadURL: "https://example.test/dem.tif" },
        { downloadURL: "https://prd-tnm.s3.amazonaws.com/path/dem.tif?signature=secret" }
      ]
    });
    expect(assets).toEqual([
      {
        id: "valid",
        title: "USGS 1 Meter",
        url: "https://prd-tnm.s3.amazonaws.com/path/dem.tif"
      }
    ]);
  });
});

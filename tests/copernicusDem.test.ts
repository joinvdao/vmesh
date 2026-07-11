import { describe, expect, it, vi } from "vitest";

import {
  copernicusDemTilesForBbox,
  verifyCopernicusDemTiles
} from "@/lib/geospatialPackage/copernicusDem";

describe("Copernicus DEM tile resolver", () => {
  it("addresses the exact one-degree COGs covering a frame", () => {
    const tiles = copernicusDemTilesForBbox({
      west: -120.3,
      south: 50.6,
      east: -120.2,
      north: 50.7
    });
    expect(tiles).toHaveLength(1);
    expect(tiles[0].id).toBe("Copernicus_DSM_COG_10_N50_00_W121_00_DEM");
  });

  it("covers wrapped anti-meridian frames without spanning the globe", () => {
    const tiles = copernicusDemTilesForBbox({
      west: 179.99,
      south: -17.1,
      east: -179.99,
      north: -17
    });
    expect(tiles.map((tile) => tile.longitudeDegree)).toEqual([179, -180]);
  });

  it("separates verified tiles from no-data or provider failures", async () => {
    const tiles = copernicusDemTilesForBbox({ west: 10, south: 10, east: 12, north: 11 });
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    const result = await verifyCopernicusDemTiles(tiles, { fetchImpl });
    expect(result.available).toHaveLength(1);
    expect(result.missing).toHaveLength(1);
  });
});

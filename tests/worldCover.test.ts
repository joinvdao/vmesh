import { describe, expect, it, vi } from "vitest";

import {
  WORLD_COVER_LEGEND,
  verifyWorldCoverTiles,
  worldCoverClassContext,
  worldCoverTilesForBbox
} from "@/lib/geospatialPackage/worldCover";

describe("ESA WorldCover adapter", () => {
  it("addresses the 3 degree COG covering an exact frame", () => {
    const tiles = worldCoverTilesForBbox({ west: -120.3, south: 50.6, east: -120.2, north: 50.7 });
    expect(tiles).toHaveLength(1);
    expect(tiles[0].id).toBe("ESA_WorldCover_10m_2021_v200_N48W123_Map");
  });

  it("handles anti-meridian frames without global expansion", () => {
    const tiles = worldCoverTilesForBbox({
      west: 179.99,
      south: -17.8,
      east: -179.99,
      north: -17.7
    });
    expect(tiles.map((tile) => tile.longitudeDegree)).toEqual([177, -180]);
  });

  it("retains classified landcover labels without species inference", () => {
    expect(WORLD_COVER_LEGEND[10]).toBe("tree-cover");
    expect(Object.values(WORLD_COVER_LEGEND).join(" ")).not.toMatch(/species/i);
  });

  it.each([
    [50, "built-landcover"],
    [60, "bare-landcover"],
    [70, "snow-ice-landcover"],
    [80, "water-landcover"],
    [30, "vegetated-landcover"],
    [null, "no-data"]
  ])("maps class %s to deterministic context %s", (code, contextId) => {
    expect(worldCoverClassContext(code)).toMatchObject({ contextId });
    expect(worldCoverClassContext(code).limitations.join(" ")).toContain("not species");
  });

  it("distinguishes available and missing source COGs", async () => {
    const tiles = worldCoverTilesForBbox({ west: 0, south: 0, east: 4, north: 1 });
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(null))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    const result = await verifyWorldCoverTiles(tiles, { fetchImpl });
    expect(result.available).toHaveLength(1);
    expect(result.missing).toHaveLength(1);
  });
});

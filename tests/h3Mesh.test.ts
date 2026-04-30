import { describe, expect, it } from "vitest";
import { getResolution } from "h3-js";

import {
  DEFAULT_U5_CELL,
  generateLocalU8Cells,
  getCellParent,
  isValidTierCell,
  MESH_TIER_RESOLUTIONS,
  meshTierToResolution
} from "@/lib/h3Mesh";

describe("h3 mesh tiers", () => {
  it("maps product tiers to fixed H3 resolutions", () => {
    expect(meshTierToResolution("U3")).toBe(3);
    expect(meshTierToResolution("U5")).toBe(5);
    expect(meshTierToResolution("U8")).toBe(8);
    expect(MESH_TIER_RESOLUTIONS).toEqual({ U3: 3, U5: 5, U8: 8 });
  });

  it("generates capped U8 cells inside the selected U5 parent", () => {
    const cells = generateLocalU8Cells(DEFAULT_U5_CELL, 24);
    expect(cells).toHaveLength(24);
    expect(cells.every((cell) => getResolution(cell) === 8)).toBe(true);
    expect(cells.every((cell) => getCellParent(cell, "U5") === DEFAULT_U5_CELL)).toBe(true);
  });

  it("validates cells against their product tier", () => {
    expect(isValidTierCell(DEFAULT_U5_CELL, "U5")).toBe(true);
    expect(isValidTierCell(DEFAULT_U5_CELL, "U8")).toBe(false);
  });
});

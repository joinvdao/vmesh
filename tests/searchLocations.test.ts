import { describe, expect, it } from "vitest";

import { buildCellFromCoordinate } from "@/lib/h3Mesh";

describe("typed search coordinates", () => {
  it("supports typed latitude longitude inputs through H3-compatible coordinates", () => {
    const londonCell = buildCellFromCoordinate(51.5072, -0.1276, "U5");

    expect(londonCell).toBeTypeOf("string");
    expect(londonCell.length).toBeGreaterThan(0);
  });
});

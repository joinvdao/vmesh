import { describe, expect, it } from "vitest";

import { buildCanonicalPromotionRows } from "../lib/canonicalSourcePromotion";

const NOW = new Date("2026-07-12T00:00:00.000Z");

describe("buildCanonicalPromotionRows", () => {
  it("maps every independently proven operational source to a curated canonical row", () => {
    const rows = buildCanonicalPromotionRows(NOW);
    expect(rows.map((row) => row.source.id).sort()).toEqual([
      "copernicus-dem-glo30",
      "esa-worldcover",
      "open-meteo-forecast",
      "overture-maps-geoparquet",
      "soilgrids",
      "usgs-3dep"
    ]);
    expect(rows.every((row) => row.result.decision === "promoted")).toBe(true);
    expect(rows.every((row) => row.source.license.length > 0)).toBe(true);
    expect(rows.every((row) => row.source.limitations.length > 0)).toBe(true);
    expect(rows.every((row) => row.dataBucket.length > 0)).toBe(true);
  });

  it("keeps terrain resolution numeric only where the proof declares metres", () => {
    const rows = buildCanonicalPromotionRows(NOW);
    expect(rows.find((row) => row.source.id === "copernicus-dem-glo30")?.resolutionMeters).toBe(30);
    expect(
      rows.find((row) => row.source.id === "open-meteo-forecast")?.resolutionMeters
    ).toBeNull();
  });
});

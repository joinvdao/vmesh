import { describe, expect, it } from "vitest";

import {
  computeAntifragilityScore,
  getAntifragilityColor,
  getScoreStatus,
  interpolateRgb
} from "@/lib/meshScoring";

describe("mesh scoring", () => {
  it("interpolates RGB colors with stable tuple output", () => {
    expect(interpolateRgb([0, 0, 0], [100, 200, 50], 0.5)).toEqual([50, 100, 25]);
    expect(getAntifragilityColor(85)).toHaveLength(3);
  });

  it("derives readable status labels", () => {
    expect(getScoreStatus(82)).toBe("Very High Antifragility");
    expect(getScoreStatus(70)).toBe("High Antifragility");
    expect(getScoreStatus(42)).toBe("Watch");
  });

  it("inverts risk when computing the antifragility score", () => {
    const lowRisk = computeAntifragilityScore({
      climate: 70,
      energy: 70,
      water: 70,
      infrastructure: 70,
      biodiversity: 70,
      risk: 20
    });
    const highRisk = computeAntifragilityScore({
      climate: 70,
      energy: 70,
      water: 70,
      infrastructure: 70,
      biodiversity: 70,
      risk: 80
    });
    expect(lowRisk).toBeGreaterThan(highRisk);
  });
});

import { describe, expect, it } from "vitest";

import {
  createMockClimateSummary,
  createMockHazardRisk,
  createMockSolarPotential,
  mockFoodNetworkAssets,
  mockHubNodeStatus,
  mockPropertySignals,
  summarizeFoodNetwork
} from "@/data/mockVmeshData";
import {
  scoreFireExposure,
  scoreFloodExposure,
  scoreSolarPracticality,
  scoreWeatherStress
} from "@/lib/macroData";
import { DEFAULT_U5_CELL } from "@/lib/h3Mesh";

describe("macro provider mock boundaries", () => {
  it("scores weather, flood, fire, and solar summaries deterministically", () => {
    const climate = createMockClimateSummary(3);
    const hazard = createMockHazardRisk(3);
    const solar = createMockSolarPotential(3);

    expect(scoreWeatherStress(climate)).toBeGreaterThan(0);
    expect(scoreFloodExposure(hazard)).toBeGreaterThan(0);
    expect(scoreFireExposure(hazard)).toBeLessThanOrEqual(100);
    expect(scoreSolarPracticality(solar)).toBeGreaterThanOrEqual(0);
    expect(climate.provenance.sourceType).toBe("mock");
  });
});

describe("micro food and property records", () => {
  it("keeps local food network records typed and privacy-safe", () => {
    expect(mockFoodNetworkAssets.length).toBeGreaterThan(0);
    expect(mockFoodNetworkAssets.every((asset) => asset.contact !== "user-added-private")).toBe(
      true
    );
    expect(summarizeFoodNetwork(mockFoodNetworkAssets[0].h3Id).assets.length).toBeGreaterThan(0);
  });

  it("uses approximate H3 property signals without exact addresses or scraped sources", () => {
    expect(mockPropertySignals.length).toBeGreaterThan(0);
    expect(mockPropertySignals.every((signal) => signal.approximateLocation.includes("H3"))).toBe(
      true
    );
    expect(mockPropertySignals.every((signal) => signal.source.sourceType === "mock")).toBe(true);
  });
});

describe("hub gateway mocks", () => {
  it("models Reticulum first with Meshtastic as a bridge and local LLM status", () => {
    expect(mockHubNodeStatus.reticulum.status).toBe("bridge-connected");
    expect(mockHubNodeStatus.meshtastic.radioPath).toBe("mock");
    expect(mockHubNodeStatus.localLlm.endpoint).toContain("localhost");
    expect(DEFAULT_U5_CELL).toBeTypeOf("string");
  });
});

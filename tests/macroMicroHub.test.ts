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
import { DEFAULT_U5_CELL } from "@/lib/h3Mesh";

describe("deferred analysis provider mock boundaries", () => {
  it("keeps weather, flood, fire, and solar context source-labelled", () => {
    const climate = createMockClimateSummary(3);
    const hazard = createMockHazardRisk(3);
    const solar = createMockSolarPotential(3);

    expect(climate.provenance.sourceType).toBe("mock");
    expect(hazard.fireInputs.length).toBeGreaterThan(0);
    expect(solar.irradianceBand).toMatch(/low|medium|high/);
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

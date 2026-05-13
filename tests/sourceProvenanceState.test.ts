import { describe, expect, it } from "vitest";

import { initialVmeshState } from "@/store/vmeshInitialState";

describe("source provenance state", () => {
  it("exposes active provider IDs and read-only provenance inputs for the source drawer", () => {
    const state = initialVmeshState;

    expect(state.mapStatus.basemapProviderId).toBe(state.selectedBasemapProviderId);
    expect(state.mapStatus.providerId).toBe(state.selectedTerrainProviderId);
    expect(state.mapStatus.macroProviderId).toBe(state.selectedMacroProviderId);
    expect(state.mapStatus.imageryProviderId).toBe(state.selectedImageryProviderId);
    expect(state.selectedHexDetails.provenance.license.length).toBeGreaterThan(0);
    expect(state.selectedMacroSummary.provenance.limitations).toContain("not operational");
    expect(state.imageryManifest.provenance.limitations).toContain("offline/server-side");
  });

  it("keeps source registry statuses explicit for future provider review", () => {
    const statuses = [
      ...initialVmeshState.basemapProviders,
      ...initialVmeshState.terrainProviders,
      ...initialVmeshState.macroProviders,
      ...initialVmeshState.imageryProviders
    ].map((provider) => provider.status);

    expect(statuses).toContain("available");
    expect(statuses).toContain("future");
    expect(statuses).toContain("preprocessing-required");
  });
});

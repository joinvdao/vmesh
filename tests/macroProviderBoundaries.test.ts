import { describe, expect, it } from "vitest";

import { macroPackageProviderBoundaries } from "@/lib/macroProviders";

describe("macro package provider boundaries", () => {
  it("keeps broad provider preprocessing out of browser fetch paths", () => {
    const broadProviders = macroPackageProviderBoundaries.filter(
      (provider) => provider.packageRole !== "selected-cell-live"
    );

    expect(broadProviders.length).toBeGreaterThanOrEqual(6);
    expect(broadProviders.every((provider) => provider.browserFetchAllowed === false)).toBe(true);
  });

  it("requires provenance and limitations for every provider boundary", () => {
    expect(
      macroPackageProviderBoundaries.every(
        (provider) =>
          provider.requiredProvenance.length > 0 &&
          provider.limitations.length > 0 &&
          provider.outputLayers.length > 0
      )
    ).toBe(true);
  });

  it("allows only the selected-cell Open-Meteo path to fetch from the browser", () => {
    const browserProviders = macroPackageProviderBoundaries.filter(
      (provider) => provider.browserFetchAllowed
    );

    expect(browserProviders).toHaveLength(1);
    expect(browserProviders[0].providerId).toBe("open-meteo-forecast");
  });
});

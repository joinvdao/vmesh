import { describe, expect, it } from "vitest";

import { getContourProviderRegistry } from "@/lib/terrainSources";

describe("contour provider registry", () => {
  it("keeps contours as derived/precomputed provider plumbing", () => {
    const providers = getContourProviderRegistry();

    expect(providers).toHaveLength(2);
    expect(providers[0].notes).toContain("precomputed");
    expect(providers[1].sourceUrl).toContain("pmtiles");
  });
});

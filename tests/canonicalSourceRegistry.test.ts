import { describe, expect, it } from "vitest";

import {
  canonicalRowsToSources,
  loadCanonicalSourceRegistry
} from "../lib/canonicalSourceRegistry";

const PROMOTED_ROW = {
  id: "copernicus-dem-glo30",
  title: "Copernicus DEM GLO-30/GLO-90",
  provider: "Copernicus DEM via AWS Open Data",
  source_url: "https://copernicus-dem-30m.s3.amazonaws.com/",
  license: "Copernicus DEM free licence; European Union/ESA attribution required",
  source_role: "generic-dem",
  resolution_meters: 30,
  asset_roles: {
    layerIds: ["terrain", "contours"],
    artifactKinds: ["cog", "api", "manifest"]
  },
  limitations: ["Global fallback; local DTM outranks it."],
  coverage: { coverageSummary: "covered", resolutionOrScale: "30 m" },
  endpoint_type: "cog",
  promotion_state: "promoted",
  capability_state: "abundance-live-proven"
};

describe("canonical source registry", () => {
  it("converts only complete promoted rows into package sources", () => {
    const sources = canonicalRowsToSources([
      PROMOTED_ROW,
      { ...PROMOTED_ROW, id: "quarantined", promotion_state: "quarantine" },
      { ...PROMOTED_ROW, id: "unsafe", source_url: "http://localhost/source" }
    ]);
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({
      id: "copernicus-dem-glo30",
      layerIds: ["terrain", "contours"],
      artifactKinds: ["cog", "api", "manifest"],
      resolution: "30 m"
    });
  });

  it("uses canonical promoted ids when the durable query succeeds", async () => {
    const resolved = await loadCanonicalSourceRegistry({ query: async () => [PROMOTED_ROW] });
    expect(resolved.mode).toBe("canonical-primary");
    expect(resolved.promotedSourceIds).toEqual(new Set(["copernicus-dem-glo30"]));
    expect(resolved.sources.find((source) => source.id === "copernicus-dem-glo30")?.sourceUrl).toBe(
      "https://copernicus-dem-30m.s3.amazonaws.com/"
    );
  });

  it("falls back explicitly to reviewed code promotions on query failure", async () => {
    const resolved = await loadCanonicalSourceRegistry({
      query: async () => {
        throw new Error("offline");
      }
    });
    expect(resolved.mode).toBe("code-fallback");
    expect(resolved.promotedSourceIds.has("copernicus-dem-glo30")).toBe(true);
    expect(resolved.warnings[0]).toContain("explicit reviewed code-registry");
  });
});

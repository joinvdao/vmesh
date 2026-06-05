import { describe, expect, it } from "vitest";

import {
  chooseDsmProviderFromTerrainSourceProbe,
  chooseDtmProviderFromTerrainSourceProbes,
  coordinateToWebMercatorTile,
  createTerrainSourceProbeUrl,
  createTerrainSourceTileUrlFromTemplate,
  type TerrainSourceProbeResult
} from "@/lib/terrainSourceProbeSelection";
import {
  MAPTERHORN_PROVIDER_ID,
  SOURCE_AUTO_BEST_DTM_PROVIDER_ID,
  SOURCE_AUTO_DSM_PROVIDER_ID,
  SOURCE_AUTO_DTM_PROVIDER_ID
} from "@/lib/terrainSources";

function probe(overrides: Partial<TerrainSourceProbeResult>): TerrainSourceProbeResult {
  return {
    schemaVersion: "vmesh-terrain-source-probe-v1",
    runClass: "live-proof",
    status: "blocked",
    selectionMode: "strict-1m",
    providerId: null,
    role: "dtm",
    groundModelRole: "bare-earth-dtm",
    resolutionMeters: null,
    coverageSourceIds: [],
    tileUrlTemplate: null,
    sourceRelease: null,
    reasons: [],
    ...overrides
  };
}

describe("terrain source probe selection", () => {
  it("builds strict and best-available source probe URLs", () => {
    expect(
      createTerrainSourceProbeUrl({
        coordinate: { latitude: 45.4215, longitude: -75.6972 },
        role: "dtm",
        mode: "strict-1m"
      })
    ).toBe("/api/terrain/source-preview/probe?lat=45.4215&lon=-75.6972&role=dtm");

    expect(
      createTerrainSourceProbeUrl({
        coordinate: { latitude: 51.05, longitude: -114.07 },
        role: "dtm",
        mode: "best-available"
      })
    ).toBe("/api/terrain/source-preview/probe?lat=51.05&lon=-114.07&role=dtm&mode=best");
  });

  it("builds a center source-preview tile URL from coordinates", () => {
    expect(
      coordinateToWebMercatorTile({
        coordinate: { latitude: 39.7392, longitude: -104.9903 },
        zoom: 15
      })
    ).toEqual({ z: 15, x: 6827, y: 12436 });

    expect(
      createTerrainSourceTileUrlFromTemplate({
        template: "/api/terrain/source-preview/source-auto/dsm/{z}/{x}/{y}",
        coordinate: { latitude: 39.7392, longitude: -104.9903 },
        zoom: 15
      })
    ).toBe("/api/terrain/source-preview/source-auto/dsm/15/6827/12436");
  });

  it("selects the strict source-auto DTM provider only when 1m DTM is proven", () => {
    const decision = chooseDtmProviderFromTerrainSourceProbes({
      strictProbe: probe({
        status: "covered",
        providerId: "canada-hrdem",
        resolutionMeters: 1,
        tileUrlTemplate: "/api/terrain/source-preview/source-auto/dtm/{z}/{x}/{y}"
      })
    });

    expect(decision.providerId).toBe(SOURCE_AUTO_DTM_PROVIDER_ID);
    expect(decision.strictOneMeterProven).toBe(true);
    expect(decision.terrainStatus).toBe("loading");
  });

  it("selects explicit best-available DTM when Canada only proves 2m coverage", () => {
    const decision = chooseDtmProviderFromTerrainSourceProbes({
      strictProbe: probe({
        status: "blocked",
        providerId: "canada-hrdem",
        resolutionMeters: 2,
        reasons: ["Canada HRDEM STAC found only a non-1m source asset for this role."]
      }),
      bestProbe: probe({
        status: "covered",
        selectionMode: "best-available",
        providerId: "canada-hrdem",
        resolutionMeters: 2,
        tileUrlTemplate: "/api/terrain/source-preview/source-auto-best/dtm/{z}/{x}/{y}"
      })
    });

    expect(decision.providerId).toBe(SOURCE_AUTO_BEST_DTM_PROVIDER_ID);
    expect(decision.strictOneMeterProven).toBe(false);
    expect(decision.resolutionMeters).toBe(2);
    expect(decision.terrainStatus).toBe("fallback");
    expect(decision.message).toContain("explicit 2m");
  });

  it("falls back to visual terrain when no strict or best official DTM source is proven", () => {
    const decision = chooseDtmProviderFromTerrainSourceProbes({
      strictProbe: probe({
        status: "blocked",
        providerId: "canada-hrdem",
        reasons: ["The HRDEM COG asset exists, but the sampled window contains no valid pixels."]
      })
    });

    expect(decision.providerId).toBe(MAPTERHORN_PROVIDER_ID);
    expect(decision.strictOneMeterProven).toBe(false);
    expect(decision.terrainStatus).toBe("fallback");
    expect(decision.message).toContain("No strict 1m DTM");
  });

  it("selects the official DSM preview when 1m DSM source coverage is proven", () => {
    const decision = chooseDsmProviderFromTerrainSourceProbe({
      probe: probe({
        status: "covered",
        role: "dsm",
        groundModelRole: "surface-dsm",
        providerId: "bc-lidarbc",
        resolutionMeters: 1,
        tileUrlTemplate: "/api/terrain/source-preview/bc-lidarbc/dsm/{z}/{x}/{y}"
      })
    });

    expect(decision.providerId).toBe(SOURCE_AUTO_DSM_PROVIDER_ID);
    expect(decision.strictOneMeterProven).toBe(true);
    expect(decision.terrainStatus).toBe("loading");
    expect(decision.message).toContain("Official 1m-class DSM");
  });

  it("keeps the official DSM preview selected for source-available USA LPC DSM checks", () => {
    const decision = chooseDsmProviderFromTerrainSourceProbe({
      probe: probe({
        status: "source-available",
        role: "dsm",
        groundModelRole: "surface-dsm",
        providerId: "usgs-3dep-lpc-dsm",
        resolutionMeters: 1,
        tileUrlTemplate: "/api/terrain/source-preview/source-auto/dsm/{z}/{x}/{y}",
        reasons: [
          "DSM source is available. Display is derived per requested tile by the bounded point-cloud worker."
        ]
      })
    });

    expect(decision.providerId).toBe(SOURCE_AUTO_DSM_PROVIDER_ID);
    expect(decision.strictOneMeterProven).toBe(false);
    expect(decision.terrainStatus).toBe("loading");
    expect(decision.message).toContain("display depends on the bounded DSM worker");
  });

  it("treats sub-meter USA LPC DSM as 1m-class source evidence", () => {
    const decision = chooseDsmProviderFromTerrainSourceProbe({
      probe: probe({
        status: "source-available",
        role: "dsm",
        groundModelRole: "surface-dsm",
        providerId: "usgs-3dep-lpc-dsm",
        resolutionMeters: 0.45720091440182853,
        tileUrlTemplate: "/api/terrain/source-preview/source-auto/dsm/{z}/{x}/{y}"
      })
    });

    expect(decision.providerId).toBe(SOURCE_AUTO_DSM_PROVIDER_ID);
    expect(decision.resolutionMeters).toBe(0.45720091440182853);
    expect(decision.terrainStatus).toBe("loading");
    expect(decision.message).toContain("1m-class DSM");
  });

  it("falls back to visual terrain when no strict DSM source is proven", () => {
    const decision = chooseDsmProviderFromTerrainSourceProbe({
      probe: probe({
        status: "blocked",
        role: "dsm",
        groundModelRole: "surface-dsm",
        providerId: "canada-hrdem",
        reasons: ["Canada HRDEM STAC did not return a usable DSM COG."]
      })
    });

    expect(decision.providerId).toBe(MAPTERHORN_PROVIDER_ID);
    expect(decision.strictOneMeterProven).toBe(false);
    expect(decision.terrainStatus).toBe("fallback");
    expect(decision.message).toContain("No strict 1m DSM");
  });
});

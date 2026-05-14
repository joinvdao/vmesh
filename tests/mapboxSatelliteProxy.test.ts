import { describe, expect, it } from "vitest";

import {
  createMapboxSatelliteUpstreamUrl,
  normalizeMapboxSatelliteTile
} from "@/lib/mapboxSatelliteProxy";

describe("Mapbox satellite proxy helpers", () => {
  it("normalizes valid z/x/y tile params", () => {
    expect(normalizeMapboxSatelliteTile({ z: "4", x: "8", y: "6.jpg" })).toEqual({
      z: 4,
      x: 8,
      y: 6
    });
  });

  it("rejects invalid tile coordinates before proxying", () => {
    expect(() => normalizeMapboxSatelliteTile({ z: "23", x: "0", y: "0" })).toThrow();
    expect(() => normalizeMapboxSatelliteTile({ z: "2", x: "4", y: "0" })).toThrow();
    expect(() => normalizeMapboxSatelliteTile({ z: "2", x: "0", y: "token" })).toThrow();
  });

  it("builds the fixed Mapbox satellite upstream URL with the server token as a query param", () => {
    const url = createMapboxSatelliteUpstreamUrl({ z: 4, x: 8, y: 6 }, "test-token");

    expect(url).toContain("https://api.mapbox.com/v4/mapbox.satellite/4/8/6");
    expect(url).toContain("jpg90?access_token=test-token");
  });
});

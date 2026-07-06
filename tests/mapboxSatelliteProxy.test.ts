import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/mapbox/satellite/[z]/[x]/[y]/route";

import {
  createMapboxSatellitePublicTileUrl,
  createMapboxSatelliteUpstreamUrl,
  isMapboxPublicToken,
  normalizeMapboxSatelliteTile
} from "@/lib/mapboxSatelliteProxy";

describe("Mapbox satellite proxy helpers", () => {
  const originalMapboxToken = process.env.MAPBOX_TOKEN;

  afterEach(() => {
    process.env.MAPBOX_TOKEN = originalMapboxToken;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

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

  it("allows only restricted public pk tokens in direct browser tile templates", () => {
    expect(isMapboxPublicToken("pk.public-token")).toBe(true);
    expect(isMapboxPublicToken("sk.secret-token")).toBe(false);
    expect(createMapboxSatellitePublicTileUrl("pk.public-token")).toBe(
      "https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg90?access_token=pk.public-token"
    );
    expect(() => createMapboxSatellitePublicTileUrl("sk.secret-token")).toThrow();
  });

  it("returns a generic proxy error when the server token is missing", async () => {
    delete process.env.MAPBOX_TOKEN;

    const response = await GET(new NextRequest("http://localhost/api/mapbox/satellite/4/8/6"), {
      params: { z: "4", x: "8", y: "6" }
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Mapbox satellite proxy is not configured."
    });
  });

  it("fetches fixed Mapbox satellite tiles server-side without exposing the token response-side", async () => {
    process.env.MAPBOX_TOKEN = "sk.server-secret";
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: {
          "content-type": "image/jpeg",
          "cache-control": "public, max-age=86400"
        }
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(new NextRequest("http://localhost/api/mapbox/satellite/4/8/6"), {
      params: Promise.resolve({ z: "4", x: "8", y: "6" })
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("https://api.mapbox.com/v4/mapbox.satellite/4/8/6"),
      expect.any(Object)
    );
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("access_token=sk.server-secret");
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect([...response.headers.entries()].join(" ")).not.toContain("sk.server-secret");
    expect(await response.arrayBuffer()).toHaveProperty("byteLength", 3);
  });
});

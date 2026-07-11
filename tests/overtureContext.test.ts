import { describe, expect, it, vi } from "vitest";

import { queryOvertureContext } from "@/lib/geospatialPackage/overtureContext";

function metadataFetch(theme: "transportation" | "base") {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith("catalog.json") && !url.includes("2026-06-17.0")) {
      return Response.json({ latest: "2026-06-17.0" });
    }
    if (url.endsWith(`${theme}/catalog.json`)) {
      return Response.json({
        links: [
          {
            rel: "pmtiles",
            href: `https://tiles.overturemaps.org/2026-06-17.0/${theme}.pmtiles`
          }
        ]
      });
    }
    return Response.json({ license: "ODbL-1.0" });
  });
}

describe("Overture typed context", () => {
  it.each([
    ["roads", "transportation"],
    ["water", "base"]
  ] as const)("distinguishes valid empty %s results", async (dataType, theme) => {
    const result = await queryOvertureContext(
      dataType,
      { west: -0.01, south: -0.01, east: 0.01, north: 0.01 },
      {
        fetchImpl: metadataFetch(theme),
        tileReaderFactory: () => ({ getZxy: vi.fn(async () => undefined) })
      }
    );
    expect(result).toMatchObject({
      dataType,
      status: "query-succeeded-empty",
      license: "ODbL-1.0"
    });
  });

  it("keeps provider failure distinct from empty", async () => {
    const result = await queryOvertureContext(
      "roads",
      { west: -0.01, south: -0.01, east: 0.01, north: 0.01 },
      { fetchImpl: vi.fn(async () => new Response(null, { status: 503 })) }
    );
    expect(result.status).toBe("provider-failed");
    expect(result.warnings.join(" ")).toContain("not a valid empty result");
  });
});

import { describe, expect, it, vi } from "vitest";

import {
  normalizeOvertureBuildingFeature,
  queryOvertureBuildings,
  resolveLatestOvertureBuildingSource
} from "@/lib/geospatialPackage/overtureBuildings";

const RELEASE = "2026-06-17.0";

function metadataFetch() {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith("catalog.json") && !url.includes(RELEASE)) {
      return Response.json({ latest: RELEASE });
    }
    if (url.endsWith("buildings/catalog.json")) {
      return Response.json({
        links: [
          {
            rel: "pmtiles",
            href: `https://tiles.overturemaps.org/${RELEASE}/buildings.pmtiles`
          }
        ]
      });
    }
    return Response.json({
      license: "ODbL-1.0",
      summaries: { columns: ["id", "geometry", "bbox", "class", "subtype", "height"] }
    });
  });
}

describe("Overture building live query", () => {
  it("resolves the latest official release and semantic columns", async () => {
    const plan = await resolveLatestOvertureBuildingSource({ fetchImpl: metadataFetch() });
    expect(plan).toMatchObject({
      release: RELEASE,
      license: "ODbL-1.0",
      pmtilesUrl: `https://tiles.overturemaps.org/${RELEASE}/buildings.pmtiles`
    });
    expect(plan.columns).toEqual(expect.arrayContaining(["class", "subtype", "height"]));
  });

  it("returns valid empty separately from provider failure", async () => {
    const empty = await queryOvertureBuildings(
      { west: -0.01, south: -0.01, east: 0.01, north: 0.01 },
      {
        fetchImpl: metadataFetch(),
        tileReaderFactory: () => ({ getZxy: vi.fn(async () => undefined) })
      }
    );
    const failed = await queryOvertureBuildings(
      { west: -0.01, south: -0.01, east: 0.01, north: 0.01 },
      { fetchImpl: vi.fn(async () => new Response(null, { status: 503 })) }
    );
    expect(empty.status).toBe("query-succeeded-empty");
    expect(failed.status).toBe("provider-failed");
    expect(failed.warnings.join(" ")).toContain("not a valid empty result");
  });

  it("preserves published semantics and leaves missing values null", () => {
    const feature = normalizeOvertureBuildingFeature(
      {
        id: 1,
        geometry: { type: "Polygon", coordinates: [] },
        properties: {
          id: "gers-building-id",
          class: "residential",
          subtype: "house",
          height: 8.5,
          num_floors: 2,
          facade_material: "brick"
        }
      },
      "building",
      RELEASE
    );
    expect(feature?.properties).toMatchObject({
      sourceFeatureId: "gers-building-id",
      sourceRelease: RELEASE,
      class: "residential",
      subtype: "house",
      heightMeters: 8.5,
      levels: 2,
      facadeMaterial: "brick",
      roofShape: null,
      confidence: null
    });
  });
});

import { isValidCell } from "h3-js";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import {
  normalizePackageAoi,
  sanitizeConsumerAppId,
  sanitizePublicUrl
} from "@/lib/geospatialPackage";
import { POST as BUILDINGS_POST } from "@/app/api/geospatial-package/buildings/route";
import { GET, POST } from "@/app/api/geospatial-package/plan/route";

const originalMapterhornUrl = process.env.NEXT_PUBLIC_MAPTERHORN_PMTILES_URL;

function jsonRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/geospatial-package/plan", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });
}

function buildingJsonRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/geospatial-package/buildings", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });
}

afterEach(() => {
  process.env.NEXT_PUBLIC_MAPTERHORN_PMTILES_URL = originalMapterhornUrl;
});

describe("geospatial package hardening", () => {
  it("does not preserve invalid H3 identifiers during AOI normalization", () => {
    const aoi = normalizePackageAoi({ h3Id: "definitely-not-h3" });

    expect(isValidCell(aoi.h3Id)).toBe(true);
    expect(aoi.h3Id).not.toBe("definitely-not-h3");
  });

  it("redacts secret-bearing URLs and sanitizes consumer identifiers", () => {
    expect(sanitizePublicUrl("https://tiles.example.test/a.pmtiles?token=secret")).toBe(
      "redacted://secret-bearing-url"
    );
    const credentialUrl = `https://user:pass${String.fromCharCode(64)}tiles.example.test/a.pmtiles`;
    expect(sanitizePublicUrl(credentialUrl)).toBe("redacted://secret-bearing-url");
    expect(sanitizeConsumerAppId("My App<script>")).toBe("my-app-script");
  });

  it("rejects invalid content types and unsafe AOI bounds at the route boundary", async () => {
    const badContentType = await POST(
      jsonRequest(
        { aoi: { h3Id: "85393363fffffff" }, layers: ["terrain"] },
        { "content-type": "text/plain" }
      )
    );
    const badBounds = await POST(
      jsonRequest({
        aoi: { bounds: [-200, -95, 200, 95] },
        layers: ["terrain"]
      })
    );

    expect(badContentType.status).toBe(415);
    expect(badBounds.status).toBe(400);
    expect(badBounds.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("redacts misconfigured provider URLs from public route responses", async () => {
    process.env.NEXT_PUBLIC_MAPTERHORN_PMTILES_URL =
      "https://tiles.example.test/terrain.pmtiles?access_token=secret";
    const response = await GET();
    const payload = (await response.json()) as {
      plan: {
        selectedSources: {
          terrain: { sourceUrl: string };
        };
        artifacts: Array<{ sourceId: string; url: string | null }>;
      };
    };

    expect(payload.plan.selectedSources.terrain.sourceUrl).toBe("redacted://secret-bearing-url");
    expect(
      payload.plan.artifacts.find((artifact) => artifact.sourceId.includes("mapterhorn"))?.url
    ).toBeNull();
  });

  it("reports H3-only requests as H3 disclosure rather than exact centroid disclosure", async () => {
    const response = await POST(
      jsonRequest({
        aoi: { h3Id: "85393363fffffff" },
        layers: ["terrain"]
      })
    );
    const payload = (await response.json()) as {
      privacy: { coordinateDisclosure: string };
      plan: { aoiDisclosure: string; aoi: { centroid: { latitude: number; longitude: number } } };
    };

    expect(response.status).toBe(200);
    expect(payload.plan.aoi.centroid).toBeDefined();
    expect(payload.plan.aoiDisclosure).toBe("h3-cell");
    expect(payload.privacy.coordinateDisclosure).toBe("h3-cell");
  });

  it("returns an Overture-first building handoff without materialized fake footprints", async () => {
    const response = await BUILDINGS_POST(
      buildingJsonRequest({
        aoi: { h3Id: "85393363fffffff" },
        consumerAppId: "Building Abundance",
        offline: true
      })
    );
    const payload = (await response.json()) as {
      plan: { aoiDisclosure: string };
      privacy: { coordinateDisclosure: string };
      workerRequest: {
        selectedSourceId: string;
        output: {
          fileName: string;
          status: string;
          readyUrl: string | null;
          featureCount: number | null;
        };
        sourceLadder: Array<{ sourceId: string; selected: boolean }>;
        policies: { noSyntheticFill: boolean };
      };
    };

    expect(response.status).toBe(200);
    expect(payload.workerRequest.selectedSourceId).toBe("overture-maps-geoparquet");
    expect(payload.workerRequest.output).toMatchObject({
      fileName: "buildings.json",
      status: "planned",
      readyUrl: null,
      featureCount: null
    });
    expect(payload.workerRequest.sourceLadder[0]).toMatchObject({
      sourceId: "overture-maps-geoparquet",
      selected: true
    });
    expect(payload.workerRequest.policies.noSyntheticFill).toBe(true);
    expect(payload.plan.aoiDisclosure).toBe("h3-cell");
    expect(payload.privacy.coordinateDisclosure).toBe("h3-cell");
  });

  it("does not allow gated building preferences to become the selected worker source", async () => {
    const response = await BUILDINGS_POST(
      buildingJsonRequest({
        aoi: { h3Id: "85393363fffffff" },
        preferredSourceIds: ["global-building-atlas-nc-lod1-height"]
      })
    );
    const payload = (await response.json()) as {
      workerRequest: {
        selectedSourceId: string;
        sourceLadder: Array<{ sourceId: string; canMaterialize: boolean; workerRole: string }>;
      };
    };
    const gated = payload.workerRequest.sourceLadder.find(
      (source) => source.sourceId === "global-building-atlas-nc-lod1-height"
    );

    expect(response.status).toBe(200);
    expect(payload.workerRequest.selectedSourceId).not.toBe("global-building-atlas-nc-lod1-height");
    expect(gated).toMatchObject({ canMaterialize: false, workerRole: "review-required" });
  });
});

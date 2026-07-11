import { describe, expect, it, vi } from "vitest";

import { OFFICIAL_STAC_ENDPOINTS, probeOfficialEndpoint } from "@/lib/officialEndpointRefresh";

const endpoint = OFFICIAL_STAC_ENDPOINTS[0];

describe("official endpoint refresh", () => {
  it("retains authority and bounded collection metadata without promotion", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        id: "catalog",
        conformsTo: ["stac"],
        links: [{ rel: "child", title: "dem" }]
      })
    );
    const result = await probeOfficialEndpoint(endpoint, {
      fetchImpl,
      now: () => new Date("2026-07-11T00:00:00Z")
    });

    expect(result).toMatchObject({
      capabilityState: "metadata-probed",
      catalogId: "catalog",
      linkedCollectionCount: 1,
      sampledCollectionIds: ["dem"]
    });
  });

  it("fails closed for oversized metadata", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("{}", { headers: { "content-length": "200" } })
    );
    const result = await probeOfficialEndpoint(endpoint, { fetchImpl, maxBytes: 100 });
    expect(result).toMatchObject({
      capabilityState: "probe-failed",
      error: "metadata-response-too-large"
    });
  });

  it("follows only same-host STAC collection metadata", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ links: [{ rel: "data", href: `${endpoint.endpointUrl}collections` }] })
      )
      .mockResolvedValueOnce(Response.json({ collections: [{ id: "dem" }] }));
    const result = await probeOfficialEndpoint(endpoint, { fetchImpl });
    expect(result).toMatchObject({ linkedCollectionCount: 1, sampledCollectionIds: ["dem"] });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("distinguishes provider failure from an empty catalog", async () => {
    const failed = await probeOfficialEndpoint(endpoint, {
      fetchImpl: vi.fn(async () => new Response("unavailable", { status: 503 }))
    });
    const empty = await probeOfficialEndpoint(endpoint, {
      fetchImpl: vi.fn(async () => Response.json({ id: "empty", links: [] }))
    });
    expect(failed.capabilityState).toBe("probe-failed");
    expect(empty).toMatchObject({ capabilityState: "metadata-probed", linkedCollectionCount: 0 });
  });
});

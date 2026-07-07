import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/geospatial-package/kamloops-terrain-coverage/route";

const fullCoverageDemGridResponse = {
  features: [
    {
      attributes: {
        OBJECTID: 42,
        CELLNAME: "5156B",
        PHOTOGRIDLIMITS: "YES"
      }
    },
    {
      attributes: {
        OBJECTID: 43,
        CELLNAME: "5156C",
        PHOTOGRIDLIMITS: "YES"
      }
    }
  ]
};

const partialCoverageDemGridResponse = {
  features: [
    {
      attributes: {
        OBJECTID: 52,
        CELLNAME: "5257B",
        PHOTOGRIDLIMITS: "YES"
      }
    },
    {
      attributes: {
        OBJECTID: 53,
        CELLNAME: "5357D",
        PHOTOGRIDLIMITS: "NO"
      }
    }
  ]
};

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/geospatial-package/kamloops-terrain-coverage", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Kamloops terrain coverage route", () => {
  it("classifies a batch of candidate centers without echoing coordinates", async () => {
    let requestCount = 0;
    vi.stubGlobal("fetch", async () => {
      requestCount += 1;
      return new Response(
        JSON.stringify(
          requestCount === 1 ? fullCoverageDemGridResponse : partialCoverageDemGridResponse
        ),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    });

    const response = await POST(
      jsonRequest({
        samples: [
          { id: "covered-cell", lat: 50.64, lng: -120.26 },
          { id: "partial-cell", lat: 50.68, lng: -120.23 }
        ],
        consumer: "abundance"
      })
    );
    const payload = await response.json();
    const serialized = JSON.stringify(payload);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      schemaVersion: "vmesh-kamloops-municipal-dem-coverage-batch-v1",
      request: {
        edgeMeters: 3000,
        gridSize: 257,
        sampleCount: 2
      },
      privacy: {
        exactCoordinatesEchoed: false,
        callerOwnedSampleIdsOnly: true
      },
      summary: {
        sourceBackedCount: 1,
        partialCount: 1,
        blockedCount: 0
      }
    });
    expect(payload.samples).toEqual([
      expect.objectContaining({
        id: "covered-cell",
        status: "source-backed",
        sourceBacked: true,
        downloadableCellCount: 2,
        nonDownloadableCellCount: 0,
        selectedSourceIds: ["kamloops-local-lidar-dtm-1m"]
      }),
      expect.objectContaining({
        id: "partial-cell",
        status: "partial",
        sourceBacked: false,
        downloadableCellCount: 1,
        nonDownloadableCellCount: 1,
        selectedSourceIds: []
      })
    ]);
    expect(serialized).not.toContain("50.64");
    expect(serialized).not.toContain("-120.26");
    expect(serialized).not.toContain("50.68");
    expect(serialized).not.toContain("-120.23");
  });

  it("marks invalid and out-of-envelope samples without calling the municipal endpoint", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("coverage route should not fetch invalid or outside samples");
    });
    vi.stubGlobal("fetch", fetchImpl);

    const response = await POST(
      jsonRequest({
        samples: [
          { id: "bad", lat: "not-a-number", lng: -120.26 },
          { id: "outside", lat: 49.0, lng: -123.0 }
        ]
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(payload.summary).toMatchObject({
      sourceBackedCount: 0,
      partialCount: 0,
      blockedCount: 2
    });
    expect(payload.samples).toEqual([
      expect.objectContaining({
        id: "bad",
        status: "invalid-coordinate",
        sourceBacked: false
      }),
      expect.objectContaining({
        id: "outside",
        status: "outside-kamloops-municipal-index",
        sourceBacked: false
      })
    ]);
  });

  it("bounds request size", async () => {
    const response = await POST(
      jsonRequest({
        samples: Array.from({ length: 65 }, (_, index) => ({
          id: `candidate-${index}`,
          lat: 50.6,
          lng: -120.3
        }))
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("between 1 and 64");
  });
});

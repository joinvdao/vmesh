import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import {
  createSentinelSrWorkflow,
  RENDER_HANDOFF_SCHEMA_VERSION,
  SENTINEL_SR_WORKFLOW_SCHEMA_VERSION
} from "@/lib/geospatialPackage";
import { POST } from "@/app/api/geospatial-package/sentinel-sr/route";
import { POST as COMPLETE_POST } from "@/app/api/geospatial-package/sentinel-sr/complete/route";

const originalWorkerToken = process.env.VMESH_SENTINEL_SR_WORKER_TOKEN;
const originalAllowlist = process.env.VMESH_SENTINEL_SR_ARTIFACT_HOST_ALLOWLIST;

function jsonRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/geospatial-package/sentinel-sr", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });
}

function completionRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/geospatial-package/sentinel-sr/complete", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });
}

function workerCompletionBody(overrides: Record<string, unknown> = {}) {
  return {
    aoi: { h3Id: "85393363fffffff" },
    sourceSceneId: "S2A_TEST_L2A_20260501T103000",
    acquiredAt: "2026-05-01T10:30:00.000Z",
    workerJobId: "sentinel-worker-job-test",
    sceneCloudCover: 2,
    clearPixelRatioAoi: 0.99,
    sen2srPmtilesUrl: "https://tiles.example.test/sentinel-sr.pmtiles",
    ...overrides
  };
}

afterEach(() => {
  if (originalWorkerToken === undefined) {
    delete process.env.VMESH_SENTINEL_SR_WORKER_TOKEN;
  } else {
    process.env.VMESH_SENTINEL_SR_WORKER_TOKEN = originalWorkerToken;
  }
  if (originalAllowlist === undefined) {
    delete process.env.VMESH_SENTINEL_SR_ARTIFACT_HOST_ALLOWLIST;
  } else {
    process.env.VMESH_SENTINEL_SR_ARTIFACT_HOST_ALLOWLIST = originalAllowlist;
  }
});

describe("Sentinel SR package workflow", () => {
  it("plans a cloud-gated Sentinel-2 to SEN2SR 2.5m worker package for a downstream app", () => {
    const result = createSentinelSrWorkflow({
      aoi: { h3Id: "85393363fffffff" },
      consumerAppId: "Downstream App",
      datetime: "2026-02-15/2026-05-15",
      now: () => new Date("2026-05-15T00:00:00.000Z")
    });

    expect(result.ok).toBe(true);
    expect(result.workflow.schemaVersion).toBe(SENTINEL_SR_WORKFLOW_SCHEMA_VERSION);
    expect(result.workflow.status).toBe("planned");
    expect(result.workflow.consumerAppId).toBe("downstream-app");
    expect(result.workflow.upscaler.sourceResolutionMeters).toBe(10);
    expect(result.workflow.upscaler.targetResolutionMeters).toBe(2.5);
    expect(result.workflow.upscaler.scaleFactor).toBe(4);
    expect(result.workflow.cloudGate.status).toBe("pending-worker-validation");
    expect(result.workflow.source.stacSearchPayload).toMatchObject({
      collections: ["sentinel-2-l2a"],
      datetime: "2026-02-15/2026-05-15"
    });
    expect(result.workflow.artifacts.map((artifact) => artifact.kind)).toContain("raster-pmtiles");
    expect(result.renderHandoff.schemaVersion).toBe(RENDER_HANDOFF_SCHEMA_VERSION);
    expect(result.renderHandoff.availability).toBe("requires-vmesh-worker");
    expect(result.renderHandoff.input.role).toBe("texture");
    expect(result.renderHandoff.input.truthStatus).toBe("imagery-inferred-context");
  });

  it("marks the render handoff ready only from trusted worker completion", () => {
    const result = createSentinelSrWorkflow({
      aoi: { h3Id: "85393363fffffff" },
      workerCompletion: {
        completedByWorker: true,
        workerJobId: "sentinel-worker-job-test",
        sourceSceneId: "S2A_TEST_L2A_20260501T103000",
        acquiredAt: "2026-05-01T10:30:00.000Z",
        sceneCloudCover: 2.4,
        clearPixelRatioAoi: 0.995,
        sen2srPmtilesUrl: "https://tiles.example.test/sentinel-sr.pmtiles"
      },
      trustedArtifactHostAllowlist: ["tiles.example.test"],
      now: () => new Date("2026-05-15T00:00:00.000Z")
    });
    const pmtiles = result.workflow.artifacts.find(
      (artifact) => artifact.kind === "raster-pmtiles"
    );

    expect(result.workflow.status).toBe("ready");
    expect(result.readyForRenderer).toBe(true);
    expect(result.workflow.cloudGate.accepted).toBe(true);
    expect(pmtiles?.status).toBe("ready-configured");
    expect(result.workflow.tileManifest.tileUrl).toBe(
      "https://tiles.example.test/sentinel-sr.pmtiles"
    );
    expect(result.renderHandoff.availability).toBe("ready");
    expect(result.renderHandoff.input.refKind).toBe("pmtiles");
    expect(result.renderHandoff.completion?.completedByWorker).toBe(true);
  });

  it("blocks cloud-contaminated scenes even when a tile URL is supplied", () => {
    const result = createSentinelSrWorkflow({
      aoi: { h3Id: "85393363fffffff" },
      cloudCoverMax: 100,
      aoiClearPixelRatioMin: 0,
      workerCompletion: {
        completedByWorker: true,
        workerJobId: "sentinel-worker-job-test",
        sourceSceneId: "S2A_TEST_L2A_20260501T103000",
        acquiredAt: "2026-05-01T10:30:00.000Z",
        sceneCloudCover: 11,
        clearPixelRatioAoi: 0.99,
        sen2srPmtilesUrl: "https://tiles.example.test/cloudy.pmtiles"
      },
      trustedArtifactHostAllowlist: ["tiles.example.test"],
      now: () => new Date("2026-05-15T00:00:00.000Z")
    });

    expect(result.ok).toBe(true);
    expect(result.readyForRenderer).toBe(false);
    expect(result.workflow.status).toBe("blocked-cloud-gate");
    expect(result.workflow.cloudGate.sceneCloudCoverMax).toBe(10);
    expect(result.workflow.cloudGate.aoiClearPixelRatioMin).toBe(0.98);
    expect(result.workflow.cloudGate.status).toBe("failed");
    expect(result.renderHandoff.availability).toBe("blocked-cloud-gate");
    expect(result.renderHandoff.input.ref).toBeNull();
  });

  it("keeps the public package route plan-only even with forged ready inputs", async () => {
    const response = await POST(
      jsonRequest({
        aoi: { h3Id: "85393363fffffff" },
        sourceSceneId: "S2A_TEST_L2A_20260501T103000",
        acquiredAt: "2026-05-01T10:30:00.000Z",
        sceneCloudCover: 2,
        clearPixelRatioAoi: 0.99,
        sen2srPmtilesUrl: "https://tiles.example.test/sentinel-sr.pmtiles"
      })
    );
    const payload = (await response.json()) as {
      ok: boolean;
      readyForRenderer: boolean;
      privacy: { coordinateDisclosure: string };
      workflow: { status: string; upscaler: { targetResolutionMeters: number } };
      renderHandoff: { availability: string; input: { role: string } };
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.readyForRenderer).toBe(false);
    expect(payload.privacy.coordinateDisclosure).toBe("h3-cell");
    expect(payload.workflow.status).toBe("planned");
    expect(payload.workflow.upscaler.targetResolutionMeters).toBe(2.5);
    expect(payload.renderHandoff.availability).toBe("requires-vmesh-worker");
    expect(payload.renderHandoff.input.role).toBe("texture");
  });

  it("requires worker auth before accepting completion", async () => {
    process.env.VMESH_SENTINEL_SR_WORKER_TOKEN = "test-worker-token";
    process.env.VMESH_SENTINEL_SR_ARTIFACT_HOST_ALLOWLIST = "tiles.example.test";

    const response = await COMPLETE_POST(completionRequest(workerCompletionBody()));

    expect(response.status).toBe(401);
  });

  it("accepts authenticated worker completion with trusted refs and passing cloud QA", async () => {
    process.env.VMESH_SENTINEL_SR_WORKER_TOKEN = "test-worker-token";
    process.env.VMESH_SENTINEL_SR_ARTIFACT_HOST_ALLOWLIST = "tiles.example.test";

    const response = await COMPLETE_POST(
      completionRequest(workerCompletionBody(), { authorization: "Bearer test-worker-token" })
    );
    const payload = (await response.json()) as {
      readyForRenderer: boolean;
      workflow: { status: string; completion: { completedByWorker: true } | null };
      renderHandoff: { availability: string; completion: { completedByWorker: true } | null };
    };

    expect(response.status).toBe(200);
    expect(payload.readyForRenderer).toBe(true);
    expect(payload.workflow.status).toBe("ready");
    expect(payload.workflow.completion?.completedByWorker).toBe(true);
    expect(payload.renderHandoff.availability).toBe("ready");
    expect(payload.renderHandoff.completion?.completedByWorker).toBe(true);
  });

  it("rejects worker completion refs outside the trusted artifact allowlist", async () => {
    process.env.VMESH_SENTINEL_SR_WORKER_TOKEN = "test-worker-token";
    process.env.VMESH_SENTINEL_SR_ARTIFACT_HOST_ALLOWLIST = "tiles.example.test";

    const response = await COMPLETE_POST(
      completionRequest(
        workerCompletionBody({
          sen2srPmtilesUrl: "https://evil.example/sentinel-sr.pmtiles"
        }),
        { authorization: "Bearer test-worker-token" }
      )
    );
    const payload = (await response.json()) as {
      readyForRenderer: boolean;
      blockedReasons: string[];
    };

    expect(response.status).toBe(400);
    expect(payload.readyForRenderer).toBe(false);
    expect(payload.blockedReasons.join(" ")).toContain("allowlist");
  });

  it("rejects private metadata-service artifact refs", async () => {
    process.env.VMESH_SENTINEL_SR_WORKER_TOKEN = "test-worker-token";
    process.env.VMESH_SENTINEL_SR_ARTIFACT_HOST_ALLOWLIST = "169.254.169.254";

    const response = await COMPLETE_POST(
      completionRequest(
        workerCompletionBody({
          sen2srPmtilesUrl: "https://169.254.169.254/latest/meta-data"
        }),
        { authorization: "Bearer test-worker-token" }
      )
    );
    const payload = (await response.json()) as {
      readyForRenderer: boolean;
      blockedReasons: string[];
    };

    expect(response.status).toBe(400);
    expect(payload.readyForRenderer).toBe(false);
    expect(payload.blockedReasons.join(" ")).toContain("blocked");
  });

  it("keeps cloudy authenticated worker completion out of the render handoff", async () => {
    process.env.VMESH_SENTINEL_SR_WORKER_TOKEN = "test-worker-token";
    process.env.VMESH_SENTINEL_SR_ARTIFACT_HOST_ALLOWLIST = "tiles.example.test";

    const response = await COMPLETE_POST(
      completionRequest(
        workerCompletionBody({
          sceneCloudCover: 11,
          clearPixelRatioAoi: 0.99
        }),
        { authorization: "Bearer test-worker-token" }
      )
    );
    const payload = (await response.json()) as {
      readyForRenderer: boolean;
      workflow: { status: string };
      renderHandoff: { availability: string };
    };

    expect(response.status).toBe(200);
    expect(payload.readyForRenderer).toBe(false);
    expect(payload.workflow.status).toBe("blocked-cloud-gate");
    expect(payload.renderHandoff.availability).toBe("blocked-cloud-gate");
  });
});

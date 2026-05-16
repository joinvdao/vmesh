import { timingSafeEqual } from "node:crypto";

import { isValidCell } from "h3-js";
import { NextRequest, NextResponse } from "next/server";

import {
  createSentinelSrWorkflow,
  MAX_AOI_SPAN_DEGREES,
  MAX_PACKAGE_PLAN_BODY_BYTES,
  parseArtifactHostAllowlist,
  sanitizeConsumerAppId,
  sanitizeTextLabel,
  type PackageAoiInput
} from "@/lib/geospatialPackage";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseString(value: unknown, maxLength = 160): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = sanitizeTextLabel(value, maxLength);
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseRawString(value: unknown, maxLength = 2048): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseBounds(value: unknown): [number, number, number, number] | undefined {
  if (!Array.isArray(value) || value.length !== 4) return undefined;
  const values = value.map(parseNumber);
  if (values.some((candidate) => candidate === undefined)) return undefined;
  const [west, south, east, north] = values as [number, number, number, number];
  const validRange =
    west >= -180 &&
    west <= 180 &&
    east >= -180 &&
    east <= 180 &&
    south >= -90 &&
    south <= 90 &&
    north >= -90 &&
    north <= 90;
  const validOrder = west < east && south < north;
  const boundedAoi = east - west <= MAX_AOI_SPAN_DEGREES && north - south <= MAX_AOI_SPAN_DEGREES;

  if (!validRange || !validOrder || !boundedAoi) return undefined;
  return [west, south, east, north];
}

function parseCentroid(value: unknown): PackageAoiInput["centroid"] | undefined {
  if (!isRecord(value)) return undefined;
  const latitude = parseNumber(value.latitude);
  const longitude = parseNumber(value.longitude);

  if (latitude === undefined || longitude === undefined) return undefined;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return undefined;

  return { latitude, longitude };
}

function parseAoi(value: unknown): PackageAoiInput | null {
  if (!isRecord(value)) return null;
  const h3Id = typeof value.h3Id === "string" && isValidCell(value.h3Id) ? value.h3Id : undefined;
  const label = parseString(value.label, 96);
  const centroid = parseCentroid(value.centroid);
  const bounds = parseBounds(value.bounds);

  if (!h3Id && !centroid && !bounds) return null;
  return { h3Id, centroid, bounds, label };
}

async function parseBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const value = (await req.json()) as unknown;
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function tokensEqual(supplied: string, expected: string): boolean {
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);

  if (suppliedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(suppliedBuffer, expectedBuffer);
}

function workerAuth(req: NextRequest): { ok: true } | { ok: false; status: number; error: string } {
  const expected = process.env.VMESH_SENTINEL_SR_WORKER_TOKEN?.trim();
  if (!expected) {
    return {
      ok: false,
      status: 503,
      error:
        "Sentinel SR worker completion is disabled until VMESH_SENTINEL_SR_WORKER_TOKEN is configured."
    };
  }

  const authorization = req.headers.get("authorization") ?? "";
  const bearer = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice("bearer ".length).trim()
    : "";
  const supplied = bearer || req.headers.get("x-vmesh-worker-token")?.trim() || "";

  if (!tokensEqual(supplied, expected)) {
    return { ok: false, status: 401, error: "Invalid Sentinel SR worker token." };
  }

  return { ok: true };
}

export async function POST(req: NextRequest) {
  const auth = workerAuth(req);
  if (!auth.ok) {
    return jsonResponse({ error: auth.error }, auth.status);
  }

  const contentLengthHeader = req.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : 0;
  const contentType = req.headers.get("content-type") ?? "";

  if (!Number.isFinite(contentLength) || contentLength < 0) {
    return jsonResponse({ error: "Invalid content-length header." }, 400);
  }
  if (contentLength > MAX_PACKAGE_PLAN_BODY_BYTES) {
    return jsonResponse({ error: "Sentinel SR completion body is too large." }, 413);
  }
  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonResponse(
      { error: "Sentinel SR completion requests must use application/json." },
      415
    );
  }

  const body = await parseBody(req);
  if (!body) {
    return jsonResponse({ error: "Invalid JSON Sentinel SR completion request." }, 400);
  }

  const aoi = parseAoi(body.aoi);
  const sourceSceneId = parseString(body.sourceSceneId, 180);
  const acquiredAt = parseRawString(body.acquiredAt, 80);
  const workerJobId = parseString(body.workerJobId, 120);
  const sceneCloudCover = parseNumber(body.sceneCloudCover);
  const clearPixelRatioAoi = parseNumber(body.clearPixelRatioAoi);
  const sen2srPmtilesUrl = parseRawString(body.sen2srPmtilesUrl);
  const sen2srXyzUrl = parseRawString(body.sen2srXyzUrl);

  if (!aoi) {
    return jsonResponse({ error: "Worker completion requires a valid AOI." }, 400);
  }
  if (!sourceSceneId || !acquiredAt || !workerJobId) {
    return jsonResponse(
      { error: "Worker completion requires sourceSceneId, acquiredAt, and workerJobId." },
      400
    );
  }
  if (sceneCloudCover === undefined || clearPixelRatioAoi === undefined) {
    return jsonResponse(
      { error: "Worker completion requires numeric sceneCloudCover and clearPixelRatioAoi." },
      400
    );
  }
  if (!sen2srPmtilesUrl && !sen2srXyzUrl) {
    return jsonResponse(
      { error: "Worker completion requires sen2srPmtilesUrl or sen2srXyzUrl." },
      400
    );
  }

  const result = createSentinelSrWorkflow({
    aoi,
    consumerAppId:
      typeof body.consumerAppId === "string" && body.consumerAppId.length > 0
        ? sanitizeConsumerAppId(body.consumerAppId)
        : "downstream-app",
    workerCompletion: {
      completedByWorker: true,
      workerJobId,
      completedAt: parseRawString(body.completedAt, 80),
      sourceSceneId,
      acquiredAt,
      sceneCloudCover,
      clearPixelRatioAoi,
      sen2srPmtilesUrl,
      sen2srXyzUrl
    },
    trustedArtifactHostAllowlist: parseArtifactHostAllowlist(
      process.env.VMESH_SENTINEL_SR_ARTIFACT_HOST_ALLOWLIST
    )
  });

  if (result.blockedReasons.length > 0 && !result.readyForRenderer) {
    return jsonResponse(
      {
        ok: result.ok,
        readyForRenderer: result.readyForRenderer,
        blockedReasons: result.blockedReasons,
        workflow: result.workflow,
        renderHandoff: result.renderHandoff
      },
      400
    );
  }

  return jsonResponse({
    ok: result.ok,
    readyForRenderer: result.readyForRenderer,
    blockedReasons: result.blockedReasons,
    workflow: result.workflow,
    renderHandoff: result.renderHandoff
  });
}

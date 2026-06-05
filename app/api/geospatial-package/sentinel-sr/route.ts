import { isValidCell } from "h3-js";
import { NextRequest, NextResponse } from "next/server";

import {
  createSentinelSrWorkflow,
  MAX_AOI_SPAN_DEGREES,
  MAX_PACKAGE_PLAN_BODY_BYTES,
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

function workflowOptions() {
  return {
    sentinelPreviewTileUrl: process.env.NEXT_PUBLIC_SENTINEL_PREVIEW_TILE_URL
  };
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

function sentinelPrivacyDisclosure(coordinateDisclosure: "h3-cell" | "bounds" | "exact-centroid") {
  return {
    coordinateDisclosure,
    precisionWarning:
      "Sentinel SR requests may include H3 cells, AOI bounds, or exact centroids. Treat private sites as sensitive and keep generated payloads out of Git.",
    remoteProviderWarning:
      "This API returns a worker plan by default. A real Sentinel worker will disclose the AOI to STAC/openEO/object-store providers unless routed through a reviewed cache or local gateway."
  };
}

function aoiDisclosure(aoi: PackageAoiInput): "h3-cell" | "bounds" | "exact-centroid" {
  if (aoi.centroid) return "exact-centroid";
  if (aoi.h3Id) return "h3-cell";
  return "bounds";
}

export async function GET() {
  const result = createSentinelSrWorkflow({
    aoi: {
      h3Id: "85393363fffffff",
      label: "Lisbon sample AOI"
    },
    consumerAppId: "downstream-app",
    now: () => new Date("2026-05-15T00:00:00.000Z"),
    ...workflowOptions()
  });

  return jsonResponse({
    ok: result.ok,
    readyForRenderer: result.readyForRenderer,
    blockedReasons: result.blockedReasons,
    privacy: sentinelPrivacyDisclosure("h3-cell"),
    workflow: result.workflow,
    renderHandoff: result.renderHandoff
  });
}

export async function POST(req: NextRequest) {
  const contentLengthHeader = req.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : 0;
  const contentType = req.headers.get("content-type") ?? "";

  if (!Number.isFinite(contentLength) || contentLength < 0) {
    return jsonResponse({ error: "Invalid content-length header." }, 400);
  }
  if (contentLength > MAX_PACKAGE_PLAN_BODY_BYTES) {
    return jsonResponse({ error: "Sentinel SR request body is too large." }, 413);
  }
  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonResponse({ error: "Sentinel SR requests must use application/json." }, 415);
  }

  const body = await parseBody(req);
  if (!body) {
    return jsonResponse({ error: "Invalid JSON Sentinel SR request." }, 400);
  }

  const aoi = parseAoi(body.aoi);
  if (!aoi) {
    return jsonResponse(
      {
        error:
          "A Sentinel SR request requires an AOI with h3Id, centroid { latitude, longitude }, or bounds [west, south, east, north]."
      },
      400
    );
  }

  const envOptions = workflowOptions();
  const result = createSentinelSrWorkflow({
    aoi,
    consumerAppId:
      typeof body.consumerAppId === "string" && body.consumerAppId.length > 0
        ? sanitizeConsumerAppId(body.consumerAppId)
        : "downstream-app",
    sourceSceneId: parseString(body.sourceSceneId, 160),
    acquiredAt: typeof body.acquiredAt === "string" ? body.acquiredAt.slice(0, 80) : undefined,
    datetime: typeof body.datetime === "string" ? body.datetime.slice(0, 80) : undefined,
    targetResolutionMeters: parseNumber(body.targetResolutionMeters),
    sentinelPreviewTileUrl: envOptions.sentinelPreviewTileUrl
  });

  return jsonResponse(
    {
      ok: result.ok,
      readyForRenderer: result.readyForRenderer,
      blockedReasons: result.blockedReasons,
      privacy: sentinelPrivacyDisclosure(aoiDisclosure(aoi)),
      workflow: result.workflow,
      renderHandoff: result.renderHandoff
    },
    200
  );
}

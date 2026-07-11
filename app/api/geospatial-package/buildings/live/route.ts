import { NextRequest, NextResponse } from "next/server";

import { MAX_PACKAGE_PLAN_BODY_BYTES, queryOvertureBuildings } from "@/lib/geospatialPackage";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(contentLength) || contentLength < 0)
    return json({ error: "Invalid content length." }, 400);
  if (contentLength > MAX_PACKAGE_PLAN_BODY_BYTES)
    return json({ error: "Request body is too large." }, 413);
  if (!(request.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    return json({ error: "Building queries require application/json." }, 415);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON request." }, 400);
  }
  if (!isRecord(body)) return json({ error: "Invalid building query." }, 400);
  const latitude = finiteCoordinate(body.lat ?? body.latitude, -90, 90);
  const longitude = finiteCoordinate(body.lng ?? body.longitude, -180, 180);
  if (latitude === null || longitude === null) {
    return json({ error: "A valid lat/lng centroid is required." }, 400);
  }
  const bbox = sourceFrameBbox(latitude, longitude, 3_000);
  const result = await queryOvertureBuildings(bbox, {
    maxFeatures: finiteLimit(body.maxFeatures),
    includeParts: body.includeParts === true
  });
  return json(result, result.status === "provider-failed" ? 502 : 200);
}

function sourceFrameBbox(latitude: number, longitude: number, edgeMeters: number) {
  const half = edgeMeters / 2;
  const latitudeDelta = half / 111_320;
  const longitudeDelta = half / (111_320 * Math.max(0.01, Math.cos((latitude * Math.PI) / 180)));
  const west = longitude - longitudeDelta;
  const east = longitude + longitudeDelta;
  return {
    west: west < -180 ? west + 360 : west,
    south: latitude - latitudeDelta,
    east: east > 180 ? east - 360 : east,
    north: latitude + latitudeDelta
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteCoordinate(value: unknown, minimum: number, maximum: number) {
  const parsed = typeof value === "number" ? value : Number.NaN;
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function finiteLimit(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
  });
}

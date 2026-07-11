import { NextRequest, NextResponse } from "next/server";

import { MAX_PACKAGE_PLAN_BODY_BYTES } from "@/lib/geospatialPackage";
import { queryOvertureContext } from "@/lib/geospatialPackage/overtureContext";
import {
  queryOpenMeteoCurrent,
  querySoilGridsSurface
} from "@/lib/geospatialPackage/typedPointContext";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(contentLength) || contentLength < 0)
    return json({ error: "Invalid content length." }, 400);
  if (contentLength > MAX_PACKAGE_PLAN_BODY_BYTES)
    return json({ error: "Request body is too large." }, 413);
  if (!(request.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    return json({ error: "Context queries require application/json." }, 415);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON request." }, 400);
  }
  if (!isRecord(body)) return json({ error: "Invalid context query." }, 400);
  const latitude = coordinate(body.lat ?? body.latitude, -90, 90);
  const longitude = coordinate(body.lng ?? body.longitude, -180, 180);
  if (latitude === null || longitude === null)
    return json({ error: "A valid lat/lng centroid is required." }, 400);
  const bbox = sourceFrameBbox(latitude, longitude, 3_000);
  const [roads, water, weather, soil] = await Promise.all([
    queryOvertureContext("roads", bbox),
    queryOvertureContext("water", bbox),
    queryOpenMeteoCurrent(latitude, longitude),
    querySoilGridsSurface(latitude, longitude)
  ]);
  const result = {
    schemaVersion: "vmesh-live-context-bundle-v1",
    runClass: "live-proof",
    frame: { role: "source-slice-frame", edgeMeters: 3_000 },
    roads,
    water,
    weather,
    soil,
    parcels: {
      status: "explicit-gap",
      role: "legal-context-unresolved",
      reason:
        "No jurisdiction-specific authoritative parcel service was promoted for this request; map selection geometry is an overlay and not a legal parcel claim."
    },
    fieldBoundaries: {
      status: "explicit-gap",
      role: "predicted-or-contextual-only",
      reason:
        "No reviewed executable field-boundary source was promoted for this request; fields must never be represented as legal parcels."
    }
  };
  return json(result);
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

function coordinate(value: unknown, minimum: number, maximum: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum
    ? value
    : null;
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
  });
}

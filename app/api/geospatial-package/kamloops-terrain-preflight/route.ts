import { NextRequest, NextResponse } from "next/server";

import {
  ABUNDANCE_SOURCE_HANDOFF_DEFAULT_EDGE_METERS,
  ABUNDANCE_SOURCE_HANDOFF_DEFAULT_GRID_SIZE,
  abundanceSourceSliceBoundsFromCentroid,
  createLiveKamloopsMunicipalDemCoveragePreflight,
  sanitizeConsumerAppId,
  sanitizeTextLabel
} from "@/lib/geospatialPackage";

export const dynamic = "force-dynamic";

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function finiteNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function boundedNumber(value: unknown, min: number, max: number): number | undefined {
  const parsed = finiteNumber(value);
  if (parsed === undefined || parsed < min || parsed > max) return undefined;
  return parsed;
}

function parseConsumer(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) return "building-abundance";
  if (value.trim().toLowerCase() === "abundance") return "building-abundance";
  return sanitizeConsumerAppId(value);
}

export async function GET(req: NextRequest) {
  const latitude = boundedNumber(req.nextUrl.searchParams.get("lat"), -90, 90);
  const longitude = boundedNumber(req.nextUrl.searchParams.get("lng"), -180, 180);
  if (latitude === undefined || longitude === undefined) {
    return jsonResponse({ error: "Kamloops terrain preflight requires lat and lng." }, 400);
  }

  const edgeMeters =
    boundedNumber(req.nextUrl.searchParams.get("edgeMeters"), 512, 10000) ??
    ABUNDANCE_SOURCE_HANDOFF_DEFAULT_EDGE_METERS;
  const gridSize =
    boundedNumber(req.nextUrl.searchParams.get("gridSize"), 17, 2049) ??
    ABUNDANCE_SOURCE_HANDOFF_DEFAULT_GRID_SIZE;
  const label = sanitizeTextLabel(
    req.nextUrl.searchParams.get("label") ?? "Kamloops terrain preflight"
  );
  const bounds = abundanceSourceSliceBoundsFromCentroid({
    centroid: { latitude, longitude },
    edgeMeters
  });

  const preflight = await createLiveKamloopsMunicipalDemCoveragePreflight(
    {
      request: {
        aoi: { bounds, label },
        consumerAppId: parseConsumer(
          req.nextUrl.searchParams.get("consumer") ?? req.nextUrl.searchParams.get("consumerAppId")
        ),
        layers: ["terrain"],
        preferredSourceIds: ["kamloops-local-lidar-dtm-1m"],
        offline: true
      }
    },
    { env: process.env }
  );

  return jsonResponse({
    ...preflight,
    request: {
      edgeMeters,
      gridSize
    },
    frame: {
      role: "source-slice-frame",
      shape: "square",
      edgeMeters,
      gridSize,
      parcelBoundaryRole: "overlay-only"
    }
  });
}

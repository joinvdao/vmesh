import { isValidCell } from "h3-js";
import { NextRequest, NextResponse } from "next/server";

import {
  BA_GEOSPATIAL_SEGMENTS,
  createAbundanceSourceHandoff,
  createLiveAbundanceSourceHandoff,
  MAX_PACKAGE_PLAN_BODY_BYTES,
  sanitizeConsumerAppId,
  sanitizeTextLabel,
  type AbundanceSourceHandoffRequest,
  type BaGeospatialSegmentId,
  type PackageAoiInput
} from "@/lib/geospatialPackage";

export const dynamic = "force-dynamic";

const DEFAULT_SEGMENTS: BaGeospatialSegmentId[] = [
  "terrain_elevation",
  "access_infrastructure",
  "water_hydrology",
  "soils_landcover",
  "climate_weather",
  "imagery_observation",
  "land_property_planning"
];

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

function parseBounds(value: unknown): [number, number, number, number] | undefined {
  if (!Array.isArray(value) || value.length !== 4) return undefined;
  const [west, south, east, north] = value.map(finiteNumber);
  if (
    west === undefined ||
    south === undefined ||
    east === undefined ||
    north === undefined ||
    west < -180 ||
    east > 180 ||
    south < -90 ||
    north > 90 ||
    west >= east ||
    south >= north
  ) {
    return undefined;
  }
  return [west, south, east, north];
}

function parseCentroid(value: unknown): PackageAoiInput["centroid"] | undefined {
  if (!isRecord(value)) return undefined;
  const latitude = boundedNumber(value.latitude, -90, 90);
  const longitude = boundedNumber(value.longitude, -180, 180);
  return latitude === undefined || longitude === undefined ? undefined : { latitude, longitude };
}

function parseSegments(value: unknown): BaGeospatialSegmentId[] {
  const rawSegments = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const segments = rawSegments
    .filter((segment): segment is string => typeof segment === "string")
    .map((segment) => segment.trim())
    .filter((segment): segment is BaGeospatialSegmentId =>
      BA_GEOSPATIAL_SEGMENTS.includes(segment as BaGeospatialSegmentId)
    );

  return segments.length > 0 ? Array.from(new Set(segments)) : DEFAULT_SEGMENTS;
}

function parseConsumer(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) return "building-abundance";
  if (value.trim().toLowerCase() === "abundance") return "building-abundance";
  return sanitizeConsumerAppId(value);
}

function parseAoiFromSearchParams(params: URLSearchParams): PackageAoiInput | null {
  const h3 = params.get("h3");
  const label = sanitizeTextLabel(params.get("label") ?? "Abundance resolver request");
  if (h3 && isValidCell(h3)) return { h3Id: h3, label };

  const latitude = boundedNumber(params.get("lat"), -90, 90);
  const longitude = boundedNumber(params.get("lng"), -180, 180);
  if (latitude !== undefined && longitude !== undefined) {
    return { centroid: { latitude, longitude }, label };
  }

  const bounds = parseBounds(params.get("bounds")?.split(","));
  return bounds ? { bounds, label } : null;
}

function parseAoiFromBody(body: Record<string, unknown>): PackageAoiInput | null {
  const candidate = isRecord(body.aoi) ? body.aoi : body;
  const label =
    typeof candidate.label === "string" && candidate.label.length > 0
      ? sanitizeTextLabel(candidate.label)
      : "Abundance resolver request";
  const h3Id =
    typeof candidate.h3Id === "string" && isValidCell(candidate.h3Id)
      ? candidate.h3Id
      : typeof body.h3 === "string" && isValidCell(body.h3)
        ? body.h3
        : undefined;
  const centroid =
    parseCentroid(candidate.centroid) ??
    parseCentroid(body.coordinates) ??
    (() => {
      const latitude = boundedNumber(body.lat, -90, 90);
      const longitude = boundedNumber(body.lng, -180, 180);
      return latitude === undefined || longitude === undefined
        ? undefined
        : { latitude, longitude };
    })();
  const bounds = parseBounds(candidate.bounds);

  if (!h3Id && !centroid && !bounds) return null;
  return { h3Id, centroid, bounds, label };
}

function parcelVertexCount(value: unknown): number | null {
  if (Array.isArray(value)) return value.length;
  if (!isRecord(value)) return null;
  const geometry = isRecord(value.geometry) ? value.geometry : value;
  const coordinates = geometry.coordinates;
  if (!Array.isArray(coordinates)) return null;
  const ring = Array.isArray(coordinates[0]) ? coordinates[0] : coordinates;
  return Array.isArray(ring) ? ring.length : null;
}

function parseLiveTerrain(value: unknown) {
  return value === true || value === "true" || value === "1" || value === "yes";
}

async function buildHandoff(input: AbundanceSourceHandoffRequest, liveTerrain = false) {
  if (liveTerrain) return createLiveAbundanceSourceHandoff(input);
  return createAbundanceSourceHandoff(input);
}

export async function GET(req: NextRequest) {
  const aoi = parseAoiFromSearchParams(req.nextUrl.searchParams);
  if (!aoi) {
    return jsonResponse(
      {
        error: "Resolver requests require h3, lat/lng, or bounds query parameters."
      },
      400
    );
  }

  return jsonResponse(
    await buildHandoff(
      {
        aoi,
        segments: parseSegments(req.nextUrl.searchParams.get("segments")),
        consumerAppId: parseConsumer(
          req.nextUrl.searchParams.get("consumer") ?? req.nextUrl.searchParams.get("consumerAppId")
        ),
        edgeMeters: boundedNumber(req.nextUrl.searchParams.get("edgeMeters"), 512, 10000),
        gridSize: boundedNumber(req.nextUrl.searchParams.get("gridSize"), 17, 2049),
        includeReviewOnly: req.nextUrl.searchParams.get("includeReviewOnly") === "true"
      },
      parseLiveTerrain(req.nextUrl.searchParams.get("liveTerrain"))
    )
  );
}

export async function POST(req: NextRequest) {
  const contentLengthHeader = req.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : 0;
  if (!Number.isFinite(contentLength) || contentLength < 0) {
    return jsonResponse({ error: "Invalid content-length header." }, 400);
  }
  if (contentLength > MAX_PACKAGE_PLAN_BODY_BYTES) {
    return jsonResponse({ error: "Resolver request body is too large." }, 413);
  }
  if (!(req.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    return jsonResponse({ error: "Resolver requests must use application/json." }, 415);
  }

  let body: Record<string, unknown>;
  try {
    const parsed = (await req.json()) as unknown;
    if (!isRecord(parsed)) throw new Error("invalid-json");
    body = parsed;
  } catch {
    return jsonResponse({ error: "Invalid JSON resolver request." }, 400);
  }

  const aoi = parseAoiFromBody(body);
  if (!aoi) {
    return jsonResponse(
      {
        error:
          "Resolver requests require a body AOI with h3Id, centroid, bounds, coordinates, or lat/lng."
      },
      400
    );
  }

  const parcelBoundary = body.parcelBoundary ?? body.parcelBoundaryGeojson;
  const vertexCount = parcelVertexCount(parcelBoundary);

  return jsonResponse(
    await buildHandoff(
      {
        aoi,
        segments: parseSegments(body.segments),
        consumerAppId: parseConsumer(body.consumer ?? body.consumerAppId),
        edgeMeters: boundedNumber(body.edgeMeters, 512, 10000),
        gridSize: boundedNumber(body.gridSize, 17, 2049),
        includeReviewOnly: body.includeReviewOnly === true,
        parcelBoundaryContext:
          vertexCount === null
            ? undefined
            : {
                provided: true,
                vertexCount,
                label:
                  typeof body.parcelBoundaryLabel === "string"
                    ? sanitizeTextLabel(body.parcelBoundaryLabel)
                    : undefined
              }
      },
      parseLiveTerrain(body.liveTerrain)
    )
  );
}

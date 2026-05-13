import { NextRequest, NextResponse } from "next/server";

import {
  createPrivacyDisclosure,
  createGeospatialPackagePlan,
  MAX_AOI_SPAN_DEGREES,
  MAX_PACKAGE_PLAN_BODY_BYTES,
  MAX_PREFERRED_SOURCE_IDS,
  redactPackagePlanForPublic,
  sanitizeConsumerAppId,
  sanitizePreferredSourceId,
  sanitizeTextLabel,
  validateGeospatialPackagePlan,
  type PackageAoiInput,
  type PackageLayerId,
  type PackagePlanRequest
} from "@/lib/geospatialPackage";
import { isValidCell } from "h3-js";

export const dynamic = "force-dynamic";

const PACKAGE_LAYERS: PackageLayerId[] = [
  "terrain",
  "imagery",
  "roads",
  "buildings",
  "water",
  "vegetation",
  "parcels",
  "climate",
  "hydrology",
  "contours",
  "landcover",
  "field-boundaries"
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isPackageLayerId(value: unknown): value is PackageLayerId {
  return typeof value === "string" && PACKAGE_LAYERS.includes(value as PackageLayerId);
}

function parseLayers(value: unknown): PackageLayerId[] {
  if (!Array.isArray(value)) {
    return ["terrain", "imagery", "roads", "buildings", "water", "vegetation", "climate"];
  }

  const layers = value.filter(isPackageLayerId).slice(0, PACKAGE_LAYERS.length);
  return layers.length > 0 ? Array.from(new Set(layers)) : ["terrain"];
}

function parseNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
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
  const label =
    typeof value.label === "string" && value.label.length > 0
      ? sanitizeTextLabel(value.label)
      : undefined;
  const centroid = parseCentroid(value.centroid);
  const bounds = parseBounds(value.bounds);

  if (!h3Id && !centroid && !bounds) return null;
  return { h3Id, centroid, bounds, label };
}

function parsePreferredSourceIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.length > 0)
    .map(sanitizePreferredSourceId)
    .filter((item): item is string => item !== null)
    .slice(0, MAX_PREFERRED_SOURCE_IDS);
}

async function parseBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const value = (await req.json()) as unknown;
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

function plannerOptions() {
  return {
    basemapPmtilesUrl: process.env.NEXT_PUBLIC_BASEMAP_PMTILES_URL,
    mapterhornPmtilesUrl: process.env.NEXT_PUBLIC_MAPTERHORN_PMTILES_URL,
    mapzenTerrariumUrl: process.env.NEXT_PUBLIC_MAPZEN_TERRARIUM_URL,
    sen2srPmtilesUrl: process.env.NEXT_PUBLIC_SEN2SR_PMTILES_URL,
    mapboxConfigured: Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN)
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

export async function GET() {
  const request: PackagePlanRequest = {
    aoi: {
      centroid: { latitude: 38.7223, longitude: -9.1393 },
      label: "Lisbon sample AOI"
    },
    layers: ["terrain", "imagery", "roads", "buildings", "water", "vegetation", "climate"],
    consumerAppId: "generic-downstream-app",
    offline: true
  };
  const plan = createGeospatialPackagePlan(request, plannerOptions());
  const publicPlan = redactPackagePlanForPublic(plan);

  return jsonResponse({
    ok: validateGeospatialPackagePlan(plan),
    privacy: createPrivacyDisclosure(publicPlan),
    plan: publicPlan
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
    return jsonResponse({ error: "Package plan request body is too large." }, 413);
  }
  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonResponse({ error: "Package plan requests must use application/json." }, 415);
  }

  const body = await parseBody(req);
  if (!body) {
    return jsonResponse({ error: "Invalid JSON package plan request." }, 400);
  }
  const aoi = parseAoi(body.aoi);

  if (!aoi) {
    return jsonResponse(
      {
        error:
          "A package plan requires an AOI with h3Id, centroid { latitude, longitude }, or bounds [west, south, east, north]."
      },
      400
    );
  }

  const request: PackagePlanRequest = {
    aoi,
    layers: parseLayers(body.layers),
    preferredSourceIds: parsePreferredSourceIds(body.preferredSourceIds),
    consumerAppId:
      typeof body.consumerAppId === "string" && body.consumerAppId.length > 0
        ? sanitizeConsumerAppId(body.consumerAppId)
        : "generic-downstream-app",
    maxResolution: parseNumber(body.maxResolution),
    offline: body.offline === true
  };
  const plan = createGeospatialPackagePlan(request, plannerOptions());
  const publicPlan = redactPackagePlanForPublic(plan);

  return jsonResponse(
    {
      ok: validateGeospatialPackagePlan(plan),
      privacy: createPrivacyDisclosure(publicPlan),
      plan: publicPlan
    },
    200
  );
}

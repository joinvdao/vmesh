import { NextRequest, NextResponse } from "next/server";
import { isValidCell } from "h3-js";

import {
  BA_ECOSYSTEM_SEGMENTS,
  createBaEcosystemPackage,
  type BaEcosystemSegmentId
} from "@/lib/geospatialPackage";
import type { PackageAoiInput } from "@/lib/geospatialPackage/types";

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

function parseNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function parseSegments(value: string | null): BaEcosystemSegmentId[] {
  if (!value) return ["ecology_biodiversity_carbon", "soils_landcover", "water_hydrology"];

  const segments = value
    .split(",")
    .map((segment) => segment.trim())
    .filter((segment): segment is BaEcosystemSegmentId =>
      BA_ECOSYSTEM_SEGMENTS.includes(segment as BaEcosystemSegmentId)
    );

  return segments.length > 0 ? Array.from(new Set(segments)) : ["ecology_biodiversity_carbon"];
}

function parseAoi(req: NextRequest): PackageAoiInput {
  const h3 = req.nextUrl.searchParams.get("h3");
  if (h3 && isValidCell(h3)) {
    return {
      h3Id: h3,
      label: req.nextUrl.searchParams.get("label") ?? "BA ecosystem H3 request"
    };
  }

  const latitude = parseNumber(req.nextUrl.searchParams.get("lat"));
  const longitude = parseNumber(req.nextUrl.searchParams.get("lng"));

  if (
    latitude !== undefined &&
    longitude !== undefined &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  ) {
    return {
      centroid: { latitude, longitude },
      label: req.nextUrl.searchParams.get("label") ?? "BA ecosystem coordinate request"
    };
  }

  return {
    centroid: { latitude: 51.0447, longitude: -114.0719 },
    label: "Calgary public-safe ecosystem sample AOI"
  };
}

function plannerOptions() {
  return {
    sen2srPmtilesUrl: process.env.NEXT_PUBLIC_SEN2SR_PMTILES_URL,
    mapboxConfigured: Boolean(process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN)
  };
}

export async function GET(req: NextRequest) {
  const response = createBaEcosystemPackage(
    {
      aoi: parseAoi(req),
      segments: parseSegments(req.nextUrl.searchParams.get("segments")),
      consumerAppId: req.nextUrl.searchParams.get("consumerAppId") ?? "ba-gis-worker"
    },
    plannerOptions()
  );

  return jsonResponse(response);
}

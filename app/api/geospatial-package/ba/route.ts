import { NextRequest, NextResponse } from "next/server";
import { isValidCell } from "h3-js";

import {
  BA_GEOSPATIAL_SEGMENTS,
  createBaGeospatialPackage,
  type BaGeospatialSegmentId
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

function parseSegments(value: string | null): BaGeospatialSegmentId[] {
  if (!value) return ["terrain_elevation", "imagery_observation", "water_hydrology"];

  const segments = value
    .split(",")
    .map((segment) => segment.trim())
    .filter((segment): segment is BaGeospatialSegmentId =>
      BA_GEOSPATIAL_SEGMENTS.includes(segment as BaGeospatialSegmentId)
    );

  return segments.length > 0 ? Array.from(new Set(segments)) : ["terrain_elevation"];
}

function parseAoi(req: NextRequest): PackageAoiInput {
  const h3 = req.nextUrl.searchParams.get("h3");
  if (h3 && isValidCell(h3)) {
    return {
      h3Id: h3,
      label: req.nextUrl.searchParams.get("label") ?? "BA H3 request"
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
      label: req.nextUrl.searchParams.get("label") ?? "BA coordinate request"
    };
  }

  return {
    centroid: { latitude: 51.0447, longitude: -114.0719 },
    label: "Calgary public-safe sample AOI"
  };
}

function plannerOptions() {
  return {
    basemapPmtilesUrl: process.env.NEXT_PUBLIC_BASEMAP_PMTILES_URL,
    mapterhornPmtilesUrl: process.env.NEXT_PUBLIC_MAPTERHORN_PMTILES_URL,
    mapzenTerrariumUrl: process.env.NEXT_PUBLIC_MAPZEN_TERRARIUM_URL,
    sen2srPmtilesUrl: process.env.NEXT_PUBLIC_SEN2SR_PMTILES_URL,
    mapboxConfigured: Boolean(process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN)
  };
}

export async function GET(req: NextRequest) {
  const response = createBaGeospatialPackage(
    {
      aoi: parseAoi(req),
      segments: parseSegments(req.nextUrl.searchParams.get("segments")),
      consumerAppId: req.nextUrl.searchParams.get("consumerAppId") ?? "ba-gis-worker",
      includeFallbacks: req.nextUrl.searchParams.get("includeFallbacks") === "true"
    },
    plannerOptions()
  );

  return jsonResponse(response);
}

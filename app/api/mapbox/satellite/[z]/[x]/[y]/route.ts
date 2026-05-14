import { NextResponse, type NextRequest } from "next/server";

import {
  createMapboxSatelliteUpstreamUrl,
  normalizeMapboxSatelliteTile,
  type MapboxSatelliteTileParams
} from "@/lib/mapboxSatelliteProxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteContext {
  params: Promise<MapboxSatelliteTileParams> | MapboxSatelliteTileParams;
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }
    }
  );
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const token = process.env.MAPBOX_TOKEN;

  if (!token) {
    return jsonError("Mapbox satellite proxy is not configured.", 503);
  }

  let upstreamUrl: string;
  try {
    const params = await context.params;
    upstreamUrl = createMapboxSatelliteUpstreamUrl(normalizeMapboxSatelliteTile(params), token);
  } catch {
    return jsonError("Invalid Mapbox satellite tile request.", 400);
  }

  const upstreamResponse = await fetch(upstreamUrl, {
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
    },
    next: { revalidate: 60 * 60 * 24 * 7 }
  });

  if (!upstreamResponse.ok) {
    return jsonError("Mapbox satellite tile fetch failed.", upstreamResponse.status);
  }

  const contentType = upstreamResponse.headers.get("content-type") ?? "image/jpeg";
  const cacheControl =
    upstreamResponse.headers.get("cache-control") ??
    "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800";

  return new NextResponse(await upstreamResponse.arrayBuffer(), {
    headers: {
      "Cache-Control": cacheControl,
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff"
    }
  });
}

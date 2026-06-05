import { NextResponse, type NextRequest } from "next/server";

import {
  buildNominatimSearchUrl,
  normalizeNominatimResults,
  type NominatimLocationResult
} from "@/lib/searchLocations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

function sanitizeSearchQuery(value: string | null): string {
  return (value ?? "")
    .replace(/[^\p{L}\p{N}\s,.'\-_/]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(request: NextRequest) {
  const query = sanitizeSearchQuery(request.nextUrl.searchParams.get("q"));
  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") ?? 6);
  const limit = Number.isFinite(requestedLimit) ? Math.min(8, Math.max(1, requestedLimit)) : 6;

  if (query.length < 2) {
    return jsonError("Search query is too short.", 400);
  }

  if (query.length > 120) {
    return jsonError("Search query is too long.", 400);
  }

  const response = await fetch(buildNominatimSearchUrl(query, limit), {
    headers: {
      Accept: "application/json",
      "Accept-Language": "en",
      "User-Agent": "vmesh-atlas/1.0 (+https://github.com/joinvdao)"
    },
    next: { revalidate: 60 * 60 }
  });

  if (!response.ok) {
    return jsonError("Location provider unavailable.", response.status);
  }

  const results = (await response.json()) as NominatimLocationResult[];

  return NextResponse.json(normalizeNominatimResults(results), {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

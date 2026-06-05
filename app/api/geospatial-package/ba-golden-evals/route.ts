import { NextRequest, NextResponse } from "next/server";

import {
  createBaGoldenEvalSitePackage,
  getBaGoldenEvalCatalog,
  getBaGoldenEvalSite,
  getBaGoldenEvalSitesForRegion,
  type BaGoldenEvalRegion
} from "@/lib/geospatialPackage";

export const dynamic = "force-dynamic";

const REGIONS = new Set<BaGoldenEvalRegion>(["europe", "canada", "usa", "germany", "lebanon"]);

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function parseRegion(value: string | null): BaGoldenEvalRegion | null {
  return value && REGIONS.has(value as BaGoldenEvalRegion) ? (value as BaGoldenEvalRegion) : null;
}

export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get("site");
  if (siteId) {
    const site = getBaGoldenEvalSite(siteId);
    if (!site) {
      return jsonResponse(
        {
          schemaVersion: "vmesh-ba-golden-eval-error-v1",
          error: "unknown_site",
          site: siteId
        },
        404
      );
    }

    return jsonResponse(createBaGoldenEvalSitePackage(siteId));
  }

  const region = parseRegion(req.nextUrl.searchParams.get("region"));
  if (region) {
    return jsonResponse({
      ...getBaGoldenEvalCatalog(),
      sites: getBaGoldenEvalSitesForRegion(region),
      filters: {
        region
      }
    });
  }

  return jsonResponse(getBaGoldenEvalCatalog());
}

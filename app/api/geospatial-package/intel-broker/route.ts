import { NextRequest, NextResponse } from "next/server";

import {
  getBaReadyIntelSources,
  isIntelBrokerSegmentId,
  type IntelBrokerSegmentId,
  type IntelBrokerSource
} from "@/lib/intelSourceBroker";
import { loadDefaultIntelSourceBrokerPackage } from "@/lib/intelSourceBrokerRuntime";

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

function parseSegment(req: NextRequest): IntelBrokerSegmentId | undefined {
  const value = req.nextUrl.searchParams.get("segment");
  return value && isIntelBrokerSegmentId(value) ? value : undefined;
}

function filterSourcesBySite(sources: IntelBrokerSource[], siteId: string | null) {
  if (!siteId) return sources;
  return sources.filter((source) => source.evaluationSiteRelevance.includes(siteId));
}

function filterSourcesBySegment(
  sources: IntelBrokerSource[],
  segment: IntelBrokerSegmentId | undefined
) {
  if (!segment) return sources;
  return sources.filter((source) => source.segments.includes(segment));
}

export async function GET(req: NextRequest) {
  const { sourcePackage, packageSource } = await loadDefaultIntelSourceBrokerPackage();

  const segment = parseSegment(req);
  const siteId = req.nextUrl.searchParams.get("site");
  const includeLicenseReview = req.nextUrl.searchParams.get("includeLicenseReview") === "true";
  const readySources = getBaReadyIntelSources(sourcePackage, {
    segment,
    siteId: siteId ?? undefined,
    includeLicenseReview
  });
  const reviewQueue = filterSourcesBySite(
    filterSourcesBySegment(sourcePackage.operatorReviewQueue, segment),
    siteId
  ).slice(0, 80);
  const ecosystemRecords = filterSourcesBySite(
    filterSourcesBySegment(sourcePackage.ecosystemSourceRecords, segment),
    siteId
  ).slice(0, 120);

  return jsonResponse({
    schemaVersion: "vmesh-intel-source-broker-api-v1",
    configured: true,
    packageSource,
    runClass: sourcePackage.runClass,
    generatedAt: sourcePackage.generatedAt,
    filters: {
      segment: segment ?? null,
      site: siteId,
      includeLicenseReview
    },
    importSummary: sourcePackage.importSummary,
    evaluationSites: sourcePackage.evaluationSites,
    segments: sourcePackage.segments,
    sourcesReadyForBA: readySources,
    ecosystemSourceRecords: ecosystemRecords,
    operatorReviewQueue: reviewQueue,
    remainingGapRegister: sourcePackage.remainingGapRegister,
    brokerResponseExamples: sourcePackage.brokerResponseExamples
  });
}

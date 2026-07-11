import { NextResponse } from "next/server";

import { operationalPromotionResults } from "@/lib/sourcePromotionGate";

export const dynamic = "force-dynamic";

export async function GET() {
  const results = operationalPromotionResults();
  return NextResponse.json(
    {
      schemaVersion: "vmesh-source-promotion-summary-v1",
      generatedAt: new Date().toISOString(),
      promotedCount: results.filter((result) => result.executable).length,
      rejectedCount: results.filter((result) => !result.executable).length,
      results
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }
    }
  );
}

import { getGeospatialSourceRegistry } from "@/lib/geospatialPackage/sourceRegistry";
import type { GeospatialSourceCandidate } from "@/lib/geospatialPackage/types";
import { CANONICAL_PROMOTION_METADATA } from "@/lib/canonicalPromotionMetadata";
import {
  evaluateSourcePromotion,
  operationalPromotionCandidates,
  type SourcePromotionCandidate,
  type SourcePromotionResult
} from "@/lib/sourcePromotionGate";

export interface CanonicalPromotionRow {
  source: GeospatialSourceCandidate;
  candidate: SourcePromotionCandidate;
  result: SourcePromotionResult;
  authorityId: string;
  endpointId: string;
  dataBucket: string;
  resolutionMeters: number | null;
}

export function buildCanonicalPromotionRows(now = new Date()): CanonicalPromotionRow[] {
  const sources = new Map(getGeospatialSourceRegistry().map((source) => [source.id, source]));
  const metadata = new Map(CANONICAL_PROMOTION_METADATA.map((row) => [row.sourceId, row]));
  return operationalPromotionCandidates().map((candidate) => {
    const source = sources.get(candidate.sourceId);
    if (!source)
      throw new Error(`Operational source ${candidate.sourceId} is missing from registry.`);
    const canonicalMetadata = metadata.get(candidate.sourceId);
    if (!canonicalMetadata)
      throw new Error(`Operational source ${candidate.sourceId} lacks canonical metadata.`);
    if (
      canonicalMetadata.label !== source.label ||
      canonicalMetadata.attribution !== source.attribution ||
      canonicalMetadata.license !== source.license
    ) {
      throw new Error(
        `Canonical metadata for ${candidate.sourceId} has drifted from source registry.`
      );
    }
    const result = evaluateSourcePromotion(candidate, { now });
    if (result.decision !== "promoted") {
      throw new Error(
        `Operational source ${candidate.sourceId} failed promotion: ${result.reasons.join(", ")}`
      );
    }
    return {
      source,
      candidate,
      result,
      authorityId: `curated-authority:${candidate.sourceId}`,
      endpointId: `curated-endpoint:${candidate.sourceId}`,
      dataBucket: canonicalMetadata.dataBucket,
      resolutionMeters: parseResolutionMeters(candidate.resolutionOrScale)
    };
  });
}

function parseResolutionMeters(value: string | null): number | null {
  const match = value?.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*m(?:\s|$)/i);
  return match ? Number(match[1]) : null;
}

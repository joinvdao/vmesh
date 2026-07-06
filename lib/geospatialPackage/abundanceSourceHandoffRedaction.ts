import type { BuildingPackageWorkerHandoff } from "@/lib/geospatialPackage/buildingPackageWorker";
import type {
  AbundanceSourceHandoff,
  AbundanceSourceHandoffRequest
} from "@/lib/geospatialPackage/abundanceSourceHandoffContract";

export function publicBuildingWorkerHandoff(
  handoff: BuildingPackageWorkerHandoff,
  includeReviewOnly: boolean
): BuildingPackageWorkerHandoff {
  if (includeReviewOnly) return handoff;

  return {
    ...handoff,
    workerRequest: {
      ...handoff.workerRequest,
      sourceLadder: handoff.workerRequest.sourceLadder.filter(
        (source) => source.workerRole !== "review-required" && source.canMaterialize
      )
    },
    warnings: [
      ...handoff.warnings,
      "Review-only building sources were omitted from this operational handoff by default."
    ]
  };
}

export function parcelBoundaryContext(
  input: AbundanceSourceHandoffRequest
): AbundanceSourceHandoff["parcelBoundaryContext"] {
  if (!input.parcelBoundaryContext?.provided) {
    return {
      provided: false,
      role: "overlay-only",
      coordinateDisclosure: "not-provided",
      vertexCount: null,
      label: null,
      notes: ["No parcel boundary geometry was attached to this resolver request."]
    };
  }

  return {
    provided: true,
    role: "overlay-only",
    coordinateDisclosure: "redacted-request-geometry",
    vertexCount: input.parcelBoundaryContext.vertexCount,
    label: input.parcelBoundaryContext.label ?? null,
    notes: [
      "Parcel boundary coordinates are intentionally omitted from the VMesh handoff.",
      "The boundary is context for highlighting/overlay only and does not change the 3 km source-slice frame."
    ]
  };
}

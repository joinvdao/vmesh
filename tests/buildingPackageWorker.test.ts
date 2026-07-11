import { describe, expect, it } from "vitest";

import { createBuildingPackageWorkerHandoff } from "@/lib/geospatialPackage";

const SAMPLE_H3 = "85393363fffffff";
const FIXED_NOW = () => new Date("2026-05-12T00:00:00.000Z");

describe("building package worker handoff", () => {
  it("uses the existing building registry as an Overture-first worker ladder", () => {
    const handoff = createBuildingPackageWorkerHandoff(
      {
        aoi: { h3Id: SAMPLE_H3, label: "Public sample cell" },
        consumerAppId: "building-abundance",
        offline: true
      },
      { now: FIXED_NOW }
    );
    const sourceIds = handoff.workerRequest.sourceLadder.map((source) => source.sourceId);

    expect(handoff.schemaVersion).toBe("vmesh-building-package-worker-v1");
    expect(handoff.plan.selectedSources.buildings?.id).toBe("overture-maps-geoparquet");
    expect(handoff.workerRequest.selectedSourceId).toBe("overture-maps-geoparquet");
    expect(handoff.workerRequest.sourceLadder[0]).toMatchObject({
      sourceId: "overture-maps-geoparquet",
      selected: true,
      workerRole: "primary",
      canMaterialize: true
    });
    expect(sourceIds).toContain("openstreetmap-pbf-extracts");
    expect(sourceIds).toContain("official-building-footprints");
    expect(sourceIds).toContain("microsoft-building-footprints");
    expect(sourceIds).toContain("google-open-buildings");
    expect(sourceIds).toContain("global-building-atlas-odbl-polygons");
  });

  it("emits a planned buildings.json contract instead of pretending the index exists", () => {
    const handoff = createBuildingPackageWorkerHandoff(
      {
        aoi: { h3Id: SAMPLE_H3 },
        consumerAppId: "building-abundance"
      },
      { now: FIXED_NOW }
    );

    expect(handoff.workerRequest.output).toMatchObject({
      fileName: "buildings.json",
      contentType: "application/geo+json",
      format: "GeoJSON FeatureCollection",
      coordinateReferenceSystem: "EPSG:4326",
      status: "planned",
      readyUrl: null,
      featureCount: null,
      generatedBy: "geospatial-package-worker"
    });
    expect(handoff.workerRequest.output.plannedCacheRef).toContain("/buildings.json");
    expect(handoff.workerRequest.policies.noSyntheticFill).toBe(true);
    expect(handoff.workerRequest.output.requiredFeatureProperties).toEqual(
      expect.arrayContaining(["class", "subtype", "facadeMaterial", "roofShape"])
    );
    expect(handoff.workerRequest.workerSteps.join(" ")).toContain(
      "/api/geospatial-package/buildings/live"
    );
    expect(handoff.warnings.join(" ")).toContain("not a completed global building feature index");
  });

  it("keeps gated building sources visible but unavailable for materialization", () => {
    const handoff = createBuildingPackageWorkerHandoff(
      {
        aoi: { h3Id: SAMPLE_H3 },
        preferredSourceIds: ["global-building-atlas-nc-lod1-height"]
      },
      { now: FIXED_NOW }
    );
    const restrictedSource = handoff.workerRequest.sourceLadder.find(
      (source) => source.sourceId === "global-building-atlas-nc-lod1-height"
    );

    expect(handoff.workerRequest.selectedSourceId).not.toBe("global-building-atlas-nc-lod1-height");
    expect(restrictedSource).toMatchObject({
      status: "license-gated",
      workerRole: "review-required",
      canMaterialize: false
    });
  });
});

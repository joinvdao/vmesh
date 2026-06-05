import { describe, expect, it } from "vitest";

import {
  createBaGeospatialPackage,
  getBaGeospatialLayersForSegments
} from "@/lib/geospatialPackage";

describe("BA geospatial package", () => {
  it("returns reviewed terrain source refs and retained live-proof metadata for BA", () => {
    const response = createBaGeospatialPackage({
      aoi: {
        centroid: { latitude: 51.0447, longitude: -114.0719 },
        label: "Calgary public-safe sample"
      },
      segments: ["terrain_elevation"],
      consumerAppId: "ba-gis-worker"
    });

    expect(response.schemaVersion).toBe("vmesh-ba-geospatial-package-v1");
    expect(response.request.consumerAppId).toBe("ba-gis-worker");
    expect(response.sourceRecords.map((source) => source.id)).toContain("canada-hrdem");
    expect(response.sourceRecords.map((source) => source.id)).toContain("canada-hrdem-dsm");
    expect(
      response.sourceRecords.find((source) => source.id === "canada-hrdem")?.selectedForAoi
    ).toBe(true);
    expect(response.liveProof.map((proof) => proof.sourceId)).toContain("canada-hrdem");
    expect(response.provenance.liveProofEvidence.length).toBeGreaterThan(0);
  });

  it("keeps fallback and gated sources out of the operational BA source records", () => {
    const response = createBaGeospatialPackage(
      {
        aoi: {
          centroid: { latitude: 38.7223, longitude: -9.1393 },
          label: "Lisbon public-safe sample"
        },
        segments: ["terrain_elevation", "imagery_observation"]
      },
      { mapboxConfigured: true }
    );

    const sourceIds = response.sourceRecords.map((source) => source.id);

    expect(sourceIds).not.toContain("mapterhorn-pmtiles-terrain");
    expect(sourceIds).not.toContain("mapzen-joerd-terrarium");
    expect(sourceIds).not.toContain("mapbox-satellite-global");
    expect(response.gaps).toContain(
      "terrain_elevation: mapterhorn-pmtiles-terrain is fallback visual/generic terrain only and is not returned as BA source truth"
    );
  });

  it("returns STAC-like refs and fetch recipes without raw GIS payloads", () => {
    const response = createBaGeospatialPackage({
      aoi: { h3Id: "85393363fffffff" },
      segments: ["imagery_observation", "soils_landcover", "climate_weather"]
    });

    expect(response.stac.records.map((record) => record.collection)).toContain(
      "sentinel-2-l2a-earth-search"
    );
    expect(response.fetchRecipes.map((recipe) => recipe.sourceId)).toContain(
      "sentinel-2-l2a-earth-search"
    );
    expect(response.sourceRecords.every((source) => source.sourceUrl !== "")).toBe(true);
    expect(response.warnings).toContain(
      "BA package is source refs and recipes by default, not raw GIS payloads."
    );
  });

  it("reports unapproved land-property sources as gaps by default", () => {
    const response = createBaGeospatialPackage({
      aoi: { h3Id: "85393363fffffff" },
      segments: ["land_property_planning"]
    });

    expect(response.sourceRecords).toHaveLength(0);
    expect(response.gaps).toEqual([
      "land_property_planning: no reviewed BA source refs are available for this request yet"
    ]);
  });

  it("preserves DTM and DSM as separate terrain roles", () => {
    const response = createBaGeospatialPackage({
      aoi: {
        centroid: { latitude: 49.2827, longitude: -123.1207 },
        label: "Vancouver public-safe sample"
      },
      segments: ["terrain_elevation"]
    });
    const lidarDtm = response.sourceRecords.find((source) => source.id === "bc-lidarbc");
    const lidarDsm = response.sourceRecords.find((source) => source.id === "bc-lidarbc-dsm");

    expect(lidarDtm?.sourceRole).toBe("bare-earth-dtm");
    expect(lidarDsm?.sourceRole).toBe("surface-dsm");
    expect(lidarDtm?.sourceRole).not.toBe(lidarDsm?.sourceRole);
  });

  it("maps BA segments to package layers for worker planning", () => {
    expect(getBaGeospatialLayersForSegments(["terrain_elevation", "water_hydrology"])).toEqual([
      "terrain",
      "contours",
      "water",
      "hydrology"
    ]);
  });
});

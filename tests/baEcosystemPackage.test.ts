import { describe, expect, it } from "vitest";

import { createBaEcosystemPackage } from "@/lib/geospatialPackage";

describe("BA ecosystem package", () => {
  it("returns ecological and soil records for BA API mode without default UI exposure", () => {
    const response = createBaEcosystemPackage({
      aoi: {
        centroid: { latitude: 51.0447, longitude: -114.0719 },
        label: "Calgary public-safe ecosystem sample"
      },
      segments: ["ecology_biodiversity_carbon", "soils_landcover"]
    });

    expect(response.schemaVersion).toBe("vmesh-ba-ecosystem-package-v1");
    expect(response.ecosystemRecords.map((record) => record.id)).toContain("soilgrids");
    expect(response.ecosystemRecords.map((record) => record.id)).toContain("dynamic-world");
    expect(
      response.ecosystemRecords.every((record) => !record.displayModes.includes("default_user_ui"))
    ).toBe(true);
    expect(
      response.ecosystemRecords.every((record) =>
        record.displayModes.includes("api_downstream_mode")
      )
    ).toBe(true);
  });

  it("creates VWiki handoff references for methods and education", () => {
    const response = createBaEcosystemPackage({
      aoi: { h3Id: "85393363fffffff" },
      segments: ["soils_landcover", "agriculture_operations"]
    });

    expect(
      response.knowledgeReferences.every((reference) => reference.targetSystem === "vwiki")
    ).toBe(true);
    expect(response.knowledgeReferences.map((reference) => reference.id)).toContain(
      "vwiki:soilgrids-interpretation"
    );
    expect(response.knowledgeReferences.map((reference) => reference.id)).toContain(
      "vwiki:field-boundary-ethics"
    );
  });

  it("returns community economy as an explicit ecosystem source gap", () => {
    const response = createBaEcosystemPackage({
      aoi: { h3Id: "85393363fffffff" },
      segments: ["community_economy"]
    });

    expect(response.ecosystemRecords).toHaveLength(0);
    expect(response.gaps).toEqual([
      "community_economy: no reviewed BA ecosystem source refs are available yet"
    ]);
  });

  it("keeps records public-safe and provenance-bearing", () => {
    const response = createBaEcosystemPackage({
      aoi: { h3Id: "85393363fffffff" },
      segments: ["climate_weather", "water_hydrology", "agriculture_operations"]
    });

    expect(response.fetchRecipes.length).toBe(response.ecosystemRecords.length);
    expect(response.ecosystemRecords.every((record) => record.reviewState === "reviewed")).toBe(
      true
    );
    expect(
      response.ecosystemRecords.every(
        (record) =>
          record.sourceUrl === null ||
          (!record.sourceUrl.includes("access_token") && !record.sourceUrl.includes("api_key"))
      )
    ).toBe(true);
    expect(response.provenance.vwikiHandoff).toBe("available");
  });
});

import { describe, expect, it } from "vitest";

import {
  getGeospatialSourceRegistry,
  getPackageSourcesByLayer,
  VMESH_GEOSPATIAL_PACKAGE_MCP_TOOLS
} from "@/lib/geospatialPackage";

describe("geospatial package API surface", () => {
  it("filters the registry to app-requested layers without leaking token URLs", () => {
    const imagerySources = getPackageSourcesByLayer(
      getGeospatialSourceRegistry({ mapboxConfigured: true }),
      "imagery"
    );

    expect(imagerySources.map((source) => source.id)).toContain("sentinel-2-l2a-earth-search");
    expect(imagerySources.map((source) => source.id)).toContain("mapbox-satellite-global");
    expect(imagerySources.every((source) => !source.sourceUrl.includes("access_token"))).toBe(true);
  });

  it("publishes a minimal future MCP contract for package consumers", () => {
    expect(VMESH_GEOSPATIAL_PACKAGE_MCP_TOOLS).toHaveLength(7);
    expect(VMESH_GEOSPATIAL_PACKAGE_MCP_TOOLS.map((tool) => tool.name)).toEqual([
      "vmesh.geospatial_package.list_sources",
      "vmesh.geospatial_package.plan_package",
      "vmesh.geospatial_package.plan_ba_geospatial_package",
      "vmesh.geospatial_package.plan_ba_ecosystem_package",
      "vmesh.geospatial_package.plan_sentinel_sr",
      "vmesh.geospatial_package.get_manifest",
      "vmesh.geospatial_package.list_intel_broker_sources"
    ]);
  });
});

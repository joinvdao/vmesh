import { describe, expect, it } from "vitest";

import {
  createConfiguredTerrainRasterQuery,
  createTerrainRasterQueryFromSourceRenderProof,
  createTerrainWorkerPlan,
  runTerrainPackageWorker,
  type TerrainRasterQuery
} from "@/lib/geospatialPackage";

const sampleAoi = {
  centroid: { latitude: 38.7223, longitude: -9.1393 },
  label: "Sample AOI"
};

const ottawaAoi = {
  centroid: { latitude: 45.4215, longitude: -75.6972 },
  label: "Ottawa public terrain proof AOI"
};

const vancouverAoi = {
  centroid: { latitude: 49.2827, longitude: -123.1207 },
  label: "Vancouver public terrain proof AOI"
};

const denverAoi = {
  centroid: { latitude: 39.73676229957947, longitude: -105.0018310546875 },
  label: "Denver public USGS LPC tile proof AOI"
};

describe("terrain package worker", () => {
  it("adds terrain to worker plans when a caller omits the terrain layer", () => {
    const plan = createTerrainWorkerPlan({
      request: {
        aoi: sampleAoi,
        layers: ["imagery", "roads"],
        preferredSourceIds: ["usgs-3dep"]
      }
    });

    expect(plan.requestedLayers[0]).toBe("terrain");
    expect(plan.selectedSources.terrain?.id).toBe("usgs-3dep");
  });

  it("fails closed when a terrain source is selected but no raster query is attached", async () => {
    const result = await runTerrainPackageWorker({
      request: {
        aoi: sampleAoi,
        layers: ["terrain"],
        preferredSourceIds: ["usgs-3dep"]
      }
    });

    expect(result.status).toBe("blocked");
    expect(result.runClass).toBe("configured");
    expect(result.selectedSource?.id).toBe("usgs-3dep");
    expect(result.toolProfile?.toolId).toBe("usgs-3dep");
    expect(result.manifest).toBeNull();
    expect(result.blockedReasons.join(" ")).toContain("No terrain raster query");
  });

  it("produces a live-proof manifest when an injected worker returns retained terrain artifacts", async () => {
    const query: TerrainRasterQuery = (input) => ({
      status: "ready",
      artifacts: [
        {
          kind: "cog",
          role: "terrain",
          ref: `vmesh-cache://${input.cacheKey}/terrain.cog.tif`,
          privacy: "private",
          sha256: "a".repeat(64)
        },
        {
          kind: "png",
          role: "qa",
          ref: `vmesh-cache://${input.cacheKey}/qa.png`,
          privacy: "private"
        }
      ],
      sourceSummary: {
        provider: input.toolProfile.provider,
        sourceId: input.source.id,
        sourceRelease: input.toolProfile.sourceRelease,
        license: input.source.license,
        attribution: input.source.attribution,
        groundModelRole: input.toolProfile.groundModelRole,
        resolutionMeters: input.toolProfile.targetResolutionMeters,
        crs: "EPSG:26910",
        verticalDatum: "NAVD88"
      },
      qa: {
        coverageStatus: "contains-aoi",
        noDataRatio: 0,
        minElevationMeters: 12,
        maxElevationMeters: 83,
        meanElevationMeters: 41,
        sampleCount: 4096
      },
      retainedEvidence: [`vmesh-cache://${input.cacheKey}/run-report.json`]
    });

    const result = await runTerrainPackageWorker(
      {
        request: {
          aoi: sampleAoi,
          layers: ["terrain"],
          preferredSourceIds: ["usgs-3dep"]
        }
      },
      { terrainRasterQuery: query }
    );

    expect(result.status).toBe("ready");
    expect(result.runClass).toBe("live-proof");
    expect(result.manifest?.schemaVersion).toBe("vmesh-terrain-package-manifest-v1");
    expect(result.manifest?.sourceSummary.provider).toBe("USGS 3DEP");
    expect(result.manifest?.qa.coverageStatus).toBe("contains-aoi");
    expect(result.artifacts.map((artifact) => artifact.role)).toContain("terrain");
  });

  it("rejects ready outputs that contain secret-bearing artifact refs", async () => {
    const query: TerrainRasterQuery = (input) => ({
      status: "ready",
      runClass: "live-proof",
      artifacts: [
        {
          kind: "cog",
          role: "terrain",
          ref: `https://tiles.example.test/${input.cacheKey}/terrain.tif?token=secret`,
          privacy: "private"
        }
      ],
      sourceSummary: {
        provider: input.toolProfile.provider,
        sourceId: input.source.id,
        sourceRelease: input.toolProfile.sourceRelease,
        license: input.source.license,
        attribution: input.source.attribution,
        groundModelRole: input.toolProfile.groundModelRole,
        resolutionMeters: input.toolProfile.targetResolutionMeters
      },
      qa: {
        coverageStatus: "contains-aoi",
        noDataRatio: 0,
        sampleCount: 1024
      },
      retainedEvidence: [`vmesh-cache://${input.cacheKey}/run-report.json`]
    });

    const result = await runTerrainPackageWorker(
      {
        request: {
          aoi: sampleAoi,
          layers: ["terrain"],
          preferredSourceIds: ["canada-hrdem"]
        }
      },
      { terrainRasterQuery: query }
    );

    expect(result.status).toBe("blocked");
    expect(result.runClass).toBe("live-proof");
    expect(result.manifest).toBeNull();
    expect(result.blockedReasons.join(" ")).toContain("secret-bearing");
  });

  it("rejects outputs whose QA does not prove AOI coverage", async () => {
    const query: TerrainRasterQuery = (input) => ({
      status: "ready",
      artifacts: [
        {
          kind: "cog",
          role: "terrain",
          ref: `vmesh-cache://${input.cacheKey}/terrain.cog.tif`,
          privacy: "private"
        }
      ],
      sourceSummary: {
        provider: input.toolProfile.provider,
        sourceId: input.source.id,
        sourceRelease: input.toolProfile.sourceRelease,
        license: input.source.license,
        attribution: input.source.attribution,
        groundModelRole: input.toolProfile.groundModelRole,
        resolutionMeters: input.toolProfile.targetResolutionMeters
      },
      qa: {
        coverageStatus: "partial",
        noDataRatio: 0.42,
        sampleCount: 512
      },
      retainedEvidence: [`vmesh-cache://${input.cacheKey}/run-report.json`]
    });

    const result = await runTerrainPackageWorker(
      {
        request: {
          aoi: sampleAoi,
          layers: ["terrain"],
          preferredSourceIds: ["mapterhorn-pmtiles-terrain"]
        }
      },
      { terrainRasterQuery: query }
    );

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons.join(" ")).toContain("QA");
  });

  it("can run through configured-artifact runtime mode without claiming live proof", async () => {
    const terrainRasterQuery = createConfiguredTerrainRasterQuery({
      VMESH_TERRAIN_WORKER_MODE: "configured-artifact",
      VMESH_TERRAIN_WORKER_TERRAIN_REF: "vmesh-cache://sample/terrain.cog.tif",
      VMESH_TERRAIN_WORKER_QA_REF: "vmesh-cache://sample/qa.png",
      VMESH_TERRAIN_WORKER_RUN_REPORT_REF: "vmesh-cache://sample/run-report.json",
      VMESH_TERRAIN_WORKER_CRS: "EPSG:4326",
      VMESH_TERRAIN_WORKER_RESOLUTION_METERS: "2"
    });

    const result = await runTerrainPackageWorker(
      {
        request: {
          aoi: sampleAoi,
          layers: ["terrain"],
          preferredSourceIds: ["canada-hrdem"]
        }
      },
      { terrainRasterQuery }
    );

    expect(result.status).toBe("ready");
    expect(result.runClass).toBe("configured");
    expect(result.manifest?.sourceSummary.provider).toBe("Natural Resources Canada HRDEM");
    expect(result.manifest?.sourceSummary.resolutionMeters).toBe(2);
    expect(result.manifest?.retainedEvidence).toContain("vmesh-cache://sample/run-report.json");
  });

  it("promotes a covered Canada HRDEM 1m source proof into a live-proof terrain manifest", async () => {
    const terrainRasterQuery = createTerrainRasterQueryFromSourceRenderProof(
      {
        schemaVersion: "vmesh-terrain-cog-probe-v1",
        generatedAt: "2026-06-02T12:00:00.000Z",
        runClass: "live-proof",
        providerId: "canada-hrdem",
        role: "dtm",
        groundModelRole: "bare-earth-dtm",
        status: "covered",
        resolutionMeters: 1,
        coverageSourceIds: ["hrdem-mosaic-1m:sample-tile"],
        coordinate: ottawaAoi.centroid,
        sourceAsset: {
          collection: "hrdem-mosaic-1m",
          id: "sample-tile",
          assetRole: "dtm",
          type: "image/tiff; application=geotiff; profile=cloud-optimized"
        },
        qa: {
          validPixels: 4096,
          windowPixels: 4096,
          noDataRatio: 0,
          minElevationMeters: 41,
          maxElevationMeters: 96,
          meanElevationMeters: 64
        },
        renderedArtifact: {
          status: "ready",
          kind: "png",
          role: "terrain-preview",
          ref: "vmesh-cache://terrain/hrdem-dtm-preview.png",
          byteSize: 20844
        },
        reasons: []
      },
      { proofRef: "vmesh-cache://terrain/hrdem-dtm-proof.json" }
    );

    const result = await runTerrainPackageWorker(
      {
        request: {
          aoi: ottawaAoi,
          layers: ["terrain"],
          preferredSourceIds: ["canada-hrdem"]
        }
      },
      { terrainRasterQuery }
    );

    expect(result.status).toBe("ready");
    expect(result.runClass).toBe("live-proof");
    expect(result.manifest?.sourceSummary.sourceRelease).toContain("cahrdem2");
    expect(result.manifest?.sourceSummary.resolutionMeters).toBe(1);
    expect(result.manifest?.artifacts[0].role).toBe("terrain");
    expect(result.manifest?.retainedEvidence).toContain(
      "vmesh-cache://terrain/hrdem-dtm-proof.json"
    );
  });

  it("promotes a covered Canada HRDEM 1m DSM proof as a surface model manifest", async () => {
    const terrainRasterQuery = createTerrainRasterQueryFromSourceRenderProof(
      {
        schemaVersion: "vmesh-terrain-cog-probe-v1",
        generatedAt: "2026-06-02T12:00:00.000Z",
        runClass: "live-proof",
        providerId: "canada-hrdem",
        role: "dsm",
        groundModelRole: "surface-dsm",
        status: "covered",
        resolutionMeters: 1,
        coverageSourceIds: ["hrdem-mosaic-1m:sample-tile"],
        coordinate: ottawaAoi.centroid,
        sourceAsset: {
          collection: "hrdem-mosaic-1m",
          id: "sample-tile",
          assetRole: "dsm",
          type: "image/tiff; application=geotiff; profile=cloud-optimized"
        },
        qa: {
          validPixels: 4096,
          windowPixels: 4096,
          noDataRatio: 0,
          minElevationMeters: 45,
          maxElevationMeters: 112,
          meanElevationMeters: 72
        },
        renderedArtifact: {
          status: "ready",
          kind: "png",
          role: "terrain-preview",
          ref: "vmesh-cache://terrain/hrdem-dsm-preview.png",
          byteSize: 24412
        },
        reasons: []
      },
      { proofRef: "vmesh-cache://terrain/hrdem-dsm-proof.json" }
    );

    const result = await runTerrainPackageWorker(
      {
        request: {
          aoi: ottawaAoi,
          layers: ["terrain"],
          preferredSourceIds: ["canada-hrdem-dsm"]
        }
      },
      { terrainRasterQuery }
    );

    expect(result.status).toBe("ready");
    expect(result.runClass).toBe("live-proof");
    expect(result.selectedSource?.id).toBe("canada-hrdem-dsm");
    expect(result.manifest?.sourceSummary.groundModelRole).toBe("surface-dsm");
    expect(result.manifest?.sourceSummary.resolutionMeters).toBe(1);
    expect(result.manifest?.sourceSummary.sourceId).toBe("canada-hrdem-dsm");
  });

  it("promotes a covered LidarBC 1m DTM proof into a live-proof terrain manifest", async () => {
    const terrainRasterQuery = createTerrainRasterQueryFromSourceRenderProof(
      {
        schemaVersion: "vmesh-terrain-cog-probe-v1",
        generatedAt: "2026-06-02T12:00:00.000Z",
        runClass: "live-proof",
        providerId: "bc-lidarbc",
        role: "dtm",
        groundModelRole: "bare-earth-dtm",
        status: "covered",
        resolutionMeters: 1,
        coverageSourceIds: ["bc-lidarbc:dtm:092g025_3_4_2:2025"],
        coordinate: vancouverAoi.centroid,
        sourceAsset: {
          collection: "LiDAR_BC_S3_Public",
          id: "bc-lidarbc:dtm:092g025_3_4_2:2025",
          assetRole: "dtm",
          type: "image/tiff"
        },
        qa: {
          validPixels: 13513,
          windowPixels: 16384,
          noDataRatio: 0.175,
          minElevationMeters: 3,
          maxElevationMeters: 126,
          meanElevationMeters: 42
        },
        renderedArtifact: {
          status: "ready",
          kind: "png",
          role: "terrain-preview",
          ref: "vmesh-cache://terrain/lidarbc-dtm-preview.png",
          byteSize: 17482
        },
        reasons: []
      },
      { proofRef: "vmesh-cache://terrain/lidarbc-dtm-proof.json" }
    );

    const result = await runTerrainPackageWorker(
      {
        request: {
          aoi: vancouverAoi,
          layers: ["terrain"],
          preferredSourceIds: ["bc-lidarbc"]
        }
      },
      { terrainRasterQuery }
    );

    expect(result.status).toBe("ready");
    expect(result.runClass).toBe("live-proof");
    expect(result.selectedSource?.id).toBe("bc-lidarbc");
    expect(result.manifest?.sourceSummary.provider).toBe("Government of British Columbia LidarBC");
    expect(result.manifest?.sourceSummary.groundModelRole).toBe("bare-earth-dtm");
    expect(result.manifest?.sourceSummary.resolutionMeters).toBe(1);
    expect(result.manifest?.sourceSummary.sourceRelease).toContain("LidarBC DTM");
  });

  it("promotes a covered LidarBC 1m DSM proof as a surface model manifest", async () => {
    const terrainRasterQuery = createTerrainRasterQueryFromSourceRenderProof(
      {
        schemaVersion: "vmesh-terrain-cog-probe-v1",
        generatedAt: "2026-06-02T12:00:00.000Z",
        runClass: "live-proof",
        providerId: "bc-lidarbc",
        role: "dsm",
        groundModelRole: "surface-dsm",
        status: "covered",
        resolutionMeters: 1,
        coverageSourceIds: ["bc-lidarbc:dsm:092g025_3_4_2:2025"],
        coordinate: vancouverAoi.centroid,
        sourceAsset: {
          collection: "LiDAR_BC_S3_Public",
          id: "bc-lidarbc:dsm:092g025_3_4_2:2025",
          assetRole: "dsm",
          type: "image/tiff"
        },
        qa: {
          validPixels: 16384,
          windowPixels: 16384,
          noDataRatio: 0,
          minElevationMeters: 5,
          maxElevationMeters: 144,
          meanElevationMeters: 51
        },
        renderedArtifact: {
          status: "ready",
          kind: "png",
          role: "terrain-preview",
          ref: "vmesh-cache://terrain/lidarbc-dsm-preview.png",
          byteSize: 26444
        },
        reasons: []
      },
      { proofRef: "vmesh-cache://terrain/lidarbc-dsm-proof.json" }
    );

    const result = await runTerrainPackageWorker(
      {
        request: {
          aoi: vancouverAoi,
          layers: ["terrain"],
          preferredSourceIds: ["bc-lidarbc-dsm"]
        }
      },
      { terrainRasterQuery }
    );

    expect(result.status).toBe("ready");
    expect(result.runClass).toBe("live-proof");
    expect(result.selectedSource?.id).toBe("bc-lidarbc-dsm");
    expect(result.manifest?.sourceSummary.groundModelRole).toBe("surface-dsm");
    expect(result.manifest?.sourceSummary.sourceId).toBe("bc-lidarbc-dsm");
    expect(result.manifest?.sourceSummary.sourceRelease).toContain("LidarBC DSM");
  });

  it("promotes a covered USGS LPC 1m DSM render proof as a surface model manifest", async () => {
    const terrainRasterQuery = createTerrainRasterQueryFromSourceRenderProof(
      {
        schemaVersion: "vmesh-usgs-lpc-dsm-render-v1",
        generatedAt: "2026-06-02T12:00:00.000Z",
        runClass: "live-proof",
        providerId: "usgs-3dep-lpc-dsm",
        role: "dsm",
        groundModelRole: "surface-dsm",
        status: "covered",
        resolutionMeters: 1,
        coverageSourceIds: ["usgs-3dep-lpc-dsm:2238"],
        tile: { z: 15, x: 6826, y: 12436 },
        sourceAsset: {
          collection: "USGS 3DEP Lidar Point Cloud",
          id: "usgs-3dep-lpc-dsm:2238",
          assetRole: "source-index",
          type: "source-index"
        },
        qa: {
          pointsInsideRequestedTile: 2531774,
          validPixels: 56739,
          tilePixels: 65536,
          noDataRatio: 0.1342315673828125,
          minElevationMeters: 1584.365966796875,
          maxElevationMeters: 1669.6219482421875,
          meanElevationMeters: 1598.20458984375
        },
        renderedArtifact: {
          status: "ready",
          kind: "png",
          role: "surface-dsm-preview",
          ref: "vmesh-cache://terrain/usgs-lpc-dsm-preview.png",
          byteSize: 106794
        },
        reasons: []
      },
      { proofRef: "vmesh-cache://terrain/usgs-lpc-dsm-proof.json" }
    );

    const result = await runTerrainPackageWorker(
      {
        request: {
          aoi: denverAoi,
          layers: ["terrain"],
          preferredSourceIds: ["usgs-3dep-lpc-dsm"]
        }
      },
      { terrainRasterQuery }
    );

    expect(result.status).toBe("ready");
    expect(result.runClass).toBe("live-proof");
    expect(result.selectedSource?.id).toBe("usgs-3dep-lpc-dsm");
    expect(result.manifest?.sourceSummary.provider).toBe("USGS 3DEP Lidar Point Cloud");
    expect(result.manifest?.sourceSummary.groundModelRole).toBe("surface-dsm");
    expect(result.manifest?.sourceSummary.resolutionMeters).toBe(1);
    expect(result.manifest?.sourceSummary.sourceRelease).toContain("Lidar Point Cloud DSM");
  });

  it("rejects a Canada HRDEM DSM proof when the selected source is the DTM route", async () => {
    const terrainRasterQuery = createTerrainRasterQueryFromSourceRenderProof(
      {
        schemaVersion: "vmesh-terrain-cog-probe-v1",
        runClass: "live-proof",
        providerId: "canada-hrdem",
        role: "dsm",
        groundModelRole: "surface-dsm",
        status: "covered",
        resolutionMeters: 1,
        coverageSourceIds: ["hrdem-mosaic-1m:sample-tile"],
        coordinate: ottawaAoi.centroid,
        qa: {
          validPixels: 4096,
          windowPixels: 4096,
          noDataRatio: 0
        },
        renderedArtifact: {
          status: "ready",
          kind: "png",
          role: "terrain-preview",
          ref: "vmesh-cache://terrain/hrdem-dsm-preview.png"
        },
        reasons: []
      },
      { proofRef: "vmesh-cache://terrain/hrdem-dsm-proof.json" }
    );

    const result = await runTerrainPackageWorker(
      {
        request: {
          aoi: ottawaAoi,
          layers: ["terrain"],
          preferredSourceIds: ["canada-hrdem"]
        }
      },
      { terrainRasterQuery }
    );

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons.join(" ")).toContain("does not match selected DTM");
  });

  it("rejects a covered Canada HRDEM proof when it only proves 2m terrain", async () => {
    const terrainRasterQuery = createTerrainRasterQueryFromSourceRenderProof(
      {
        schemaVersion: "vmesh-terrain-cog-probe-v1",
        runClass: "live-proof",
        providerId: "canada-hrdem",
        role: "dtm",
        groundModelRole: "bare-earth-dtm",
        status: "covered",
        resolutionMeters: 2,
        coverageSourceIds: ["hrdem-mosaic-2m:sample-tile"],
        coordinate: ottawaAoi.centroid,
        qa: {
          validPixels: 4096,
          windowPixels: 4096,
          noDataRatio: 0
        },
        renderedArtifact: {
          status: "ready",
          kind: "png",
          role: "terrain-preview",
          ref: "vmesh-cache://terrain/hrdem-2m-preview.png"
        },
        reasons: []
      },
      { proofRef: "vmesh-cache://terrain/hrdem-2m-proof.json" }
    );

    const result = await runTerrainPackageWorker(
      {
        request: {
          aoi: ottawaAoi,
          layers: ["terrain"],
          preferredSourceIds: ["canada-hrdem"]
        }
      },
      { terrainRasterQuery }
    );

    expect(result.status).toBe("blocked");
    expect(result.manifest).toBeNull();
    expect(result.blockedReasons.join(" ")).toContain("requires proven 1 m");
  });

  it("promotes explicit Canada HRDEM 2m DTM only through the best-available source", async () => {
    const terrainRasterQuery = createTerrainRasterQueryFromSourceRenderProof(
      {
        schemaVersion: "vmesh-terrain-cog-probe-v1",
        generatedAt: "2026-06-02T12:00:00.000Z",
        runClass: "live-proof",
        providerId: "canada-hrdem",
        role: "dtm",
        groundModelRole: "bare-earth-dtm",
        status: "covered",
        resolutionMeters: 2,
        coverageSourceIds: ["hrdem-mosaic-2m:sample-tile"],
        coordinate: ottawaAoi.centroid,
        sourceAsset: {
          collection: "hrdem-mosaic-2m",
          id: "sample-tile",
          assetRole: "dtm",
          type: "image/tiff; application=geotiff; profile=cloud-optimized"
        },
        qa: {
          validPixels: 4096,
          windowPixels: 4096,
          noDataRatio: 0,
          minElevationMeters: 41,
          maxElevationMeters: 96,
          meanElevationMeters: 64
        },
        renderedArtifact: {
          status: "ready",
          kind: "png",
          role: "terrain-preview",
          ref: "vmesh-cache://terrain/hrdem-2m-best-preview.png",
          byteSize: 20844
        },
        reasons: []
      },
      { proofRef: "vmesh-cache://terrain/hrdem-2m-best-proof.json" }
    );

    const result = await runTerrainPackageWorker(
      {
        request: {
          aoi: ottawaAoi,
          layers: ["terrain"],
          preferredSourceIds: ["canada-hrdem-best-dtm"]
        }
      },
      { terrainRasterQuery }
    );

    expect(result.status).toBe("ready");
    expect(result.runClass).toBe("live-proof");
    expect(result.selectedSource?.id).toBe("canada-hrdem-best-dtm");
    expect(result.manifest?.sourceSummary.sourceId).toBe("canada-hrdem-best-dtm");
    expect(result.manifest?.sourceSummary.resolutionMeters).toBe(2);
    expect(result.manifest?.warnings.join(" ")).toContain("does not satisfy strict 1m");
  });

  it("rejects a covered source proof when its coordinate evidence does not match the package AOI", async () => {
    const terrainRasterQuery = createTerrainRasterQueryFromSourceRenderProof(
      {
        schemaVersion: "vmesh-terrain-cog-probe-v1",
        runClass: "live-proof",
        providerId: "canada-hrdem",
        role: "dtm",
        groundModelRole: "bare-earth-dtm",
        status: "covered",
        resolutionMeters: 1,
        coverageSourceIds: ["hrdem-mosaic-1m:sample-tile"],
        coordinate: ottawaAoi.centroid,
        qa: {
          validPixels: 4096,
          windowPixels: 4096,
          noDataRatio: 0
        },
        renderedArtifact: {
          status: "ready",
          kind: "png",
          role: "terrain-preview",
          ref: "vmesh-cache://terrain/hrdem-dtm-preview.png"
        },
        reasons: []
      },
      { proofRef: "vmesh-cache://terrain/hrdem-dtm-proof.json" }
    );

    const result = await runTerrainPackageWorker(
      {
        request: {
          aoi: vancouverAoi,
          layers: ["terrain"],
          preferredSourceIds: ["canada-hrdem"]
        }
      },
      { terrainRasterQuery }
    );

    expect(result.status).toBe("blocked");
    expect(result.manifest).toBeNull();
    expect(result.blockedReasons.join(" ")).toContain("matching the package AOI");
  });

  it("fails closed when a source proof is blocked even if the provider is selected", async () => {
    const terrainRasterQuery = createTerrainRasterQueryFromSourceRenderProof(
      {
        schemaVersion: "vmesh-terrain-cog-probe-v1",
        runClass: "live-proof",
        providerId: "canada-hrdem",
        role: "dtm",
        groundModelRole: "bare-earth-dtm",
        status: "blocked",
        resolutionMeters: 2,
        coverageSourceIds: [],
        qa: {
          validPixels: 0,
          windowPixels: 4096,
          noDataRatio: 1
        },
        renderedArtifact: null,
        reasons: ["The HRDEM COG asset exists, but the sampled window contains no valid pixels."]
      },
      { proofRef: "vmesh-cache://terrain/hrdem-blocked-proof.json" }
    );

    const result = await runTerrainPackageWorker(
      {
        request: {
          aoi: sampleAoi,
          layers: ["terrain"],
          preferredSourceIds: ["canada-hrdem"]
        }
      },
      { terrainRasterQuery }
    );

    expect(result.status).toBe("blocked");
    expect(result.manifest).toBeNull();
    expect(result.blockedReasons.join(" ")).toContain("no valid pixels");
  });

  it("rejects source proof artifacts that contain secrets", async () => {
    const terrainRasterQuery = createTerrainRasterQueryFromSourceRenderProof({
      schemaVersion: "vmesh-terrain-cog-probe-v1",
      runClass: "live-proof",
      providerId: "canada-hrdem",
      role: "dtm",
      groundModelRole: "bare-earth-dtm",
      status: "covered",
      resolutionMeters: 1,
      coverageSourceIds: ["hrdem-mosaic-1m:sample-tile"],
      coordinate: ottawaAoi.centroid,
      qa: {
        validPixels: 4096,
        windowPixels: 4096,
        noDataRatio: 0
      },
      renderedArtifact: {
        status: "ready",
        kind: "png",
        role: "terrain-preview",
        ref: "https://example.test/hrdem-preview.png?token=secret"
      },
      reasons: []
    });

    const result = await runTerrainPackageWorker(
      {
        request: {
          aoi: ottawaAoi,
          layers: ["terrain"],
          preferredSourceIds: ["canada-hrdem"]
        }
      },
      { terrainRasterQuery }
    );

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons.join(" ")).toContain("secret-bearing");
  });

  it("does not accept a USGS 3DEP DSM proof because the current USGS route is DTM-only", async () => {
    const terrainRasterQuery = createTerrainRasterQueryFromSourceRenderProof(
      {
        schemaVersion: "vmesh-usgs-3dep-render-v1",
        runClass: "live-proof",
        providerId: "usgs-3dep",
        role: "dsm",
        groundModelRole: "surface-dsm",
        status: "covered",
        resolutionMeters: 1,
        coverageSourceIds: ["usgs-3dep-1m-product-index:1"],
        qa: {
          coverageStatus: "contains-aoi",
          coverageFeatureCount: 1,
          renderStatus: "ready"
        },
        renderedArtifact: {
          status: "ready",
          kind: "png",
          role: "terrain-preview",
          ref: "vmesh-cache://terrain/usgs-dsm-preview.png"
        },
        reasons: []
      },
      { proofRef: "vmesh-cache://terrain/usgs-dsm-proof.json" }
    );

    const result = await runTerrainPackageWorker(
      {
        request: {
          aoi: sampleAoi,
          layers: ["terrain"],
          preferredSourceIds: ["usgs-3dep"]
        }
      },
      { terrainRasterQuery }
    );

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons.join(" ")).toContain("DTM route");
  });

  it("blocks configured-artifact runtime refs that contain secrets", async () => {
    const terrainRasterQuery = createConfiguredTerrainRasterQuery({
      VMESH_TERRAIN_WORKER_MODE: "configured-artifact",
      VMESH_TERRAIN_WORKER_TERRAIN_REF: "https://example.test/terrain.tif?signature=secret"
    });

    const result = await runTerrainPackageWorker(
      {
        request: {
          aoi: sampleAoi,
          layers: ["terrain"],
          preferredSourceIds: ["usgs-3dep"]
        }
      },
      { terrainRasterQuery }
    );

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons.join(" ")).toContain("secret-bearing");
  });
});

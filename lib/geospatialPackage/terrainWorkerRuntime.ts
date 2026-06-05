import { containsSecretLikeValue } from "@/lib/geospatialPackage/plannerUtils";
import type {
  TerrainRasterQuery,
  TerrainWorkerArtifactKind,
  TerrainWorkerArtifactRef
} from "@/lib/geospatialPackage/terrainWorker";

export const VMESH_TERRAIN_WORKER_MODE_ENV = "VMESH_TERRAIN_WORKER_MODE";
export const VMESH_TERRAIN_WORKER_CONFIGURED_MODE = "configured-artifact";

interface TerrainWorkerRuntimeEnv {
  [key: string]: string | undefined;
}

function envNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function artifactKind(value: string | undefined): TerrainWorkerArtifactKind {
  if (
    value === "cog" ||
    value === "pmtiles" ||
    value === "raster-tiles" ||
    value === "vector-tiles" ||
    value === "png" ||
    value === "json"
  ) {
    return value;
  }

  return "cog";
}

function artifactPrivacy(value: string | undefined): TerrainWorkerArtifactRef["privacy"] {
  return value === "public" ? "public" : "private";
}

function optionalArtifact({
  ref,
  kind,
  role,
  privacy
}: {
  ref: string | undefined;
  kind: TerrainWorkerArtifactKind;
  role: TerrainWorkerArtifactRef["role"];
  privacy: TerrainWorkerArtifactRef["privacy"];
}): TerrainWorkerArtifactRef | null {
  const trimmed = ref?.trim();
  if (!trimmed) return null;
  return { kind, role, ref: trimmed, privacy };
}

export function createConfiguredTerrainRasterQuery(
  env: TerrainWorkerRuntimeEnv = process.env
): TerrainRasterQuery | undefined {
  if (env[VMESH_TERRAIN_WORKER_MODE_ENV] !== VMESH_TERRAIN_WORKER_CONFIGURED_MODE) {
    return undefined;
  }

  return (input) => {
    const privacy = artifactPrivacy(env.VMESH_TERRAIN_WORKER_PRIVACY);
    const terrainRef = env.VMESH_TERRAIN_WORKER_TERRAIN_REF?.trim();

    if (!terrainRef) {
      return {
        status: "blocked",
        runClass: "configured",
        artifacts: [],
        sourceSummary: {
          provider: input.toolProfile.provider,
          sourceId: input.source.id,
          sourceRelease: input.toolProfile.sourceRelease,
          license: input.source.license,
          attribution: input.source.attribution,
          groundModelRole: input.toolProfile.groundModelRole,
          resolutionMeters: input.toolProfile.targetResolutionMeters
        },
        qa: { coverageStatus: "not-checked" },
        retainedEvidence: [],
        blockedReasons: [
          "VMESH_TERRAIN_WORKER_TERRAIN_REF is required in configured-artifact mode."
        ]
      };
    }

    const artifacts = [
      {
        kind: artifactKind(env.VMESH_TERRAIN_WORKER_TERRAIN_KIND),
        role: "terrain",
        ref: terrainRef,
        privacy
      },
      optionalArtifact({
        ref: env.VMESH_TERRAIN_WORKER_HILLSHADE_REF,
        kind: "png",
        role: "hillshade",
        privacy
      }),
      optionalArtifact({
        ref: env.VMESH_TERRAIN_WORKER_CONTOURS_REF,
        kind: "vector-tiles",
        role: "contours",
        privacy
      }),
      optionalArtifact({
        ref: env.VMESH_TERRAIN_WORKER_QA_REF,
        kind: "png",
        role: "qa",
        privacy
      }),
      optionalArtifact({
        ref: env.VMESH_TERRAIN_WORKER_MANIFEST_REF,
        kind: "json",
        role: "manifest",
        privacy
      })
    ].filter((artifact): artifact is TerrainWorkerArtifactRef => artifact !== null);
    const secretBearingRef = artifacts.find((artifact) => containsSecretLikeValue(artifact.ref));

    if (secretBearingRef) {
      return {
        status: "blocked",
        runClass: "configured",
        artifacts,
        sourceSummary: {
          provider: input.toolProfile.provider,
          sourceId: input.source.id,
          sourceRelease: input.toolProfile.sourceRelease,
          license: input.source.license,
          attribution: input.source.attribution,
          groundModelRole: input.toolProfile.groundModelRole,
          resolutionMeters: input.toolProfile.targetResolutionMeters
        },
        qa: { coverageStatus: "not-checked" },
        retainedEvidence: [],
        blockedReasons: [
          `Configured terrain artifact ${secretBearingRef.role} has a secret-bearing ref.`
        ]
      };
    }

    return {
      status: "ready",
      runClass: "configured",
      artifacts,
      sourceSummary: {
        provider: input.toolProfile.provider,
        sourceId: input.source.id,
        sourceRelease:
          env.VMESH_TERRAIN_WORKER_SOURCE_RELEASE?.trim() || input.toolProfile.sourceRelease,
        license: input.source.license,
        attribution: input.source.attribution,
        groundModelRole: input.toolProfile.groundModelRole,
        resolutionMeters:
          envNumber(env.VMESH_TERRAIN_WORKER_RESOLUTION_METERS) ??
          input.toolProfile.targetResolutionMeters,
        crs: env.VMESH_TERRAIN_WORKER_CRS?.trim() || input.toolProfile.crs,
        verticalDatum:
          env.VMESH_TERRAIN_WORKER_VERTICAL_DATUM?.trim() || input.toolProfile.verticalDatum
      },
      qa: {
        coverageStatus:
          env.VMESH_TERRAIN_WORKER_COVERAGE_STATUS === "partial" ? "partial" : "contains-aoi",
        noDataRatio: envNumber(env.VMESH_TERRAIN_WORKER_NODATA_RATIO),
        sampleCount: envNumber(env.VMESH_TERRAIN_WORKER_SAMPLE_COUNT)
      },
      retainedEvidence: [
        env.VMESH_TERRAIN_WORKER_RUN_REPORT_REF,
        env.VMESH_TERRAIN_WORKER_MANIFEST_REF
      ].filter((value): value is string => Boolean(value?.trim())),
      warnings: [
        "Configured artifact mode does not prove that vmesh fetched or generated the terrain artifact in this run."
      ]
    };
  };
}

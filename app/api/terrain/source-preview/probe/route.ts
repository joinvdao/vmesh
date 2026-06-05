import { NextResponse, type NextRequest } from "next/server";

import {
  BC_LIDARBC_TERRAIN_PROVIDER,
  CANADA_HRDEM_TERRAIN_PROVIDER,
  createBcLidarSourceSummary,
  createUsgs3depOneMeterCoverageQueryUrl,
  createUsgs3depSourceDemIndexQueryUrl,
  createUsgsLpcDsmSourceIndexQueryUrls,
  isBritishColumbiaTerrainSourceCoordinate,
  isCanadaTerrainSourceCoordinate,
  isTerrainSourcePreviewRole,
  isUsaTerrainSourceCoordinate,
  selectUsgs3depDtmSource,
  selectUsgsLpcDsmSource,
  SOURCE_AUTO_BEST_TERRAIN_PROVIDER,
  SOURCE_AUTO_TERRAIN_PROVIDER,
  USGS_3DEP_LPC_DSM_TERRAIN_PROVIDER,
  USGS_3DEP_TERRAIN_PROVIDER,
  type LonLatCoordinate,
  type TerrainSourcePreviewRole,
  type UsgsLpcDsmSourceSelection
} from "@/lib/terrainSourcePreview";
import {
  probeTerrainCogCoordinate,
  type TerrainCogProbeWorkerResult
} from "@/lib/terrainSourceProbeWorker";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TerrainSourceProbeMode = "strict-1m" | "best-available";

interface TerrainSourceProbeResponse {
  schemaVersion: "vmesh-terrain-source-probe-v1";
  runClass: "live-proof" | "configured";
  status: "covered" | "source-available" | "blocked" | "outside-source-area" | "failed";
  selectionMode: TerrainSourceProbeMode;
  providerId:
    | typeof USGS_3DEP_TERRAIN_PROVIDER
    | typeof USGS_3DEP_LPC_DSM_TERRAIN_PROVIDER
    | typeof CANADA_HRDEM_TERRAIN_PROVIDER
    | typeof BC_LIDARBC_TERRAIN_PROVIDER
    | null;
  role: TerrainSourcePreviewRole;
  groundModelRole: "bare-earth-dtm" | "surface-dsm";
  resolutionMeters: number | null;
  coverageSourceIds: string[];
  sourceAsset: {
    collection: string;
    id: string;
    assetRole: TerrainSourcePreviewRole;
    href: string;
    type: string;
  } | null;
  tileUrlTemplate: string | null;
  sourceRelease: string | null;
  license: string | null;
  attribution: string | null;
  reasons: string[];
}

function noStoreJson(body: TerrainSourceProbeResponse, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function parseCoordinate(req: NextRequest): {
  coordinate: LonLatCoordinate;
  role: TerrainSourcePreviewRole;
  mode: TerrainSourceProbeMode;
} {
  const { searchParams } = new URL(req.url);
  const latitude = Number(searchParams.get("lat"));
  const longitude = Number(searchParams.get("lon"));
  const role = searchParams.get("role") ?? "dtm";
  const modeParam = searchParams.get("mode") ?? searchParams.get("resolution") ?? "strict-1m";
  const mode: TerrainSourceProbeMode =
    modeParam === "best" || modeParam === "best-available" ? "best-available" : "strict-1m";

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error("Invalid latitude.");
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("Invalid longitude.");
  }
  if (!isTerrainSourcePreviewRole(role)) {
    throw new Error("Invalid terrain role.");
  }

  return { coordinate: { latitude, longitude }, role, mode };
}

function baseResponse(
  role: TerrainSourcePreviewRole,
  mode: TerrainSourceProbeMode = "strict-1m"
): TerrainSourceProbeResponse {
  return {
    schemaVersion: "vmesh-terrain-source-probe-v1",
    runClass: "configured",
    status: "failed",
    selectionMode: mode,
    providerId: null,
    role,
    groundModelRole: role === "dtm" ? "bare-earth-dtm" : "surface-dsm",
    resolutionMeters: null,
    coverageSourceIds: [],
    sourceAsset: null,
    tileUrlTemplate: null,
    sourceRelease: null,
    license: null,
    attribution: null,
    reasons: []
  };
}

function hasFeatureArray(value: unknown): value is { features: unknown[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "features" in value &&
    Array.isArray((value as { features: unknown }).features)
  );
}

async function probeUsgs3dep(
  coordinate: LonLatCoordinate,
  role: TerrainSourcePreviewRole,
  mode: TerrainSourceProbeMode
): Promise<TerrainSourceProbeResponse> {
  const response = baseResponse(role, mode);

  if (role !== "dtm") {
    return {
      ...response,
      status: "blocked",
      providerId: USGS_3DEP_TERRAIN_PROVIDER,
      sourceRelease: "USGS 3DEP DEM source route",
      reasons: [
        "USGS 3DEP DEM route is DTM only; USA DSM display requires a separate LPC/IfSAR surface-model derivation worker."
      ]
    };
  }

  const upstream = await fetch(createUsgs3depOneMeterCoverageQueryUrl(coordinate), {
    headers: { Accept: "application/json" },
    cache: "no-store"
  });

  if (!upstream.ok) {
    return {
      ...response,
      status: "failed",
      providerId: USGS_3DEP_TERRAIN_PROVIDER,
      reasons: [`USGS 3DEP 1m coverage probe failed with HTTP ${upstream.status}.`]
    };
  }

  const data = (await upstream.json()) as unknown;
  const covered = hasFeatureArray(data) && data.features.length > 0;

  if (!covered) {
    const sourceDemUpstream = await fetch(createUsgs3depSourceDemIndexQueryUrl(coordinate), {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });

    if (!sourceDemUpstream.ok) {
      return {
        ...response,
        status: "failed",
        providerId: USGS_3DEP_TERRAIN_PROVIDER,
        reasons: [`USGS 3DEP source DEM probe failed with HTTP ${sourceDemUpstream.status}.`]
      };
    }

    const sourceDemData = (await sourceDemUpstream.json()) as unknown;
    const selectedSourceDem = selectUsgs3depDtmSource(sourceDemData);

    if (selectedSourceDem) {
      return {
        ...response,
        runClass: "live-proof",
        status: "covered",
        providerId: USGS_3DEP_TERRAIN_PROVIDER,
        resolutionMeters: selectedSourceDem.demGsdMeters,
        coverageSourceIds: [selectedSourceDem.sourceId],
        sourceAsset: {
          collection: "USGS 3DEP Source DEM",
          id: selectedSourceDem.sourceId,
          assetRole: "dtm",
          href: selectedSourceDem.sourceDemLink,
          type: "source-index"
        },
        tileUrlTemplate: `/api/terrain/source-preview/${SOURCE_AUTO_TERRAIN_PROVIDER}/dtm/{z}/{x}/{y}`,
        sourceRelease: "USGS 3DEP source DEM index and 3DEPElevation ImageServer",
        license: "Public Domain (U.S. Government Work)",
        attribution: "U.S. Geological Survey 3D Elevation Program",
        reasons: []
      };
    }
  }

  return {
    ...response,
    runClass: "live-proof",
    status: covered ? "covered" : "blocked",
    providerId: USGS_3DEP_TERRAIN_PROVIDER,
    resolutionMeters: covered ? 1 : null,
    coverageSourceIds: covered ? ["usgs-3dep-1m-product-index"] : [],
    tileUrlTemplate: covered
      ? `/api/terrain/source-preview/${SOURCE_AUTO_TERRAIN_PROVIDER}/dtm/{z}/{x}/{y}`
      : null,
    sourceRelease: "USGS 3DEP 1 meter DEM product index and 3DEPElevation ImageServer",
    license: "Public Domain (U.S. Government Work)",
    attribution: "U.S. Geological Survey 3D Elevation Program",
    reasons: covered ? [] : ["USGS 3DEP 1m product index did not cover this coordinate."]
  };
}

async function probeUsgsLpcDsm(
  coordinate: LonLatCoordinate,
  mode: TerrainSourceProbeMode
): Promise<TerrainSourceProbeResponse> {
  const response = baseResponse("dsm", mode);
  const queryUrls = createUsgsLpcDsmSourceIndexQueryUrls(coordinate);
  const failedStatuses: number[] = [];
  let selected: UsgsLpcDsmSourceSelection | null = null;

  for (const queryUrl of queryUrls) {
    const upstream = await fetch(queryUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });

    if (!upstream.ok) {
      failedStatuses.push(upstream.status);
      continue;
    }

    const data = (await upstream.json()) as unknown;
    selected = selectUsgsLpcDsmSource(data);
    if (selected) break;
  }

  if (!selected && failedStatuses.length === queryUrls.length) {
    return {
      ...response,
      status: "failed",
      providerId: USGS_3DEP_LPC_DSM_TERRAIN_PROVIDER,
      reasons: [
        `USGS 3DEP LPC DSM source probe failed with HTTP ${failedStatuses.join(", ")}.`
      ]
    };
  }

  if (!selected) {
    return {
      ...response,
      runClass: "live-proof",
      status: "blocked",
      providerId: USGS_3DEP_LPC_DSM_TERRAIN_PROVIDER,
      sourceRelease: "USGS 3DEP Lidar Point Cloud source index",
      license: "Public Domain (U.S. Government Work); source project notices apply",
      attribution: "U.S. Geological Survey 3D Elevation Program",
      reasons: [
        "USGS 3DEP LPC index did not return a 1m-class source project that meets 3DEP LPC requirements for this coordinate."
      ]
    };
  }

  return {
    ...response,
    runClass: "live-proof",
    status: "source-available",
    providerId: USGS_3DEP_LPC_DSM_TERRAIN_PROVIDER,
    resolutionMeters: selected.demGsdMeters,
    coverageSourceIds: [selected.sourceId],
    sourceAsset: {
      collection: "USGS 3DEP Lidar Point Cloud",
      id: selected.sourceId,
      assetRole: "dsm",
      href: selected.lpcLink,
      type: "source-index"
    },
    tileUrlTemplate: `/api/terrain/source-preview/${SOURCE_AUTO_TERRAIN_PROVIDER}/dsm/{z}/{x}/{y}`,
    sourceRelease: "USGS 3DEP Lidar Point Cloud source index",
    license: "Public Domain (U.S. Government Work); source project notices apply",
    attribution: "U.S. Geological Survey 3D Elevation Program",
    reasons: [
      "DSM source is available. Display is derived per requested tile by the bounded point-cloud worker and remains unproven until that worker emits retained PNG/GeoTIFF evidence."
    ]
  };
}

function responseFromCogProbe({
  role,
  mode,
  providerId,
  probe,
  sourceRelease,
  license,
  attribution,
  tileUrlTemplate
}: {
  role: TerrainSourcePreviewRole;
  mode: TerrainSourceProbeMode;
  providerId: typeof CANADA_HRDEM_TERRAIN_PROVIDER | typeof BC_LIDARBC_TERRAIN_PROVIDER;
  probe: TerrainCogProbeWorkerResult;
  sourceRelease: string;
  license: string;
  attribution: string;
  tileUrlTemplate: string | null;
}): TerrainSourceProbeResponse {
  const response = baseResponse(role, mode);
  const status =
    probe.status === "covered" || probe.status === "blocked" || probe.status === "failed"
      ? probe.status
      : "failed";
  const sourceAsset = probe.sourceAsset
    ? {
        collection: probe.sourceAsset.collection ?? providerId,
        id: probe.sourceAsset.id ?? probe.coverageSourceIds?.[0] ?? providerId,
        assetRole: probe.sourceAsset.assetRole ?? role,
        href: probe.sourceAsset.href ?? "",
        type: probe.sourceAsset.type ?? "unknown"
      }
    : null;

  return {
    ...response,
    runClass: probe.runClass === "live-proof" ? "live-proof" : "configured",
    status,
    providerId,
    resolutionMeters: probe.resolutionMeters ?? null,
    coverageSourceIds: probe.coverageSourceIds ?? [],
    sourceAsset,
    tileUrlTemplate: status === "covered" ? tileUrlTemplate : null,
    sourceRelease,
    license,
    attribution,
    reasons: probe.reasons ?? []
  };
}

async function probeCanadaHrdem(
  coordinate: LonLatCoordinate,
  role: TerrainSourcePreviewRole,
  mode: TerrainSourceProbeMode
): Promise<TerrainSourceProbeResponse> {
  const probe = await probeTerrainCogCoordinate({
    providerId: CANADA_HRDEM_TERRAIN_PROVIDER,
    coordinate,
    role,
    allowTwoMeterFallback: mode === "best-available"
  });

  return responseFromCogProbe({
    role,
    mode,
    providerId: CANADA_HRDEM_TERRAIN_PROVIDER,
    probe,
    sourceRelease: "Canada HRDEM Mosaic STAC plus source COG coverage gate",
    license: "Open Government Licence - Canada",
    attribution: "Natural Resources Canada",
    tileUrlTemplate: `/api/terrain/source-preview/${
      mode === "best-available" ? SOURCE_AUTO_BEST_TERRAIN_PROVIDER : SOURCE_AUTO_TERRAIN_PROVIDER
    }/${role}/{z}/{x}/{y}`
  });
}

async function probeBcLidar(
  coordinate: LonLatCoordinate,
  role: TerrainSourcePreviewRole,
  mode: TerrainSourceProbeMode
): Promise<TerrainSourceProbeResponse> {
  const response = baseResponse(role, mode);
  if (!isBritishColumbiaTerrainSourceCoordinate(coordinate)) {
    return {
      ...response,
      status: "outside-source-area",
      providerId: BC_LIDARBC_TERRAIN_PROVIDER,
      reasons: ["Coordinate is outside the broad British Columbia LidarBC source area."]
    };
  }

  const probe = await probeTerrainCogCoordinate({
    providerId: BC_LIDARBC_TERRAIN_PROVIDER,
    coordinate,
    role
  });
  const summary = createBcLidarSourceSummary(role);

  return responseFromCogProbe({
    role,
    mode,
    providerId: BC_LIDARBC_TERRAIN_PROVIDER,
    probe,
    sourceRelease: summary.sourceRelease,
    license: summary.license,
    attribution: summary.attribution,
    tileUrlTemplate: `/api/terrain/source-preview/${BC_LIDARBC_TERRAIN_PROVIDER}/${role}/{z}/{x}/{y}`
  });
}

export async function GET(req: NextRequest) {
  let coordinate: LonLatCoordinate;
  let role: TerrainSourcePreviewRole = "dtm";
  let mode: TerrainSourceProbeMode = "strict-1m";

  try {
    ({ coordinate, role, mode } = parseCoordinate(req));
  } catch (error) {
    return noStoreJson(
      {
        ...baseResponse("dtm"),
        status: "failed",
        reasons: [error instanceof Error ? error.message : "Invalid terrain source probe request."]
      },
      400
    );
  }

  try {
    const lidarBcProbe = isBritishColumbiaTerrainSourceCoordinate(coordinate)
      ? await probeBcLidar(coordinate, role, mode)
      : null;
    if (lidarBcProbe?.status === "covered") {
      return noStoreJson(lidarBcProbe);
    }

    if (isUsaTerrainSourceCoordinate(coordinate)) {
      const usgsProbe =
        role === "dsm"
          ? await probeUsgsLpcDsm(coordinate, mode)
          : await probeUsgs3dep(coordinate, role, mode);
      if (
        usgsProbe.status === "covered" ||
        usgsProbe.status === "source-available" ||
        !isCanadaTerrainSourceCoordinate(coordinate)
      ) {
        return noStoreJson(usgsProbe);
      }

      const canadaProbe = await probeCanadaHrdem(coordinate, role, mode);
      return noStoreJson(
        canadaProbe.status === "covered"
          ? canadaProbe
          : {
              ...canadaProbe,
              reasons: [
                ...(lidarBcProbe?.reasons ?? []),
                ...usgsProbe.reasons,
                ...canadaProbe.reasons
              ]
            }
      );
    }

    if (isCanadaTerrainSourceCoordinate(coordinate)) {
      const canadaProbe = await probeCanadaHrdem(coordinate, role, mode);
      return noStoreJson(
        canadaProbe.status === "covered"
          ? canadaProbe
          : {
              ...canadaProbe,
              reasons: [...(lidarBcProbe?.reasons ?? []), ...canadaProbe.reasons]
            }
      );
    }

    return noStoreJson({
      ...baseResponse(role, mode),
      status: "outside-source-area",
      reasons: ["Coordinate is outside the USA/Canada DTM/DSM source preview area."]
    });
  } catch (error) {
    return noStoreJson(
      {
        ...baseResponse(role, mode),
        status: "failed",
        reasons: [error instanceof Error ? error.message : "Terrain source probe failed."]
      },
      502
    );
  }
}

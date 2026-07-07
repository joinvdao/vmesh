import { NextRequest, NextResponse } from "next/server";

import {
  ABUNDANCE_SOURCE_HANDOFF_DEFAULT_EDGE_METERS,
  ABUNDANCE_SOURCE_HANDOFF_DEFAULT_GRID_SIZE,
  abundanceSourceSliceBoundsFromCentroid,
  createLiveKamloopsMunicipalDemCoveragePreflight,
  loadKamloopsOperatorTerrainManifest,
  sanitizeConsumerAppId,
  sanitizeTextLabel
} from "@/lib/geospatialPackage";

export const dynamic = "force-dynamic";

const SUGGESTION_PROBE_TIMEOUT_MS = 3_000;
const SUGGESTION_PROBE_LIMIT = 24;

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function finiteNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function boundedNumber(value: unknown, min: number, max: number): number | undefined {
  const parsed = finiteNumber(value);
  if (parsed === undefined || parsed < min || parsed > max) return undefined;
  return parsed;
}

function parseConsumer(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) return "building-abundance";
  if (value.trim().toLowerCase() === "abundance") return "building-abundance";
  return sanitizeConsumerAppId(value);
}

function parseBoolean(value: unknown) {
  return value === true || value === "true" || value === "1" || value === "yes";
}

function offsetCoordinate({
  latitude,
  longitude,
  eastMeters,
  northMeters
}: {
  latitude: number;
  longitude: number;
  eastMeters: number;
  northMeters: number;
}) {
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng = Math.max(
    12_000,
    metersPerDegreeLat * Math.cos((latitude * Math.PI) / 180)
  );
  return {
    latitude: latitude + northMeters / metersPerDegreeLat,
    longitude: longitude + eastMeters / metersPerDegreeLng
  };
}

function isKamloopsMunicipalCoverageCoordinate({
  latitude,
  longitude
}: {
  latitude: number;
  longitude: number;
}) {
  return latitude >= 50.45 && latitude <= 50.85 && longitude >= -120.75 && longitude <= -120.0;
}

function searchOffsets(stepMeters: number, maxMeters: number) {
  const offsets: Array<{ eastMeters: number; northMeters: number; distanceMeters: number }> = [];
  for (let radius = stepMeters; radius <= maxMeters; radius += stepMeters) {
    for (const [eastUnit, northUnit] of [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
      [1, 1],
      [1, -1],
      [-1, -1],
      [-1, 1]
    ]) {
      const eastMeters = eastUnit * radius;
      const northMeters = northUnit * radius;
      offsets.push({
        eastMeters,
        northMeters,
        distanceMeters: Math.round(Math.hypot(eastMeters, northMeters))
      });
    }
  }
  return offsets.sort(
    (left, right) =>
      left.distanceMeters - right.distanceMeters ||
      left.northMeters - right.northMeters ||
      left.eastMeters - right.eastMeters
  );
}

async function goldenQualitySuggestion({
  latitude,
  longitude,
  edgeMeters,
  gridSize,
  consumerAppId,
  label,
  stepMeters,
  maxMeters,
  limit,
  probeLimit,
  probeTimeoutMs,
  kamloopsOperatorTerrainManifest
}: {
  latitude: number;
  longitude: number;
  edgeMeters: number;
  gridSize: number;
  consumerAppId: string;
  label: string;
  stepMeters: number;
  maxMeters: number;
  limit: number;
  probeLimit: number;
  probeTimeoutMs: number;
  kamloopsOperatorTerrainManifest?: unknown;
}) {
  const candidates = [];
  let probedCandidateCount = 0;
  for (const offset of searchOffsets(stepMeters, maxMeters)) {
    if (probedCandidateCount >= probeLimit) break;
    const candidate = offsetCoordinate({
      latitude,
      longitude,
      eastMeters: offset.eastMeters,
      northMeters: offset.northMeters
    });
    if (!isKamloopsMunicipalCoverageCoordinate(candidate)) continue;
    probedCandidateCount += 1;

    const preflight = await createLiveKamloopsMunicipalDemCoveragePreflight(
      {
        request: {
          aoi: {
            bounds: abundanceSourceSliceBoundsFromCentroid({
              centroid: candidate,
              edgeMeters
            }),
            label
          },
          consumerAppId,
          layers: ["terrain"],
          preferredSourceIds: ["kamloops-local-lidar-dtm-1m"],
          offline: true
        }
      },
      {
        env: process.env,
        kamloopsOperatorTerrainManifest,
        kamloopsMunicipalDemProbeTimeoutMs: probeTimeoutMs
      }
    );
    if (!preflight.goldenQualityTerrainCandidate) continue;

    candidates.push({
      status: "available",
      centerDisclosure: "relative-offset-only",
      offsetMeters: {
        east: offset.eastMeters,
        north: offset.northMeters
      },
      distanceMeters: offset.distanceMeters,
      edgeMeters,
      gridSize,
      maxSearchMeters: maxMeters,
      stepMeters,
      probeLimit,
      probeTimeoutMs,
      probedCandidateCount,
      selectedSourceIds: preflight.selectedSourceIds,
      rasterBacked: preflight.rasterBacked,
      rasterZipVerified: preflight.rasterZipVerified,
      goldenQualityTerrainCandidate: preflight.goldenQualityTerrainCandidate,
      downloadableCellCount: preflight.cells.downloadable.length,
      nonDownloadableCellCount: preflight.cells.nonDownloadable.length,
      warnings: [
        "Suggested frame is a verified municipal raster-backed golden terrain candidate but shifts the 3 km slice center; keep the user parcel boundary as an overlay."
      ]
    });
    if (candidates.length >= limit) break;
  }

  if (candidates.length > 0) {
    return {
      ...candidates[0],
      candidateCount: candidates.length,
      candidates,
      maxSearchMeters: maxMeters,
      stepMeters,
      probeLimit,
      probeTimeoutMs,
      probedCandidateCount,
      warnings: [
        ...candidates[0].warnings,
        "Candidate frames prove public municipal raster refs only; Abundance must still materialize and QA the DEM mosaic before runtime terrain readiness."
      ]
    };
  }

  return {
    status: "unavailable",
    centerDisclosure: "relative-offset-only",
    maxSearchMeters: maxMeters,
    stepMeters,
    probeLimit,
    probeTimeoutMs,
    probedCandidateCount,
    candidateCount: 0,
    candidates: [],
    warnings: [
      "No verified municipal raster-backed golden terrain candidate frame was found within the configured relative-offset search radius."
    ]
  };
}

export async function GET(req: NextRequest) {
  const latitude = boundedNumber(req.nextUrl.searchParams.get("lat"), -90, 90);
  const longitude = boundedNumber(req.nextUrl.searchParams.get("lng"), -180, 180);
  if (latitude === undefined || longitude === undefined) {
    return jsonResponse({ error: "Kamloops terrain preflight requires lat and lng." }, 400);
  }

  const edgeMeters =
    boundedNumber(req.nextUrl.searchParams.get("edgeMeters"), 512, 10000) ??
    ABUNDANCE_SOURCE_HANDOFF_DEFAULT_EDGE_METERS;
  const gridSize =
    boundedNumber(req.nextUrl.searchParams.get("gridSize"), 17, 2049) ??
    ABUNDANCE_SOURCE_HANDOFF_DEFAULT_GRID_SIZE;
  const label = sanitizeTextLabel(
    req.nextUrl.searchParams.get("label") ?? "Kamloops terrain preflight"
  );
  const consumerAppId = parseConsumer(
    req.nextUrl.searchParams.get("consumer") ?? req.nextUrl.searchParams.get("consumerAppId")
  );
  const bounds = abundanceSourceSliceBoundsFromCentroid({
    centroid: { latitude, longitude },
    edgeMeters
  });
  const preflightProbeTimeoutMs = Math.floor(
    boundedNumber(req.nextUrl.searchParams.get("probeTimeoutMs"), 500, 15_000) ?? 0
  );
  const operatorTerrainManifest = await loadKamloopsOperatorTerrainManifest();

  const preflight = await createLiveKamloopsMunicipalDemCoveragePreflight(
    {
      request: {
        aoi: { bounds, label },
        consumerAppId,
        layers: ["terrain"],
        preferredSourceIds: ["kamloops-local-lidar-dtm-1m"],
        offline: true
      }
    },
    {
      env: process.env,
      kamloopsOperatorTerrainManifest: operatorTerrainManifest.manifest,
      ...(preflightProbeTimeoutMs > 0
        ? { kamloopsMunicipalDemProbeTimeoutMs: preflightProbeTimeoutMs }
        : {})
    }
  );

  const shouldSuggest =
    parseBoolean(req.nextUrl.searchParams.get("suggestion")) &&
    !preflight.goldenQualityTerrainCandidate;
  const suggestedGoldenQualityFrame = shouldSuggest
    ? await goldenQualitySuggestion({
        latitude,
        longitude,
        edgeMeters,
        gridSize,
        consumerAppId,
        label,
        stepMeters:
          boundedNumber(req.nextUrl.searchParams.get("suggestionStepMeters"), 100, 1000) ?? 250,
        maxMeters:
          boundedNumber(req.nextUrl.searchParams.get("suggestionMaxMeters"), 250, 5000) ?? 2500,
        limit:
          Math.floor(boundedNumber(req.nextUrl.searchParams.get("suggestionLimit"), 1, 16) ?? 6) ||
          1,
        probeLimit:
          Math.floor(
            boundedNumber(req.nextUrl.searchParams.get("suggestionProbeLimit"), 1, 96) ??
              SUGGESTION_PROBE_LIMIT
          ) || SUGGESTION_PROBE_LIMIT,
        probeTimeoutMs:
          Math.floor(
            boundedNumber(
              req.nextUrl.searchParams.get("suggestionProbeTimeoutMs"),
              500,
              SUGGESTION_PROBE_TIMEOUT_MS
            ) ?? SUGGESTION_PROBE_TIMEOUT_MS
          ) || SUGGESTION_PROBE_TIMEOUT_MS,
        kamloopsOperatorTerrainManifest: operatorTerrainManifest.manifest
      })
    : null;

  return jsonResponse({
    ...preflight,
    request: {
      edgeMeters,
      gridSize
    },
    frame: {
      role: "source-slice-frame",
      shape: "square",
      edgeMeters,
      gridSize,
      parcelBoundaryRole: "overlay-only"
    },
    operatorTerrainManifest: operatorTerrainManifest.evidence,
    suggestedGoldenQualityFrame,
    suggestedSourceBackedFrame: suggestedGoldenQualityFrame
  });
}

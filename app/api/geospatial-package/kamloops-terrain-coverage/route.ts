import { NextRequest, NextResponse } from "next/server";

import {
  ABUNDANCE_SOURCE_HANDOFF_DEFAULT_EDGE_METERS,
  ABUNDANCE_SOURCE_HANDOFF_DEFAULT_GRID_SIZE,
  abundanceSourceSliceBoundsFromCentroid,
  createLiveKamloopsMunicipalDemCoveragePreflight,
  sanitizeConsumerAppId,
  sanitizeTextLabel
} from "@/lib/geospatialPackage";

export const dynamic = "force-dynamic";

const MAX_BATCH_SAMPLES = 64;

type BatchSample = {
  id?: unknown;
  lat?: unknown;
  lng?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  label?: unknown;
};

type BatchBody = {
  samples?: unknown;
  edgeMeters?: unknown;
  gridSize?: unknown;
  consumer?: unknown;
  consumerAppId?: unknown;
};

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

function safeSampleId(value: unknown, index: number) {
  if (typeof value !== "string") return `sample-${index + 1}`;
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._=-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return cleaned || `sample-${index + 1}`;
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

async function classifySample({
  sample,
  index,
  edgeMeters,
  gridSize,
  consumerAppId
}: {
  sample: BatchSample;
  index: number;
  edgeMeters: number;
  gridSize: number;
  consumerAppId: string;
}) {
  const id = safeSampleId(sample.id, index);
  const latitude = boundedNumber(sample.lat ?? sample.latitude, -90, 90);
  const longitude = boundedNumber(sample.lng ?? sample.longitude, -180, 180);
  if (latitude === undefined || longitude === undefined) {
    return {
      id,
      status: "invalid-coordinate",
      sourceBacked: false,
      downloadableCellCount: 0,
      nonDownloadableCellCount: 0,
      selectedSourceIds: [],
      warnings: ["Sample requires finite lat/lng or latitude/longitude values."],
      blockedReasons: ["Invalid sample coordinate."]
    };
  }

  if (!isKamloopsMunicipalCoverageCoordinate({ latitude, longitude })) {
    return {
      id,
      status: "outside-kamloops-municipal-index",
      sourceBacked: false,
      downloadableCellCount: 0,
      nonDownloadableCellCount: 0,
      selectedSourceIds: [],
      warnings: ["Sample is outside the Kamloops municipal terrain preflight envelope."],
      blockedReasons: ["Kamloops municipal DEM Grid coverage is not applicable to this sample."]
    };
  }

  const bounds = abundanceSourceSliceBoundsFromCentroid({
    centroid: { latitude, longitude },
    edgeMeters
  });
  const preflight = await createLiveKamloopsMunicipalDemCoveragePreflight(
    {
      request: {
        aoi: {
          bounds,
          label: sanitizeTextLabel(
            typeof sample.label === "string" ? sample.label : "Kamloops coverage sample"
          )
        },
        consumerAppId,
        layers: ["terrain"],
        preferredSourceIds: ["kamloops-local-lidar-dtm-1m"],
        offline: true
      }
    },
    { env: process.env }
  );

  return {
    id,
    status: preflight.status,
    sourceBacked: preflight.sourceBacked,
    downloadableCellCount: preflight.cells.downloadable.length,
    nonDownloadableCellCount: preflight.cells.nonDownloadable.length,
    totalCellCount: preflight.cells.total,
    selectedSourceIds: preflight.selectedSourceIds,
    warnings: preflight.warnings,
    blockedReasons: preflight.blockedReasons
  };
}

export async function POST(req: NextRequest) {
  if (!(req.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    return jsonResponse({ error: "Kamloops terrain coverage requests must use JSON." }, 415);
  }

  let body: BatchBody;
  try {
    const parsed = (await req.json()) as unknown;
    if (!isRecord(parsed)) throw new Error("invalid-body");
    body = parsed;
  } catch {
    return jsonResponse({ error: "Invalid JSON coverage request." }, 400);
  }

  if (!Array.isArray(body.samples)) {
    return jsonResponse({ error: "Coverage request requires a samples array." }, 400);
  }
  if (body.samples.length === 0 || body.samples.length > MAX_BATCH_SAMPLES) {
    return jsonResponse(
      { error: `Coverage request samples length must be between 1 and ${MAX_BATCH_SAMPLES}.` },
      400
    );
  }

  const edgeMeters =
    boundedNumber(body.edgeMeters, 512, 10000) ?? ABUNDANCE_SOURCE_HANDOFF_DEFAULT_EDGE_METERS;
  const gridSize =
    boundedNumber(body.gridSize, 17, 2049) ?? ABUNDANCE_SOURCE_HANDOFF_DEFAULT_GRID_SIZE;
  const consumerAppId = parseConsumer(body.consumer ?? body.consumerAppId);
  const samples = await Promise.all(
    body.samples.map((sample, index) =>
      classifySample({
        sample: isRecord(sample) ? sample : {},
        index,
        edgeMeters,
        gridSize,
        consumerAppId
      })
    )
  );
  const sourceBackedCount = samples.filter((sample) => sample.sourceBacked).length;
  const partialCount = samples.filter((sample) => sample.status === "partial").length;
  const blockedCount = samples.length - sourceBackedCount - partialCount;

  return jsonResponse({
    schemaVersion: "vmesh-kamloops-municipal-dem-coverage-batch-v1",
    request: {
      edgeMeters,
      gridSize,
      sampleCount: samples.length
    },
    frame: {
      role: "source-slice-frame",
      shape: "square",
      edgeMeters,
      gridSize,
      parcelBoundaryRole: "overlay-only"
    },
    privacy: {
      exactCoordinatesEchoed: false,
      callerOwnedSampleIdsOnly: true
    },
    summary: {
      sourceBackedCount,
      partialCount,
      blockedCount
    },
    samples
  });
}

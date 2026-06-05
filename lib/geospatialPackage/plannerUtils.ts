import { cellToLatLng, isValidCell, latLngToCell } from "h3-js";

import type {
  GeospatialPackagePlan,
  NormalizedPackageAoi,
  PackageAoiDisclosure,
  PackageAoiInput,
  PackageLayerId
} from "@/lib/geospatialPackage/types";

const DEFAULT_RESOLUTION = 5;
const SECRET_QUERY_PATTERN = /(token=|access_token|api_key|apikey|signature=|sig=|secret=)/i;

export function stableId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function clampResolution(value: number | undefined): number {
  if (!Number.isFinite(value)) return DEFAULT_RESOLUTION;
  return Math.max(0, Math.min(8, Math.floor(value as number)));
}

function boundsFromCentroid(centroid: {
  latitude: number;
  longitude: number;
}): [number, number, number, number] {
  return [
    Number((centroid.longitude - 0.15).toFixed(6)),
    Number((centroid.latitude - 0.15).toFixed(6)),
    Number((centroid.longitude + 0.15).toFixed(6)),
    Number((centroid.latitude + 0.15).toFixed(6))
  ];
}

function centroidFromH3(h3Id: string) {
  try {
    if (!isValidCell(h3Id)) return null;
    const [latitude, longitude] = cellToLatLng(h3Id);
    return { latitude, longitude };
  } catch {
    return null;
  }
}

export function normalizePackageAoi(
  input: PackageAoiInput,
  resolution = DEFAULT_RESOLUTION
): NormalizedPackageAoi {
  const requestedResolution = clampResolution(resolution);
  const centroid = input.centroid ??
    (input.h3Id ? centroidFromH3(input.h3Id) : null) ?? {
      latitude: 38.7223,
      longitude: -9.1393
    };
  const bounds = input.bounds ?? boundsFromCentroid(centroid);
  const h3Id =
    input.h3Id && isValidCell(input.h3Id)
      ? input.h3Id
      : latLngToCell(centroid.latitude, centroid.longitude, requestedResolution);

  return {
    h3Id,
    centroid,
    bounds,
    label: input.label ?? `H3 ${h3Id}`,
    resolution: requestedResolution
  };
}

export function describePackageAoiDisclosure(input: PackageAoiInput): PackageAoiDisclosure {
  if (input.centroid) return "exact-centroid";
  if (input.h3Id && isValidCell(input.h3Id)) return "h3-cell";
  if (input.bounds) return "bounds";
  return "fallback-sample";
}

export function createPackageCacheKey({
  packageId,
  layerId,
  sourceId
}: {
  packageId: string;
  layerId: PackageLayerId;
  sourceId: string;
}): string {
  return `${packageId}/${stableId(layerId)}/${stableId(sourceId)}`;
}

export function containsSecretLikeValue(value: string): boolean {
  if (SECRET_QUERY_PATTERN.test(value)) return true;

  try {
    const url = new URL(value);
    return url.username.length > 0 || url.password.length > 0;
  } catch {
    return false;
  }
}

export function sanitizePublicUrl(value: string): string {
  if (!value) return value;
  if (containsSecretLikeValue(value)) return "redacted://secret-bearing-url";

  try {
    const url = new URL(value);
    const redactedKeys = ["token", "access_token", "api_key", "apikey", "signature", "secret"];

    redactedKeys.forEach((key) => {
      if (url.searchParams.has(key)) {
        url.searchParams.set(key, "redacted");
      }
    });

    return url.toString();
  } catch {
    return value;
  }
}

export function validateGeospatialPackagePlan(plan: GeospatialPackagePlan): boolean {
  const hasSelectedSourceForEveryLayer = plan.requestedLayers.every(
    (layerId) => plan.selectedSources[layerId] !== null
  );
  const noSecretUrls = plan.artifacts.every(
    (artifact) => artifact.url === null || !containsSecretLikeValue(artifact.url)
  );
  const provenanceComplete = plan.artifacts.every(
    (artifact) =>
      artifact.provenance.providerId.length > 0 &&
      artifact.provenance.license.length > 0 &&
      artifact.provenance.attribution.length > 0
  );

  return (
    plan.schemaVersion === "vmesh-geospatial-package-plan-v1" &&
    plan.id.length > 0 &&
    plan.aoi.h3Id.length > 0 &&
    plan.requestedLayers.length > 0 &&
    hasSelectedSourceForEveryLayer &&
    noSecretUrls &&
    provenanceComplete
  );
}

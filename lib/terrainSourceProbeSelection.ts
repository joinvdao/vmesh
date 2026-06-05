import {
  MAPTERHORN_PROVIDER_ID,
  SOURCE_AUTO_BEST_DTM_PROVIDER_ID,
  SOURCE_AUTO_DSM_PROVIDER_ID,
  SOURCE_AUTO_DTM_PROVIDER_ID
} from "@/lib/terrainSources";
import type { LonLatCoordinate, TerrainSourcePreviewRole } from "@/lib/terrainSourcePreview";
import type { TerrainProviderStatus } from "@/lib/vmeshTypes";

export type TerrainSourceProbeMode = "strict-1m" | "best-available";

export interface TerrainSourceProbeResult {
  schemaVersion: "vmesh-terrain-source-probe-v1";
  runClass: "live-proof" | "configured";
  status: "covered" | "source-available" | "blocked" | "outside-source-area" | "failed";
  selectionMode: TerrainSourceProbeMode;
  providerId: string | null;
  role: TerrainSourcePreviewRole;
  groundModelRole: "bare-earth-dtm" | "surface-dsm";
  resolutionMeters: number | null;
  coverageSourceIds: string[];
  tileUrlTemplate: string | null;
  sourceRelease: string | null;
  reasons: string[];
}

export interface TerrainProviderProbeDecision {
  providerId: string;
  terrainStatus: TerrainProviderStatus;
  strictOneMeterProven: boolean;
  resolutionMeters: number | null;
  message: string;
}

export interface TerrainSourceTileReadiness {
  status: "ready" | "transparent" | "failed";
  providerId: string | null;
  role: TerrainSourcePreviewRole | null;
  renderMode: string | null;
  reason: string | null;
  contentType: string | null;
}

function isOneMeterOrBetter(resolutionMeters: number | null): resolutionMeters is number {
  return resolutionMeters !== null && resolutionMeters > 0 && resolutionMeters <= 1;
}

function clampTileCoordinate(value: number, max: number): number {
  return Math.min(max, Math.max(0, value));
}

export function coordinateToWebMercatorTile({
  coordinate,
  zoom
}: {
  coordinate: LonLatCoordinate;
  zoom: number;
}): { z: number; x: number; y: number } {
  const z = Math.max(0, Math.min(22, Math.floor(zoom)));
  const n = 2 ** z;
  const latitude = Math.max(-85.05112878, Math.min(85.05112878, coordinate.latitude));
  const latitudeRadians = (latitude * Math.PI) / 180;
  const x = Math.floor(((coordinate.longitude + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latitudeRadians) + 1 / Math.cos(latitudeRadians)) / Math.PI) / 2) * n
  );

  return {
    z,
    x: clampTileCoordinate(x, n - 1),
    y: clampTileCoordinate(y, n - 1)
  };
}

export function createTerrainSourceTileUrlFromTemplate({
  template,
  coordinate,
  zoom
}: {
  template: string;
  coordinate: LonLatCoordinate;
  zoom: number;
}): string {
  const tile = coordinateToWebMercatorTile({ coordinate, zoom });
  return template
    .replace("{z}", String(tile.z))
    .replace("{x}", String(tile.x))
    .replace("{y}", String(tile.y));
}

export async function fetchTerrainSourceTileReadiness({
  template,
  coordinate,
  zoom,
  signal
}: {
  template: string;
  coordinate: LonLatCoordinate;
  zoom: number;
  signal?: AbortSignal;
}): Promise<TerrainSourceTileReadiness> {
  const response = await fetch(
    createTerrainSourceTileUrlFromTemplate({ template, coordinate, zoom }),
    {
      headers: { Accept: "image/png,image/*" },
      signal
    }
  );
  const contentType = response.headers.get("content-type");
  const providerId = response.headers.get("x-vmesh-terrain-provider");
  const role = response.headers.get("x-vmesh-terrain-role") as TerrainSourcePreviewRole | null;
  const renderMode = response.headers.get("x-vmesh-terrain-render-mode");
  const sourceStatus = response.headers.get("x-vmesh-terrain-source-status");
  const reason = response.headers.get("x-vmesh-terrain-source-reason");

  if (!response.ok) {
    return {
      status: "failed",
      providerId,
      role,
      renderMode,
      reason: reason ?? `Terrain source tile returned HTTP ${response.status}.`,
      contentType
    };
  }

  if (sourceStatus === "transparent") {
    return {
      status: "transparent",
      providerId,
      role,
      renderMode,
      reason,
      contentType
    };
  }

  return {
    status: contentType?.startsWith("image/") && providerId ? "ready" : "failed",
    providerId,
    role,
    renderMode,
    reason,
    contentType
  };
}

export function createTerrainSourceProbeUrl({
  coordinate,
  role,
  mode
}: {
  coordinate: LonLatCoordinate;
  role: TerrainSourcePreviewRole;
  mode: TerrainSourceProbeMode;
}): string {
  const params = new URLSearchParams({
    lat: String(coordinate.latitude),
    lon: String(coordinate.longitude),
    role
  });
  if (mode === "best-available") params.set("mode", "best");
  return `/api/terrain/source-preview/probe?${params.toString()}`;
}

export async function fetchTerrainSourceProbe({
  coordinate,
  role,
  mode,
  signal
}: {
  coordinate: LonLatCoordinate;
  role: TerrainSourcePreviewRole;
  mode: TerrainSourceProbeMode;
  signal?: AbortSignal;
}): Promise<TerrainSourceProbeResult> {
  const response = await fetch(createTerrainSourceProbeUrl({ coordinate, role, mode }), {
    headers: { Accept: "application/json" },
    signal
  });
  if (!response.ok) {
    throw new Error(`Terrain source probe failed with HTTP ${response.status}.`);
  }
  return (await response.json()) as TerrainSourceProbeResult;
}

export function chooseDtmProviderFromTerrainSourceProbes({
  strictProbe,
  bestProbe
}: {
  strictProbe: TerrainSourceProbeResult;
  bestProbe?: TerrainSourceProbeResult | null;
}): TerrainProviderProbeDecision {
  if (
    strictProbe.status === "covered" &&
    strictProbe.role === "dtm" &&
    isOneMeterOrBetter(strictProbe.resolutionMeters) &&
    strictProbe.tileUrlTemplate
  ) {
    return {
      providerId: SOURCE_AUTO_DTM_PROVIDER_ID,
      terrainStatus: "loading",
      strictOneMeterProven: true,
      resolutionMeters: strictProbe.resolutionMeters,
      message: `Official 1m-class DTM source coverage proven via ${strictProbe.providerId}; loading source preview`
    };
  }

  if (bestProbe?.status === "covered" && bestProbe.role === "dtm" && bestProbe.tileUrlTemplate) {
    const isStrictEquivalent = isOneMeterOrBetter(bestProbe.resolutionMeters);
    return {
      providerId: isStrictEquivalent
        ? SOURCE_AUTO_DTM_PROVIDER_ID
        : SOURCE_AUTO_BEST_DTM_PROVIDER_ID,
      terrainStatus: isStrictEquivalent ? "loading" : "fallback",
      strictOneMeterProven: isStrictEquivalent,
      resolutionMeters: bestProbe.resolutionMeters,
      message: isStrictEquivalent
        ? `Official 1m-class DTM source coverage proven via ${bestProbe.providerId}; loading source preview`
        : `No proven 1m DTM at this coordinate; loading explicit ${bestProbe.resolutionMeters}m best-available official DTM preview`
    };
  }

  const reason =
    strictProbe.reasons[0] ?? "No proven official 1m DTM source covers this coordinate.";
  return {
    providerId: MAPTERHORN_PROVIDER_ID,
    terrainStatus: strictProbe.status === "failed" ? "error" : "fallback",
    strictOneMeterProven: false,
    resolutionMeters: strictProbe.resolutionMeters,
    message: `No strict 1m DTM source preview available here; using visual terrain fallback. ${reason}`
  };
}

export function chooseDsmProviderFromTerrainSourceProbe({
  probe
}: {
  probe: TerrainSourceProbeResult;
}): TerrainProviderProbeDecision {
  if (
    (probe.status === "covered" || probe.status === "source-available") &&
    probe.role === "dsm" &&
    isOneMeterOrBetter(probe.resolutionMeters) &&
    probe.tileUrlTemplate
  ) {
    return {
      providerId: SOURCE_AUTO_DSM_PROVIDER_ID,
      terrainStatus: "loading",
      strictOneMeterProven: probe.status === "covered",
      resolutionMeters: probe.resolutionMeters,
      message:
        probe.status === "covered"
          ? `Official 1m-class DSM source coverage proven via ${probe.providerId}; loading surface preview`
          : `Official 1m-class DSM source is available via ${probe.providerId}; display depends on the bounded DSM worker rendering this tile`
    };
  }

  const reason = probe.reasons[0] ?? "No proven official 1m DSM source covers this coordinate.";
  return {
    providerId: MAPTERHORN_PROVIDER_ID,
    terrainStatus: probe.status === "failed" ? "error" : "fallback",
    strictOneMeterProven: false,
    resolutionMeters: probe.resolutionMeters,
    message: `No strict 1m DSM source preview available here; using visual terrain fallback. ${reason}`
  };
}

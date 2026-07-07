import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import {
  BC_LIDARBC_TERRAIN_PROVIDER,
  CANADA_HRDEM_TERRAIN_PROVIDER,
  type LonLatCoordinate,
  type TerrainSourcePreviewRole
} from "@/lib/terrainSourcePreview";

const execFileAsync = promisify(execFile);

type CogProbeProviderId = typeof CANADA_HRDEM_TERRAIN_PROVIDER | typeof BC_LIDARBC_TERRAIN_PROVIDER;

export interface TerrainCogProbeWorkerResult {
  schemaVersion?: string;
  generatedAt?: string;
  runClass?: "live-proof" | "configured";
  providerId?: CogProbeProviderId;
  role?: TerrainSourcePreviewRole;
  groundModelRole?: "bare-earth-dtm" | "surface-dsm";
  status?: "covered" | "blocked" | "failed";
  resolutionMeters?: number | null;
  coverageSourceIds?: string[];
  sourceAsset?: {
    collection?: string;
    id?: string;
    assetRole?: TerrainSourcePreviewRole;
    href?: string;
    type?: string;
  } | null;
  qa?: unknown;
  renderedArtifact?: unknown;
  reasons?: string[];
}

export interface ProbeTerrainCogCoordinateOptions {
  providerId: CogProbeProviderId;
  coordinate: LonLatCoordinate;
  role: TerrainSourcePreviewRole;
  allowTwoMeterFallback?: boolean;
  windowPixels?: number;
  cacheRoot?: string;
  pythonCommand?: string;
  timeoutMs?: number;
}

function defaultCacheRoot(): string {
  return path.join(/* turbopackIgnore: true */ os.tmpdir(), "vmesh-terrain-source-preview");
}

function stableProbePath({
  providerId,
  coordinate,
  role,
  allowTwoMeterFallback,
  cacheRoot
}: Required<
  Pick<
    ProbeTerrainCogCoordinateOptions,
    "providerId" | "coordinate" | "role" | "allowTwoMeterFallback" | "cacheRoot"
  >
>): string {
  const hash = createHash("sha256")
    .update(
      JSON.stringify({
        providerId,
        role,
        latitude: Number(coordinate.latitude.toFixed(6)),
        longitude: Number(coordinate.longitude.toFixed(6)),
        allowTwoMeterFallback
      })
    )
    .digest("hex")
    .slice(0, 20);

  return path.join(
    /* turbopackIgnore: true */
    cacheRoot,
    "coordinate-probe",
    providerId,
    role,
    `${hash}.json`
  );
}

async function readProbeJson(jsonPath: string): Promise<TerrainCogProbeWorkerResult | null> {
  try {
    return JSON.parse(await readFile(jsonPath, "utf8")) as TerrainCogProbeWorkerResult;
  } catch {
    return null;
  }
}

export async function probeTerrainCogCoordinate({
  providerId,
  coordinate,
  role,
  allowTwoMeterFallback = false,
  windowPixels = 64,
  cacheRoot = defaultCacheRoot(),
  pythonCommand = process.env.PYTHON ?? "python",
  timeoutMs
}: ProbeTerrainCogCoordinateOptions): Promise<TerrainCogProbeWorkerResult> {
  const jsonPath = stableProbePath({
    providerId,
    coordinate,
    role,
    allowTwoMeterFallback,
    cacheRoot
  });
  await mkdir(path.dirname(jsonPath), { recursive: true });

  const scriptPath = path.join(
    /* turbopackIgnore: true */
    process.cwd(),
    "scripts",
    "terrain-cog-probe.py"
  );
  const args = [
    scriptPath,
    "--provider",
    providerId,
    "--lat",
    String(coordinate.latitude),
    "--lon",
    String(coordinate.longitude),
    "--role",
    role,
    "--window",
    String(windowPixels),
    "--label",
    `${providerId} ${role.toUpperCase()} source-preview coordinate probe`,
    "--output",
    jsonPath
  ];

  if (allowTwoMeterFallback) {
    args.push("--allow-2m-fallback");
  }

  try {
    await execFileAsync(pythonCommand, args, {
      encoding: "utf8",
      timeout: timeoutMs ?? Number(process.env.VMESH_TERRAIN_COG_PROBE_TIMEOUT_MS ?? 120_000),
      maxBuffer: 4 * 1024 * 1024,
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8"
      }
    });
  } catch {
    const parsed = await readProbeJson(jsonPath);
    if (parsed) return parsed;

    return {
      runClass: "live-proof",
      providerId,
      role,
      groundModelRole: role === "dtm" ? "bare-earth-dtm" : "surface-dsm",
      status: "failed",
      resolutionMeters: null,
      coverageSourceIds: [],
      sourceAsset: null,
      renderedArtifact: null,
      reasons: [
        `${providerId} ${role.toUpperCase()} COG coordinate probe failed before writing JSON.`
      ]
    };
  }

  return (
    (await readProbeJson(jsonPath)) ?? {
      runClass: "live-proof",
      providerId,
      role,
      groundModelRole: role === "dtm" ? "bare-earth-dtm" : "surface-dsm",
      status: "failed",
      resolutionMeters: null,
      coverageSourceIds: [],
      sourceAsset: null,
      renderedArtifact: null,
      reasons: [`${providerId} ${role.toUpperCase()} COG coordinate probe did not write JSON.`]
    }
  );
}

import { execFile } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import type {
  NormalizedTerrainSourcePreviewTile,
  TerrainSourcePreviewRole
} from "@/lib/terrainSourcePreview";

const execFileAsync = promisify(execFile);

export type TerrainSourceTileRenderResult =
  | {
      status: "ready";
      body: Buffer;
      contentType: "image/png";
      byteSize: number;
      artifactJsonPath: string;
      artifactPngPath: string;
    }
  | {
      status: "blocked" | "failed";
      reason: string;
      artifactJsonPath: string;
      artifactPngPath: string;
    };

interface RenderLidarBcTerrainTileOptions {
  role: TerrainSourcePreviewRole;
  tile: NormalizedTerrainSourcePreviewTile;
  refresh?: boolean;
  cacheRoot?: string;
  pythonCommand?: string;
}

interface RenderUsgsLpcDsmTerrainTileOptions {
  tile: NormalizedTerrainSourcePreviewTile;
  refresh?: boolean;
  cacheRoot?: string;
  pythonCommand?: string;
}

interface RenderUsgs3depTerrainTileOptions {
  tile: NormalizedTerrainSourcePreviewTile;
  refresh?: boolean;
  cacheRoot?: string;
  pythonCommand?: string;
}

interface RenderCanadaHrdemTerrainTileOptions {
  role: TerrainSourcePreviewRole;
  tile: NormalizedTerrainSourcePreviewTile;
  refresh?: boolean;
  allowTwoMeterFallback?: boolean;
  cacheRoot?: string;
  pythonCommand?: string;
}

interface TerrainCogProbeResult {
  status?: string;
  reasons?: unknown;
  renderedArtifact?: {
    status?: string;
    reason?: string;
  } | null;
}

function defaultCacheRoot(): string {
  return path.join(/* turbopackIgnore: true */ os.tmpdir(), "vmesh-terrain-source-preview");
}

function tileArtifactPaths({
  providerId = "bc-lidarbc",
  role,
  tile,
  cacheRoot = defaultCacheRoot()
}: {
  providerId?: string;
  role: TerrainSourcePreviewRole;
  tile: NormalizedTerrainSourcePreviewTile;
  cacheRoot?: string;
}) {
  const base = path.join(
    /* turbopackIgnore: true */
    cacheRoot,
    providerId,
    role,
    String(tile.z),
    String(tile.x),
    String(tile.y)
  );

  return {
    pngPath: `${base}.png`,
    jsonPath: `${base}.json`
  };
}

async function readJsonIfPresent(jsonPath: string): Promise<TerrainCogProbeResult | null> {
  try {
    return JSON.parse(await readFile(jsonPath, "utf8")) as TerrainCogProbeResult;
  } catch {
    return null;
  }
}

function probeReason(result: TerrainCogProbeResult | null, fallback: string): string {
  if (result?.renderedArtifact?.reason) return result.renderedArtifact.reason;
  if (Array.isArray(result?.reasons) && result.reasons.length > 0) {
    return result.reasons.map((reason) => String(reason)).join(" ");
  }
  return fallback;
}

async function readRenderedTile({
  pngPath,
  jsonPath
}: {
  pngPath: string;
  jsonPath: string;
}): Promise<TerrainSourceTileRenderResult | null> {
  try {
    const body = await readFile(pngPath);
    if (body.byteLength === 0) return null;
    return {
      status: "ready",
      body,
      contentType: "image/png",
      byteSize: body.byteLength,
      artifactJsonPath: jsonPath,
      artifactPngPath: pngPath
    };
  } catch {
    return null;
  }
}

async function renderTerrainCogTile({
  providerId,
  role,
  tile,
  label,
  refresh,
  cacheRoot,
  pythonCommand,
  extraArgs = []
}: {
  providerId: "bc-lidarbc" | "canada-hrdem" | "canada-hrdem-best";
  role: TerrainSourcePreviewRole;
  tile: NormalizedTerrainSourcePreviewTile;
  label: string;
  refresh: boolean;
  cacheRoot?: string;
  pythonCommand: string;
  extraArgs?: string[];
}): Promise<TerrainSourceTileRenderResult> {
  const { pngPath, jsonPath } = tileArtifactPaths({
    providerId,
    role,
    tile,
    cacheRoot
  });

  if (!refresh) {
    const cached = await readRenderedTile({ pngPath, jsonPath });
    if (cached) return cached;
  }

  await mkdir(path.dirname(pngPath), { recursive: true });

  const scriptPath = path.join(
    /* turbopackIgnore: true */
    process.cwd(),
    "scripts",
    "terrain-cog-probe.py"
  );
  const args = [
    scriptPath,
    "--provider",
    providerId === "bc-lidarbc" ? "bc-lidarbc" : "canada-hrdem",
    "--role",
    role,
    "--tile-z",
    String(tile.z),
    "--tile-x",
    String(tile.x),
    "--tile-y",
    String(tile.y),
    "--label",
    label,
    "--render-output",
    pngPath,
    "--output",
    jsonPath,
    ...extraArgs
  ];

  try {
    await execFileAsync(pythonCommand, args, {
      encoding: "utf8",
      timeout: Number(process.env.VMESH_TERRAIN_COG_TIMEOUT_MS ?? 120_000),
      maxBuffer: 4 * 1024 * 1024,
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8"
      }
    });
  } catch {
    const probe = await readJsonIfPresent(jsonPath);
    return {
      status: probe?.status === "blocked" ? "blocked" : "failed",
      reason: probeReason(probe, `${label} failed.`),
      artifactJsonPath: jsonPath,
      artifactPngPath: pngPath
    };
  }

  const probe = await readJsonIfPresent(jsonPath);
  if (probe?.status !== "covered" || probe.renderedArtifact?.status !== "ready") {
    return {
      status: "blocked",
      reason: probeReason(probe, `${label} did not return valid source pixels for this tile.`),
      artifactJsonPath: jsonPath,
      artifactPngPath: pngPath
    };
  }

  return (
    (await readRenderedTile({ pngPath, jsonPath })) ?? {
      status: "failed",
      reason: `${label} reported coverage but did not write a PNG tile.`,
      artifactJsonPath: jsonPath,
      artifactPngPath: pngPath
    }
  );
}

export async function renderLidarBcTerrainTile({
  role,
  tile,
  refresh = false,
  cacheRoot,
  pythonCommand = process.env.PYTHON ?? "python"
}: RenderLidarBcTerrainTileOptions): Promise<TerrainSourceTileRenderResult> {
  return renderTerrainCogTile({
    providerId: "bc-lidarbc",
    role,
    tile,
    label: "LidarBC source-preview route tile render",
    refresh,
    cacheRoot,
    pythonCommand
  });
}

export async function renderCanadaHrdemTerrainTile({
  role,
  tile,
  refresh = false,
  allowTwoMeterFallback = false,
  cacheRoot,
  pythonCommand = process.env.PYTHON ?? "python"
}: RenderCanadaHrdemTerrainTileOptions): Promise<TerrainSourceTileRenderResult> {
  return renderTerrainCogTile({
    providerId: allowTwoMeterFallback ? "canada-hrdem-best" : "canada-hrdem",
    role,
    tile,
    label: allowTwoMeterFallback
      ? "Canada HRDEM best-available source-preview route tile render"
      : "Canada HRDEM strict 1m source-preview route tile render",
    refresh,
    cacheRoot,
    pythonCommand,
    extraArgs: allowTwoMeterFallback ? ["--allow-2m-fallback"] : []
  });
}

export async function renderUsgs3depTerrainTile({
  tile,
  refresh = false,
  cacheRoot,
  pythonCommand = process.env.PYTHON ?? "python"
}: RenderUsgs3depTerrainTileOptions): Promise<TerrainSourceTileRenderResult> {
  const { pngPath, jsonPath } = tileArtifactPaths({
    providerId: "usgs-3dep",
    role: "dtm",
    tile,
    cacheRoot
  });

  if (!refresh) {
    const cached = await readRenderedTile({ pngPath, jsonPath });
    if (cached) return cached;
  }

  await mkdir(path.dirname(pngPath), { recursive: true });

  const scriptPath = path.join(
    /* turbopackIgnore: true */
    process.cwd(),
    "scripts",
    "terrain-usgs-3dep-render.py"
  );
  const args = [
    scriptPath,
    "--tile-z",
    String(tile.z),
    "--tile-x",
    String(tile.x),
    "--tile-y",
    String(tile.y),
    "--role",
    "dtm",
    "--label",
    "USGS 3DEP strict 1m source-preview route tile render",
    "--render-output",
    pngPath,
    "--output",
    jsonPath
  ];

  try {
    await execFileAsync(pythonCommand, args, {
      encoding: "utf8",
      timeout: Number(process.env.VMESH_USGS_3DEP_TIMEOUT_MS ?? 120_000),
      maxBuffer: 4 * 1024 * 1024,
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8"
      }
    });
  } catch {
    const probe = await readJsonIfPresent(jsonPath);
    return {
      status: probe?.status === "blocked" ? "blocked" : "failed",
      reason: probeReason(probe, "USGS 3DEP strict 1m DTM tile render failed."),
      artifactJsonPath: jsonPath,
      artifactPngPath: pngPath
    };
  }

  const probe = await readJsonIfPresent(jsonPath);
  if (probe?.status !== "covered" || probe.renderedArtifact?.status !== "ready") {
    return {
      status: "blocked",
      reason: probeReason(probe, "USGS 3DEP did not return valid 1m DTM pixels for this tile."),
      artifactJsonPath: jsonPath,
      artifactPngPath: pngPath
    };
  }

  return (
    (await readRenderedTile({ pngPath, jsonPath })) ?? {
      status: "failed",
      reason: "USGS 3DEP worker reported coverage but did not write a PNG tile.",
      artifactJsonPath: jsonPath,
      artifactPngPath: pngPath
    }
  );
}

export async function renderUsgsLpcDsmTerrainTile({
  tile,
  refresh = false,
  cacheRoot,
  pythonCommand = process.env.PYTHON ?? "python"
}: RenderUsgsLpcDsmTerrainTileOptions): Promise<TerrainSourceTileRenderResult> {
  const { pngPath, jsonPath } = tileArtifactPaths({
    providerId: "usgs-3dep-lpc-dsm",
    role: "dsm",
    tile,
    cacheRoot
  });

  if (!refresh) {
    const cached = await readRenderedTile({ pngPath, jsonPath });
    if (cached) return cached;
  }

  await mkdir(path.dirname(pngPath), { recursive: true });

  const scriptPath = path.join(
    /* turbopackIgnore: true */
    process.cwd(),
    "scripts",
    "terrain-usgs-lpc-dsm-render.py"
  );
  const args = [
    scriptPath,
    "--tile-z",
    String(tile.z),
    "--tile-x",
    String(tile.x),
    "--tile-y",
    String(tile.y),
    "--label",
    "USGS LPC DSM source-preview route tile render",
    "--render-output",
    pngPath,
    "--output",
    jsonPath,
    "--max-assets",
    process.env.VMESH_USGS_LPC_DSM_MAX_ASSETS ?? "6",
    "--download-budget-mb",
    process.env.VMESH_USGS_LPC_DSM_DOWNLOAD_BUDGET_MB ?? "512"
  ];

  try {
    await execFileAsync(pythonCommand, args, {
      encoding: "utf8",
      timeout: Number(process.env.VMESH_USGS_LPC_DSM_TIMEOUT_MS ?? 300_000),
      maxBuffer: 4 * 1024 * 1024,
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8"
      }
    });
  } catch {
    const probe = await readJsonIfPresent(jsonPath);
    return {
      status: probe?.status === "blocked" ? "blocked" : "failed",
      reason: probeReason(probe, "USGS LPC DSM point-cloud tile render failed."),
      artifactJsonPath: jsonPath,
      artifactPngPath: pngPath
    };
  }

  const probe = await readJsonIfPresent(jsonPath);
  if (probe?.status !== "covered" || probe.renderedArtifact?.status !== "ready") {
    return {
      status: "blocked",
      reason: probeReason(probe, "USGS LPC DSM did not return valid source points for this tile."),
      artifactJsonPath: jsonPath,
      artifactPngPath: pngPath
    };
  }

  return (
    (await readRenderedTile({ pngPath, jsonPath })) ?? {
      status: "failed",
      reason: "USGS LPC DSM worker reported coverage but did not write a PNG tile.",
      artifactJsonPath: jsonPath,
      artifactPngPath: pngPath
    }
  );
}

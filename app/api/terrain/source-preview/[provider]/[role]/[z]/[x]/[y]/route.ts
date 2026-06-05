import { NextResponse, type NextRequest } from "next/server";

import {
  BC_LIDARBC_TERRAIN_PROVIDER,
  CANADA_HRDEM_TERRAIN_PROVIDER,
  createBcLidarFeatureServerQueryUrls,
  createCanadaHrdemStacSearchBody,
  createTerrainSourcePreviewRequest,
  createUsgs3depOneMeterCoverageQueryUrl,
  createUsgs3depSourceDemIndexQueryUrl,
  createUsgsLpcDsmSourceIndexQueryUrls,
  getCanadaHrdemStacAssetSelections,
  isBritishColumbiaTerrainSourceCoordinate,
  isCanadaTerrainSourceCoordinate,
  isLikelyBlankTerrainSourcePreviewImage,
  isTerrainSourcePreviewProvider,
  isTerrainSourcePreviewRole,
  isUsaTerrainSourceCoordinate,
  normalizeTerrainSourcePreviewTile,
  selectBcLidarFeatureServerAsset,
  selectCanadaHrdemStacAsset,
  selectUsgs3depDtmSource,
  selectUsgsLpcDsmSource,
  SOURCE_AUTO_BEST_TERRAIN_PROVIDER,
  SOURCE_AUTO_TERRAIN_PROVIDER,
  tileToLonLatCenter,
  TRANSPARENT_PNG_BASE64,
  USGS_3DEP_LPC_DSM_TERRAIN_PROVIDER,
  USGS_3DEP_TERRAIN_PROVIDER,
  type TerrainSourcePreviewRole,
  type TerrainSourcePreviewProvider,
  type TerrainSourcePreviewTileParams,
  type NormalizedTerrainSourcePreviewTile
} from "@/lib/terrainSourcePreview";
import {
  renderCanadaHrdemTerrainTile,
  renderLidarBcTerrainTile,
  renderUsgs3depTerrainTile,
  renderUsgsLpcDsmTerrainTile
} from "@/lib/terrainSourceTileRenderer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface TerrainSourcePreviewRouteParams extends TerrainSourcePreviewTileParams {
  provider: string;
  role: string;
}

interface RouteContext {
  params: Promise<TerrainSourcePreviewRouteParams> | TerrainSourcePreviewRouteParams;
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }
    }
  );
}

function transparentTile(reason: string) {
  return new NextResponse(bufferToArrayBuffer(Buffer.from(TRANSPARENT_PNG_BASE64, "base64")), {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "Content-Type": "image/png",
      "X-Content-Type-Options": "nosniff",
      "X-VMesh-Terrain-Source-Status": "transparent",
      "X-VMesh-Terrain-Source-Reason": reason
    }
  });
}

function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  const body = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(body).set(buffer);
  return body;
}

async function fetchUpstreamImage(upstreamUrl: string): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    return await fetch(upstreamUrl, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
      },
      next: { revalidate: 60 * 60 * 24 * 7 },
      signal: controller.signal
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function hasCoverageFeatures(value: unknown): value is { features: unknown[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "features" in value &&
    Array.isArray((value as { features: unknown }).features)
  );
}

async function usgsOneMeterCoversTileCenter(
  tile: NormalizedTerrainSourcePreviewTile
): Promise<boolean> {
  const coordinate = tileToLonLatCenter(tile);
  if (!isUsaTerrainSourceCoordinate(coordinate)) {
    return false;
  }

  try {
    const response = await fetch(createUsgs3depOneMeterCoverageQueryUrl(coordinate), {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 * 60 * 24 }
    });

    if (!response.ok) return false;

    const body = (await response.json()) as unknown;
    if (hasCoverageFeatures(body) && body.features.length > 0) {
      return true;
    }

    const sourceDemResponse = await fetch(createUsgs3depSourceDemIndexQueryUrl(coordinate), {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 * 60 * 24 }
    });

    if (!sourceDemResponse.ok) return false;

    const sourceDemBody = (await sourceDemResponse.json()) as unknown;
    return Boolean(selectUsgs3depDtmSource(sourceDemBody));
  } catch {
    return false;
  }
}

async function usgsLpcDsmCoversTileCenter(tile: NormalizedTerrainSourcePreviewTile): Promise<boolean> {
  const coordinate = tileToLonLatCenter(tile);
  if (!isUsaTerrainSourceCoordinate(coordinate)) {
    return false;
  }

  for (const queryUrl of createUsgsLpcDsmSourceIndexQueryUrls(coordinate)) {
    const response = await fetch(queryUrl, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 * 60 * 24 }
    });

    if (!response.ok) continue;

    const body = (await response.json()) as unknown;
    if (selectUsgsLpcDsmSource(body)) return true;
  }

  return false;
}

async function canadaHrdemOneMeterCoversTileCenter({
  tile,
  role
}: {
  tile: NormalizedTerrainSourcePreviewTile;
  role: "dtm" | "dsm";
}): Promise<boolean> {
  const coordinate = tileToLonLatCenter(tile);
  if (!isCanadaTerrainSourceCoordinate(coordinate)) return false;

  const response = await fetch("https://datacube.services.geo.ca/stac/api/search", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: createCanadaHrdemStacSearchBody(coordinate, role),
    next: { revalidate: 60 * 60 * 24 }
  });

  if (!response.ok) return false;

  const body = (await response.json()) as unknown;
  return Boolean(selectCanadaHrdemStacAsset({ value: body, role, requireOneMeter: true }));
}

async function canadaHrdemBestCoverageForTileCenter({
  tile,
  role
}: {
  tile: NormalizedTerrainSourcePreviewTile;
  role: "dtm" | "dsm";
}): Promise<1 | 2 | null> {
  const coordinate = tileToLonLatCenter(tile);
  if (!isCanadaTerrainSourceCoordinate(coordinate)) return null;

  const response = await fetch("https://datacube.services.geo.ca/stac/api/search", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: createCanadaHrdemStacSearchBody(coordinate, role),
    next: { revalidate: 60 * 60 * 24 }
  });

  if (!response.ok) return null;

  const body = (await response.json()) as unknown;
  const selected = selectCanadaHrdemStacAsset({ value: body, role, requireOneMeter: false });
  const selectionFromList = getCanadaHrdemStacAssetSelections(body, role)[0] ?? null;
  return selected?.resolutionMeters ?? selectionFromList?.resolutionMeters ?? null;
}

async function bcLidarOneMeterCoversTileCenter({
  tile,
  role
}: {
  tile: NormalizedTerrainSourcePreviewTile;
  role: TerrainSourcePreviewRole;
}): Promise<boolean> {
  const coordinate = tileToLonLatCenter(tile);
  if (!isBritishColumbiaTerrainSourceCoordinate(coordinate)) return false;

  for (const queryUrl of createBcLidarFeatureServerQueryUrls({ coordinate, role })) {
    const response = await fetch(queryUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });

    if (!response.ok) continue;

    const body = (await response.json()) as unknown;
    if (selectBcLidarFeatureServerAsset(body, role)) return true;
  }

  return false;
}

interface ResolvedTerrainPreviewProvider {
  provider: Exclude<
    TerrainSourcePreviewProvider,
    typeof SOURCE_AUTO_TERRAIN_PROVIDER | typeof SOURCE_AUTO_BEST_TERRAIN_PROVIDER
  >;
  sourceResolutionMeters?: 1 | 2;
}

async function resolveProviderForTile({
  provider,
  role,
  tile
}: {
  provider: TerrainSourcePreviewProvider;
  role: "dtm" | "dsm";
  tile: NormalizedTerrainSourcePreviewTile;
}): Promise<ResolvedTerrainPreviewProvider | null> {
  if (provider === USGS_3DEP_TERRAIN_PROVIDER) {
    return role === "dtm" && (await usgsOneMeterCoversTileCenter(tile))
      ? { provider: USGS_3DEP_TERRAIN_PROVIDER }
      : null;
  }

  if (provider === USGS_3DEP_LPC_DSM_TERRAIN_PROVIDER) {
    return role === "dsm" && (await usgsLpcDsmCoversTileCenter(tile))
      ? { provider: USGS_3DEP_LPC_DSM_TERRAIN_PROVIDER }
      : null;
  }

  if (provider === BC_LIDARBC_TERRAIN_PROVIDER) {
    return (await bcLidarOneMeterCoversTileCenter({ tile, role }))
      ? { provider: BC_LIDARBC_TERRAIN_PROVIDER }
      : null;
  }

  if (provider === CANADA_HRDEM_TERRAIN_PROVIDER) {
    return (await canadaHrdemOneMeterCoversTileCenter({ tile, role }))
      ? { provider: CANADA_HRDEM_TERRAIN_PROVIDER, sourceResolutionMeters: 1 }
      : null;
  }

  const center = tileToLonLatCenter(tile);
  const allowBestAvailable = provider === SOURCE_AUTO_BEST_TERRAIN_PROVIDER;

  if (await bcLidarOneMeterCoversTileCenter({ tile, role })) {
    return { provider: BC_LIDARBC_TERRAIN_PROVIDER };
  }

  if (role === "dtm" && (await usgsOneMeterCoversTileCenter(tile))) {
    return { provider: USGS_3DEP_TERRAIN_PROVIDER };
  }

  if (role === "dsm" && (await usgsLpcDsmCoversTileCenter(tile))) {
    return { provider: USGS_3DEP_LPC_DSM_TERRAIN_PROVIDER };
  }

  if (isUsaTerrainSourceCoordinate(center) && !isCanadaTerrainSourceCoordinate(center)) {
    return null;
  }

  if (isCanadaTerrainSourceCoordinate(center)) {
    const canadaResolution = allowBestAvailable
      ? await canadaHrdemBestCoverageForTileCenter({ tile, role })
      : (await canadaHrdemOneMeterCoversTileCenter({ tile, role }))
        ? 1
        : null;

    if (canadaResolution) {
      return {
        provider: CANADA_HRDEM_TERRAIN_PROVIDER,
        sourceResolutionMeters: canadaResolution
      };
    }
  }

  return null;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  let previewRequest: ReturnType<typeof createTerrainSourcePreviewRequest>;
  let tile: NormalizedTerrainSourcePreviewTile;
  let role: TerrainSourcePreviewRole;

  try {
    const params = await context.params;
    if (
      !isTerrainSourcePreviewProvider(params.provider) ||
      !isTerrainSourcePreviewRole(params.role)
    ) {
      return jsonError("Unsupported terrain source preview provider or role.", 400);
    }
    tile = normalizeTerrainSourcePreviewTile(params);
    role = params.role;
    const resolvedProvider = await resolveProviderForTile({
      provider: params.provider,
      role,
      tile
    });

    if (!resolvedProvider) {
      return transparentTile(
        params.provider === SOURCE_AUTO_BEST_TERRAIN_PROVIDER
          ? "No official DTM/DSM source covers this terrain tile center."
          : "No proven 1m DTM/DSM source covers this terrain tile center."
      );
    }

    previewRequest = createTerrainSourcePreviewRequest({
      provider: resolvedProvider.provider,
      role,
      tile,
      sourceResolutionMeters: resolvedProvider.sourceResolutionMeters
    });
  } catch {
    return jsonError("Invalid terrain source preview tile request.", 400);
  }

  if (previewRequest.status === "transparent") {
    return transparentTile(previewRequest.reason);
  }

  if (previewRequest.status === "blocked") {
    return jsonError(previewRequest.reason, 501);
  }

  if (previewRequest.status === "worker-render") {
    const refresh = new URL(_req.url).searchParams.get("refresh") === "1";
    const renderResult =
      previewRequest.sourceSummary.providerId === USGS_3DEP_TERRAIN_PROVIDER
        ? await renderUsgs3depTerrainTile({ tile, refresh })
        : previewRequest.sourceSummary.providerId === USGS_3DEP_LPC_DSM_TERRAIN_PROVIDER
        ? await renderUsgsLpcDsmTerrainTile({ tile, refresh })
        : previewRequest.sourceSummary.providerId === CANADA_HRDEM_TERRAIN_PROVIDER
          ? await renderCanadaHrdemTerrainTile({
              role,
              tile,
              refresh,
              allowTwoMeterFallback: previewRequest.sourceSummary.resolutionMeters === 2
            })
          : await renderLidarBcTerrainTile({
              role,
              tile,
              refresh
            });

    if (renderResult.status !== "ready") {
      return transparentTile(renderResult.reason);
    }

    return new NextResponse(bufferToArrayBuffer(renderResult.body), {
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800",
        "Content-Type": renderResult.contentType,
        "X-Content-Type-Options": "nosniff",
        "X-VMesh-Terrain-Provider": previewRequest.sourceSummary.providerId,
        "X-VMesh-Terrain-Role": previewRequest.sourceSummary.role,
        "X-VMesh-Ground-Model-Role": previewRequest.sourceSummary.groundModelRole,
        "X-VMesh-Terrain-Resolution-Meters": String(previewRequest.sourceSummary.resolutionMeters),
        "X-VMesh-Terrain-Source-Release": previewRequest.sourceSummary.sourceRelease,
        "X-VMesh-Terrain-Render-Mode":
          previewRequest.sourceSummary.providerId === USGS_3DEP_LPC_DSM_TERRAIN_PROVIDER
            ? "worker-point-cloud"
            : "worker-geotiff"
      }
    });
  }

  const upstreamResponse = await fetchUpstreamImage(previewRequest.upstreamUrl);

  if (!upstreamResponse?.ok) {
    return transparentTile("Terrain source preview upstream tile fetch failed or timed out.");
  }

  const contentType = upstreamResponse.headers.get("content-type") ?? "image/png";
  const body = await upstreamResponse.arrayBuffer();

  if (isLikelyBlankTerrainSourcePreviewImage({ byteLength: body.byteLength, contentType })) {
    return transparentTile("Terrain source preview upstream tile was blank or no-data.");
  }

  return new NextResponse(body, {
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800",
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      "X-VMesh-Terrain-Provider": previewRequest.sourceSummary.providerId,
      "X-VMesh-Terrain-Role": previewRequest.sourceSummary.role,
      "X-VMesh-Ground-Model-Role": previewRequest.sourceSummary.groundModelRole,
      "X-VMesh-Terrain-Resolution-Meters": String(previewRequest.sourceSummary.resolutionMeters),
      "X-VMesh-Terrain-Source-Release": previewRequest.sourceSummary.sourceRelease
    }
  });
}

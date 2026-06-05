#!/usr/bin/env python
"""Derive a small DSM preview tile from official USGS 3DEP LPC source assets.

This is a bounded worker-side proof utility. It does not try to process a whole
LPC project. It queries the official USGS LPC source index, enumerates the
project LAZ/LAS links, shortlists source tiles that intersect a requested Web
Mercator tile, downloads only the selected assets within an explicit budget,
and bins point elevations into a DSM preview grid.
"""

from __future__ import annotations

import argparse
import json
import math
import shutil
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image
import rasterio
from rasterio.transform import from_bounds
from rasterio.warp import transform


USGS_LPC_INDEX_QUERY_URL = (
    "https://index.nationalmap.gov/arcgis/rest/services/"
    "3DEPElevationIndex/MapServer/8/query"
)
USGS_LPC_FALLBACK_INDEX_QUERY_URL = (
    "https://index.nationalmap.gov/arcgis/rest/services/"
    "3DEPElevationIndex/MapServer/24/query"
)
WEB_MERCATOR_RADIUS = 6378137
WEB_MERCATOR_ORIGIN = math.pi * WEB_MERCATOR_RADIUS
DEFAULT_CACHE_DIR = Path(".artifacts/terrain-source-preview/usgs-lpc-cache")
DEFAULT_DOWNLOAD_BUDGET_MB = 512
DEFAULT_MAX_ASSETS = 8
DEFAULT_TILE_SIZE = 256
LAZ_TILE_METERS = 1000


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Render a USGS LPC-derived DSM preview tile.")
    parser.add_argument("--lat", type=float)
    parser.add_argument("--lon", type=float)
    parser.add_argument("--tile-z", type=int)
    parser.add_argument("--tile-x", type=int)
    parser.add_argument("--tile-y", type=int)
    parser.add_argument("--label", default="public-safe USGS LPC DSM render proof")
    parser.add_argument("--output")
    parser.add_argument("--render-output")
    parser.add_argument("--geotiff-output")
    parser.add_argument("--cache-dir", default=str(DEFAULT_CACHE_DIR))
    parser.add_argument("--tile-size", type=int, default=DEFAULT_TILE_SIZE)
    parser.add_argument("--max-assets", type=int, default=DEFAULT_MAX_ASSETS)
    parser.add_argument("--download-budget-mb", type=int, default=DEFAULT_DOWNLOAD_BUDGET_MB)
    parser.add_argument("--chunk-size", type=int, default=750_000)
    parser.add_argument("--include-coordinate", action="store_true")
    return parser.parse_args()


def has_tile_args(args: argparse.Namespace) -> bool:
    return args.tile_z is not None and args.tile_x is not None and args.tile_y is not None


def validate_args(args: argparse.Namespace) -> None:
    has_coordinate = args.lat is not None and args.lon is not None
    has_tile = has_tile_args(args)
    if not has_coordinate and not has_tile:
        raise ValueError("Provide either --lat/--lon or --tile-z/--tile-x/--tile-y.")
    if has_coordinate:
        if args.lat is None or args.lat < -90 or args.lat > 90:
            raise ValueError("--lat is outside WGS84 bounds.")
        if args.lon is None or args.lon < -180 or args.lon > 180:
            raise ValueError("--lon is outside WGS84 bounds.")
    if has_tile:
        max_tile = 2**args.tile_z
        if (
            args.tile_z < 0
            or args.tile_z > 16
            or args.tile_x < 0
            or args.tile_y < 0
            or args.tile_x >= max_tile
            or args.tile_y >= max_tile
        ):
            raise ValueError("--tile-z/--tile-x/--tile-y are outside the supported range.")
    if args.tile_size < 32 or args.tile_size > 2048:
        raise ValueError("--tile-size must be between 32 and 2048.")
    if args.max_assets < 1 or args.max_assets > 64:
        raise ValueError("--max-assets must be between 1 and 64.")
    if args.download_budget_mb < 1 or args.download_budget_mb > 8192:
        raise ValueError("--download-budget-mb must be between 1 and 8192.")
    if args.chunk_size < 10_000 or args.chunk_size > 5_000_000:
        raise ValueError("--chunk-size must be between 10000 and 5000000.")


def tile_to_lon_lat_center(z: int, x: int, y: int) -> dict[str, float]:
    n = 2**z
    longitude = ((x + 0.5) / n) * 360 - 180
    mercator_y = math.pi * (1 - (2 * (y + 0.5)) / n)
    latitude = math.atan(math.sinh(mercator_y)) * 180 / math.pi
    return {"latitude": latitude, "longitude": longitude}


def probe_coordinate(args: argparse.Namespace) -> dict[str, float]:
    if args.lat is not None and args.lon is not None:
        return {"latitude": args.lat, "longitude": args.lon}
    return tile_to_lon_lat_center(args.tile_z, args.tile_x, args.tile_y)


def tile_to_web_mercator_bounds(z: int, x: int, y: int) -> tuple[float, float, float, float]:
    tile_size = (2 * WEB_MERCATOR_ORIGIN) / 2**z
    west = -WEB_MERCATOR_ORIGIN + x * tile_size
    east = west + tile_size
    north = WEB_MERCATOR_ORIGIN - y * tile_size
    south = north - tile_size
    return west, south, east, north


def coordinate_to_web_mercator_bounds(
    coordinate: dict[str, float], span_meters: float = 512
) -> tuple[float, float, float, float]:
    x_values, y_values = transform(
        "EPSG:4326",
        "EPSG:3857",
        [coordinate["longitude"]],
        [coordinate["latitude"]],
    )
    half_span = span_meters / 2
    return (
        x_values[0] - half_span,
        y_values[0] - half_span,
        x_values[0] + half_span,
        y_values[0] + half_span,
    )


def requested_web_mercator_bounds(args: argparse.Namespace) -> tuple[float, float, float, float]:
    if has_tile_args(args):
        return tile_to_web_mercator_bounds(args.tile_z, args.tile_x, args.tile_y)
    return coordinate_to_web_mercator_bounds(probe_coordinate(args))


def http_json(url: str) -> dict[str, Any]:
    request = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def http_text(url: str) -> str:
    request = urllib.request.Request(url, headers={"Accept": "text/plain,*/*;q=0.8"})
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read().decode("utf-8", errors="replace")


def http_head_size(url: str) -> int | None:
    try:
        request = urllib.request.Request(url, method="HEAD")
        with urllib.request.urlopen(request, timeout=30) as response:
            value = response.headers.get("content-length")
            if not value:
                return None
            return int(value)
    except Exception:
        return None


def download_file(url: str, output_path: Path) -> int:
    if output_path.exists() and output_path.stat().st_size > 0:
        return output_path.stat().st_size
    output_path.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(url, headers={"Accept": "application/octet-stream"})
    tmp_path = output_path.with_suffix(output_path.suffix + ".tmp")
    with urllib.request.urlopen(request, timeout=300) as response:
        with tmp_path.open("wb") as file:
            shutil.copyfileobj(response, file)
    tmp_path.replace(output_path)
    return output_path.stat().st_size


def lpc_query_urls(coordinate: dict[str, float]) -> list[str]:
    params = {
        "f": "json",
        "where": "1=1",
        "geometry": f"{coordinate['longitude']:.6f},{coordinate['latitude']:.6f}",
        "geometryType": "esriGeometryPoint",
        "inSR": "4326",
        "spatialRel": "esriSpatialRelIntersects",
        "outFields": "*",
        "returnGeometry": "false",
    }
    query = urllib.parse.urlencode(params)
    return [
        urllib.parse.urlunparse(urllib.parse.urlparse(endpoint)._replace(query=query))
        for endpoint in (USGS_LPC_INDEX_QUERY_URL, USGS_LPC_FALLBACK_INDEX_QUERY_URL)
    ]


def number_attr(value: Any) -> float | None:
    return value if isinstance(value, (int, float)) and math.isfinite(value) else None


def string_attr(value: Any) -> str | None:
    return value.strip() if isinstance(value, str) and value.strip() else None


def select_lpc_source(value: dict[str, Any]) -> dict[str, Any] | None:
    candidates: list[dict[str, Any]] = []
    for feature in value.get("features", []):
        if not isinstance(feature, dict):
            continue
        attributes = feature.get("attributes")
        if not isinstance(attributes, dict):
            continue

        lpc_link = string_attr(attributes.get("lpc_link"))
        workunit = string_attr(attributes.get("workunit"))
        project = string_attr(attributes.get("project")) or workunit
        dem_gsd_meters = number_attr(attributes.get("dem_gsd_meters"))
        object_id = number_attr(attributes.get("OBJECTID"))
        category = string_attr(attributes.get("lpc_category"))
        reason = string_attr(attributes.get("lpc_reason"))
        meets_lpc = (category or "").lower().startswith("meets") or "meets 3dep lpc requirements" in (
            reason or ""
        ).lower()

        if not lpc_link or not lpc_link.lower().startswith(("http://", "https://")):
            continue
        if not workunit or not project or dem_gsd_meters is None:
            continue
        if dem_gsd_meters > 1 or not meets_lpc:
            continue

        candidates.append(
            {
                "sourceId": f"usgs-3dep-lpc-dsm:{int(object_id) if object_id is not None else workunit}",
                "lpcLink": lpc_link.rstrip("/"),
                "metadataLink": string_attr(attributes.get("metadata_link")),
                "sourcedemLink": string_attr(attributes.get("sourcedem_link")),
                "workunit": workunit,
                "project": project,
                "objectId": object_id,
                "qualityLevel": string_attr(attributes.get("ql")),
                "specification": string_attr(attributes.get("spec")),
                "pointMethod": string_attr(attributes.get("p_method")),
                "demGsdMeters": dem_gsd_meters,
                "horizontalCrs": string_attr(attributes.get("horiz_crs")),
                "verticalCrs": string_attr(attributes.get("vert_crs")),
                "geoid": string_attr(attributes.get("geoid")),
                "lpcCategory": category,
                "lpcReason": reason,
                "collectionEnd": number_attr(attributes.get("collect_end")),
            }
        )

    return sorted(candidates, key=lambda item: (item["demGsdMeters"], -(item["collectionEnd"] or 0)))[
        0
    ] if candidates else None


def query_lpc_source(coordinate: dict[str, float]) -> tuple[dict[str, Any] | None, list[int]]:
    failed_statuses: list[int] = []
    for url in lpc_query_urls(coordinate):
        try:
            selected = select_lpc_source(http_json(url))
        except Exception:
            failed_statuses.append(0)
            continue
        if selected:
            return selected, failed_statuses
    return None, failed_statuses


def file_links_url(source: dict[str, Any]) -> str:
    return f"{source['lpcLink']}/0_file_download_links.txt"


def source_crs(source: dict[str, Any]) -> str:
    crs = source.get("horizontalCrs")
    return f"EPSG:{crs}" if crs else "EPSG:26913"


def parse_laz_tile_key(href: str) -> tuple[int, int] | None:
    name = Path(urllib.parse.urlparse(href).path).name.lower()
    stem = name.rsplit(".", 1)[0]
    for part in stem.split("_"):
        if len(part) >= 10 and part.startswith("w") and "n" in part:
            west_text, north_text = part[1:].split("n", 1)
            if west_text.isdigit() and north_text.isdigit():
                return int(west_text), int(north_text)
    return None


def asset_links_from_text(value: str) -> list[str]:
    links: list[str] = []
    for raw_line in value.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        path = urllib.parse.urlparse(line).path.lower()
        if path.endswith(".laz") or path.endswith(".las"):
            links.append(line)
    return links


def source_bbox_for_web_bounds(
    web_bounds: tuple[float, float, float, float], crs: str
) -> tuple[float, float, float, float]:
    west, south, east, north = web_bounds
    xs = [west, east, east, west]
    ys = [south, south, north, north]
    tx, ty = transform("EPSG:3857", crs, xs, ys)
    return min(tx), min(ty), max(tx), max(ty)


def bbox_intersects(
    left: tuple[float, float, float, float], right: tuple[float, float, float, float]
) -> bool:
    return not (left[2] <= right[0] or right[2] <= left[0] or left[3] <= right[1] or right[3] <= left[1])


def asset_bbox_from_key(key: tuple[int, int]) -> tuple[float, float, float, float]:
    west = key[0] * LAZ_TILE_METERS
    south = key[1] * LAZ_TILE_METERS
    return west, south, west + LAZ_TILE_METERS, south + LAZ_TILE_METERS


def shortlist_assets(
    links: list[str],
    source_bounds: tuple[float, float, float, float],
    max_assets: int,
    download_budget_bytes: int,
) -> tuple[list[dict[str, Any]], list[str]]:
    center_x = (source_bounds[0] + source_bounds[2]) / 2
    center_y = (source_bounds[1] + source_bounds[3]) / 2
    candidates: list[dict[str, Any]] = []
    for href in links:
        key = parse_laz_tile_key(href)
        if not key:
            continue
        bbox = asset_bbox_from_key(key)
        if not bbox_intersects(bbox, source_bounds):
            continue
        asset_center_x = (bbox[0] + bbox[2]) / 2
        asset_center_y = (bbox[1] + bbox[3]) / 2
        candidates.append(
            {
                "href": href,
                "filename": Path(urllib.parse.urlparse(href).path).name,
                "format": "laz" if href.lower().endswith(".laz") else "las",
                "tileKey": {"westKm": key[0], "northKm": key[1]},
                "inferredBounds": {
                    "west": bbox[0],
                    "south": bbox[1],
                    "east": bbox[2],
                    "north": bbox[3],
                },
                "distanceMeters": math.hypot(asset_center_x - center_x, asset_center_y - center_y),
                "byteSize": http_head_size(href),
            }
        )

    candidates.sort(key=lambda item: (item["distanceMeters"], item["filename"]))
    selected: list[dict[str, Any]] = []
    skipped: list[str] = []
    total_bytes = 0
    for candidate in candidates:
        if len(selected) >= max_assets:
            skipped.append(f"{candidate['filename']} skipped by --max-assets.")
            continue
        size = candidate["byteSize"]
        estimated_size = size if isinstance(size, int) and size > 0 else 0
        if total_bytes + estimated_size > download_budget_bytes:
            skipped.append(f"{candidate['filename']} skipped by --download-budget-mb.")
            continue
        total_bytes += estimated_size
        selected.append(candidate)

    return selected, skipped


def import_laspy() -> Any | None:
    try:
        import laspy

        return laspy
    except Exception:
        return None


def base_result(args: argparse.Namespace, coordinate: dict[str, float]) -> dict[str, Any]:
    result: dict[str, Any] = {
        "schemaVersion": "vmesh-usgs-lpc-dsm-render-v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "runClass": "live-proof",
        "providerId": "usgs-3dep-lpc-dsm",
        "label": args.label,
        "role": "dsm",
        "groundModelRole": "surface-dsm",
        "coordinateDisclosure": "exact-coordinate-included"
        if args.include_coordinate
        else "coordinate-redacted",
        "status": "failed",
        "resolutionMeters": None,
        "coverageSourceIds": [],
        "sourceAsset": None,
        "assetManifest": None,
        "qa": None,
        "renderedArtifact": None,
        "rasterArtifact": None,
        "derivationReadiness": {
            "pdalInstalled": shutil.which("pdal") is not None,
            "laspyInstalled": import_laspy() is not None,
            "canDeriveDsmInCurrentRuntime": False,
        },
        "reasons": [],
    }
    result["derivationReadiness"]["canDeriveDsmInCurrentRuntime"] = bool(
        result["derivationReadiness"]["pdalInstalled"]
        or result["derivationReadiness"]["laspyInstalled"]
    )
    if args.include_coordinate:
        result["coordinate"] = coordinate
    if has_tile_args(args):
        result["tile"] = {"z": args.tile_z, "x": args.tile_x, "y": args.tile_y}
    return result


def cache_path_for_asset(cache_dir: Path, source: dict[str, Any], asset: dict[str, Any]) -> Path:
    safe_project = str(source["project"]).replace("/", "_").replace("\\", "_")
    safe_workunit = str(source["workunit"]).replace("/", "_").replace("\\", "_")
    return cache_dir / safe_project / safe_workunit / asset["filename"]


def derive_dsm_grid(
    laspy: Any,
    downloaded_assets: list[dict[str, Any]],
    source_crs_name: str,
    web_bounds: tuple[float, float, float, float],
    source_bounds: tuple[float, float, float, float],
    tile_size: int,
    chunk_size: int,
) -> tuple[np.ndarray, np.ndarray, dict[str, Any]]:
    west, south, east, north = web_bounds
    grid = np.full((tile_size, tile_size), -np.inf, dtype="float32")
    counts = np.zeros((tile_size, tile_size), dtype="uint32")
    total_points = 0
    accepted_points = 0

    for asset in downloaded_assets:
        with laspy.open(asset["localPath"]) as reader:
            for points in reader.chunk_iterator(chunk_size):
                total_points += len(points)
                xs = np.asarray(points.x)
                ys = np.asarray(points.y)
                zs = np.asarray(points.z)
                mask = (
                    (xs >= source_bounds[0])
                    & (xs <= source_bounds[2])
                    & (ys >= source_bounds[1])
                    & (ys <= source_bounds[3])
                )
                if not np.any(mask):
                    continue
                px = xs[mask]
                py = ys[mask]
                pz = zs[mask].astype("float32")
                mx, my = transform(source_crs_name, "EPSG:3857", px.tolist(), py.tolist())
                mx_array = np.asarray(mx)
                my_array = np.asarray(my)
                tile_mask = (
                    (mx_array >= west)
                    & (mx_array <= east)
                    & (my_array >= south)
                    & (my_array <= north)
                )
                if not np.any(tile_mask):
                    continue
                mx_array = mx_array[tile_mask]
                my_array = my_array[tile_mask]
                pz = pz[tile_mask]
                cols = np.floor(((mx_array - west) / (east - west)) * tile_size).astype("int32")
                rows = np.floor(((north - my_array) / (north - south)) * tile_size).astype("int32")
                valid = (cols >= 0) & (cols < tile_size) & (rows >= 0) & (rows < tile_size)
                if not np.any(valid):
                    continue
                rows = rows[valid]
                cols = cols[valid]
                pz = pz[valid]
                np.maximum.at(grid, (rows, cols), pz)
                np.add.at(counts, (rows, cols), 1)
                accepted_points += len(pz)

    valid = np.isfinite(grid)
    qa = {
        "totalSourcePointsRead": int(total_points),
        "pointsInsideRequestedTile": int(accepted_points),
        "tilePixels": int(tile_size * tile_size),
        "validPixels": int(valid.sum()),
        "noDataRatio": float(1 - (valid.sum() / (tile_size * tile_size))),
    }
    if valid.any():
        values = grid[valid]
        qa.update(
            {
                "minElevationMeters": float(values.min()),
                "maxElevationMeters": float(values.max()),
                "meanElevationMeters": float(values.mean()),
            }
        )

    return grid, counts, qa


def fill_grid_for_render(grid: np.ndarray) -> np.ndarray:
    valid = np.isfinite(grid)
    if not valid.any():
        return grid
    filled = grid.copy()
    filled[~valid] = float(grid[valid].mean())
    return filled


def render_dsm_png(grid: np.ndarray, output_path: Path) -> dict[str, Any]:
    valid = np.isfinite(grid)
    valid_count = int(valid.sum())
    if valid_count == 0:
        return {"status": "blocked", "reason": "Cannot render DSM tile with no valid points."}

    filled = fill_grid_for_render(grid)
    values = grid[valid]
    low, high = np.percentile(values, [2, 98])
    if not np.isfinite(low) or not np.isfinite(high) or high <= low:
        low = float(values.min())
        high = float(values.max()) if float(values.max()) > low else low + 1

    dy, dx = np.gradient(filled)
    slope = np.pi / 2 - np.arctan(np.sqrt(dx * dx + dy * dy) * 1.5)
    aspect = np.arctan2(-dx, dy)
    azimuth = np.deg2rad(315)
    altitude = np.deg2rad(45)
    hillshade = (
        np.sin(altitude) * np.sin(slope)
        + np.cos(altitude) * np.cos(slope) * np.cos(azimuth - aspect)
    )
    hillshade = np.clip((hillshade + 1) / 2, 0, 1)

    normalized = np.clip((filled - low) / (high - low), 0, 1)
    visual = np.clip(0.22 + 0.5 * hillshade + 0.28 * normalized, 0, 1)
    rgb = np.stack(
        [
            (visual * 224).astype("uint8"),
            (visual * 226).astype("uint8"),
            (visual * 212).astype("uint8"),
        ],
        axis=-1,
    )
    alpha = np.where(valid, 255, 0).astype("uint8")
    rgba = np.dstack([rgb, alpha])

    output_path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba, mode="RGBA").save(output_path)
    return {
        "status": "ready",
        "kind": "png",
        "role": "surface-dsm-preview",
        "ref": output_path.as_posix(),
        "validPixels": valid_count,
        "byteSize": output_path.stat().st_size,
    }


def write_dsm_geotiff(
    grid: np.ndarray,
    web_bounds: tuple[float, float, float, float],
    output_path: Path,
) -> dict[str, Any]:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    west, south, east, north = web_bounds
    data = grid.copy()
    nodata = -9999.0
    data[~np.isfinite(data)] = nodata
    with rasterio.open(
        output_path,
        "w",
        driver="GTiff",
        height=data.shape[0],
        width=data.shape[1],
        count=1,
        dtype="float32",
        crs="EPSG:3857",
        transform=from_bounds(west, south, east, north, data.shape[1], data.shape[0]),
        nodata=nodata,
        compress="deflate",
    ) as dataset:
        dataset.write(data.astype("float32"), 1)

    return {
        "status": "ready",
        "kind": "geotiff",
        "role": "surface-dsm-raster",
        "ref": output_path.as_posix(),
        "crs": "EPSG:3857",
        "byteSize": output_path.stat().st_size,
    }


def build_result(args: argparse.Namespace) -> dict[str, Any]:
    coordinate = probe_coordinate(args)
    result = base_result(args, coordinate)
    selected_source, _failed_statuses = query_lpc_source(coordinate)

    if not selected_source:
        return {
            **result,
            "status": "blocked",
            "reasons": [
                "USGS 3DEP LPC index did not return a 1m-class source project that meets 3DEP LPC requirements for this coordinate."
            ],
        }

    links_text_href = file_links_url(selected_source)
    links = asset_links_from_text(http_text(links_text_href))
    crs = source_crs(selected_source)
    web_bounds = requested_web_mercator_bounds(args)
    source_bounds = source_bbox_for_web_bounds(web_bounds, crs)
    download_budget_bytes = args.download_budget_mb * 1024 * 1024
    selected_assets, skipped_assets = shortlist_assets(
        links, source_bounds, args.max_assets, download_budget_bytes
    )

    source_asset = {
        "collection": "USGS 3DEP Lidar Point Cloud",
        "id": selected_source["sourceId"],
        "assetRole": "source-index",
        "href": selected_source["lpcLink"],
        "metadataHref": selected_source["metadataLink"],
        "sourceDemHref": selected_source["sourcedemLink"],
        "type": "source-index",
        "workunit": selected_source["workunit"],
        "project": selected_source["project"],
        "qualityLevel": selected_source["qualityLevel"],
        "specification": selected_source["specification"],
        "pointMethod": selected_source["pointMethod"],
        "demGsdMeters": selected_source["demGsdMeters"],
        "horizontalCrs": selected_source["horizontalCrs"],
        "verticalCrs": selected_source["verticalCrs"],
        "geoid": selected_source["geoid"],
    }
    result = {
        **result,
        "resolutionMeters": selected_source["demGsdMeters"],
        "coverageSourceIds": [selected_source["sourceId"]],
        "sourceAsset": source_asset,
        "assetManifest": {
            "kind": "point-cloud-source-links",
            "sourceLinksHref": links_text_href,
            "assetCount": len(links),
            "shortlistPolicy": "Shortlist LAZ/LAS assets whose inferred project-CRS 1 km footprint intersects the requested Web Mercator tile.",
            "sourceCrs": crs,
            "sourceBounds": {
                "west": source_bounds[0],
                "south": source_bounds[1],
                "east": source_bounds[2],
                "north": source_bounds[3],
            },
            "shortlistedAssetCount": len(selected_assets),
            "shortlistedAssets": selected_assets,
            "skippedAssets": skipped_assets[:20],
        },
    }

    if not selected_assets:
        return {
            **result,
            "status": "blocked",
            "reasons": [
                "No LPC LAZ/LAS asset footprint could be matched to the requested tile within the configured shortlist and budget."
            ],
        }

    laspy = import_laspy()
    if laspy is None:
        return {
            **result,
            "status": "blocked",
            "reasons": ["laspy/lazrs is not installed; DSM source assets were shortlisted but not read."],
        }

    cache_dir = Path(args.cache_dir)
    downloaded_assets: list[dict[str, Any]] = []
    downloaded_bytes = 0
    for asset in selected_assets:
        local_path = cache_path_for_asset(cache_dir, selected_source, asset)
        byte_size = download_file(str(asset["href"]), local_path)
        downloaded_bytes += byte_size
        downloaded_assets.append(
            {
                **asset,
                "localPath": str(local_path.as_posix()),
                "downloadedByteSize": byte_size,
            }
        )

    grid, _counts, qa = derive_dsm_grid(
        laspy=laspy,
        downloaded_assets=downloaded_assets,
        source_crs_name=crs,
        web_bounds=web_bounds,
        source_bounds=source_bounds,
        tile_size=args.tile_size,
        chunk_size=args.chunk_size,
    )
    qa.update(
        {
            "downloadedAssetCount": len(downloaded_assets),
            "downloadedByteSize": downloaded_bytes,
            "downloadBudgetByteSize": download_budget_bytes,
            "method": "surface DSM by max-z binning of source LPC points into the requested Web Mercator tile grid",
        }
    )

    status = "covered" if qa["validPixels"] > 0 else "blocked"
    rendered_artifact = None
    raster_artifact = None
    reasons: list[str] = []
    if status == "blocked":
        reasons.append("Source LAZ/LAS assets were read, but no points landed inside the requested tile.")

    if args.render_output and status == "covered":
        rendered_artifact = render_dsm_png(grid, Path(args.render_output))
        if rendered_artifact.get("status") != "ready":
            status = "blocked"
            reasons.append(str(rendered_artifact.get("reason", "DSM PNG render failed.")))

    if args.geotiff_output and status == "covered":
        raster_artifact = write_dsm_geotiff(grid, web_bounds, Path(args.geotiff_output))

    result["assetManifest"]["shortlistedAssets"] = downloaded_assets

    return {
        **result,
        "status": status,
        "qa": qa,
        "renderedArtifact": rendered_artifact,
        "rasterArtifact": raster_artifact,
        "reasons": reasons,
    }


def main() -> int:
    args = parse_args()
    validate_args(args)
    result = build_result(args)
    output = json.dumps(result, indent=2)

    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(output + "\n", encoding="utf-8")

    print(output)
    return 0 if result["status"] == "covered" else 2


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(
            json.dumps(
                {
                    "schemaVersion": "vmesh-usgs-lpc-dsm-render-v1",
                    "generatedAt": datetime.now(timezone.utc).isoformat(),
                    "runClass": "live-proof",
                    "status": "failed",
                    "reasons": [str(error)],
                },
                indent=2,
            ),
            file=sys.stderr,
        )
        raise SystemExit(1)

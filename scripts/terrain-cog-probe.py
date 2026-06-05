#!/usr/bin/env python
"""Probe source-native terrain COGs for real non-no-data coverage.

This is a worker-side utility, not browser code. It exists to validate whether
an upstream COG actually has usable DTM/DSM pixels at a coordinate after a broad
catalog/STAC hit.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import from_bounds
from rasterio.vrt import WarpedVRT
from rasterio.warp import transform
from rasterio.windows import Window


CANADA_HRDEM_STAC_SEARCH_URL = "https://datacube.services.geo.ca/stac/api/search"
BC_LIDAR_FEATURE_SERVER_BASE_URL = (
    "https://services6.arcgis.com/ubm4tcTYICKBpist/ArcGIS/rest/services/"
    "LiDAR_BC_S3_Public/FeatureServer"
)
DEFAULT_COLLECTIONS = ("hrdem-mosaic-1m", "hrdem-mosaic-2m")
WEB_MERCATOR_RADIUS = 6378137
WEB_MERCATOR_ORIGIN = math.pi * WEB_MERCATOR_RADIUS


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Probe source-native terrain COG/GeoTIFF coverage.")
    parser.add_argument(
        "--provider",
        choices=("canada-hrdem", "bc-lidarbc"),
        default="canada-hrdem",
        help="Official source resolver to use.",
    )
    parser.add_argument("--lat", type=float, help="Latitude in WGS84.")
    parser.add_argument("--lon", type=float, help="Longitude in WGS84.")
    parser.add_argument("--tile-z", type=int, help="Web Mercator tile z.")
    parser.add_argument("--tile-x", type=int, help="Web Mercator tile x.")
    parser.add_argument("--tile-y", type=int, help="Web Mercator tile y.")
    parser.add_argument("--role", choices=("dtm", "dsm"), default="dtm")
    parser.add_argument("--label", default="public-safe terrain COG probe")
    parser.add_argument("--window", type=int, default=64, help="Sample window size in pixels.")
    parser.add_argument("--tile-size", type=int, default=256, help="Rendered tile size in pixels.")
    parser.add_argument("--output", help="Optional JSON output path.")
    parser.add_argument("--render-output", help="Optional rendered PNG output path.")
    parser.add_argument(
        "--allow-2m-fallback",
        action="store_true",
        help=(
            "Allow HRDEM Mosaic 2m assets when no 1m asset exists. "
            "Do not use this for the current 1m terrain milestone."
        ),
    )
    parser.add_argument(
        "--include-coordinate",
        action="store_true",
        help="Include exact coordinate in JSON output. Use only for public-safe probes.",
    )
    return parser.parse_args()


def has_tile_args(args: argparse.Namespace) -> bool:
    return args.tile_z is not None and args.tile_x is not None and args.tile_y is not None


def validate_args(args: argparse.Namespace) -> None:
    has_coordinate = args.lat is not None and args.lon is not None
    has_tile = has_tile_args(args)
    if not has_coordinate and not has_tile:
        raise SystemExit("Provide either --lat/--lon or --tile-z/--tile-x/--tile-y.")
    if args.lat is not None and not (-90 <= args.lat <= 90):
        raise SystemExit("--lat must be between -90 and 90.")
    if args.lon is not None and not (-180 <= args.lon <= 180):
        raise SystemExit("--lon must be between -180 and 180.")
    if has_tile:
        max_tile = 2**args.tile_z
        if args.tile_z < 0 or args.tile_z > 16:
            raise SystemExit("--tile-z must be between 0 and 16.")
        if args.tile_x < 0 or args.tile_y < 0 or args.tile_x >= max_tile or args.tile_y >= max_tile:
            raise SystemExit("--tile-x/--tile-y are outside the tile range.")
    if args.window < 1 or args.window > 1024:
        raise SystemExit("--window must be between 1 and 1024 pixels.")
    if args.tile_size < 1 or args.tile_size > 2048:
        raise SystemExit("--tile-size must be between 1 and 2048 pixels.")


def tile_to_lon_lat_center(z: int, x: int, y: int) -> tuple[float, float]:
    n = 2**z
    lon = ((x + 0.5) / n) * 360 - 180
    mercator_y = math.pi * (1 - (2 * (y + 0.5)) / n)
    lat = math.degrees(math.atan(math.sinh(mercator_y)))
    return lat, lon


def tile_to_web_mercator_bounds(z: int, x: int, y: int) -> tuple[float, float, float, float]:
    tile_size = (2 * WEB_MERCATOR_ORIGIN) / 2**z
    west = -WEB_MERCATOR_ORIGIN + x * tile_size
    east = west + tile_size
    north = WEB_MERCATOR_ORIGIN - y * tile_size
    south = north - tile_size
    return west, south, east, north


def probe_coordinate(args: argparse.Namespace) -> tuple[float, float]:
    if args.lat is not None and args.lon is not None:
        return args.lat, args.lon
    return tile_to_lon_lat_center(args.tile_z, args.tile_x, args.tile_y)


def http_json(url: str, payload: dict[str, Any]) -> dict[str, Any]:
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def http_get_json(url: str) -> dict[str, Any]:
    request = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def search_hrdem(lat: float, lon: float, role: str) -> list[dict[str, Any]]:
    body = {
        "limit": 10,
        "collections": list(DEFAULT_COLLECTIONS),
        "intersects": {"type": "Point", "coordinates": [lon, lat]},
    }
    data = http_json(CANADA_HRDEM_STAC_SEARCH_URL, body)
    features = data.get("features", [])
    if not isinstance(features, list):
        return []

    candidates: list[dict[str, Any]] = []
    for feature in features:
        if not isinstance(feature, dict):
            continue
        assets = feature.get("assets", {})
        if not isinstance(assets, dict) or role not in assets:
            continue
        asset = assets[role]
        if not isinstance(asset, dict) or not asset.get("href"):
            continue
        candidates.append(feature)

    def sort_key(feature: dict[str, Any]) -> tuple[int, str]:
        collection = str(feature.get("collection", ""))
        return (0 if collection == "hrdem-mosaic-1m" else 1, str(feature.get("id", "")))

    return sorted(candidates, key=sort_key)


def lidarbc_layer_ids(role: str) -> tuple[str, ...]:
    return ("1", "2", "3") if role == "dsm" else ("5", "6")


def lidarbc_query_url(
    lat: float, lon: float, role: str, layer_id: str, envelope_degrees: float | None = None
) -> str:
    if envelope_degrees is None:
        geometry = f"{lon:.6f},{lat:.6f}"
        geometry_type = "esriGeometryPoint"
    else:
        geometry = ",".join(
            [
                f"{lon - envelope_degrees:.6f}",
                f"{lat - envelope_degrees:.6f}",
                f"{lon + envelope_degrees:.6f}",
                f"{lat + envelope_degrees:.6f}",
            ]
        )
        geometry_type = "esriGeometryEnvelope"

    params = {
        "f": "json",
        "where": "1=1",
        "geometry": geometry,
        "geometryType": geometry_type,
        "inSR": "4326",
        "spatialRel": "esriSpatialRelIntersects",
        "outFields": "filename,maptile,path,spacing,year,s3Url,projection",
        "returnGeometry": "false",
    }
    return f"{BC_LIDAR_FEATURE_SERVER_BASE_URL}/{layer_id}/query?{urllib.parse.urlencode(params)}"


def is_lidarbc_one_meter_asset(attributes: dict[str, Any], role: str) -> bool:
    filename = str(attributes.get("filename", ""))
    spacing = str(attributes.get("spacing", "")).strip()
    if not attributes.get("s3Url"):
        return False
    if not filename.lower().endswith((".tif", ".tiff")):
        return False
    if not ("1 metre" in spacing.lower() or "1 meter" in spacing.lower() or "xli1m" in filename.lower()):
        return False
    if role == "dsm":
        return "dsm" in filename.lower()
    return "dsm" not in filename.lower()


def search_lidarbc(lat: float, lon: float, role: str) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    seen_urls: set[str] = set()
    for layer_id in lidarbc_layer_ids(role):
        for envelope_degrees in (None, 0.03):
            data = http_get_json(lidarbc_query_url(lat, lon, role, layer_id, envelope_degrees))
            features = data.get("features", [])
            if not isinstance(features, list):
                continue

            for feature in features:
                if not isinstance(feature, dict):
                    continue
                attributes = feature.get("attributes", {})
                if not isinstance(attributes, dict):
                    continue
                s3_url = str(attributes.get("s3Url") or "")
                if s3_url in seen_urls:
                    continue
                if is_lidarbc_one_meter_asset(attributes, role):
                    candidates.append(attributes)
                    seen_urls.add(s3_url)

    def sort_key(attributes: dict[str, Any]) -> tuple[int, str]:
        year = attributes.get("year")
        year_value = int(year) if isinstance(year, int) else 0
        return (-year_value, str(attributes.get("filename", "")))

    return sorted(candidates, key=sort_key)


def resolution_from_collection(collection: str) -> int | None:
    if collection == "hrdem-mosaic-1m":
        return 1
    if collection == "hrdem-mosaic-2m":
        return 2
    return None


def source_asset_from_hrdem(feature: dict[str, Any], role: str) -> tuple[str, int | None, dict[str, Any]]:
    collection = str(feature.get("collection", "unknown"))
    asset = feature["assets"][role]
    source_id = f"{collection}:{feature.get('id', 'unknown')}"
    resolution = resolution_from_collection(collection)
    source_asset = {
        "collection": collection,
        "id": str(feature.get("id", "unknown")),
        "assetRole": role,
        "href": str(asset["href"]),
        "type": str(asset.get("type", "unknown")),
    }
    return source_id, resolution, source_asset


def source_asset_from_lidarbc(attributes: dict[str, Any], role: str) -> tuple[str, int, dict[str, Any]]:
    year = attributes.get("year")
    year_text = str(year) if year is not None else "unknown"
    maptile = str(attributes.get("maptile") or attributes.get("filename") or "unknown")
    filename = str(attributes.get("filename") or "unknown")
    href = str(attributes.get("s3Url"))
    source_id = f"bc-lidarbc:{role}:{maptile}:{year_text}"
    source_asset = {
        "collection": "LiDAR_BC_S3_Public",
        "id": source_id,
        "assetRole": role,
        "href": href,
        "type": "image/tiff",
        "filename": filename,
        "spacing": str(attributes.get("spacing") or "1 metre inferred"),
        "year": year,
        "projection": attributes.get("projection"),
    }
    return source_id, 1, source_asset


def summarize_masked_array(data: np.ma.MaskedArray) -> dict[str, Any]:
    valid_count = int(data.count())
    total_count = int(data.size)
    summary: dict[str, Any] = {
        "windowPixels": total_count,
        "validPixels": valid_count,
        "noDataRatio": 1 - (valid_count / total_count if total_count else 0),
    }

    if valid_count:
        summary.update(
            {
                "minElevationMeters": float(data.min()),
                "maxElevationMeters": float(data.max()),
                "meanElevationMeters": float(data.mean()),
            }
        )

    return summary


def read_cog_coordinate_window(
    href: str, lat: float, lon: float, window_size: int
) -> tuple[dict[str, Any], np.ma.MaskedArray]:
    half_window = max(1, window_size // 2)
    with rasterio.Env(GDAL_HTTP_TIMEOUT="30", GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR"):
        with rasterio.open(href) as dataset:
            xs, ys = transform("EPSG:4326", dataset.crs, [lon], [lat])
            row, col = dataset.index(xs[0], ys[0])
            inside = 0 <= row < dataset.height and 0 <= col < dataset.width
            window = Window(col - half_window, row - half_window, window_size, window_size)
            data = dataset.read(1, window=window, masked=True, boundless=True)

            summary: dict[str, Any] = {
                "mode": "coordinate-window",
                "crs": str(dataset.crs),
                "resolution": [float(dataset.res[0]), float(dataset.res[1])],
                "nodata": None if dataset.nodata is None else float(dataset.nodata),
                "dtype": str(dataset.dtypes[0]),
                "row": int(row),
                "col": int(col),
                "insideRasterBounds": bool(inside),
            }
            summary.update(summarize_masked_array(data))

            return summary, data


def read_cog_web_tile(
    href: str, z: int, x: int, y: int, tile_size: int
) -> tuple[dict[str, Any], np.ma.MaskedArray]:
    west, south, east, north = tile_to_web_mercator_bounds(z, x, y)
    tile_transform = from_bounds(west, south, east, north, tile_size, tile_size)

    with rasterio.Env(GDAL_HTTP_TIMEOUT="30", GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR"):
        with rasterio.open(href) as dataset:
            with WarpedVRT(
                dataset,
                crs="EPSG:3857",
                transform=tile_transform,
                width=tile_size,
                height=tile_size,
                resampling=Resampling.bilinear,
                nodata=dataset.nodata,
            ) as vrt:
                data = vrt.read(1, masked=True)
                summary: dict[str, Any] = {
                    "mode": "web-mercator-tile",
                    "crs": "EPSG:3857",
                    "sourceCrs": str(dataset.crs),
                    "resolution": [
                        float((east - west) / tile_size),
                        float((north - south) / tile_size),
                    ],
                    "sourceResolution": [float(dataset.res[0]), float(dataset.res[1])],
                    "nodata": None if dataset.nodata is None else float(dataset.nodata),
                    "dtype": str(dataset.dtypes[0]),
                    "tile": {"z": z, "x": x, "y": y, "size": tile_size},
                    "insideRasterBounds": True,
                }
                summary.update(summarize_masked_array(data))
                if summary["validPixels"] == 0:
                    summary["insideRasterBounds"] = False
                return summary, data


def probe_cog(
    href: str, lat: float, lon: float, args: argparse.Namespace
) -> tuple[dict[str, Any], np.ma.MaskedArray]:
    if has_tile_args(args):
        return read_cog_web_tile(href, args.tile_z, args.tile_x, args.tile_y, args.tile_size)
    return read_cog_coordinate_window(href, lat, lon, args.window)


def render_elevation_png(data: np.ma.MaskedArray, output_path: Path) -> dict[str, Any]:
    valid_count = int(data.count())
    if valid_count == 0:
        return {
            "status": "blocked",
            "reason": "Cannot render a terrain tile with no valid COG pixels.",
        }

    masked = np.ma.array(data, copy=True)
    valid = ~np.ma.getmaskarray(masked)
    values = masked.compressed().astype("float32")
    low, high = np.percentile(values, [2, 98])
    if not np.isfinite(low) or not np.isfinite(high) or high <= low:
        low = float(values.min())
        high = float(values.max()) if float(values.max()) > low else low + 1

    filled = masked.filled(float(values.mean())).astype("float32")
    dy, dx = np.gradient(filled)
    slope = np.pi / 2 - np.arctan(np.sqrt(dx * dx + dy * dy) * 1.35)
    aspect = np.arctan2(-dx, dy)
    azimuth = np.deg2rad(315)
    altitude = np.deg2rad(45)
    hillshade = (
        np.sin(altitude) * np.sin(slope)
        + np.cos(altitude) * np.cos(slope) * np.cos(azimuth - aspect)
    )
    hillshade = np.clip((hillshade + 1) / 2, 0, 1)

    normalized = np.clip((filled - low) / (high - low), 0, 1)
    visual = np.clip(0.26 + 0.5 * hillshade + 0.24 * normalized, 0, 1)
    rgb = np.stack(
        [
            (visual * 215).astype("uint8"),
            (visual * 226).astype("uint8"),
            (visual * 219).astype("uint8"),
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
        "role": "terrain-preview",
        "ref": str(output_path.as_posix()),
        "validPixels": valid_count,
        "byteSize": output_path.stat().st_size,
    }


def build_result(args: argparse.Namespace) -> dict[str, Any]:
    role = args.role
    lat, lon = probe_coordinate(args)
    ground_role = "bare-earth-dtm" if role == "dtm" else "surface-dsm"
    base: dict[str, Any] = {
        "schemaVersion": "vmesh-terrain-cog-probe-v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "runClass": "live-proof",
        "providerId": args.provider,
        "label": args.label,
        "role": role,
        "groundModelRole": ground_role,
        "coordinateDisclosure": "exact-coordinate-included"
        if args.include_coordinate
        else "coordinate-redacted",
        "status": "failed",
        "resolutionMeters": None,
        "coverageSourceIds": [],
        "sourceAsset": None,
        "qa": None,
        "renderedArtifact": None,
        "reasons": [],
    }

    if args.include_coordinate:
        base["coordinate"] = {"latitude": lat, "longitude": lon}
    if has_tile_args(args):
        base["tile"] = {"z": args.tile_z, "x": args.tile_x, "y": args.tile_y}

    if args.provider == "bc-lidarbc":
        candidates = search_lidarbc(lat, lon, role)
        if not candidates:
            return {
                **base,
                "status": "blocked",
                "reasons": [
                    f"LidarBC FeatureServer did not return a 1m {role.upper()} GeoTIFF for this coordinate."
                ],
            }

        source_id, resolution, source_asset = source_asset_from_lidarbc(candidates[0], role)
    else:
        candidates = search_hrdem(lat, lon, role)
        if not candidates:
            return {
                **base,
                "status": "blocked",
                "reasons": ["Canada HRDEM STAC did not return a COG asset for this role."],
            }

        blocked_attempts: list[str] = []
        candidate_results: list[tuple[str, int | None, dict[str, Any], dict[str, Any], Any]] = []

        for candidate in candidates:
            source_id, resolution, source_asset = source_asset_from_hrdem(candidate, role)
            if resolution != 1 and not args.allow_2m_fallback:
                return {
                    **base,
                    "status": "blocked",
                    "resolutionMeters": resolution,
                    "coverageSourceIds": [source_id],
                    "sourceAsset": source_asset,
                    "reasons": [
                        "Canada HRDEM STAC found only a non-1m source asset for this role. "
                        "This does not satisfy the current 1m DTM/DSM milestone."
                    ],
                }

            qa, data = probe_cog(str(source_asset["href"]), lat, lon, args)
            valid_pixels = int(qa["validPixels"])
            if valid_pixels > 0 and qa["insideRasterBounds"]:
                candidate_results.append((source_id, resolution, source_asset, qa, data))
                break

            blocked_attempts.append(
                f"{source_id} had {valid_pixels} valid pixels at this coordinate/window."
            )

            if not args.allow_2m_fallback:
                break

        if not candidate_results:
            source_id, resolution, source_asset = source_asset_from_hrdem(candidates[0], role)
            return {
                **base,
                "status": "blocked",
                "resolutionMeters": resolution,
                "coverageSourceIds": [source_id],
                "sourceAsset": source_asset,
                "qa": None,
                "renderedArtifact": None,
                "reasons": [
                    "The HRDEM COG asset exists, but the sampled window contains no valid pixels.",
                    *blocked_attempts,
                ],
            }

        source_id, resolution, source_asset, qa, data = candidate_results[0]

    if not candidates:
        return {
            **base,
            "status": "blocked",
            "reasons": ["Canada HRDEM STAC did not return a COG asset for this role."],
        }

    if args.provider == "bc-lidarbc":
        href = str(source_asset["href"])

        if resolution != 1 and not args.allow_2m_fallback:
            return {
                **base,
                "status": "blocked",
                "resolutionMeters": resolution,
                "coverageSourceIds": [source_id],
                "sourceAsset": source_asset,
                "reasons": [
                    "LidarBC returned only a non-1m source asset for this role. "
                    "This does not satisfy the current 1m DTM/DSM milestone."
                ],
            }

        qa, data = probe_cog(href, lat, lon, args)
        valid_pixels = int(qa["validPixels"])
        status = "covered" if valid_pixels > 0 and qa["insideRasterBounds"] else "blocked"
        reasons: list[str] = []
        if status != "covered":
            reasons.append(
                "The LidarBC GeoTIFF asset exists, but the sampled window contains no valid pixels."
            )
    else:
        status = "covered"
        reasons = []

    rendered_artifact = None
    if args.render_output and status == "covered":
        rendered_artifact = render_elevation_png(data, Path(args.render_output))
        if rendered_artifact.get("status") != "ready":
            status = "blocked"
            reasons.append(str(rendered_artifact.get("reason", "Rendered tile was blocked.")))

    return {
        **base,
        "status": status,
        "resolutionMeters": resolution,
        "coverageSourceIds": [source_id],
        "sourceAsset": source_asset,
        "qa": qa,
        "renderedArtifact": rendered_artifact,
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
    except Exception as exc:
        print(
            json.dumps(
                {
                    "schemaVersion": "vmesh-terrain-cog-probe-v1",
                    "generatedAt": datetime.now(timezone.utc).isoformat(),
                    "runClass": "live-proof",
                    "status": "failed",
                    "reasons": [str(exc)],
                },
                indent=2,
            ),
            file=sys.stderr,
        )
        raise SystemExit(1)

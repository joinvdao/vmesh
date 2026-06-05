#!/usr/bin/env python
"""Render public-safe USGS 3DEP 1 m DTM preview tiles from official services.

This is a worker-side proof utility. It verifies the USGS 3DEP 1 m product
index or the official 1 m source DEM index at the requested coordinate/tile
center before writing a rendered tile from the official 3DEPElevation
ImageServer.
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


USGS_3DEP_INDEX_QUERY_URL = (
    "https://index.nationalmap.gov/arcgis/rest/services/3DEPElevationIndex/MapServer/1/query"
)
USGS_3DEP_SOURCE_DEM_INDEX_QUERY_URL = (
    "https://index.nationalmap.gov/arcgis/rest/services/3DEPElevationIndex/MapServer/11/query"
)
USGS_3DEP_IMAGE_EXPORT_URL = (
    "https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage"
)
WEB_MERCATOR_RADIUS = 6378137
WEB_MERCATOR_ORIGIN = math.pi * WEB_MERCATOR_RADIUS
BLANK_IMAGE_BYTE_THRESHOLD = 1024


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Render a USGS 3DEP 1 m DTM tile.")
    parser.add_argument("--lat", type=float, help="Latitude in WGS84.")
    parser.add_argument("--lon", type=float, help="Longitude in WGS84.")
    parser.add_argument("--tile-z", type=int, help="Web Mercator tile z.")
    parser.add_argument("--tile-x", type=int, help="Web Mercator tile x.")
    parser.add_argument("--tile-y", type=int, help="Web Mercator tile y.")
    parser.add_argument("--role", choices=("dtm", "dsm"), default="dtm")
    parser.add_argument("--label", default="public-safe USGS 3DEP tile proof")
    parser.add_argument("--tile-size", type=int, default=256)
    parser.add_argument("--output", help="Optional JSON output path.")
    parser.add_argument("--render-output", help="Optional rendered tile output path.")
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


def http_json(url: str) -> dict[str, Any]:
    request = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def coverage_query_url(lat: float, lon: float) -> str:
    params = {
        "f": "json",
        "where": "1=1",
        "geometry": f"{lon},{lat}",
        "geometryType": "esriGeometryPoint",
        "inSR": "4326",
        "spatialRel": "esriSpatialRelIntersects",
        "outFields": "*",
        "returnGeometry": "false",
    }
    return f"{USGS_3DEP_INDEX_QUERY_URL}?{urllib.parse.urlencode(params)}"


def source_dem_query_url(lat: float, lon: float) -> str:
    params = {
        "f": "json",
        "where": "1=1",
        "geometry": f"{lon:.6f},{lat:.6f}",
        "geometryType": "esriGeometryPoint",
        "inSR": "4326",
        "spatialRel": "esriSpatialRelIntersects",
        "outFields": "*",
        "returnGeometry": "false",
    }
    return f"{USGS_3DEP_SOURCE_DEM_INDEX_QUERY_URL}?{urllib.parse.urlencode(params)}"


def coverage_source_ids(data: dict[str, Any]) -> list[str]:
    features = data.get("features")
    if not isinstance(features, list):
        return []
    ids: list[str] = []
    for index, feature in enumerate(features):
        attrs = feature.get("attributes", {}) if isinstance(feature, dict) else {}
        if not isinstance(attrs, dict):
            attrs = {}
        object_id = attrs.get("OBJECTID") or attrs.get("objectid") or attrs.get("fid") or index
        ids.append(f"usgs-3dep-1m-product-index:{object_id}")
    return ids


def source_dem_selection(data: dict[str, Any]) -> dict[str, Any] | None:
    features = data.get("features")
    if not isinstance(features, list):
        return None

    candidates: list[dict[str, Any]] = []
    for index, feature in enumerate(features):
        attrs = feature.get("attributes", {}) if isinstance(feature, dict) else {}
        if not isinstance(attrs, dict):
            continue

        source_dem_link = attrs.get("sourcedem_link")
        workunit = attrs.get("workunit")
        project = attrs.get("project") or workunit
        dem_gsd_meters = attrs.get("dem_gsd_meters")
        if not isinstance(source_dem_link, str) or not source_dem_link.startswith(("http://", "https://")):
            continue
        if not isinstance(workunit, str) or not workunit:
            continue
        if not isinstance(project, str) or not project:
            continue
        if not isinstance(dem_gsd_meters, (int, float)) or dem_gsd_meters > 1:
            continue

        source_dem_category = str(attrs.get("sourcedem_category") or "").lower()
        source_dem_reason = str(attrs.get("sourcedem_reason") or "").lower()
        one_meter_category = str(attrs.get("onemeter_category") or "").lower()
        one_meter_reason = str(attrs.get("onemeter_reason") or "").lower()
        source_dem_meets = (
            source_dem_category == "meets"
            or "meets 3dep source dem requirements" in source_dem_reason
        )
        one_meter_meets = (
            one_meter_category == "meets"
            or "meets 3dep 1-m dem requirements" in one_meter_reason
        )
        if not source_dem_meets or not one_meter_meets:
            continue

        object_id = attrs.get("OBJECTID") or attrs.get("objectid") or attrs.get("fid") or index
        candidates.append(
            {
                "sourceId": f"usgs-3dep-source-dem:{object_id}",
                "sourceDemLink": source_dem_link,
                "metadataLink": attrs.get("metadata_link"),
                "workunit": workunit,
                "project": project,
                "objectId": object_id,
                "qualityLevel": attrs.get("ql"),
                "specification": attrs.get("spec"),
                "pointMethod": attrs.get("p_method"),
                "demGsdMeters": float(dem_gsd_meters),
                "horizontalCrs": attrs.get("horiz_crs"),
                "verticalCrs": attrs.get("vert_crs"),
                "geoid": attrs.get("geoid"),
                "sourceDemCategory": attrs.get("sourcedem_category"),
                "sourceDemReason": attrs.get("sourcedem_reason"),
                "oneMeterCategory": attrs.get("onemeter_category"),
                "oneMeterReason": attrs.get("onemeter_reason"),
                "seamlessCategory": attrs.get("seamless_category"),
                "seamlessReason": attrs.get("seamless_reason"),
                "collectionEnd": attrs.get("collect_end") if isinstance(attrs.get("collect_end"), (int, float)) else 0,
            }
        )

    candidates.sort(key=lambda item: (item["demGsdMeters"], -(item["collectionEnd"] or 0)))
    return candidates[0] if candidates else None


def export_image_url(args: argparse.Namespace) -> str:
    if not has_tile_args(args):
        raise ValueError("USGS render output requires --tile-z --tile-x --tile-y.")
    bbox = tile_to_web_mercator_bounds(args.tile_z, args.tile_x, args.tile_y)
    params = {
        "bbox": ",".join(f"{value:.6f}" for value in bbox),
        "bboxSR": "3857",
        "imageSR": "3857",
        "size": f"{args.tile_size},{args.tile_size}",
        "format": "png32",
        "f": "image",
        "renderingRule": json.dumps({"rasterFunction": "Hillshade Gray"}),
    }
    return f"{USGS_3DEP_IMAGE_EXPORT_URL}?{urllib.parse.urlencode(params)}"


def fetch_rendered_tile(url: str, output_path: Path) -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        headers={"Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"},
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        content_type = response.headers.get("content-type", "application/octet-stream")
        body = response.read()

    if len(body) <= BLANK_IMAGE_BYTE_THRESHOLD:
        return {
            "status": "blocked",
            "reason": "USGS 3DEP ImageServer returned a blank or too-small rendered tile.",
            "contentType": content_type,
            "byteSize": len(body),
        }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(body)
    return {
        "status": "ready",
        "kind": "png" if "png" in content_type.lower() else "image",
        "role": "terrain-preview",
        "ref": output_path.as_posix(),
        "contentType": content_type,
        "byteSize": len(body),
    }


def base_result(args: argparse.Namespace, lat: float, lon: float) -> dict[str, Any]:
    result: dict[str, Any] = {
        "schemaVersion": "vmesh-usgs-3dep-render-v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "runClass": "live-proof",
        "providerId": "usgs-3dep",
        "label": args.label,
        "role": args.role,
        "groundModelRole": "bare-earth-dtm" if args.role == "dtm" else "surface-dsm",
        "coordinateDisclosure": "exact-coordinate-included"
        if args.include_coordinate
        else "coordinate-redacted",
        "status": "failed",
        "resolutionMeters": None,
        "coverageSourceIds": [],
        "sourceService": {
            "coverage": USGS_3DEP_INDEX_QUERY_URL,
            "sourceDemCoverage": USGS_3DEP_SOURCE_DEM_INDEX_QUERY_URL,
            "render": USGS_3DEP_IMAGE_EXPORT_URL,
        },
        "qa": None,
        "sourceAsset": None,
        "renderedArtifact": None,
        "reasons": [],
    }
    if args.include_coordinate:
        result["coordinate"] = {"latitude": lat, "longitude": lon}
    if has_tile_args(args):
        result["tile"] = {"z": args.tile_z, "x": args.tile_x, "y": args.tile_y}
    return result


def build_result(args: argparse.Namespace) -> dict[str, Any]:
    lat, lon = probe_coordinate(args)
    result = base_result(args, lat, lon)

    if args.role != "dtm":
        return {
            **result,
            "status": "blocked",
            "reasons": [
                "USGS 3DEP DEM/ImageServer route is DTM only; USA DSM display requires a separate LPC/IfSAR surface-model derivation worker."
            ],
        }

    coverage = http_json(coverage_query_url(lat, lon))
    source_ids = coverage_source_ids(coverage)
    coverage_method = "1m-product-index"
    source_asset = None
    if not source_ids:
        source_dem_coverage = http_json(source_dem_query_url(lat, lon))
        selected_source_dem = source_dem_selection(source_dem_coverage)
        if selected_source_dem:
            source_ids = [selected_source_dem["sourceId"]]
            coverage_method = "source-dem-index"
            source_asset = {
                "collection": "USGS 3DEP Source DEM",
                "id": selected_source_dem["sourceId"],
                "assetRole": "dtm",
                "href": selected_source_dem["sourceDemLink"],
                "type": "source-index",
                "workunit": selected_source_dem["workunit"],
                "project": selected_source_dem["project"],
            }
        else:
            return {
                **result,
                "status": "blocked",
                "reasons": [
                    "USGS 3DEP 1 m product index and source DEM index did not cover the requested coordinate."
                ],
            }

    rendered_artifact = None
    if args.render_output:
        rendered_artifact = fetch_rendered_tile(export_image_url(args), Path(args.render_output))
        if rendered_artifact.get("status") != "ready":
            return {
                **result,
                "status": "blocked",
                "resolutionMeters": 1,
                "coverageSourceIds": source_ids,
                "qa": {
                    "coverageStatus": "contains-aoi",
                    "coverageFeatureCount": len(source_ids),
                    "coverageMethod": coverage_method,
                    "renderStatus": rendered_artifact.get("status"),
                },
                "sourceAsset": source_asset,
                "renderedArtifact": rendered_artifact,
                "reasons": [str(rendered_artifact.get("reason", "USGS rendered tile blocked."))],
            }

    return {
        **result,
        "status": "covered",
        "resolutionMeters": 1,
        "coverageSourceIds": source_ids,
        "qa": {
            "coverageStatus": "contains-aoi",
            "coverageFeatureCount": len(source_ids),
            "coverageMethod": coverage_method,
            "renderStatus": "ready" if rendered_artifact else "not-requested",
        },
        "sourceAsset": source_asset,
        "renderedArtifact": rendered_artifact,
        "reasons": [],
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
                    "schemaVersion": "vmesh-usgs-3dep-render-v1",
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

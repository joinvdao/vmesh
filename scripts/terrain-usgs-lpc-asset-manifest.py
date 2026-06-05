#!/usr/bin/env python
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

USGS_LPC_INDEX_QUERY_URL = (
    "https://index.nationalmap.gov/arcgis/rest/services/"
    "3DEPElevationIndex/MapServer/8/query"
)
USGS_LPC_FALLBACK_INDEX_QUERY_URL = (
    "https://index.nationalmap.gov/arcgis/rest/services/"
    "3DEPElevationIndex/MapServer/24/query"
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create a retained manifest of USGS 3DEP LPC LAZ/LAS assets for DSM derivation."
    )
    parser.add_argument("--lat", type=float)
    parser.add_argument("--lon", type=float)
    parser.add_argument("--tile-z", type=int)
    parser.add_argument("--tile-x", type=int)
    parser.add_argument("--tile-y", type=int)
    parser.add_argument("--label", default="public-safe USGS LPC DSM asset manifest")
    parser.add_argument("--output")
    parser.add_argument("--include-coordinate", action="store_true")
    parser.add_argument("--sample-assets", type=int, default=10)
    parser.add_argument("--head-sample-size", type=int, default=5)
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
    if args.sample_assets < 0 or args.sample_assets > 100:
        raise ValueError("--sample-assets must be between 0 and 100.")
    if args.head_sample_size < 0 or args.head_sample_size > args.sample_assets:
        raise ValueError("--head-sample-size must be between 0 and --sample-assets.")


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
            try:
                return int(value)
            except ValueError:
                return None
    except Exception:
        return None


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


def query_lpc_source(coordinate: dict[str, float]) -> dict[str, Any] | None:
    for url in lpc_query_urls(coordinate):
        try:
            selected = select_lpc_source(http_json(url))
        except Exception:
            continue
        if selected:
            return selected
    return None


def file_links_url(source: dict[str, Any]) -> str:
    return f"{source['lpcLink']}/0_file_download_links.txt"


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


def asset_record(href: str, byte_size: int | None) -> dict[str, Any]:
    path = urllib.parse.urlparse(href).path
    filename = Path(path).name
    return {
        "href": href,
        "filename": filename,
        "format": "laz" if filename.lower().endswith(".laz") else "las",
        "byteSize": byte_size,
    }


def build_result(args: argparse.Namespace) -> dict[str, Any]:
    coordinate = probe_coordinate(args)
    selected = query_lpc_source(coordinate)
    base = {
        "schemaVersion": "vmesh-usgs-lpc-dsm-asset-manifest-v1",
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
        "derivationReadiness": {
            "pdalInstalled": shutil.which("pdal") is not None,
            "laspyInstalled": False,
            "canDeriveDsmInCurrentRuntime": False,
        },
        "renderedArtifact": None,
        "reasons": [],
    }
    if args.include_coordinate:
        base["coordinate"] = coordinate
    if has_tile_args(args):
        base["tile"] = {"z": args.tile_z, "x": args.tile_x, "y": args.tile_y}

    try:
        import importlib.util

        base["derivationReadiness"]["laspyInstalled"] = (
            importlib.util.find_spec("laspy") is not None
        )
    except Exception:
        base["derivationReadiness"]["laspyInstalled"] = False
    base["derivationReadiness"]["canDeriveDsmInCurrentRuntime"] = bool(
        base["derivationReadiness"]["pdalInstalled"] or base["derivationReadiness"]["laspyInstalled"]
    )

    if not selected:
        return {
            **base,
            "status": "blocked",
            "reasons": [
                "USGS 3DEP LPC index did not return a 1m-class source project that meets 3DEP LPC requirements for this coordinate."
            ],
        }

    links_text_href = file_links_url(selected)
    links = asset_links_from_text(http_text(links_text_href))
    sample_hrefs = links[: args.sample_assets]
    sample_assets = []
    for index, href in enumerate(sample_hrefs):
        size = http_head_size(href) if index < args.head_sample_size else None
        sample_assets.append(asset_record(href, size))

    return {
        **base,
        "status": "assets-enumerated" if links else "blocked",
        "resolutionMeters": selected["demGsdMeters"],
        "coverageSourceIds": [selected["sourceId"]],
        "sourceAsset": {
            "collection": "USGS 3DEP Lidar Point Cloud",
            "id": selected["sourceId"],
            "assetRole": "source-index",
            "href": selected["lpcLink"],
            "metadataHref": selected["metadataLink"],
            "sourceDemHref": selected["sourcedemLink"],
            "type": "source-index",
            "workunit": selected["workunit"],
            "project": selected["project"],
            "qualityLevel": selected["qualityLevel"],
            "specification": selected["specification"],
            "pointMethod": selected["pointMethod"],
            "demGsdMeters": selected["demGsdMeters"],
            "horizontalCrs": selected["horizontalCrs"],
            "verticalCrs": selected["verticalCrs"],
            "geoid": selected["geoid"],
        },
        "assetManifest": {
            "kind": "point-cloud-source-links",
            "sourceLinksHref": links_text_href,
            "assetCount": len(links),
            "sampleAssetCount": len(sample_assets),
            "sampleAssets": sample_assets,
            "selectionPolicy": "Project-wide source manifest. A DSM derivation worker must spatially filter these LAZ/LAS assets to the requested AOI before download/processing.",
        },
        "reasons": []
        if links
        else ["USGS LPC source project did not expose LAZ/LAS links in 0_file_download_links.txt."],
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
    return 0 if result["status"] == "assets-enumerated" else 2


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(
            json.dumps(
                {
                    "schemaVersion": "vmesh-usgs-lpc-dsm-asset-manifest-v1",
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

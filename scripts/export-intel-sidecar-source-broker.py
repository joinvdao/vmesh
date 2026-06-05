#!/usr/bin/env python3
"""Export Intel Tools sidecar outputs into a public-safe VMesh source broker package."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sqlite3
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse


SCHEMA_VERSION = "vmesh-intel-source-broker-package-v1"
DEFAULT_OUTPUT = Path(".artifacts/source-broker/intel-sidecar-source-broker-package.json")

SEGMENT_LABELS = {
    "terrain_elevation": "Terrain, elevation, DTM, DSM, DEM, and LiDAR",
    "imagery_observation": "Imagery, orthophoto, aerial, and observation sources",
    "water_hydrology": "Water, hydrology, watersheds, streams, flood, and drainage",
    "access_infrastructure": "Roads, access, tracks, utilities, and infrastructure",
    "land_property_planning": "Land, property, parcels, planning, zoning, and constraints",
    "soils_landcover": "Soils, landcover, vegetation, and agricultural capability",
    "climate_weather": "Climate, weather, solar, wind, and fire-weather context",
    "ecology_biodiversity_carbon": "Ecology, biodiversity, species, habitat, and carbon",
    "agriculture_operations": "Agriculture, crop models, machinery, robotics, and inputs",
    "community_economy": "Markets, producers, suppliers, community, education, and third spaces",
    "research_only": "Research-only evidence, PDFs, papers, standards, and constants references",
    "operator_review": "Operator review queue",
}

ECOSYSTEM_SEGMENTS = {
    "soils_landcover",
    "climate_weather",
    "ecology_biodiversity_carbon",
    "agriculture_operations",
    "community_economy",
    "research_only",
}

MACHINE_ENDPOINT_TYPES = {
    "stac",
    "arcgis_feature_server",
    "arcgis_image_server",
    "ckan",
    "ogc",
    "api_json",
    "static_download",
}

SECRET_QUERY_KEYS = re.compile(
    r"(token|key|secret|signature|sig|credential|authorization|auth|password|client|expires)",
    re.IGNORECASE,
)
EMAIL_PATTERN = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")


@dataclass
class DbInput:
    file_name: str
    import_mode: str


DB_INPUTS = [
    DbInput("additive_full_world_20260524.db", "primary-source-registry"),
    DbInput("additive_reruns_20260523_live_v3.db", "dedupe-cross-check"),
    DbInput("additive_geospatial_followup.db", "geospatial-followup"),
    DbInput("additive_eco_followup.db", "ecosystem-reference-registry"),
    DbInput("vmesh_campaign_20260525.db", "planned-campaign"),
]


def stable_id(*parts: str, prefix: str = "intel") -> str:
    material = "|".join(part.strip().lower() for part in parts if part).encode("utf-8")
    return f"{prefix}-{hashlib.sha256(material).hexdigest()[:16]}"


def text(value: Any, fallback: str = "") -> str:
    if value is None:
        return fallback
    return str(value).strip()


def public_text(value: Any, fallback: str = "") -> str:
    return EMAIL_PATTERN.sub("[redacted-email]", text(value, fallback))


def parse_number(value: Any, fallback: float = 0.0) -> float:
    if value is None:
        return fallback
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def table_exists(conn: sqlite3.Connection, table_name: str) -> bool:
    row = conn.execute(
        "select 1 from sqlite_master where type='table' and name = ? limit 1", (table_name,)
    ).fetchone()
    return row is not None


def redact_url(value: str) -> str:
    candidate = value.strip()
    if not candidate:
        return ""
    parsed = urlparse(candidate)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return ""
    safe_params = [
        (key, param_value)
        for key, param_value in parse_qsl(parsed.query, keep_blank_values=True)
        if not SECRET_QUERY_KEYS.search(key)
    ]
    return urlunparse(
        (
            parsed.scheme,
            parsed.netloc.lower(),
            parsed.path,
            "",
            urlencode(safe_params, doseq=True),
            "",
        )
    )


def public_host_score(url: str) -> int:
    host = urlparse(url).netloc.lower()
    if not host:
        return 0
    if any(term in host for term in ["gov", "gc.ca", "canada.ca", "nrcan", "usgs"]):
        return 18
    if any(term in host for term in ["edu", "ac.uk", "university", "fao", "nasa", "noaa"]):
        return 12
    if any(term in host for term in ["github.com", "data", "catalog", "arcgis"]):
        return 8
    return 2


def endpoint_type(raw_endpoint_type: str, url: str, source_family: str) -> str:
    value = " ".join([raw_endpoint_type, url, source_family]).lower()
    if "stac" in value:
        return "stac"
    if "featureserver" in value or "feature server" in value:
        return "arcgis_feature_server"
    if "imageserver" in value or "image server" in value:
        return "arcgis_image_server"
    if "arcgis" in value:
        return "arcgis_feature_server"
    if "ckan" in value:
        return "ckan"
    if "wms" in value or "wfs" in value or "wcs" in value or "wmts" in value or "ogc" in value:
        return "ogc"
    if "api" in value or "json" in value:
        return "api_json"
    if "download" in value or re.search(r"\.(zip|laz|las|tif|tiff|gpkg|parquet|csv)($|[?#])", value):
        return "static_download"
    if "pdf" in value or value.endswith(".pdf"):
        return "pdf"
    if any(term in value for term in ["catalog", "catalogue", "data portal", "html", "web"]):
        return "html_catalog"
    return "unknown"


def contains_any(value: str, terms: list[str]) -> bool:
    return any(term in value for term in terms)


def classify_segments(record: dict[str, Any], detected_endpoint_type: str) -> list[str]:
    haystack = " ".join(
        text(record.get(key)).lower()
        for key in [
            "canonical_name",
            "provider",
            "region",
            "jurisdiction",
            "source_family",
            "source_category",
            "dataset_name",
            "data_category",
            "vmesh_role",
            "ba_relevance",
            "official_url",
            "endpoint_url",
        ]
    )
    segments: list[str] = []

    if contains_any(haystack, ["terrain", "lidar", "elevation", "dem", "dtm", "dsm", "hrdem"]):
        segments.append("terrain_elevation")
    if contains_any(haystack, ["imagery", "orthophoto", "aerial", "satellite", "sentinel", "landsat"]):
        segments.append("imagery_observation")
    if contains_any(haystack, ["hydro", "water", "flood", "river", "stream", "lake", "watershed"]):
        segments.append("water_hydrology")
    if contains_any(haystack, ["road", "access", "trail", "track", "utility", "infrastructure"]):
        segments.append("access_infrastructure")
    if contains_any(haystack, ["parcel", "property", "cadastral", "planning", "zoning", "constraint"]):
        segments.append("land_property_planning")
    if contains_any(haystack, ["soil", "landcover", "land cover", "vegetation", "crop capability"]):
        segments.append("soils_landcover")
    if contains_any(haystack, ["climate", "weather", "meteo", "solar", "wind", "noaa", "nasa power"]):
        segments.append("climate_weather")
    if contains_any(haystack, ["biodiversity", "species", "carbon", "habitat", "ecology", "ecosystem"]):
        segments.append("ecology_biodiversity_carbon")
    if contains_any(haystack, ["crop", "machinery", "tractor", "robot", "aqua", "market_inputs"]):
        segments.append("agriculture_operations")
    if contains_any(
        haystack,
        ["market", "producer", "supplier", "community", "third space", "education", "volunteer"],
    ):
        segments.append("community_economy")
    if detected_endpoint_type == "pdf" or contains_any(
        haystack,
        ["researchgate", "sciencedirect", "paper", "publication", "standard", "constant"],
    ):
        segments.append("research_only")

    if not segments:
        segments.append("operator_review")

    return sorted(set(segments))


def adapter_for(detected_endpoint_type: str) -> str | None:
    return {
        "stac": "stac-search",
        "arcgis_feature_server": "arcgis-feature-server",
        "arcgis_image_server": "arcgis-image-server",
        "ckan": "ckan-package-resource",
        "ogc": "ogc-capabilities",
        "api_json": "bounded-api-json",
        "static_download": "static-download",
        "html_catalog": "catalog-review",
        "pdf": "research-evidence",
    }.get(detected_endpoint_type)


def fetch_recipe(detected_endpoint_type: str) -> dict[str, Any] | None:
    adapter = adapter_for(detected_endpoint_type)
    if not adapter:
        return None
    steps_by_adapter = {
        "stac-search": ["Query collections/items by AOI.", "Return provider-native STAC assets."],
        "arcgis-feature-server": [
            "Query service/layer metadata.",
            "Run bounded intersects query for the AOI.",
            "Extract asset URLs or feature refs for the downstream worker.",
        ],
        "arcgis-image-server": ["Query ImageServer metadata.", "Request bounded export/identify refs."],
        "ckan-package-resource": ["Resolve package/resource metadata.", "Select public resources by AOI/domain."],
        "ogc-capabilities": ["Fetch GetCapabilities.", "Select compatible layer and bounded request shape."],
        "bounded-api-json": ["Call documented API with bounded AOI/point parameters.", "Preserve response provenance."],
        "static-download": ["Verify license and file type.", "Hand provider-native download refs to worker."],
        "catalog-review": ["Review catalog page for machine-readable endpoint or download refs."],
        "research-evidence": ["Use as provenance/constants evidence, not as an operational data feed."],
    }
    return {"adapter": adapter, "steps": steps_by_adapter[adapter]}


def license_status(record: dict[str, Any], probe: dict[str, Any] | None) -> str:
    values = [
        text(record.get("licence")),
        text(record.get("license")),
        text(record.get("access_model")),
        text(probe.get("license_status") if probe else ""),
    ]
    joined = " ".join(values).lower()
    if not joined or "unknown" in joined:
        return "unknown"
    if "open" in joined or "public" in joined or "ogl" in joined or "cc by" in joined:
        return "open_or_public"
    if "paid" in joined or "commercial" in joined or "license" in joined:
        return "needs_review"
    return "documented"


def classify_status(record: dict[str, Any], detected_endpoint_type: str, probe: dict[str, Any] | None) -> str:
    qa_status = text(record.get("qa_status")).lower()
    probe_status = text(record.get("probe_status")).lower()
    source_family = text(record.get("source_family")).lower()
    source_category = text(record.get("source_category")).lower()
    access_model = text(record.get("access_model")).lower()
    cost = text(record.get("cost")).lower()
    detected_license = license_status(record, probe)

    if "blocked" in qa_status or "paid" in access_model or "paid" in cost:
        return "blocked"
    if detected_endpoint_type == "pdf" or "research" in source_family:
        return "research_only"
    if source_category == "ecological_simulation_constants":
        return "research_only"
    if detected_endpoint_type == "html_catalog" and source_family in {"generic_html", "live_discovery_candidate"}:
        return "noisy_candidate"
    if detected_endpoint_type in MACHINE_ENDPOINT_TYPES:
        if detected_license == "unknown":
            return "needs_license_review"
        if probe and text(probe.get("access_status")).lower() == "reachable":
            return "adapter_ready"
        if probe_status == "reachable":
            return "ready_source_ref"
        return "needs_probe"
    if qa_status == "needs_review":
        return "needs_review"
    return "candidate"


def confidence_score(record: dict[str, Any], detected_endpoint_type: str, probe: dict[str, Any] | None) -> int:
    score = 18
    score += int(parse_number(record.get("machine_readability_score"), 0) * 8)
    score += int(parse_number(record.get("vmesh_relevance_score"), 0) * 6)
    if detected_endpoint_type in MACHINE_ENDPOINT_TYPES:
        score += 22
    if probe and text(probe.get("access_status")).lower() == "reachable":
        score += 18
    if public_host_score(text(record.get("endpoint_url")) or text(record.get("official_url"))) >= 12:
        score += 10
    if text(record.get("qa_status")).lower() == "needs_review":
        score -= 8
    return max(0, min(score, 100))


def eval_site_relevance(record: dict[str, Any]) -> list[str]:
    haystack = " ".join(
        text(record.get(key)).lower()
        for key in ["canonical_name", "provider", "region", "jurisdiction", "coverage_area", "official_url"]
    )
    sites: list[str] = []
    if any(term in haystack for term in ["british columbia", "lidarbc", "bc data", "gov.bc.ca", "canada"]):
        sites.append("kamloops-rose")
    if any(term in haystack for term in ["alberta", "open.alberta.ca", "canada"]):
        sites.append("alberta-golden")
    return sorted(set(sites))


def priority_score(
    record: dict[str, Any],
    segments: list[str],
    detected_endpoint_type: str,
    status: str,
    site_relevance: list[str],
) -> int:
    score = 0
    score += public_host_score(text(record.get("endpoint_url")) or text(record.get("official_url")))
    score += 24 if detected_endpoint_type in MACHINE_ENDPOINT_TYPES else 0
    score += 16 if status in {"adapter_ready", "ready_source_ref", "needs_license_review", "needs_probe"} else 0
    score += 24 if site_relevance else 0
    if "terrain_elevation" in segments:
        score += 22
    if "water_hydrology" in segments or "soils_landcover" in segments:
        score += 12
    if any(segment in ECOSYSTEM_SEGMENTS for segment in segments):
        score += 8
    if status in {"noisy_candidate", "blocked"}:
        score -= 18
    return max(score, 0)


def review_actions(status: str, detected_endpoint_type: str) -> list[str]:
    if status == "adapter_ready":
        return ["connect_adapter_to_ba_package", "schedule_aoi_live_proof"]
    if status == "ready_source_ref":
        return ["probe_aoi_coverage", "connect_adapter_to_ba_package"]
    if status == "needs_license_review":
        return ["review_license_and_commercial_use", "probe_aoi_coverage"]
    if status == "needs_probe":
        return ["probe_endpoint", "classify_aoi_coverage"]
    if status == "research_only":
        return ["extract_numeric_or_provenance_evidence"]
    if status == "noisy_candidate":
        return ["dedupe_or_reject_noisy_candidate"]
    if detected_endpoint_type == "html_catalog":
        return ["find_machine_readable_endpoint"]
    return ["operator_review"]


def row_to_dict(cursor: sqlite3.Cursor, row: tuple[Any, ...]) -> dict[str, Any]:
    return {description[0]: row[index] for index, description in enumerate(cursor.description)}


def load_probe_by_record_id(conn: sqlite3.Connection) -> dict[str, dict[str, Any]]:
    if not table_exists(conn, "source_endpoint_probes"):
        return {}
    cursor = conn.execute("select * from source_endpoint_probes")
    probes: dict[str, dict[str, Any]] = {}
    for row in cursor.fetchall():
        probe = row_to_dict(cursor, row)
        record_id = text(probe.get("source_registry_record_id"))
        if not record_id:
            continue
        current = probes.get(record_id)
        if current is None or text(probe.get("access_status")) == "reachable":
            probes[record_id] = probe
    return probes


def evidence_ref_count(value: str) -> int:
    if not value:
        return 0
    try:
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return len(parsed)
        if isinstance(parsed, dict):
            return len(parsed)
    except json.JSONDecodeError:
        pass
    return 1


def normalize_record(
    source_db: str,
    import_mode: str,
    record: dict[str, Any],
    probe: dict[str, Any] | None,
) -> dict[str, Any]:
    official_url = redact_url(text(record.get("official_url")))
    clean_endpoint_url = redact_url(text(record.get("endpoint_url"))) or official_url
    detected_endpoint_type = endpoint_type(
        text(record.get("endpoint_type")), clean_endpoint_url, text(record.get("source_family"))
    )
    segments = classify_segments(record, detected_endpoint_type)
    status = classify_status(record, detected_endpoint_type, probe)
    site_relevance = eval_site_relevance(record)
    confidence = confidence_score(record, detected_endpoint_type, probe)
    priority = priority_score(record, segments, detected_endpoint_type, status, site_relevance)
    title = (
        public_text(record.get("canonical_name"))
        or public_text(record.get("dataset_name"))
        or clean_endpoint_url
    )
    provider = public_text(record.get("provider")) or urlparse(clean_endpoint_url).netloc or "Unknown provider"

    source_id = stable_id(provider, title, clean_endpoint_url or official_url, prefix="intel-source")
    provenance = {
        "runId": text(record.get("research_run_id")) or import_mode,
        "sourceDb": source_db,
        "recordId": text(record.get("id")) or source_id,
        "evidenceRefCount": evidence_ref_count(text(record.get("evidence_refs"))),
    }
    limitations = [
        "Imported from Intel Tools candidate intelligence; VMesh must keep promotion/review state.",
    ]
    if license_status(record, probe) == "unknown":
        limitations.append("License/access posture is unknown until operator review.")
    if status in {"noisy_candidate", "needs_review"}:
        limitations.append("Candidate needs dedupe or source-quality review before default user display.")

    return {
        "id": source_id,
        "title": title[:180],
        "provider": provider[:120],
        "country": public_text(record.get("country")) or None,
        "region": public_text(record.get("region")) or None,
        "jurisdiction": public_text(record.get("jurisdiction")) or None,
        "segments": segments,
        "status": status,
        "endpointType": detected_endpoint_type,
        "sourceUrl": official_url,
        "endpointUrl": clean_endpoint_url,
        "coverage": public_text(record.get("coverage_area"), "unknown"),
        "resolution": public_text(record.get("resolution_or_scale")) or public_text(
            probe.get("resolution_or_scale") if probe else "", "unknown"
        ),
        "license": public_text(record.get("licence"))
        or public_text(probe.get("license_status") if probe else "", "unknown"),
        "access": public_text(record.get("access_model"))
        or public_text(probe.get("access_status") if probe else "", "unknown"),
        "probeStatus": public_text(record.get("probe_status"))
        or public_text(probe.get("access_status") if probe else "", "unknown"),
        "confidenceScore": confidence,
        "priorityScore": priority,
        "evaluationSiteRelevance": site_relevance,
        "adapter": adapter_for(detected_endpoint_type),
        "fetchRecipe": fetch_recipe(detected_endpoint_type),
        "limitations": limitations,
        "reviewActions": review_actions(status, detected_endpoint_type),
        "provenance": [provenance],
    }


def merge_sources(sources: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}
    for source in sources:
        key_material = source["endpointUrl"] or source["sourceUrl"] or f"{source['provider']}|{source['title']}"
        key = stable_id(key_material, prefix="canonical")
        current = grouped.get(key)
        if current is None:
            grouped[key] = {**source, "id": key}
            continue

        current["segments"] = sorted(set(current["segments"]) | set(source["segments"]))
        current["evaluationSiteRelevance"] = sorted(
            set(current["evaluationSiteRelevance"]) | set(source["evaluationSiteRelevance"])
        )
        current["limitations"] = sorted(set(current["limitations"]) | set(source["limitations"]))
        current["reviewActions"] = sorted(set(current["reviewActions"]) | set(source["reviewActions"]))
        current["provenance"].extend(source["provenance"])
        if source["priorityScore"] > current["priorityScore"]:
            for key_name in [
                "title",
                "provider",
                "country",
                "region",
                "jurisdiction",
                "status",
                "endpointType",
                "sourceUrl",
                "endpointUrl",
                "coverage",
                "resolution",
                "license",
                "access",
                "probeStatus",
                "confidenceScore",
                "priorityScore",
                "adapter",
                "fetchRecipe",
            ]:
                current[key_name] = source[key_name]

    return sorted(grouped.values(), key=lambda item: (-item["priorityScore"], item["title"].lower()))


def load_source_records(db_path: Path, import_mode: str) -> tuple[list[dict[str, Any]], dict[str, int]]:
    if not db_path.exists():
        return [], {"sourceRecordCount": 0, "probeCount": 0, "gapCount": 0, "researchRunCount": 0}

    conn = sqlite3.connect(db_path)
    stats = {
        "sourceRecordCount": 0,
        "probeCount": 0,
        "gapCount": 0,
        "researchRunCount": 0,
    }
    try:
        stats["probeCount"] = (
            conn.execute("select count(*) from source_endpoint_probes").fetchone()[0]
            if table_exists(conn, "source_endpoint_probes")
            else 0
        )
        stats["gapCount"] = (
            conn.execute("select count(*) from gap_register_records").fetchone()[0]
            if table_exists(conn, "gap_register_records")
            else 0
        )
        stats["researchRunCount"] = (
            conn.execute("select count(*) from research_runs").fetchone()[0]
            if table_exists(conn, "research_runs")
            else 0
        )
        if not table_exists(conn, "source_registry_records"):
            return [], stats

        probes = load_probe_by_record_id(conn)
        cursor = conn.execute("select * from source_registry_records")
        records = []
        for row in cursor.fetchall():
            record = row_to_dict(cursor, row)
            stats["sourceRecordCount"] += 1
            probe = probes.get(text(record.get("id")))
            records.append(normalize_record(db_path.name, import_mode, record, probe))
        return records, stats
    finally:
        conn.close()


def load_campaign_records(db_path: Path) -> list[dict[str, Any]]:
    if not db_path.exists():
        return []
    conn = sqlite3.connect(db_path)
    try:
        if not table_exists(conn, "research_runs"):
            return []
        cursor = conn.execute("select id, research_domain, pack_name, status, objective_text from research_runs")
        records = []
        for row in cursor.fetchall():
            record = row_to_dict(cursor, row)
            domain = text(record.get("research_domain")) or text(record.get("pack_name"))
            haystack = f"{domain} {text(record.get('objective_text'))}".lower()
            segments = []
            if any(term in haystack for term in ["property", "land", "planning"]):
                segments.append("land_property_planning")
            if any(term in haystack for term in ["market", "community", "third", "education", "resource"]):
                segments.append("community_economy")
            if not segments:
                segments.append("operator_review")
            source_id = stable_id(db_path.name, domain, prefix="campaign")
            records.append(
                {
                    "id": source_id,
            "title": public_text(f"Planned VMesh campaign: {domain}"),
                    "provider": "VMesh / Intel Tools",
                    "country": "United Kingdom" if "uk" in haystack or "united kingdom" in haystack else None,
                    "region": None,
                    "jurisdiction": None,
                    "segments": sorted(set(segments)),
                    "status": "planned_campaign",
                    "endpointType": "unknown",
                    "sourceUrl": "",
                    "endpointUrl": "",
                    "coverage": "Campaign-defined geography; not extracted source data.",
                    "resolution": "planned",
                    "license": "not applicable",
                    "access": "operator planned",
                    "probeStatus": public_text(record.get("status")),
                    "confidenceScore": 20,
                    "priorityScore": 18,
                    "evaluationSiteRelevance": [],
                    "adapter": None,
                    "fetchRecipe": None,
                    "limitations": [
                        "This is a planned campaign/run context, not user-facing source data.",
                    ],
                    "reviewActions": ["execute_intel_gap_closing_run", "ingest_returned_candidates"],
                    "provenance": [
                        {
                            "runId": text(record.get("id")) or "planned_campaign",
                            "sourceDb": db_path.name,
                            "recordId": text(record.get("id")) or source_id,
                            "evidenceRefCount": 0,
                        }
                    ],
                }
            )
        return records
    finally:
        conn.close()


def load_gaps(db_path: Path) -> list[dict[str, Any]]:
    if not db_path.exists():
        return []
    conn = sqlite3.connect(db_path)
    try:
        if not table_exists(conn, "gap_register_records"):
            return []
        cursor = conn.execute(
            """
            select id, gap_type, country, layer, status, priority, description, recommended_action
            from gap_register_records
            order by coalesce(priority, 999), layer
            """
        )
        gaps = []
        for row in cursor.fetchall():
            gap = row_to_dict(cursor, row)
            gaps.append(
                {
                    "id": stable_id(db_path.name, text(gap.get("id")), prefix="gap"),
                    "sourceDb": db_path.name,
                    "gapType": text(gap.get("gap_type"), "unknown"),
                    "country": text(gap.get("country")) or None,
                    "layer": public_text(gap.get("layer"), "unknown"),
                    "priority": int(parse_number(gap.get("priority"), 999)),
                    "status": public_text(gap.get("status"), "open"),
                    "description": public_text(gap.get("description")),
                    "recommendedAction": public_text(gap.get("recommended_action")),
                }
            )
        return gaps
    finally:
        conn.close()


def evaluation_sites() -> list[dict[str, Any]]:
    return [
        {
            "id": "kamloops-rose",
            "publicSafeLabel": "Kamloops / Rose golden evaluation site",
            "coordinateStatus": "setup_gap_private_coordinate_required",
            "priorityRegions": ["British Columbia", "Canada"],
            "priorityTerms": ["Kamloops", "Rose", "LidarBC", "BC Data Catalogue", "Natural Resources Canada HRDEM"],
            "notes": [
                "Exact golden-site coordinates were not found in public-safe repo fixtures.",
                "Use British Columbia regional source relevance until the operator supplies a redacted AOI/H3 fixture.",
            ],
        },
        {
            "id": "alberta-golden",
            "publicSafeLabel": "Alberta golden evaluation site",
            "coordinateStatus": "setup_gap_private_coordinate_required",
            "priorityRegions": ["Alberta", "Canada"],
            "priorityTerms": ["Alberta", "open.alberta.ca", "Natural Resources Canada HRDEM"],
            "notes": [
                "Exact golden-site coordinates were not found in public-safe repo fixtures.",
                "Use Alberta regional source relevance until the operator supplies a redacted AOI/H3 fixture.",
            ],
        },
    ]


def segment_summaries(sources: list[dict[str, Any]]) -> list[dict[str, Any]]:
    summaries = []
    for segment_id, label in SEGMENT_LABELS.items():
        matching = [source for source in sources if segment_id in source["segments"]]
        ready = [
            source
            for source in matching
            if source["status"] in {"adapter_ready", "ready_source_ref", "needs_license_review"}
        ]
        review = [
            source
            for source in matching
            if source["status"]
            in {"needs_probe", "needs_review", "needs_license_review", "noisy_candidate", "planned_campaign"}
        ]
        summaries.append(
            {
                "id": segment_id,
                "label": label,
                "sourceCount": len(matching),
                "readyCount": len(ready),
                "reviewCount": len(review),
                "topSourceIds": [source["id"] for source in matching[:8]],
            }
        )
    return summaries


def top_sources(
    sources: list[dict[str, Any]], statuses: set[str], max_count: int, require_site_relevance: bool = False
) -> list[dict[str, Any]]:
    selected = [
        source
        for source in sources
        if source["status"] in statuses
        and (not require_site_relevance or len(source["evaluationSiteRelevance"]) > 0)
    ]
    return selected[:max_count]


def ecosystem_sources(sources: list[dict[str, Any]], max_count: int) -> list[dict[str, Any]]:
    selected = [
        source for source in sources if any(segment in ECOSYSTEM_SEGMENTS for segment in source["segments"])
    ]
    return selected[:max_count]


def broker_examples(sources: list[dict[str, Any]]) -> list[dict[str, Any]]:
    examples = []
    requested = [
        "terrain_elevation",
        "imagery_observation",
        "water_hydrology",
        "soils_landcover",
        "climate_weather",
        "ecology_biodiversity_carbon",
        "agriculture_operations",
        "community_economy",
    ]
    for site_id in ["kamloops-rose", "alberta-golden"]:
        site_sources = [
            source
            for source in sources
            if site_id in source["evaluationSiteRelevance"]
            and source["status"] in {"adapter_ready", "ready_source_ref", "needs_license_review", "needs_probe"}
        ][:16]
        examples.append(
            {
                "siteId": site_id,
                "consumer": "ba-gis-worker",
                "requestedSegments": requested,
                "sourceIds": [source["id"] for source in site_sources],
                "warnings": [
                    "This package is source metadata and fetch recipes, not raw GIS payloads.",
                    "Exact golden-site coordinates remain a setup gap until supplied as public-safe H3/AOI fixtures.",
                    "License/access and AOI live-proof gates must pass before production use.",
                ],
            }
        )
    return examples


def build_package(args: argparse.Namespace) -> dict[str, Any]:
    sidecar_root = Path(args.sidecar_root).expanduser() if args.sidecar_root else default_sidecar_root()
    records: list[dict[str, Any]] = []
    gaps: list[dict[str, Any]] = []
    db_summaries = []

    for db_input in DB_INPUTS:
        db_path = sidecar_root / db_input.file_name
        source_records, stats = load_source_records(db_path, db_input.import_mode)
        records.extend(source_records)
        if db_input.import_mode == "planned-campaign":
            records.extend(load_campaign_records(db_path))
        gaps.extend(load_gaps(db_path))
        db_summaries.append(
            {
                "sourceDb": db_input.file_name,
                "importMode": db_input.import_mode,
                **stats,
            }
        )

    canonical_sources = merge_sources(records)
    status_counts = Counter(source["status"] for source in canonical_sources)
    segment_counts: dict[str, int] = defaultdict(int)
    for source in canonical_sources:
        for segment in source["segments"]:
            segment_counts[segment] += 1

    ready_statuses = {"adapter_ready", "ready_source_ref", "needs_license_review"}
    review_statuses = {
        "needs_probe",
        "needs_review",
        "needs_license_review",
        "noisy_candidate",
        "planned_campaign",
        "research_only",
    }
    package = {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "runClass": "dry-run",
        "importSummary": {
            "runClass": "dry-run",
            "sourceSystem": "intel-tools-sidecar",
            "sidecarRoot": "operator-local",
            "dbs": db_summaries,
            "quarantineCandidateCount": len(records),
            "canonicalSourceCount": len(canonical_sources),
            "statusCounts": dict(sorted(status_counts.items())),
            "segmentCounts": {key: segment_counts.get(key, 0) for key in SEGMENT_LABELS},
        },
        "evaluationSites": evaluation_sites(),
        "segments": segment_summaries(canonical_sources),
        "sourcesReadyForBA": top_sources(
            canonical_sources,
            ready_statuses,
            args.max_ready_sources,
            require_site_relevance=False,
        ),
        "ecosystemSourceRecords": ecosystem_sources(canonical_sources, args.max_ecosystem_sources),
        "operatorReviewQueue": top_sources(canonical_sources, review_statuses, args.max_review_sources),
        "remainingGapRegister": sorted(gaps, key=lambda gap: (gap["priority"], gap["sourceDb"]))[: args.max_gaps],
        "brokerResponseExamples": broker_examples(canonical_sources),
    }
    return package


def default_sidecar_root() -> Path:
    env_value = os.environ.get("VMESH_INTEL_SIDECAR_ROOT")
    if env_value:
        return Path(env_value).expanduser()
    return Path.home() / "Documents" / "New project 6" / "Lead Intelligence Sidecar"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sidecar-root", default=os.environ.get("VMESH_INTEL_SIDECAR_ROOT"))
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--max-ready-sources", type=int, default=120)
    parser.add_argument("--max-ecosystem-sources", type=int, default=10_000)
    parser.add_argument("--max-review-sources", type=int, default=180)
    parser.add_argument("--max-gaps", type=int, default=80)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    package = build_package(args)
    output_path = args.output
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(package, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(output_path), "runClass": "dry-run", "ok": True}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

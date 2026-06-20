# Intel → VMesh Source Handoff Contract (v1)

**Status:** AGREED 2026-06-15 — operator adopted the §8 recommendations (see §8 for the decisions). The single agreed wire format
between Intel Tools (discovery) and VMesh (registry + serving) so the
"data for any coordinate" pipeline is built **once**, not twice.

**Reconciles:**
- Intel side: `prompt-queue/swarm-30-karpathy-style-recursive-source-discovery.md` (esp. §5 "VMesh Promotion Handoff Contract") and `lead_intel/swarm_templates.py` (`geospatial_source_registry`).
- VMesh side: `docs/SOURCE_REGISTRY_DB.md` (durable registry tables + query flow).
- Supersedes the ad‑hoc `vmesh-intel-source-broker-package-v1` (`lib/intelSourceBroker.ts`), which is flat, has string‑only coverage, and free‑text recipes.

**Canonical copy:** this file (`vmesh-0xkri-private/docs/`). Intel repo keeps a pointer
(`Lead Intelligence Sidecar/docs/INTEL_VMESH_SOURCE_HANDOFF_CONTRACT.md`).

---

## 0. Goal

A consumer (BA, a worker, an agent) asks VMesh for a **coordinate / H3 cell / AOI /
municipality** and gets a **fast source package** — the right data sources for that
place, with parameterized fetch recipes — without repeating open‑web discovery. Intel
Tools does the slow discovery/probing in advance; VMesh stores and serves; BA never
calls Intel Tools at request time.

## 1. Ownership boundary (who does what)

| Stage | Intel Tools (Research Swarm) | VMesh (Registry + Broker) | BA / consumers |
|---|---|---|---|
| Discover candidate sources | ✅ | — | — |
| Probe endpoints (bounded, public‑safe) | ✅ | ✅ (refresh) | — |
| Extract evidence + classify + score | ✅ | — | — |
| **Emit handoff (this contract)** | ✅ | ingest | — |
| Dedupe / review / **promote to operational** | ❌ (must not) | ✅ (owns promotion) | — |
| Store durable registry | — | ✅ (`SOURCE_REGISTRY_DB` tables) | — |
| Serve per‑coordinate source package | — | ✅ | request only |
| Execute fetch recipe → heavy payload | — | optional (see §5) | ✅ (default) |

**Hard rule (from swarm‑30 Non‑Goals):** Intel Tools never sets a source to an
operational/`promoted` state. It emits `candidate`‑class rows + a *recommended* action;
VMesh decides promotion.

## 2. Shared vocabularies (both sides MUST use these enums)

### 2.1 Jurisdiction levels (source ladder — from SOURCE_REGISTRY_DB)
`global` · `country` · `state_province` · `municipal` · `private_sector` ·
`charity_local_agency` · `open_community` · `academic_research`

Every coordinate campaign walks the ladder country → state_province → municipal →
private → charity → open_community → academic (municipal is **mandatory**, not optional).

### 2.2 Data buckets (canonical = SOURCE_REGISTRY_DB's 11)
`terrain_elevation` · `imagery_observation` · `water_hydrology` · `soils_landcover` ·
`ecology_biodiversity_carbon` · `access_infrastructure` · `land_property_planning` ·
`climate_weather` · `food_system_local_assets` · `risk_hazard` · `knowledge_context`

**Legacy intel-segment → bucket map** (intel `IntelBrokerSource.segments` currently uses 12):

| intel segment | canonical bucket |
|---|---|
| terrain_elevation | terrain_elevation |
| imagery_observation | imagery_observation |
| water_hydrology | water_hydrology |
| soils_landcover | soils_landcover |
| ecology_biodiversity_carbon | ecology_biodiversity_carbon |
| access_infrastructure | access_infrastructure |
| land_property_planning | land_property_planning |
| climate_weather | climate_weather |
| agriculture_operations | food_system_local_assets |
| community_economy | food_system_local_assets |
| research_only | knowledge_context |
| operator_review | *(workflow lane, not a bucket — drop)* |

`risk_hazard` is new and must be emitted explicitly by intel discovery.

### 2.3 Endpoint types
`stac_api` · `stac_static` · `tnm_api` · `arcgis_feature_server` · `arcgis_image_server` ·
`ogc_wms` · `ogc_wfs` · `ogc_wcs` · `object_store` · `open_data_catalog` ·
`download_index` · `api` · `manual`

### 2.4 State flow (intel emits → vmesh registry → vmesh decision)

```
Intel emits (candidate-class only):
  candidate | verified | recommended_for_vmesh_review
  | rejected_noise | blocked_license | blocked_access | needs_human_review

VMesh registry endpoint.status (per SOURCE_REGISTRY_DB):
  candidate -> reviewed -> probed -> live_proof
  | blocked | license_gated | token_gated | paid_only | no_data | outdated

VMesh decision (operational, vmesh-owned ONLY):
  promoted | research_only | license_review | private_only | deprecated
```

Intel may emit at most `verified` / `recommended_for_vmesh_review`. The transition to
`reviewed`/`probed`/`live_proof`/`promoted` happens inside VMesh. Rejected‑source reasons
are always preserved (a source rejected for one AOI can be valid for another).

### 2.5 Run class & disclosure class
- `run_class`: `mock` · `dry_run` · `configured` · `live_proof` (no live‑proof claim without retained live artifacts).
- `disclosure_class`: `public_safe` · `operator_local` · `private_redacted` · `not_for_public_repo`.

## 3. Handoff payload — `vmesh-intel-source-handoff-v1`

Normalized to mirror the SOURCE_REGISTRY_DB tables 1:1 (so ingest is a straight upsert).

```jsonc
{
  "schemaVersion": "vmesh-intel-source-handoff-v1",
  "generatedAt": "<iso8601>",
  "run": {
    "runId": "<stable>", "runType": "intel_tools_discovery",
    "runClass": "configured|live_proof|dry_run|mock",
    "jurisdictionScope": "Canada / British Columbia / Kamloops region (public-safe)",
    "dataBuckets": ["terrain_elevation", "..."],
    "strategyRef": "<strategy-memory id>", "missionId": "<swarm mission id>"
  },

  "authorities": [{
    "id": "auth:nrcan-geo-ca",
    "name": "Natural Resources Canada / Geo.ca Datacube",
    "jurisdictionLevel": "country", "countryCode": "CA",
    "regionCode": null, "municipality": null,
    "homepageUrl": "https://...", "operatorType": "government",
    "reliabilityTier": "official", "notes": "<public-safe>"
  }],

  "endpoints": [{
    "id": "ep:nrcan-hrdem-stac",
    "authorityId": "auth:nrcan-geo-ca",
    "endpointType": "stac_api",
    "url": "https://datacube.services.geo.ca/stac/api/",
    "authMode": "none", "license": "OGL-Canada (confirm per item)",
    "status": "verified",                 // intel candidate-class state (§2.4)
    "recommendedVmeshAction": "recommended_for_vmesh_review",
    "lastCheckedAt": "<iso8601>",
    "evidenceRef": "<retained artifact path or redacted id>",
    "qualityScore": 0.0, "evalScoreContribution": 0.0,
    "gapLinkage": ["<gap id>"], "reasons": [], "warnings": [],
    "disclosureClass": "public_safe"
  }],

  "collections": [{
    "id": "col:hrdem-mosaic-1m",
    "endpointId": "ep:nrcan-hrdem-stac",
    "providerCollectionId": "hrdem-mosaic-1m",
    "dataBucket": "terrain_elevation", "sourceRole": "bare-earth-dtm",
    "resolutionMeters": 1, "crs": "EPSG:3979", "verticalDatum": "CGVD2013",
    "assetRoles": ["dtm"], "limitations": [],
    "coverage": {                          // MACHINE-QUERYABLE (not a free string)
      "jurisdictionLevel": "country", "countryCode": "CA",
      "regionCode": null, "municipality": null,
      "bbox": [-141.0, 41.6, -52.6, 83.1],  // optional; null if unknown
      "h3Cells": null,                       // optional coarse cells
      "coverageSummary": "Canada (per-item availability varies)"
    },
    "fetchRecipe": {                        // PARAMETERIZED — the key upgrade
      "adapter": "stac-cog-point",
      "method": "GET",
      "urlTemplate": "https://datacube.services.geo.ca/stac/api/search?collections=hrdem-mosaic-1m&bbox={bbox}&limit=1",
      "paramSpec": {
        "bbox": "minLon,minLat,maxLon,maxLat (EPSG:4326)",
        "point": "{lon},{lat}"
      },
      "axisOrderNote": "EPSG:4326 lon,lat for STAC bbox.",
      "responsePath": "features[0].assets.dtm.href",
      "steps": [
        "STAC search by bbox around {lat},{lon}",
        "take features[0].assets.dtm.href (provider-native COG ref)",
        "downstream worker reads COG window at {lat},{lon}"
      ]
    }
  }],

  "coverageEvidence": [{                    // per-AOI probe results (separate from existence)
    "id": "cov:...", "collectionId": "col:hrdem-mosaic-1m",
    "queryRef": "h3:8b2a...|redacted-site-id|coarse-aoi-label",
    "disclosureClass": "public_safe",
    "runClass": "live_proof",
    "coverageStatus": "covered|partial|no_data|blocked|unknown",
    "selectedAssets": ["<provider-native or redacted ref>"],
    "evidenceRef": "<artifact path>", "checkedAt": "<iso8601>"
  }],

  "gapRegister": [{
    "id": "gap:...", "dataBucket": "water_hydrology",
    "jurisdictionScope": "Kamloops region", "priority": 1,
    "description": "<public-safe>", "recommendedAction": "municipal portal scout"
  }],

  "evalScorecard": {                        // swarm-30 §1 metrics
    "officialSourceHitRate": 0.0, "endpointLivenessRate": 0.0,
    "machineReadableRate": 0.0, "licenseClarityRate": 0.0,
    "duplicateNoiseRate": 0.0, "vmeshPromotionEligibilityRate": 0.0,
    "baReadinessRate": 0.0, "gapClosureRate": 0.0,
    "coverageByBucket": { "terrain_elevation": 0.0 }
  }
}
```

### 3.1 Parameterized fetch recipe — required placeholders
Every executable recipe MUST use these tokens (no hardcoded coordinates):
`{lat}` `{lon}` `{bbox}` (`minLon,minLat,maxLon,maxLat`, EPSG:4326) `{h3}` `{radius_km}`.
Include `axisOrderNote` whenever axis order is non‑obvious. Example gotcha to retain:

> **DataBC WFS** requires `BBOX=<minLat,minLon,maxLat,maxLon>` **plus**
> `srsName=urn:ogc:def:crs:EPSG::4326` (lat,lon axis). CQL `INTERSECTS`/`DWITHIN` fail.

`responsePath` is a dotted path (or JMESPath) to the value/asset in the response so the
executor needs no per‑source code.

## 4. Ingestion rules (VMesh side)

1. **Dedupe key:** `endpoint.url` (normalized) for endpoints; `endpointId + providerCollectionId` for collections. Upsert, never duplicate.
2. **Never auto‑promote:** ingest sets registry `status` no higher than `reviewed`; `promoted`/operational decisions are a separate vmesh step.
3. **Preserve rejections:** `rejected_noise`/`blocked_*` rows are kept with reasons (source existence ≠ per‑site coverage).
4. **Coverage split:** source existence lives in `source_collections.coverage`; per‑AOI results live in `coverage_evidence`. Reuse fresh evidence; re‑probe when stale.
5. **Idempotent:** same `runId` re‑ingested = no‑op; new evidence appends.

## 5. Serving contract (VMesh → consumers)

Extend the existing per‑coordinate path (`lib/geospatialPackage/baPackage.ts` already
parses `?lat=&lng=` → H3 AOI). New/clarified route:

```http
GET /api/geospatial-package/intel-broker?lat={lat}&lon={lon}&buckets=soils_landcover,climate_weather&maxJurisdiction=municipal&disclosure=public_safe
```

Response:
```jsonc
{
  "query": { "lat": "<redacted-or-coarse>", "h3": "8b...", "buckets": ["..."] },
  "sources": [{
    "authority": "...", "endpoint": "...", "collection": "...",
    "dataBucket": "soils_landcover", "sourceRole": "soil",
    "jurisdictionLevel": "country", "status": "live_proof",
    "fetchRecipe": { /* parameterized, ready to execute for this lat/lon */ },
    "coverageStatus": "covered", "license": "...", "confidence": 0.0
  }],
  "gaps": [ /* buckets with no source for this AOI */ ],
  "refreshQueued": false   // true if a slow discovery run was enqueued
}
```

**Query flow** (from SOURCE_REGISTRY_DB §Query Flow): normalize jurisdiction+disclosure →
query authorities/endpoints by jurisdiction ladder → select collections by bucket+role →
reuse `coverage_evidence` if fresh → bounded probe if stale → return source refs +
parameterized recipes (+ STAC items/typed records). Fast because discovery happened earlier.

**Execution policy (decision needed — §8c):** default = VMesh returns recipes; the
consumer/processing plane executes (matches current "catalog‑only" design). Optional
later: `POST /api/geospatial-package/execute` runs a recipe server‑side for a coordinate
and returns values or a job id.

## 6. Redaction (public‑safe, enforced both sides)

Never in `public_safe` artifacts: exact private coordinates, addresses, signed URLs,
secrets/tokens, local filesystem paths, raw PII. Coordinates appear only as coarse AOI
labels, redacted site ids, or H3 cells. Provider‑native source‑family + item ids (e.g.
`hrdem-mosaic-1m` item `2_4-mosaic-1m`) ARE public‑safe. Every `coverage_evidence` row
carries a `disclosureClass`.

## 7. Versioning & sync

- `schemaVersion: vmesh-intel-source-handoff-v1`. Breaking changes bump the version; both
  sides pin the version they emit/accept.
- Canonical = this file. Changes are proposed here first, then implemented on both sides.
- Intel side builds the **export** to §3 (swarm‑30 §5 + `POST /api/vmesh/handoffs/source-discovery`).
- VMesh side builds **ingest** (§4) + **serve** (§5) against `SOURCE_REGISTRY_DB` tables.

## 8. Decisions (AGREED 2026-06-15)

a. **Bucket taxonomy — DECIDED:** SOURCE_REGISTRY_DB's **11 buckets are canonical**. Map onto them BOTH (i) the legacy intel `segments` (§2.2) AND (ii) the engine's `coverage_category` taxonomy seen in `geospatial_coverage_matrix`:
   `elevation_terrain_lidar`→`terrain_elevation`; `satellite_aerial_imagery`→`imagery_observation`; `hydrology_flood_water`→`water_hydrology`; `landcover_landuse`+`soils_geology`→`soils_landcover`; `vegetation_habitat_biodiversity`→`ecology_biodiversity_carbon`; `climate_weather_gridded`→`climate_weather`; `planning_zoning_land_constraints`+`boundaries_cadastre_parcels`→`land_property_planning`; `infrastructure_utilities`→`access_infrastructure`; `hazards_resilience`→`risk_hazard`; `agriculture_forestry_land_management`→`food_system_local_assets`.
   The endpoint-shape categories (`stac_catalogue`, `ogc_wms_wfs_wcs`, `arcgis_rest`, `ckan_catalogue`, `download_index`, `other_geospatial_api`) are **`endpointType`**, not buckets.
b. **Durable store — DECIDED:** **Postgres/PostGIS** as the primary registry store (the VPS already runs Postgres; PostGIS gives real spatial lookup). Not Supabase / committed-JSON for the primary.
c. **Execution — DECIDED:** **recipes-only first** — VMesh serves parameterized recipes; BA / processing-plane executes. Add a server-side `execute` route later if a clear need appears.
d. **Spatial index — DECIDED:** **H3 for the per-coordinate lookup, bbox for the coarse pre-filter** — pairs with the geoBoundaries jurisdiction index (`JURISDICTION_INDEX.md`), which also closes the run's `country=unknown` gap.
```

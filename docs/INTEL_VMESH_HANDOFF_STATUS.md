# Intel → vmesh source handoff — STATUS & PICKUP (durable land complete)

**Status: DURABLE LAND COMPLETE (2026-06-15).** The intel side of the "ecosim data for any
coordinate via vmesh" pipeline is built, proven, and persisted. This doc is the single pickup
point for the **vmesh-app / swarm-30 serving lane**.

## What exists now (done, do not redo)

```
intel discovers + classifies (mission 9767c8b6, 2403 sources, all 10 buckets)
  → AGREED contract: vmesh-intel-source-handoff-v1  (INTEL_VMESH_SOURCE_HANDOFF_CONTRACT.md)
    → 494 collections w/ parameterized recipes ({lat}/{lon}/{bbox})
      → reproducibility PROVEN 20/20 (2 coords × 10 buckets, all HTTP 200)
        → DURABLE in Postgres: schema `vmesh` (isolated, never touches public)
```

### Durable store (Supabase, schema `vmesh`)
- `vmesh.source_authorities` — **80** rows (catalogue endpoints / publishers).
- `vmesh.source_collections` — **494** rows across all 10 buckets. Key columns:
  `id, title, provider, asset_type, data_bucket, endpoint_type, source_url, license, status,
   quality_score, crs, coverage (jsonb), fetch_recipe (jsonb), disclosure_class, run_id`.
  Indexed on `data_bucket` and `endpoint_type`. All rows `disclosure_class='public_safe'`.
- `fetch_recipe.urlTemplate` carries parameter slots `{bbox}` / `{lat}` / `{lon}`; per asset_type:
  - `stac_collection_items` → `{collection}/items?bbox={bbox}&limit=10`
  - `arcgis_feature_server` → `{service}/0/query?...geometry={bbox}...f=geojson`
  - `arcgis_hub` → best-effort underlying FeatureServer query
  - `open_data_catalog` → catalogue/index seed (enumerate, not a point fetch)

### Bucket coverage (collections)
`access_infrastructure 60 · imagery_observation 60 · terrain_elevation 60 · climate_weather 60 ·
food_system_local_assets 59 · water_hydrology 54 · land_property_planning 51 · soils_landcover 48 ·
risk_hazard 31 · ecology_biodiversity_carbon 11`

## How to connect (the seam)
- Connection: Infisical `/supabase/simpleloop` → `SUPABASE_DB_URL` (canonical; `POSTGRES_URL`/`DATABASE_URL` fallback), session pooler, :5432, migration-capable.
- The registry lives in schema **`vmesh`**. Query it directly; no schema param needed.
- **Serving primitive** (installed by `vmesh_broker_install_and_prove.py`):
  ```sql
  SELECT * FROM vmesh.broker_sources(:lat, :lon, ARRAY['terrain_elevation','water_hydrology']);
  -- returns id, title, data_bucket, endpoint_type, status, source_url, ready_url, recipe
  -- ready_url = urlTemplate with {bbox}/{lat}/{lon} filled server-side
  ```
  Pass `NULL` for buckets to get all. `p_half` (default 0.05°) sizes the bbox.
- **Jurisdiction** (installed by `vmesh_jurisdiction_index.py`):
  ```sql
  SELECT * FROM vmesh.jurisdiction_at(:lat, :lon);  -- → country (geoBoundaries ADM0)
  ```

## Reproduction / regeneration scripts (intel side)
In `New project 6/Lead Intelligence Sidecar/scripts/`:
- `build_vmesh_handoff.py` — run artifacts → `vmesh-intel-source-handoff-v1` (v2, per-asset-type recipes).
- `prove_handoff_reproducibility.mjs` — executes a sample of recipes for 2 coords → 20/20.
- `ingest_vmesh_registry.py` — handoff JSON → `vmesh.source_*` tables (idempotent upsert).
- `vmesh_broker_install_and_prove.py` — installs `vmesh.broker_sources()` + proves it live.
- `vmesh_jurisdiction_index.py` — geoBoundaries ADM0 → `vmesh.jurisdictions` + `vmesh.jurisdiction_at()`.
Handoff artifact: `exports/ecosim-handoff/ecosim-geospatial-handoff-v1.json` (also `/root/ecosim_vmesh_handoff.json` on the VPS).

## What the vmesh-app / swarm-30 lane should pick up
1. **HTTP broker route** — wrap `vmesh.broker_sources()` behind the vmesh app API
   (`GET /broker?lat=&lon=&buckets=`). The hard query logic already lives in the DB function.
2. **Coverage-aware filtering** — today the broker filters by bucket; once authority jurisdictions
   are resolved (step 3), filter to sources that actually cover the point, not just the bucket.
3. **Jurisdiction deepening** — ADM0 (country) is live; add geoBoundaries ADM1/ADM2 to
   `vmesh.jurisdictions` (see `JURISDICTION_INDEX.md`) to resolve region/municipality. This closes
   the `gap-jurisdiction` register entry (most assets currently `country=unknown`).
4. **Refresh cadence** — re-run intel discovery periodically; `ingest_vmesh_registry.py` upserts by
   `id`, so re-ingest is safe and incremental.

## Known gaps
- `gap-jurisdiction` (priority 1): authority `country/region` unknown for most assets → broker is
  bucket-filtered, not coverage-filtered, until ADM1/2 + per-authority jurisdiction tagging land.
- 35 large-page extraction tasks returned HTTP 400 (oversized payload vs weak extractor) — non-fatal;
  coverage matrix still complete.
- Optional convenience seam: a dedicated Infisical `/services/vmesh` config secret was NOT created;
  connect via `/supabase/simpleloop` SUPABASE_DB_URL + schema `vmesh` for now.

## Coordinate safety
Public-safe label only ("Kamloops / British Columbia / Canada"). The exact private Rose Hill
lat/lon never appears in any emitted artifact (raw stays in local `live_artifacts/`). The handoff
builder hard-fails on a coordinate-leak regex.

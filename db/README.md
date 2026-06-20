# vmesh durable geospatial registry — DB

This directory is the **canonical, versioned home** for the vmesh source registry: the durable
geospatial store that serves a per-coordinate source package for ANY coordinate. Previously the
schema/function DDL existed only in the intel sidecar's operator scripts + the live DB; it now lives
here so vmesh is self-contained and reproducible.

## Where it runs
- **Store:** isolated `vmesh` schema in the SimpleLoop Supabase (never touches `public`; reversible by `DROP SCHEMA vmesh`).
- **Connection:** Infisical `/supabase/simpleloop` → `SUPABASE_DB_URL` (session pooler, port 5432, migration-capable). Canonical key; `POSTGRES_URL`/`DATABASE_URL` are accepted fallbacks during transition.
- **Runtime config:** Infisical `/services/vmesh` (schema name, provider-key paths, handoff version, bucket list).

## Migrations (apply in order)
1. `migrations/001_source_registry.sql` — `vmesh.source_authorities` + `vmesh.source_collections` (+ indexes).
2. `migrations/002_broker_sources.sql` — `vmesh.broker_sources(lat, lon, buckets[], half)` serving function.
3. `migrations/003_jurisdiction_index.sql` — PostGIS `vmesh.jurisdictions` + `vmesh.jurisdiction_at(lat, lon)` (structure; data loaded by the runner).

Apply (psql or any client):
```bash
# secrets injected from Infisical; never paste the connection string
sl-infisical-run /supabase/simpleloop  bash -c 'DB_URL="${SUPABASE_DB_URL:-${POSTGRES_URL:-$DATABASE_URL}}"; psql "$DB_URL" -f migrations/001_source_registry.sql'
```

## Loading data
- **Source registry (494 collections):** ingest a `vmesh-intel-source-handoff-v1` package.
  - Seed bundled here: `seed/ecosim-geospatial-handoff-v1.json` (live-proof, 2026-06-15, public-safe).
  - Ingester (idempotent upsert by id): `Lead Intelligence Sidecar/scripts/ingest_vmesh_registry.py`.
- **Jurisdictions (218 ADM0):** `Lead Intelligence Sidecar/scripts/vmesh_jurisdiction_index.py`
  downloads geoBoundaries CGAZ ADM0 (Natural Earth fallback) and populates `vmesh.jurisdictions` + the function.

The handoff is produced upstream by the intel discovery swarm via `scripts/build_vmesh_handoff.py`.
Refresh = re-run discovery → rebuild handoff → re-ingest (upsert is safe/incremental).

## Live state (verified 2026-06-15)
- `vmesh.source_authorities` = 80
- `vmesh.source_collections` = 494 — buckets: climate_weather 60, terrain_elevation 60, imagery_observation 60,
  access_infrastructure 60, food_system_local_assets 59, water_hydrology 54, land_property_planning 51,
  soils_landcover 48, risk_hazard 31, ecology_biodiversity_carbon 11.
- `vmesh.jurisdictions` = 218 (ADM0); reproducibility proven 20/20 across 2 coordinates × 10 buckets.

## Serving (what the app calls)
```sql
-- sources + ready-to-fetch URLs for a coordinate (NULL buckets = all)
SELECT * FROM vmesh.broker_sources(:lat, :lon, ARRAY['terrain_elevation']);
-- country (and later region/municipality) for a coordinate
SELECT * FROM vmesh.jurisdiction_at(:lat, :lon);
```
HTTP serving route (`GET /api/geospatial-package/intel-broker?lat=&lon=&buckets=`) wraps `broker_sources()` —
see `docs/INTEL_VMESH_SOURCE_HANDOFF_CONTRACT.md` §5 and `docs/INTEL_VMESH_HANDOFF_STATUS.md`.

## Provider keys
Most registry sources are open (CC0 / public ArcGIS / STAC, no key). License-gated/commercial sources use
provider keys in Infisical — see `docs/GEOSPATIAL_PROVIDER_KEYS.md`.

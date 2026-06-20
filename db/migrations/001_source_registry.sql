-- vmesh source registry — durable geospatial source store (SOURCE_REGISTRY_DB, minimal v1).
-- Canonical home for the registry schema. Lives in an ISOLATED `vmesh` schema (never touches `public`).
-- Connect via Infisical /supabase/simpleloop SUPABASE_DB_URL (canonical; POSTGRES_URL/DATABASE_URL fallback), session pooler :5432, schema `vmesh`.
-- Populated by the intel→vmesh handoff (see db/seed/ + db/README.md). Idempotent.
-- Live state 2026-06-15: source_authorities=80, source_collections=494 across 10 buckets.

CREATE SCHEMA IF NOT EXISTS vmesh;

-- Publishers / catalogue endpoints (the jurisdiction ladder lives here).
CREATE TABLE IF NOT EXISTS vmesh.source_authorities (
  id                 text PRIMARY KEY,
  name               text,
  endpoint_type      text,
  url                text,
  asset_count        int,
  jurisdiction_level text,          -- global | country | state_province | municipal | private_sector | charity_local_agency | open_community | academic_research
  country_code       text,
  disclosure_class   text,          -- public_safe | ...
  run_id             text,
  ingested_at        timestamptz DEFAULT now()
);

-- Datasets/collections with parameterized fetch recipes + machine-queryable coverage.
CREATE TABLE IF NOT EXISTS vmesh.source_collections (
  id                       text PRIMARY KEY,
  title                    text,
  provider                 text,
  asset_type               text,
  data_bucket              text,    -- one of the 11 canonical buckets (see docs/INTEL_VMESH_SOURCE_HANDOFF_CONTRACT.md §2.2)
  endpoint_type            text,    -- stac_collection_items | arcgis_feature_server | arcgis_hub | open_data_catalog | ...
  source_url               text,
  license                  text,
  status                   text,    -- candidate | verified | license_gated | ...
  recommended_vmesh_action text,
  quality_score            double precision,
  crs                      text,
  coverage                 jsonb,   -- {jurisdictionLevel, countryCode, regionCode, municipality, bbox, h3Cells, coverageSummary}
  fetch_recipe             jsonb,   -- {adapter, method, urlTemplate ({lat}/{lon}/{bbox}), paramSpec, responsePath, steps}
  disclosure_class         text,
  run_id                   text,
  ingested_at              timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vmesh_coll_bucket ON vmesh.source_collections(data_bucket);
CREATE INDEX IF NOT EXISTS idx_vmesh_coll_etype  ON vmesh.source_collections(endpoint_type);

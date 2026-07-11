-- Reconciles the durable registry with vmesh-intel-source-handoff-v1.
-- This migration is additive and preserves the June registry rows.

CREATE SCHEMA IF NOT EXISTS vmesh;

ALTER TABLE vmesh.source_authorities
  ADD COLUMN IF NOT EXISTS homepage_url text,
  ADD COLUMN IF NOT EXISTS operator_type text,
  ADD COLUMN IF NOT EXISTS reliability_tier text,
  ADD COLUMN IF NOT EXISTS region_code text,
  ADD COLUMN IF NOT EXISTS municipality text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS run_ids text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS vmesh.source_endpoints (
  id                       text PRIMARY KEY,
  authority_id             text NOT NULL REFERENCES vmesh.source_authorities(id),
  endpoint_type            text NOT NULL,
  url                      text NOT NULL,
  auth_mode                text NOT NULL DEFAULT 'review',
  license                  text NOT NULL DEFAULT 'review',
  status                   text NOT NULL DEFAULT 'candidate',
  recommended_vmesh_action text,
  last_checked_at          timestamptz,
  evidence_ref             text,
  quality_score            double precision NOT NULL DEFAULT 0,
  reasons                  jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings                 jsonb NOT NULL DEFAULT '[]'::jsonb,
  disclosure_class         text NOT NULL DEFAULT 'public_safe',
  run_ids                  text[] NOT NULL DEFAULT '{}',
  ingested_at              timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (authority_id, url)
);

ALTER TABLE vmesh.source_collections
  ADD COLUMN IF NOT EXISTS authority_id text REFERENCES vmesh.source_authorities(id),
  ADD COLUMN IF NOT EXISTS endpoint_id text REFERENCES vmesh.source_endpoints(id),
  ADD COLUMN IF NOT EXISTS provider_collection_id text,
  ADD COLUMN IF NOT EXISTS source_role text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS resolution_meters double precision,
  ADD COLUMN IF NOT EXISTS vertical_datum text,
  ADD COLUMN IF NOT EXISTS asset_roles jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS limitations jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS capability_state text NOT NULL DEFAULT 'metadata-only',
  ADD COLUMN IF NOT EXISTS promotion_state text NOT NULL DEFAULT 'quarantine',
  ADD COLUMN IF NOT EXISTS access_mode text NOT NULL DEFAULT 'review',
  ADD COLUMN IF NOT EXISTS endpoint_status text NOT NULL DEFAULT 'candidate',
  ADD COLUMN IF NOT EXISTS coverage_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS license_posture text NOT NULL DEFAULT 'review-required',
  ADD COLUMN IF NOT EXISTS blocker text,
  ADD COLUMN IF NOT EXISTS next_action text NOT NULL DEFAULT 'review-source',
  ADD COLUMN IF NOT EXISTS last_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS evidence_ref text,
  ADD COLUMN IF NOT EXISTS run_ids text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE vmesh.source_collections
SET capability_state = CASE
      WHEN fetch_recipe->>'urlTemplate' IS NOT NULL THEN 'adapter-ready'
      ELSE 'metadata-only'
    END,
    provider_collection_id = COALESCE(provider_collection_id, id),
    run_ids = CASE WHEN run_id IS NULL THEN run_ids ELSE ARRAY[run_id] END,
    next_action = CASE
      WHEN fetch_recipe->>'urlTemplate' IS NOT NULL THEN 'materialize-live-payload'
      ELSE 'derive-fetch-recipe'
    END,
    blocker = CASE
      WHEN fetch_recipe->>'urlTemplate' IS NOT NULL THEN 'materialization-proof-required'
      ELSE 'executable-recipe-missing'
    END
WHERE provider_collection_id IS NULL OR run_ids = '{}' OR next_action = 'review-source';

CREATE TABLE IF NOT EXISTS vmesh.coverage_evidence (
  id               text PRIMARY KEY,
  endpoint_id      text REFERENCES vmesh.source_endpoints(id),
  collection_id    text REFERENCES vmesh.source_collections(id),
  query_ref        text NOT NULL,
  disclosure_class text NOT NULL,
  run_class        text NOT NULL,
  coverage_status  text NOT NULL,
  selected_assets  jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_ref     text,
  checked_at       timestamptz,
  run_ids          text[] NOT NULL DEFAULT '{}',
  ingested_at      timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vmesh.coverage_evidence
  ADD COLUMN IF NOT EXISTS reported_endpoint_id text;

CREATE TABLE IF NOT EXISTS vmesh.source_runs (
  id                   text PRIMARY KEY,
  run_type             text NOT NULL,
  run_class            text NOT NULL,
  jurisdiction_scope   text,
  data_buckets         text[] NOT NULL DEFAULT '{}',
  candidate_count      integer NOT NULL DEFAULT 0,
  promoted_count       integer NOT NULL DEFAULT 0,
  quarantined_count    integer NOT NULL DEFAULT 0,
  artifact_ref         text,
  ingestion_key        text,
  generated_at         timestamptz,
  ingested_at          timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vmesh.source_gaps (
  id                   text PRIMARY KEY,
  run_id               text REFERENCES vmesh.source_runs(id),
  data_bucket          text NOT NULL,
  jurisdiction_scope   text,
  priority             integer,
  description          text NOT NULL,
  recommended_action   text,
  status               text NOT NULL,
  ingested_at          timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vmesh.source_ingestions (
  ingestion_key  text PRIMARY KEY,
  run_id         text NOT NULL REFERENCES vmesh.source_runs(id),
  content_hash   text NOT NULL,
  source_count   integer NOT NULL,
  status         text NOT NULL DEFAULT 'quarantined',
  ingested_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vmesh_endpoint_status
  ON vmesh.source_endpoints(status, endpoint_type);
CREATE INDEX IF NOT EXISTS idx_vmesh_collection_capability
  ON vmesh.source_collections(data_bucket, capability_state, promotion_state);
CREATE INDEX IF NOT EXISTS idx_vmesh_collection_endpoint
  ON vmesh.source_collections(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_vmesh_coverage_endpoint
  ON vmesh.coverage_evidence(endpoint_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_vmesh_gap_status
  ON vmesh.source_gaps(status, data_bucket);

DROP VIEW IF EXISTS vmesh.source_capability_ledger;

CREATE VIEW vmesh.source_capability_ledger AS
SELECT
  c.id,
  c.authority_id,
  c.endpoint_id,
  c.data_bucket,
  c.source_role,
  c.capability_state,
  c.promotion_state,
  c.endpoint_status,
  c.coverage_status,
  c.license_posture,
  c.access_mode,
  c.resolution_meters,
  c.fetch_recipe->>'adapter' AS recipe_family,
  c.last_checked_at,
  c.evidence_ref,
  c.blocker,
  c.next_action
FROM vmesh.source_collections c;

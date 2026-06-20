-- vmesh per-site eco observations — the harvested DATA VALUES for a coordinate (distinct from the
-- source registry, which is the catalogue). Climate (incl. cloud cover + 10m wind + monthly seasonality),
-- soil, hydrology, biodiversity, ecozone, vegetation. Coordinate-safe (site_id only; no raw lat/lon).
-- Populated by the intel collector: pull_site_eco_package.mjs -> gen_vmesh_eco_observations.mjs ->
-- ingest_vmesh_eco_observations.py. Idempotent upsert by id (site_id|field).

CREATE SCHEMA IF NOT EXISTS vmesh;

CREATE TABLE IF NOT EXISTS vmesh.site_eco_observations (
  id          text PRIMARY KEY,          -- "<site_id>|<field>"
  site_id     text NOT NULL,
  site_label  text,
  field       text NOT NULL,             -- e.g. climate.cloudCoverAnnual, climate.windSpeed10mAnnual, soil.pH
  domain      text,                      -- climate | soil | hydrology | biodiversity | ecozone | vegetation | other
  value       double precision,          -- numeric value (null when non-numeric / gap)
  value_text  text,                      -- non-numeric value (BEC label, sourceWater class, etc.)
  unit        text,
  monthly     jsonb,                     -- 12-element [JAN..DEC] array for seasonal climate fields (cloud/precip/temp/wind/solar)
  source_name text,
  confidence  double precision,
  status      text,                      -- value | gap
  run_class   text,
  fetched_at  timestamptz,
  ingested_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vmesh_eco_obs_site   ON vmesh.site_eco_observations(site_id);
CREATE INDEX IF NOT EXISTS idx_vmesh_eco_obs_domain ON vmesh.site_eco_observations(domain);
CREATE INDEX IF NOT EXISTS idx_vmesh_eco_obs_field  ON vmesh.site_eco_observations(field);

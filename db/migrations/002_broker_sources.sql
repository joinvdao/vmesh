-- vmesh broker serving primitive — the per-coordinate query the app calls.
-- Given a coordinate (+ optional buckets), returns matching collections with their fetch recipe
-- and a ready-to-fetch URL ({bbox}/{lat}/{lon} filled server-side). Bucket-filtered today;
-- coverage-aware filtering arrives once authority jurisdictions are tagged (see 003 + JURISDICTION_INDEX.md).
-- Usage: SELECT * FROM vmesh.broker_sources(50.674, -120.327, ARRAY['terrain_elevation','water_hydrology']);
--        SELECT * FROM vmesh.broker_sources(:lat, :lon);   -- NULL buckets = all
-- p_half (default 0.05°) sizes the bbox around the point.

CREATE OR REPLACE FUNCTION vmesh.broker_sources(
  p_lat double precision, p_lon double precision,
  p_buckets text[] DEFAULT NULL, p_half double precision DEFAULT 0.05)
RETURNS TABLE(id text, title text, data_bucket text, endpoint_type text, status text,
              source_url text, ready_url text, recipe jsonb)
LANGUAGE sql STABLE AS $func$
  SELECT c.id, c.title, c.data_bucket, c.endpoint_type, c.status, c.source_url,
    replace(replace(replace(
      c.fetch_recipe->>'urlTemplate',
      '{bbox}', concat_ws(',', (p_lon-p_half)::text, (p_lat-p_half)::text, (p_lon+p_half)::text, (p_lat+p_half)::text)),
      '{lat}', p_lat::text),
      '{lon}', p_lon::text) AS ready_url,
    c.fetch_recipe AS recipe
  FROM vmesh.source_collections c
  WHERE (p_buckets IS NULL OR c.data_bucket = ANY(p_buckets))
    AND c.fetch_recipe->>'urlTemplate' IS NOT NULL
    AND position('{' in (c.fetch_recipe->>'urlTemplate')) > 0
  ORDER BY c.data_bucket, c.quality_score DESC NULLS LAST;
$func$;

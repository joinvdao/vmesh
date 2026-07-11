-- Adds durable health state without deleting historical source intelligence.

ALTER TABLE vmesh.source_collections
  ADD COLUMN IF NOT EXISTS last_healthy_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_failure_at timestamptz,
  ADD COLUMN IF NOT EXISTS consecutive_failures integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promotion_reasons jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION vmesh.record_source_collection_health(
  target_collection_id text,
  succeeded boolean,
  checked_at timestamptz DEFAULT now()
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF succeeded THEN
    UPDATE vmesh.source_collections
    SET last_healthy_at = checked_at,
        consecutive_failures = 0,
        endpoint_status = 'verified',
        updated_at = now()
    WHERE id = target_collection_id;
  ELSE
    UPDATE vmesh.source_collections
    SET last_failure_at = checked_at,
        consecutive_failures = consecutive_failures + 1,
        promotion_state = CASE
          WHEN consecutive_failures + 1 >= 3 THEN 'demoted'
          ELSE promotion_state
        END,
        blocker = CASE
          WHEN consecutive_failures + 1 >= 3 THEN 'consecutive-failure-threshold-reached'
          ELSE blocker
        END,
        next_action = CASE
          WHEN consecutive_failures + 1 >= 3 THEN 'reverify-endpoint-and-materializer'
          ELSE next_action
        END,
        updated_at = now()
    WHERE id = target_collection_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION vmesh.demote_stale_source_collections(
  evaluated_at timestamptz DEFAULT now()
) RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE vmesh.source_collections
  SET promotion_state = 'demoted',
      blocker = 'health-evidence-stale',
      next_action = 'reverify-endpoint-and-materializer',
      updated_at = now()
  WHERE promotion_state = 'promoted'
    AND (last_healthy_at IS NULL OR last_healthy_at < evaluated_at - interval '30 days');
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

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
  c.last_healthy_at,
  c.last_failure_at,
  c.consecutive_failures,
  c.promotion_reasons,
  c.evidence_ref,
  c.blocker,
  c.next_action
FROM vmesh.source_collections c;

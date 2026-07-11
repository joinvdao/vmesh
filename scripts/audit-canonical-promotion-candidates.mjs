#!/usr/bin/env node

import { SupabaseManagementQueryClient } from "../lib/supabaseManagementQueryClient.ts";

const managementToken = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const projectRef =
  process.env.SUPABASE_PROJECT_REF ?? process.env.SIMPLELOOP_SUPABASE_PROJECT_REF ?? "";
if (!managementToken || !projectRef) {
  throw new Error("SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF are required.");
}

const client = new SupabaseManagementQueryClient({ managementToken, projectRef });
try {
  const result = await client.query(`
    WITH families(family, pattern) AS (
      VALUES
        ('copernicus-dem-glo30', '%copernicus%dem%'),
        ('usgs-3dep', '%3dep%'),
        ('esa-worldcover', '%worldcover%'),
        ('overture-maps', '%overture%'),
        ('open-meteo', '%open%meteo%'),
        ('soilgrids', '%soilgrids%')
    )
    SELECT
      f.family,
      c.id,
      c.title,
      c.provider,
      c.data_bucket,
      c.capability_state,
      c.promotion_state,
      c.license_posture,
      c.coverage_status,
      c.resolution_meters,
      c.fetch_recipe->>'adapter' AS recipe_family
    FROM families f
    JOIN vmesh.source_collections c
      ON lower(concat_ws(' ', c.title, c.provider, c.source_url)) LIKE f.pattern
    ORDER BY f.family, c.quality_score DESC, c.id
  `);
  const families = Object.groupBy(result.rows, (row) => row.family);
  process.stdout.write(
    `${JSON.stringify(
      {
        schemaVersion: "vmesh-canonical-promotion-candidate-audit-v1",
        generatedAt: new Date().toISOString(),
        runClass: "live-proof",
        matchCount: result.rows.length,
        families
      },
      null,
      2
    )}\n`
  );
} finally {
  await client.end();
}

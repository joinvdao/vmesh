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
    SELECT
      (SELECT count(id)::int FROM vmesh.source_authorities) AS authorities,
      (SELECT count(id)::int FROM vmesh.source_endpoints) AS endpoints,
      (SELECT count(id)::int FROM vmesh.source_collections) AS collections,
      (SELECT count(id)::int FROM vmesh.coverage_evidence) AS coverage_rows,
      (SELECT count(id)::int FROM vmesh.coverage_evidence
        WHERE endpoint_id IS NULL AND reported_endpoint_id IS NOT NULL) AS unresolved_probe_refs,
      (SELECT count(ingestion_key)::int FROM vmesh.source_ingestions) AS ingestions
  `);
  process.stdout.write(
    `${JSON.stringify(
      {
        schemaVersion: "vmesh-canonical-source-registry-audit-v1",
        generatedAt: new Date().toISOString(),
        runClass: "live-proof",
        ...result.rows[0]
      },
      null,
      2
    )}\n`
  );
} finally {
  await client.end();
}

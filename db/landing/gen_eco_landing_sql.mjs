#!/usr/bin/env node
// Generate a self-contained, idempotent SQL landing file from an eco-observations
// artifact: migration 004 DDL (schema + table + indexes, all IF NOT EXISTS) followed
// by an upsert of every observation. Output is safe to paste into the Supabase
// Dashboard SQL Editor (no DB password / connection string required) and re-runnable.
//
// Usage: node gen_eco_landing_sql.mjs <observations.json> [out.sql]
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inPath = process.argv[2];
if (!inPath) {
  console.error("usage: node gen_eco_landing_sql.mjs <observations.json> [out.sql]");
  process.exit(2);
}
const outPath = process.argv[3] || inPath.replace(/\.json$/i, "") + ".landing.sql";

const ddl = readFileSync(path.join(__dirname, "..", "migrations", "004_site_eco_observations.sql"), "utf8");
const doc = JSON.parse(readFileSync(inPath, "utf8"));
const rows = doc.observations || [];

const s = (v) => (v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const n = (v) => (v == null || !Number.isFinite(Number(v)) ? "NULL" : String(Number(v)));
const j = (v) => (v == null ? "NULL" : `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`);
const ts = (v) => (v == null ? "NULL" : `${s(v)}::timestamptz`);

const cols =
  "id, site_id, site_label, field, domain, value, value_text, unit, monthly, source_name, confidence, status, run_class, fetched_at";
const tuples = rows
  .map(
    (o) =>
      `  (${s(o.id)}, ${s(o.siteId)}, ${s(o.siteLabel)}, ${s(o.field)}, ${s(o.domain)}, ` +
      `${n(o.value)}, ${s(o.valueText)}, ${s(o.unit)}, ${j(o.monthly)}, ${s(o.sourceName)}, ` +
      `${n(o.confidence)}, ${s(o.status)}, ${s(o.runClass)}, ${ts(o.fetchedAt)})`,
  )
  .join(",\n");

const upsert = `INSERT INTO vmesh.site_eco_observations (${cols})
VALUES
${tuples}
ON CONFLICT (id) DO UPDATE SET
  site_id = EXCLUDED.site_id, site_label = EXCLUDED.site_label, field = EXCLUDED.field,
  domain = EXCLUDED.domain, value = EXCLUDED.value, value_text = EXCLUDED.value_text,
  unit = EXCLUDED.unit, monthly = EXCLUDED.monthly, source_name = EXCLUDED.source_name,
  confidence = EXCLUDED.confidence, status = EXCLUDED.status, run_class = EXCLUDED.run_class,
  fetched_at = EXCLUDED.fetched_at, ingested_at = now();`;

const out = `-- AUTO-GENERATED landing file — paste into Supabase Dashboard SQL Editor and Run.
-- Source artifact: ${path.basename(inPath)} (site=${doc.site?.id}, ${rows.length} observations, runClass=${doc.runClass}).
-- Idempotent: schema/table/indexes use IF NOT EXISTS; rows upsert by id. Safe to re-run.

BEGIN;

${ddl.trim()}

${upsert}

COMMIT;

-- Verify:
-- SELECT domain, count(*) FROM vmesh.site_eco_observations WHERE site_id = ${s(doc.site?.id)} GROUP BY domain ORDER BY domain;
`;

writeFileSync(outPath, out, "utf8");
console.log(`wrote ${outPath} (${rows.length} rows)`);

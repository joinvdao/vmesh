#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import pg from "pg";

import { ingestIntelHandoffToQuarantine } from "../lib/intelSourceCampaign.ts";
import {
  buildQuarantineCapabilityLedger,
  classifyLicensePosture,
  deriveCapabilityAction,
  summarizeCapabilityLedger
} from "../lib/sourceCapabilityLedger.ts";
import {
  resolveSourceRegistryClientConfig,
  resolveSourceRegistryDatabaseUrl
} from "../lib/sourceRegistryConnection.ts";
import { SupabaseManagementQueryClient } from "../lib/supabaseManagementQueryClient.ts";

const { Client } = pg;
const args = parseArgs(process.argv.slice(2));
const handoffPath = resolve(args.handoff ?? "");
if (!args.handoff) throw new Error("--handoff is required.");

const handoff = JSON.parse(await readFile(handoffPath, "utf8"));
const quarantine = ingestIntelHandoffToQuarantine(handoff);
const outputRoot = resolve(
  args.output ?? `.artifacts/source-registry/capability-ledger/${quarantine.runId}`
);
const quarantineLedger = buildQuarantineCapabilityLedger(quarantine);

if (args.localOnly) {
  const summary = summarizeCapabilityLedger(quarantineLedger, {
    generatedAt: handoff.generatedAt,
    discoveryGapCount: quarantine.gapRegister.length
  });
  await mkdir(outputRoot, { recursive: true });
  await Promise.all([
    writeJson(resolve(outputRoot, "source-capability-ledger.json"), {
      schemaVersion: "vmesh-source-capability-ledger-v1",
      generatedAt: summary.generatedAt,
      rows: quarantineLedger
    }),
    writeJson(resolve(outputRoot, "source-capability-summary.json"), summary)
  ]);
  process.stdout.write(
    `${JSON.stringify({ ok: true, runClass: "configured", persisted: false, ...summary, outputRoot }, null, 2)}\n`
  );
  process.exit(0);
}

const databaseUrl = resolveSourceRegistryDatabaseUrl() ?? "";
const managementToken = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const projectRef =
  process.env.SUPABASE_PROJECT_REF ?? process.env.SIMPLELOOP_SUPABASE_PROJECT_REF ?? "";
if (!databaseUrl && (!managementToken || !projectRef))
  throw new Error("Configure a Postgres URL or SUPABASE_ACCESS_TOKEN plus SUPABASE_PROJECT_REF.");
const migration = await readFile(resolve("db/migrations/005_source_capability_ledger.sql"), "utf8");
const client = databaseUrl
  ? new Client(await resolveSourceRegistryClientConfig(databaseUrl))
  : new SupabaseManagementQueryClient({ managementToken, projectRef });

await client.connect();
let alreadyIngested = false;
try {
  await client.query(migration);
  const prior = await client.query(
    "SELECT ingestion_key FROM vmesh.source_ingestions WHERE ingestion_key = $1",
    [quarantine.ingestionKey]
  );
  alreadyIngested = prior.rowCount > 0;
  if (!alreadyIngested || args.force) await ingest(client, quarantine);

  const ledgerResult = await client.query(
    "SELECT * FROM vmesh.source_capability_ledger ORDER BY data_bucket, id"
  );
  const gapResult = await client.query(
    "SELECT count(*)::int AS count FROM vmesh.source_gaps WHERE status = 'open'"
  );
  const ledger = ledgerResult.rows.map(normalizeLedgerRow);
  const summary = summarizeCapabilityLedger(ledger, {
    generatedAt: new Date().toISOString(),
    discoveryGapCount: Number(gapResult.rows[0]?.count ?? 0)
  });
  const report = {
    schemaVersion: "vmesh-source-registry-ingest-report-v1",
    runId: quarantine.runId,
    ingestionKey: quarantine.ingestionKey,
    idempotentNoop: alreadyIngested && !args.force,
    forced: Boolean(args.force),
    promotionState: "quarantine",
    inputCounts: {
      authorities: quarantine.authorities.length,
      endpoints: quarantine.endpoints.length,
      collections: quarantine.collections.length,
      coverageEvidence: quarantine.coverageEvidence.length,
      gaps: quarantine.gapRegister.length
    },
    registrySummary: summary
  };
  await mkdir(outputRoot, { recursive: true });
  await Promise.all([
    writeJson(resolve(outputRoot, "source-capability-ledger.json"), {
      schemaVersion: "vmesh-source-capability-ledger-v1",
      generatedAt: summary.generatedAt,
      rows: ledger
    }),
    writeJson(resolve(outputRoot, "source-capability-summary.json"), summary),
    writeJson(resolve(outputRoot, "ingest-report.json"), report)
  ]);
  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        runId: quarantine.runId,
        ingestionKey: quarantine.ingestionKey,
        idempotentNoop: report.idempotentNoop,
        sourceCount: summary.sourceCount,
        capabilityStates: summary.capabilityStates,
        promotionStates: summary.promotionStates,
        outputRoot
      },
      null,
      2
    )}\n`
  );
} finally {
  await client.end();
}

async function ingest(clientInstance, input) {
  const run = input.review;
  const handoffRun = handoff.run;
  const endpointById = new Map(input.endpoints.map((row) => [row.id, row]));
  const coverageByEndpoint = latestCoverageByEndpoint(input.coverageEvidence);
  const collections = input.collections.map((row) => {
    const endpoint = endpointById.get(row.endpointId) ?? {};
    const coverage = coverageByEndpoint.get(row.endpointId) ?? {};
    const licensePosture = classifyLicensePosture(row.license ?? endpoint.license);
    const endpointStatus = String(endpoint.status ?? "candidate");
    const coverageStatus = String(coverage.coverageStatus ?? "unknown");
    const action = deriveCapabilityAction({
      capabilityState: row.capabilityState,
      promotionState: "quarantine",
      endpointStatus,
      coverageStatus,
      licensePosture
    });
    return {
      ...row,
      authorityId: endpoint.authorityId ?? null,
      endpointType: endpoint.endpointType ?? "unknown",
      sourceUrl: endpoint.url ?? null,
      accessMode: endpoint.authMode ?? "review",
      endpointStatus,
      coverageStatus,
      licensePosture,
      blocker: action.blocker,
      nextAction: action.nextAction,
      lastCheckedAt: coverage.checkedAt ?? endpoint.lastCheckedAt ?? null,
      evidenceRef: coverage.evidenceRef ?? endpoint.evidenceRef ?? null
    };
  });

  await clientInstance.query("BEGIN");
  try {
    await clientInstance.query(
      `INSERT INTO vmesh.source_runs
       (id, run_type, run_class, jurisdiction_scope, data_buckets, candidate_count,
        promoted_count, quarantined_count, artifact_ref, ingestion_key, generated_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,0,$6,$7,$8,$9,now())
       ON CONFLICT (id) DO UPDATE SET
         run_class=EXCLUDED.run_class, data_buckets=EXCLUDED.data_buckets,
         candidate_count=EXCLUDED.candidate_count, quarantined_count=EXCLUDED.quarantined_count,
         ingestion_key=EXCLUDED.ingestion_key, generated_at=EXCLUDED.generated_at, updated_at=now()`,
      [
        input.runId,
        handoffRun.runType ?? "intel_tools_discovery",
        handoffRun.runClass ?? "configured",
        handoffRun.jurisdictionScope ?? "global",
        handoffRun.dataBuckets ?? [],
        input.collections.length,
        `evidence:${input.ingestionKey.split(":").at(-1)}`,
        input.ingestionKey,
        handoff.generatedAt ?? null
      ]
    );
    await upsertAuthorities(clientInstance, input.authorities, input.runId);
    await upsertEndpoints(clientInstance, input.endpoints, input.runId);
    await upsertCollections(clientInstance, collections, input.runId);
    await upsertCoverage(clientInstance, input.coverageEvidence, input.runId);
    await upsertGaps(clientInstance, input.gapRegister, input.runId);
    await clientInstance.query(
      `INSERT INTO vmesh.source_ingestions
       (ingestion_key, run_id, content_hash, source_count, status)
       VALUES ($1,$2,$3,$4,'quarantined')
       ON CONFLICT (ingestion_key) DO UPDATE SET source_count=EXCLUDED.source_count`,
      [
        input.ingestionKey,
        input.runId,
        input.ingestionKey.split(":").at(-1),
        input.collections.length
      ]
    );
    await clientInstance.query("COMMIT");
  } catch (error) {
    await clientInstance.query("ROLLBACK");
    throw error;
  }
  return run;
}

async function upsertAuthorities(clientInstance, rows, runId) {
  await clientInstance.query(
    `INSERT INTO vmesh.source_authorities
     (id,name,jurisdiction_level,country_code,region_code,municipality,homepage_url,
      operator_type,reliability_tier,notes,disclosure_class,run_id,run_ids,updated_at)
     SELECT x.id,x.name,x.jurisdiction_level,x.country_code,x.region_code,x.municipality,
       x.homepage_url,x.operator_type,x.reliability_tier,x.notes,'public_safe',$2,ARRAY[$2],now()
     FROM jsonb_to_recordset($1::jsonb) AS x(
       id text,name text,jurisdiction_level text,country_code text,region_code text,
       municipality text,homepage_url text,operator_type text,reliability_tier text,notes text)
     ON CONFLICT (id) DO UPDATE SET
       name=COALESCE(EXCLUDED.name,vmesh.source_authorities.name),
       jurisdiction_level=COALESCE(EXCLUDED.jurisdiction_level,vmesh.source_authorities.jurisdiction_level),
       country_code=COALESCE(EXCLUDED.country_code,vmesh.source_authorities.country_code),
       region_code=COALESCE(EXCLUDED.region_code,vmesh.source_authorities.region_code),
       municipality=COALESCE(EXCLUDED.municipality,vmesh.source_authorities.municipality),
       homepage_url=COALESCE(EXCLUDED.homepage_url,vmesh.source_authorities.homepage_url),
       operator_type=COALESCE(EXCLUDED.operator_type,vmesh.source_authorities.operator_type),
       reliability_tier=COALESCE(EXCLUDED.reliability_tier,vmesh.source_authorities.reliability_tier),
       notes=COALESCE(EXCLUDED.notes,vmesh.source_authorities.notes),
       run_ids=(SELECT ARRAY(SELECT DISTINCT unnest(vmesh.source_authorities.run_ids || EXCLUDED.run_ids))),
       updated_at=now()`,
    [JSON.stringify(rows.map(camelToSnake)), runId]
  );
}

async function upsertEndpoints(clientInstance, rows, runId) {
  await clientInstance.query(
    `INSERT INTO vmesh.source_endpoints
     (id,authority_id,endpoint_type,url,auth_mode,license,status,recommended_vmesh_action,
      last_checked_at,evidence_ref,quality_score,reasons,warnings,disclosure_class,run_ids,updated_at)
     SELECT x.id,x.authority_id,x.endpoint_type,x.url,x.auth_mode,COALESCE(x.license,'review'),
       x.status,x.recommended_vmesh_action,x.last_checked_at,x.evidence_ref,COALESCE(x.quality_score,0),
       COALESCE(x.reasons,'[]'),COALESCE(x.warnings,'[]'),'public_safe',ARRAY[$2],now()
     FROM jsonb_to_recordset($1::jsonb) AS x(
       id text,authority_id text,endpoint_type text,url text,auth_mode text,license text,status text,
       recommended_vmesh_action text,last_checked_at timestamptz,evidence_ref text,
       quality_score double precision,reasons jsonb,warnings jsonb)
     ON CONFLICT (id) DO UPDATE SET
       authority_id=EXCLUDED.authority_id, endpoint_type=EXCLUDED.endpoint_type, url=EXCLUDED.url,
       auth_mode=EXCLUDED.auth_mode, license=EXCLUDED.license, status=EXCLUDED.status,
       recommended_vmesh_action=EXCLUDED.recommended_vmesh_action,
       last_checked_at=COALESCE(EXCLUDED.last_checked_at,vmesh.source_endpoints.last_checked_at),
       evidence_ref=COALESCE(EXCLUDED.evidence_ref,vmesh.source_endpoints.evidence_ref),
       quality_score=GREATEST(EXCLUDED.quality_score,vmesh.source_endpoints.quality_score),
       reasons=EXCLUDED.reasons, warnings=EXCLUDED.warnings,
       run_ids=(SELECT ARRAY(SELECT DISTINCT unnest(vmesh.source_endpoints.run_ids || EXCLUDED.run_ids))),
       updated_at=now()`,
    [JSON.stringify(rows.map(camelToSnake)), runId]
  );
}

async function upsertCollections(clientInstance, rows, runId) {
  await clientInstance.query(
    `INSERT INTO vmesh.source_collections
     (id,title,provider,asset_type,data_bucket,endpoint_type,source_url,license,status,
      recommended_vmesh_action,quality_score,crs,coverage,fetch_recipe,disclosure_class,run_id,
      authority_id,endpoint_id,provider_collection_id,source_role,resolution_meters,vertical_datum,
      asset_roles,limitations,capability_state,promotion_state,access_mode,endpoint_status,
      coverage_status,license_posture,blocker,next_action,last_checked_at,evidence_ref,run_ids,updated_at)
     SELECT x.id,x.title,x.provider,x.asset_type,x.data_bucket,x.endpoint_type,x.source_url,x.license,
       x.status,x.recommended_vmesh_action,COALESCE(x.quality_score,0),x.crs,x.coverage,x.fetch_recipe,
       'public_safe',$2,x.authority_id,x.endpoint_id,x.provider_collection_id,x.source_role,
       x.resolution_meters,x.vertical_datum,COALESCE(x.asset_roles,'[]'),COALESCE(x.limitations,'[]'),
       x.capability_state,'quarantine',x.access_mode,x.endpoint_status,x.coverage_status,
       x.license_posture,x.blocker,x.next_action,x.last_checked_at,x.evidence_ref,ARRAY[$2],now()
     FROM jsonb_to_recordset($1::jsonb) AS x(
       id text,title text,provider text,asset_type text,data_bucket text,endpoint_type text,
       source_url text,license text,status text,recommended_vmesh_action text,quality_score double precision,
       crs text,coverage jsonb,fetch_recipe jsonb,authority_id text,endpoint_id text,
       provider_collection_id text,source_role text,resolution_meters double precision,
       vertical_datum text,asset_roles jsonb,limitations jsonb,capability_state text,access_mode text,
       endpoint_status text,coverage_status text,license_posture text,blocker text,next_action text,
       last_checked_at timestamptz,evidence_ref text)
     ON CONFLICT (id) DO UPDATE SET
       title=EXCLUDED.title, provider=EXCLUDED.provider, asset_type=EXCLUDED.asset_type,
       data_bucket=EXCLUDED.data_bucket, endpoint_type=EXCLUDED.endpoint_type,
       source_url=EXCLUDED.source_url, license=EXCLUDED.license, status=EXCLUDED.status,
       recommended_vmesh_action=EXCLUDED.recommended_vmesh_action,
       quality_score=GREATEST(EXCLUDED.quality_score,vmesh.source_collections.quality_score),
       crs=COALESCE(EXCLUDED.crs,vmesh.source_collections.crs), coverage=EXCLUDED.coverage,
       fetch_recipe=COALESCE(EXCLUDED.fetch_recipe,vmesh.source_collections.fetch_recipe),
       authority_id=EXCLUDED.authority_id, endpoint_id=EXCLUDED.endpoint_id,
       provider_collection_id=EXCLUDED.provider_collection_id, source_role=EXCLUDED.source_role,
       resolution_meters=COALESCE(EXCLUDED.resolution_meters,vmesh.source_collections.resolution_meters),
       vertical_datum=COALESCE(EXCLUDED.vertical_datum,vmesh.source_collections.vertical_datum),
       asset_roles=EXCLUDED.asset_roles, limitations=EXCLUDED.limitations,
       capability_state=CASE
         WHEN array_position(ARRAY['metadata-only','probe-ready','adapter-ready','live-materialized','abundance-live-proven'],EXCLUDED.capability_state)
            > array_position(ARRAY['metadata-only','probe-ready','adapter-ready','live-materialized','abundance-live-proven'],vmesh.source_collections.capability_state)
         THEN EXCLUDED.capability_state ELSE vmesh.source_collections.capability_state END,
       promotion_state=CASE WHEN vmesh.source_collections.promotion_state='promoted'
         THEN 'promoted' ELSE 'quarantine' END,
       access_mode=EXCLUDED.access_mode, endpoint_status=EXCLUDED.endpoint_status,
       coverage_status=EXCLUDED.coverage_status, license_posture=EXCLUDED.license_posture,
       blocker=CASE WHEN vmesh.source_collections.promotion_state='promoted'
         THEN vmesh.source_collections.blocker ELSE EXCLUDED.blocker END,
       next_action=CASE WHEN vmesh.source_collections.promotion_state='promoted'
         THEN vmesh.source_collections.next_action ELSE EXCLUDED.next_action END,
       last_checked_at=COALESCE(EXCLUDED.last_checked_at,vmesh.source_collections.last_checked_at),
       evidence_ref=COALESCE(EXCLUDED.evidence_ref,vmesh.source_collections.evidence_ref),
       run_ids=(SELECT ARRAY(SELECT DISTINCT unnest(vmesh.source_collections.run_ids || EXCLUDED.run_ids))),
       updated_at=now()`,
    [JSON.stringify(rows.map(camelToSnake)), runId]
  );
}

async function upsertCoverage(clientInstance, rows, runId) {
  await clientInstance.query(
    `INSERT INTO vmesh.coverage_evidence
     (id,endpoint_id,query_ref,disclosure_class,run_class,coverage_status,selected_assets,
      evidence_ref,checked_at,run_ids,updated_at)
     SELECT x.id,x.endpoint_id,x.query_ref,x.disclosure_class,x.run_class,x.coverage_status,
       COALESCE(x.selected_assets,'[]'),x.evidence_ref,x.checked_at,ARRAY[$2],now()
     FROM jsonb_to_recordset($1::jsonb) AS x(
       id text,endpoint_id text,query_ref text,disclosure_class text,run_class text,
       coverage_status text,selected_assets jsonb,evidence_ref text,checked_at timestamptz)
     ON CONFLICT (id) DO UPDATE SET
       coverage_status=EXCLUDED.coverage_status, selected_assets=EXCLUDED.selected_assets,
       evidence_ref=COALESCE(EXCLUDED.evidence_ref,vmesh.coverage_evidence.evidence_ref),
       checked_at=COALESCE(EXCLUDED.checked_at,vmesh.coverage_evidence.checked_at),
       run_ids=(SELECT ARRAY(SELECT DISTINCT unnest(vmesh.coverage_evidence.run_ids || EXCLUDED.run_ids))),
       updated_at=now()`,
    [JSON.stringify(rows.map(camelToSnake)), runId]
  );
}

async function upsertGaps(clientInstance, rows, runId) {
  await clientInstance.query(
    `INSERT INTO vmesh.source_gaps
     (id,run_id,data_bucket,jurisdiction_scope,priority,description,recommended_action,status,updated_at)
     SELECT x.id,$2,x.data_bucket,x.jurisdiction_scope,x.priority,x.description,
       x.recommended_action,x.status,now()
     FROM jsonb_to_recordset($1::jsonb) AS x(
       id text,data_bucket text,jurisdiction_scope text,priority integer,
       description text,recommended_action text,status text)
     ON CONFLICT (id) DO UPDATE SET
       data_bucket=EXCLUDED.data_bucket, jurisdiction_scope=EXCLUDED.jurisdiction_scope,
       priority=EXCLUDED.priority, description=EXCLUDED.description,
       recommended_action=EXCLUDED.recommended_action, status=EXCLUDED.status, updated_at=now()`,
    [JSON.stringify(rows.map(camelToSnake)), runId]
  );
}

function latestCoverageByEndpoint(rows) {
  const latest = new Map();
  for (const row of rows) {
    if (!row.endpointId) continue;
    const prior = latest.get(row.endpointId);
    if (!prior || String(row.checkedAt ?? "") > String(prior.checkedAt ?? ""))
      latest.set(row.endpointId, row);
  }
  return latest;
}

function camelToSnake(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
      value
    ])
  );
}

function normalizeLedgerRow(row) {
  return {
    id: row.id,
    authorityId: row.authority_id,
    endpointId: row.endpoint_id,
    dataBucket: row.data_bucket,
    sourceRole: row.source_role,
    capabilityState: row.capability_state,
    promotionState: row.promotion_state,
    endpointStatus: row.endpoint_status,
    coverageStatus: row.coverage_status,
    licensePosture: row.license_posture,
    accessMode: row.access_mode,
    resolutionMeters: row.resolution_meters == null ? null : Number(row.resolution_meters),
    recipeFamily: row.recipe_family,
    lastCheckedAt: row.last_checked_at?.toISOString?.() ?? row.last_checked_at ?? null,
    evidenceRef: row.evidence_ref,
    blocker: row.blocker,
    nextAction: row.next_action
  };
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--force" || value === "--local-only") {
      parsed[value === "--force" ? "force" : "localOnly"] = true;
      continue;
    }
    if (!value.startsWith("--")) throw new Error(`Unexpected argument: ${value}`);
    const key = value.slice(2).replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
    const next = values[index + 1];
    if (!next || next.startsWith("--")) throw new Error(`Missing value for ${value}.`);
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

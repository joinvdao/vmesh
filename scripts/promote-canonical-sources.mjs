#!/usr/bin/env node

import { CANONICAL_PROMOTION_METADATA } from "../lib/canonicalPromotionMetadata.ts";
import {
  evaluateSourcePromotion,
  operationalPromotionCandidates
} from "../lib/sourcePromotionGate.ts";
import { SupabaseManagementQueryClient } from "../lib/supabaseManagementQueryClient.ts";

const apply = process.argv.includes("--apply");
const managementToken = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const projectRef =
  process.env.SUPABASE_PROJECT_REF ?? process.env.SIMPLELOOP_SUPABASE_PROJECT_REF ?? "";
if (apply && (!managementToken || !projectRef)) {
  throw new Error("SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF are required for --apply.");
}

const now = new Date();
const metadataById = new Map(CANONICAL_PROMOTION_METADATA.map((row) => [row.sourceId, row]));
const rows = operationalPromotionCandidates().map((candidate) => {
  const metadata = metadataById.get(candidate.sourceId);
  if (!metadata) throw new Error(`Canonical metadata is missing for ${candidate.sourceId}.`);
  const result = evaluateSourcePromotion(candidate, { now });
  return { candidate, metadata, result };
});
const rejected = rows.filter((row) => row.result.decision !== "promoted");
if (rejected.length) {
  throw new Error(
    `Promotion gate rejected: ${rejected
      .map((row) => `${row.candidate.sourceId}=${row.result.reasons.join("|")}`)
      .join(", ")}`
  );
}

if (!apply) {
  printReport(
    false,
    rows.length,
    rows.map((row) => row.result)
  );
  process.exit(0);
}

const client = new SupabaseManagementQueryClient({ managementToken, projectRef });
const runId = `curated-operational-promotion:${now.toISOString().slice(0, 10)}`;
await client.connect();
try {
  await client.query("BEGIN");
  await client.query(
    `INSERT INTO vmesh.source_runs
     (id,run_type,run_class,jurisdiction_scope,data_buckets,candidate_count,promoted_count,
      quarantined_count,artifact_ref,generated_at,updated_at)
     VALUES ($1,'curated-operational-promotion','live_proof','global',$2,$3,$3,0,
       'docs/evidence/source-promotion-summary-2026-07-11.json',$4,now())
     ON CONFLICT (id) DO UPDATE SET promoted_count=EXCLUDED.promoted_count,
       artifact_ref=EXCLUDED.artifact_ref,generated_at=EXCLUDED.generated_at,updated_at=now()`,
    [
      runId,
      [...new Set(rows.map((row) => row.metadata.dataBucket))],
      rows.length,
      now.toISOString()
    ]
  );
  for (const row of rows) await upsertPromotedSource(client, row, runId);
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}

printReport(
  true,
  rows.length,
  rows.map((row) => row.result)
);

async function upsertPromotedSource(clientInstance, row, promotionRunId) {
  const { candidate, metadata } = row;
  const authorityId = `curated-authority:${candidate.sourceId}`;
  const endpointId = `curated-endpoint:${candidate.sourceId}`;
  const coverage = {
    coverageSummary: candidate.coverageStatus,
    resolutionOrScale: candidate.resolutionOrScale,
    confidence: candidate.confidence
  };
  const fetchRecipe = {
    adapter: candidate.recipeFamily,
    materializerId: candidate.sourceId,
    method: "GET",
    urlTemplate: candidate.endpoint,
    steps: ["Execute the reviewed source-specific materializer for the requested bounded AOI."]
  };
  const promotionReasons = [
    "authority-reviewed",
    "license-reviewed",
    "coverage-proven",
    "materializer-live-proven",
    `fixture:${candidate.fixtureEvidenceRef}`,
    `live:${candidate.liveEvidenceRef}`
  ];
  await clientInstance.query(
    `INSERT INTO vmesh.source_authorities
     (id,name,jurisdiction_level,homepage_url,operator_type,reliability_tier,notes,
      disclosure_class,run_id,run_ids,updated_at)
     VALUES ($1,$2,'global',$3,'official-or-foundation','reviewed',
      'Curated from the reviewed runtime registry after retained live proof.',
      'public_safe',$4,ARRAY[$4],now())
     ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,homepage_url=EXCLUDED.homepage_url,
      reliability_tier=EXCLUDED.reliability_tier,
      run_ids=(SELECT ARRAY(SELECT DISTINCT unnest(vmesh.source_authorities.run_ids || EXCLUDED.run_ids))),
      updated_at=now()`,
    [authorityId, metadata.attribution, candidate.endpoint, promotionRunId]
  );
  await clientInstance.query(
    `INSERT INTO vmesh.source_endpoints
     (id,authority_id,endpoint_type,url,auth_mode,license,status,recommended_vmesh_action,
      last_checked_at,evidence_ref,quality_score,reasons,warnings,disclosure_class,run_ids,updated_at)
     VALUES ($1,$2,$3,$4,'public',$5,'verified','serve-ranked-source',$6,$7,$8,$9::jsonb,
      '[]'::jsonb,'public_safe',ARRAY[$10],now())
     ON CONFLICT (id) DO UPDATE SET endpoint_type=EXCLUDED.endpoint_type,url=EXCLUDED.url,
      license=EXCLUDED.license,status='verified',last_checked_at=EXCLUDED.last_checked_at,
      evidence_ref=EXCLUDED.evidence_ref,quality_score=EXCLUDED.quality_score,
      reasons=EXCLUDED.reasons,run_ids=(SELECT ARRAY(SELECT DISTINCT unnest(vmesh.source_endpoints.run_ids || EXCLUDED.run_ids))),
      updated_at=now()`,
    [
      endpointId,
      authorityId,
      candidate.recipeFamily,
      candidate.endpoint,
      metadata.license,
      candidate.lastHealthyAt,
      candidate.liveEvidenceRef,
      candidate.confidence,
      JSON.stringify(promotionReasons),
      promotionRunId
    ]
  );
  await clientInstance.query(
    `INSERT INTO vmesh.source_collections
     (id,title,provider,asset_type,data_bucket,endpoint_type,source_url,license,status,
      recommended_vmesh_action,quality_score,coverage,fetch_recipe,disclosure_class,run_id,
      authority_id,endpoint_id,provider_collection_id,source_role,resolution_meters,asset_roles,
      limitations,capability_state,promotion_state,access_mode,endpoint_status,coverage_status,
      license_posture,blocker,next_action,last_checked_at,last_healthy_at,consecutive_failures,
      promotion_reasons,evidence_ref,run_ids,updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'verified','serve-ranked-source',$9,$10::jsonb,$11::jsonb,
      'public_safe',$12,$13,$14,$1,$15,$16,$17::jsonb,$18::jsonb,'abundance-live-proven',
      'promoted','public','verified',$19,'reviewed-open',NULL,'serve-ranked-source',$20,$20,0,
      $21::jsonb,$22,ARRAY[$12],now())
     ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,provider=EXCLUDED.provider,
      asset_type=EXCLUDED.asset_type,data_bucket=EXCLUDED.data_bucket,
      endpoint_type=EXCLUDED.endpoint_type,source_url=EXCLUDED.source_url,license=EXCLUDED.license,
      status='verified',quality_score=EXCLUDED.quality_score,coverage=EXCLUDED.coverage,
      fetch_recipe=EXCLUDED.fetch_recipe,authority_id=EXCLUDED.authority_id,
      endpoint_id=EXCLUDED.endpoint_id,source_role=EXCLUDED.source_role,
      resolution_meters=EXCLUDED.resolution_meters,asset_roles=EXCLUDED.asset_roles,
      limitations=EXCLUDED.limitations,capability_state='abundance-live-proven',
      promotion_state='promoted',access_mode='public',endpoint_status='verified',
      coverage_status=EXCLUDED.coverage_status,license_posture='reviewed-open',blocker=NULL,
      next_action='serve-ranked-source',last_checked_at=EXCLUDED.last_checked_at,
      last_healthy_at=EXCLUDED.last_healthy_at,consecutive_failures=0,
      promotion_reasons=EXCLUDED.promotion_reasons,evidence_ref=EXCLUDED.evidence_ref,
      run_ids=(SELECT ARRAY(SELECT DISTINCT unnest(vmesh.source_collections.run_ids || EXCLUDED.run_ids))),
      updated_at=now()`,
    [
      candidate.sourceId,
      metadata.label,
      metadata.attribution,
      metadata.artifactKinds[0],
      metadata.dataBucket,
      candidate.recipeFamily,
      candidate.endpoint,
      metadata.license,
      candidate.confidence,
      JSON.stringify(coverage),
      JSON.stringify(fetchRecipe),
      promotionRunId,
      authorityId,
      endpointId,
      candidate.sourceRole,
      resolutionMeters(candidate.resolutionOrScale),
      JSON.stringify({ layerIds: metadata.layerIds, artifactKinds: metadata.artifactKinds }),
      JSON.stringify(candidate.limitations),
      candidate.coverageStatus,
      candidate.lastHealthyAt,
      JSON.stringify(promotionReasons),
      candidate.liveEvidenceRef
    ]
  );
}

function resolutionMeters(value) {
  const match = value?.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*m(?:\s|$)/i);
  return match ? Number(match[1]) : null;
}

function printReport(applied, promotedCount, results) {
  process.stdout.write(
    `${JSON.stringify(
      {
        schemaVersion: "vmesh-canonical-source-promotion-v1",
        generatedAt: now.toISOString(),
        runClass: applied ? "live-proof" : "configured",
        applied,
        promotedCount,
        rejectedCount: results.filter((result) => result.decision !== "promoted").length,
        results
      },
      null,
      2
    )}\n`
  );
}

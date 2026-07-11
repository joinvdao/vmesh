# Intel Tools Source Refresh Runbook

## Ownership

Intel Tools owns discovery, bounded probes, retained evidence, and
`vmesh-intel-source-handoff-v1` export. VMesh owns refresh requests, independent
validation, review/clean, idempotent quarantine ingestion, ranking, and
promotion. Abundance workers execute promoted recipes.

Normal coordinate requests never call Intel Tools.

## Operator Command

Configure the private Intel Tools service URL and operator credential without
committing either value, then run:

```bash
npm run intel:refresh -- --mode live --approve
```

The default `managed` execution mode assumes the Intel Tools VPS worker pool is
running. It creates and approves the mission, then polls durable mission state
until all tasks finish. Run the bounded production smoke as a complete managed
campaign so the durable worker cannot race a separate inline worker:

```bash
npm run intel:refresh -- --manifest config/intel-source-refresh-smoke.json --mode live --approve
```

For an isolated local proof:

```bash
npm run intel:refresh -- --mode mock --execution inline --approve --base-url http://127.0.0.1:8111
```

An inline run with `--max-tasks` is a diagnostic, not a campaign completion.
If tasks remain, the CLI pauses the mission and refuses to export a VMesh
handoff. Do not use this mode against an always-on shared worker pool. Complete
the mission before ingesting its handoff.

Resume or re-export an existing durable mission without creating another run:

```bash
npm run intel:refresh -- --mode live --mission-id <mission-id>
```

Validate and ingest a previously delivered artifact without network access:

```bash
npm run intel:refresh -- --handoff-file <handoff.json>
```

## Output

Each run writes a private/operator-local artifact directory containing:

- `vmesh-intel-source-handoff-v1.json`
- `review-clean-report.json`
- `vmesh-intel-quarantine-v1.json`
- `run-report.json`

The quarantine package is ready for VMesh registry upsert, not operational
promotion. Metadata-only, probe-ready, unsafe, secret-bearing, malformed, and
unsupported-recipe records cannot become game defaults.

After reviewing a completed handoff, ingest it into the durable private registry:

```bash
npm run registry:ingest -- --handoff <handoff.json>
```

Generate the exact typed reconciliation report without mutating the registry:

```bash
npm run registry:ingest -- --handoff <handoff.json> --local-only
```

Direct Supabase pooler ingestion also requires `SUPABASE_DB_CA_CERT_PATH` (or
`SUPABASE_DB_CA_CERT`) from the project's **Database Settings > SSL
Configuration**. The ingester uses hostname and CA verification and will not
fall back to `rejectUnauthorized: false`. A valid Supabase Management API PAT
can be used instead when no database URL is configured.

Load Infisical `prod:/supabase/simpleloop`. A direct database URL is preferred;
otherwise the ingester deterministically builds the Supabase session-pooler URL
from the retained password, project ref, and region. If only a scoped PAT is
available, it uses the authenticated Management API query boundary. Every path
applies the additive migration and one atomic, idempotent transaction. Ingestion
keeps every new record in quarantine; phase 036 owns promotion.

## Repeatability

- Campaign inputs are versioned in `config/intel-source-refresh.json`.
- Mission IDs permit restart and export recovery.
- Handoff ingestion is keyed by run ID plus deterministic content hash.
- Replaying identical content is a no-op.
- New evidence merges by stable source IDs and preserves previous run IDs.
- Intel Tools retains discovery evidence; VMesh retains review and promotion
  state.

## Evidence Classes

- `mock`: orchestration and deterministic output shape only.
- `dry_run`: bounded fetch/planning without live extraction claims.
- `configured`: service and credentials appear wired, but no retained provider
  artifact proves operation.
- `live_proof`: real discovery/probes produced retained reviewable evidence.

Code readiness and live readiness must always be reported separately.

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
until all tasks finish. For a local bounded proof:

```bash
npm run intel:refresh -- --mode mock --execution inline --approve --base-url http://127.0.0.1:8111
```

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

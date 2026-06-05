# Live Evidence Discipline

vmesh separates code completion from operational proof.

- Code bar: implementation, type contracts, tests, lint, build, fixtures, and local UI checks.
- Live bar: retained evidence that a real provider, worker, cache, package, storage target, or publication flow produced the intended artifact.

Passing the code bar does not prove the live bar. For external workflows, the correct completion phrase is `code implemented, live operation not proven` until retained live evidence exists.

## Run Classes

- `mock`: no external provider or live artifact was touched.
- `dry-run`: validated inputs, planning, or local behavior without live side effects.
- `configured`: credentials, env vars, clients, routes, queues, or workers appear wired, but no retained live artifact proves the workflow.
- `live-proof`: a real provider or external system produced a retained, reviewable artifact or response under the intended workflow.

## Tile And Cache Evidence

Tile, package, public-cache, or publication workflows need retained evidence before they are described as generated, published, pinned, or production-ready:

- Input manifest: source dataset, license/provenance, spatial index, resolution, timestamp, and confidence.
- Worker evidence: job ID, version or digest, start/end timestamps, resource class, cost estimate, and exit status.
- Artifact manifest: output paths or public-safe object keys, byte sizes, checksums, tile bounds, and sample QA.
- Publication evidence: visibility, retention policy, cache invalidation policy, and rollback path.

## Reporting Rule

When closing a task, report:

- Code bar: commands run and result.
- Live bar: run class, evidence path, provider IDs where safe, and remaining unproven stages.

If a workflow is blocked because external evidence is missing, say that directly. Do not describe it as a failed unit test unless a unit test actually failed.

## Public Safety

Evidence in this public-oriented repository must not include exact private addresses, exact private coordinates, raw PII, secrets, provider tokens, signed URLs, local machine identifiers, paid-provider order details, or terms-uncleared data.

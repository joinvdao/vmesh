# vmesh Phase 30: Source Capability Ledger And Queue Reconciliation

## Goal

Reconcile the June source review, the human and machine queues, retained Intel
Tools output, current VMesh adapters, July live evidence, and the current
Abundance handoff. Do not start another discovery campaign until this inventory
is complete.

## Required Work

1. Enumerate every canonical registry source and collection without copying
   heavy payloads or raw sidecar databases into Git.
2. Assign exactly one current capability state:
   - `metadata-only`
   - `probe-ready`
   - `adapter-ready`
   - `live-materialized`
   - `abundance-live-proven`
3. Retain separate fields for endpoint health, coverage evidence, license
   posture, access mode, source role, resolution/scale, recipe family, last
   probe time, evidence reference, blocker, and next action.
4. Derive the ledger from typed registry and evidence records where possible;
   do not create a second manually maintained source registry.
5. Add phase 012 to the machine queue and reconcile stale 013-028 statuses
   against actual commits and evidence. Mark work `done` only when its stated
   live bar is met; otherwise use `private-done-partial` or leave it queued.
6. Update `docs/GEOSPATIAL_SOURCE_REVIEW.md` and queue documentation with a
   dated current-state summary.

## Deliverables

- Typed capability classification and deterministic tests.
- Public-safe generated capability ledger/report.
- Reconciled human and machine queues.
- Explicit list of discovery gaps versus adapter/materializer gaps.

## Gates

Run the standing gates plus JSON schema/parse validation. Privacy checks must
reject exact private coordinates, local paths, signed URLs, credentials, and
raw provider payloads.

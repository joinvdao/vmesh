# vmesh Phase 21: Abundance/VMesh Seam Audit

You are Codex acting as a cross-repo integration engineer.

## Goal

Audit the current seam between private VMesh and Building Abundance before
implementation. Produce a precise map of what exists, what is duplicated, what
is stale, and what blocks Abundance from generating real source-backed terrain
slices from VMesh source packages.

## Repos

- VMesh source of truth: `0xkri/vmesh` private `main`.
- Abundance app: `abundance-v2`.
- Abundance builders: `building-abundance`.

Do not edit public `joinvdao/vmesh` unless explicitly instructed. Do not edit
Abundance renderer/scene hot files such as `components/lookdev/**`.

## Audit Questions

Answer with file references:

1. What VMesh routes currently return BA-facing source refs?
2. What VMesh routes are source-ref only versus executable recipe aware?
3. What terrain source adapters already exist for USA, Canada, BC, and UK?
4. What Abundance routes/builders currently generate source packs?
5. Where does Abundance currently accept terrain, vector, mask, and provenance
   inputs?
6. Where does the Rose/golden source-pack builder remain hardcoded?
7. What handoff fields are missing for Abundance to execute recipes?
8. Which tests prove the seam, and which only prove local fixtures?

## Deliverable

Commit a private audit doc:

`docs/ABUNDANCE_VMESH_SEAM_AUDIT.md`

It must include:

- current flow diagram;
- desired flow diagram;
- exact source of truth per field;
- missing fields;
- route and builder inventory;
- risks;
- next implementation order;
- no private exact coordinates or local absolute paths.

## Verification

Run:

- `git status --short`
- targeted grep/find commands proving the inventory
- `npm run privacy:check` in VMesh if docs are committed there

Report whether the seam is currently operational, partially operational, or
contract-only.

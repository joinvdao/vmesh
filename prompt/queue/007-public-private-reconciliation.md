# 007 — Public/private broker reconciliation (promote the execution tier)

**Repo:** vmesh (public) · **Gate:** operator review of the public/private
boundary · **Status:** TODO

## Why this exists

The public repo ships the _planning_ tier of the geospatial package broker
(source registries, planner, typed contracts — honest, but it generates no
artifacts). The private working fork (`0xkri/vmesh`) has advanced a full
generation ahead: live terrain-source adapters (USGS 3DEP, Canada HRDEM, BC
LiDAR), Python raster/LiDAR workers, PNG tile rendering with sha256 disk
caching behind `app/api/terrain/source-preview/*`, a live-proof harness with
elevation-statistics assertions, an intel source broker, and a SQL
registry/jurisdiction layer. None of that is published, and no queue item
tracked the gap until now. The suite-level audit (2026-06-17) flagged this as
"execute 007–012; reconcile public/private — not new prompts"; this prompt is
that reconciliation, on the public side.

## Scope

- Review the private fork's execution tier and classify each module:
  **publish** (generic engine code — adapters, worker, proofs, tile renderer,
  probe libs, Python scripts + `requirements.gis-worker.txt`), **hold private**
  (downstream-consumer packages `ba*Package.ts`, private AOIs, eval corpora
  with client context, `db/seed` handoff data), or **split** (docs that mix
  generic contracts with private consumer references).
- Scrub before publish: `npm run privacy:check` + `public-workflow:check` must
  pass; no private AOI coordinates, client names, machine paths, or Infisical
  key names in published code/docs; license-verify each upstream source the
  adapters hit (all currently open government endpoints).
- Publish the generic subset to `joinvdao/vmesh` with the live-proof vitest
  configs wired but **network-gated** (live-proof suites opt-in via env, so
  public CI stays hermetic).
- Keep the private fork as the integration lane for Building Abundance; after
  promotion it should rebase its consumer packages on the published engine
  rather than carrying a diverged copy.
- Update `docs/PRODUCT_SCOPE.md` + `README.md` so the public claims match the
  newly published capability (the "package broker" stops being planning-only).

## Acceptance

- Public repo gains the terrain-source execution engine with its live-proof
  harness; full verification suite green (`npm test`, `build`,
  `privacy:check`, `public-workflow:check`).
- No `ba*` consumer package, private AOI, or client-specific eval data in the
  public tree (grep-verified).
- A boundary note in `docs/` records what stayed private and why.

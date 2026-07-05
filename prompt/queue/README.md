# vmesh — public execution queue

Status index added 2026-07-05 — the globe-track prompts (001–006) were written
and executed in May without status bookkeeping; this README is now the status
source of truth for the public queue. The broker/terrain execution track
(007–012) lives in the **private working fork** (`0xkri/vmesh`); the public
counterpart of that work is tracked here as `007`.

| #   | Step                                              | Status                                                             |
| --- | ------------------------------------------------- | ------------------------------------------------------------------ |
| 001 | Real globe renderer architecture (mode split)     | ✅ done (`ThreeEarthGlobe.tsx` + camera/materials/texture helpers) |
| 002 | Earth materials, atmosphere, clouds, light/dark   | ✅ done (bundled Blue Marble + procedural fallback)                |
| 003 | Globe interaction physics (drag/inertia/idle)     | ✅ done                                                            |
| 004 | Search flight choreography (orbit → MapLibre)     | ✅ done                                                            |
| 005 | Overlay/H3 discipline (hidden by default, tiered) | ✅ done (U8-only-inside-U5 enforced in `lib/h3Mesh.ts`)            |
| 006 | Globe polish, QA, docs                            | ✅ done (verification suite green 2026-07-05: 114/114 tests)       |
| 007 | Public/private broker reconciliation              | TODO — see `007-public-private-reconciliation.md`                  |

CI already exists (`.github/workflows/ci.yml` + scheduled maintenance/janitor,
lockfile fixed + green 2026-07-05) — no CI prompt needed here, unlike the other
pillars.

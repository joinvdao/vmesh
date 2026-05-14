# vmesh Globe Phase 6: Polish, QA, Docs, And Production Hardening

You are Codex acting as a senior frontend production engineer.

## Goal

Turn the real globe implementation into a stable, documented, verified product feature.

## Implementation

- Browser QA desktop and mobile.
- Memory cleanup review for Three.js and MapLibre coexistence.
- Reduced-motion verification.
- Light/dark mode visual pass.
- Update:
  - `README.md`
  - `docs/DESIGN_DIRECTION.md`
  - `docs/SYSTEM_DESIGN.md`
  - `docs/OPERATIONS.md`
  - `docs/SECURITY_PRIVACY.md`
  - `docs/TESTING.md`
  - `docs/USER_GUIDE.md`
- Tests:
  - render mode mapping
  - search target math
  - H3 visibility defaults
  - texture registry fallback
  - theme state

## Verification

Run:

- `npm run format:check`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run agent-ready:check`
- `npm run public-workflow:check`
- `npm run privacy:check`

Browser verify:

- true 3D globe
- no blank state
- drag spin works
- search flight works
- light/dark modes polished
- overlays toggle
- no body scroll
- no uncaught console errors

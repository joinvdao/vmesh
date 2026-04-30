# Testing

## Required Verification

Run the full V1 verification set before calling product work complete:

```bash
npm run format:check
npm run lint
npm test
npm run build
npm run agent-ready:check
npm run public-workflow:check
npm run privacy:check
npm audit --audit-level=moderate
```

For visual verification:

```bash
npm run dev
```

Then open `http://localhost:3000` and confirm the dashboard renders as a screenshot-like first viewport with no body scrolling, a visible globe, visible mesh overlay, right selected-hex panel, bottom analytics strip, footer telemetry, local user record flow, terrain/source status, hover tooltip, click selection, and no uncaught console errors.

## Test Layers

- Unit tests protect H3 tier mapping, U8 scoping/capping, parent/child helpers, scoring labels, color interpolation, terrain provider normalization, provider fallback ordering, Zustand state actions, hover, selection, layer toggles, terrain status, and user records.
- Component behavior is currently covered through TypeScript, linting, build checks, and browser verification.
- Browser verification protects layout, map rendering, interaction wiring, and console health.

## Deterministic Rules

- Mock geospatial data must be stable and versioned in code.
- Tests must not call paid providers or live production APIs.
- Date-sensitive behavior must use fixed dates or injected clocks.
- Generated local mesh data must be capped and deterministic.

## Provider Testing

Provider tests should cover:

- `raster-dem-tilejson` normalization.
- `raster-dem-xyz` Terrarium normalization.
- Future/provider placeholder handling for PMTiles, API DEM, dataset DEM, and STAC catalog sources.
- Fallback order from env provider to no-token demo provider.
- License-gated and preprocessing-required statuses.

## When Tests Must Change

Update tests when state shape, H3 data contracts, chart semantics, renderer events, privacy rules, or provider fallbacks change.

## CI Expectations

CI must run install, lint, tests, agent-ready checks, public-workflow checks, privacy checks, audit, and build. Scheduled maintenance may open cleanup PRs but must not push directly to `main`.

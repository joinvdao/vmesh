# Operations

## Environment Contracts

Required local runtime:

- Node `24.11.1`
- npm `11.6.2`

Use `.env.local` for local environment variables. Keep `.env.example` current and token-free.

## Baseline Commands

```bash
npm install
npm run format:check
npm run lint
npm test
npm run build
npm run agent-ready:check
npm run public-workflow:check
npm run privacy:check
npm audit --audit-level=moderate
```

## Local Preview Runbook

Start the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Expected first viewport:

- Fixed left sidebar, top header/search, central globe canvas, right selected-hex card, bottom analytics strip, and footer telemetry.
- Visible H3 mesh overlay and nonblank map/globe surface.
- Terrain/source status visible in footer and notes panels.
- U3/U5/U8 tier controls, with U8 generated locally inside the selected U5 context.
- Local/private user record flow in the right-side user data panel.

## Terrain Provider Operations

V1 terrain selection is registry-driven:

1. Use `NEXT_PUBLIC_TERRAIN_TILEJSON_URL` when configured.
2. Fall back to the no-token demo raster-dem provider.
3. Keep the globe shell nonblank and report provider status if terrain is unavailable.

Do not add paid terrain APIs, secret-bearing URLs, or live ingestion jobs without adding provider metadata, tests, license notes, cost controls, and fallback behavior.

## Data Operations

The V1 app distinguishes:

- App-pulled prepopulated macro data.
- App-pulled prepopulated micro data.
- User-added local/mock records.
- Derived H3 summaries.
- Provider registry entries that are map-ready, future, license-gated, API-gated, or preprocessing-required.

Every future ingestion path must document source, license/terms, update cadence, failure behavior, cost profile, confidence model, and privacy risk.

## Release Checklist

- Lint, tests, agent-ready, tickets, audit, and build pass.
- Browser verification passes on desktop and a narrower viewport.
- No console errors during initial load, tier changes, hover, click selection, and local record add flow.
- Docs are updated for changed product, architecture, privacy, operations, or analytics behavior.
- Environment variables are configured in Vercel.
- User-added data defaults and provenance labels are verified.

## Provider Outage Runbooks

- Basemap outage: show renderer error state and keep DOM panels usable.
- Terrain outage: degrade to globe/basemap without elevation and show provider status.
- Macro data outage: mark affected layers unavailable and preserve cached/mock fallback where allowed.
- Micro data outage: mark affected local asset layers unavailable and do not fabricate records.
- Analytics outage: queue or drop non-critical telemetry without blocking UI.

## Cost Spike Runbook

1. Disable non-essential provider calls.
2. Check tile, analytics, property, local-market, climate, and model-provider dashboards.
3. Confirm rate limits and caching behavior.
4. Open a ticket with findings and mitigation.

## Deployment Provider Setup

Assume Vercel plus GitHub:

- Import the GitHub repository into Vercel.
- Use `main` as production branch unless changed.
- Enable preview deployments for pull requests.
- Configure env vars for development, preview, and production.
- Build command: `npm run build`.
- Install command: `npm install`.
- Output directory: managed by Next.js.

Do not commit `.vercel/`.

## Rollback Rules

Prefer Vercel deployment rollback for production incidents. Do not force-push `main`. Document the incident and corrective ticket.

## Escalation Rules

Escalate immediately for secret exposure, paid-provider runaway spend, misleading real-world risk output, user-added data leakage, unlawful data-source use, or repeated WebGL crashes on supported devices.

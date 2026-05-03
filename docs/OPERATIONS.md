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
2. Use Mapterhorn PMTiles terrain from `NEXT_PUBLIC_MAPTERHORN_PMTILES_URL`, defaulting to `https://download.mapterhorn.com/planet.pmtiles`.
3. Fall back to Mapzen/Joerd Terrarium XYZ tiles from `NEXT_PUBLIC_MAPZEN_TERRARIUM_URL`, defaulting to `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`.
4. Fall back to the no-token MapLibre demo raster-dem provider.
5. Keep the globe shell nonblank and report provider status if terrain is unavailable.

`NEXT_PUBLIC_TERRAIN_PROVIDER` may prefer `mapterhorn-pmtiles`, `mapzen-joerd-terrarium`, or `maplibre-demo-dem`, but the env TileJSON provider still has highest priority. PMTiles terrain is loaded through the browser `pmtiles://` protocol and must remain token-free unless a future deployment explicitly adds cost and access controls.

Do not add paid terrain APIs, secret-bearing URLs, or live ingestion jobs without adding provider metadata, tests, license notes, cost controls, and fallback behavior.

## Resilient Comms Operations

Reticulum is the main disaster-mode communications stack for vmesh. The web app should connect to a local bridge service rather than opening radio/network interfaces directly from the browser.

Planned local topology:

```text
vmesh browser
  -> localhost comms bridge
    -> Reticulum / RNS daemon or library instance
    -> LXMF router
    -> optional Meshtastic bridge
```

Operational defaults:

- Start with a mock comms provider in V1 UI work.
- Add a local Reticulum bridge before any live disaster-comms features.
- Keep Reticulum identity files, RNS config, private keys, and peer/contact books out of Git.
- Treat Meshtastic as a bridge into an existing LoRa mesh, not as the primary vmesh network.
- Keep all over-the-air payloads short, typed, rate-limited, and auditable.
- Never claim guaranteed delivery; expose queued, sent, delivered, acknowledged, expired, and failed states.
- Store incoming mesh reports with source, timestamp, confidence, and trust label.

Meshtastic bridge operations:

- A local Meshtastic node or gateway is required to reach the Meshtastic LoRa network.
- Public MQTT is acceptable for demos and connected scenarios, but it is not the disaster-primary path.
- Private MQTT or local gateway deployments must document channel, PSK, traffic filters, rate limits, and operator responsibility.
- Meshtastic location payloads must use explicit precision controls and avoid unnecessary exact-location broadcast.

Do not transmit real emergency, medical, location, identity, or contact information through a live mesh integration until privacy, consent, retention, rate limiting, and operator procedures are documented and reviewed.

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
- Reticulum bridge outage: keep local app usable, queue outbound messages, and show bridge unavailable.
- Meshtastic bridge outage: keep Reticulum active where available and mark Meshtastic interoperability unavailable.
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

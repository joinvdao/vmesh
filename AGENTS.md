# Agent Operating Rules

## Project Purpose

vmesh is an atlas of antifragility. It will be a production-grade 3D geospatial dashboard where a mesh of H3 hexes combines macro resilience signals with micro local context and user-added data.

Future implementation must keep MapLibre, deck.gl, H3, Zustand, ingestion boundaries, and the React UI synchronized through explicit, typed contracts.

## Canonical Commands

```bash
npm install
npm run format:check
npm run lint
npm test
npm run agent-ready:check
npm run public-workflow:check
npm run privacy:check
```

Use `npm run dev` only after app entrypoints are implemented. The expected local URL is `http://localhost:3000`.

## Sources Of Truth

- Product changes: read `docs/PRODUCT_SCOPE.md`.
- Visual layout or UI composition changes: read `docs/DESIGN_DIRECTION.md`.
- Architecture, data model, or ingestion changes: read `docs/SYSTEM_DESIGN.md`.
- Verification changes: read `docs/TESTING.md`.
- Sensitive data, user-added data, logging, analytics, or provider changes: read `docs/SECURITY_PRIVACY.md`.
- Deployment, ingestion, or local runbook changes: read `docs/OPERATIONS.md`.
- Event and metric changes: read `docs/ANALYTICS.md`.
- External source/model research changes: read `docs/RESEARCH.md`.
- Project management workflow changes: read `docs/PROJECT_MANAGEMENT.md`.
- Livestream notes or public build-log changes: read `docs/LIVESTREAM.md`.

## Hard Constraints

- Do not implement product features until the final implementation prompt is approved.
- Do not commit real API keys, map tokens, provider credentials, paid-service secrets, private notes, or scraped listing data.
- Do not introduce paid provider calls without explicit telemetry and cost controls.
- Do not store raw PII, exact private addresses, or exact sensitive infrastructure locations in analytics.
- Keep Zustand as the single source of truth for future map, layer, selected hex, hovered hex, and user-data interaction state.
- Keep MapLibre and deck.gl integration isolated behind typed renderer components.
- Mark every user-added or app-ingested dataset with provenance, timestamp, visibility, and confidence where practical.
- Preserve strict TypeScript and avoid `any`.
- Update docs when product, architecture, privacy, operations, analytics, or workflow behavior changes.

## Agent Workflow

1. Read the relevant docs before editing.
2. Keep changes scoped and avoid unrelated refactors.
3. Prefer small, typed files with explicit contracts.
4. Add or update tests for changed behavior once implementation begins.
5. Run the relevant verification commands and report failures honestly.
6. Never delete or overwrite user work without explicit approval.

## Public Planning Boundary

- Keep the public repo focused on source code, public product docs, issues, and pull requests.
- Keep private planning systems, local ticket folders, personal notes, and unpublished operational context outside Git.
- Do not commit private planning exports, personal task systems, local ticket folders, or local vault metadata.
- Use public GitHub issues for public roadmap items and implementation work that is safe to disclose.

## DAO Recursive Learning Contract

VMesh is one of the core VDAO pillars. Its role is geospatial and ecosystem data aggregation for end users, BA, and downstream products.

Every meaningful VMesh run should improve the next run across the VDAO suite.

- Observe: coordinate requests, source discovery runs, STAC/package quality, data gaps, BA worker needs, ecosystem data needs, and repeated source failures.
- Emit: data packages, source manifests, STAC-like catalogs, provenance records, gap reports, eval-site evidence, and reviewed source categories.
- Learn: which source categories, data products, aggregation strategies, and package shapes make ecosystem intelligence faster and more complete.
- Feed back: convert repeated findings into source registries, tests, evals, prompts, docs, tickets, or VAgents runbooks.
- Share: durable skills and explanations go to VWiki; access/member constraints go to VPass; agent workflow gaps go to VAgents; coding workflow improvements go to VBuild.

Use `docs/RECURSIVE_LEARNING.md` as the source of truth for cross-pillar learning handoffs.

# vmesh

vmesh is an atlas of antifragility: a geospatial dashboard where every H3 hex can hold macro signals like climate, water, energy, biodiversity, and infrastructure resilience alongside micro signals like properties, farmers markets, local producers, land use, and user-added observations.

vmesh is a [VDAO.io](https://vdao.io) community project. It is being built in public as part of a weekly livestream on X every Thursday at 5pm UTC: [@joinvdao](https://x.com/joinvdao).

vmesh is released under the MIT License.

V1 now ships a polished Next.js dashboard shell with a MapLibre globe surface, deck.gl H3 mesh overlay plumbing, Zustand state, mock U3/U5/U8 records, local/private user records, Recharts analytics, and a provider-agnostic open-terrain foundation.

## Stack Summary

- Next.js App Router with React and TypeScript.
- Tailwind CSS with shadcn/ui-style Radix primitives.
- MapLibre GL with globe-oriented rendering and open raster-dem terrain hooks.
- deck.gl `MapboxOverlay` and `H3HexagonLayer` for synchronized H3 rendering.
- h3-js for spatial indexing, tier mapping, parent/child helpers, and local U8 generation.
- Zustand for shared map, terrain, layer, selection, and user-data state.
- Recharts for analytics panels.
- lucide-react for icons.

## Product Shape

The core interface is a mesh overlay. Each hex acts as a local context cell that can combine:

- Prepopulated app data from chosen public or licensed sources.
- Macro datasets such as climate exposure, water stress, grid resilience, land cover, biodiversity, and infrastructure risk.
- Micro datasets such as property signals, local food markets, farm assets, stewardship sites, community infrastructure, and user notes.
- User-added records that are explicitly marked by provenance, visibility, timestamp, and confidence.

## Getting Started

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment

Copy `.env.example` to `.env.local` for local overrides. Do not commit real secrets or paid provider tokens.

- `NEXT_PUBLIC_MAP_TILE_URL`: reserved for a future configurable basemap source.
- `NEXT_PUBLIC_TERRAIN_TILEJSON_URL`: optional highest-priority raster-dem TileJSON provider.
- `NEXT_PUBLIC_ANALYTICS_ENDPOINT`: optional future analytics endpoint.

If no terrain env provider is configured, V1 selects a no-token demo raster-dem fallback. If terrain fails, the globe shell remains nonblank and the footer reports provider status.

## Open Terrain Foundation

`lib/terrainSources.ts` defines the typed provider registry and normalizes map-ready sources for MapLibre. V1 models:

- `raster-dem-xyz`, including Mapzen/Joerd Terrarium-style tiles.
- `raster-dem-tilejson`, including env-configured providers and the demo fallback.
- `pmtiles-raster-dem`, reserved for Mapterhorn/PMTiles terrain packages.
- `api-dem`, reserved for OpenTopography-style clipped DEM APIs.
- `dataset-dem`, reserved for FABDEM, CUDEM, and similar preprocessing workflows.
- `stac-catalog`, reserved for future open terrain catalog discovery.

FABDEM is marked as license-gated/non-commercial unless separately licensed. CUDEM, OpenTopography, and dataset sources are modeled as future ingestion or preprocessing sources, not live V1 production calls.

## Documentation Map

- `AGENTS.md`: operating rules for AI agents and contributors.
- `docs/PRODUCT_SCOPE.md`: product intent, MVP boundaries, and success criteria.
- `docs/DESIGN_DIRECTION.md`: visual target and dashboard composition notes.
- `docs/SYSTEM_DESIGN.md`: architecture and implementation contracts.
- `docs/TESTING.md`: verification strategy and required commands.
- `docs/SECURITY_PRIVACY.md`: data, provider, user-content, and analytics safety rules.
- `docs/OPERATIONS.md`: local runbook, deployment expectations, ingestion notes, and incident notes.
- `docs/ANALYTICS.md`: event taxonomy and metric definitions.
- `docs/PROJECT_MANAGEMENT.md`: public repo and private planning boundary.
- `docs/LIVESTREAM.md`: public weekly build log for Thursday 5pm UTC livestream notes.
- `docs/V1_IMPLEMENTATION_PROMPT.md`: comprehensive V1 build prompt.

## Verification Commands

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

## License

MIT License. See `LICENSE`.

## Deployment Notes

Assume Vercel plus GitHub unless the deployment target changes. Production should track `main`; preview deployments should run on pull requests. Configure environment variables in Vercel Project Settings, never in Git.

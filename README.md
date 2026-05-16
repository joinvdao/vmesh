# vmesh

vmesh is an atlas of antifragility: a geospatial dashboard where every H3 hex can hold macro signals like climate, water, energy, biodiversity, and infrastructure resilience alongside micro signals like properties, farmers markets, local producers, land use, and user-added observations.

It is also a source-honest geospatial package broker. That means vmesh should help users and downstream applications understand which earth-data sources exist for a place, what each source can and cannot prove, what was selected or rejected, and what packaged artifacts can safely be used without pretending inferred, generated, fallback, or visual layers are authoritative truth.

vmesh is a [VDAO.io](https://vdao.io) community project. It is being built in public as part of a weekly livestream on X every Thursday at 5pm UTC: [@joinvdao](https://x.com/joinvdao).

vmesh is released under the MIT License.

V1 now ships a polished Next.js dashboard shell with a real Three.js orbit globe, MapLibre source-backed map output, deck.gl H3 mesh overlay plumbing, Zustand state, mock U3/U5/U8 records, a fixture-backed macro package, local/private user records, Recharts analytics, provider-agnostic basemap and open-terrain foundations, macro weather/hazard/solar layer scaffolding, and a Sentinel/SEN2SR imagery pipeline boundary.

## Stack Summary

- Next.js App Router with React and TypeScript.
- Tailwind CSS with shadcn/ui-style Radix primitives.
- MapLibre GL with globe-oriented rendering and open raster-dem terrain hooks.
- Three.js for the cinematic far-zoom Earth sphere, atmosphere, clouds, lighting, drag inertia, and dark/light globe treatment.
- deck.gl `MapboxOverlay` and `H3HexagonLayer` for synchronized H3 rendering.
- h3-js for spatial indexing, tier mapping, parent/child helpers, and local U8 generation.
- Zustand for shared map, terrain, layer, selection, and user-data state.
- Recharts for analytics panels.
- lucide-react for icons.
- Provider registries for basemaps, terrain, macro climate/weather signals, and optional imagery.

## Product Shape

The core interface is a mesh overlay and atlas surface for resilience intelligence. Each hex acts as a local context cell that can combine:

- Prepopulated app data from chosen public or licensed sources.
- Macro datasets such as climate exposure, water stress, grid resilience, land cover, biodiversity, and infrastructure risk.
- Micro datasets such as property signals, local food markets, farm assets, stewardship sites, community infrastructure, and user notes.
- User-added records that are explicitly marked by provenance, visibility, timestamp, and confidence.

The core data discipline is source-honest packaging. vmesh should keep macro intelligence, micro intelligence, user observations, map-ready layers, package-ready layers, and generated/visual context separate until a manifest explains source, confidence, license, freshness, limitations, privacy posture, and allowed use. The same package contracts should power the atlas itself and, where appropriate, downstream apps that need PMTiles, COGs, GeoParquet extracts, H3 summaries, or provenance manifests.

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
- `NEXT_PUBLIC_BASEMAP_PROVIDER`: optional basemap preference, including `mapbox-satellite-basemap` when a reviewed Mapbox token/proxy is configured.
- `NEXT_PUBLIC_BASEMAP_STYLE_URL`: optional custom MapLibre style URL.
- `NEXT_PUBLIC_BASEMAP_PMTILES_URL`: optional Protomaps/offline PMTiles basemap URL.
- `NEXT_PUBLIC_ENABLE_REMOTE_GEOCODING`: set to `true` only when remote free-text geocoding is intentionally enabled.
- `NEXT_PUBLIC_TERRAIN_TILEJSON_URL`: optional highest-priority raster-dem TileJSON provider.
- `NEXT_PUBLIC_IMAGERY_PROVIDER`: optional imagery provider preference.
- `NEXT_PUBLIC_SENTINEL_PREVIEW_TILE_URL`: optional Sentinel preview raster tile URL.
- `NEXT_PUBLIC_SEN2SR_PMTILES_URL`: optional offline/server generated SEN2SR PMTiles URL.
- `NEXT_PUBLIC_SEN2SR_XYZ_URL`: optional offline/server generated SEN2SR XYZ URL.
- `NEXT_PUBLIC_OFFLINE_RASTER_PMTILES_URL`: optional local hub imagery PMTiles URL.
- `MAPBOX_TOKEN`: optional server-only Mapbox satellite proxy token for secret-class tokens.
- `NEXT_PUBLIC_MAPBOX_PROXY_ENABLED` / `NEXT_PUBLIC_MAPBOX_PROXY_URL`: optional public flags that point the browser at the local Mapbox proxy route without exposing the token; this can power the optional Mapbox satellite base globe and comparison imagery.
- `NEXT_PUBLIC_MAPBOX_TOKEN`: optional Mapbox satellite token for restricted public `pk.*` tokens only; never commit real tokens.
- `NEXT_PUBLIC_ANALYTICS_ENDPOINT`: optional future analytics endpoint.

If no terrain env provider is configured, V1 selects a no-token demo raster-dem fallback. If terrain fails, the globe shell remains nonblank and the footer reports provider status.

The far-zoom globe uses a locally bundled NASA Blue Marble raster texture, with a procedural fallback if the asset fails. MapLibre remains the source-backed map engine for close search results, terrain, labels, imagery overlays, and H3/deck.gl synchronization.

Open-Meteo can be used as a no-secret selected-centroid weather prototype. Heavier climate, fire, solar, wind rose, sector-map, flood, and imagery processing remains provider-boundary or offline/server work until licensing, caching, and confidence handling are reviewed.

## Open Terrain Foundation

`lib/terrainSources.ts` defines the typed provider registry and normalizes map-ready sources for MapLibre. V1 models:

- `raster-dem-xyz`, including Mapzen/Joerd Terrarium-style tiles.
- `raster-dem-tilejson`, including env-configured providers and the demo fallback.
- `pmtiles-raster-dem`, including Mapterhorn PMTiles as the primary open terrain path.
- `api-dem`, reserved for OpenTopography-style clipped DEM APIs.
- `dataset-dem`, reserved for FABDEM, CUDEM, and similar preprocessing workflows.
- `stac-catalog`, reserved for future open terrain catalog discovery.

FABDEM is marked as license-gated/non-commercial unless separately licensed. CUDEM, OpenTopography, and dataset sources are modeled as future ingestion or preprocessing sources, not live V1 production calls.

## Macro And Imagery Foundations

`lib/macroSources.ts` models Open-Meteo, NASA POWER, ERA5/CDS, NASA FIRMS, wind rose, solar access, sector-map, and terrain-derived flood providers. Open-Meteo is the first live-capable no-secret adapter and falls back to deterministic mock data when unavailable.

`lib/macro-packages/macroPackages.ts`, `lib/macro-packages/macroPackageValidation.ts`, and `lib/macro-packages/macroPackageImport.ts` define the offline macro package contract. The default committed package is a deterministic Western Europe fixture in `fixtures/macro-packages/`; it is used to prove the manifest, H3 summary, provenance, privacy gates, and UI disclosure path without making broad browser calls to climate providers.

Solar and wind are climate/topography products. Future solar access layers should combine sun path, slope/aspect, terrain-horizon shading, optional source-backed obstruction shading, and cloud/irradiance context. Wind roses and permaculture-style climate sector maps should preserve period, source, confidence, and limitations.

`lib/imagerySources.ts` models Sentinel-2 preview imagery, offline/server-generated SEN2SR PMTiles or XYZ tiles, optional Mapbox satellite comparison, and offline raster PMTiles. Low-zoom global texture should use direct NASA MODIS/Blue Marble-style sources only as coarse visual context, not as property intelligence. SEN2SR processing belongs in `pipelines/sentinel_sr/`; the browser only displays generated tiles and manifest metadata.

## Documentation Map

- `AGENTS.md`: operating rules for AI agents and contributors.
- `docs/PRODUCT_SCOPE.md`: product intent, MVP boundaries, and success criteria.
- `docs/DESIGN_DIRECTION.md`: visual target and dashboard composition notes.
- `docs/SYSTEM_DESIGN.md`: architecture and implementation contracts.
- `docs/TESTING.md`: verification strategy and required commands.
- `docs/SECURITY_PRIVACY.md`: data, provider, user-content, and analytics safety rules.
- `docs/OPERATIONS.md`: local runbook, deployment expectations, ingestion notes, and incident notes.
- `docs/ANALYTICS.md`: event taxonomy and metric definitions.
- `docs/RESEARCH.md`: external climate, biodiversity, terrain, and data-platform research notes.
- `docs/CROSS_REPO_INSIGHTS.md`: public-safe substrate insights for downstream apps.
- `docs/PROJECT_MANAGEMENT.md`: public repo and private planning boundary.
- `docs/LIVESTREAM.md`: public weekly build log for Thursday 5pm UTC livestream notes.
- `docs/V1_IMPLEMENTATION_PROMPT.md`: comprehensive V1 build prompt.

## Verification Commands

```bash
npm run format:check
npm run lint
npm test
npm run build
npm run macro:build -- --fixture
npm run macro:validate -- --fixture
npm run visual:check
npm run agent-ready:check
npm run public-workflow:check
npm run privacy:check
npm audit --audit-level=moderate
```

## License

MIT License. See `LICENSE`.

## Deployment Notes

Assume Vercel plus GitHub unless the deployment target changes. Production should track `main`; preview deployments should run on pull requests. Configure environment variables in Vercel Project Settings, never in Git.

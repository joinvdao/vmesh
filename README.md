# vmesh

vmesh is a dual-purpose geospatial and ecosystem data product.

For end users, it is a source-honest atlas for finding and inspecting macro and micro data about a place: terrain, imagery, open-map context, vegetation, water, parcels, local records, and user-added observations, organized through H3 cells without turning those inputs into automated conclusions.

For downstream products, it is a source-honest ecosystem source broker and data provider. That means vmesh should help other apps understand which earth, ecological, infrastructure, climate, hydrology, soils, landcover, biodiversity, food-system, and local-context sources exist for a place, what each source can and cannot prove, what was selected or rejected, and which provider-native assets are ready to pipe without pretending inferred, generated, fallback, or visual layers are authoritative truth. The default downstream contract is STAC-style discovery plus typed ecosystem provenance, not vmesh-owned storage of heavy GIS or ecosystem payloads.

vmesh is a [VDAO.io](https://vdao.io) community project.

## Repository Disclosure Condition

This repository is private/internal-first. Do not treat this repo as public
open-source release material.

This private working repo may contain private product strategy, BA-facing
source-broker contracts, source-discovery logic, worker orchestration,
eval-site labels, provider review notes, and private implementation context.
Those assets should stay private until a deliberate release review separates
the public substrate from the private operating engine.

Public release requires an explicit owner-approved split:

- public-safe app shell, schemas, contracts, fixtures, adapter interfaces, and
  generic provenance docs may move into a public VMesh OSS surface;
- live source discovery, Intel Tools integration, paid/provider strategy,
  private eval-site context, promotion heuristics, worker orchestration, cache
  topology, BA-specific package compiler behavior, and private run outputs stay
  in private VDAO/VMesh/VAagents infrastructure;
- exact private coordinates, private AOIs, signed URLs, provider order/quote
  details, secrets, VPS topology, and raw sidecar outputs must never be
  committed to public release artifacts.

License status is intentionally deferred while this repository remains private.
Add or confirm a license only as part of the public-release split.

V1 now ships a polished Next.js dashboard shell with a real Three.js orbit globe, MapLibre source-backed map output, deck.gl H3 mesh overlay plumbing, Zustand state, mock U3/U5/U8 records, local/private user records, source/data overview panels, provider-agnostic basemap and open-terrain foundations, source-layer controls, and a Sentinel/SEN2SR imagery pipeline boundary.

## Stack Summary

- Next.js App Router with React and TypeScript.
- Tailwind CSS with shadcn/ui-style Radix primitives.
- MapLibre GL with globe-oriented rendering and open raster-dem terrain hooks.
- Three.js for the cinematic far-zoom Earth sphere, atmosphere, clouds, lighting, drag inertia, and dark/light globe treatment.
- deck.gl `MapboxOverlay` and `H3HexagonLayer` for synchronized H3 rendering.
- h3-js for spatial indexing, tier mapping, parent/child helpers, and local U8 generation.
- Zustand for shared map, terrain, layer, selection, and user-data state.
- lucide-react for icons.
- Provider registries for basemaps, terrain, source overlays, and optional imagery.

## Product Shape

The core interface is a mesh overlay and source-atlas surface. The end-user app is for discovering and inspecting macro and micro data, not for becoming the final simulation, game, rendering, or workflow surface for every downstream product. Each hex acts as a local context cell that can combine:

- Prepopulated app data from chosen public or licensed sources.
- Source datasets such as terrain, imagery, open map features, land cover, vegetation, water, and infrastructure context.
- Micro datasets such as property signals, local food markets, farm assets, stewardship sites, community infrastructure, and user notes.
- User-added records that are explicitly marked by provenance, visibility, and timestamp.

The core data discipline is source-honest aggregation. vmesh should keep source data, local records, map-ready layers, optional derived layers, and generated/visual context separate until a STAC-compatible manifest explains source, license, freshness, limitations, privacy posture, and allowed use. The primary downstream output should be a normalized catalog/search response with provider-native asset refs. Optional PMTiles, COGs, GeoParquet extracts, H3 summaries, or provenance manifests are derived/cache modes only when an explicit worker or deployment asks for them. Downstream apps own their own fetching, storage, rendering, material systems, simulations, agent workflows, and domain-specific UX.

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

For Infisical-backed local runs, keep provider values in the `simpleloop` project
and start the app through the runner instead of copying secrets into
`.env.local`:

```bash
INFISICAL_CLIENT_ID=... INFISICAL_CLIENT_SECRET=... npm run dev:infisical
```

The default runner path is `simpleloop/dev/projects/_shared/providers/mapbox`.
It injects `MAPBOX_TOKEN` into the server process and defaults the public proxy
flags locally when a token is present. It prints key names only, never values.

If no terrain env provider is configured, V1 selects a no-token demo raster-dem fallback. If terrain fails, the globe shell remains nonblank and the footer reports provider status.

The far-zoom globe uses a locally bundled NASA Blue Marble raster texture, with a procedural fallback if the asset fails. MapLibre remains the source-backed map engine for close search results, terrain, labels, imagery overlays, and H3/deck.gl synchronization.

Climate, hazard, solar, wind, flood, and other analysis outputs are deferred in the visible product. Provider-boundary code may remain for future work, but the current app should not present climate, hazard, or resilience-style conclusions.

## Open Terrain Foundation

`lib/terrainSources.ts` defines the typed provider registry and normalizes map-ready sources for MapLibre. V1 models:

- `source-raster-preview`, including the official USA/Canada DTM source preview route used for searched North America coordinates.
- `raster-dem-xyz`, including Mapzen/Joerd Terrarium-style tiles.
- `raster-dem-tilejson`, including env-configured providers and the demo fallback.
- `pmtiles-raster-dem`, including Mapterhorn PMTiles as the primary open terrain path.
- `api-dem`, reserved for OpenTopography-style clipped DEM APIs.
- `dataset-dem`, reserved for FABDEM, CUDEM, and similar preprocessing workflows.
- `stac-catalog`, reserved for future open terrain catalog discovery.

The USA/Canada source preview follows direct official upstream sources, using Mapterhorn only as an attribution/source-family clue. Mapterhorn lists USGS 3DEP `us1*` as 1 m in the United States, but its Canada entry is HRDEM `cahrdem2`, partial, 2 m. Therefore Canada-wide 1 m is not assumed: vmesh may claim 1 m Canada terrain only where a direct official HRDEM 1 m or provincial source such as LidarBC proves role-specific source pixels. A separate Best Official DTM Preview may display explicit 2 m HRDEM in Canada when that is the best proven official source, but that does not satisfy the strict 1 m milestone. These are viewer proof paths, not generated terrain packages. The app must label them as source previews and keep Mapterhorn, Mapzen/Joerd, and the demo DEM as renderer fallbacks rather than source truth.

FABDEM is marked as license-gated/non-commercial unless separately licensed. CUDEM, OpenTopography, and dataset sources are modeled as future ingestion or preprocessing sources, not live V1 production calls.

## Source And Imagery Foundations

Climate/weather provider scaffolding is retained only as future-provider plumbing. It is not exposed as a user workflow in the current UI.

`lib/macro-packages/` currently exists as a package-manifest fixture path. Future analysis packages should stay hidden until they are intentionally reintroduced as source-labeled context.

`lib/imagerySources.ts` models Sentinel-2 preview imagery, offline/server-generated SEN2SR PMTiles or XYZ tiles, optional Mapbox satellite comparison, and offline raster PMTiles. Low-zoom global texture should use direct NASA MODIS/Blue Marble-style sources only as coarse visual context, not as property intelligence. SEN2SR processing belongs in `pipelines/sentinel_sr/`; the browser only displays generated tiles and manifest metadata.

## Documentation Map

- `AGENTS.md`: operating rules for AI agents and contributors.
- `docs/PRODUCT_SCOPE.md`: product intent, MVP boundaries, and success criteria.
- `docs/DESIGN_DIRECTION.md`: visual target and dashboard composition notes.
- `docs/SYSTEM_DESIGN.md`: architecture and implementation contracts.
- `docs/STAC_BROKER_CONTRACT.md`: default downstream ecosystem source-broker contract.
- `docs/TESTING.md`: verification strategy and required commands.
- `docs/SECURITY_PRIVACY.md`: data, provider, user-content, and telemetry safety rules.
- `docs/OPERATIONS.md`: local runbook, deployment expectations, ingestion notes, and incident notes.
- `docs/ANALYTICS.md`: future telemetry taxonomy.
- `docs/RESEARCH.md`: external terrain, imagery, biodiversity, and data-platform research notes.
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

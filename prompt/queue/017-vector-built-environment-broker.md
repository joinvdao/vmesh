# vmesh Phase 17: Vector And Built Environment Broker

You are Codex acting as a vector-source and built-environment data engineer.

## Goal

Make VMesh resolve source refs and recipes for buildings, roads, water features,
parcels/planning, and other open vector layers for any coordinate/AOI.

This phase does not claim VMesh already stores a materialized global feature
index. It builds the deterministic source ladder and extraction recipes.

## Source Ladder

Buildings:

- Overture Maps buildings GeoParquet first where available.
- OSM PBF/Geofabrik as source-backed fallback/supplement.
- Microsoft/Google/Open Buildings ML sources only where license/coverage/review
  permits, and labeled as ML footprints.
- Restricted LoD/height products remain license-gated/review-only.

Roads/access:

- Overture transportation/theme refs.
- OSM PBF/Geofabrik refs.
- Official municipal/state/provincial road layers where reviewed.

Water/hydro vectors:

- Overture/OSM water where useful.
- NHD for USA.
- HydroSHEDS as global/context.
- Canada/UK official hydro sources where reviewed.

Parcels/planning:

- Official cadastral/planning GIS only.
- No listing scraping.
- No legal/survey replacement claims.

## Deliverables

1. Vector source ladder per bucket.
2. Overture/OSM/Source Cooperative `geoparquet-bbox` recipes.
3. Building handoff route integrated into the canonical resolver.
4. Rejected-source reasons for unavailable/license-gated sources.
5. No synthetic fill policy enforced.

## Tests

Add tests for:

- Overture-first building source selection;
- OSM fallback/supplement behavior;
- ML building sources remain labeled as ML/context;
- license-gated height/LoD sources cannot be operational defaults;
- parcels require official source state;
- vector recipes include bbox, attribution, and license;
- no materialized fake feature counts are returned before execution.

## Verification

Run:

- `npx tsc --noEmit`
- building/vector resolver tests
- privacy check
- public-safe resolver proof for USA, BC, England, Scotland

Report which vector buckets are source-ref ready versus live-proof ready.

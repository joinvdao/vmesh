# vmesh Phase 16: Fetch Recipe Adapters

You are Codex acting as a source-recipe and geospatial worker-contract engineer.

## Goal

Turn reviewed source refs into executable, parameterized fetch recipes while
preserving VMesh's role as source broker, not payload warehouse.

VMesh returns recipes. Downstream processing planes execute them unless an
operator explicitly enables a VMesh-side proof worker.

## Adapter Families

Implement typed adapter contracts for:

- `stac-cog-point`
- `stac-search`
- `arcgis-image-export`
- `arcgis-feature-query`
- `arcgis-hub-resource`
- `geoparquet-bbox`
- `ogc-wfs`
- `ogc-wcs`
- `download-index`
- `manual-review`

Priority:

1. `stac-cog-point` for terrain/imagery COG refs.
2. `arcgis-image-export` for terrain image services.
3. `arcgis-feature-query` for roads, parcels, hydro, local GIS features.
4. `geoparquet-bbox` with DuckDB for Overture/Source Cooperative/Open Data.

## Contract

Each recipe must include:

- adapter id
- method
- URL template
- placeholders: `{lat}`, `{lon}`, `{bbox}`, `{h3}`, `{radius_km}`
- axis order note
- response path / selected asset path
- expected asset role
- source role
- source license
- limitations
- disclosure class

## Hard Rules

- No hardcoded private coordinates.
- No signed URLs or secrets in committed recipes.
- No heavy raw payloads in repo.
- No map tile scraping as source data.
- If a recipe cannot prove coverage cheaply, return `needs_probe`.

## Implementation Targets

- source registry types
- intel handoff processing
- source broker runtime
- resolver route
- scripts for DuckDB/GeoParquet bbox proof
- tests for adapter normalization and redaction

## Tests

Add tests for:

- placeholder substitution;
- bbox axis order warnings;
- secret-bearing URL rejection;
- local path rejection;
- GeoParquet bbox recipe creation;
- STAC asset response path;
- ArcGIS FeatureServer query generation;
- unsupported adapter fails closed.

## Verification

Run:

- `npx tsc --noEmit`
- adapter tests
- resolver tests
- privacy check

Retain small public-safe recipe proof artifacts only. Do not retain downloaded
provider payloads unless explicitly redacted and required for live-proof evidence.

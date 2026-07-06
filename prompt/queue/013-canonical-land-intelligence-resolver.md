# vmesh Phase 13: Canonical Land Intelligence Resolver

You are Codex acting as a senior geospatial platform engineer.

## Goal

Build the private canonical VMesh resolver route that turns a coordinate, H3
cell, parcel-derived center, or AOI into a source-honest land intelligence
package. This is the main serving seam for downstream apps such as Building
Abundance.

VMesh is an aggregator/indexer, not a heavy data warehouse. The resolver returns
source refs, recipes, coverage evidence, confidence, rejected-source reasons,
and gaps. It must not download or store bulky source payloads by default.

## Inputs

Support:

- `lat` and `lng`
- `h3`
- `bounds`
- optional `edgeMeters`, default `3000`
- optional `layers`
- optional `consumerAppId`
- optional `includeReviewQueue=false`

Parcel polygons from Mapbox or a downstream UI are used to derive the center and
public-safe AOI context. They do not define the source slice unless an explicit
AOI request says so. The default source slice is a 3 km x 3 km frame around the
selected center.

## Route

Add or consolidate a private route equivalent to:

```http
GET /api/geospatial-package/resolve?lat={lat}&lng={lng}&edgeMeters=3000
POST /api/geospatial-package/resolve
```

Keep existing routes working, but this route becomes the canonical downstream
contract.

## Response Contract

Return:

1. `schemaVersion`
2. `request`
3. `aoi`
4. `sliceFrame`
5. `h3Context`
6. `jurisdiction`
7. `selectedSources`
8. `sourceCandidates`
9. `fetchRecipes`
10. `coverageEvidence`
11. `rejectedSources`
12. `gaps`
13. `warnings`
14. `privacy`
15. `provenance`

Required source buckets:

- `terrain_elevation`
- `access_infrastructure`
- `water_hydrology`
- `soils_landcover`
- `ecology_biodiversity_carbon`
- `land_property_planning`
- `imagery_observation`
- `climate_weather`
- `risk_hazard`

## Rules

- Terrain is selected first and never upgraded by imagery, DSM, buildings, or
  basemap context.
- Generic DEM is a labeled fallback only.
- Mapterhorn/Mapzen may remain visual/context fallbacks; they are not
  source-native DTM truth unless official upstream evidence is attached.
- Exact private coordinates, private addresses, local paths, signed URLs,
  secrets, cookies, and paid-provider order IDs must not appear in committed
  fixtures or public-safe responses.
- If coverage is not proven, return `needs_probe`, not `covered`.

## Implementation Targets

Prefer small typed changes around:

- `lib/geospatialPackage/`
- `lib/terrainSourcePreview.ts`
- `lib/terrainSourceProbeSelection.ts`
- `app/api/geospatial-package/`
- `db/migrations/`
- `tests/`
- `docs/SOURCE_REGISTRY_DB.md`
- `docs/INTEL_VMESH_SOURCE_HANDOFF_CONTRACT.md`
- `docs/OPERATIONS.md`

## Tests

Add tests for:

- coordinate request returns a 3 km slice frame;
- H3-only request preserves H3 disclosure;
- terrain source is selected before vector/ecology layers;
- fallback terrain is labeled fallback and excluded from high-confidence truth;
- unsafe URLs and local refs are redacted or rejected;
- unknown layer requests fail closed;
- response includes rejected-source reasons and gaps.

## Verification

Run:

- `npx tsc --noEmit`
- targeted Vitest for resolver and package security
- `npm run privacy:check`
- route proof for at least one public-safe USA, Canada/BC, and UK coordinate

Report the route shape, selected terrain source per sample, any unproven bucket,
and all source roles/resolution/confidence.

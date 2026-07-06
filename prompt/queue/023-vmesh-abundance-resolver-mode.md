# vmesh Phase 23: VMesh Abundance Resolver Mode

You are Codex acting as a VMesh API engineer.

## Goal

Implement a canonical VMesh resolver mode for Abundance. This route turns a
Mapbox-selected coordinate, parcel-derived center, H3 cell, or AOI into a
`vmesh-abundance-source-handoff-v1` response.

## Route

Support either:

```http
GET /api/geospatial-package/resolve?lat=&lng=&edgeMeters=3000&consumer=abundance
POST /api/geospatial-package/resolve
```

or an equivalent route if the existing router shape demands it.

## Behavior

- Default to a 3 km x 3 km slice frame around the selected center.
- Preserve parcel polygon as boundary overlay/context only.
- Select terrain first.
- Select source refs and recipes for vectors/masks/ecology after terrain.
- Report rejected sources and gaps.
- Return review-only candidates only when explicitly requested.
- Preserve every source role, confidence, license, attribution, and limitations.

## Required Sample Coordinates

Use public-safe samples only:

- USA high-resolution terrain region.
- British Columbia LidarBC/HRDEM region.
- Canada non-BC HRDEM region.
- England LiDAR region.
- Scotland LiDAR region.
- generic global fallback region.

Do not commit private Rose exact coordinates.

## Tests

Add route tests for:

- GET and POST resolver mode;
- default 3 km frame;
- H3-only disclosure;
- parcel boundary context;
- terrain-first selection;
- fallback/gap labeling;
- no review-only sources in operational defaults;
- no secret-bearing refs.

## Verification

Run:

- `npx tsc --noEmit`
- resolver targeted Vitest
- privacy check
- public-safe route proof fixture generation

Report one table with region, terrain source, role, resolution, confidence,
vector source status, and unresolved gaps.

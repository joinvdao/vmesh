# vmesh Phase 14: Terrain-First Provider Proof

You are Codex acting as a senior terrain-source engineer.

## Goal

Make terrain the first hard gate in VMesh's land intelligence resolver. For any
coordinate in the initial operating regions, VMesh should honestly resolve the
best available open terrain source, role, resolution, coverage state, confidence,
and fetch recipe.

Initial operating regions:

- USA
- Canada, with BC/LidarBC priority
- United Kingdom, with England and Scotland split correctly

## Source Ladder

USA:

- USGS 3DEP 1 m DTM where covered
- USGS 3DEP LPC DSM for surface context where covered
- NOAA CUDEM for coastal/topobathy where relevant
- generic DEM fallback only when no better source is proven

Canada:

- BC LidarBC DTM/DSM for BC where covered
- Canada HRDEM 1 m DTM/DSM where covered
- Canada HRDEM best available 2 m where strict 1 m is absent
- generic DEM fallback only when clearly labeled

United Kingdom:

- Environment Agency LiDAR DTM/DSM for England where covered
- Scottish Remote Sensing Portal LiDAR for Scotland where covered
- OS Terrain 50 as coarse GB fallback
- generic DEM fallback only when clearly labeled

## Required Behavior

- DTM and DSM must remain separate source roles.
- Strict 1 m proof must fail closed when no source pixels/assets are available.
- Best-available fallback must retain exact resolved source resolution.
- Generic DEM must not satisfy high-confidence DTM gates.
- Every selected source must carry provider, license, attribution, source release,
  CRS/vertical datum when known, coverage status, and limitations.

## Implementation Targets

- `lib/geospatialPackage/terrainSourceAdapters.ts`
- `lib/geospatialPackage/terrainWorker.ts`
- `lib/geospatialPackage/terrainSourceProofs.ts`
- `lib/terrainSourcePreview.ts`
- `lib/terrainSourceProbeSelection.ts`
- terrain route handlers
- terrain live-proof scripts
- terrain tests

## Deliverables

1. USA/Canada/UK terrain source matrix.
2. Route-level terrain proof for public-safe coordinates.
3. UK source-native adapter coverage parity with USA/Canada where feasible.
4. Resolver integration so terrain status drives overall package confidence.

## Tests

Add or update tests for:

- USA DTM/DSM role separation;
- BC LidarBC selected before generic Canada HRDEM when both are plausible;
- Canada best-available 2 m does not pass strict 1 m gates;
- England and Scotland choose different source families;
- OS Terrain 50 is coarse fallback only;
- generic DEM never reports as high-confidence DTM;
- no secret-bearing or local refs in terrain proof output.

## Verification

Run:

- `npx tsc --noEmit`
- terrain adapter Vitest
- terrain route/probe Vitest
- privacy check
- retained public-safe route proof for USA, Canada/BC, England, Scotland

Report each coordinate's selected role, provider, resolution, confidence, and
fallback/gap status.

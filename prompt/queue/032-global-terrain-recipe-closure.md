# vmesh Phase 32: Global Terrain Recipe Closure

## Goal

For every valid coordinate, return the highest-ranked executable terrain source
recipe that covers the exact requested frame, plus rejected alternatives and an
honest fallback reason.

## Required Ladder

- Prefer official bare-earth DTM or DEM COG/ImageServer/raster assets.
- Prefer indexed LiDAR-derived products when coverage and a worker-readable
  asset are proven.
- Preserve regional rails such as USGS 3DEP, Canada HRDEM/LidarBC, municipal
  elevation, England EA and Scotland SRSP.
- Use Mapterhorn/Copernicus/other reviewed global DEM sources as labelled
  generic fallback, never as LiDAR or DTM.
- Add reviewed global bathymetry/topography context for ocean/coastal requests,
  or return `not_applicable`/`no_land_coverage` explicitly.

## Required Work

- Resolve coverage for the exact AOI before selecting a regional source.
- Emit only source refs that the declared downstream recipe can execute.
- Normalize CRS, vertical datum, resolution, no-data policy, asset role and
  expected worker action.
- Bound probes and define retry, timeout, cache and stale-evidence behavior.
- Test anti-meridian, polar, coastal, no-data and partial-coverage frames.
- Preserve the distinction between DEM, DTM, DSM and bathymetry.

## Done Bar

Five land coordinates on five continents return executable real-terrain
recipes. High-resolution samples select their regional source ahead of the
global fallback. A sparse region returns labelled global DEM. An ocean/coastal
sample returns honest bathymetry/topography handling. No result relies on
VMesh storing the raster payload.

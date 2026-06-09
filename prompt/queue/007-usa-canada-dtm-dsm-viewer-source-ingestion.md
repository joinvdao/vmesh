# vmesh Terrain Phase 7: USA/Canada DTM And DSM Viewer Source Ingestion

You are Codex acting as a senior geospatial frontend and source-integration engineer.

## Goal

Implement the smallest production-useful path that proves USA and Canada DTM/DSM source data can be selected, requested, and displayed accurately inside the vmesh viewer.

This phase is viewer-ingestion first. Do not spend the main effort on hillshade, contours, terrain RGB, PMTiles packaging, terrain slabs, or downstream map derivatives. The success condition is that the viewer can prove which DTM/DSM source is active for a selected AOI, that the source covers the requested area, that the requested bounds match the map view, and that the visible terrain/source layer is not a fallback being mislabeled as source truth.

## Source Boundary

Preserve the distinction between these roles:

- `bare-earth-dtm`: ground surface. This can support source-backed terrain confidence.
- `surface-dsm`: buildings, canopy, bridges, and other above-ground surfaces. This is a surface/obstruction/context layer unless explicitly selected as a DSM inspection mode.
- `generic-dem`: useful viewer fallback, not high-trust DTM.
- `visual-context`: imagery or rendered basemap context, not elevation truth.

Initial source scope:

- USA DTM: USGS 3DEP DEM/source DEM services where the AOI is covered.
- USA DSM: USGS 3DEP lidar point cloud/source products only when a source-backed DSM route is actually available or derivable. Do not silently treat the standard USGS DEM ImageServer as DSM.
- Canada DTM: Natural Resources Canada HRDEM DTM where AOI coverage exists.
- Canada DSM: Natural Resources Canada HRDEM DSM where AOI coverage exists.
- British Columbia DTM/DSM: LidarBC point cloud or derived lidar products where coverage exists.

Useful official references:

- USGS 3DEP products and services: `https://www.usgs.gov/3d-elevation-program/about-3dep-products-services`
- USGS 3DEP spatial metadata: `https://www.usgs.gov/3d-elevation-program/3dep-spatial-metadata`
- Canada HRDEM open data: `https://open.canada.ca/data/en/dataset/957782bf-847c-4644-a757-e383c0057995`
- Canada Geo.ca Datacube STAC root: `https://datacube.services.geo.ca/stac/api/`
- Canada HRDEM STAC collections: `hrdem-mosaic-1m`, `hrdem-mosaic-2m`, `hrdem-lidar`
- Canada HRDEM product specification: `https://download-telecharger.services.geo.ca/pub/elevation/dem_mne/highresolution_hauteresolution/HRDEM_Product_Specification.pdf`
- LidarBC: `https://www2.gov.bc.ca/gov/content/data/geographic-data-services/topographic-data/lidarbc`

## Implementation Targets

Prioritize these areas:

- `lib/terrainSources.ts`
- `lib/geospatialPackage/sourceRegistryRegionalTerrain.ts`
- `lib/geospatialPackage/terrainSourceAdapters.ts`
- `components/Map/TerrainGlobe.tsx`
- `components/Map/useTerrainGlobeLayers.ts`
- source/provenance drawer and terrain panel UI
- terrain/source tests under `tests/`
- docs: `docs/SYSTEM_DESIGN.md`, `docs/OPERATIONS.md`, `docs/TESTING.md`

Add a narrow viewer-source contract if the existing terrain provider contract is too renderer-oriented. The contract should describe:

- provider id
- product role
- country/region
- access mode: `map-ready-raster-dem`, `arcgis-image-export`, `cog-tile-proxy`, `pmtiles-raster-dem`, `point-cloud-derived`, or `configured-only`
- coverage result
- source URL with secrets redacted
- CRS and vertical datum if known
- resolution if known
- acquisition/source vintage if known
- active MapLibre source id and layer id when displayed
- fallback source id if no source-backed layer can be displayed
- run class: `mock`, `dry-run`, `configured`, or `live-proof`

## Viewer Behavior

When a user searches/selects a USA or Canada AOI and enables DTM/DSM source inspection:

1. Select the best source-backed candidate for the AOI and requested role.
2. Probe coverage before adding a layer.
3. If the source is map-ready, add it to MapLibre and report the exact active provider.
4. If the source is not directly map-ready but can be requested as an image/COG/ArcGIS export, add a bounded preview or proxy-backed raster layer that proves the AOI is being pulled from the source.
5. If the source is not map-ready and no safe proxy exists, fail closed with a visible `configured-only` or `preprocessing-required` state.
6. Keep Mapterhorn, Mapzen/Joerd, and MapLibre demo terrain available only as renderer continuity fallbacks. The UI must never call them USGS 3DEP, HRDEM, or LidarBC.
7. DSM should appear as a separate surface inspection layer or overlay unless the user explicitly chooses DSM mode. It must not become bare-earth terrain.

## Hard Gates

Before marking the phase complete, prove all of the following:

- A USA AOI can select a USGS 3DEP DTM source path or fails closed with an accurate reason.
- A Canada AOI can select an HRDEM DTM source path or fails closed with an accurate reason.
- A Canada DSM request selects HRDEM DSM or fails closed with an accurate reason.
- A British Columbia AOI selects LidarBC where coverage/configuration exists, otherwise reports the missing index/template clearly.
- The map view bounds and source request bounds match within a documented tolerance.
- The UI shows product role, provider, coverage status, resolution when known, source vintage when known, license/attribution, and run class.
- Fallback terrain is visibly labeled as fallback and does not upgrade terrain confidence.
- Secret-bearing URLs, signed URLs, credentials, tokens, and private AOIs are not committed or exposed in public responses.
- A retained browser screenshot and a retained network/source log prove the viewer loaded the intended source for at least one public-safe AOI.

## Tests

Add or update tests for:

- USA DTM source selection from a public AOI.
- USA DSM blocked unless a lidar/DSM route is available or configured.
- Canada HRDEM DTM source selection from a public AOI.
- Canada HRDEM DSM source selection from a public AOI.
- BC LidarBC source selection when configured and clean failure when not configured.
- DTM cannot satisfy DSM requests; DSM cannot satisfy bare-earth DTM requests.
- Source URLs with tokens, signatures, credentials, localhost/private IPs, or secret-like query params are rejected.
- MapLibre source/layer state reflects the selected provider rather than the fallback provider.
- UI provenance labels match the active source id.

## Verification

Run:

- `npm run format:check`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run privacy:check`

Browser verify with public-safe AOIs only:

- USA DTM source inspection.
- Canada DTM source inspection.
- Canada DSM source inspection.
- BC LidarBC source inspection if a public configured ref or index exists.
- Fallback behavior after a failed source probe.

Every run report must state:

- Code bar: implementation, tests, lint, build, browser verification.
- Live bar: whether a real source endpoint produced retained viewer evidence.
- Run class. Do not call the terrain viewer source path production-ready unless it reaches `live-proof`.

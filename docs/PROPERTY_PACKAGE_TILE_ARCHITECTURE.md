# Property Package And Tile Architecture

Snapshot date: 2026-05-16

This note turns the recent Sentinel, PMTiles, Clearfork Wells, weather, and
Downstream app integration discussion into a durable vmesh architecture
target.

The core decision is that vmesh should not try to make every requested place
instant and globally cached. It should act as a package substrate:

```text
user selects cell / AOI / property boundary
  -> vmesh plans sources and worker inputs
  -> worker creates source-backed package artifacts
  -> package manifest records provenance, license, privacy, and cache policy
  -> browser renders public layers directly and private layers through signed access
  -> downstream apps consume the manifest without copying provider logic
```

## Product Shape

vmesh has two related but separate outputs.

| Output                     | Purpose                                                                                                                                                   | Typical user                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Mesh package               | H3 cell, AOI, or region-level atlas data for climate, terrain, imagery, landcover, water, roads, assets, and summaries.                                   | vmesh user, local hub, downstream app.                    |
| Property treatment package | Boundary-first package for one property or project area, with map plates, terrain derivatives, source imagery, overlays, and optional downstream handoff. | land analyst, downstream app, report generator, operator. |

The property treatment package is GIS-style work. The visible globe can trigger
and inspect it, but the browser should not run the heavy processing.

## Selection-Time Component Analysis

When a user draws or confirms a polygon around a building, project area, or
property, vmesh should immediately run a lightweight component preflight for
that polygon. This answers "what appears to be inside this selected area?" before
the full worker package is created.

The preflight should use source-backed or licensed inputs:

- existing vector overlays such as OSM/Overture roads, buildings, water, and
  landuse;
- ready vmesh package artifacts;
- open Sentinel/SEN2SR products where the resolution supports only conservative
  classes;
- user-supplied imagery where processing rights are explicit;
- premium orthophoto/imagery where terms allow processing.

It should not scrape display-only Mapbox, MapTiler, Esri, or similar basemap
pixels unless the deployment has explicit processing rights. Display basemaps can
guide the user's polygon selection; they are not automatically object-detection
inputs.

Possible output:

```text
component-preflight.json
  -> objects inside polygon
  -> source ids and dates
  -> confidence
  -> review status
  -> truth role
  -> limitations
```

Component classes can include buildings, roads, driveways, water, tree canopy,
field edges, bare soil, hardstanding, greenhouses, solar panels, fences/walls,
vehicles/equipment where lawful and resolvable, and `unknown-needs-review`.
The user's corrections should become user-reviewed observations attached to the
package and H3 cells.

## Standard And Premium Tiers

| Tier     | Inputs                                                                                                                                                               | Outputs                                                                                                                                                         | Claim boundary                                                                                                                    |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Standard | Open basemap, Mapterhorn/Mapzen or reviewed DEM, Sentinel-2 L2A, SCL cloud metrics, SEN2SRLite `2.5 m`, OSM/Overture where available, Open-Meteo/NASA POWER context. | Sentinel/SEN2SR visual tile package, H3 summaries, contours/hillshade where terrain permits, broad weather/climate summaries, source manifest.                  | Open-data, imagery-inferred context. Not legal boundary, orthophoto truth, survey, or engineering.                                |
| Premium  | Licensed orthophoto or satellite, licensed DEM/DTM/DSM, paid parcel/title/survey source or user upload, optional premium weather/climate feeds.                      | Higher-trust map plates, orthophoto-draped terrain, DSM/DTM derivatives, parcel/boundary overlays, richer report package, optional render-conditioning outputs. | Only as strong as the provider license and source provenance allow. Legal/survey claims still require reviewed official evidence. |

Mapbox Satellite, MapTiler Satellite, Esri imagery, and similar commercial
basemaps are reference/display layers unless the active agreement explicitly
allows storage, processing, upscaling, export, redistribution, and AI/render
conditioning. They must not be scraped into claimable vmesh artifacts by default.

## Worker Split

The app server is orchestration, not the renderer.

```text
Next.js app
  -> select AOI / property boundary / tier
  -> show plan, cost, privacy, and source gates
  -> enqueue package job

CPU geospatial worker
  -> STAC/source discovery
  -> downloads and clips rasters/vectors
  -> cloud masks Sentinel AOI
  -> reprojects to local metric CRS
  -> DEM/DTM normalization
  -> hillshade, slope, aspect, contours
  -> water/flow/wetness hints where source allows
  -> vector overlays for roads, buildings, water, assets, landcover
  -> COG, PMTiles, GeoParquet, PNG/SVG map plates, manifests

GPU worker
  -> SEN2SRLite inference when needed
  -> optional high-quality terrain/material render passes
  -> optional Blender source views for downstream generated-world conditioning

Object storage / CDN
  -> public package artifacts
  -> private signed package artifacts
  -> manifests and provenance
```

Heavy CPU GIS tasks should run on a geospatial worker with GDAL/rasterio,
rio-cogeo, tippecanoe, pmtiles, shapely/geopandas, pyproj, hydrology tools, and
map export tooling. GPU time should be used only where it has leverage:
SEN2SR, high-quality render passes, or world-model conditioning outputs.

## Package Artifact Set

A complete property treatment package should be able to include:

- `manifest.json` with AOI, boundary role, privacy class, source table,
  licenses, CRS, vertical datum, vintage, confidence, and limitations.
- `imagery.pmtiles` or `imagery.cog.tif` for source-backed imagery.
- `sentinel-sr.pmtiles` or `sentinel-sr.cog.tif` for standard `2.5 m`
  SEN2SR visual context.
- `terrain.cog.tif` with DEM/DTM role and resolution.
- `hillshade.png` or `hillshade.pmtiles`.
- `contours.pmtiles` with interval, source DEM, smoothing, and limitations.
- `slope-aspect.pmtiles` or summary rasters.
- `hydrology.pmtiles` for flow/wetness/drainage hints where allowed.
- `vectors.pmtiles` or `features.geojson` for roads, buildings, water,
  landcover, assets, and parcel/project boundaries.
- `h3-summary.json` or `h3-summary.pmtiles` for cell summaries.
- `map-plates/*.png` or `map-plates/*.svg` for deterministic report maps.
- `weather-ledger.json` for normalized weather/climate inputs.
- `scene-annotations.json` for visual semantic observations such as visible
  trees, rooflines, roads, rocks, water edges, field edges, posts, assets, and
  material cues.
- `semantic-annotations.geojson` or `semantic-annotations.pmtiles` when
  annotations are georegistered enough to become map overlays.
- `render-handoff.json` only when a downstream app requests generated-world
  conditioning and all gates pass.

The package should be useful even when a generated-world renderer, downstream
app, or any other consumer is unavailable.

## Semantic Annotation Overlay

Some capture and generated-world tools now show a useful overlay pattern:
machine-readable labels anchored to visible scene features. Examples include
`thick tree trunk`, `grassy field edge`, `natural rock formation`, `gabled
roofline`, `paved city street`, `flat rooftop ventilation`, `blue compact car`,
or `bright street lighting`.

vmesh should treat these as a semantic observation layer:

```text
source image / source view / capture
  -> annotation point, box, mask, or polyline
  -> label, category, confidence, source, timestamp
  -> optional camera pose or local/WGS84 anchor
  -> package manifest + H3 attachment
```

Recommended record shape:

```json
{
  "id": "annotation-001",
  "label": "gabled roofline",
  "category": "building-style",
  "sourceViewId": "source-view-03",
  "anchor": {
    "kind": "image-point",
    "x": 0.42,
    "y": 0.31
  },
  "geometryRef": null,
  "h3Cells": [],
  "confidence": 0.82,
  "truthRole": "visual-observation",
  "source": "operator-review",
  "limitations": ["not measured geometry", "not legal or survey evidence"]
}
```

If annotations are not georegistered, they are still useful for source-view
prompting, report notes, visual QA, and downstream generated-world conditioning.
If they are georegistered through camera pose, photogrammetry, LiDAR, GCPs, or a
reviewed local coordinate frame, they can become map overlays and H3-attached
observations.

Truth boundaries:

- Burned-in overlay text should not be sent as the only visual input to a world
  model, because generated output may reproduce the UI labels.
- Store annotations as data beside clean source imagery.
- Labels are observations until reviewed; they do not upgrade terrain, parcel,
  building, hydrology, or infrastructure truth.
- Sensitive assets, private residences, exact boundaries, and user-supplied
  notes follow the same privacy rules as the source package.

## Public Cached PMTiles

Public cached PMTiles are static tile archives hosted behind HTTP range
requests, usually on R2/S3/CDN or local hub storage. They are excellent for:

- open basemaps;
- generalized H3 summaries;
- public terrain derivatives;
- public contours;
- open landcover;
- public Sentinel/SEN2SR demonstration packages;
- regional climate normals;
- public hazard screening layers.

They are not appropriate for private user AOIs, paid provider data, exact
property boundaries, private reports, user-uploaded surveys, premium imagery, or
renderer/GPU outputs unless the owner explicitly publishes that package and the
license allows it.

The promotion rules are defined in
`docs/PUBLIC_CACHE_PUBLICATION_POLICY.md`. Popular cells may be promoted only
after license, privacy, attribution, source-role, and coordinate-disclosure
review. Popular private cells do not become public because they are popular.

## Private Package Delivery

Private or premium artifacts should use one of:

- signed object-store URLs with short TTLs;
- an authenticated tile proxy that enforces owner/package authorization;
- private R2/S3 object refs resolved server-side;
- local hub file paths that never enter public manifests.

Do not rely on UI login alone. A benchmark of the Clearfork Wells style of app
showed a common risk pattern: the app shell can be authenticated while tile URLs
remain unauthenticated and cacheable. That is acceptable only for intentionally
public data. For private/premium vmesh artifacts, the tile URL itself or its
proxy must enforce access.

## Cache Policy

Do not cache globally by default. Cache on demand with clear classes:

| Cache class        | Examples                                                             | Retention                                                          |
| ------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Public evergreen   | low-zoom basemap, Natural Earth, open regional context               | Long, versioned by source release.                                 |
| Public derived     | generalized H3 summaries, public contours, MODIS/Blue Marble context | Long if source/license permits.                                    |
| Standard requested | Sentinel/SEN2SR cell/AOI packages, open terrain derivatives          | Medium, keyed by H3/AOI, scene, cloud gate, model, source vintage. |
| Private requested  | user property package, drawn boundary, report assets                 | Owner-retained with deletion/export controls.                      |
| Premium requested  | paid orthophoto/DEM/parcel package                                   | Terms-bound retention, no public cache by default.                 |

Popular open cells can be promoted from requested cache to public derived cache
only after privacy and license checks pass. Popular private cells do not become
public because they are popular.

## Weather And Gameplay Ledger

Weather should not be pulled live from the browser every time gameplay needs a
plant-growth tick. vmesh should normalize weather and climate into a ledger:

```text
Open-Meteo / NASA POWER / ERA5 / GFS / premium API
  -> server or local-hub fetch
  -> source-normalized weather-ledger records
  -> H3/AOI summaries and daily accumulations
  -> downstream game/report/advisory metrics
```

Useful fields include temperature min/max/mean, precipitation, humidity, wind,
cloud cover, shortwave radiation, evapotranspiration where available, vapor
pressure deficit, soil-moisture proxy, frost, heat stress, growing degree days,
water-balance proxy, drought context, and source provenance.

Live weather is useful for ambience and near-term events. Plant growth and
advisory rules should use normalized daily/hourly accumulations, climate normals,
and last-known fallback records so provider downtime does not break the game.

Standard provider direction:

- Open-Meteo for no-key selected-cell forecast/current weather.
- NASA POWER for solar/meteo and broader climate context.
- ECMWF/ERA5, NOAA GFS, and national providers for worker-side gridded packages.
- Meteomatics, Tomorrow.io, or equivalent only as premium/SLA providers.

## Clearfork Wells Benchmark Lessons

The Clearfork Wells app is a useful benchmark because it feels like a finished
vertical geospatial product. Public inspection indicates:

- R Shiny/Shiny Server app shell;
- Firebase Auth for login;
- MapLibre GL JS renderer;
- OpenFreeMap/OpenMapTiles/OSM vector basemap;
- MapTiler satellite reference layer;
- H3 tile helpers and Turf-style geometry work;
- ECharts and Tabulator for charts/tables;
- vector tiles served as XYZ MVT from a tile host.

The main lesson is not "use R Shiny." The lesson is to productize the workflow:
fast map, clear layer controls, tables/charts, source-specific vertical data,
and a narrow job surface. vmesh should borrow the layer/product discipline while
remaining MapLibre/Next.js/PostGIS/PMTiles-first.

## Near-Term Build Sequence

1. Add a property/AOI package contract that is independent of any single
   downstream app or renderer.
2. Add the public/private artifact URL policy and package privacy classes.
3. Add a property boundary UX: draw/import/select H3/AOI, confirm boundary role,
   choose standard or premium tier.
4. Convert Sentinel/SEN2SR `ready` outputs into claimable/downloadable standard
   package artifacts with attribution and truth-status labels.
5. Add CPU geospatial worker stubs for contours, hillshade, slope/aspect,
   hydrology hints, vectors, map plates, and manifests.
6. Add weather-ledger package records for selected cells/AOIs.
7. Add viewer affordances for inspecting a package, downloading allowed
   artifacts, and sharing only public-safe refs.
8. Keep premium provider procurement and paid data ingestion gated until source
   terms, pricing, storage rights, and owner deletion/export flows exist.

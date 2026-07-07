# Ecosystem Source Broker Contract

## Default Position

vmesh is an ecosystem source aggregator by default. It should discover, rank, normalize, and explain available geospatial, ecological, climate, hydrology, soils, infrastructure, food-system, biodiversity, and local-context data around a coordinate, H3 cell, or AOI, then return provider-native refs through a STAC-compatible spatial contract plus typed ecosystem manifests.

vmesh should not store heavy GIS or ecosystem payloads by default. Downstream apps own fetching, processing, caching, storage, rendering, simulation, and product-specific workflows unless an explicit vmesh deployment enables a cache or derivative-worker mode.

## Primary Output

The primary downstream output is a STAC `FeatureCollection`, STAC Catalog, or STAC API search response for spatial assets, plus typed ecosystem source records for datasets that are tabular, API-backed, H3-indexed, graph-like, or otherwise not naturally represented as raster/vector GIS files.

Each response should include:

- STAC Items for every relevant spatial source asset vmesh can resolve.
- Typed ecosystem source records for climate/weather ledgers, soils, hydrology, biodiversity, agriculture, food-system, infrastructure, community/local assets, and user/context records where STAC alone is not the best shape.
- Provider-native asset refs such as public GeoTIFFs, COGs, LAZ/LAS links, STAC asset hrefs, FeatureServer query refs, object-store URLs, GeoParquet refs, CSV/JSON/Parquet refs, H3 summary refs, graph/API refs, or bounded API refs.
- Source roles such as `bare-earth-dtm`, `surface-dsm`, `generic-dem`, `imagery`, `roads`, `buildings`, `water`, `vegetation`, `soil`, `climate`, `weather`, `hydrology`, `biodiversity`, `food-system`, `infrastructure`, `community-asset`, or `ecosystem-context`.
- Provenance: provider, source URL/query, acquisition or vintage date, license, attribution, CRS, vertical datum where known, resolution, confidence, and limitations.
- Query metadata: requested coordinate/AOI/H3 disclosure class, radius or bounds, source adapters tried, rejected-source reasons, and fallback rules.

## Source Registry DB

VMesh needs a durable source-registry database behind the broker. The database tracks source authorities, endpoints, collections, per-AOI coverage evidence, and discovery/probe runs across country, state/province, municipal, private-sector, charity/local agency, open-community, and academic source levels. The target schema and initial Canada/USA source ladders live in [SOURCE_REGISTRY_DB.md](SOURCE_REGISTRY_DB.md).

This DB is metadata and evidence infrastructure, not a heavy payload store. It should retain provider-native refs, promotion state, rejected-source reasons, license posture, coverage evidence, and redacted run artifacts. It should not store exact private coordinates, exact private addresses, secrets, signed URLs, paid-provider order details, or bulky provider payloads in public-safe artifacts.

The broker should read this registry first, then probe only when coverage evidence is missing or stale. That is how VMesh does the slow discovery work once and gives BA a fast STAC-style package on later requests.

## Asset Roles

Use provider-native assets first. Spatial assets can be represented as ordinary STAC assets:

```json
{
  "assets": {
    "data": {
      "href": "https://provider.example/source.tif",
      "type": "image/tiff; application=geotiff",
      "roles": ["data", "raw", "dtm"],
      "title": "Provider-native DTM GeoTIFF"
    },
    "preview": {
      "href": "/api/terrain/source-preview/provider/dtm/13/0/0",
      "type": "image/png",
      "roles": ["overview"],
      "title": "vmesh source preview"
    }
  }
}
```

Optional derived assets may appear only when they already exist under an explicit worker/cache mode:

- COGs clipped or reprojected by a worker.
- PMTiles or XYZ tiles for display.
- GeoParquet extracts for vector analysis.
- H3 summaries or typed Parquet/JSON ledgers for fast macro/micro ecosystem lookup.
- QA reports and retained evidence manifests.

Those assets must be labelled as derived/cache outputs and must not replace the provider-native source refs.

## BA-Style Consumer Flow

```text
coordinate / H3 / AOI request
  -> vmesh source adapters query provider registries/APIs
  -> vmesh normalizes spatial results into STAC Items
  -> vmesh normalizes non-spatial ecosystem results into typed source records
  -> BA receives source refs, provenance, and rejected-source reasons
  -> BA fetches/processes/stores data in its own GIS/ecosystem worker when needed
```

For a LidarBC coordinate, vmesh should hide ArcGIS layer quirks from the consumer. It should query the relevant DEM, DSM, and point-cloud index layers, select the intersecting source assets, and return STAC Items whose `assets.data.href` values point to the official BC object-store files.

For the Kamloops/Rose golden-quality terrain path, vmesh returns
`kamloops-local-lidar-dtm-1m` as a compatibility id for the public City of
Kamloops municipal DEM/LiDAR rail when the coordinate is inside the municipal
coverage area. The default live resolver queries the public DEM Grid layer for
the requested slice envelope, records the intersecting grid cells, emits the
deterministic public 2024 DEM ZIP source refs, and leaves exact AOI query geometry out of
public-safe artifacts. Optional configured GeoTIFF/COG URL templates may short
cut production deployments, but they are not the source of truth. This is still
an index handoff, not payload storage: downstream workers must fetch/window/QA
the ESRI Grid DEM sources and publish only public-safe derived package artifacts.

For unsupported regions, vmesh should expose fallback/global terrain as
fallback/generic context so downstream apps can keep a coherent visual style.
That fallback must not be represented as source-backed DTM, 1 m LiDAR, parcel
truth, or golden-quality proof.

## Intel Tools Processing Layer

Intel Tools close discovery gaps by scraping, searching, and lightly probing source candidates. vmesh processes those outputs into a learning source registry. The processing output is a public-safe source broker package, not raw GIS data and not a copy of the sidecar SQLite databases.

The exporter is:

```bash
python scripts/export-intel-sidecar-source-broker.py
```

It reads operator-local sidecar outputs, dedupes candidates into canonical source refs, classifies them into BA-facing segments, assigns review/probe/promotion states, and writes:

```text
.artifacts/source-broker/intel-sidecar-source-broker-package.json
```

The BA-facing route is:

```text
/api/geospatial-package/intel-broker
```

This route first uses the retained operator artifact when present:

```text
.artifacts/source-broker/intel-sidecar-source-broker-package.json
```

If that artifact is absent or malformed, `lib/intelSourceBrokerRuntime.ts` falls back to the checked-in public-safe integrated snapshot in `lib/intelSourceBrokerSnapshot.ts`. The snapshot preserves processed counts, review/gap state, evaluation-site setup gaps, and planned campaigns, but it intentionally does not expose planned campaigns as operational BA-ready source data.

Optional filters:

- `segment=terrain_elevation`
- `segment=soils_landcover`
- `site=kamloops-rose`
- `site=alberta-golden`
- `includeLicenseReview=true`

`includeLicenseReview` defaults to `false`. License-review records are useful operator intelligence, but they are not operational BA-ready sources until promoted.

## BA Golden Eval Old-Output Route

Before a new full sweep, VMesh exposes the old BA golden-eval run evidence and old Intel Tools candidate output through a public-safe site-id route:

```text
/api/geospatial-package/ba-golden-evals
/api/geospatial-package/ba-golden-evals?region=usa
/api/geospatial-package/ba-golden-evals?site=scotland-rural-burmieston
```

This route is keyed by BA `siteId`, not by exact coordinates. It returns retained BA evidence refs, old run counts, old Intel candidate summaries, reviewed VMesh source refs, gaps, and next-site state. It does not copy raw licensed rasters, signed URLs, provider order ids, exact private coordinates, or exact private street addresses.

The current active one-at-a-time site is:

```text
scotland-rural-burmieston
```

That site is marked `old_outputs_exhausted`: the existing BA retained imagery package and old Intel Scotland/Burmieston matches have been pulled into the VMesh package surface. A focused 2026-06-03 Burmieston sweep also adds Scotland source-family candidates for remote sensing, SSDI GeoNetwork, habitat, soils, NatureScot data services, forestry, SEPA flood data, and Scotland environment maps. These sweep records are candidate intelligence only until AOI probes and license checks promote them.

The next reviewed site packages are `scotland-rural-comrie-croft`, `scotland-coastal-tangleha-artists-collective`, `scotland-urban-edinburgh-mcdonald-place`, `scotland-rural-perth-ph1-road-building-alignment`, `canada-rural-pemberton-bc`, `canada-dryland-kamloops-rose-hill`, `canada-rural-alberta-parkland`, `germany-rural-bavaria-wegele`, `usa-vermont-rural-mad-river-valley`, `usa-colorado-mountain-boulder-canyon`, `usa-florida-low-relief-coastal`, `usa-urban-san-francisco`, and `middle-east-lebanon-mount-lebanon`. Comrie's focused 2026-06-03 sweep adds Perth & Kinross open data, Comrie flood records, Scotland LiDAR, habitat, and local ecosystem context candidates. Tangleha's focused 2026-06-03 sweep adds St Cyrus / Tangleha coastal candidates for NatureScot reserve context, NatureScot protected-area layers, SEPA coastal flood data, Aberdeenshire open data, coastal change adaptation material, and permaculture context. Edinburgh's focused 2026-06-03 sweep adds adopted-road, city open data, greenspace, flood/environment, LiDAR, and city mobility/environment context candidates. Perth PH1's focused 2026-06-03 sweep adds Perth & Kinross open data, DCAT feeds, core paths, Scotland LiDAR, SEPA flood, surface-water, climate-risk, and planning-energy candidates. Pemberton's focused 2026-06-03 sweep adds BC and regional candidates for LidarBC, the LidarBC Open LiDAR Data Index, BC topographic data, SLRD mapping, BC terrestrial ecosystem data, settlement planning context, and Agricultural Land Reserve context. Kamloops/Rose's focused 2026-06-03 sweep adds priority BC interior candidates for LidarBC DSM/DEM, the BC Data Catalogue, BC terrestrial ecosystem data, Thompson flood hazards, City of Kamloops open data, TNRD geohazard/property context, soil/wildfire/watershed catalogue references, and dryland grassland ecosystem context; exact Rose AOI live proof still needs redacted retained evidence even though the municipal terrain source family is public/open. Alberta's focused 2026-06-03 sweep adds provincial candidates for wildfire GIS, soil/AGRASID, Agricultural Land Resource Atlas layers, Altalis products, ABMI airborne LiDAR, ABMI hydrological habitats, and ACIMS biodiversity data, alongside retained BA UP42 terrain live-proof refs. Bavaria's focused 2026-06-03 sweep adds DGM1 terrain, Bavaria OpenData, Geoportal Bayern services, LDBV WMS/WFS docs, FIS-Natur FIN-Web, BGR Geoportal, soil-estimate context, and landscape-planning source guidance. The USA focused 2026-06-03 sweeps add Vermont VCGI/ANR river and soils sources, Boulder County and USGS terrain/hazard sources, Florida FDEM/DEP/NOAA coastal sources, and San Francisco DataSF/BCDC/USGS/SFEI coastal-urban sources. Lebanon's focused 2026-06-03 sweep adds CNRS/National Center for Remote Sensing, CNRS water resources, FAO vegetation/land-cover references, Copernicus DEM, Sentinel-2 Earth Search STAC, Geofabrik OSM, and SoilGrids candidates. Local ecosystem context records are marked `research_only` and `advanced_user_view`, which means BA can pipe them to advanced/API or VWiki-style context without confusing them for default GIS source refs. All golden eval sites in Europe, Canada, USA, Germany, and Lebanon are present in the catalog with old retained evidence plus focused source-family candidate sweeps. The catalog marks this with `sourceSweepState: focused_source_sweep_completed`; operational promotion still depends on AOI probes and license checks.

## Reviewed BA Package Routes

BA should prefer the reviewed package routes for normal user/product flows:

```text
/api/geospatial-package/ba
/api/geospatial-package/ecosystem
```

The geospatial route accepts:

- `lat` and `lng`, or `h3`
- `segments=terrain_elevation,imagery_observation,water_hydrology,access_infrastructure,land_property_planning,soils_landcover,climate_weather`
- `consumerAppId=ba-gis-worker`

It returns:

- `request`
- `h3Context`
- `stac.records`
- `sourceRecords`
- `fetchRecipes`
- `coverage`
- `liveProof`
- `warnings`
- `gaps`
- `provenance`

The ecosystem route accepts:

- `lat` and `lng`, or `h3`
- `segments=ecology_biodiversity_carbon,soils_landcover,water_hydrology,climate_weather,agriculture_operations,community_economy,research_only`
- `consumerAppId=ba-gis-worker`

It returns typed ecosystem records, source references, STAC-like refs where spatial asset semantics fit, VWiki handoff references for generic knowledge/method material, fetch recipes, coverage, confidence, warnings, gaps, and provenance.

Reviewed BA routes do not depend on Intel Tools or sidecar databases at request time. Intel Tools output must enter through explicit VMesh review and promotion before it appears as an operational BA source.

The package segments are:

- `terrain_elevation`
- `imagery_observation`
- `water_hydrology`
- `access_infrastructure`
- `land_property_planning`
- `soils_landcover`
- `climate_weather`
- `ecology_biodiversity_carbon`
- `agriculture_operations`
- `community_economy`
- `research_only`
- `operator_review`

Kamloops/Rose and Alberta golden evaluation sites are priority labels until the operator supplies public-safe H3/AOI fixtures. Exact private coordinates must not be committed to repo docs, tests, prompts, or generated public artifacts.

## Non-Goals

- Do not make vmesh the default owner of raw provider payloads.
- Do not require vmesh to generate COG/PMTiles/GeoParquet/H3/ledger outputs before a downstream app can use source refs.
- Do not treat source-preview PNGs as analysis data.
- Do not hide provider license, CRS, vertical datum, no-data, or coverage limitations.
- Do not make downstream apps scrape ArcGIS, STAC, object stores, or provider-specific APIs directly when vmesh already has an adapter for that source.

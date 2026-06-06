# Ecosystem Source Broker Contract

## Disclosure Condition

This contract lives in the private VMesh repo. Treat it as an internal product
and worker contract until an owner-approved public-release split extracts a
sanitized version.

The public-safe version should describe generic STAC/source-broker schemas,
provenance rules, source roles, run classes, and fixture examples. The private
version may retain BA-facing package behavior, source-discovery strategy,
Intel Tools processing, provider promotion heuristics, eval-site priorities,
worker/cache topology, and private run evidence.

Do not publish exact private AOIs, source run outputs, paid/provider order
details, signed refs, sidecar databases, or private worker implementation
details with this contract.

## Default Position

vmesh is an ecosystem source aggregator by default. It should discover, rank, normalize, and explain available geospatial, ecological, climate, hydrology, soils, infrastructure, food-system, biodiversity, and local-context data around a coordinate, H3 cell, or AOI, then return provider-native refs through a STAC-compatible spatial contract plus typed ecosystem manifests.

vmesh should not store heavy GIS or ecosystem payloads by default. Downstream apps own fetching, processing, caching, storage, rendering, simulation, and product-specific workflows unless an explicit vmesh deployment enables a cache or derivative-worker mode.

VMesh is therefore responsible for the slow municipal/source-discovery work.
For each municipality or region, it should learn which open-data portals,
ArcGIS/FeatureServer services, STAC catalogs, OGC endpoints, object stores,
climate services, ecology datasets, soil surveys, hazard sources, utility/
infrastructure layers, and local-context records exist, which are usable, and
which are blocked or missing. The GIS worker should not have to rediscover
those sources for every downstream run.

The standard pack checklist is:

- physical geospatial;
- climate;
- ecology;
- soils/geology;
- planning constraints;
- infrastructure/access;
- hazard/risk;
- provenance/confidence.

VMesh fills the source ladder, coverage state, licence posture, freshness,
confidence cap, and gap report for each pack. GIS workers process selected refs
into derived outputs only after VMesh or an operator has established which
sources are candidates for that AOI.

## Source-Location Discovery Ladder

VMesh should run source-location discovery before file ingestion. The output is
the STAC/DCAT/OGC/API/portal/source registry showing where data can be pulled
from, not the raw data itself.

Run order:

1. `country_federal_run`: national portals and agencies. Find federal
   geoportals, DCAT catalogs, STAC catalogs, DEM/LiDAR indexes, hydrology,
   soils, climate/weather, hazard, agriculture, biodiversity, census/statistical
   geography, and protected-area sources. For Canada this includes federal
   source families such as Open Government Canada, Natural Resources Canada,
   Environment and Climate Change Canada, Statistics Canada, Agriculture and
   Agri-Food Canada, and national STAC/OGC/DCAT endpoints where available.
2. `province_state_region_run`: state/provincial/regional catalogs. Find
   terrain, LiDAR, orthophoto, hydrology, forest/vegetation, wildfire, soils,
   planning, transport, parcels/cadastre, and hazard data from regional source
   owners.
3. `municipal_county_run`: municipal, county, district, and local-authority
   catalogs. Find ArcGIS FeatureServer services, Open Data portals, Socrata/
   CKAN/DCAT catalogs, orthophoto grids, LiDAR tiles, tree inventories,
   stormwater/drainage, zoning, parcels, roads, buildings, parks, water,
   utilities, and local climate/hazard studies.
4. `private_sector_run`: commercial provider catalogs and coverage metadata.
   Find availability, product IDs, footprints, access approval posture, license
   posture, indicative cost class, resolution, vintage, and ordering route for
   providers such as satellite, aerial, LiDAR, weather, parcel, building,
   mobility, infrastructure, and climate-risk vendors. Do not fetch paid files
   until a downstream product or operator explicitly authorizes it.
5. `charity_local_agency_run`: conservation authorities, watershed councils,
   land trusts, local food networks, emergency/community organizations,
   agricultural extension groups, and local NGOs. Capture public datasets,
   reports, service areas, monitoring programs, and contactable source owners.
6. `open_source_community_run`: OSM, Overture, OpenAerialMap, Wikidata,
   OpenStreetMap-derived extracts, Open Infrastructure Map, GitHub datasets,
   community PMTiles/GeoParquet packages, and other public collaborative source
   registries. Preserve licence and community-source caveats.
7. `academic_research_run`: universities, government research labs, Zenodo,
   Dataverse, Figshare, institutional repositories, paper supplements, field
   campaigns, ecological observatories, and domain-specific research datasets.
   Mark research datasets with citation, licence, method, and operational
   readiness caveats.

Each run should emit source-location records:

- `sourceLocationId`;
- `discoveryRunType`;
- `packCoverage`: which standard packs the source may fill;
- `providerName`;
- `jurisdiction`;
- `catalogType`: STAC, DCAT, CKAN, Socrata, ArcGIS, OGC, object-store index,
  API, report/document, repository, provider marketplace, or manual source;
- `landingPage`;
- `apiEndpoint` or catalog ref where public-safe;
- `coverageHint`: country, province/state, municipality, H3, bbox, named area,
  or unknown;
- `dataRoles`;
- `accessPosture`: open, token-gated, licence-review, paid, approval-required,
  contact-required, blocked, or unknown;
- `probeStatus`: unprobed, reachable, coverage-proven, no-coverage,
  blocked, stale, or failed;
- `freshness`;
- `licence`;
- `confidence`;
- `nextAction`;
- `gaps`;
- `createdAt`.

Only after source-location discovery should VMesh or a downstream worker run
AOI-specific coverage probes, file fetches, clipping, tiling, or derivative
processing.

## Primary Output

The primary downstream output is a STAC `FeatureCollection`, STAC Catalog, or STAC API search response for spatial assets, plus typed ecosystem source records for datasets that are tabular, API-backed, H3-indexed, graph-like, or otherwise not naturally represented as raster/vector GIS files.

Each response should include:

- STAC Items for every relevant spatial source asset vmesh can resolve.
- Typed ecosystem source records for climate/weather ledgers, soils, hydrology, biodiversity, agriculture, food-system, infrastructure, community/local assets, and user/context records where STAC alone is not the best shape.
- Provider-native asset refs such as public GeoTIFFs, COGs, LAZ/LAS links, STAC asset hrefs, FeatureServer query refs, object-store URLs, GeoParquet refs, CSV/JSON/Parquet refs, H3 summary refs, graph/API refs, or bounded API refs.
- Source roles such as `bare-earth-dtm`, `surface-dsm`, `generic-dem`, `imagery`, `roads`, `buildings`, `water`, `vegetation`, `soil`, `climate`, `weather`, `hydrology`, `biodiversity`, `food-system`, `infrastructure`, `community-asset`, or `ecosystem-context`.
- Provenance: provider, source URL/query, acquisition or vintage date, license, attribution, CRS, vertical datum where known, resolution, confidence, and limitations.
- Query metadata: requested coordinate/AOI/H3 disclosure class, radius or bounds, source adapters tried, rejected-source reasons, and fallback rules.

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
  -> vmesh fills standard pack source ladders and gap reports
  -> vmesh normalizes spatial results into STAC Items
  -> vmesh normalizes non-spatial ecosystem results into typed source records
  -> BA receives source refs, provenance, and rejected-source reasons
  -> BA fetches/processes/stores data in its own GIS/ecosystem worker when needed
```

For a LidarBC coordinate, vmesh should hide ArcGIS layer quirks from the consumer. It should query the relevant DEM, DSM, and point-cloud index layers, select the intersecting source assets, and return STAC Items whose `assets.data.href` values point to the official BC object-store files.

## Intel Tools Processing Layer

Intel Tools close discovery gaps by scraping, searching, and lightly probing source candidates. vmesh processes those outputs into a learning source registry. The processing output is a public-safe source broker package, not raw GIS data and not a copy of the sidecar SQLite databases.

This is especially important for municipal discovery. Intel Tools can run
category-specific searches such as "municipal LiDAR", "open orthophoto",
"stormwater/drainage GIS", "tree inventory", "parks/natural assets",
"planning/zoning GIS", "soil/agriculture", "wildfire/flood hazard", and
"climate/weather station sources". VMesh then promotes only reviewed candidates
into pack source ladders.

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

The next reviewed site packages are `scotland-rural-comrie-croft`, `scotland-coastal-tangleha-artists-collective`, `scotland-urban-edinburgh-mcdonald-place`, `scotland-rural-perth-ph1-road-building-alignment`, `canada-rural-pemberton-bc`, `canada-dryland-kamloops-rose-hill`, `canada-rural-alberta-parkland`, `germany-rural-bavaria-wegele`, `usa-vermont-rural-mad-river-valley`, `usa-colorado-mountain-boulder-canyon`, `usa-florida-low-relief-coastal`, `usa-urban-san-francisco`, and `middle-east-lebanon-mount-lebanon`. Comrie's focused 2026-06-03 sweep adds Perth & Kinross open data, Comrie flood records, Scotland LiDAR, habitat, and local ecosystem context candidates. Tangleha's focused 2026-06-03 sweep adds St Cyrus / Tangleha coastal candidates for NatureScot reserve context, NatureScot protected-area layers, SEPA coastal flood data, Aberdeenshire open data, coastal change adaptation material, and permaculture context. Edinburgh's focused 2026-06-03 sweep adds adopted-road, city open data, greenspace, flood/environment, LiDAR, and city mobility/environment context candidates. Perth PH1's focused 2026-06-03 sweep adds Perth & Kinross open data, DCAT feeds, core paths, Scotland LiDAR, SEPA flood, surface-water, climate-risk, and planning-energy candidates. Pemberton's focused 2026-06-03 sweep adds BC and regional candidates for LidarBC, the LidarBC Open LiDAR Data Index, BC topographic data, SLRD mapping, BC terrestrial ecosystem data, settlement planning context, and Agricultural Land Reserve context. Kamloops/Rose's focused 2026-06-03 sweep adds priority BC interior candidates for LidarBC DSM/DEM, the BC Data Catalogue, BC terrestrial ecosystem data, Thompson flood hazards, City of Kamloops open data, TNRD geohazard/property context, soil/wildfire/watershed catalogue references, and dryland grassland ecosystem context, while exact Rose AOI live proof remains an operator-local private-coordinate setup gap. Alberta's focused 2026-06-03 sweep adds provincial candidates for wildfire GIS, soil/AGRASID, Agricultural Land Resource Atlas layers, Altalis products, ABMI airborne LiDAR, ABMI hydrological habitats, and ACIMS biodiversity data, alongside retained BA UP42 terrain live-proof refs. Bavaria's focused 2026-06-03 sweep adds DGM1 terrain, Bavaria OpenData, Geoportal Bayern services, LDBV WMS/WFS docs, FIS-Natur FIN-Web, BGR Geoportal, soil-estimate context, and landscape-planning source guidance. The USA focused 2026-06-03 sweeps add Vermont VCGI/ANR river and soils sources, Boulder County and USGS terrain/hazard sources, Florida FDEM/DEP/NOAA coastal sources, and San Francisco DataSF/BCDC/USGS/SFEI coastal-urban sources. Lebanon's focused 2026-06-03 sweep adds CNRS/National Center for Remote Sensing, CNRS water resources, FAO vegetation/land-cover references, Copernicus DEM, Sentinel-2 Earth Search STAC, Geofabrik OSM, and SoilGrids candidates. Local ecosystem context records are marked `research_only` and `advanced_user_view`, which means BA can pipe them to advanced/API or VWiki-style context without confusing them for default GIS source refs. All golden eval sites in Europe, Canada, USA, Germany, and Lebanon are present in the catalog with old retained evidence plus focused source-family candidate sweeps. The catalog marks this with `sourceSweepState: focused_source_sweep_completed`; operational promotion still depends on AOI probes and license checks.

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

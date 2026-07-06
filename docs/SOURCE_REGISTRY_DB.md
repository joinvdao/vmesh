# VMesh Source Registry DB

## Purpose

VMesh needs a durable source registry database for source discovery, promotion, and reuse. The database tracks where useful data can be found by jurisdiction and data bucket. It does not store heavy GIS or ecosystem payloads by default.

The core rule is:

```text
Intel Tools scrape and discover candidates.
VMesh processes, dedupes, verifies, ranks, and serves source refs.
Downstream apps fetch or process heavy payloads when needed.
```

The registry should let BA, VMesh, and future products ask for a coordinate, H3 cell, municipality, region, or country and receive a fast source package without repeating open-web discovery.

## Jurisdiction Levels

Every source should be attached to the most specific known authority level:

- `global`: global catalogs and foundations.
- `country`: national geospatial, climate, ecology, census, and statistical providers.
- `state_province`: state, province, territory, devolved-government, or regional providers.
- `municipal`: city, county, district, watershed authority, local GIS, and planning portals.
- `private_sector`: commercial providers, paid marketplaces, utilities, and platform APIs.
- `charity_local_agency`: NGOs, conservation groups, community land trusts, watershed groups, local food networks, and field projects.
- `open_community`: OpenStreetMap, Overture, Wikimedia/Wikidata, open community indexes, and volunteer-maintained datasets.
- `academic_research`: universities, labs, research projects, papers with datasets, and model outputs.

VMesh should search these levels in a deliberate source ladder. National sources are not enough. Municipal and regional portals often hold the best orthophoto, LiDAR, road, parcel, tree, water, and planning layers.

## Data Buckets

The registry should cover geospatial and ecosystem data, not only GIS files:

- `terrain_elevation`: DTM, DSM, DEM, LiDAR point cloud, contours, bathymetry, and height-above-ground.
- `imagery_observation`: orthophotos, satellite imagery, Sentinel/Landsat, aerial survey indexes, and visual preview sources.
- `water_hydrology`: rivers, lakes, wetlands, flood maps, flow accumulation, water masks, drainage, watershed boundaries, and culverts.
- `soils_landcover`: soils, land cover, land use, geology, slope/aspect derivatives, agricultural land classes, and field boundaries.
- `ecology_biodiversity_carbon`: habitats, species, protected areas, tree inventories, canopy, carbon, ecological zones, restoration, and conservation layers.
- `access_infrastructure`: roads, paths, buildings, rail, bridges, utilities, transport, and access constraints.
- `land_property_planning`: parcels, zoning, planning overlays, administrative boundaries, easements, and cadastral references.
- `climate_weather`: historical climate, weather, wind, solar, precipitation, fire weather, drought, and heat/frost context.
- `food_system_local_assets`: farms, farmers markets, food networks, processors, local institutions, and community assets.
- `risk_hazard`: wildfire, flood, landslide, earthquake, erosion, coastal change, and infrastructure risk layers.
- `knowledge_context`: non-spatial ecosystem context, manuals, playbooks, wiki-style references, and local research handoffs.

Some records will never display in the default UI. VMesh should mark them for `advanced_view`, `api_only`, or `vwiki_handoff` when they are useful for products and agents but not appropriate for an end-user map layer.

## Suggested Tables

### `source_authorities`

Tracks organizations or source families.

| Field                | Purpose                                                                          |
| -------------------- | -------------------------------------------------------------------------------- |
| `id`                 | Stable VMesh authority id.                                                       |
| `name`               | Provider or authority name.                                                      |
| `jurisdiction_level` | One of the jurisdiction levels above.                                            |
| `country_code`       | ISO country code where applicable.                                               |
| `region_code`        | State, province, territory, or regional code where applicable.                   |
| `municipality`       | Municipality or local authority where applicable.                                |
| `homepage_url`       | Public homepage or catalog root.                                                 |
| `operator_type`      | Government, NGO, academic, community, private, or mixed.                         |
| `reliability_tier`   | `official`, `trusted_open`, `community`, `research`, `commercial`, or `unknown`. |
| `notes`              | Short public-safe context.                                                       |

### `source_endpoints`

Tracks callable catalogs, APIs, services, and indexes.

| Field             | Purpose                                                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`              | Stable endpoint id.                                                                                                                                                                               |
| `authority_id`    | Parent authority.                                                                                                                                                                                 |
| `endpoint_type`   | `stac_api`, `stac_static`, `tnm_api`, `arcgis_feature_server`, `arcgis_image_server`, `ogc_wms`, `ogc_wfs`, `ogc_wcs`, `object_store`, `open_data_catalog`, `download_index`, `api`, or `manual`. |
| `url`             | Public endpoint URL. Do not store secrets or signed URLs.                                                                                                                                         |
| `auth_mode`       | `none`, `api_key`, `oauth`, `account_required`, `paid`, `unknown`.                                                                                                                                |
| `license`         | Public license summary or review state.                                                                                                                                                           |
| `status`          | `candidate`, `reviewed`, `probed`, `live_proof`, `blocked`, `license_gated`, `token_gated`, `paid_only`, `no_data`, `outdated`.                                                                   |
| `last_checked_at` | Last probe timestamp.                                                                                                                                                                             |
| `evidence_ref`    | Retained artifact path or redacted evidence id.                                                                                                                                                   |

### `source_collections`

Tracks datasets, STAC collections, ArcGIS layers, product families, and table groups inside an endpoint.

| Field                    | Purpose                                                                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                     | Stable collection id.                                                                                                                    |
| `endpoint_id`            | Parent endpoint.                                                                                                                         |
| `provider_collection_id` | Native STAC collection, ArcGIS layer id, dataset id, or product code.                                                                    |
| `data_bucket`            | One of the buckets above.                                                                                                                |
| `source_role`            | `bare-earth-dtm`, `surface-dsm`, `point-cloud`, `orthophoto`, `roads`, `buildings`, `water`, `vegetation`, `soil`, `climate`, and so on. |
| `resolution_meters`      | Nominal pixel, point, or vector scale when known.                                                                                        |
| `crs`                    | CRS or native projection where known.                                                                                                    |
| `vertical_datum`         | Vertical datum where known.                                                                                                              |
| `asset_roles`            | Expected provider-native assets.                                                                                                         |
| `coverage_summary`       | Public-safe jurisdiction or coverage note.                                                                                               |
| `limitations`            | Known gaps, role mismatches, or license constraints.                                                                                     |

### `coverage_evidence`

Tracks whether a source covers a site or tile without exposing private coordinates.

| Field              | Purpose                                                                        |
| ------------------ | ------------------------------------------------------------------------------ |
| `id`               | Stable evidence id.                                                            |
| `collection_id`    | Source collection checked.                                                     |
| `query_ref`        | Public-safe H3, redacted site id, tile id, or coarse AOI label.                |
| `disclosure_class` | `public_safe`, `operator_local`, `private_redacted`, or `not_for_public_repo`. |
| `run_class`        | `mock`, `dry_run`, `configured`, or `live_proof`.                              |
| `coverage_status`  | `covered`, `partial`, `no_data`, `blocked`, `unknown`.                         |
| `selected_assets`  | Provider-native asset refs or redacted refs.                                   |
| `evidence_ref`     | Retained artifact path or operator-local evidence id.                          |
| `checked_at`       | Probe timestamp.                                                               |

### `source_runs`

Tracks discovery and processing runs.

| Field                  | Purpose                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| `id`                   | Stable run id.                                                                                     |
| `run_type`             | `intel_tools_discovery`, `vmesh_probe`, `license_review`, `source_promotion`, `scheduled_refresh`. |
| `prompt_or_recipe_ref` | Prompt id, recipe id, or worker config.                                                            |
| `jurisdiction_scope`   | Country, region, municipality, or site-safe label.                                                 |
| `data_buckets`         | Buckets targeted.                                                                                  |
| `candidate_count`      | Raw candidates found.                                                                              |
| `promoted_count`       | Candidates promoted to reviewed/probed/live-proof states.                                          |
| `quarantined_count`    | Noise, blocked, or unsafe records.                                                                 |
| `artifact_ref`         | Public-safe artifact path or redacted operator-local artifact id.                                  |

## Promotion States

VMesh should not treat scraped candidates as operational sources until they are promoted.

- `candidate`: found by Intel Tools, a web search, a catalog crawl, or manual entry.
- `reviewed`: human or agent review found the source plausible and relevant.
- `probed`: VMesh queried the endpoint with bounded public-safe inputs.
- `live_proof`: a real provider response or retained artifact proves the intended workflow.
- `blocked`: the endpoint is unavailable, broken, unsafe, or not usable for the requested source role.
- `license_gated`: useful source, but license review is required before default use.
- `token_gated`: requires credentials and cannot be default open-data output.
- `paid_only`: commercial source, available only through explicit downstream choice.
- `research_only`: useful knowledge context, not operational GIS/ecosystem source data.

Promotion must preserve rejected-source reasons. A source that fails for one AOI can remain valid for another AOI, so the DB should separate source existence from per-site coverage.

## Query Flow

```text
coordinate / H3 / AOI / municipality
  -> normalize jurisdiction and privacy/disclosure class
  -> query source_authorities and source_endpoints by jurisdiction ladder
  -> select source_collections by data bucket and source role
  -> reuse coverage_evidence where fresh enough
  -> run bounded probes when evidence is stale or missing
  -> return STAC Items plus typed ecosystem records
  -> record rejected sources and refresh requirements
```

The response to BA should be laser-fast because the slow source discovery and promotion work happened earlier. If a user asks for a new deep search, VMesh can enqueue a slow discovery run and update the registry over 12 to 24 hours.

## Canada Seed Sources

### Natural Resources Canada / Geo.ca Datacube

| Field        | Value                                                                             |
| ------------ | --------------------------------------------------------------------------------- |
| Authority    | Natural Resources Canada / Geo.ca Datacube                                        |
| Jurisdiction | `country`, Canada                                                                 |
| STAC API     | `https://datacube.services.geo.ca/stac/api/`                                      |
| Collections  | `hrdem-mosaic-1m`, `hrdem-mosaic-2m`, `hrdem-lidar`                               |
| Source roles | `bare-earth-dtm`, `surface-dsm`, `lidar-derived-terrain`, `lidar-derived-surface` |
| License      | Open Government Licence - Canada, confirm per collection/item                     |
| Notes        | Direct official STAC should be probed before making source-resolution claims.     |

Key collection URLs:

- `https://datacube.services.geo.ca/stac/api/collections/hrdem-mosaic-1m`
- `https://datacube.services.geo.ca/stac/api/collections/hrdem-mosaic-2m`
- `https://datacube.services.geo.ca/stac/api/collections/hrdem-lidar`

### Mapterhorn Canada Attribution

Mapterhorn is useful as a source-family clue, not as a full provenance database for VMesh.

| Field                           | Value                                                  |
| ------------------------------- | ------------------------------------------------------ |
| Mapterhorn source id            | `cahrdem2`                                             |
| Name                            | `Canada DTM 2018-2024`                                 |
| Producer                        | Natural Resources Canada                               |
| License                         | Open Government Licence - Canada                       |
| Resolution listed by Mapterhorn | `2` meters                                             |
| Tarball URL                     | `https://download.mapterhorn.com/sources/cahrdem2.tar` |
| Attribution URL                 | `https://download.mapterhorn.com/attribution.json`     |

Registry rule: do not infer Canada-wide 1 m coverage from Mapterhorn. Use the official Canadian STAC and role-specific COG/item evidence for 1 m DTM or DSM claims.

### Rose Source-Pack And Fallback Test Note

Rose already has a strong operator-local source pack and should not be described as dependent on Mapterhorn for core site data. The Mapterhorn/Canadian STAC work was a fallback and provenance test: if BA or VMesh needs a public/open terrain source path for comparison, fallback, or source attribution, the redacted Rose AOI can be checked against direct official Canadian source families.

VMesh now models the golden-quality Kamloops terrain handoff as
`kamloops-local-lidar-dtm-1m`: a configured municipal/operator-local source rail
inside a coarse public Kamloops service area. VMesh indexes the source authority
and clean configured endpoint, but it does not store the DTM payload. Abundance
must window the configured raster, prove non-no-data AOI coverage, preserve
CRS/vertical datum/resolution, and retain public-safe QA artifacts before a
neighbour pack can claim golden-quality terrain.

For the redacted Rose golden-eval AOI, the fallback/provenance test matched these public source item families:

- `hrdem-mosaic-1m` item `2_4-mosaic-1m`
- `hrdem-mosaic-2m` item `2_4-mosaic-2m`
- `hrdem-lidar` item `BC-Riverine_Floodplain_UTM10_2019-1m`

The public docs can store these source-family and item ids because they are broad public source refs. They do not replace the Rose local source pack. Exact Rose coordinates, addresses, signed URLs, private order details, and local machine paths must stay out of public repo artifacts.

## USA Seed Sources

### USGS National Map / 3DEP

| Field            | Value                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| Authority        | U.S. Geological Survey                                                                            |
| Jurisdiction     | `country`, United States                                                                          |
| TNM API          | `https://tnmaccess.nationalmap.gov/api/v1/`                                                       |
| 3DEP ImageServer | `https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer`                |
| Source roles     | `bare-earth-dtm`, `generic-dem`, terrain preview                                                  |
| Notes            | Use official coverage and product-index checks before claiming source resolution for a given AOI. |

### Microsoft Planetary Computer 3DEP STAC

| Field        | Value                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| STAC API     | `https://planetarycomputer.microsoft.com/api/stac/v1`                                                                     |
| Collections  | `3dep-seamless`, `3dep-lidar-copc`, `3dep-lidar-dtm`, `3dep-lidar-dsm`, `3dep-lidar-hag`                                  |
| Source roles | DTM, DSM, COPC point cloud, height above ground                                                                           |
| Notes        | Useful STAC interface for 3DEP-derived assets. Treat as a source resolver, then retain provider-native refs and licenses. |

### AWS USGS LiDAR STAC / EPT

| Field          | Value                                                                            |
| -------------- | -------------------------------------------------------------------------------- |
| Static catalog | `https://usgs-lidar-stac.s3-us-west-2.amazonaws.com/ept/catalog.json`            |
| Source roles   | LiDAR point cloud, EPT/COPC style source discovery                               |
| Notes          | Use for point-cloud discovery and handoff where USGS 3DEP lidar coverage exists. |

USA source ladder:

```text
USGS TNM official API
  -> USGS 3DEP ImageServer and product/source indexes
  -> Planetary Computer 3DEP STAC
  -> AWS USGS LiDAR STAC/EPT
  -> state GIS portals
  -> county/municipal portals
  -> Overture/OSM/community open sources
  -> private providers only by explicit request
```

## Global STAC Discovery Run

The next Intel Tools source-discovery campaign is queued as `prompt/queue/012-global-stac-source-link-discovery.md`.

That run should:

- scrape previous VMesh and Intel Tools geospatial outputs first;
- extract every STAC, static STAC, STAC collection, `catalog.json`, COPC/EPT, COG, and STAC-adjacent source lead;
- dedupe endpoints across prior runs before doing new web discovery;
- seed the registry with global, country, state/province, municipal, private-sector, charity/local agency, open-community, and academic STAC sources;
- classify each endpoint by data bucket, source role, jurisdiction, license, access posture, and promotion state;
- keep large payloads out of VMesh and return only source refs, probes, evidence, and registry DB rows.

## Municipal Search Requirement

The Rose fallback/source-attribution review showed why municipal search must be part of every source campaign even when national terrain sources exist. A national search can prove broad HRDEM or 3DEP coverage, but city, county, regional district, watershed, and provincial portals may hold:

- higher-resolution orthophotos;
- LiDAR-derived DEM/DSM or raw point-cloud indexes;
- tree inventories and vegetation layers;
- roads, trails, bridges, and civic infrastructure;
- parcels, zoning, development, and planning overlays;
- local flood, water, geohazard, wildfire, and drainage layers;
- community ecosystem, food-network, or land-stewardship datasets.

Every coordinate-level campaign should therefore run:

```text
country source run
  -> state/province source run
  -> municipal/local authority source run
  -> private/provider marketplace run
  -> charity/local agency run
  -> open community run
  -> academic/research run
```

The DB should remember the endpoints and promotion states so future runs refresh known sources instead of rediscovering them from scratch.

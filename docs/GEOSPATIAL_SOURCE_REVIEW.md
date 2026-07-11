# Firm Geospatial Source Review

Generated: 2026-06-03. Reconciled: 2026-07-11.

Run class: `dry-run` review with retained `live-proof` evidence for selected terrain paths.

## July 2026 Capability Reconciliation

The repeatable Intel Tools refresh completed a configured/live-discovery run
with 54 candidate authorities, 80 endpoints, and 966 collections. The typed
Phase 030 reconciliation classifies 866 collections as `adapter-ready` and 100
as `probe-ready`; all 966 remain quarantined. None are promoted by discovery
alone. Coverage is not yet proven for these refreshed records, 569 have a
license-review blocker, 317 need coverage proof, and 80 need adapter proof.

The generated public-safe summary is
`docs/evidence/source-capability-summary-2026-07-11.json`. The canonical
Supabase migration and idempotent ingester are implemented. Live persistence
currently requires either the project CA certificate for verified pooler TLS
or a refreshed Supabase Management API PAT; the retained PAT returns `401`.
This is a persistence blocker, not a source-discovery or adapter-readiness
claim.

The focused Phase 031 refresh then metadata-probed ten authoritative services
for terrain, imagery, landcover and hydrology. All ten roots were healthy.
Collection enumeration succeeded for nine; Digital Earth Africa's root was
valid but its collections link intermittently returned HTML, so that deeper
probe remains a warning rather than a false endpoint outage. No source was
promoted from this metadata proof. Evidence is retained in
`docs/evidence/official-endpoint-refresh-2026-07-11.json`.

Phase 032 closes the executable global land-terrain floor. The retained live
matrix proves five continents, a two-tile anti-meridian frame, and a
high-latitude frame against public Copernicus GLO-30 COGs. A Denver sample
selects official USGS 3DEP 1 m GeoTIFF refs ahead of Copernicus. The open-ocean
sample returns an explicit no-data block. Kamloops resolves public municipal
1 m ZIP refs, but remains `dry-run` until the GIS worker reads and QA-proves
source pixels. Evidence is in
`docs/evidence/global-terrain-live-matrix-2026-07-11.json`.

Phase 033 adds a deterministic ESA WorldCover 2021 v200 COG adapter and a
stable class-to-visual-context decision for vegetation, built-up, bare,
snow/ice, water and no-data pixels. The live matrix verifies 10 m source refs
across five continents, Kamloops and the anti-meridian, with an explicit
outside-published-latitude result. WorldCover remains classified global
context and is never converted into species, surveyed habitat, soil or legal
truth. Evidence is in `docs/evidence/worldcover-live-matrix-2026-07-11.json`.

Phase 034 resolves the latest official Overture STAC release and performs
bounded range reads against its release-pinned building PMTiles. The live
matrix proves real semantic footprints in Kamloops, Denver, Lisbon, Tokyo and
Cape Town, and a valid empty ocean result. IDs, release, class, subtype,
height, floors, facade and roof fields are preserved when published; absent
values remain null. Official jurisdictional buildings remain the preferred
tier when promoted, with Overture global and OSM fallback retained in the
worker ladder. Evidence is in
`docs/evidence/building-live-matrix-2026-07-11.json`.

Phase 035 adds bounded live Overture road and water extraction plus typed
Open-Meteo and SoilGrids point-context adapters. The six-location matrix
preserves published road and water semantics, distinguishes valid empty
results from provider failures, and applies explicit timeout, retry and cache
policies. SoilGrids remains modelled context and returned explicit no-data in
the retained run. No authoritative parcel or reviewed field-boundary service
was promoted, so both layers return explicit gaps and the map-selected polygon
remains a visual selection overlay rather than a legal claim. Evidence is in
`docs/evidence/context-live-matrix-2026-07-11.json`.

Phase 036 establishes the executable-source promotion boundary. Six source
families currently pass it: Copernicus GLO-30, USGS 3DEP, ESA WorldCover,
Overture, Open-Meteo and SoilGrids. Metadata-only records remain visible in the
ledger but cannot emit operational Abundance recipes. The gate rejects unsafe,
signed, private, local, preview, stale, unlicensed and unsupported refs. The
durable health migration demotes after three consecutive failures or 30 days
without healthy evidence while retaining source history. Evidence is in
`docs/evidence/source-promotion-summary-2026-07-11.json`.

## Executive Summary

VMesh has enough source-broker structure to serve BA a fast geospatial package, but only a narrow part of the geospatial stack is live-proof today.

The strongest ready area is terrain. Retained artifacts prove selected public-safe USA, Canada, and British Columbia DTM/DSM source-preview and worker paths using official source providers. This does not prove universal USA/Canada 1m coverage, and it does not prove the private Kamloops/Rose or Alberta golden-site coordinates unless those exact coordinates are configured locally and tested through the same route.

The rest of the geospatial layer is mostly `ready_source_ref` or `configured_only`: VMesh has source IDs, provider URLs, package roles, access posture, and preprocessing/fetch recipes, but BA should receive those as source refs, warnings, and probe plans rather than as proven operational data.

The Intel Tools sidecar package is useful for gap discovery, dedupe, and candidate intelligence, but most candidates remain noisy, unprobed, research-only, or license-review pending. It should not be treated as a BA-ready source registry without promotion.

Update note, 2026-06-06: VMesh needs a durable source-registry DB to avoid repeating source discovery and to distinguish country, state/province, municipal, private-sector, charity/local agency, open-community, and academic source levels. The target schema and initial Canada/USA source ladders are now documented in [SOURCE_REGISTRY_DB.md](SOURCE_REGISTRY_DB.md).

## Bucket Readiness Matrix

| Bucket                   | Known sidecar candidates | Sidecar BA-ready count | Registry/source state                                                                                               | BA default status                                                   |
| ------------------------ | ------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `terrain_elevation`      | 322 total segment count  | 15                     | Terrain registry has 20 terrain candidates; selected official USA/Canada/BC paths have retained live-proof.         | expose approved terrain source refs and live-proof where applicable |
| `imagery_observation`    | 187 total segment count  | 8                      | Sentinel-2 Earth Search is source-ref ready; SEN2SR output is future/configured-only; Mapbox is token-gated.        | expose Sentinel source ref; keep Mapbox out of default BA package   |
| `water_hydrology`        | 378 total segment count  | 5                      | Overture water is globally live-proven for bounded 3 km frames; official regional hydrology remains coverage-gated. | expose live Overture context plus ranked regional upgrades          |
| `access_infrastructure`  | 254 total segment count  | 3                      | Overture roads/buildings are globally live-proven; official regional services remain preferred when promoted.       | expose live Overture vectors plus ranked official upgrades          |
| `land_property_planning` | 327 total segment count  | 7                      | Official parcel GIS is a placeholder source family; Canada Lands candidates need license/AOI review.                | return as gap/review by default unless explicitly requested         |
| `soils_landcover`        | 582 total segment count  | 10                     | WorldCover COGs and bounded SoilGrids point context are live-proven; regional soil surveys remain source refs.      | expose modelled global context plus regional upgrades               |
| `climate_weather`        | 78 total segment count   | 2                      | Open-Meteo current model context is live-proven; NASA POWER is source-ref/API ready; ERA5 needs credentials.        | expose labelled Open-Meteo context; retain other ranked options     |

The sidecar import summary reports 3,353 canonical source candidates and 3,907 quarantined candidates across imported runs. Status distribution is dominated by `noisy_candidate`, `needs_probe`, `research_only`, and `needs_license_review`.

## Source Cooperative (cholmes) — cloud-native open host [candidate authority, added 2026-06-18]

[Source Cooperative / cholmes](https://source.coop/cholmes) (Chris Holmes — Cloud-Native Geospatial / STAC / Radiant Earth) republishes major open datasets as **cloud-native, no-key** GeoParquet / PMTiles / COG. This fits the vmesh broker model unusually well: bbox/point queries can run **directly against remote GeoParquet** (HTTP range reads via DuckDB / hyparquet) with **no API key and no rate limit** — i.e. a new `geoparquet-bbox` fetch-recipe adapter family. Treat Source Cooperative as an **open-community authority** in the jurisdiction ladder. The datasets below are **candidates** — they still need a per-AOI coverage probe + per-dataset license verification (the listing page shows license as unspecified).

| Dataset                                                                                                       | vmesh bucket                                          | Coverage            | Format                          | License (verify)                       |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------- | ------------------------------- | -------------------------------------- |
| **Open Administrative Boundaries** (Overture divisions, Jan 2025; `countries.parquet`, **ADM0/country only**) | jurisdiction index / `knowledge_context`              | Global              | GeoParquet                      | Overture (CDLA-Permissive / ODbL)      |
| **Cloud Native MGRS** (1 km grid + admin boundaries)                                                          | reference grid / jurisdiction                         | Global              | GeoParquet                      | grid public-domain; admin per-Overture |
| **Overture Open Buildings**                                                                                   | `access_infrastructure`                               | Global              | GeoParquet, PMTiles             | ODbL / CDLA                            |
| **Google Open Buildings**                                                                                     | `access_infrastructure`                               | Africa, S & SE Asia | GeoParquet, PMTiles             | CC BY 4.0                              |
| **National Hydrography Dataset (NHD)**                                                                        | `water_hydrology`                                     | USA                 | GeoParquet                      | US public domain                       |
| **EuroCrops**                                                                                                 | `food_system_local_assets` / `soils_landcover`        | EU                  | GeoParquet, FlatGeobuf, PMTiles | per-country (research)                 |
| **Fields of the World / fiboa**                                                                               | `food_system_local_assets` / `land_property_planning` | standard + samples  | GeoParquet                      | per-dataset                            |
| **STAC-GeoParquet (Sentinel-2, Landsat)**                                                                     | `imagery_observation` (STAC index)                    | Global              | GeoParquet                      | open metadata                          |
| **Sentinel-2 Grid**                                                                                           | `imagery_observation` (reference)                     | Global              | GeoParquet                      | open                                   |
| **Ordnance Survey Open Data** (cloud-native)                                                                  | multi (terrain/roads/places)                          | United Kingdom      | GeoParquet, PMTiles             | OGL                                    |

**Why it matters for vmesh:**

- **Admin boundaries — mind the level.** `cholmes/admin-boundaries` is **ADM0/country only** today (`countries.parquet`), which vmesh already has via geoBoundaries CGAZ ADM0 — so it does **not** close the ADM1/ADM2 gap; treat it only as a fast country-code tagger / cross-check. The real ADM1/2 deepening in `JURISDICTION_INDEX.md` still comes from geoBoundaries gbOpen ADM1/2 (CC BY 4.0) or the **full** Overture `divisions` theme (region/county/locality), not this country-filtered file.
- **No-key global candidates** for buildings (`access_infrastructure`), hydrography (`water_hydrology`), the imagery STAC index (`imagery_observation`), and food/field boundaries (`food_system_local_assets`).
- **Cloud-native format = cheap recipes** — GeoParquet bbox reads need no provider account, so these are strong `ready_source_ref` candidates once per-AOI coverage + license are confirmed.

**Promotion path:** probe one dataset per bucket against the Kamloops/Rose + Alberta eval AOIs, confirm per-dataset license, then register as `source_collections` with a `geoparquet-bbox` recipe and promote per `INTEL_VMESH_SOURCE_HANDOFF_CONTRACT.md`.

## OpenAerialMap (OAM) — open imagery STAC catalog [candidate authority, added 2026-06-22]

[OpenAerialMap](https://map.openaerialmap.org/) (community service stewarded by HOT / the Open Imagery
Network) is an open catalog of openly-licensed **aerial, drone, and satellite imagery**, served as
**Cloud-Optimized GeoTIFFs (COG) + TMS tiles** and exposed through a **STAC-aligned catalog API**
(`https://api.openaerialmap.org/`) — **no API key**. Imagery is predominantly **CC BY 4.0**
(uploader-chosen open license). This fits the vmesh broker as a candidate `imagery_observation` STAC
source (a `stac-search → COG` recipe) and complements the STAC-GeoParquet (Sentinel-2 / Landsat) index
from Source Cooperative with **high-resolution local / drone** captures where they exist.

| Field                     | Value                                                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| vmesh bucket              | `imagery_observation`                                                                                                                                              |
| Endpoint                  | STAC-aligned catalog API (`api.openaerialmap.org`); web browser at `map.openaerialmap.org`                                                                         |
| Format                    | COG (GeoTIFF) + TMS tiles + thumbnails                                                                                                                             |
| License (verify per item) | mostly CC BY 4.0 (Open Imagery Network); confirm per-image                                                                                                         |
| Coverage                  | **crowd-sourced + sparse/uneven** — strong where contributors uploaded (humanitarian mapping, drone surveys), empty elsewhere; variable resolution + capture dates |

**Why it matters for vmesh:**

- **No-key, openly-licensed, high-res** imagery — fills what STAC-GeoParquet / Sentinel-2 cannot (sub-metre drone/aerial vs ~10 m satellite) wherever coverage exists.
- **Per-image provenance + license + capture date** ride on each STAC item → fits the provenance-first contract.
- **Coverage is the catch, not the API.** Treat as an **opportunistic AOI supplement**, not a systematic source — most AOIs return nothing, so the per-AOI coverage probe decides usefulness. (Operator shared an AOI link over central Scotland, ~56.0° N / -3.5° W, near the Perthshire eval sites — a good first coverage probe.)

**Promotion path:** probe the OAM STAC API for coverage over the Scotland/Perthshire + Kamloops/Rose eval AOIs; where imagery exists, verify the per-image license, then register as a `source_collection` with a `stac-search` recipe per `STAC_BROKER_CONTRACT.md` + `INTEL_VMESH_SOURCE_HANDOFF_CONTRACT.md`. Until then it stays `needs_probe` / `needs_license_review`.

## Cloud-native geo tooling [added 2026-06-18]

Open tools that make the `geoparquet-bbox` adapter + the H3 jurisdiction index cheap to build:

- **[geoparquet-io](https://github.com/geoparquet/geoparquet-io)** (Python lib + CLI, Apache-2.0; docs at geoparquet.io) — fast GeoParquet I/O + transform: convert / sort / partition, **spatial indexing (H3, S2, A5, quadkey, KD-tree)**, auto bbox column, Hilbert sort, ZSTD, GeoParquet 1.1/2.0. Built on **DuckDB + PyArrow + GDAL + Obstore** with native S3 / GCS / Azure / HTTPS reads. This is the implementation tool for (a) the `geoparquet-bbox` fetch adapter that reads Source Cooperative datasets by bbox/point with no key, and (b) the H3 polyfill in `JURISDICTION_INDEX.md` — its built-in H3 indexing emits the `cell → jurisdiction_id` table directly.
- **[GeoLibre](https://github.com/opengeos/GeoLibre)** (opengeos / Qiusheng Wu, MIT) — cloud-native GIS platform: **MapLibre GL JS + DuckDB-WASM Spatial + deck.gl** front end, FastAPI Python sidecar, runs desktop / web / Android / Jupyter. Loads remote GeoParquet/GeoJSON/Shapefile and runs spatial SQL **client-side in the browser via DuckDB-WASM** — i.e. a working reference architecture for vmesh's map/H3 UI and for executing `geoparquet-bbox` queries with no server. Integrates Planetary Computer / Earth Engine. Treat as a UI/serving-layer reference (see `SYSTEM_DESIGN.md`), not a data source.
  - **ADOPT/REJECT verdict [2026-07-05, full assessment → vmesh public queue `008-geolibre-harvest`]:**
    **ADOPT (1) as the operator source-review bench** for the `needs_probe` /
    `needs_license_review` step: drag in a COG, hit a STAC endpoint, WMS
    GetCapabilities discovery, range-read remote GeoParquet (its SQL samples
    read `data.source.coop` — our Source Cooperative candidates directly),
    inspect, then record the verdict in this registry as usual. Workflow
    adoption, zero code dependency. **ADOPT (2) native DuckDB in the
    worker/pipeline** for the `geoparquet-bbox` recipe (AOI extracts + H3
    summaries via HTTP range reads; pairs with geoparquet-io above);
    DuckDB-WASM in-browser only later, lazy-loaded, operator/advanced view
    only (~30MB payload has no place in the default atlas). **PATTERN REFS:**
    Field Collection → user-records milestone; PWA offline-area precache →
    offline milestone; `?url=` project deep links → package-manifest sharing.
    **REJECT (recorded so it isn't relitigated):** embedding/forking the
    workbench (identity conflict — vmesh is a curated provenance-gated atlas,
    not a generic GIS); the add-anything ingestion UI in the default surface;
    Whitebox-WASM/browser raster processing (server-side discipline stands);
    Tauri desktop/mobile builds; the canvas atmosphere plugin (our Three.js
    globe exceeds it). Prefer consuming the underlying libs (duckdb, geotiff.js,
    pmtiles, flatgeobuf) over depending on the 6-week-old platform itself.

## Sources Ready For BA

### `live_proof_ready`

These can be exposed to BA as proven source paths for matching public-safe AOIs and roles:

| Source ID           | Role             | Provider                       | Evidence                                                                                      |
| ------------------- | ---------------- | ------------------------------ | --------------------------------------------------------------------------------------------- |
| `usgs-3dep`         | `bare-earth-dtm` | U.S. Geological Survey 3DEP    | `.artifacts/terrain-source-preview/terrain-package-live-proof-latest.json`                    |
| `usgs-3dep-lpc-dsm` | `surface-dsm`    | U.S. Geological Survey 3DEP    | `.artifacts/terrain-source-preview/source-preview-route-live-proof-latest.json`               |
| `canada-hrdem`      | `bare-earth-dtm` | Natural Resources Canada       | `.artifacts/terrain-source-preview/source-preview-coordinate-probe-live-proof-latest.json`    |
| `canada-hrdem-dsm`  | `surface-dsm`    | Natural Resources Canada       | `.artifacts/terrain-source-preview/terrain-package-live-proof-latest.json`                    |
| `bc-lidarbc`        | `bare-earth-dtm` | Government of British Columbia | `.artifacts/terrain-source-preview/source-preview-probe-route-lidarbc-live-proof-latest.json` |
| `bc-lidarbc-dsm`    | `surface-dsm`    | Government of British Columbia | `.artifacts/terrain-source-preview/source-preview-route-live-proof-latest.json`               |

## BA Golden Eval Old Outputs

VMesh now exposes a public-safe old-output catalog through `/api/geospatial-package/ba-golden-evals`. This pulls in the existing BA golden-eval retained evidence index and old Intel Tools candidate summaries before any new full sweep.

Current one-at-a-time status:

- `scotland-rural-burmieston`: old BA retained imagery evidence and old Intel Scotland/Burmieston matches are imported, cleaned, and available as a site-id package. A focused 2026-06-03 web sweep also added Scotland source families for remote sensing, SSDI GeoNetwork, habitat, soils, NatureScot data services, forestry, SEPA flood data, and Scotland environment maps. These new candidates close discovery gaps but remain `needs_probe` or `needs_license_review`, so BA receives them as review/probe candidates rather than operational source refs.
- `scotland-rural-comrie-croft`: old BA retained imagery evidence is imported. A focused 2026-06-03 web sweep added Comrie-specific source-family candidates for Perth & Kinross open data, Comrie flood records, Scotland LiDAR, habitat, and local ecosystem context. These remain `needs_probe`, `needs_license_review`, or `research_only`; research-only records are for advanced/API or VWiki-style context, not default operational BA GIS source refs.
- `scotland-coastal-tangleha-artists-collective`: old BA retained imagery evidence is imported. A focused 2026-06-03 web sweep added St Cyrus / Tangleha coastal candidates for NatureScot reserve context, NatureScot protected-area layers, SEPA coastal flood data, Aberdeenshire open data, coastal change adaptation material, and permaculture context. These remain `needs_probe`, `needs_license_review`, or `research_only`.
- `scotland-urban-edinburgh-mcdonald-place`: old BA retained imagery evidence is imported. A focused 2026-06-03 web sweep added Edinburgh candidates for the McDonald Place adopted-road record, city open data, Greenspace Scotland, SEPA flood data, Scotland environment maps, Scottish LiDAR, and city mobility/environment context. These remain `needs_probe`, `needs_license_review`, or `research_only`.
- `scotland-rural-perth-ph1-road-building-alignment`: old BA retained imagery evidence is imported. A focused 2026-06-03 web sweep added Perth PH1 candidates for Perth & Kinross open data, ArcGIS Hub/DCAT feeds, adopted core paths, Scotland Phase 2 LiDAR DTM, SEPA flood data, Scone surface-water context, PKC climate-risk GIS context, and wind-turbine planning open data. These remain `needs_probe`, `needs_license_review`, or `research_only`.
- `canada-rural-pemberton-bc`: old BA retained imagery evidence is imported. A focused 2026-06-03 web sweep added BC and regional candidates for LidarBC, the LidarBC Open LiDAR Data Index, BC topographic data, SLRD mapping, BC terrestrial ecosystem data, settlement planning context, and Agricultural Land Reserve context. These remain `needs_probe`, `needs_license_review`, or `research_only`.
- `canada-dryland-kamloops-rose-hill`: old BA retained imagery evidence is imported. A focused 2026-06-03 web sweep added priority BC interior candidates for LidarBC DSM/DEM, the BC Data Catalogue, BC terrestrial ecosystem data, Thompson flood hazards, City of Kamloops open data, TNRD geohazard/property context, soil/wildfire/watershed catalogue references, and dryland grassland ecosystem context. These remain `needs_probe`, `needs_license_review`, or `research_only`; exact Rose AOI public-safe live proof still requires a redacted evidence artifact, but the municipal Kamloops terrain source family itself is public/open.
- `canada-rural-alberta-parkland`: retained BA UP42 terrain evidence is imported as operator-local `live-proof`, with exact AOI details withheld. A focused 2026-06-03 web sweep added provincial candidates for Alberta wildfire GIS, soil/AGRASID, Agricultural Land Resource Atlas spatial data, Altalis products, ABMI airborne LiDAR, ABMI hydrological habitats, and ACIMS biodiversity data. These remain `needs_probe` or `needs_license_review`; exact Alberta AOI live proof still requires operator-local private-coordinate env vars.
- `germany-rural-bavaria-wegele`: old BA retained imagery evidence is imported. A focused 2026-06-03 web sweep added Bavaria/Germany candidates for DGM1 terrain, Bavaria OpenData, Geoportal Bayern services, LDBV WMS/WFS docs, FIS-Natur FIN-Web, BGR Geoportal, soil-estimate context, and landscape-planning source guidance. These remain `needs_probe`, `needs_license_review`, or `research_only`.
- `usa-vermont-rural-mad-river-valley`: old BA retained imagery evidence is imported. A focused 2026-06-03 web sweep added Vermont candidates for VCGI Open Geodata, lidar DEM metadata, ANR river/flood services, river corridors, NRCS/VCGI soils, ANR source directories, and Mad River stormwater context. These remain `needs_probe` or `research_only`.
- `usa-colorado-mountain-boulder-canyon`: old BA retained imagery evidence is imported. A focused 2026-06-03 web sweep added Boulder/USGS candidates for Boulder County GIS downloads, USGS National Map, USGS source families, flood history, wildfire history, and 3DEP coverage context. These remain `needs_probe` or `research_only`.
- `usa-florida-low-relief-coastal`: old BA retained imagery evidence is imported. A focused 2026-06-03 web sweep added Florida coastal candidates for FDEM lidar/elevation, Florida DEP GIS, NOAA Coastal Relief Model, USGS Florida coastal/offshore GIS, 3DEP Florida context, flood-loss model DEM context, and USGS National Map. These remain `needs_probe` or `research_only`.
- `usa-urban-san-francisco`: old BA retained imagery and retained western-USA UP42 candidate terrain evidence are imported. A focused 2026-06-03 web sweep added San Francisco candidates for DataSF, BCDC maps/data, USGS Bay topobathymetric DEM, SFEI lidar resources, bay habitat/eelgrass tools, SFGOV open data context, rising-tides GIS catalog context, and USGS National Map. These remain `needs_probe`, `needs_license_review`, or `research_only`.
- `middle-east-lebanon-mount-lebanon`: retained BA imagery and UP42 terrain evidence are imported as operator-local evidence, with exact AOI details withheld. A focused 2026-06-03 web sweep added Lebanon source candidates for CNRS/National Center for Remote Sensing, CNRS water resources and climate research, FAO vegetation/land-cover references, Copernicus DEM, Sentinel-2 Earth Search STAC, Geofabrik OSM, and SoilGrids. These remain `needs_probe`, `needs_license_review`, or `research_only`.
- All Europe, Canada, USA, Germany, and Lebanon golden eval sites are now cataloged with old retained BA evidence plus a focused 2026-06-03 source-family sweep. The catalog marks this with `sourceSweepState: focused_source_sweep_completed`. Candidate records remain review/probe packages unless separately promoted by AOI proof and license checks.

The route is `dry-run` VMesh packaging around retained BA `live-proof` refs. It does not copy raw BA licensed files, exact coordinates, exact private addresses, signed URLs, or provider order ids into VMesh.

### `ready_source_ref`

These are approved as BA source references, not proof that data was fetched for a specific AOI:

- `sentinel-2-l2a-earth-search`
- `openstreetmap-pbf-extracts`
- `overture-maps-geoparquet`
- `esa-worldcover`
- `hydrosheds-suite`
- `soilgrids`
- `usda-ssurgo-gssurgo`
- `dynamic-world`
- `annual-nlcd`
- `landfire`
- `nasa-power-solar-meteo`
- `open-meteo-forecast`
- `fields-of-the-world`

These should carry warnings such as `source_ref_only`, `requires_preprocessing`, `coverage_must_be_checked_per_aoi`, and `not_live_proof`.

### `configured_only`

- `sentinel-2-sen2sr-pmtiles` is future/configured-only until a public-safe package output URL exists.
- `mapbox-satellite-global` is token-gated and must not be returned as an operational open BA source.
- `era5-cds-reanalysis` requires account/credential handling and server-side preprocessing.
- `opentopography` requires API key handling and source-specific terms.

## Sources Not Ready For BA

Do not expose these as operational BA sources by default:

- Sidecar records with `needs_license_review`.
- Sidecar records with `needs_probe`.
- Sidecar records with `research_only`.
- Sidecar records with `noisy_candidate`.
- Planned campaigns such as `vmesh_markets`, `vmesh_properties_land`, and `vmesh_third_spaces`.
- Generic standards, docs, tutorials, StackExchange pages, GitHub wrappers, and PDFs unless they are returned as research/knowledge refs.
- Mapbox imagery as an open source.
- Parcel/address data that could expose exact private addresses, owner identity, or scraped listing data.

## Live Proof Inventory

Retained terrain artifacts prove:

- USA DTM source path: USGS 3DEP selected and rendered for public-safe city AOIs.
- USA DSM source path: USGS 3DEP LPC DSM selected and rendered for a public-safe city AOI.
- Canada DTM source path: HRDEM selected and rendered for public-safe city AOIs.
- Canada DSM source path: HRDEM DSM selected and rendered for a public-safe city AOI.
- BC DTM/DSM source paths: LidarBC selected and rendered for a public-safe Vancouver AOI.
- Fail-closed behavior: a BC interior strict 1m gap reports blocked/no-valid-pixel reasons instead of silently falling back.

Additional Canada source trace:

- Official upstream Canadian STAC root: `https://datacube.services.geo.ca/stac/api/`.
- Key Canadian terrain collections: `hrdem-mosaic-1m`, `hrdem-mosaic-2m`, and `hrdem-lidar`.
- Mapterhorn source-family clue: `cahrdem2`, Natural Resources Canada, listed by Mapterhorn as partial 2 m Canada DTM. This is not enough to claim Canada-wide 1 m terrain.
- Rose already has a strong retained source pack. The Mapterhorn/Canadian STAC work was a fallback and provenance test, not the original discovery of Rose source data. The Kamloops municipal terrain rail should now be treated as public/open; retained/private handling still applies to Airbus imagery, exact AOI disclosure, and old local artifacts.
- A redacted Rose fallback/provenance probe matched public source item families `2_4-mosaic-1m`, `2_4-mosaic-2m`, and `BC-Riverine_Floodplain_UTM10_2019-1m`. Promote this to repo-level `live_proof` only after a retained redacted evidence artifact is added without exact private coordinates or local paths.

Retained artifacts:

- `.artifacts/terrain-source-preview/source-preview-coordinate-probe-live-proof-latest.json`
- `.artifacts/terrain-source-preview/source-preview-route-live-proof-latest.json`
- `.artifacts/terrain-source-preview/source-preview-viewer-live-proof-latest.json`
- `.artifacts/terrain-source-preview/source-preview-probe-route-lidarbc-live-proof-latest.json`
- `.artifacts/terrain-source-preview/terrain-package-live-proof-latest.json`
- `.artifacts/terrain-source-preview/usa-canada-terrain-country-sample-live-proof-latest.json`

Retained non-terrain live proofs now cover ESA WorldCover, Overture buildings,
Overture roads and water, Open-Meteo current model context, and SoilGrids
modelled no-data behavior. Authoritative parcel/field data and regional
ecology/hydrology/soil upgrades remain explicit gaps until individually
promoted.

## Kamloops / Rose Gap Assessment

The repo has public-safe Kamloops/BC-interior evidence and an expected-gap coordinate proof, but exact Kamloops/Rose golden-site coordinates are not committed. Rose itself already has a strong retained source pack. A later Mapterhorn/Canadian STAC fallback test traced direct NRCan/Geo.ca source item families for the redacted Rose AOI, including HRDEM 1 m, HRDEM 2 m, and a LiDAR-derived 1 m project. The City of Kamloops municipal DEM Grid/LiDAR source family is public/open; a redacted retained artifact is still needed before the exact Rose pack can be promoted as repo-level `live_proof`. Until then, the public repo can only say:

- BC/LidarBC and HRDEM terrain paths are strong candidates for Kamloops/Rose.
- The public-safe BC interior sample shows strict 1m can fail closed when no valid pixels exist.
- Retained evidence indicates Rose has good source-pack data and should also be covered by direct municipal Kamloops and NRCan/Geo.ca HRDEM/LiDAR-derived DTM/DSM fallback/provenance source families, but BA should receive repo-level `live_proof_ready` for that exact site only after redacted retained evidence is attached.
- The source search must distinguish raw public point-cloud availability from processed LiDAR-derived DTM/DSM COG availability.

Setup gap:

- `kamloops_rose_redacted_retained_evidence_required_for_repo_live_proof`

Discovery-method correction:

- Do not conclude "no LiDAR" for an AOI until the national STAC/elevation catalog, provincial/state portal, and municipal/local portal have all been checked.
- National catalogs may expose processed LiDAR-derived DTM/DSM even when raw LAS/LAZ point clouds are not obvious from a municipal search.
- Municipal and regional portals still matter because they may hold higher-resolution orthophotos, local tree inventories, road layers, drainage, planning overlays, or raw point-cloud indexes not exposed through national source-family search.

## Alberta Gap Assessment

The repo has public-safe Calgary evidence for HRDEM strict 1m DTM and DSM source resolution. The current review can only say:

- Canada HRDEM is a strong Alberta DTM/DSM candidate.
- Alberta golden-site proof requires operator-local exact coordinate testing if the golden site is not public-safe.
- Alberta soils, parcels, hydrology, and climate records remain source-ref/probe-ready rather than live-proof.

Setup gap:

- `alberta_golden_private_coordinate_required_for_live_proof`

## License Access Review Queue

Prioritize review for:

- Sidecar `needs_license_review` records that currently appear in `sourcesReadyForBA`.
- Canada Lands parcel candidates before any BA land/property package use.
- Sidecar imagery/STAC candidates with unknown license and unclear endpoint type.
- Fields of The World license/ethical terms before food-system or field-boundary use.
- Mapbox imagery terms before any non-visual downstream use.
- FABDEM non-commercial license before any commercial BA use.

## Probe Queue

Probe in this order:

1. Public Kamloops municipal DEM Grid/LiDAR tile handoff plus exact redacted Rose DTM/DSM worker proof.
2. Exact operator-local Alberta DTM and DSM source coverage.
3. Sentinel-2 Earth Search AOI package response for Kamloops/Rose and Alberta.
4. OpenStreetMap or Overture roads/buildings/water extraction plan for both evaluation sites.
5. SoilGrids and SSURGO/Canadian provincial soil source refs for both evaluation sites.
6. HydroSHEDS and Canadian hydrometric/hydrology refs.
7. NASA POWER and Open-Meteo public-safe coordinate summaries.
8. Fields of The World source package review and ethical-use metadata.

## Rejected Or Quarantined Sources

Keep these out of operational BA packages:

- `noisy_candidate` sidecar records unless re-reviewed and promoted.
- `research_only` records unless returned in an explicit knowledge/research section.
- Records with unsupported content type, failed probe, ambiguous provider, or generic search/discussion origin.
- Raw scraped pages and large downloads.
- Any source carrying private coordinates, private addresses, raw PII, secrets, tokens, signed URLs, or local paths.

## Recommended BA Contract Changes

BA needs a stricter package than the current generic planner response.

Add a BA response shape with:

- `request`
- `h3Context`
- `stac`
- `sourceRecords`
- `fetchRecipes`
- `coverage`
- `liveProof`
- `warnings`
- `gaps`
- `provenance`

Default BA responses should expose only:

- `ready_source_ref`
- `adapter_ready`
- `viewer_ready`
- `live_proof_ready`

Everything else should appear as a warning/gap/review item unless an operator mode explicitly requests it.

## Next Implementation Prompt

Execute `prompt/queue/010-make-reviewed-geospatial-data-available-to-ba.md`.

Implementation should:

- Add typed BA package contracts.
- Map reviewed registry sources into BA source records.
- Include retained terrain live-proof refs.
- Tighten the Intel broker default so `needs_license_review` does not appear as operational BA-ready.
- Add tests proving review-only records are excluded by default.

## Evidence Bars

Code bar: docs-only review artifact generated from existing code and retained artifacts.

Live bar: selected terrain paths have retained live-proof artifacts; non-terrain live operation not proven.

Run class: `dry-run` review, with `live-proof` evidence cited only where retained artifacts exist.

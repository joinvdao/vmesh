# Testing

## Required Verification

Run the full V1 verification set before calling product work complete:

```bash
npm run format:check
npm run lint
npm test
npm run build
npm run macro:build -- --fixture
npm run macro:validate -- --fixture
npm run macro:ready
npm run visual:check
npm run agent-ready:check
npm run public-workflow:check
npm run privacy:check
npm audit --audit-level=moderate
```

For manual visual verification:

```bash
npm run dev
```

Then open `http://localhost:3000` and confirm the dashboard renders as a screenshot-like first viewport with no body scrolling, a visible draggable/rotating Three.js globe, a selected-cell affordance or enabled source overlay, footer telemetry, local user record flow, terrain/source status, hover tooltip, click selection, and no uncaught console errors. Right selected-hex, bottom data overview, source, terrain, imagery, and local-data panels may open on demand from the rail.

`npm run visual:check` performs the automated desktop smoke pass. It starts or reuses the local app, captures first-viewport and close-zoom screenshots in `.artifacts/visual/`, checks that the screenshot is not blank, opens Sources and Source Layers, verifies the package disclosure, searches London, and asserts the viewer is using the basemap-driven globe/search fly-to path without showing a blank map state.

## Test Layers

- Unit tests protect H3 tier mapping, U8 scoping/capping, parent/child helpers, basemap/terrain/imagery provider normalization, provider fallback ordering, macro cache/parsing helpers, Zustand state actions, hover, selection, layer toggles, terrain status, and user records.
- Open data funnel tests protect open map source optionality, map-ready versus preprocessing boundaries, climate source selection, climate H3 cache keys, and the rule that source-backed buildings/roads/climate grids are not scraped from public raster tiles or streamed into the browser.
- Ecosystem source broker tests protect source registry coverage, AOI/H3/place normalization, AOI-disclosure precision, open-data-first source selection, token/paid/license/API-key provider exclusion, STAC/provider-native ref planning, typed ecosystem record planning, optional PMTiles/H3/ledger artifact planning, cache-key stability, and the future MCP-style API descriptor.
- Intel Tools source broker tests protect the generated package shape, BA-ready segment/site filtering, research-only ecosystem records, and the rule that scraped evidence enters VMesh through review/promotion state rather than raw payload storage.
- BA package tests protect reviewed geospatial and ecosystem API output, fallback/source-truth separation, default exclusion of license/probe/research records, ecosystem display-mode gating, and VWiki handoff references for generic education or method material.
- Geospatial package security tests protect invalid H3 replacement, secret/credential URL redaction, consumer ID sanitization, JSON-only route handling, invalid AOI rejection, and security headers.
- Macro package tests protect manifest/schema alignment, fixture H3 summary import, provider-browser-fetch boundaries, production-promotion gates, and store/UI defaults for fixture package mode.
- Component behavior is currently covered through TypeScript, linting, build checks, and browser verification.
- Browser verification protects layout, map rendering, interaction wiring, and console health.
- Browser verification should include opening the source/provenance drawer and confirming it reports active providers, mock/live/future status, licenses, and limitations without adding body scroll.

## Deterministic Rules

- Mock geospatial data must be stable and versioned in code.
- Tests must not call paid providers or live production APIs.
- Fixture macro packages must be generated with `npm run macro:build -- --fixture`, validated with `npm run macro:validate -- --fixture`, and checked with `npm run macro:ready`.
- Analysis package promotion is paused in the visible product. Keep climate, hazard, weather, flood, fire, solar, wind, and sector-map outputs out of the user workflow until intentionally reintroduced.
- Date-sensitive behavior must use fixed dates or injected clocks.
- Generated local mesh data must be capped and deterministic.
- Remote geocoding/autocomplete is enabled by default unless `NEXT_PUBLIC_ENABLE_REMOTE_GEOCODING=false`; tests must cover coordinates, built-in partial matches, and remote-result normalization with fixtures rather than live calls.

## Provider Testing

Provider tests should cover:

- Basemap provider normalization and fallback order.
- Open map provider registry coverage for OSM, OpenFreeMap, Protomaps, Overture, OSM PBF, Natural Earth, OpenAddresses, and point-cloud sidecar references.
- `raster-dem-tilejson` normalization.
- `raster-dem-xyz` Terrarium normalization.
- `pmtiles-raster-dem` normalization for Mapterhorn PMTiles through the `pmtiles://` protocol.
- `source-raster-preview` normalization for official USA/Canada DTM source preview.
- Strict official 1 m DTM preview versus Best Official DTM Preview, including explicit 2 m Canada HRDEM headers that do not count as strict 1 m proof.
- Terrain source-preview request construction for USGS 3DEP DTM and Canada HRDEM DTM/DSM.
- Terrain source-preview probes that distinguish covered, blocked, unsupported, and transparent fallback states.
- Coordinate/search decision proof: with the app running, `npm run terrain:probe-live-proof` must prove selected public-safe strict 1 m DTM coverage, DSM source availability/coverage, and a Canada fail-closed DTM gap through retained JSON in `.artifacts/terrain-source-preview/source-preview-coordinate-probe-live-proof-latest.json`.
- Worker-side USGS 3DEP render proof that checks the 1 m product index, then the official Source DEM index, before emitting a retained DTM tile and blocks USA DSM display on the DTM route.
- Worker-side USGS LPC DSM source probe that checks the official 3DEP Lidar Point Cloud index layers, accepts `Meets` and `Meets with variance` 1 m-class sources, and retains source-availability evidence with `renderedArtifact: null`.
- API probe behavior for USA DSM LPC source availability: qualifying LPC responses return `status=source-available`, `providerId=usgs-3dep-lpc-dsm`, and a `source-auto/dsm/{z}/{x}/{y}` tile template, while display proof remains the responsibility of the bounded point-cloud tile worker.
- USGS LPC asset manifest generation that enumerates LAZ/LAS links from `0_file_download_links.txt`, records sampled asset sizes when available, and reports PDAL/laspy derivation readiness without emitting a DSM tile.
- Worker-side Canada HRDEM and LidarBC COG/GeoTIFF probes plus PNG tile renders that distinguish valid 1 m DTM/DSM pixels from broad catalog items, 2 m-only hits, and no-data at the requested coordinate or tile. LidarBC DTM must check both DEM index layers because some BC interior 1 m DEMs appear only in the 1:20,000 layer.
- Terrain source proof bridge behavior: covered USGS 3DEP DTM, USGS LPC DSM, Canada HRDEM DTM/DSM, and LidarBC DTM/DSM proofs with retained artifacts can produce worker manifests only when source id, role, resolution, retained evidence, and AOI coordinate/tile evidence match. 2 m/no-data proofs fail closed for the strict 1 m branch, explicit 2 m HRDEM can promote only through `canada-hrdem-best-dtm`, secret-bearing refs are rejected, LidarBC worker-side raster refs are exposed through the worker-rendered source-preview tile route rather than treated as direct browser XYZ upstreams, and USA DSM display requires the USGS LPC point-cloud worker to derive retained raster artifacts.
- North America DTM package source resolution: `createLiveNorthAmericaDtmSourceAdapterPlan` must try live official sources in order, block USGS when the 1 m product index does not cover an ambiguous border AOI, then continue to Canada HRDEM/LidarBC instead of selecting Mapterhorn or a wrong country source.
- North America DSM package source resolution: `createLiveNorthAmericaDsmSourceAdapterPlan` must try live official sources in order, prefer LidarBC DSM in BC, use the USGS LPC source index for USA DSM, block non-qualifying USGS LPC hits around ambiguous border AOIs, then continue to Canada HRDEM DSM instead of selecting Mapterhorn, DTM, or generic DEM sources.
- Runtime terrain provider selection and overlay toggling in Zustand.
- Future/provider placeholder handling for API DEM, dataset DEM, and STAC catalog sources.
- Fallback order from env provider to Mapterhorn, Mapzen/Joerd, and the no-token demo provider.
- License-gated and preprocessing-required statuses.
- Contour provider status/config, including placeholder versus precomputed contour PMTiles.
- Deferred analysis provider scaffolding must remain hidden from the current user workflow unless the product scope is updated.
- Sentinel STAC query construction, scene cloud metadata gates, AOI SCL clear-pixel ratio, imagery provider normalization, Mapbox disabled-without-token behavior, H3 coverage from bounds, and tile manifest validation.
- Sentinel/SEN2SR plan generation for the `10 m` to `2.5 m` SEN2SRLite RGBN sidecar path, including cache keys and `imagery-inferred-context` truth status.
- Agricultural field-boundary provider fixtures: FTW-style PMTiles/GeoParquet/Zarr manifest validation, H3 field-count/field-size summaries, and the rule that predicted field polygons are not legal parcels or ownership records.
- Annotation fixture tests: Labelme-style JSON/mask/shape fixture conversion, oriented rectangle geometry handling, provenance/review-state requirements, and privacy checks that block raw private imagery or EXIF-bearing assets.
- Source/provenance drawer inputs: active provider IDs, selected H3 provenance, imagery manifest, and micro mock/source counts.
- Source layer catalog coverage across terrain, vegetation, and imagery in the visible workflow.
- Source broker reports: selected open defaults, candidate counts, rejected-source reasons, package manifest validity, and terrain source-role boundaries.
- Intel Tools exporter dry-runs: `python scripts/export-intel-sidecar-source-broker.py` should write `.artifacts/source-broker/intel-sidecar-source-broker-package.json` with `runClass=dry-run`, segmented `sourcesReadyForBA`, all ecosystem source groups represented through `ecosystemSourceRecords`, Kamloops/Rose and Alberta evaluation-site labels, review queues, and no local paths or exact private coordinates.
- Geospatial package plans: selected provider per requested layer, rejected-source probes, planned PMTiles/vector/raster/COG/GeoParquet/H3 artifacts, no secret-bearing URLs, and clean downstream app manifest fields.
- Browser evidence for public-safe USA/Canada AOIs when source-preview ingestion is changed: selected provider, active viewer mode, source-preview resource requests, tile response headers, and retained worker PNGs. With the app running, `npm run terrain:viewer-live-proof` must drive the vmesh store through public-safe DTM and DSM fly-to workflows, wait for the real probe/tile-readiness path to mark terrain active, retain source-preview PNGs in `.artifacts/terrain-source-preview/viewer-live-proof/`, and write `.artifacts/terrain-source-preview/source-preview-viewer-live-proof-latest.json`. This is source-to-viewer proof for selected AOIs, not a country-wide 1 m coverage claim.
- Country/sample source coverage evidence: with the app running, `npm run terrain:country-sample-live-proof` must probe a public-safe USA/Canada coordinate sample for strict 1 m-class DTM first and DSM separately, where 1 m-class means 1 m or better, render bounded DTM display tiles for covered samples within the configured budget, retain PNGs in `.artifacts/terrain-source-preview/country-sample-live-proof/`, and write `.artifacts/terrain-source-preview/usa-canada-terrain-country-sample-live-proof-latest.json`. The report must keep `universalUsaCanadaOneMeterDtmProven=false` unless every sampled DTM coordinate is both covered and displayed at 1 m-class, and even then it is sample evidence rather than a country-wide proof.
- API route live proof for source-preview tiles: with the app running, `npm run terrain:route-live-proof` must prove `/api/terrain/source-preview/source-auto/dtm/13/2373/2933` returns Canada HRDEM DTM with `x-vmesh-terrain-resolution-meters=1` and `x-vmesh-terrain-render-mode=worker-geotiff`, `/api/terrain/source-preview/source-auto/dsm/13/2373/2933` returns Canada HRDEM DSM with `x-vmesh-terrain-resolution-meters=1` and `x-vmesh-terrain-render-mode=worker-geotiff`, `/api/terrain/source-preview/source-auto/dtm/13/1706/3109` returns USGS 3DEP DTM with `x-vmesh-terrain-resolution-meters=1` and `x-vmesh-terrain-render-mode=worker-geotiff`, `/api/terrain/source-preview/source-auto/dsm/15/6826/12436` returns USGS LPC DSM with `x-vmesh-terrain-render-mode=worker-point-cloud`, and covered BC public-safe tiles such as `/api/terrain/source-preview/source-auto/dtm/16/10354/22427?refresh=1` return LidarBC worker-rendered PNGs. Retain the route proof JSON in `.artifacts/terrain-source-preview/source-preview-route-live-proof-latest.json` and PNGs in `.artifacts/terrain-source-preview/route-live-proof/`. This route proof does not convert Canada partial 2 m national coverage into a country-wide 1 m claim.
- USGS LPC DSM source proof: `npm run terrain:usgs-lpc-dsm-probe -- --lat 39.74 --lon -104.99 --label "Denver public-safe USGS LPC DSM source probe" --output .artifacts/terrain-source-preview/usa-denver-usgs-lpc-dsm-source-probe.json` should produce `runClass=live-proof`, `status=source-available`, `groundModelRole=surface-dsm`, and `renderedArtifact=null`.
- USGS LPC DSM asset manifest proof: `npm run terrain:usgs-lpc-asset-manifest -- --lat 39.74 --lon -104.99 --label "Denver public-safe USGS LPC DSM asset manifest" --output .artifacts/terrain-source-preview/usa-denver-usgs-lpc-dsm-asset-manifest.json --sample-assets 10 --head-sample-size 5` should produce `runClass=live-proof`, `status=assets-enumerated`, a positive `assetManifest.assetCount`, and `renderedArtifact=null`.
- USGS LPC DSM render proof: `npm run terrain:usgs-lpc-dsm-render -- --tile-z 15 --tile-x 6826 --tile-y 12436 --label "Denver public-safe USGS LPC DSM render proof" --output .artifacts/terrain-source-preview/usa-denver-usgs-lpc-dsm-render.json --render-output .artifacts/terrain-source-preview/usa-denver-usgs-lpc-dsm-render.png --geotiff-output .artifacts/terrain-source-preview/usa-denver-usgs-lpc-dsm-render.tif --max-assets 6 --download-budget-mb 512` should produce `runClass=live-proof`, `status=covered`, `groundModelRole=surface-dsm`, positive `qa.pointsInsideRequestedTile`, positive `qa.validPixels`, and retained PNG/GeoTIFF artifacts. If point-cloud packages are unavailable, the result must fail closed and report derivation readiness rather than pretending DSM display works.
- Terrain package proof bridge live proof: `npm run terrain:package-live-proof` should promote retained source-preview worker reports into package worker manifests for selected public-safe USGS 3DEP DTM, USGS LPC DSM, Canada HRDEM DTM/DSM, and LidarBC DTM/DSM checks, keep the known Canada gap blocked, and write `.artifacts/terrain-source-preview/terrain-package-live-proof-latest.json`. This is package contract evidence for selected AOIs, not universal USA/Canada 1 m coverage.
- Food-network and property mock records with privacy-safe fields.
- Hub playbook reducer actions and mock gateway status.

## When Tests Must Change

Update tests when state shape, H3 data contracts, chart semantics, renderer events, privacy rules, or provider fallbacks change.

## CI Expectations

CI must run install, lint, tests, agent-ready checks, public-workflow checks, privacy checks, audit, and build. Scheduled maintenance may open cleanup PRs but must not push directly to `main`.

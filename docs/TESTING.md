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

Then open `http://localhost:3000` and confirm the dashboard renders as a screenshot-like first viewport with no body scrolling, a visible globe, a selected-cell H3 affordance or enabled analytical mesh overlay, footer telemetry, local user record flow, terrain/source status, hover tooltip, click selection, and no uncaught console errors. Right selected-hex, bottom analytics, macro, source, terrain, imagery, and local-data panels may open on demand from the rail.

`npm run visual:check` performs the automated desktop smoke pass. It starts or reuses the local app, captures first-viewport and close-zoom screenshots in `.artifacts/visual/`, checks that the screenshot is not blank, opens Sources and Macro Layers, verifies the fixture package disclosure, searches London, and asserts the viewer has switched from `Decorative globe texture` to `Source-backed map output`.

## Test Layers

- Unit tests protect H3 tier mapping, U8 scoping/capping, parent/child helpers, scoring labels, color interpolation, basemap/terrain/imagery provider normalization, provider fallback ordering, macro cache/parsing/scoring helpers, Zustand state actions, hover, selection, layer toggles, terrain status, and user records.
- Open data funnel tests protect open map source optionality, map-ready versus preprocessing boundaries, climate source selection, climate H3 cache keys, and the rule that source-backed buildings/roads/climate grids are not scraped from public raster tiles or streamed into the browser.
- Geospatial package service tests protect source registry coverage, AOI normalization, AOI-disclosure precision, open-data-first source selection, token/paid/license/API-key provider exclusion, PMTiles/H3 artifact planning, cache-key stability, and the future MCP-style API descriptor.
- Geospatial package security tests protect invalid H3 replacement, secret/credential URL redaction, consumer ID sanitization, JSON-only route handling, invalid AOI rejection, and security headers.
- Macro package tests protect manifest/schema alignment, fixture H3 summary import, provider-browser-fetch boundaries, production-promotion gates, and store/UI defaults for fixture package mode.
- Component behavior is currently covered through TypeScript, linting, build checks, and browser verification.
- Browser verification protects layout, map rendering, interaction wiring, and console health.
- Browser verification should include opening the source/provenance drawer and confirming it reports active providers, mock/live/future status, licenses, confidence, and limitations without adding body scroll.

## Deterministic Rules

- Mock geospatial data must be stable and versioned in code.
- Tests must not call paid providers or live production APIs.
- Fixture macro packages must be generated with `npm run macro:build -- --fixture`, validated with `npm run macro:validate -- --fixture`, and checked with `npm run macro:ready`.
- Production macro packages must pass `npm run macro:ready -- --profile production-core ...` before being used for core weather/rainfall/climate/flood/fire/solar data, and `production-full-atlas` before being presented as complete terrain/vegetation/imagery macro coverage.
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
- Runtime terrain provider selection and overlay toggling in Zustand.
- Future/provider placeholder handling for API DEM, dataset DEM, and STAC catalog sources.
- Fallback order from env provider to Mapterhorn, Mapzen/Joerd, and the no-token demo provider.
- License-gated and preprocessing-required statuses.
- Contour provider status/config, including placeholder versus precomputed contour PMTiles.
- Macro provider registry, Open-Meteo fixture parsing, cache keys, provenance, weather, flood, fire, climate trend, and solar scoring helpers.
- Climate data source registry and H3 cache boundaries for Open-Meteo, NASA POWER, NOAA GFS, ERA5/CDS, NASA FIRMS, terrain-derived flood, and H3 weather graph model paths.
- Solar access helpers: sun-path calculation boundaries, slope/aspect inputs, terrain-horizon shading provenance, obstruction-source confidence caps, and clear distinction between planning context and PV engineering output.
- Wind rose helpers: direction/speed binning, calm threshold handling, height/period metadata, forecast versus climate-normal labeling, and deterministic fixture summaries.
- Climate sector map helpers: sector angle normalization, seasonality labels, source/confidence requirements, user-observed versus provider-derived status, and no automated recommendation claims.
- Sentinel STAC query construction, scene cloud metadata gates, AOI SCL clear-pixel ratio, imagery provider normalization, Mapbox disabled-without-token behavior, H3 coverage from bounds, and tile manifest validation.
- Sentinel/SEN2SR plan generation for the `10 m` to `2.5 m` SEN2SRLite RGBN sidecar path, including cache keys and `imagery-inferred-context` truth status.
- Agricultural field-boundary provider fixtures: FTW-style PMTiles/GeoParquet/Zarr manifest validation, H3 field-count/field-size summaries, and the rule that predicted field polygons are not legal parcels or ownership records.
- Annotation fixture tests: Labelme-style JSON/mask/shape fixture conversion, oriented rectangle geometry handling, provenance/review-state requirements, and privacy checks that block raw private imagery or EXIF-bearing assets.
- Source/provenance drawer inputs: active provider IDs, selected H3 provenance, macro provenance, imagery manifest, and micro mock/source counts.
- Macro layer catalog coverage across terrain, climate, hazard, solar, vegetation, and imagery.
- Source broker reports: selected open defaults, candidate counts, rejected-source reasons, package manifest validity, and terrain role confidence caps.
- Geospatial package plans: selected provider per requested layer, rejected-source probes, planned PMTiles/vector/raster/COG/GeoParquet/H3 artifacts, no secret-bearing URLs, and clean downstream app manifest fields.
- Food-network and property mock records with privacy-safe fields.
- Hub playbook reducer actions and mock gateway status.

## When Tests Must Change

Update tests when state shape, H3 data contracts, chart semantics, renderer events, privacy rules, or provider fallbacks change.

## CI Expectations

CI must run install, lint, tests, agent-ready checks, public-workflow checks, privacy checks, audit, and build. Scheduled maintenance may open cleanup PRs but must not push directly to `main`.

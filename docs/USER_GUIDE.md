# User Guide

## Current State

V1 ships a local dashboard for exploring the vmesh source atlas with mock/prepopulated H3 data, source package fixtures, and local/private user-added records.

## First Journey

1. Open `http://localhost:3000`.
2. Spin the globe with the mouse, or let the idle globe gently rotate.
3. Use the mouse wheel over the globe to zoom. Scrolling in transitions from orbit mode to source-backed MapLibre map output for local inspection.
4. Use the sun/moon control in the header to switch between dark and light globe modes. Use the backdrop control beside it to cycle the stage background between blank, grid, and stars.
5. Search for coordinates such as `51.5072, -0.1276`, a built-in offline place, or a partial global place name. Autocomplete shows coordinate, built-in, and no-key OpenStreetMap/Nominatim matches when remote geocoding is enabled.
6. Coordinate and close-place search rotates the globe toward the target, then transitions into source-backed map output with satellite-style imagery enabled and an OpenStreetMap reference overlay for roads and streets.
7. The far view uses a real Three.js Earth sphere with atmosphere, clouds, lighting, drag inertia, and dark/light globe modes. Search results rotate the globe toward the target, then transition into source-backed MapLibre map output when the camera reaches local inspection scale.
8. Turn mesh, source, imagery, or terrain panels on only when you need more context.
9. Select a cell to inspect its data package, local assets, and provenance.
10. Review source layers, micro summaries, user-added record counts, and the bottom data overview.
11. Add a draft local record in the user data panel. The record remains private-local and mock-only.

## Terrain And Source Status

The footer reports terrain and provider status. V1 uses an env-configured raster-dem provider when available, otherwise it can fall back through visual terrain providers such as Mapterhorn PMTiles, Mapzen/Joerd Terrarium tiles, and a no-token demo terrain provider. Those visual fallbacks are not terrain worker sources.

For searched USA and Canada coordinates, vmesh can switch into `Official DTM Source Preview`. This pulls a source-backed hillshade/terrain raster preview through `/api/terrain/source-preview/source-auto/dtm/{z}/{x}/{y}` after probing coverage. The USA route uses the USGS 3DEP worker after 1 m product-index proof; it currently renders from the official 3DEPElevation ImageServer and retains route evidence. The Canada route must resolve direct official HRDEM/provincial sources and may claim 1 m only where the source COG/archive proves 1 m pixels for the requested tile; Mapterhorn's Canada catalog source is not enough for a country-wide 1 m claim. Canada display tiles are rendered by the worker from selected HRDEM COGs, and 2 m HRDEM is allowed only on the explicit `Best Official DTM Preview` path. `Best Official DTM Preview` uses `/api/terrain/source-preview/source-auto-best/dtm/{z}/{x}/{y}` and may display explicit 2 m HRDEM in Canada when that is the best official source. This is not a generated terrain package, contour package, terrain RGB, or terrain slab; it is the first viewer proof that the expected source family is being requested and displayed.

DSM is separate from DTM. Canada DSM can be inspected only where an HRDEM or LidarBC DSM source-preview route proves coverage. USA DSM is routed through the official USGS 3DEP Lidar Point Cloud index and the bounded point-cloud worker, which derives a `surface-dsm` preview tile from retained LAZ/LAS evidence where coverage exists. The UI must not relabel Mapterhorn, Mapzen/Joerd, or the demo provider as USGS, HRDEM, LidarBC, DTM, or DSM source truth.

The footer also reports basemap, terrain, and imagery status. Basemap selection is separate from terrain. The default public app uses a token-free open basemap path; custom MapLibre styles and Protomaps PMTiles can be configured by environment.

## Visual Treatment And Data Modes

The distant globe is an interactive atlas shell. The Earth surface uses a locally bundled NASA Blue Marble raster with procedural fallback and visual lighting, while MapLibre remains the source-backed engine for close basemap, terrain, labels, imagery, and H3 overlays. Globe cloud treatment, rim lighting, and visual lattice cues are decorative context only.

Source-backed output starts with the close MapLibre view, selected H3 context, terrain provider, explicit imagery layers, and package-backed source summaries. When imagery is enabled, vmesh can place a low-opacity OpenStreetMap raster reference overlay above the satellite-style layer so roads and streets remain legible. Climate, hazard, solar, fire, flood, and other analysis outputs are deferred in the visible app.

App-generated analysis outputs are deferred. The visible app is focused on aggregating, displaying, and explaining source-backed geospatial data.

Open the Sources drawer to see the visual-treatment split, package id, package version, source mode, license, and limitations. Open Source Layers to inspect terrain, vegetation, and imagery overlays.

## Expected Boundaries

The MVP uses mock/prepopulated sample data and local/mock user-added data. It should not be treated as operational risk intelligence, property advice, terrain authority, or an authoritative public dataset.

## Accessibility And Device Notes

The dashboard prioritizes desktop and large tablet workflows first. Keyboard navigation, visible focus states, text contrast, source labels, and non-map summaries are required before calling a production release complete.

# Milestone Preview

The first viewport remains the vmesh geospatial cockpit: left navigation, top search, central globe/map, selected-hex panel, bottom data overview strip, and footer telemetry.

Dark globe mode is better for dense overlays and night-map reading. Light globe mode is better for clean environmental/context inspection. The toggle changes only the visual globe treatment; it does not change basemap, terrain, imagery, or selected H3 state.

Use the map controls to toggle source overlays, micro/local records, and terrain visibility. Use U3/U5/U8 to move between coarse, regional, and local detail; U8 detail is generated only inside the selected U5 area.

Use the Source Layers rail button to inspect source availability overlays. Climate, hazard, solar, wind, sector, and weather analysis layers are intentionally absent from the current user workflow.

The Source Layers panel currently exposes terrain, vegetation, and imagery groups only. Analysis-oriented layer groups can be reintroduced later when their UX and evidence standard are settled.

Use the Imagery rail button to open Sentinel/SEN2SR imagery controls. Imagery is off by default and never replaces the operational basemap. The current UI can display a manifest-backed Sentinel preview layer and selected-hex imagery provenance. SEN2SR processing is offline/server work, not browser inference.

Use the Sources rail button to inspect what data is active, what is mock, what is future-provider plumbing, what license or attribution applies, and what limitations should be kept in mind. This drawer is read-only in V1 and is intended to keep the globe uncluttered while still making provenance easy to audit.

The Sources drawer also shows the ecosystem source-broker contract. This is the atlas manifest shape for STAC-style spatial discovery plus typed ecosystem records, including future optional `terrain.json`, `imagery.json`, `landcover.json`, `environment.json`, `soils.json`, `hydrology.json`, `biodiversity.json`, `local-assets.json`, `contours.json`, `h3-summary.json`, and `provenance-manifest.json` payloads. It explains what is map-ready, which provider-native refs are available, what needs downstream preprocessing, and what was skipped or gated.

## Downstream Ecosystem Brokering

Apps can ask vmesh for source-honest ecosystem data availability without knowing provider-specific details. The first API surface is:

- `GET /api/geospatial-package/sources`
- `GET /api/geospatial-package/sources?layer=terrain`
- `GET /api/geospatial-package/plan`
- `POST /api/geospatial-package/plan`

The current route names still say `geospatial-package`, but the default consumer contract is broker-first: return selected sources, rejected sources, provider-native refs, provenance, warnings, and next actions in STAC-compatible spatial records plus typed ecosystem records. They do not download heavy data, store provider payloads by default, or call paid providers. A downstream app such as BA can fetch/process/store the returned refs in its own GIS/ecosystem worker. Optional local/server vmesh workers may turn refs into PMTiles, vector tiles, raster tiles, COGs, GeoParquet extracts, H3 summaries, ecosystem ledgers, and app-ready manifests only when that mode is explicitly enabled.

The selected hex panel now summarizes local food-network mock assets and privacy-safe property signals. These are mock/provider-boundary records and do not include scraped listings or exact private addresses.

The Build A Hub panel lets you mark water, food, power, comms, access, shelter/tools, and governance tasks for the selected H3 cell. Disaster Mode shows mock Reticulum, Meshtastic bridge, and local LLM statuses. The browser app is designed to talk to a local gateway service; it does not transmit to radio hardware directly.

Footer telemetry shows terrain provider/status, contour status, mesh tier, visible hex count, and data freshness. Visual terrain providers can keep the map nonblank, but straight-to-source terrain worker outputs must come from official upstream providers rather than rendered Mapterhorn/Mapzen tiles. Terrain remains switchable after search zooms, so a user can inspect a place as either source-backed basemap context or DEM/hillshade relief. For the strict USA/Canada source-preview provider, Canada tiles render only where the source route can prove a role-specific official 1 m HRDEM/provincial source; 2 m-only or blank tiles should appear unavailable rather than silently falling back. Best Official DTM Preview is allowed to show 2 m Canada HRDEM, but the UI must label that resolution honestly.

Mapbox Satellite is disabled unless a deployment configures a restricted public token or the server-side proxy. It can be used as an optional base globe or global ortho-style imagery layer, never as the public no-token default. Mapbox and super-resolution imagery are not legal, survey, emergency, or property-boundary evidence.

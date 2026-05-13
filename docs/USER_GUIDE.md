# User Guide

## Current State

V1 ships a local dashboard for exploring the vmesh antifragility atlas with mock/prepopulated H3 data, a fixture macro package, and local/private user-added records.

## First Journey

1. Open `http://localhost:3000`.
2. Spin the globe with the mouse, or let the idle globe gently rotate.
3. Use the sun/moon control in the header to switch between dark and light globe modes.
4. Search for coordinates such as `51.5072, -0.1276`, a built-in offline place, or a partial global place name. Autocomplete shows coordinate, built-in, and no-key OpenStreetMap/Nominatim matches when remote geocoding is enabled.
5. When the camera is close enough, the viewer switches from `Orbit Globe` / `Decorative globe texture` to `OSS Map Output` / `Source-backed map output` so the open MapLibre/OSM map is easier to inspect.
6. Turn mesh, macro, imagery, or source panels on only when you need analytical context.
7. Select a cell to inspect its antifragility profile, local assets, risks, provenance, and confidence.
8. Review macro pillars, micro summaries, user-added record counts, and bottom analytics.
9. Add a draft local record in the user data panel. The record remains private-local and mock-only.

## Terrain And Source Status

The footer reports terrain and provider status. V1 uses an env-configured raster-dem provider when available, otherwise it falls back to a no-token demo terrain provider. Future providers such as Mapterhorn PMTiles, Mapzen/Joerd Terrarium tiles, CUDEM, FABDEM, OpenTopography, and STAC catalogs are modeled in code but are not live ingestion sources.

The footer also reports basemap, macro, and imagery status. Basemap selection is separate from terrain. The default public app uses a token-free open basemap path; custom MapLibre styles and Protomaps PMTiles can be configured by environment.

## Visual Treatment And Data Modes

The distant globe is an interactive atlas shell. Land tint, cloud treatment, rim lighting, and visual lattice cues are decorative context and are labeled `Decorative globe texture`.

Source-backed output starts with the close MapLibre view, selected H3 summaries, terrain provider, explicit imagery layers, and package-backed macro summaries. The default macro data mode is `Fixture package`, which means the H3 summaries were generated deterministically for UI and pipeline validation. It is not live climate, hazard, solar, fire, flood, or emergency intelligence.

Open the Sources drawer to see the visual-treatment split, package id, package version, source mode, license, confidence, and limitations. Open Macro Layers to see which layers are live-capable, fixture-backed, mock fallback, or future-provider.

## Expected Boundaries

The MVP uses mock/prepopulated sample data and local/mock user-added data. It should not be treated as operational risk intelligence, property advice, terrain authority, or an authoritative public dataset.

## Accessibility And Device Notes

The dashboard prioritizes desktop and large tablet workflows first. Keyboard navigation, visible focus states, text contrast, source labels, and non-map summaries are required before calling a production release complete.

# Milestone Preview

The first viewport remains the vmesh geospatial cockpit: left navigation, top search, central globe/map, selected-hex panel, bottom analytics strip, and footer telemetry.

Dark globe mode is better for dense overlays and night-map reading. Light globe mode is better for clean environmental/context inspection. The toggle changes only the visual globe treatment; it does not change basemap, terrain, imagery, macro provider, or selected H3 state.

Use the map controls to toggle macro, micro, and terrain visibility. Use U3/U5/U8 to move between macro, regional, and local detail; U8 detail is generated only inside the selected U5 area.

Use the Macro Layers rail button to open weather, flood, fire, solar, wind, sector, and climate trend overlays. Weather can attempt a no-secret Open-Meteo selected-centroid fetch; if that fails, the UI keeps deterministic mock data and marks the layer as fallback. Flood, fire, solar, wind, sector, and climate trend remain decision-support/provider-boundary scaffolds unless a deployment adds reviewed data.

The Macro Atlas modal now groups layers by Terrain, Climate, Hazard, Solar, Vegetation, and Imagery. Some layers are map-ready today, some render as subtle H3 summaries, and some are honest preprocessing placeholders. Badges show whether a layer is live, static, derived, mock, fallback, or future-provider backed.

Solar potential should be read as practical planning context. Future views may show sun path, slope/aspect, terrain-horizon shading, cloud/irradiance context, and optional building/canopy obstruction shading when source-backed data exists. Terrain-only shading is not rooftop/building shading. Solar summaries are not bankable PV engineering estimates.

Wind roses should show which directions wind commonly arrives from, grouped by speed bins and time period. Forecast roses, station/observed roses, and ERA5/reanalysis climate-normal roses should be labeled differently.

Climate sector maps are permaculture-style design intelligence overlays. They can show sun, wind, cold/frost, rain/stormwater, flood/drainage, fire approach, access/noise/pollution, and wildlife/corridor sectors around a selected place. They are inspectable and editable context, not automatic design prescriptions.

Use the Imagery rail button to open Sentinel/SEN2SR imagery controls. Imagery is off by default and never replaces the operational basemap. The current UI can display a manifest-backed Sentinel preview layer and selected-hex imagery provenance. SEN2SR processing is offline/server work, not browser inference.

Use the Sources rail button to inspect what data is active, what is mock, what is future-provider plumbing, what license or attribution applies, and what limitations should be kept in mind. This drawer is read-only in V1 and is intended to keep the globe uncluttered while still making provenance easy to audit.

The Sources drawer also shows the source-broker package contract. This is the atlas manifest shape for future `terrain.json`, `imagery.json`, `landcover.json`, `environment.json`, `contours.json`, `h3-summary.json`, and `provenance-manifest.json` payloads. It explains what is map-ready, what needs preprocessing, and what was skipped or gated.

## Downstream App Package Planning

Apps can ask vmesh for source-honest package plans without knowing provider-specific details. The first API surface is:

- `GET /api/geospatial-package/sources`
- `GET /api/geospatial-package/sources?layer=terrain`
- `GET /api/geospatial-package/plan`
- `POST /api/geospatial-package/plan`

Package plans return selected sources, rejected sources, planned artifact kinds, cache keys, provenance, warnings, and next actions. They do not download heavy data or call paid providers. A local/server worker should turn the plan into PMTiles, vector tiles, raster tiles, COGs, GeoParquet extracts, H3 summaries, and app-ready manifests.

The selected hex panel now summarizes local food-network mock assets and privacy-safe property signals. These are mock/provider-boundary records and do not include scraped listings or exact private addresses.

The Build A Hub panel lets you mark water, food, power, comms, access, shelter/tools, and governance tasks for the selected H3 cell. Disaster Mode shows mock Reticulum, Meshtastic bridge, and local LLM statuses. The browser app is designed to talk to a local gateway service; it does not transmit to radio hardware directly.

Footer telemetry shows terrain provider/status, contour status, mesh tier, visible hex count, and data freshness. Mapterhorn PMTiles is the primary terrain path, Mapzen/Joerd Terrarium is the no-token fallback, and contours require preprocessing before production vector tiles are available. Terrain remains switchable after search zooms, so a user can inspect a place as either source-backed basemap context or DEM/hillshade relief.

Mapbox satellite is disabled unless a deployment configures `NEXT_PUBLIC_MAPBOX_TOKEN`. Super-resolution imagery is not legal, survey, emergency, or property-boundary evidence.

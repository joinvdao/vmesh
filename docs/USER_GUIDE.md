# User Guide

## Current State

V1 ships a local dashboard for exploring the vmesh antifragility atlas with mock/prepopulated H3 data and local/private user-added records.

## First Journey

1. Open `http://localhost:3000`.
2. Inspect the globe and H3 mesh overlay.
3. Use the U3/U5/U8 tier controls in the header to change mesh scale.
4. Hover H3 cells for immediate context.
5. Select a cell to inspect its antifragility profile, local assets, risks, provenance, and confidence.
6. Review macro pillars, micro summaries, user-added record counts, and bottom analytics.
7. Add a draft local record in the user data panel. The record remains private-local and mock-only.

## Terrain And Source Status

The footer reports terrain and provider status. V1 uses an env-configured raster-dem provider when available, otherwise it falls back to a no-token demo terrain provider. Future providers such as Mapterhorn PMTiles, Mapzen/Joerd Terrarium tiles, CUDEM, FABDEM, OpenTopography, and STAC catalogs are modeled in code but are not live ingestion sources.

## Expected Boundaries

The MVP uses mock/prepopulated sample data and local/mock user-added data. It should not be treated as operational risk intelligence, property advice, terrain authority, or an authoritative public dataset.

## Accessibility And Device Notes

The dashboard prioritizes desktop and large tablet workflows first. Keyboard navigation, visible focus states, text contrast, source labels, and non-map summaries are required before calling a production release complete.

# Milestone Preview

The first viewport remains the vmesh geospatial cockpit: left navigation, top search, central globe/map, selected-hex panel, bottom analytics strip, and footer telemetry.

Use the map controls to toggle macro, micro, and terrain visibility. Use U3/U5/U8 to move between macro, regional, and local detail; U8 detail is generated only inside the selected U5 area.

The selected hex panel now summarizes local food-network mock assets and privacy-safe property signals. These are mock/provider-boundary records and do not include scraped listings or exact private addresses.

The Build A Hub panel lets you mark water, food, power, comms, access, shelter/tools, and governance tasks for the selected H3 cell. Disaster Mode shows mock Reticulum, Meshtastic bridge, and local LLM statuses. The browser app is designed to talk to a local gateway service; it does not transmit to radio hardware directly.

Footer telemetry shows terrain provider/status, contour status, mesh tier, visible hex count, and data freshness. Mapterhorn PMTiles is the primary terrain path, Mapzen/Joerd Terrarium is the no-token fallback, and contours require preprocessing before production vector tiles are available.

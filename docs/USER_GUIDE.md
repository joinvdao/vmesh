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

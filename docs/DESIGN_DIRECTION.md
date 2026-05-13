# Design Direction

## Reference

The attached dashboard reference defines the first visual target for `vmesh`.

This is not a request to copy labels or product identity directly. It establishes layout density, interaction hierarchy, panel treatment, and the geospatial cockpit feel.

## Overall Feel

vmesh should feel like a precise, calm atlas for place-based decision-making:

- Light operational cockpit.
- Globe-first geospatial canvas.
- Thin borders and restrained shadows.
- Frosted white panels over the map.
- Teal, mint, mineral blue, soft sand, and careful amber/orange accents.
- Dense but legible data cards.
- No decorative gradient blobs or marketing hero composition.

## Core Layout

The implementation should preserve this information architecture:

- Slim left rail with brand/orbit control and icon-first navigation. Secondary dashboard surfaces open as modal panels, not permanent first-viewport columns.
- Top header with central search, scope selector, filters, notifications, help, settings, and account controls.
- Main map canvas occupying the central workspace.
- Floating map tools stacked on the left side of the map.
- A macro-to-micro vertical layer slider near the right side of the map.
- A source/provenance drawer that opens from the rail and explains active providers, mock/live/future status, licenses, confidence, and limitations.
- Right selected-hex panel with score, badge, sparkline, pillar cards, composition details, and actions. It opens on selection or explicit rail action.
- Bottom analytics strip with horizontally arranged cards. It opens on demand rather than occupying the default globe view.
- Footer with coordinate, elevation, H3 resolution, visible hex count, freshness, security/version, and status readouts.

## vmesh-Specific Adaptation

Use `vmesh` as the product identity. The product phrase is:

```text
Atlas of Antifragility
```

The H3 mesh is the product data spine, but it is not default decoration. The default viewport should show a clean hovering globe with selected-place affordances. Hex grids and heat overlays appear only when the user enables an analytical layer, selects a cell, or asks to inspect the mesh.

Every visible hex should have a reason to be visible and should imply that it can hold both macro and micro data.

Use U3/U5/U8 as the product-facing mesh zoom language:

- U3: global/continental macro view.
- U5: regional operating view and V1 default.
- U8: local/detail view for micro and user-added records inside a selected area.

Use these layer families:

- Macro: climate, water, energy, biodiversity, infrastructure, hazard/risk, land use.
- Imagery: Sentinel-2 clear-scene preview, SEN2SR enhanced products, NDVI, water index, soil/vegetation proxies.
- Micro: property signals, farmers markets, growers, food systems, local producers, community assets, repair capacity, user-added observations.
- User Added: notes, corrections, custom records, local assessments, links, and private observations.

## Selected Hex Panel

The selected hex card should include:

- H3 ID and place label.
- Main antifragility or resilience score.
- Status badge such as `High Antifragility`.
- Trend sparkline.
- Macro pillar cards.
- Micro asset summary.
- User-added record count.
- Source confidence and provenance summary.
- Small action icons for focus, bookmark, and more actions.

## Bottom Analytics

The first dashboard strip should include:

- Top antifragile regions.
- Climate trend.
- Energy availability.
- Water stress.
- Land use.
- Property or parcel layer status.
- vmesh advisor or notes panel.

The advisor panel should not imply live AI or provider calls unless that feature is explicitly implemented and cost-controlled.

## Map Treatment

The central map should prioritize:

- A globe-first object that feels round, gently rotating, hoverable, and mouse-draggable like a Google Earth-style atlas.
- A darker civic-atlas-style stage around the globe, with sparse starfield depth, atmospheric rim lighting, subtle tiled-sphere lattice cues, land/cloud texture synchronized to the MapLibre camera, and the globe treated as the primary object.
- A light globe mode inspired by clean environmental-intelligence map demos: brighter ocean/land texture, subtler starfield, softer atmospheric rim, and enough basemap opacity to inspect place context without losing the floating atlas-object feel.
- A dark globe mode for dense analytical work: subdued roads, glowing selected markers, teal/green data accents, and low-glare contrast for macro overlays.
- An atlas-globe-style mode transition: distant views stay in `Orbit Globe`, while close search/zoom views become `OSS Map Output` with a clearer open MapLibre basemap.
- Terrain-aware basemap.
- Optional imagery raster layer that never replaces the operational basemap.
- Optional H3 mesh overlay draped and camera-synchronized with MapLibre through deck.gl.
- A direct mesh on/off control. The H3 mesh remains analytical UI, while the globe can still use a subtle aesthetic tiled-sphere treatment.
- A direct dark/light globe toggle. This is a visual atlas mode only; it must not change provider selection, data provenance, mesh tier, or terrain source behavior.
- Teal-to-mint resilience scale.
- Clear selected-place/cell affordance without requiring a global grid.
- Tooltip with H3 ID, place label, and score.
- Legend for score interpretation.
- Source transparency should live in a modal drawer, not as permanent dashboard clutter.

## Interaction Notes

- The search bar supports coordinates, place names, and partial-name autocomplete, then flies the camera into the selected location with enough zoom for local inspection.
- Search/zoom close enough should make the open-source map output legible rather than leaving the user inside a decorative globe shell.
- Clicking a hex updates the selected panel and flies the camera to that region.
- Hovering a hex updates a tooltip without changing selection.
- Layer controls must be reflected in Zustand state.
- Body scrolling must remain disabled; only contained strips or panels may scroll.

## Visual Constraints

- Use exact Tailwind arbitrary values for colors and spacing where needed.
- Keep text sizes appropriate for a dashboard, not a marketing page.
- Use lucide-react icons where available.
- Keep panel radii at 8px or below unless a shadcn primitive requires otherwise.
- Avoid dark, blurred, or stock-like map presentation; the user must be able to inspect the actual mesh and map state.

## Reference Notes

The Civic Atlas reference uses a full-viewport Mapbox GL canvas with absolute DOM overlays. vmesh should borrow the globe staging, dark map atmosphere, and sparse overlay discipline, while keeping the implementation on MapLibre/open terrain foundations.

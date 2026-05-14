# vmesh Globe Phase 5: Overlay Discipline And Elegant H3 Visibility

You are Codex acting as a geospatial visualization architect.

## Goal

Keep H3 as the backend index and knowledge graph anchor, not decorative wallpaper.

## Implementation

- H3 mesh hidden by default in orbit mode.
- Show H3 only when:
  - macro layer active
  - mesh/context cells toggle active
  - selected cell outline needed
- When shown:
  - sparse
  - transparent
  - data-color driven
  - no giant global grid
- Add controls for:
  - macro heat
  - imagery
  - terrain
  - context cells
  - source/layer drawer
- Keep selected marker polished and small.

## Acceptance

- Default globe view is clean.
- Overlay toggles are obvious and reversible.
- Macro layer renders subtle analytical cells.
- User never sees purposeless huge hexagons.

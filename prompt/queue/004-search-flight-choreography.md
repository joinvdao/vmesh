# vmesh Globe Phase 4: Google Earth Style Search Flight

You are Codex acting as a geospatial interaction architect.

## Goal

Search should feel like travelling to a place on Earth, not just changing map coordinates.

## Implementation

When a user selects an autocomplete result or enters coordinates:

1. Resolve through the existing `/api/geocode/search` and coordinate parser.
2. Set the target coordinate in state.
3. In orbit mode:
   - pull camera back slightly
   - rotate globe so target is front-facing
   - show a small target marker
   - descend toward the point
   - crossfade MapLibre source map in
   - hand off to MapLibre `flyTo`
4. In source/local mode:
   - use improved MapLibre `flyTo` duration/easing.
5. Support:
   - place names
   - partial names with autocomplete
   - `lat,lng`
   - `lat,lng,zoom`

## Acceptance

- Lisbon, London, New York, Tokyo, and arbitrary coordinates all fly correctly.
- Target marker appears during flight.
- No blank transition.
- MapLibre overlays remain synchronized after handoff.

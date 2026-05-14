# vmesh Globe Phase 2: Earth Materials, Atmosphere, Clouds, Light/Dark Modes

You are Codex acting as a WebGL visual systems engineer.

## Goal

Make the orbit Earth beautiful in both dark and light mode.

## Implementation

- Add source-safe Earth texture registry.
- Prefer local/public assets if license-safe; otherwise use deterministic procedural textures.
- Add:
  - Earth surface material
  - subtle bump/normal feel
  - transparent atmosphere shell
  - cloud shell
  - directional sun light
  - soft ambient fill
  - day/night terminator effect
  - subtle ocean specular highlights
- Support:
  - `dark`
  - `light`
  - future `system`
- Theme affects:
  - stage background
  - globe atmosphere
  - HUD cards
  - controls
  - footer surfaces

## Constraints

- Do not hotlink unreviewed assets.
- Do not require Mapbox token.
- No decorative orb/blob backgrounds.
- No body scroll.
- Respect `prefers-reduced-motion`.

## Acceptance

- Dark mode feels like a suspended luminous Earth in space.
- Light mode feels like a civic atlas/studio globe.
- Texture failures degrade to a nonblank procedural Earth.
- Docs include asset and attribution guidance.

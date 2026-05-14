# vmesh Globe Phase 3: Drag Spin, Inertia, Idle Rotation

You are Codex acting as an interaction engineer for WebGL map interfaces.

## Goal

Make the real globe feel alive and directly manipulable.

## Implementation

- Drag the Three.js Earth to rotate.
- Add inertia / angular velocity after drag release.
- Add slow idle auto-rotation.
- Pause auto-rotation while:
  - dragging
  - hovering controls
  - typing search
  - modal/panel is active
- Resume gently after a short delay.
- Respect `prefers-reduced-motion`.
- Keep pointer events from interfering with MapLibre when in source/local mode.
- Dispose renderer, materials, textures, animation frames, and event handlers cleanly.

## Acceptance

- User can spin globe with mouse/touch.
- Globe coasts naturally after release.
- Idle rotation resumes without sudden jumps.
- Repeated mode switches do not leak canvases or animation loops.

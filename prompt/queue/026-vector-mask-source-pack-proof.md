# vmesh Phase 26: Vector And Mask Source-Pack Proof

You are Codex acting as a source-pack vector and mask integration engineer.

## Goal

Extend the VMesh-to-Abundance seam beyond terrain by proving source-backed
building, road, water, landcover, vegetation, and mask inputs can be generated
from VMesh recipes.

## Source Ladder

Buildings:

- Overture first.
- OSM fallback/supplement.
- ML building sources only as labeled review/context where license permits.

Roads/water:

- Overture/OSM first.
- national/regional official sources where reviewed.

Masks/landcover/vegetation:

- ESA WorldCover, Dynamic World, NLCD/LANDFIRE for USA, regional sources where
  reviewed.
- Preserve model/coarse/global confidence caps.

## Deliverables

- Abundance builder inputs for buildings, roads, water, masks, and vegetation
  occupancy/context where supported.
- Provenance manifest for every layer.
- Rejected-source reasons and gaps.
- No synthetic fill.

## Tests

Add tests for:

- Overture building recipe produces builder input, not fake feature counts;
- OSM fallback is labeled;
- vector layer attribution/license preserved;
- landcover/mask confidence capped when global/modeled;
- no source claims when recipe is review-only;
- no private refs in fixtures.

## Verification

Run touched VMesh resolver tests, Abundance/builder vector tests, and privacy
scans.

Report which layers are operational, source-ref-only, or still gaps per sample
region.

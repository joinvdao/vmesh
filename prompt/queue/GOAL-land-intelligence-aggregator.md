# Goal: Make VMesh Operate As A Land Intelligence Aggregator

You are Codex working in the private `0xkri/vmesh` source of truth.

## Objective

Make VMesh the canonical land intelligence aggregator/indexer for USA, Canada,
and the UK. A user or downstream app provides a Mapbox-selected parcel,
coordinate, H3 cell, or AOI. VMesh returns the best open source package for that
place: source refs, fetch recipes, coverage evidence, confidence, rejected-source
reasons, and gaps. VMesh must not become a heavy data warehouse or fabricate land
truth.

## Operating Model

```text
Mapbox selected parcel/point
  -> VMesh normalize AOI, H3, jurisdiction, 3 km slice frame
  -> terrain-first source selection
  -> vector/hydro/soil/landcover/ecology/climate source selection
  -> coverage proof, confidence, warnings, rejected sources, gaps
  -> downstream worker executes recipes and builds payload/source/runtime pack
```

## Work Queue

Execute the private prompt queue in this order:

1. Phase 013: canonical land intelligence resolver.
2. Phase 014: terrain-first provider proof.
3. Phase 015: jurisdiction and coverage index.
4. Phase 016: fetch recipe adapters.
5. Phase 017: vector and built environment broker.
6. Phase 018: soils, landcover, ecology, and climate broker.
7. Phase 019: Abundance source-pack handoff.
8. Phase 020: operational gates and live-proof matrix.

## Non-Negotiables

- Terrain first.
- Source refs and recipes by default, not heavy payload storage.
- No synthetic data masquerading as source truth.
- No generic DEM as high-confidence DTM.
- No DSM as DTM.
- No map tile scraping as source data.
- No exact private coordinates, addresses, local paths, secrets, signed URLs, or
  paid-provider refs in committed artifacts.
- License-gated/research-only sources stay out of operational defaults.
- Every layer reports source role, coverage status, resolution/scale where known,
  confidence, license, attribution, and limitations.

## Definition Of Done

VMesh can answer, for public-safe sample coordinates in USA, Canada/BC,
Canada/non-BC, England, Scotland, and a generic fallback region:

- What is the best terrain source here?
- Is it DTM, DSM, topobathy, generic DEM, or visual context?
- What is the resolution and confidence?
- What building/road/water/vector sources apply here?
- What soil, landcover, ecology, climate, and hazard sources apply here?
- Which sources were rejected and why?
- Which buckets need probe/review/coverage?
- What exact recipes should a downstream worker execute?

## Verification

Before marking the goal complete, run:

- `npx tsc --noEmit`
- resolver targeted Vitest
- terrain adapter/probe targeted Vitest
- source registry targeted Vitest
- BA handoff targeted Vitest
- `npm run privacy:check`
- public-safe resolver route proof matrix

Report the matrix table, all remaining source gaps, and any provider regions
below the Kamloops/Rose quality bar.

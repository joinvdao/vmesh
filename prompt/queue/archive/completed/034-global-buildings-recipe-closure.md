# vmesh Phase 34: Global Buildings Recipe Closure

## Goal

For every coordinate/AOI, return an executable, ranked building-source query
plan suitable for Abundance procedural generation.

## Required Ladder

1. Reviewed official municipal/national building footprints and attributes.
2. Overture Buildings through a bounded GeoParquet/PMTiles-compatible recipe.
3. OpenStreetMap buildings through a bounded, policy-compliant recipe or
   reviewed extract.
4. Google, Microsoft or other open footprint sets only where coverage, license
   and recipe execution are reviewed.

## Required Work

- Preserve provider feature IDs, class/subtype, height, levels, roof and source
  confidence where published.
- Normalize semantics without inventing missing attributes.
- Distinguish `query_succeeded_empty` from `provider_failed`, `not_covered` and
  `not_probed`.
- Preserve license, attribution, release/version and query bounds.
- Provide deterministic dedupe/precedence rules when official, Overture and OSM
  overlap.
- Keep exact user parcel geometry out of committed evidence.

## Done Bar

Every acceptance coordinate returns an executable building query plan. Urban
samples retain real feature semantics. A sparse sample proves a valid empty
result without generating buildings. Provider failures fall through to the
next reviewed source or become explicit gaps.

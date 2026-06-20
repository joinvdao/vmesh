# VMesh Jurisdiction Index

**Status:** Proposed design note — 2026-06-15. Not implemented. Companion to
`SOURCE_REGISTRY_DB.md` (this is the addressing layer that makes that registry
routable). Captured from a design discussion.

## Purpose

VMesh must resolve a **coordinate → a stable jurisdiction** (country / region /
municipality, plus functional partitions like watershed) so the source registry
is **keyable, routable, and aggregatable**. This is the **addressing / index
layer** — it answers *"what admin unit is this point in?"* so the broker can walk
the source ladder and so sources + coverage can be deduped and rolled up by
stable IDs.

```text
Boundaries are the INDEX. Sources are the PRODUCT.
VMesh stores coordinate->jurisdiction lookups (light), NOT boundary geometry payloads.
```

## Why (and why NOT "chart every municipality worldwide")

`SOURCE_REGISTRY_DB` keys sources by jurisdiction level
(`country / state_province / municipal / ...`) and mandates municipal-tier
discovery. To serve a coordinate, VMesh must map it to those codes — that mapping
is admin boundaries. **But** charting every municipal polygon worldwide (~1M
polygons) is the wrong move:

- "Municipality" is **not a globally consistent concept** — it maps to different
  admin levels per country, so a canonical global municipal register is a trap.
- ~1M polygons is a **heavy payload** → violates the librarian-not-warehouse rule.
- Maintenance burden (boundaries change) + **license traps** (e.g. GADM).
- It reads as progress while the **source registry stays empty** (ledger-not-factory).

So: adopt a **light global ADM0/1/2 index**, resolve the legal municipal tier
**per-country, lazily**, only where sources are actually discovered/served.

## Boundary sources (ranked)

- **PRIMARY: geoBoundaries (CC BY 4.0)** — open, global, redistributable, ADM0/1/2.
- **CROSS-CHECK: World Bank Official Boundaries (2025)** — standardized, open, ADM0/1/2.
- **AVOID as default: GADM** — non-commercial / redistribution restricted; a blocker for a multi-product broker.
- **IDs / linking: GeoNames + Wikidata + Overture Divisions** — for external IDs and aliases only, not the boundary source of truth.
- **Cloud-native format mirror: [Source Cooperative / cholmes](https://source.coop/cholmes)** — `admin-boundaries` (`countries.parquet`) is Overture divisions **filtered to ADM0/country only**, as queryable GeoParquet (no key, bbox via DuckDB); "Cloud Native MGRS" adds a 1 km grid + country admin. Useful only as a fast country-code tagger / cross-check — **NOT** an ADM1/2 source, and vmesh already has ADM0 via geoBoundaries. For the sub-national deepening below use geoBoundaries gbOpen ADM1/2 (primary) or the **full** Overture `divisions` theme (region/county/locality), not this country-filtered file. See `GEOSPATIAL_SOURCE_REVIEW.md` for the full Source Cooperative dataset map.
- **Legal municipal tier: national registers**, resolved per-country, lazily, validated where legal precision matters.

## H3 tiling (the performance trick)

Precompute, per admin unit, the **set of H3 cells** it covers (fixed index res,
e.g. r6/r7). Then `coordinate -> H3 -> jurisdiction` is a **hash lookup, not
point-in-polygon at request time** — fits VMesh's existing H3 / deck.gl stack and
the "laser-fast response" goal, and you store *cell→ID maps*, not geometry.

## Suggested layers

### `jurisdiction_units`
| Field | Purpose |
| --- | --- |
| `id` | Stable VMesh jurisdiction id. |
| `level` | `country` / `adm1` / `adm2` / `municipal` / `watershed` / ... |
| `name` | Public name. |
| `country_code` | ISO. |
| `parent_id` | Hierarchy link. |
| `source` | `geoBoundaries` / `world_bank` / `national_register` / `osm`. |
| `external_ids` | `{ geoBoundaries, wikidata, geonames, osm_relation, overture }`. |
| `legal_tier_resolved` | bool — true once validated to the legal municipal tier. |

### `jurisdiction_h3` (the lookup table)
| Field | Purpose |
| --- | --- |
| `h3` | H3 cell id (fixed resolution). |
| `jurisdiction_id` | Unit covering this cell. |
| `level` | Which ladder level (so a cell resolves to the full country/adm1/adm2 stack). |

## Resolution flow

```text
coordinate
  -> H3(cell at index resolution)
  -> jurisdiction_h3 lookup -> { country, adm1, adm2 }
  -> if serving municipal sources AND legal tier matters:
       resolve legal municipality per-country, lazily, validate vs national register
  -> hand the jurisdiction stack to SOURCE_REGISTRY_DB (drives the source ladder)
```

## Relationship to the other VMesh docs

- **`SOURCE_REGISTRY_DB.md`** — its `coverage.{jurisdictionLevel, countryCode, regionCode, municipality}` is **populated by this index**.
- **`INTEL_VMESH_SOURCE_HANDOFF_CONTRACT.md`** — the handoff's `coverage` + `coverageEvidence.queryRef` use jurisdiction IDs / H3 from this index as **public-safe AOI keys** (not raw coordinates).
- **The discovery swarm's jurisdiction ladder** (`country → province → municipal → ...`) is **driven** by this index.

## Functional (non-admin) partitions — later, lazily

Lots of eco data is keyed to **watersheds / regional districts / ecozones** (BC
Freshwater Atlas, BEC), not admin units. Add a couple of functional partition
layers (watershed) **regionally, where data lives, lazily** — do not expand scope
up front.

## Ingest plan (geoBoundaries → H3)

Bounded, scriptable, re-runnable.

1. **Fetch metadata + download URLs** from the geoBoundaries API (gbOpen release, CC BY 4.0):
   - `GET https://www.geoboundaries.org/api/current/gbOpen/{ISO3}/{ADM0|ADM1|ADM2}/`
   - Returns `gjDownloadURL` (full GeoJSON), `simplifiedGeometryGeoJSON`, `boundaryISO`, `shapeID`/`shapeGroup`, license, version.
   - Bulk: iterate the ISO3 list (or `ALL`) × {ADM0, ADM1, ADM2}. Use the **simplified** geometry for the index (smaller; precise enough for cell tiling).
2. **Assign stable IDs.** Store geoBoundaries `shapeID` as `external_ids.geoBoundaries`; mint a vmesh `jurisdiction_id` keyed on (source, shapeID). Capture name, level, `country_code`, `parent_id`, `version`.
3. **H3 polyfill** each unit at the index resolution — start **r6** (≈36 km²), refine to **r7** (≈5 km²) where municipal precision is needed: `polygonToCells(geometry, res)` (h3-js / h3-py), or use **[geoparquet-io](https://github.com/geoparquet/geoparquet-io)**'s built-in H3 spatial indexing to emit the `cell → id` table straight from a GeoParquet boundary file. Write `jurisdiction_h3 (h3, jurisdiction_id, level)`.
   - Boundary-straddling cells: a cell can cover >1 unit — keep all candidates at that level; resolve ties with point-in-polygon only at request time for edge cells.
4. **Store.** PostGIS (with an H3 index) or a flat keyed store (Postgres/R2). **Geometry is NOT served** to consumers — only the `cell → id` lookup + the unit metadata table.
5. **Refresh.** geoBoundaries is versioned — re-run per release (or quarterly); diff `version` per unit and update only changed boundaries.

**Sizing:** ADM0/1/2 simplified globally is tens–low-hundreds of MB to *process*, but
the *retained* index is just `cell→id` rows + a metadata table — light, queryable,
no heavy payload served. **Cross-check** a sample of ADM2 against World Bank
Official Boundaries; where ADM2 ≠ the legal municipality, set
`legal_tier_resolved=false` and defer the legal tier to a per-country
national-register pass when sources are actually discovered there.

## Scope discipline

Bounded, one-time-ish ingest, refreshed periodically. Adopt this because it makes
the source work organizable + routable — **not as the goal**. The source registry
is still the product.

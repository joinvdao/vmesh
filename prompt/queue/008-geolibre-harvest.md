# 008 — GeoLibre harvest (review bench + DuckDB GeoParquet recipe)

**Repo:** vmesh (worker recipe lands in the private fork first; promotes with
`007`) · **Gate:** none · **Status:** TODO (bench workflow adopted + verdict
recorded 2026-07-05)

## Context

[GeoLibre](https://github.com/opengeos/GeoLibre) (opengeos / Qiusheng Wu, MIT —
MapLibre + DuckDB-WASM Spatial + deck.gl + Tauri) was assessed 2026-07-05.
Verdict: do NOT integrate the platform — it is a generic "load anything" GIS
workbench and vmesh is a curated, provenance-gated atlas (the scope doc
explicitly guards against flattening into a generic tile utility). Harvest
three things instead. The full adopt/reject record lives in the source-review
doc (`docs/GEOSPATIAL_SOURCE_REVIEW.md`, private fork until `007` promotes it).

## Scope

1. **Operator source-review bench (done — workflow only).** GeoLibre is the
   inspection tool for the `needs_probe` / `needs_license_review` step: drag in
   COGs, query STAC/WMS endpoints, range-read remote GeoParquet (including the
   Source Cooperative candidates), then record verdicts in the vmesh registry
   as usual. No code dependency; recorded in the review doc.
2. **DuckDB (native) worker recipe for `geoparquet-bbox`.** Implement the
   GeoParquet access path in the worker/pipeline tier using DuckDB Spatial +
   HTTP range reads (pairs with `geoparquet-io` for indexing/partitioning):
   selected-AOI extracts and H3 summary generation without downloading whole
   datasets. Browser never pulls global grids — it requests the worker's
   summaries, per the existing discipline. DuckDB-WASM in-browser is a
   deferred option (lazy-loaded, operator/advanced view only), not part of
   this step.
3. **Pattern references (no code lift):** Field Collection → the user-added
   observations milestone; PWA offline-area tile precache → the offline-first
   milestone; `?url=` project deep links / standalone HTML export → package
   manifest sharing.

## Rejected (recorded so it is not relitigated)

Embedding/forking the workbench; the add-anything ingestion UI in the default
atlas surface; Whitebox-WASM or any browser raster processing (server-side
discipline stands); Tauri desktop/mobile builds; the canvas globe-atmosphere
plugin. Prefer the underlying libraries (duckdb, geotiff.js, pmtiles,
flatgeobuf) over a dependency on the young platform itself.

## Acceptance

- A `geoparquet-bbox` recipe runs in the worker: given a registered GeoParquet
  source + AOI, it produces an extract + H3 summary with provenance/license
  fields carried through, proven against one Source Cooperative dataset.
- The review doc's GeoLibre entry records the bench workflow + this verdict.
- No new browser dependency lands in the default atlas bundle.

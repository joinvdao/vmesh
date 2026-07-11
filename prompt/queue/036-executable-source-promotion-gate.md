# vmesh Phase 36: Executable Source Promotion Gate

## Goal

Prevent metadata-only or stale sources from entering VMesh operational defaults.
Promotion must be deterministic, layer-specific and evidence-backed.

## Promotion Requirements

A source may become operational only when it has:

- reviewed authority, canonical endpoint and license/access posture;
- coverage semantics and source role;
- an adapter supported by the declared recipe family;
- bounded request construction and SSRF/secret protections;
- fixture tests plus retained cheap-probe evidence;
- a downstream-executable provider-native ref;
- explicit resolution/scale, confidence, limitations and fallback behavior;
- health freshness and a deterministic demotion path.

## Required Work

- Implement validation for STAC, COG, ArcGIS, WFS, GeoParquet, tile/archive
  index and typed API recipe families.
- Reject HTML catalog pages, preview images, expiring signed refs, local paths,
  unreviewed mirrors and unsupported asset formats as executable recipes.
- Track consecutive failures and stale evidence without silently deleting
  historical source intelligence.
- Expose selected and rejected sources through the Abundance handoff.
- Generate the capability ledger from the same promotion state.

## Done Bar

Every operational source passes the promotion gate. Every metadata-only source
remains discoverable to operators but cannot be selected for the game. Tests
prove demotion, fallback, license gating and stale endpoint behavior.

# Goal: Global Any-Coordinate Source Closure

## Outcome

Make VMesh return an honest, ranked, executable land-intelligence source plan
for every valid WGS84 coordinate on Earth. The plan must be directly consumable
by Abundance GIS workers and cover, at minimum:

- terrain or bathymetry/topographic context;
- landcover, ecology/ecoregion context, and vegetation context;
- buildings, with a valid empty result where no features are published;
- roads, water/hydrology, soils, weather/climate, and parcel/field context where
  reviewed sources exist.

VMesh remains an index, ranker, probe layer, and recipe broker. It does not
become a warehouse for provider payloads. Downstream workers fetch, window,
normalize, cache, and render data.

## Honest Global Floor

"Any coordinate" means every request returns one of:

1. a source-native, coverage-proven executable recipe;
2. a lower-resolution global executable recipe with explicit fallback role;
3. a valid empty result for a queried feature layer;
4. an explicit `no_coverage`, `not_applicable`, `license_gated`, or
   `temporarily_unavailable` gap.

It does not mean that LiDAR, authoritative parcels, local habitat surveys,
species observations, building footprints, or equal resolution exist
everywhere. Never infer absent buildings or roads, invent species, upgrade a
global DEM to DTM, or present modelled ecology as a field survey.

## Execution Order

Work phases 030 through 037 in dependency order. Multiple phases may be
completed in one session. Commit and push each coherent green tranche to the
private canonical VMesh repository.

## Standing Gates

- `npm run format:check`
- `npm run lint`
- `npm test`
- `npm run agent-ready:check`
- `npm run public-workflow:check`
- `npm run privacy:check`
- `git diff --check`

Provider work also requires retained, redacted live evidence. A mock, fixture,
dry-run, endpoint root response, or source-preview is not payload proof. Report
code readiness and live readiness separately.

## Final Acceptance

- Every registry source has a current capability classification.
- Operational defaults contain only reviewed sources with executable recipes.
- Terrain resolves worldwide through source-native regional upgrades and a
  labelled global floor; ocean/coastal inputs are handled honestly.
- Ecology resolves worldwide to sourced global context, with local survey and
  species detail included only where supported.
- Buildings resolve worldwide through reviewed global query rails, where an
  empty provider response is a valid result rather than fabricated geometry.
- The VMesh Abundance handoff exposes selected recipes, alternatives,
  provenance, confidence, coverage, fallback reasons, and gaps.
- A retained acceptance matrix proves coordinates across all continents,
  high-resolution regions, sparse-data regions, coastal/ocean cases, and valid
  empty building results.

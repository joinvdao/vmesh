# vmesh Phase 31: Official STAC Endpoint Refresh

## Goal

Execute a focused refresh of official STAC and STAC-adjacent endpoints. Build on
phase 012 and the phase-030 capability ledger; do not repeat broad, noisy source
discovery.

## Priority Domains

1. Terrain: DEM, DTM, DSM, LiDAR, COPC/EPT, bathymetry and contours.
2. Imagery: Sentinel, Landsat and reviewed public orthophoto catalogs.
3. Landcover/ecology: classified landcover, canopy, habitat, protected areas,
   biomass/carbon and ecoregion sources.
4. Hydrology: hydrography, watersheds, wetlands, flood, snow/ice and water
   masks.

## Required Work

- Mine prior Intel outputs first, then query official provider documentation and
  endpoint roots.
- Probe only metadata surfaces: root/catalog JSON, conformance, collections,
  sampled item search, asset roles, media types, license, auth posture,
  resolution, temporal extent and endpoint health.
- Record redirects and canonical URLs. Never retain tokens or signed URLs.
- Identify the recommended VMesh recipe family for every useful collection.
- Quarantine ambiguous mirrors, unclear licenses, account-only collections and
  endpoints that cannot be tied to an official authority.
- Promote no source in this phase merely because its STAC root responds.

## Deliverables

- Updated official STAC authority/endpoint/collection records.
- Redacted endpoint-health and collection-capability report.
- Probe queue for high-value collections requiring bounded asset proof.
- Country/region gap matrix, including `no_official_stac_found` where honest.

## Gates

Run the standing gates. Report each endpoint as `configured`, `metadata-probed`,
`asset-ref-proven`, or `live-materialized`; do not collapse these states.

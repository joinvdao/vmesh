# Public Cache Publication Policy

Snapshot date: 2026-05-17

This policy defines when vmesh package artifacts can become public cached
PMTiles, COGs, GeoParquet extracts, H3 summaries, or static manifests.

## Default Position

Requested packages are private or access-controlled by default. Popularity does
not make an artifact public. A cell, AOI, or property package can be promoted to
public cache only after license, privacy, provenance, attribution, and claim
boundaries are reviewed.

## Public-Cache Eligible

These artifacts are generally eligible when source terms allow reuse and
attribution is retained:

- open low-zoom basemaps and generalized context layers;
- public terrain derivatives such as contours, hillshade, slope/aspect, or H3
  summaries from open DEM/DTM sources;
- open landcover, vegetation, hydro, climate-normal, weather-ledger, solar, and
  wind summary layers at appropriate precision;
- Sentinel/SEN2SR demonstration packages where Sentinel scene id, cloud metrics,
  model id, acquisition date, and imagery-inferred limitations are retained;
- generalized public H3 summaries that do not expose private user activity,
  private AOIs, exact addresses, or sensitive infrastructure.

## Not Public-Cache Eligible By Default

These artifacts must remain private, authenticated, signed, or owner-controlled:

- user-drawn property/project boundaries;
- private AOIs and exact private addresses;
- user observations, uploads, walkthroughs, drone imagery, survey files, or
  capture-derived products;
- paid parcel/title/survey records;
- premium orthophoto, satellite, aerial, DEM, DTM, DSM, LiDAR, or derived
  products unless the license explicitly permits public redistribution;
- downstream render-conditioning packs, GPU outputs, generated-world outputs,
  report assets, and private QA screenshots;
- any artifact containing signed URLs, provider tokens, secret-bearing query
  strings, local filesystem paths, or raw provider order details.

## Promotion Checklist

Before a package is promoted from requested cache to public cache:

1. Confirm the source license permits storage, processing, redistribution, and
   public display.
2. Confirm attribution and source release/vintage are embedded in the manifest.
3. Confirm the artifact contains no private boundary, exact address, private
   AOI, user upload, user observation, signed URL, token, or local path.
4. Confirm the geometry precision is appropriate for public release.
5. Confirm the source role is honest: DTM, generic DEM, DSM, visual context,
   imagery-inferred context, modelled context, or user observation.
6. Confirm AI/super-resolution outputs are labelled as inferred visual context,
   not measured orthophoto, legal boundary, survey, hazard, or engineering
   truth.
7. Record cache key, source ids, processing version, model id where applicable,
   retention class, and invalidation trigger.

## Delivery Rules

Public artifacts may use static HTTP range delivery through R2/S3/CDN, PMTiles,
COG, TileJSON, or GeoParquet refs.

Private artifacts must use signed URLs with short TTLs, authenticated tile
proxies, private object refs resolved server-side, or local hub paths that never
enter public manifests.

Login-gating the app shell is not sufficient. The tile URL, object URL, or proxy
must enforce the same access policy as the package manifest.

## Cache Classes

| Cache class        | Examples                                                      | Retention                                         |
| ------------------ | ------------------------------------------------------------- | ------------------------------------------------- |
| Public evergreen   | Natural Earth, open low-zoom context                          | Long, source-versioned                            |
| Public derived     | generalized H3 summaries, contours, MODIS/Blue Marble context | Long if licensed                                  |
| Standard requested | Sentinel/SEN2SR AOI package, open terrain derivatives         | Medium, keyed by H3/AOI, scene, model, cloud gate |
| Private requested  | user property package, drawn boundary, private report assets  | Owner-retained with deletion/export controls      |
| Premium requested  | paid orthophoto/DEM/parcel package                            | Terms-bound, private by default                   |

## Sentinel/SEN2SR Boundary

SEN2SR output can be cached publicly only when the package is intentionally
public, cloud-qualified, source-attributed, and terms-compatible. It must retain:

- Sentinel-2 scene id;
- acquisition date;
- AOI cloud percentage from SCL;
- source resolution and derived display resolution;
- model id/version;
- H3/AOI coverage;
- `truthStatus: imagery-inferred-context`;
- limitations that block legal, survey, emergency, engineering, or exact
  infrastructure claims.

## Publication Decision

The publication decision belongs in the package manifest:

```text
cacheClass
privacyClass
publicCacheAllowed
licenseAllowsRedistribution
containsPrivateGeometry
containsPremiumSource
containsUserData
sourceRole
limitations
```

If any field is missing, default to private/access-controlled delivery.

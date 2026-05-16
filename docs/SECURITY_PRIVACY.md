# Security And Privacy

## Data Classification

| Data                              | Classification               | Rule                                                                |
| --------------------------------- | ---------------------------- | ------------------------------------------------------------------- |
| Mock H3 macro metrics             | Internal sample              | Safe to commit if clearly labeled as mock.                          |
| Fixture macro packages            | Internal sample              | Safe to commit only when deterministic, public-demo, and sanitized. |
| Mock micro records                | Internal sample              | Safe to commit only when fictional or public-domain.                |
| User-added notes and observations | Potentially private          | Do not commit real user content.                                    |
| Property listings and addresses   | Sensitive/commercially bound | Use only lawful sources; do not log exact addresses by default.     |
| Farmer markets and public assets  | Public but provenance-bound  | Store source, timestamp, and license/terms.                         |
| Infrastructure risk data          | Sensitive                    | Requires provenance and access rules.                               |
| Provider tokens                   | Secret                       | Never commit.                                                       |
| Analytics events                  | Internal telemetry           | Must exclude PII and raw sensitive geometry.                        |

## Secrets Handling

- Use `.env.local` for local secrets.
- Use Vercel Project Settings for deployed environment variables.
- Keep `.env.example` as placeholders only.
- Rotate any credential that appears in chat, logs, screenshots, or Git.

## User-Added Data Rules

- Treat user-added data as private by default. This includes observations, skills file entries, who-has-what inventory items, community rolodex contacts, self-selected interests, corrections, and adaptation plans.
- Require explicit visibility before any future sharing or publishing.
- Validate category, location precision, source, and confidence before attaching records to a hex.
- Do not collect personal planning notes, unrelated commitments, private notes, or sensitive provider data in the public repository.
- Do not send raw user-added record bodies to analytics by default.
- Skills files, who-has-what inventories, and rolodex entries must never leave the device without an explicit user-initiated share action and a per-record threat-vector review.
- Anything shared up-mesh from user-added data must be anonymized or aggregated; raw identities and exact coordinates must not be transmitted by default.

## Onboarding Agent Privacy

The onboarding interview agent must be replaceable and must default to a non-AI, template-driven implementation. When an inference backend is later enabled it must prefer a privacy-preserving or locally-hostable model layer (Venice.ai or equivalent) before any remote provider is allowed. Interview answers are user-added data and follow the rules above.

## Sensitive Location Rules

Exact coordinates and addresses can identify people, private property, or sensitive infrastructure. Prefer H3 aggregation, coarse geocoding, or redaction unless exact precision is essential and explicitly allowed.

## Provider Data Flow

Map tiles and terrain tiles are fetched client-side in the MVP. Future macro and micro data providers must document request fields, response fields, retention behavior, caching, cost controls, source terms, and fallback paths.

Current macro, food-network, property, hub-network, and local-LLM records are deterministic mocks. Property records must remain approximate H3-area signals in V1: no scraping, no exact private addresses, no raw owner/contact data, and no paid listing feeds without terms review and explicit privacy controls.

Open-Meteo weather calls are allowed only as a no-secret prototype path. They may expose the selected H3 centroid to Open-Meteo, so privacy-sensitive deployments should use deterministic mock data, offline H3 summaries, or a local hub cache/gateway instead of direct browser fetches.

Remote free-text geocoding/autocomplete is enabled by default through the local `/api/geocode/search` route, which performs a bounded no-key OpenStreetMap/Nominatim lookup and returns normalized suggestions. Coordinate parsing and a small built-in place list still work offline. Free-text geocoding can reveal user intent and approximate area of interest to the upstream provider, so privacy-sensitive or offline deployments should set `NEXT_PUBLIC_ENABLE_REMOTE_GEOCODING=false` and prefer a local geocoder, coarse geocoding, or a privacy-reviewed gateway.

Solar, wind, and sector-map providers follow the same selected-location privacy rule. Direct browser calls for irradiance, cloud cover, wind, or forecast data may expose the selected H3 centroid or AOI to a provider. Privacy-sensitive deployments should use local hub caches, precomputed H3 summaries, or offline package manifests.

Open map source records must preserve source attribution and license terms. Public raster/vector tile services are not data sources to scrape. Overture, OSM PBF extracts, Natural Earth, OpenAddresses, LiDAR portals, and similar catalogs require preprocessing, source versioning, and per-source license review before their derived features become vmesh records.

Agricultural field-boundary datasets such as Fields of The World must be treated as predicted agricultural geometry, not ownership, parcel, or legal boundary data. Do not use field boundaries to identify individual owners, infer private farm operations, or expose sensitive rural assets without review. Store model year, source, confidence/quality metadata, license, and limitations beside any derived H3 summaries.

OpenAddresses and property-adjacent address datasets can increase re-identification risk. Public UI should prefer coarse geocoding, H3 attachment, and approximate place labels; exact private addresses remain local/private unless a user explicitly adds and keeps them private-local.

The macro-atlas source broker records rejected-source reasons and package manifests without downloading or storing raw provider artifacts. Source package manifests are safe to commit only when they contain generic fixtures, public provider metadata, no private AOIs, no exact private addresses, no tokens, and no downloaded rasters/tiles. Real package payloads and local hub caches stay outside Git.

## Geospatial Package Service Rules

The geospatial package service may expose source plans, source probes, package manifests, provider IDs, artifact kinds, and cache keys. It must not expose:

- provider tokens, signed URLs, API keys, or secret-bearing query strings;
- raw downloaded rasters, vector payloads, climate grids, or private caches;
- private AOIs beyond the precision explicitly requested by the user or deployment;
- exact private addresses or scraped listing data;
- provider order/quote details that are not intended for public release.

Package plans are metadata only. Heavy package generation must run in a local/server worker that preserves source license, attribution, CRS, vertical datum, acquisition/processing time, confidence, and limitations before any artifact becomes app-ready.

Property treatment packages add a stricter delivery boundary:

- Public PMTiles/COG/GeoParquet artifacts may contain only open or intentionally
  public generalized data.
- Private project boundaries, private AOIs, user-uploaded surveys, paid parcel
  records, premium imagery, private report assets, and downstream generated
  outputs require signed URLs, an authenticated tile proxy, or owner-private
  object refs.
- Login-gating the app shell is not enough. Tile URLs, PMTiles archives, vector
  tile endpoints, and COG URLs must enforce the same access policy as the
  package manifest.
- Cache promotion from requested package to public package is allowed only after
  source license, privacy class, attribution, and coordinate-disclosure review.
- Provider keys and token-bearing tile URLs must not appear in HAR files,
  screenshots, public docs, package manifests, or client-readable refs.

Current package-plan API hardening:

- JSON-only POST requests.
- `32 KB` request body cap.
- Valid WGS84 centroid/bounds checks.
- `10` degree maximum AOI span per planning request until a queue-backed worker exists.
- H3 validation before accepting user-provided cell IDs.
- Sanitized consumer app IDs, source preferences, and labels.
- Secret-bearing and credential-bearing provider URLs redacted from public responses and excluded from artifact URLs.
- Coordinate disclosure reports the precision requested by the caller, not the internal normalized centroid used for package math.
- Source preferences cannot promote paid, token-gated, license-gated, blocked, missing, or API-key-required providers into selected defaults.
- `no-store` and `nosniff` response headers.

This does not replace deployment-level protections. Public deployments still need rate limits, abuse monitoring, worker authentication, storage access controls, and provider-specific terms/cost gates before real artifact generation is enabled.

## Macro Package Rules

- Committed macro packages must be deterministic fixtures with `liveNetworkUsed: false`.
- Fixture package records must carry provider id, source type, license, confidence, validity window, limitations, and H3 resolution.
- Browser macro calls may sample only the selected cell or a reviewed capped ring. Broad climate, hazard, solar, wind, fire, and flood grids must enter through offline/server packages.
- Package validators must reject exact private addresses, user records, incomplete provenance, paid-provider calls in fixture/default mode, browser grid-fetch modes, missing license/attribution, missing confidence, missing validity windows, missing limitations, and authoritative hazard/survey claims.
- Production promotion requires `macro:ready` with a production profile. Fixtures, mocks, future-provider placeholders, unreviewed terms, fixture cadence, and text that still reads as fixture/mock/prototype data must be blocked from production promotion.
- UI labels must distinguish `Fixture package`, `Mock fallback`, `Live selected-cell`, `Cached package`, and `Future provider`.
- Decorative globe textures, clouds, lighting, visual lattice, and basemap tiles must not be presented as source-backed macro data.
- Three.js orbit-globe textures, including the bundled NASA Blue Marble raster, are visual context only. They may guide the atlas experience, but production claims must come from MapLibre/provider registries, package manifests, H3 summaries, and explicit provenance.

## Cross-App Sharing Rules

vmesh can publish public-safe substrate insights for downstream apps, but cross-app sharing must use sanitized summaries, schemas, fixtures, manifests, or issue links. Do not copy private planning notes, personal systems, secrets, user records, provider credentials, exact private addresses, raw property listings, radio identities, or local hub configuration between repos.

If an insight originates from a private chat, local ticket, screenshot, paid provider conversation, or non-public source, rewrite it as a clean public summary before committing it. Keep source links, license notes, confidence, and limitations beside any provider or dataset insight.

## Open Terrain Source Rules

- Keep Mapzen/Joerd Terrarium-style tiles, MapLibre demo terrain, and other no-token public tile sources behind the typed provider registry.
- Treat Mapterhorn as a first-class future provider, likely through PMTiles and catalog metadata, with attribution and protocol setup completed before live use.
- Treat CUDEM and similar bulk DEM datasets as preprocessing sources until they are converted into map-ready COG, PMTiles, TileJSON, or Terrarium-compatible tiles.
- Treat OpenTopography-style APIs as future API DEM providers. Do not call them in V1 and do not commit API keys.
- Treat FABDEM as license-gated. Its public license is non-commercial/share-alike; commercial use requires separate licensing.
- Do not add paid APIs, secret-bearing tile URLs, or real ingestion jobs without tests, docs, cost controls, license review, and a fallback state.

Contour records are derived products. Browser terrain uses `raster-dem`; production contours require preprocessing DEM data into vector contour tiles or PMTiles with source attribution and license review.

## Solar, Wind, And Sector-Map Rules

- Sun-path previews may run in the browser with SunCalc-style deterministic calculations.
- Terrain-horizon shading must state the DEM/DTM source, resolution, role, vintage, and confidence.
- Building, tree, canopy, and local obstruction shading requires source-backed DSM, LiDAR, building height, canopy, or user-observed data. If those inputs are missing, obstruction shading must be marked unavailable.
- Sentinel/SEN2SR imagery may support visual context but must not be used as authoritative shading geometry or PV suitability proof.
- NREL PVWatts or similar PV production APIs are optional future providers; they require key/terms review and must not become the public default.
- Solar output is planning context, not bankable PV engineering, financial yield, roof assessment, or installation advice.
- Wind roses must state provider, variable, height, time period, binning method, calm threshold, and limitations.
- Wind roses are climate/design context, not structural wind engineering, turbine siting certification, or emergency wind warning.
- Climate sector maps are directional design intelligence and user-observation surfaces. They must not be presented as automated permaculture prescriptions or official hazard maps.

## Imagery And Super-Resolution Rules

- Sentinel-2 imagery can be used only with preserved scene IDs, acquisition time, cloud metrics, license/attribution, and processing provenance.
- SEN2SR processing must run offline/server-side. Do not run GPU-heavy model inference, COG processing, or whole-scene downloads in the browser.
- The current upscaler reference is ESAOpenSR/SEN2SR. SEN2SRLite RGBN `x4` output targets `2.5 m` display pixels from `10 m` Sentinel-2 L2A source data, but remains imagery-inferred context.
- AI-assisted super-resolution can introduce artifacts. Do not use it for legal boundaries, official surveys, emergency certification, or exact private infrastructure claims.
- Mapbox satellite is optional and token-gated for both base-globe and imagery use. Secret-class Mapbox tokens must stay in server-only `MAPBOX_TOKEN` and be accessed through the local proxy route; only restricted public `pk.*` tokens may use `NEXT_PUBLIC_MAPBOX_TOKEN`. Do not commit screenshots with private tokens or token-bearing tile URLs.
- Free-text search defaults to the local `/api/geocode/search` proxy so the browser does not call Nominatim directly. Remote geocoding can disclose typed places or coordinates to the provider; set `NEXT_PUBLIC_ENABLE_REMOTE_GEOCODING=false` for privacy-sensitive or offline deployments.
- Mapbox, MapTiler, Esri, and similar satellite basemaps are display/reference
  layers by default. Do not download, upscale, cache, export, redistribute, or
  use their tiles as downstream AI/render-conditioning inputs unless the active
  provider agreement explicitly permits that exact use.
- Do not commit downloaded Sentinel scenes, generated COGs, PMTiles archives, private AOIs, or local hub imagery caches.

## Annotation Privacy Rules

- Annotation projects can expose private land, exact coordinates, EXIF timestamps, sensitive infrastructure, and personal context.
- Do not commit raw annotation images, private Labelme JSON files, EXIF-bearing photos, or exact private screenshots.
- Only sanitized annotation fixtures may enter the public repo.
- Store annotation provenance and review state when labels become training data or H3 summaries.
- AI-assisted labels must be labeled as draft or model-assisted until reviewed by a human.
- GPL-licensed annotation tooling such as Labelme should remain an external workflow unless license compatibility is reviewed.

## Logging And Analytics Restrictions

Allowed:

- App load timing.
- Renderer error category.
- Selected H3 resolution or tier.
- Provider ids, source modes, and package ids.
- Aggregate counts such as visible cells, selected layer count, and panel opens.
- Validation success/failure categories without raw payloads.

Not allowed by default:

- Raw user-added notes, private inventory, or contact fields.
- Exact private addresses or exact user-provided coordinates.
- Provider tokens, signed URLs, or local hub credentials.
- Raw macro package payloads from private AOIs.
- Full search strings when remote geocoding is enabled.

Analytics should use coarse H3/tier metadata, source mode labels, and error classes rather than raw sensitive geometry or content.

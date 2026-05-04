# Security And Privacy

## Data Classification

| Data                              | Classification               | Rule                                                            |
| --------------------------------- | ---------------------------- | --------------------------------------------------------------- |
| Mock H3 macro metrics             | Internal sample              | Safe to commit if clearly labeled as mock.                      |
| Mock micro records                | Internal sample              | Safe to commit only when fictional or public-domain.            |
| User-added notes and observations | Potentially private          | Do not commit real user content.                                |
| Property listings and addresses   | Sensitive/commercially bound | Use only lawful sources; do not log exact addresses by default. |
| Farmer markets and public assets  | Public but provenance-bound  | Store source, timestamp, and license/terms.                     |
| Infrastructure risk data          | Sensitive                    | Requires provenance and access rules.                           |
| Provider tokens                   | Secret                       | Never commit.                                                   |
| Analytics events                  | Internal telemetry           | Must exclude PII and raw sensitive geometry.                    |

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

## Open Terrain Source Rules

- Keep Mapzen/Joerd Terrarium-style tiles, MapLibre demo terrain, and other no-token public tile sources behind the typed provider registry.
- Treat Mapterhorn as a first-class future provider, likely through PMTiles and catalog metadata, with attribution and protocol setup completed before live use.
- Treat CUDEM and similar bulk DEM datasets as preprocessing sources until they are converted into map-ready COG, PMTiles, TileJSON, or Terrarium-compatible tiles.
- Treat OpenTopography-style APIs as future API DEM providers. Do not call them in V1 and do not commit API keys.
- Treat FABDEM as license-gated. Its public license is non-commercial/share-alike; commercial use requires separate licensing.
- Do not add paid APIs, secret-bearing tile URLs, or real ingestion jobs without tests, docs, cost controls, license review, and a fallback state.

Contour records are derived products. Browser terrain uses `raster-dem`; production contours require preprocessing DEM data into vector contour tiles or PMTiles with source attribution and license review.

## Logging And Analytics Restrictions

Allowed:

- App load timing.
- Renderer error category.
- Selected H3 resolu

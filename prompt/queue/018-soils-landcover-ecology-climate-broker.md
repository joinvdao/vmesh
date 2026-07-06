# vmesh Phase 18: Soils, Landcover, Ecology, And Climate Broker

You are Codex acting as a land-intelligence source engineer.

## Goal

Extend the resolver beyond terrain and vectors into the broader land intelligence
sources needed by Building Abundance and future VMesh consumers.

VMesh should return source refs, recipes, coverage state, confidence, and gaps
for soils, landcover, ecology, hydrology context, climate/weather, and risk
hazard. It should not claim site truth when data is modeled/coarse/global.

## Source Families

Global/default:

- SoilGrids for modeled soil context.
- ESA WorldCover and Dynamic World for landcover.
- HydroSHEDS for hydro context.
- Open-Meteo and NASA POWER for weather/climate context.
- Sentinel/Earth Search for imagery observation.

USA:

- SSURGO/gSSURGO for detailed soil survey.
- NLCD and LANDFIRE for landcover/vegetation/fire context.
- NHD for hydro.
- official state/local ecology/hazard sources where discovered/reviewed.

Canada:

- Canada/provincial soils, hydrology, landcover, wildfire, ecozone, BEC/BGC
  source families where reviewed.
- BC-specific ecology/watershed/vegetation candidates for BC sites.

United Kingdom:

- Scotland/England soils, habitat, flood, forestry, environment, protected-area,
  and planning sources where reviewed.

## Rules

- Modeled global layers must be labeled modeled/coarse.
- Official regional/local sources outrank global modeled context when coverage
  and license are proven.
- Research-only and license-gated sources must not become operational default.
- Climate/weather APIs can return source refs and small typed summaries, but
  must preserve source/time/uncertainty.

## Deliverables

1. Source ladder per bucket and region.
2. Resolver integration for each bucket.
3. Fetch recipes for the first operational sources.
4. Gaps for buckets without operational source coverage.
5. Confidence tiers by source role and resolution.

## Tests

Add tests for:

- USA coordinate selects SSURGO over SoilGrids when available;
- Canada/UK coordinates return reviewed regional candidates or explicit gaps;
- global modeled layers are confidence-capped;
- research/license-gated sources are warning/gap by default;
- climate source refs do not expose secrets or overclaim precision;
- no exact private coordinate leakage in fixtures.

## Verification

Run:

- `npx tsc --noEmit`
- targeted resolver/source registry tests
- privacy check
- route proof for USA, BC, England, Scotland, and generic global fallback

Report operational versus source-ref-only status for every bucket.

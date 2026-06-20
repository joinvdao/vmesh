# Geospatial provider keys (vmesh)

Where vmesh's geospatial credentials live and what they're for. **Secrets stay in Infisical**
(project `simpleloop`, env `dev`) — never paste raw keys, never commit `.env.local`. Inject at
runtime via `codex-infisical-run.ps1` (local) or `sl-infisical-run <path>` (VPS).

## Important: most sources need NO key
The 494 registry collections are dominated by **open** endpoints (public ArcGIS Feature/Hub services,
STAC collections, open-data catalogues — CC0 / CC-BY). `broker_sources()` recipes for those execute with
no auth. Provider keys below are only for **license-gated / commercial** sources and for the basemap/imagery
render layers.

## Key paths (verified 2026-06-15)
| Infisical path | Keys | Used for | Bucket(s) |
|---|---|---|---|
| `/providers/mapbox` | `MAPBOX_TOKEN` (1) | Basemap tiles + satellite imagery proxy (render layer) | imagery_observation, basemap |
| `/providers/up42` | `UP42_*` (2) | Commercial satellite tasking/archive (optional, license-gated) | imagery_observation |
| `/providers/worldlabs` | `WORLDLABS_API_KEY` (1) | 3D world generation (downstream BA, not core registry) | — |
| `/supabase/simpleloop` | `SUPABASE_DB_URL` (+ others) | The durable `vmesh` registry connection (canonical key; POSTGRES_URL/DATABASE_URL fallback) | (all — store) |

Boundary data (`vmesh.jurisdictions`) uses **public, no-key** sources: geoBoundaries CGAZ (CC BY 4.0,
primary) and Natural Earth (fallback) — see `db/migrations/003_jurisdiction_index.sql`.

## Runtime injection examples
```powershell
# local: a vmesh task needing the registry + mapbox
codex-infisical-run.ps1 -SecretPath /supabase/simpleloop,/providers/mapbox -- <command>
```
```bash
# VPS: registry-only
sl-infisical-run /supabase/simpleloop -- <command>
```

## Adding a gated source
When the discovery handoff marks a collection `status=license_gated`, record which provider path supplies
its key here, and have the executor inject that path. Keep this table in sync as new gated providers land.

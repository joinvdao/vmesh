# Sentinel-2 + SEN2SR Offline Pipeline

This folder documents the vmesh server/offline imagery path. It is intentionally not browser code.

## Pipeline Shape

1. Search Earth Search / Element84 STAC for `sentinel-2-l2a` scenes inside the selected H3 AOI, with an optional openEO-compatible backend later allowed for provider-neutral AOI processing when configured.
2. Apply a metadata cloud gate with `eo:cloud_cover <= 10`.
3. Clip only the AOI window needed for the selected U5 or local hub area.
4. Validate AOI clear-pixel ratio from SCL classes; default clear threshold is `0.95`.
5. Run SEN2SRLite on RGB+NIR bands first: `B04`, `B03`, `B02`, `B08`.
6. Preserve CRS, transform, bounds, and source scene IDs.
7. Write source clipped COG, cloud mask COG, SEN2SR output COG, preview PNG, manifest JSON, and optional raster PMTiles/XYZ tiles.
8. Load only the resulting manifest/tile URL in the browser.

The default R&D target is an app-neutral sidecar contract: source Sentinel-2 L2A RGBN at `10 m`, SEN2SRLite RGBN `x4`, derived display pixels at `2.5 m`, and `truthStatus: imagery-inferred-context`.

## vmesh API Handoff

The Next.js app exposes the public planning boundary at:

```text
POST /api/geospatial-package/sentinel-sr
```

The route does not download scenes or run SEN2SR. It creates:

- an Earth Search STAC payload for the worker;
- a cloudless preview tile template for inspection only;
- planned refs for source COG, SCL cloud mask COG, SEN2SR COG, preview PNG, manifest JSON, PMTiles/XYZ tiles, and H3 summary JSON;
- a tile manifest with Sentinel, SEN2SR, cloud QA, license, and limitation metadata;
- a downstream `renderHandoff` object for downstream-app prompt preparation.

Worker completion is separate:

```text
POST /api/geospatial-package/sentinel-sr/complete
Authorization: Bearer <VMESH_SENTINEL_SR_WORKER_TOKEN>
```

Only the authenticated completion route can attach generated tile refs, worker job id, completion time, source scene id, acquisition time, scene cloud cover, and AOI SCL clear-pixel ratio. Public callers cannot supply cloud metrics, output URLs, or relaxed cloud thresholds.

Status meanings:

| Status                | Meaning                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| `planned`             | No generated tile ref yet; run the worker with the inline STAC payload.                                       |
| `validation-required` | Worker evidence or trusted artifact refs are incomplete. Do not send to the renderer.                         |
| `ready`               | Authenticated worker completion exists, trusted tile ref passed URL policy, and scene/AOI cloud gates passed. |
| `blocked-cloud-gate`  | Worker-derived cloud metrics failed; search another scene or create a clean composite.                        |

The downstream render handoff uses role `texture` and remains unavailable until the route reports `ready`. If the renderer does not consume PMTiles directly, the downstream prompt-prep worker should render the AOI into a source-view PNG or equivalent downstream-render-readable media before provider submission.

Ready tile refs must be HTTPS URLs on `VMESH_SENTINEL_SR_ARTIFACT_HOST_ALLOWLIST`. Reject localhost, private IPs, link-local IPs, metadata-service URLs, custom schemes, embedded credentials, and token/signature/API-key query strings. Planned `vmesh-cache://` refs are internal placeholders only.

Do not upscale EOX/cloudless preview JPEG tiles. The real upscaler input is Sentinel-2 L2A RGBN plus SCL cloud QA.

## V1 Boundary

The public Next.js app does not run SEN2SR, PyTorch, rasterio, COG processing, or whole-scene downloads in the browser. The UI can display a manifest-backed raster layer and H3 summaries, but the heavy processing belongs on a local hub node, workstation, or server job.

The upscaler reference is ESAOpenSR/SEN2SR: `https://github.com/ESAOpenSR/SEN2SR`. Use SEN2SRLite first for practical local/server feasibility. Full SEN2SR/Mamba paths can be explored later, but any output remains AI-assisted visual/material context and must not be promoted into terrain, parcels, roads, buildings, emergency certification, or legal boundaries.

## openEO Orchestration Candidate

The OGC openEO API Community Standard is relevant as an optional server-side orchestration layer for EO processing jobs. STAC remains the discovery baseline for V1, but openEO can later express AOI clipping, cloud masks, band math/indices, composites, and export jobs against compatible backends.

Do not call openEO from the browser. Do not assume all backends expose Sentinel-2 L2A, SCL, SEN2SR, or identical processes. Store backend id, process graph version, collection ids, asset ids, dates, CRS/resolution, cloud QA, and export format in the manifest. Outputs remain imagery-inferred context unless separately validated.

## Suggested Python Environment

The first real implementation should use a separate Python environment with:

- `pystac-client`
- `odc-stac` or equivalent COG windowing helpers
- `rasterio`
- `rio-cogeo`
- `torch`
- `sen2sr` / ESAOpenSR SEN2SR checkout
- `morecantile`
- PMTiles or raster tile tooling

Do not commit provider credentials, downloaded scenes, private AOIs, generated COGs, or large tile archives to this repository.

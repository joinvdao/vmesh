# Sentinel-2 + SEN2SR Offline Pipeline

This folder documents the vmesh server/offline imagery path. It is intentionally not browser code.

## Pipeline Shape

1. Search Earth Search / Element84 STAC for `sentinel-2-l2a` scenes inside the selected H3 AOI.
2. Apply a metadata cloud gate with `eo:cloud_cover <= 10`.
3. Clip only the AOI window needed for the selected U5 or local hub area.
4. Validate AOI clear-pixel ratio from SCL classes; default clear threshold is `0.95`.
5. Run SEN2SRLite on RGB+NIR bands first: `B04`, `B03`, `B02`, `B08`.
6. Preserve CRS, transform, bounds, and source scene IDs.
7. Write source clipped COG, cloud mask COG, SEN2SR output COG, preview PNG, manifest JSON, and optional raster PMTiles/XYZ tiles.
8. Load only the resulting manifest/tile URL in the browser.

The default R&D target is an app-neutral sidecar contract: source Sentinel-2 L2A RGBN at `10 m`, SEN2SRLite RGBN `x4`, derived display pixels at `2.5 m`, and `truthStatus: imagery-inferred-context`.

## V1 Boundary

The public Next.js app does not run SEN2SR, PyTorch, rasterio, COG processing, or whole-scene downloads in the browser. The UI can display a manifest-backed raster layer and H3 summaries, but the heavy processing belongs on a local hub node, workstation, or server job.

The upscaler reference is ESAOpenSR/SEN2SR: `https://github.com/ESAOpenSR/SEN2SR`. Use SEN2SRLite first for practical local/server feasibility. Full SEN2SR/Mamba paths can be explored later, but any output remains AI-assisted visual/material context and must not be promoted into terrain, parcels, roads, buildings, emergency certification, or legal boundaries.

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

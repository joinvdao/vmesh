# Research Notes

This document tracks external systems, datasets, and modeling approaches that may inform future vmesh work. Research notes are not implementation commitments; each source still needs licensing, provenance, cost, privacy, and technical review before ingestion.

## Climate Models And Digital Twins

### NASA Earth System Digital Twins

NASA's Earth System Digital Twins work is relevant to vmesh as a model for integrating Earth observations, models, information systems, monitoring, prediction, and decision support.

Reference: `https://esto.nasa.gov/earth-system-digital-twin/`

Potential vmesh relevance:

- Treat large Earth-system models as future macro providers.
- Convert model outputs into H3-derived local attributes.
- Attach model run metadata, forecast horizon, uncertainty, and provenance to every derived score.
- Support climate/weather outputs as both map layers and mesh intelligence.

Potential future provider kinds:

- `climate-digital-twin`
- `weather-ai-model`
- `forecast-grid`
- `downscaled-risk-field`

### NVIDIA Earth-2

NVIDIA Earth-2 is relevant as a reference for AI-accelerated weather and climate modeling, high-resolution downscaling, and digital-twin style climate/weather workflows.

Reference: `https://www.nvidia.com/en-us/high-performance-computing/earth-2/`

Potential vmesh relevance:

- Downscale coarse climate/weather fields into local hex-level signals.
- Derive heat, rainfall, drought, storm, fire-weather, and water-stress attributes per H3 cell.
- Track model family, run date, resolution, confidence, forecast horizon, and limitations.
- Keep Earth-2-style outputs as future provider inputs, not V1 dependencies.

Research question:

- Which climate/weather outputs are reliable enough to influence an antifragility score, and which should remain visual/context-only?

## Biodiversity Models And Datasets

### World Bank Global Biodiversity Data

The World Bank Global Biodiversity Data catalogue entry is relevant as a potential biodiversity macro source. It includes public, CC BY 4.0 biodiversity resources such as species richness, species at risk, extinction risk, species endemism, small occurrence data, and gridded human coexistence indicators.

Reference: `https://datacatalog.worldbank.org/search/dataset/0066034/global-biodiversity-data`

Observed source characteristics:

- Metadata last updated: March 7, 2025.
- License: Creative Commons Attribution 4.0.
- Classification: Public.
- Temporal coverage shown on the catalogue page: 2024.
- Includes CSV resources and a larger ZIP resource for gridded global biodiversity data.
- Resources include terrestrial, freshwater, marine, species global grid, extinction risk, species endemism, and small occurrence datasets.

H3 relevance:

- The catalogue describes gridded/global-grid datasets, but it does not appear to use H3 as its native index.
- vmesh should treat this as a source to normalize into H3, not as a ready-made H3 mesh.
- Future ingestion should map source grid cells or coordinates to H3 cells, preserving the original grid identifier, source resolution, and transformation method.

Potential vmesh-derived attributes:

- Species richness per H3 cell.
- Count of species at risk per H3 cell.
- Endemism indicators.
- Small occurrence indicators.
- Terrestrial/freshwater/marine human coexistence indices.
- Biodiversity confidence score based on source density and spatial resolution.

Implementation requirements before use:

- Confirm resource schema, coordinate/grid system, and source resolution.
- Confirm attribution language required by CC BY 4.0.
- Build a reproducible grid-to-H3 normalization job.
- Preserve original source IDs and transformation metadata.
- Avoid overclaiming precision where source grids are coarse or unevenly sampled.

Research question:

- Which biodiversity signals should affect the antifragility score directly, and which should remain explanatory context?

## Mesh Normalization Rule

External climate, biodiversity, terrain, parcel, raster, and catalogue datasets should not be assumed to use H3. The vmesh ingestion model should support:

- native source geometry or grid ID
- source CRS
- source resolution
- source license and attribution
- source timestamp/version
- transformation method into H3
- overlap/weighting method
- derived H3 cell IDs
- confidence and uncertainty

H3 is the vmesh operating mesh, not a requirement for upstream datasets.

## Open Terrain Tiles

### Mapterhorn PMTiles

Mapterhorn is now the primary V1 open terrain path. vmesh treats it as a `pmtiles-raster-dem` provider with Terrarium RGB elevation encoding and loads the archive directly in the browser through HTTP range requests.

Reference: `https://download.mapterhorn.com/planet.pmtiles`

Potential vmesh relevance:

- Provides a modern no-token terrain archive that can be used by MapLibre `raster-dem`.
- Keeps terrain provider choice in configuration/state rather than renderer-specific branches.
- Establishes the future path for PMTiles terrain packages, STAC/catalog discovery, and source-attribution metadata.

Implementation notes:

- Register the `pmtiles://` protocol once before adding PMTiles terrain sources to MapLibre.
- Keep provider metadata visible through footer/source status and public docs.
- Preserve attribution and upstream dataset notices before any production release.

### Mapzen / Joerd Terrarium

Mapzen/Joerd Terrarium tiles are the no-token V1 fallback terrain path.

Reference: `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`

Potential vmesh relevance:

- Provides an XYZ `raster-dem` fallback with Terrarium encoding.
- Useful for browser verification if PMTiles range requests fail or a PMTiles archive is unavailable.
- Gives vmesh a simple open fallback pattern for other Terrarium-compatible providers.

Research question:

- Which terrain provider should be considered authoritative for public demos versus production deployments once attribution, update cadence, coverage, and reliability are reviewed?

## Resilient Communications

### Reticulum / RNS

Reticulum should be the primary resilient communications stack for vmesh. It is a general-purpose, cryptographic, disruption-tolerant network stack with application APIs, multiple interface types, and user-facing ecosystems such as LXMF, Sideband, Nomad Network, MeshChat, and propagation nodes.

References:

- `https://reticulum.network/manual/reference.html`
- `https://reticulum.network/manual/software.html`
- `https://pypi.org/project/lxmf/`
- `https://reticulum.network/start.html`

Potential vmesh relevance:

- Provides a resilient application-network substrate rather than only a radio chat path.
- Supports low-bandwidth and intermittent networks when configured with suitable interfaces.
- LXMF handles messaging concerns such as routing, queues, receipts, retries, delayed delivery, and end-to-end encryption.
- Reticulum can operate over many media, including TCP/UDP/LAN/internet links and radio/LoRa-style interfaces where suitable hardware and configuration exist.
- A local bridge lets the web app remain a normal Next.js UI while a companion process owns identities, keys, interfaces, and network routing.

Recommended posture:

- Treat Reticulum/RNS as the main vmesh disaster-mode stack.
- Build a local `reticulum-bridge` service before live integration.
- Keep Reticulum private keys, RNS config, contact books, and interface secrets out of the public repo.
- Attach every received message to H3/user-data models with provenance, confidence, trust label, timestamp, and delivery metadata.

### Meshtastic Bridge

Meshtastic remains valuable for interoperability with widely deployed LoRa mesh users and gateway nodes, but vmesh should treat it as a bridge provider rather than the canonical network stack.

References:

- `https://meshtastic.org/docs/software/integrations/mqtt/`
- `https://meshtastic.org/docs/development/device/client-api/`
- `https://meshtastic.org/docs/software/web-client/`
- `https://meshtastic.org/docs/hardware/devices/`

Potential vmesh relevance:

- Lets vmesh exchange short field reports with Meshtastic users and local LoRa meshes.
- Supports local node access over USB/serial, BLE, TCP, or MQTT depending on device and environment.
- Public MQTT can help demos and connected operations, but should not be treated as disaster-primary infrastructure.
- Private gateways can bridge Reticulum-oriented vmesh deployments to local Meshtastic users, with careful filtering and rate limits.

Bridge constraints:

- Meshtastic payloads must be short and conservative.
- Rate limits and deduplication are required to avoid flooding low-bandwidth mesh networks.
- Location precision must be explicit and privacy-preserving.
- A physical Meshtastic node or trusted gateway is required for true LoRa network access.

Research question:

- What is the minimum safe common message schema that can move between Reticulum/LXMF and Meshtastic without overloading radio networks or confusing provenance?

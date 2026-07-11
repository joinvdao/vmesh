# vmesh Phase 35: Non-STAC Domain API Closure

## Goal

Complete typed source discovery and executable recipe coverage for domains that
should not be forced into STAC.

## Domains

- Weather and climate: point forecasts, observations, normals and reanalysis.
- Soils and geology: SoilGrids, SSURGO/gSSURGO and reviewed jurisdictional APIs.
- Roads and access: official transport, Overture and OSM.
- Water/hydrology: official feature services, HydroSHEDS-family products,
  Overture/OSM water and classified water masks.
- Parcels and fields: official cadastral services where legally usable, plus
  explicitly non-legal field-boundary context.

## Required Work

- Add typed API/GeoParquet/ArcGIS/WFS/download-index recipes with bounded AOI
  parameters, timeouts, retries, rate/cost posture and cache guidance.
- Preserve source-specific semantics, units, time validity, confidence and
  license limitations.
- Never represent an address, inferred field, place division or model boundary
  as a legal parcel.
- Mark credentialed, paid, rate-restricted and account-gated sources clearly;
  they cannot become the open default.
- Return explicit gaps where no reviewed source exists.

## Done Bar

The global acceptance matrix receives a ranked result or explicit gap for every
domain. Open-Meteo-style weather context and global soil/road/water context are
queryable without pretending uniform authority or resolution.

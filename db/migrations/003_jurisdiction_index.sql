-- vmesh jurisdiction index — coordinate -> country resolver (PostGIS).
-- Structure only; the polygon DATA (global geoBoundaries CGAZ ADM0, 218 countries) is loaded by the
-- operator runner scripts/vmesh_jurisdiction_index.py (downloads geoBoundaries; Natural Earth fallback).
-- Live state 2026-06-15: jurisdictions=218 (ADM0). ADM1/ADM2 deepening is the upgrade path (JURISDICTION_INDEX.md).
-- Usage: SELECT * FROM vmesh.jurisdiction_at(50.674, -120.327);  -- -> ('ADM0','Canada','CAN', ...)

SET search_path TO public, extensions, vmesh;

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS vmesh.jurisdictions (
  id     serial PRIMARY KEY,
  level  text,                       -- ADM0 (country); ADM1/ADM2 to follow
  name   text,
  iso3   text,
  iso2   text,
  source text,                       -- geoBoundaries-CGAZ-ADM0 | naturalearth-110m-admin0
  geom   geometry(MultiPolygon, 4326)
);

CREATE INDEX IF NOT EXISTS idx_vmesh_jur_geom ON vmesh.jurisdictions USING gist(geom);

CREATE OR REPLACE FUNCTION vmesh.jurisdiction_at(p_lat double precision, p_lon double precision)
RETURNS TABLE(level text, name text, iso3 text, iso2 text)
LANGUAGE sql STABLE AS $jf$
  SELECT j.level, j.name, j.iso3, j.iso2
  FROM vmesh.jurisdictions j
  WHERE ST_Contains(j.geom, ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326))
  ORDER BY j.level
$jf$;

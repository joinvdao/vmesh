# vmesh Phase 33: Global Ecology And Landcover Recipe Closure

## Goal

Return globally available, source-honest landcover and ecological context for
every coordinate while preserving the difference between observed, surveyed,
classified, modelled and inferred information.

## Required Ladder

- Official local/national habitat and landcover surveys where executable.
- Regional products such as NLCD/LANDFIRE where applicable.
- ESA WorldCover and Dynamic World global classified landcover.
- Reviewed global ecoregion/ecozone context.
- Canopy/forest/biomass context such as GEDI or Hansen where coverage applies.
- SoilGrids or other modelled global soil context, separately labelled from
  ecology and from field-survey soil data.

## Required Work

- Emit executable STAC/COG/API recipes and explicit temporal/vintage metadata.
- Preserve classification legend, probability/quality fields, resolution,
  confidence, modelled status and limitations.
- Never turn landcover class into species truth. Species, biodiversity and
  habitat claims require their own reviewed source.
- Return a stable ecological-context decision for downstream visual-pack
  selection without claiming that renderer styling is ecological truth.
- Handle water, desert, ice, urban and no-data classes deterministically.

## Done Bar

The acceptance coordinates from phase 032 all receive an executable global
landcover/ecological-context recipe or an explicit non-land/no-data result.
Regional sources outrank global context only when coverage and recipes are
proven.

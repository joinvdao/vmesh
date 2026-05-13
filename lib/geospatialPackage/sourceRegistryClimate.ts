import type { GeospatialSourceCandidate } from "@/lib/geospatialPackage/types";
import { source } from "@/lib/geospatialPackage/sourceRegistryHelpers";

export function getClimateHydrologyPackageSources(): GeospatialSourceCandidate[] {
  return [
    source({
      id: "open-meteo-forecast",
      label: "Open-Meteo forecast",
      layerIds: ["climate"],
      status: "open",
      artifactKinds: ["api", "h3-summary", "manifest"],
      coverage: "Global point forecasts where Open-Meteo supports variables",
      resolution: "Point forecast at selected H3 centroid",
      sourceUrl: "https://open-meteo.com/en/docs",
      attribution: "Open-Meteo",
      license: "Open-Meteo terms apply",
      mapReady: false,
      packageReady: true,
      priority: 200,
      probeStrategy: "bounded-api",
      truthRole: "weather-context",
      limitations: ["Selected-coordinate call may expose AOI; not an official warning feed."],
      notes: "No-secret selected-cell weather prototype and H3 summary source."
    }),
    source({
      id: "nasa-power-solar-meteo",
      label: "NASA POWER solar and meteorology",
      layerIds: ["climate"],
      status: "preprocessing-required",
      artifactKinds: ["api", "h3-summary", "manifest"],
      coverage: "Global gridded solar/meteo coverage",
      resolution: "Gridded climatology and meteorology products",
      sourceUrl: "https://power.larc.nasa.gov/api/pages/",
      attribution: "NASA POWER",
      license: "NASA POWER terms and citation guidance required",
      packageReady: true,
      priority: 205,
      probeStrategy: "bounded-api",
      truthRole: "solar-meteo-context",
      limitations: ["Planning context, not bankable PV engineering or local station truth."],
      notes: "Solar, cloud, temperature, and wind context provider."
    }),
    source({
      id: "era5-cds-reanalysis",
      label: "ERA5 / Copernicus CDS reanalysis",
      layerIds: ["climate"],
      status: "preprocessing-required",
      artifactKinds: ["zarr", "cog", "h3-summary", "manifest"],
      coverage: "Global",
      resolution: "Reanalysis grids; variable dependent",
      sourceUrl: "https://cds.climate.copernicus.eu/",
      attribution: "Copernicus Climate Data Store / ECMWF",
      license: "CDS license and account terms required",
      requiresApiKey: true,
      packageReady: true,
      priority: 210,
      probeStrategy: "bulk-preprocess",
      truthRole: "climate-reanalysis-context",
      limitations: ["No browser fetches; credentials and preprocessing stay server/local."],
      notes: "Climate normals, wind roses, anomalies, and hazard-context source."
    }),
    source({
      id: "hydrosheds-suite",
      label: "HydroSHEDS / HydroRIVERS / HydroLAKES",
      layerIds: ["hydrology", "water"],
      status: "preprocessing-required",
      artifactKinds: ["vector-tiles", "pmtiles", "h3-summary", "manifest"],
      coverage: "Global",
      resolution: "Hydrography, basins, rivers, and lakes",
      sourceUrl: "https://www.hydrosheds.org/",
      attribution: "HydroSHEDS",
      license: "HydroSHEDS terms and attribution required",
      packageReady: true,
      priority: 230,
      probeStrategy: "bulk-preprocess",
      truthRole: "hydrology-context",
      limitations: ["Context for water networks, not local water-rights or engineering truth."],
      notes: "Global hydrology package candidate."
    })
  ];
}

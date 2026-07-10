import type { GeospatialSourceCandidate, PackageSourceStatus } from "@/lib/geospatialPackage/types";
import { configuredOrFuture, source } from "@/lib/geospatialPackage/sourceRegistryHelpers";

export interface OpenDataPackageSourceOptions {
  sen2srPmtilesUrl?: string;
  mapboxConfigured?: boolean;
}

function mapboxStatus(configured: boolean | undefined): PackageSourceStatus {
  return configured ? "configured" : "token-gated";
}

export function getOpenDataPackageSources(
  options: OpenDataPackageSourceOptions = {}
): GeospatialSourceCandidate[] {
  return [
    source({
      id: "openstreetmap-pbf-extracts",
      label: "OpenStreetMap PBF extracts",
      layerIds: ["roads", "buildings", "water", "landcover", "vegetation"],
      status: "preprocessing-required",
      artifactKinds: ["vector-tiles", "pmtiles", "geoparquet", "h3-summary"],
      coverage: "Global where OSM has mapped features",
      resolution: "Feature-level community mapping",
      sourceUrl: "https://planet.openstreetmap.org/",
      attribution: "OpenStreetMap contributors",
      license: "ODbL; attribution and share-alike obligations apply",
      packageReady: true,
      priority: 110,
      probeStrategy: "bulk-preprocess",
      truthRole: "source-backed-vector",
      limitations: ["Completeness varies by region; do not scrape public raster tiles as data."],
      notes: "Canonical open vector source for roads, paths, water, landuse, and many buildings."
    }),
    source({
      id: "overture-maps-geoparquet",
      label: "Overture Maps GeoParquet",
      layerIds: ["roads", "buildings", "water", "landcover", "parcels"],
      status: "preprocessing-required",
      artifactKinds: ["geoparquet", "vector-tiles", "pmtiles", "h3-summary"],
      coverage: "Global themes where Overture publishes coverage",
      resolution: "Feature-level open map themes",
      sourceUrl: "https://docs.overturemaps.org/",
      attribution: "Overture Maps Foundation and source contributors",
      license: "Open data with per-theme attribution and source terms",
      packageReady: true,
      priority: 112,
      probeStrategy: "bulk-preprocess",
      truthRole: "source-backed-vector",
      limitations: ["Theme coverage varies; parcels still require official cadastral sources."],
      notes:
        "Preferred source for app-ready building, transportation, divisions, places, and base features."
    }),
    source({
      id: "openfreemap-vector-tiles",
      label: "OpenFreeMap OpenMapTiles vector tiles",
      layerIds: ["roads", "buildings", "water", "landcover", "vegetation"],
      status: "open",
      artifactKinds: ["vector-tiles", "api", "manifest"],
      coverage: "Global where OpenStreetMap has mapped features",
      resolution: "Generalized feature-level vector tiles; detail varies by zoom and region",
      sourceUrl: "https://tiles.openfreemap.org/planet",
      attribution: "OpenStreetMap contributors / OpenFreeMap",
      license: "ODbL; preserve OpenStreetMap attribution and share-alike obligations",
      mapReady: true,
      packageReady: true,
      cacheable: false,
      priority: 120,
      probeStrategy: "bounded-api",
      truthRole: "source-backed-vector",
      limitations: [
        "Completeness varies by region and vector-tile generalization can omit source detail.",
        "Render/planning context only; not authoritative parcel, access, hydrology, ecology, or survey evidence.",
        "Respect OpenFreeMap service availability and attribution; VMesh indexes the endpoint rather than storing provider payloads."
      ],
      notes:
        "Fast token-free request-path vector rail. Prefer fuller Overture or raw OSM extraction when the request budget permits."
    }),
    source({
      id: "esa-worldcover",
      label: "ESA WorldCover",
      layerIds: ["landcover", "vegetation", "ecology"],
      status: "preprocessing-required",
      artifactKinds: ["cog", "pmtiles", "h3-summary"],
      coverage: "Global",
      resolution: "10m land cover",
      sourceUrl: "https://esa-worldcover.org/",
      attribution: "ESA WorldCover",
      license: "ESA WorldCover terms and attribution required",
      packageReady: true,
      priority: 150,
      probeStrategy: "bulk-preprocess",
      truthRole: "landcover-context",
      limitations: ["Landcover context, not parcel, crop, ownership, or on-site survey truth."],
      notes: "Default global vegetation and landcover package candidate."
    }),
    source({
      id: "fields-of-the-world",
      label: "Fields of The World",
      layerIds: ["field-boundaries", "vegetation", "landcover"],
      status: "preprocessing-required",
      artifactKinds: ["pmtiles", "geoparquet", "zarr", "cog", "h3-summary"],
      coverage: "Global agricultural field predictions where released",
      resolution: "Sentinel-derived field polygons and prediction products",
      sourceUrl: "https://fieldsofthe.world/",
      attribution: "Fields of The World contributors",
      license: "Source-product license and ethical terms require review",
      packageReady: true,
      priority: 155,
      probeStrategy: "bulk-preprocess",
      truthRole: "predicted-field-boundary",
      limitations: [
        "Predicted agricultural fields are not parcels, ownership boundaries, or legal geometry.",
        "Preserve model year, confidence, source product, and ethical-use notes."
      ],
      notes: "High-value future food-system and agricultural landscape source."
    }),
    source({
      id: "sentinel-2-l2a-earth-search",
      label: "Sentinel-2 L2A STAC / Earth Search",
      layerIds: ["imagery", "vegetation", "ecology", "water", "landcover"],
      status: "preprocessing-required",
      artifactKinds: ["cog", "pmtiles", "raster-tiles", "h3-summary", "manifest"],
      coverage: "Global Sentinel-2 land coverage",
      resolution: "10m to 20m source bands",
      sourceUrl: "https://earth-search.aws.element84.com/v1",
      attribution: "Copernicus Sentinel-2 / Element84 Earth Search",
      license: "Copernicus Sentinel data terms and attribution required",
      packageReady: true,
      priority: 160,
      probeStrategy: "stac-search",
      truthRole: "optical-imagery-context",
      limitations: [
        "Requires cloud masking; imagery is visual/context, not legal or terrain truth."
      ],
      notes: "Primary open optical imagery discovery path."
    }),
    source({
      id: "sentinel-2-sen2sr-pmtiles",
      label: "Sentinel-2 SEN2SR package output",
      layerIds: ["imagery", "vegetation", "ecology", "water", "landcover"],
      status: configuredOrFuture(options.sen2srPmtilesUrl),
      artifactKinds: ["pmtiles", "cog", "h3-summary", "manifest"],
      coverage: "Package AOI only",
      resolution: "AI-assisted display output around 2.5m from 10m Sentinel-2",
      sourceUrl: options.sen2srPmtilesUrl ?? "",
      attribution: "Copernicus Sentinel-2 / ESAOpenSR SEN2SR",
      license: "Sentinel and SEN2SR citation/terms required",
      mapReady: Boolean(options.sen2srPmtilesUrl),
      packageReady: true,
      priority: 162,
      probeStrategy: "configured-local-cache",
      truthRole: "imagery-inferred-context",
      limitations: [
        "Super-resolution can hallucinate detail; do not use for legal or emergency claims."
      ],
      notes: "Optional local/server generated imagery package."
    }),
    source({
      id: "official-parcel-gis",
      label: "Official parcel/cadastral GIS",
      layerIds: ["parcels"],
      status: "preprocessing-required",
      artifactKinds: ["vector-tiles", "pmtiles", "geoparquet", "h3-summary", "manifest"],
      coverage: "Jurisdiction-specific",
      resolution: "Official parcel polygons where published",
      sourceUrl: "",
      attribution: "Dataset-specific cadastral authority",
      license: "Dataset-specific license and legal disclaimers required",
      packageReady: true,
      priority: 300,
      probeStrategy: "catalog-lookup",
      truthRole: "cadastral-context",
      limitations: [
        "Never replace survey/title review; avoid exact private addresses in public outputs."
      ],
      notes: "Only lawful parcel path for public packages; no listing scraping in V1."
    }),
    source({
      id: "mapbox-satellite-global",
      label: "Mapbox Satellite / global ortho-style imagery",
      layerIds: ["imagery", "roads", "buildings"],
      status: mapboxStatus(options.mapboxConfigured),
      access: options.mapboxConfigured ? "token-gated" : "blocked",
      artifactKinds: ["raster-tiles", "vector-tiles"],
      coverage: "Provider-dependent",
      resolution: "Provider-dependent",
      sourceUrl: "mapbox://satellite-global-token-gated",
      attribution: "Mapbox and source contributors",
      license: "Mapbox terms; token required",
      requiresApiKey: true,
      mapReady: Boolean(options.mapboxConfigured),
      packageReady: false,
      cacheable: false,
      priority: 900,
      probeStrategy: "manual-review",
      truthRole: "visual-context",
      limitations: [
        "Not an open-source default; do not commit tokens or paid-provider URLs.",
        "Global ortho-style visual context only unless a reviewed license permits stronger claims."
      ],
      notes: "Optional global visual imagery only when a deployment explicitly accepts terms."
    })
  ];
}

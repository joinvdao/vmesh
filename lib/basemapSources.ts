import type { RasterSourceSpecification, StyleSpecification } from "maplibre-gl";

import { MAPBOX_SATELLITE_PROXY_TILE_URL } from "@/lib/mapboxSatelliteProxy";
import type { BasemapProviderConfig } from "@/lib/vmeshTypes";

export const ENV_BASEMAP_PROVIDER_ID = "env-custom-style";
export const PROTOMAPS_BASEMAP_PROVIDER_ID = "protomaps-pmtiles";
export const OPENFREEMAP_BASEMAP_PROVIDER_ID = "openfreemap-vector";
export const MAPBOX_SATELLITE_BASEMAP_PROVIDER_ID = "mapbox-satellite-basemap";
export const MAPLIBRE_DEMO_BASEMAP_PROVIDER_ID = "maplibre-demo";
export const OFFLINE_SHELL_BASEMAP_PROVIDER_ID = "offline-shell";
export const DEFAULT_OPENFREEMAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
export const DEFAULT_OSM_RASTER_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export interface BasemapProviderRegistryOptions {
  preferredProviderId?: string;
  customStyleUrl?: string;
  protomapsPmtilesUrl?: string;
  mapboxToken?: string;
  mapboxProxyUrl?: string;
}

function withPriority(
  provider: Omit<BasemapProviderConfig, "priority">,
  priority: number
): BasemapProviderConfig {
  return { ...provider, priority };
}

function toPmtilesProtocolUrl(sourceUrl: string): string {
  return sourceUrl.startsWith("pmtiles://") ? sourceUrl : `pmtiles://${sourceUrl}`;
}

function createMapboxSatelliteTileUrl(options: BasemapProviderRegistryOptions): string {
  if (options.mapboxProxyUrl) return options.mapboxProxyUrl;
  if (!options.mapboxToken) return "";

  return `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg90?access_token=${encodeURIComponent(
    options.mapboxToken
  )}`;
}

export function isMapReadyBasemapProvider(provider: BasemapProviderConfig): boolean {
  if (provider.kind === "offline-shell") return true;
  if (!provider.sourceUrl) return false;
  return provider.status === "available" || provider.status === "fallback";
}

export function getBasemapProviderRegistry(
  options: BasemapProviderRegistryOptions = {}
): BasemapProviderConfig[] {
  const configuredProviders: BasemapProviderConfig[] = [];

  if (options.customStyleUrl) {
    configuredProviders.push(
      withPriority(
        {
          id: ENV_BASEMAP_PROVIDER_ID,
          label: "Configured MapLibre style",
          kind: "custom-style-json",
          sourceUrl: options.customStyleUrl,
          attribution: "Project-configured basemap",
          license: "Project-configured",
          requiresApiKey: false,
          status: "available",
          notes: "Highest-priority basemap when NEXT_PUBLIC_BASEMAP_STYLE_URL is configured."
        },
        0
      )
    );
  }

  const protomapsStatus = options.protomapsPmtilesUrl ? "available" : "future";
  const mapboxSatelliteTileUrl = createMapboxSatelliteTileUrl(options);
  const hasMapboxSatelliteAccess = Boolean(mapboxSatelliteTileUrl);
  const registry: BasemapProviderConfig[] = [
    ...configuredProviders,
    withPriority(
      {
        id: PROTOMAPS_BASEMAP_PROVIDER_ID,
        label: "Protomaps PMTiles",
        kind: "protomaps-pmtiles",
        sourceUrl: options.protomapsPmtilesUrl ?? "pmtiles://configure-protomaps-basemap.pmtiles",
        attribution: "OpenStreetMap contributors / Protomaps",
        license: "ODbL-derived basemap; preserve attribution",
        requiresApiKey: false,
        status: protomapsStatus,
        notes:
          "Future/offline-friendly vector basemap in a single PMTiles archive. Configure NEXT_PUBLIC_BASEMAP_PMTILES_URL to enable."
      },
      10
    ),
    withPriority(
      {
        id: OPENFREEMAP_BASEMAP_PROVIDER_ID,
        label: "OpenFreeMap vector",
        kind: "openfreemap-vector",
        sourceUrl: DEFAULT_OPENFREEMAP_STYLE_URL,
        attribution: "OpenStreetMap contributors / OpenFreeMap",
        license: "OpenStreetMap-derived vector tiles; verify service terms for deployment",
        requiresApiKey: false,
        status: "fallback",
        notes: "No-token vector style candidate for richer open geography."
      },
      20
    ),
    withPriority(
      {
        id: MAPBOX_SATELLITE_BASEMAP_PROVIDER_ID,
        label: "Mapbox satellite basemap",
        kind: "mapbox-satellite-raster",
        sourceUrl: mapboxSatelliteTileUrl,
        attribution: "Mapbox satellite imagery",
        license: "Mapbox terms; token required",
        requiresApiKey: true,
        status: hasMapboxSatelliteAccess ? "available" : "requires-api-key",
        notes:
          options.mapboxProxyUrl === MAPBOX_SATELLITE_PROXY_TILE_URL
            ? "Optional source-backed Earth imagery through the server-side Mapbox proxy. Never the public no-token default."
            : "Optional source-backed Earth imagery for deployments with a restricted public Mapbox token or reviewed proxy."
      },
      25
    ),
    withPriority(
      {
        id: MAPLIBRE_DEMO_BASEMAP_PROVIDER_ID,
        label: "MapLibre/OSM raster",
        kind: "maplibre-demo",
        sourceUrl: DEFAULT_OSM_RASTER_URL,
        attribution: "OpenStreetMap contributors",
        license: "OpenStreetMap ODbL; tile usage policy applies",
        requiresApiKey: false,
        status: "available",
        notes:
          "Default operational raster fallback. It keeps the globe nonblank without tokens or paid APIs."
      },
      30
    ),
    withPriority(
      {
        id: OFFLINE_SHELL_BASEMAP_PROVIDER_ID,
        label: "Offline shell",
        kind: "offline-shell",
        sourceUrl: "",
        attribution: "vmesh local shell",
        license: "MIT app shell; no external tile claims",
        requiresApiKey: false,
        status: "fallback",
        notes: "Nonblank local globe surface when no basemap source is reachable."
      },
      99
    )
  ];

  const deduped = registry.filter(
    (provider, index, allProviders) =>
      allProviders.findIndex((candidate) => candidate.id === provider.id) === index
  );

  if (options.preferredProviderId) {
    return deduped.sort((a, b) => {
      if (a.id === ENV_BASEMAP_PROVIDER_ID) return -1;
      if (b.id === ENV_BASEMAP_PROVIDER_ID) return 1;
      if (a.id === options.preferredProviderId) return -1;
      if (b.id === options.preferredProviderId) return 1;
      return a.priority - b.priority;
    });
  }

  return deduped.sort((a, b) => a.priority - b.priority);
}

export function getBasemapProviderCandidates(
  providers: BasemapProviderConfig[],
  preferredProviderId?: string
): BasemapProviderConfig[] {
  const priorityIds = [
    ENV_BASEMAP_PROVIDER_ID,
    preferredProviderId,
    MAPLIBRE_DEMO_BASEMAP_PROVIDER_ID,
    OPENFREEMAP_BASEMAP_PROVIDER_ID,
    MAPBOX_SATELLITE_BASEMAP_PROVIDER_ID,
    PROTOMAPS_BASEMAP_PROVIDER_ID,
    OFFLINE_SHELL_BASEMAP_PROVIDER_ID
  ].filter((id): id is string => Boolean(id));
  const byId = new Map(providers.map((provider) => [provider.id, provider]));
  const ordered: BasemapProviderConfig[] = [];

  priorityIds.forEach((id) => {
    const provider = byId.get(id);
    if (provider && isMapReadyBasemapProvider(provider) && !ordered.includes(provider)) {
      ordered.push(provider);
    }
  });

  providers.forEach((provider) => {
    if (isMapReadyBasemapProvider(provider) && !ordered.includes(provider)) ordered.push(provider);
  });

  return ordered;
}

export function selectBasemapProvider(
  providers: BasemapProviderConfig[],
  preferredProviderId?: string
): BasemapProviderConfig {
  return getBasemapProviderCandidates(providers, preferredProviderId)[0] ?? providers[0];
}

export function createOperationalRasterBasemapStyle(
  provider: BasemapProviderConfig
): StyleSpecification {
  const sources: Record<string, RasterSourceSpecification> = {};

  if (provider.kind !== "offline-shell" && provider.sourceUrl) {
    sources["osm-raster"] = {
      type: "raster",
      tiles: [provider.sourceUrl],
      tileSize: provider.kind === "mapbox-satellite-raster" ? 512 : 256,
      attribution: provider.attribution
    };
  }

  return {
    version: 8,
    name: "vmesh-operational-globe",
    sources,
    layers: [
      {
        id: "background",
        type: "background",
        paint: {
          "background-color": "#020915",
          "background-opacity": 0
        }
      },
      ...(sources["osm-raster"]
        ? [
            {
              id: "osm-raster",
              type: "raster" as const,
              source: "osm-raster",
              paint: {
                "raster-opacity": provider.kind === "mapbox-satellite-raster" ? 0.9 : 0.78,
                "raster-saturation": provider.kind === "mapbox-satellite-raster" ? -0.04 : -0.22,
                "raster-contrast": provider.kind === "mapbox-satellite-raster" ? 0.08 : 0.06,
                "raster-brightness-min": 0,
                "raster-brightness-max": provider.kind === "mapbox-satellite-raster" ? 0.92 : 0.96
              }
            }
          ]
        : [])
    ],
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf"
  };
}

export function createProtomapsBasemapStyle(provider: BasemapProviderConfig): StyleSpecification {
  return {
    version: 8,
    name: "vmesh-protomaps-placeholder",
    sources: {
      protomaps: {
        type: "vector",
        url: toPmtilesProtocolUrl(provider.sourceUrl),
        attribution: provider.attribution
      }
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": "#020915", "background-opacity": 0 }
      },
      {
        id: "earth",
        type: "fill",
        source: "protomaps",
        "source-layer": "earth",
        paint: { "fill-color": "#596b68", "fill-opacity": 0.74 }
      },
      {
        id: "water",
        type: "fill",
        source: "protomaps",
        "source-layer": "water",
        paint: { "fill-color": "#243f52", "fill-opacity": 0.88 }
      },
      {
        id: "roads",
        type: "line",
        source: "protomaps",
        "source-layer": "roads",
        paint: { "line-color": "#a7b5ae", "line-opacity": 0.34, "line-width": 0.7 }
      }
    ],
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf"
  };
}

export function toMapLibreBasemapStyle(
  provider: BasemapProviderConfig
): StyleSpecification | string {
  if (provider.kind === "custom-style-json" || provider.kind === "openfreemap-vector") {
    return provider.sourceUrl;
  }

  if (provider.kind === "protomaps-pmtiles" && provider.status === "available") {
    return createProtomapsBasemapStyle(provider);
  }

  return createOperationalRasterBasemapStyle(provider);
}

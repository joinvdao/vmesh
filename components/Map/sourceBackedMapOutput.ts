import type maplibregl from "maplibre-gl";

import { DEFAULT_OSM_RASTER_URL } from "@/lib/basemapSources";
import { getOssRasterOpacity } from "@/lib/globeViewer";
import type { BasemapProviderConfig } from "@/lib/vmeshTypes";

export const SOURCE_BACKED_RASTER_SOURCE_ID = "osm-raster";
export const SOURCE_BACKED_RASTER_LAYER_ID = "osm-raster";
const MAP_BACKGROUND_LAYER_ID = "background";

type ProjectionCapableMap = maplibregl.Map & {
  setProjection?: (projection: { type: "globe" } | { type: "mercator" }) => void;
};

interface SourceBackedMapCamera {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

interface SourceBackedMapOptions {
  map: maplibregl.Map;
  camera: SourceBackedMapCamera;
  basemapProvider?: BasemapProviderConfig;
  refreshRasterSource?: boolean;
}

function getRasterTileSource(provider?: BasemapProviderConfig) {
  if (provider?.kind === "maplibre-demo" && provider.sourceUrl) {
    return {
      tiles: [provider.sourceUrl],
      attribution: provider.attribution
    };
  }

  return {
    tiles: [DEFAULT_OSM_RASTER_URL],
    attribution: "OpenStreetMap contributors"
  };
}

function setSourceBackedRasterPaint(map: maplibregl.Map, zoom: number) {
  if (!map.getLayer(SOURCE_BACKED_RASTER_LAYER_ID)) return;

  map.setPaintProperty(SOURCE_BACKED_RASTER_LAYER_ID, "raster-opacity", getOssRasterOpacity(zoom));
  map.setPaintProperty(SOURCE_BACKED_RASTER_LAYER_ID, "raster-saturation", -0.18);
  map.setPaintProperty(SOURCE_BACKED_RASTER_LAYER_ID, "raster-contrast", 0.04);
  map.setPaintProperty(SOURCE_BACKED_RASTER_LAYER_ID, "raster-brightness-min", 0.02);
  map.setPaintProperty(SOURCE_BACKED_RASTER_LAYER_ID, "raster-brightness-max", 1);
}

export function setSourceBackedMapBackground(map: maplibregl.Map, active: boolean) {
  if (!map.getLayer(MAP_BACKGROUND_LAYER_ID)) return;

  map.setPaintProperty(MAP_BACKGROUND_LAYER_ID, "background-color", active ? "#dfe8e5" : "#020915");
  map.setPaintProperty(MAP_BACKGROUND_LAYER_ID, "background-opacity", active ? 1 : 0);
}

function refreshSourceBackedRasterLayer(
  map: maplibregl.Map,
  basemapProvider: BasemapProviderConfig | undefined,
  zoom: number
) {
  const source = getRasterTileSource(basemapProvider);

  if (map.getLayer(SOURCE_BACKED_RASTER_LAYER_ID)) {
    map.removeLayer(SOURCE_BACKED_RASTER_LAYER_ID);
  }
  if (map.getSource(SOURCE_BACKED_RASTER_SOURCE_ID)) {
    map.removeSource(SOURCE_BACKED_RASTER_SOURCE_ID);
  }

  map.addSource(SOURCE_BACKED_RASTER_SOURCE_ID, {
    type: "raster",
    tiles: source.tiles,
    tileSize: 256,
    attribution: source.attribution
  });
  map.addLayer({
    id: SOURCE_BACKED_RASTER_LAYER_ID,
    type: "raster",
    source: SOURCE_BACKED_RASTER_SOURCE_ID,
    paint: {
      "raster-opacity": getOssRasterOpacity(zoom),
      "raster-saturation": -0.18,
      "raster-contrast": 0.04,
      "raster-brightness-min": 0.02,
      "raster-brightness-max": 1
    }
  });
}

function queueMapRefresh(map: maplibregl.Map) {
  window.requestAnimationFrame(() => {
    try {
      map.resize();
      map.triggerRepaint();
    } catch {
      // MapLibre can be mid-render during shell transitions; the next queued refresh retries.
    }
  });

  window.setTimeout(() => {
    try {
      map.resize();
      map.triggerRepaint();
    } catch {
      // A resize retry is best-effort because the canvas may already have been removed.
    }
  }, 220);
}

export function applySourceBackedMapOutput({
  map,
  camera,
  basemapProvider,
  refreshRasterSource = false
}: SourceBackedMapOptions) {
  try {
    (map as ProjectionCapableMap).setProjection?.({ type: "mercator" });
  } catch {
    // Projection is optional in older MapLibre builds; camera and source refresh still apply.
  }

  map.stop();
  map.jumpTo({
    center: [camera.longitude, camera.latitude],
    zoom: camera.zoom,
    pitch: camera.pitch,
    bearing: camera.bearing
  });

  try {
    setSourceBackedMapBackground(map, true);
    if (refreshRasterSource || !map.getLayer(SOURCE_BACKED_RASTER_LAYER_ID)) {
      refreshSourceBackedRasterLayer(map, basemapProvider, camera.zoom);
    } else {
      setSourceBackedRasterPaint(map, camera.zoom);
    }
  } catch {
    // Style can be transient during first load; the caller schedules another apply.
  }

  queueMapRefresh(map);
}

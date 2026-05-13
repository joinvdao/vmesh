import type maplibregl from "maplibre-gl";

import { TERRAIN_SOURCE_ID, toRasterDemSource } from "@/lib/terrainSources";
import type { TerrainProviderConfig, TerrainProviderStatus } from "@/lib/vmeshTypes";

export const TERRAIN_HILLSHADE_LAYER_ID = "terrain-hillshade-overlay";

export interface TerrainRuntime {
  applyTerrainCandidate: (startIndex: number, fallbackReason?: string) => boolean;
  clearTerrain: (message?: string) => void;
  getActiveTerrainIndex: () => number;
  getActiveTerrainProvider: () => TerrainProviderConfig | undefined;
  setTerrainCandidates: (candidates: TerrainProviderConfig[]) => void;
}

export function createTerrainRuntime({
  map,
  terrainCandidates: initialTerrainCandidates,
  setActiveTerrainProvider,
  setTerrainStatus
}: {
  map: maplibregl.Map;
  terrainCandidates: TerrainProviderConfig[];
  setActiveTerrainProvider: (providerId: string, message?: string) => void;
  setTerrainStatus: (status: TerrainProviderStatus, message?: string) => void;
}): TerrainRuntime {
  let terrainCandidates = initialTerrainCandidates;
  let activeTerrainIndex = -1;

  const clearTerrainSource = () => {
    if (map.getLayer(TERRAIN_HILLSHADE_LAYER_ID)) {
      map.removeLayer(TERRAIN_HILLSHADE_LAYER_ID);
    }

    if (map.getSource(TERRAIN_SOURCE_ID)) {
      map.setTerrain(null);
      map.removeSource(TERRAIN_SOURCE_ID);
    }
  };

  const addHillshadeOverlay = () => {
    if (map.getLayer(TERRAIN_HILLSHADE_LAYER_ID)) return;

    map.addLayer({
      id: TERRAIN_HILLSHADE_LAYER_ID,
      type: "hillshade",
      source: TERRAIN_SOURCE_ID,
      paint: {
        "hillshade-shadow-color": "#102f39",
        "hillshade-highlight-color": "#edf8f2",
        "hillshade-accent-color": "#5f8c8b",
        "hillshade-exaggeration": 0.24
      }
    });
  };

  const applyTerrainCandidate = (startIndex: number, fallbackReason?: string): boolean => {
    for (let index = startIndex; index < terrainCandidates.length; index += 1) {
      const candidate = terrainCandidates[index];
      const source = toRasterDemSource(candidate);
      if (!source) continue;

      try {
        clearTerrainSource();
        map.addSource(TERRAIN_SOURCE_ID, source);
        map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: 1.5 });
        addHillshadeOverlay();
        activeTerrainIndex = index;

        const status =
          candidate.status === "fallback" || index > 0 || fallbackReason ? "fallback" : "active";
        const message = fallbackReason
          ? `${candidate.label} terrain fallback after ${fallbackReason}`
          : `${candidate.label} terrain active`;

        setActiveTerrainProvider(candidate.id, message);
        setTerrainStatus(status, message);
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Terrain source failed";
        setTerrainStatus("fallback", `${candidate.label} failed: ${message}`);
      }
    }

    setTerrainStatus("unavailable", "No map-ready terrain provider is currently available");
    return false;
  };

  return {
    applyTerrainCandidate,
    clearTerrain: (message = "Terrain overlay hidden") => {
      clearTerrainSource();
      activeTerrainIndex = -1;
      setTerrainStatus("idle", message);
    },
    getActiveTerrainIndex: () => activeTerrainIndex,
    getActiveTerrainProvider: () => terrainCandidates[activeTerrainIndex],
    setTerrainCandidates: (candidates) => {
      terrainCandidates = candidates;
      activeTerrainIndex = -1;
    }
  };
}

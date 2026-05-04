import type maplibregl from "maplibre-gl";

import { TERRAIN_SOURCE_ID, toRasterDemSource } from "@/lib/terrainSources";
import type { TerrainProviderConfig, TerrainProviderStatus } from "@/lib/vmeshTypes";

export interface TerrainRuntime {
  applyTerrainCandidate: (startIndex: number, fallbackReason?: string) => boolean;
  getActiveTerrainIndex: () => number;
  getActiveTerrainProvider: () => TerrainProviderConfig | undefined;
}

export function createTerrainRuntime({
  map,
  terrainCandidates,
  setActiveTerrainProvider,
  setTerrainStatus
}: {
  map: maplibregl.Map;
  terrainCandidates: TerrainProviderConfig[];
  setActiveTerrainProvider: (providerId: string, message?: string) => void;
  setTerrainStatus: (status: TerrainProviderStatus, message?: string) => void;
}): TerrainRuntime {
  let activeTerrainIndex = -1;

  const clearTerrainSource = () => {
    if (map.getSource(TERRAIN_SOURCE_ID)) {
      map.setTerrain(null);
      map.removeSource(TERRAIN_SOURCE_ID);
    }
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
    getActiveTerrainIndex: () => activeTerrainIndex,
    getActiveTerrainProvider: () => terrainCandidates[activeTerrainIndex]
  };
}

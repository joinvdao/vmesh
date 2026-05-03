import type maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";

import type { TerrainProviderConfig } from "@/lib/vmeshTypes";

let pmtilesProtocol: Protocol | null = null;
let pmtilesProtocolReferences = 0;

export function acquirePmtilesProtocol(mapLibre: typeof maplibregl): () => void {
  if (!pmtilesProtocol) {
    pmtilesProtocol = new Protocol({ metadata: true });
    try {
      mapLibre.addProtocol("pmtiles", pmtilesProtocol.tile);
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (!message.includes("already")) {
        throw error;
      }
    }
  }

  pmtilesProtocolReferences += 1;

  return () => {
    pmtilesProtocolReferences = Math.max(0, pmtilesProtocolReferences - 1);
    if (pmtilesProtocolReferences === 0) {
      try {
        mapLibre.removeProtocol("pmtiles");
      } catch {
        // MapLibre may already have cleared protocols during hot reload.
      }
      pmtilesProtocol = null;
    }
  };
}

export function isTerrainError(
  provider: TerrainProviderConfig | undefined,
  message: string
): boolean {
  if (!provider) return false;
  const normalized = message.toLowerCase();
  const providerUrl = provider.sourceUrl.toLowerCase();

  return (
    normalized.includes("terrain") ||
    normalized.includes("dem") ||
    normalized.includes("pmtiles") ||
    normalized.includes("terrarium") ||
    normalized.includes(provider.id.toLowerCase()) ||
    providerUrl.split("/").some((part) => part.length > 5 && normalized.includes(part))
  );
}

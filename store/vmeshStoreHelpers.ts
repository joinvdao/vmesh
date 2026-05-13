import { getAllHexRecords } from "@/data/mockVmeshData";
import type { ActiveLayers, MeshTier, VmeshHexRecord } from "@/lib/vmeshTypes";

export function findHexRecord(
  dataByTier: Record<MeshTier, VmeshHexRecord[]>,
  h3Id: string
): VmeshHexRecord | null {
  return getAllHexRecords(dataByTier).find((record) => record.h3Id === h3Id) ?? null;
}

export function tierForRecord(record: VmeshHexRecord | null, fallback: MeshTier): MeshTier {
  return record?.tier ?? fallback;
}

export function getVisibleHexCount(
  dataByTier: Record<MeshTier, VmeshHexRecord[]>,
  selectedTier: MeshTier,
  activeLayers: ActiveLayers,
  selectedHexId?: string
): number {
  const visibleHexIds = new Set<string>();

  if (selectedHexId) {
    visibleHexIds.add(selectedHexId);
  }

  if (activeLayers.context && selectedTier !== "U3") {
    dataByTier.U3.forEach((record) => visibleHexIds.add(record.h3Id));
  }

  if (activeLayers.macro) {
    dataByTier[selectedTier].forEach((record) => visibleHexIds.add(record.h3Id));
  }

  return visibleHexIds.size;
}

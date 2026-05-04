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
  activeLayers: ActiveLayers
): number {
  const contextCount = activeLayers.context && selectedTier !== "U3" ? dataByTier.U3.length : 0;
  const tierCount = activeLayers.macro ? dataByTier[selectedTier].length : 0;
  return contextCount + tierCount;
}

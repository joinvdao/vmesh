import {
  cellToChildren,
  cellToLatLng,
  cellToParent,
  getResolution,
  gridDisk,
  isValidCell,
  latLngToCell
} from "h3-js";

import type { MeshTier, MeshTierDefinition } from "@/lib/vmeshTypes";

export const MESH_TIER_RESOLUTIONS: Record<MeshTier, number> = {
  U3: 3,
  U5: 5,
  U8: 8
};

export const MESH_TIER_DEFINITIONS: MeshTierDefinition[] = [
  {
    tier: "U3",
    resolution: 3,
    label: "U3 Macro",
    description: "Global and continental context mesh"
  },
  {
    tier: "U5",
    resolution: 5,
    label: "U5 Regional",
    description: "Regional operating mesh and V1 default"
  },
  {
    tier: "U8",
    resolution: 8,
    label: "U8 Local",
    description: "Local detail mesh generated only inside a selected U5"
  }
];

export const DEFAULT_FOCUS = {
  label: "Lisbon, Portugal",
  latitude: 38.7223,
  longitude: -9.1393
};

export const DEFAULT_U5_CELL = latLngToCell(
  DEFAULT_FOCUS.latitude,
  DEFAULT_FOCUS.longitude,
  MESH_TIER_RESOLUTIONS.U5
);

export function meshTierToResolution(tier: MeshTier): number {
  return MESH_TIER_RESOLUTIONS[tier];
}

export function resolutionToMeshTier(resolution: number): MeshTier | null {
  const match = MESH_TIER_DEFINITIONS.find((definition) => definition.resolution === resolution);
  return match?.tier ?? null;
}

export function buildCellFromCoordinate(
  latitude: number,
  longitude: number,
  tier: MeshTier
): string {
  return latLngToCell(latitude, longitude, meshTierToResolution(tier));
}

export function getCellCenter(h3Id: string): { latitude: number; longitude: number } {
  const [latitude, longitude] = cellToLatLng(h3Id);
  return { latitude, longitude };
}

export function getCellParent(h3Id: string, tier: MeshTier): string {
  return cellToParent(h3Id, meshTierToResolution(tier));
}

export function getCellChildren(h3Id: string, tier: MeshTier): string[] {
  return cellToChildren(h3Id, meshTierToResolution(tier));
}

export function getNeighborCells(h3Id: string, radius = 1): string[] {
  return gridDisk(h3Id, radius);
}

export function isValidTierCell(h3Id: string, tier: MeshTier): boolean {
  return isValidCell(h3Id) && getResolution(h3Id) === meshTierToResolution(tier);
}

export function getU5ParentForLocalDetail(h3Id: string): string {
  const resolution = getResolution(h3Id);
  if (resolution === MESH_TIER_RESOLUTIONS.U5) return h3Id;
  return cellToParent(h3Id, MESH_TIER_RESOLUTIONS.U5);
}

export function generateLocalU8Cells(parentU5: string, cap = 48): string[] {
  if (!isValidTierCell(parentU5, "U5")) {
    throw new Error("U8 detail cells must be generated from a valid U5 parent.");
  }

  const children = cellToChildren(parentU5, MESH_TIER_RESOLUTIONS.U8);
  const centerIndex = Math.floor(children.length / 2);
  const centered = [
    children[centerIndex],
    ...children.slice(0, centerIndex),
    ...children.slice(centerIndex + 1)
  ];
  return centered.slice(0, cap);
}

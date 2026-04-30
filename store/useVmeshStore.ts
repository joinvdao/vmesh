"use client";

import { create } from "zustand";

import {
  DEFAULT_SELECTED_HEX_ID,
  generateU8RecordsForParent,
  getAllHexRecords,
  initialHexDataByTier,
  initialUserRecords
} from "@/data/mockVmeshData";
import { DEFAULT_FOCUS, getU5ParentForLocalDetail, MESH_TIER_DEFINITIONS } from "@/lib/h3Mesh";
import { getTerrainProviderRegistry, selectTerrainProvider } from "@/lib/terrainSources";
import type {
  ActiveLayers,
  DraftUserRecord,
  HoveredHexInfo,
  MapStatus,
  MeshTier,
  MeshTierDefinition,
  TerrainProviderConfig,
  TerrainProviderStatus,
  UserRecord,
  VmeshHexRecord,
  ViewState
} from "@/lib/vmeshTypes";

export interface VmeshStore {
  viewState: ViewState;
  selectedHexId: string;
  selectedTier: MeshTier;
  hoveredHexInfo: HoveredHexInfo | null;
  globalResolution: number;
  visibleHexCount: number;
  activeLayers: ActiveLayers;
  layerScale: number;
  meshTiers: MeshTierDefinition[];
  hexDataByTier: Record<MeshTier, VmeshHexRecord[]>;
  selectedHexDetails: VmeshHexRecord;
  userRecords: UserRecord[];
  draftUserRecord: DraftUserRecord;
  mapStatus: MapStatus;
  terrainProviders: TerrainProviderConfig[];
  selectedTerrainProviderId: string;
  dataFreshness: string;
  setViewState: (viewState: Partial<ViewState>) => void;
  selectHex: (h3Id: string, tier?: MeshTier) => void;
  setHoveredHexInfo: (hoveredHexInfo: HoveredHexInfo | null) => void;
  setSelectedTier: (tier: MeshTier) => void;
  setLayerEnabled: (layer: keyof ActiveLayers, enabled: boolean) => void;
  setLayerScale: (layerScale: number) => void;
  setVisibleHexCount: (visibleHexCount: number) => void;
  addUserRecord: () => boolean;
  updateDraftUserRecord: (draft: Partial<DraftUserRecord>) => void;
  clearDraftUserRecord: () => void;
  setMapStatus: (status: Partial<MapStatus>) => void;
  setTerrainStatus: (status: TerrainProviderStatus, message?: string) => void;
}

const terrainProviders = getTerrainProviderRegistry(
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_TERRAIN_TILEJSON_URL : undefined
);
const selectedProvider = selectTerrainProvider(terrainProviders);
const initialSelected =
  getAllHexRecords(initialHexDataByTier).find(
    (record) => record.h3Id === DEFAULT_SELECTED_HEX_ID
  ) ?? initialHexDataByTier.U5[0];

function findHexRecord(
  dataByTier: Record<MeshTier, VmeshHexRecord[]>,
  h3Id: string
): VmeshHexRecord | null {
  return getAllHexRecords(dataByTier).find((record) => record.h3Id === h3Id) ?? null;
}

function tierForRecord(record: VmeshHexRecord | null, fallback: MeshTier): MeshTier {
  return record?.tier ?? fallback;
}

export const useVmeshStore = create<VmeshStore>((set, get) => ({
  viewState: {
    longitude: DEFAULT_FOCUS.longitude,
    latitude: DEFAULT_FOCUS.latitude,
    zoom: 2.35,
    pitch: 28,
    bearing: -12
  },
  selectedHexId: initialSelected.h3Id,
  selectedTier: "U5",
  hoveredHexInfo: null,
  globalResolution: 5,
  visibleHexCount: initialHexDataByTier.U5.length,
  activeLayers: {
    macro: true,
    micro: true,
    userAdded: true,
    terrain: true,
    context: true
  },
  layerScale: 44,
  meshTiers: MESH_TIER_DEFINITIONS,
  hexDataByTier: initialHexDataByTier,
  selectedHexDetails: initialSelected,
  userRecords: initialUserRecords,
  draftUserRecord: {
    category: "observation",
    title: ""
  },
  mapStatus: {
    map: "idle",
    terrain: "idle",
    providerId: selectedProvider.id,
    message: "Terrain source not initialized"
  },
  terrainProviders,
  selectedTerrainProviderId: selectedProvider.id,
  dataFreshness: "15m ago",
  setViewState: (viewState) =>
    set((state) => ({
      viewState: { ...state.viewState, ...viewState }
    })),
  selectHex: (h3Id, tier) =>
    set((state) => {
      const currentRecord = findHexRecord(state.hexDataByTier, h3Id);
      const selectedTier = tier ?? tierForRecord(currentRecord, state.selectedTier);
      let hexDataByTier = state.hexDataByTier;
      let selectedRecord = currentRecord;

      if (selectedTier === "U5") {
        const u8Records = generateU8RecordsForParent(h3Id);
        hexDataByTier = { ...hexDataByTier, U8: u8Records };
      }

      if (selectedTier === "U8") {
        const parentU5 = getU5ParentForLocalDetail(h3Id);
        const u8Records = generateU8RecordsForParent(parentU5);
        hexDataByTier = { ...hexDataByTier, U8: u8Records };
        selectedRecord = u8Records.find((record) => record.h3Id === h3Id) ?? selectedRecord;
      }

      selectedRecord =
        selectedRecord ?? findHexRecord(hexDataByTier, h3Id) ?? state.selectedHexDetails;

      return {
        selectedHexId: selectedRecord.h3Id,
        selectedTier,
        globalResolution: selectedRecord.resolution,
        hexDataByTier,
        selectedHexDetails: selectedRecord,
        visibleHexCount: hexDataByTier[selectedTier].length
      };
    }),
  setHoveredHexInfo: (hoveredHexInfo) => set({ hoveredHexInfo }),
  setSelectedTier: (tier) =>
    set((state) => ({
      selectedTier: tier,
      globalResolution:
        state.meshTiers.find((definition) => definition.tier === tier)?.resolution ??
        state.globalResolution,
      visibleHexCount: state.hexDataByTier[tier].length
    })),
  setLayerEnabled: (layer, enabled) =>
    set((state) => ({
      activeLayers: { ...state.activeLayers, [layer]: enabled }
    })),
  setLayerScale: (layerScale) => set({ layerScale }),
  setVisibleHexCount: (visibleHexCount) => set({ visibleHexCount }),
  addUserRecord: () => {
    const state = get();
    const title = state.draftUserRecord.title.trim();
    if (!title) return false;

    const now = new Date().toISOString();
    const record: UserRecord = {
      id: `local-user-${now.replace(/[^0-9]/g, "")}`,
      category: state.draftUserRecord.category,
      title,
      h3Id: state.selectedHexId,
      visibility: "private-local",
      provenance: "user-added-local",
      confidence: 72,
      createdAt: now,
      updatedAt: now
    };

    set((current) => ({
      userRecords: [record, ...current.userRecords],
      draftUserRecord: { ...current.draftUserRecord, title: "" },
      selectedHexDetails: {
        ...current.selectedHexDetails,
        user: {
          ...current.selectedHexDetails.user,
          observations: current.selectedHexDetails.user.observations + 1
        }
      }
    }));

    return true;
  },
  updateDraftUserRecord: (draft) =>
    set((state) => ({
      draftUserRecord: { ...state.draftUserRecord, ...draft }
    })),
  clearDraftUserRecord: () =>
    set({
      draftUserRecord: {
        category: "observation",
        title: ""
      }
    }),
  setMapStatus: (status) =>
    set((state) => ({
      mapStatus: { ...state.mapStatus, ...status }
    })),
  setTerrainStatus: (terrain, message) =>
    set((state) => ({
      mapStatus: {
        ...state.mapStatus,
        terrain,
        message: message ?? state.mapStatus.message
      }
    }))
}));

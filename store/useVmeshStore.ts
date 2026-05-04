"use client";

import { create } from "zustand";

import {
  DEFAULT_SELECTED_HEX_ID,
  createInitialHubPlaybookState,
  createLocationHexRecord,
  generateU8RecordsForParent,
  initialHexDataByTier,
  initialUserRecords,
  mockFoodNetworkAssets,
  mockHubMessages,
  mockHubNodeStatus,
  mockPropertySignals,
  summarizeFoodNetwork
} from "@/data/mockVmeshData";
import {
  buildCellFromCoordinate,
  DEFAULT_FOCUS,
  getU5ParentForLocalDetail,
  MESH_TIER_DEFINITIONS
} from "@/lib/h3Mesh";
import {
  getContourProviderRegistry,
  getTerrainProviderRegistry,
  selectTerrainProvider
} from "@/lib/terrainSources";
import type {
  ActiveLayers,
  ContourProviderConfig,
  DashboardPanel,
  DraftUserRecord,
  FoodNetworkAsset,
  HubMessageEnvelope,
  HubNodeStatus,
  HubPlaybookState,
  HoveredHexInfo,
  MapFlyToRequest,
  MapStatus,
  MeshTier,
  MeshTierDefinition,
  MicroFoodNetworkSummary,
  PropertySignalSummary,
  TerrainProviderConfig,
  TerrainProviderStatus,
  UserRecord,
  VmeshHexRecord,
  ViewState
} from "@/lib/vmeshTypes";
import { findHexRecord, getVisibleHexCount, tierForRecord } from "@/store/vmeshStoreHelpers";

export interface VmeshStore {
  viewState: ViewState;
  selectedHexId: string;
  selectedTier: MeshTier;
  hoveredHexInfo: HoveredHexInfo | null;
  globalResolution: number;
  visibleHexCount: number;
  activeLayers: ActiveLayers;
  activePanel: DashboardPanel | null;
  layerScale: number;
  meshTiers: MeshTierDefinition[];
  hexDataByTier: Record<MeshTier, VmeshHexRecord[]>;
  selectedHexDetails: VmeshHexRecord;
  userRecords: UserRecord[];
  draftUserRecord: DraftUserRecord;
  mapStatus: MapStatus;
  terrainProviders: TerrainProviderConfig[];
  contourProviders: ContourProviderConfig[];
  selectedTerrainProviderId: string;
  foodNetworkAssets: FoodNetworkAsset[];
  propertySignals: PropertySignalSummary[];
  selectedFoodNetworkSummary: MicroFoodNetworkSummary;
  hubPlaybook: HubPlaybookState;
  hubNodeStatus: HubNodeStatus;
  hubMessages: HubMessageEnvelope[];
  dataFreshness: string;
  flyToRequest: MapFlyToRequest | null;
  setViewState: (viewState: Partial<ViewState>) => void;
  flyToLocation: (location: Omit<MapFlyToRequest, "id">) => void;
  selectHex: (h3Id: string, tier?: MeshTier) => void;
  setActivePanel: (panel: DashboardPanel | null) => void;
  togglePanel: (panel: DashboardPanel) => void;
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
  setContourStatus: (status: TerrainProviderStatus, message?: string) => void;
  setActiveTerrainProvider: (providerId: string, message?: string) => void;
  toggleHubPlaybookTask: (taskId: string) => void;
  updateHubPlaybookTaskNotes: (taskId: string, notes: string) => void;
}

const terrainProviderPreference =
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_TERRAIN_PROVIDER : undefined;
const terrainProviders = getTerrainProviderRegistry({
  envTileJsonUrl:
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_TERRAIN_TILEJSON_URL : undefined,
  preferredProviderId: terrainProviderPreference,
  mapterhornPmtilesUrl:
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_MAPTERHORN_PMTILES_URL : undefined,
  mapzenTerrariumUrl:
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_MAPZEN_TERRARIUM_URL : undefined
});
const selectedProvider = selectTerrainProvider(terrainProviders, terrainProviderPreference);
const contourProviders = getContourProviderRegistry();
const initialSelected =
  findHexRecord(initialHexDataByTier, DEFAULT_SELECTED_HEX_ID) ?? initialHexDataByTier.U5[0];

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
  visibleHexCount: 0,
  activeLayers: {
    macro: false,
    micro: true,
    userAdded: true,
    terrain: true,
    context: false
  },
  activePanel: null,
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
    contours: "fallback",
    providerId: selectedProvider.id,
    message: "Terrain source not initialized"
  },
  terrainProviders,
  contourProviders,
  selectedTerrainProviderId: selectedProvider.id,
  foodNetworkAssets: mockFoodNetworkAssets,
  propertySignals: mockPropertySignals,
  selectedFoodNetworkSummary: summarizeFoodNetwork(initialSelected.h3Id),
  hubPlaybook: createInitialHubPlaybookState(initialSelected.h3Id),
  hubNodeStatus: mockHubNodeStatus,
  hubMessages: mockHubMessages,
  dataFreshness: "15m ago",
  flyToRequest: null,
  setViewState: (viewState) =>
    set((state) => ({
      viewState: { ...state.viewState, ...viewState }
    })),
  flyToLocation: (location) =>
    set((state) => {
      const h3Id = buildCellFromCoordinate(location.latitude, location.longitude, "U5");
      const existingRecord = state.hexDataByTier.U5.find((record) => record.h3Id === h3Id) ?? null;
      const selectedRecord =
        existingRecord ??
        createLocationHexRecord({
          h3Id,
          tier: "U5",
          label: location.label,
          latitude: location.latitude,
          longitude: location.longitude
        });
      const u5Records = existingRecord
        ? state.hexDataByTier.U5
        : [selectedRecord, ...state.hexDataByTier.U5];
      const u8Records = generateU8RecordsForParent(h3Id, selectedRecord.placeName);

      return {
        flyToRequest: {
          ...location,
          id: (state.flyToRequest?.id ?? 0) + 1
        },
        viewState: {
          ...state.viewState,
          longitude: location.longitude,
          latitude: location.latitude,
          zoom: location.zoom,
          pitch: 42,
          bearing: -18
        },
        selectedHexId: selectedRecord.h3Id,
        selectedTier: "U5",
        globalResolution: selectedRecord.resolution,
        hexDataByTier: { ...state.hexDataByTier, U5: u5Records, U8: u8Records },
        selectedHexDetails: selectedRecord,
        selectedFoodNetworkSummary: summarizeFoodNetwork(selectedRecord.h3Id),
        hubPlaybook: {
          ...state.hubPlaybook,
          selectedH3Id: selectedRecord.h3Id,
          tasks: state.hubPlaybook.tasks.map((task) => ({ ...task, h3Id: selectedRecord.h3Id })),
          updatedAt: new Date().toISOString()
        },
        activePanel: "hex",
        visibleHexCount: getVisibleHexCount(
          { ...state.hexDataByTier, U5: u5Records, U8: u8Records },
          "U5",
          state.activeLayers
        )
      };
    }),
  selectHex: (h3Id, tier) =>
    set((state) => {
      const currentRecord = findHexRecord(state.hexDataByTier, h3Id);
      const selectedTier = tier ?? tierForRecord(currentRecord, state.selectedTier);
      let hexDataByTier = state.hexDataByTier;
      let selectedRecord = currentRecord;

      if (selectedTier === "U5") {
        const u8Records = generateU8RecordsForParent(
          h3Id,
          currentRecord?.placeName ?? state.selectedHexDetails.placeName
        );
        hexDataByTier = { ...hexDataByTier, U8: u8Records };
      }

      if (selectedTier === "U8") {
        const parentU5 = getU5ParentForLocalDetail(h3Id);
        const parentRecord = state.hexDataByTier.U5.find((record) => record.h3Id === parentU5);
        const u8Records = generateU8RecordsForParent(
          parentU5,
          parentRecord?.placeName ?? state.selectedHexDetails.placeName
        );
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
        selectedFoodNetworkSummary: summarizeFoodNetwork(selectedRecord.h3Id),
        activePanel: "hex",
        hubPlaybook: {
          ...state.hubPlaybook,
          selectedH3Id: selectedRecord.h3Id,
          tasks: state.hubPlaybook.tasks.map((task) => ({ ...task, h3Id: selectedRecord.h3Id })),
          updatedAt: new Date().toISOString()
        },
        visibleHexCount: getVisibleHexCount(hexDataByTier, selectedTier, state.activeLayers)
      };
    }),
  setActivePanel: (activePanel) => set({ activePanel }),
  togglePanel: (panel) =>
    set((state) => ({
      activePanel: state.activePanel === panel ? null : panel
    })),
  setHoveredHexInfo: (hoveredHexInfo) => set({ hoveredHexInfo }),
  setSelectedTier: (tier) =>
    set((state) => ({
      selectedTier: tier,
      globalResolution:
        state.meshTiers.find((definition) => definition.tier === tier)?.resolution ??
        state.globalResolution,
      visibleHexCount: getVisibleHexCount(state.hexDataByTier, tier, state.activeLayers)
    })),
  setLayerEnabled: (layer, enabled) =>
    set((state) => ({
      activeLayers: { ...state.activeLayers, [layer]: enabled },
      visibleHexCount: getVisibleHexCount(state.hexDataByTier, state.selectedTier, {
        ...state.activeLayers,
        [layer]: enabled
      })
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
    })),
  setContourStatus: (contours, message) =>
    set((state) => ({
      mapStatus: {
        ...state.mapStatus,
        contours,
        message: message ?? state.mapStatus.message
      }
    })),
  setActiveTerrainProvider: (providerId, message) =>
    set((state) => ({
      selectedTerrainProviderId: providerId,
      mapStatus: {
        ...state.mapStatus,
        providerId,
        message: message ?? state.mapStatus.message
      }
    })),
  toggleHubPlaybookTask: (taskId) =>
    set((state) => {
      const tasks = state.hubPlaybook.tasks.map((task) =>
        task.id === taskId ? { ...task, complete: !task.complete } : task
      );
      const readinessScore = Math.round(
        (tasks.filter((task) => task.complete).length / tasks.length) * 100
      );
      return {
        hubPlaybook: {
          ...state.hubPlaybook,
          tasks,
          readinessScore,
          updatedAt: new Date().toISOString()
        }
      };
    }),
  updateHubPlaybookTaskNotes: (taskId, notes) =>
    set((state) => ({
      hubPlaybook: {
        ...state.hubPlaybook,
        tasks: state.hubPlaybook.tasks.map((task) =>
          task.id === taskId ? { ...task, notes } : task
        ),
        updatedAt: new Date().toISOString()
      }
    }))
}));

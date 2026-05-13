"use client";

import { create } from "zustand";

import {
  createLocationHexRecord,
  createMockMacroCellSummary,
  generateU8RecordsForParent,
  summarizeFoodNetwork
} from "@/data/mockVmeshData";
import { buildCellFromCoordinate, getU5ParentForLocalDetail } from "@/lib/h3Mesh";
import { isH3MacroLayer } from "@/lib/layerCatalog";
import type { UserRecord } from "@/lib/vmeshTypes";
import { initialVmeshState } from "@/store/vmeshInitialState";
import { loadSelectedMacroWeatherAction } from "@/store/vmeshMacroActions";
import type { VmeshStore } from "@/store/vmeshStoreTypes";
import { findHexRecord, getVisibleHexCount, tierForRecord } from "@/store/vmeshStoreHelpers";

export const useVmeshStore = create<VmeshStore>((set, get) => ({
  ...initialVmeshState,
  setViewState: (viewState) =>
    set((state) => ({
      viewState: { ...state.viewState, ...viewState }
    })),
  toggleGlobeTheme: () =>
    set((state) => ({
      globeTheme: state.globeTheme === "dark" ? "light" : "dark"
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
      const generatedMacroSummaries = Object.fromEntries(
        [selectedRecord, ...u8Records].map((record) => [
          record.h3Id,
          state.macroSummariesByH3[record.h3Id] ?? createMockMacroCellSummary(record)
        ])
      );
      const macroSummariesByH3 = {
        ...state.macroSummariesByH3,
        ...generatedMacroSummaries
      };

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
        macroSummariesByH3,
        selectedMacroSummary: macroSummariesByH3[selectedRecord.h3Id],
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
          state.activeLayers,
          selectedRecord.h3Id
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
      const generatedMacroSummaries = Object.fromEntries(
        [selectedRecord, ...hexDataByTier.U8].map((record) => [
          record.h3Id,
          state.macroSummariesByH3[record.h3Id] ?? createMockMacroCellSummary(record)
        ])
      );
      const macroSummariesByH3 = {
        ...state.macroSummariesByH3,
        ...generatedMacroSummaries
      };

      return {
        selectedHexId: selectedRecord.h3Id,
        selectedTier,
        globalResolution: selectedRecord.resolution,
        hexDataByTier,
        selectedHexDetails: selectedRecord,
        macroSummariesByH3,
        selectedMacroSummary: macroSummariesByH3[selectedRecord.h3Id],
        selectedFoodNetworkSummary: summarizeFoodNetwork(selectedRecord.h3Id),
        activePanel: "hex",
        hubPlaybook: {
          ...state.hubPlaybook,
          selectedH3Id: selectedRecord.h3Id,
          tasks: state.hubPlaybook.tasks.map((task) => ({ ...task, h3Id: selectedRecord.h3Id })),
          updatedAt: new Date().toISOString()
        },
        visibleHexCount: getVisibleHexCount(
          hexDataByTier,
          selectedTier,
          state.activeLayers,
          selectedRecord.h3Id
        )
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
      visibleHexCount: getVisibleHexCount(
        state.hexDataByTier,
        tier,
        state.activeLayers,
        state.selectedHexId
      )
    })),
  setLayerEnabled: (layer, enabled) =>
    set((state) => ({
      activeLayers: { ...state.activeLayers, [layer]: enabled },
      visibleHexCount: getVisibleHexCount(
        state.hexDataByTier,
        state.selectedTier,
        {
          ...state.activeLayers,
          [layer]: enabled
        },
        state.selectedHexId
      )
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
  setBasemapStatus: (basemap, message) =>
    set((state) => ({
      mapStatus: {
        ...state.mapStatus,
        basemap,
        message: message ?? state.mapStatus.message
      }
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
  setMacroStatus: (macro, message) =>
    set((state) => ({
      mapStatus: {
        ...state.mapStatus,
        macro,
        message: message ?? state.mapStatus.message
      }
    })),
  setImageryStatus: (imagery, message) =>
    set((state) => ({
      mapStatus: {
        ...state.mapStatus,
        imagery,
        message: message ?? state.mapStatus.message
      }
    })),
  setActiveBasemapProvider: (providerId, message) =>
    set((state) => ({
      selectedBasemapProviderId: providerId,
      mapStatus: {
        ...state.mapStatus,
        basemapProviderId: providerId,
        message: message ?? state.mapStatus.message
      }
    })),
  setSelectedTerrainProvider: (providerId) =>
    set((state) => {
      const provider = state.terrainProviders.find((candidate) => candidate.id === providerId);
      return {
        selectedTerrainProviderId: providerId,
        activeLayers: { ...state.activeLayers, terrain: true },
        mapStatus: {
          ...state.mapStatus,
          terrain: "loading",
          providerId,
          message: provider
            ? `Loading ${provider.label} terrain overlay`
            : `Loading ${providerId} terrain overlay`
        }
      };
    }),
  setActiveTerrainProvider: (providerId, message) =>
    set((state) => ({
      selectedTerrainProviderId: providerId,
      mapStatus: {
        ...state.mapStatus,
        providerId,
        message: message ?? state.mapStatus.message
      }
    })),
  setActiveImageryProvider: (providerId, message) =>
    set((state) => ({
      selectedImageryProviderId: providerId,
      mapStatus: {
        ...state.mapStatus,
        imageryProviderId: providerId,
        message: message ?? state.mapStatus.message
      }
    })),
  setSelectedMacroLayer: (selectedMacroLayer) =>
    set((state) => ({
      selectedMacroLayer,
      activeLayers: { ...state.activeLayers, macro: isH3MacroLayer(selectedMacroLayer) },
      visibleHexCount: getVisibleHexCount(
        state.hexDataByTier,
        state.selectedTier,
        {
          ...state.activeLayers,
          macro: isH3MacroLayer(selectedMacroLayer)
        },
        state.selectedHexId
      )
    })),
  setMacroLayerOpacity: (macroLayerOpacity) => set({ macroLayerOpacity }),
  loadSelectedMacroWeather: () => loadSelectedMacroWeatherAction({ get, set }),
  setSelectedImageryLayer: (selectedImageryLayer) =>
    set((state) => ({
      selectedImageryLayer,
      activeLayers: { ...state.activeLayers, imagery: true },
      mapStatus: {
        ...state.mapStatus,
        imagery: "active",
        message: "Imagery layer enabled from manifest-backed provider"
      }
    })),
  setImageryOpacity: (imageryOpacity) => set({ imageryOpacity }),
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

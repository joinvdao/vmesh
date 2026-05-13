import type { StoreApi } from "zustand";

import { createMacroCacheKey, fetchOpenMeteoMacroSummary } from "@/lib/macroSources";
import type { VmeshStore } from "@/store/vmeshStoreTypes";

export async function loadSelectedMacroWeatherAction({
  get,
  set
}: {
  get: StoreApi<VmeshStore>["getState"];
  set: StoreApi<VmeshStore>["setState"];
}) {
  const state = get();
  const cacheKey = createMacroCacheKey({
    providerId: state.selectedMacroProviderId,
    h3Id: state.selectedHexId,
    at: new Date()
  });
  const cached = state.macroCache[cacheKey];
  if (cached) {
    set((current) => ({
      selectedMacroSummary: cached,
      mapStatus: {
        ...current.mapStatus,
        macro: "active",
        macroProviderId: current.selectedMacroProviderId,
        message: "Weather macro layer loaded from in-memory cache"
      }
    }));
    return;
  }

  set((current) => ({
    mapStatus: {
      ...current.mapStatus,
      macro: "loading",
      macroProviderId: current.selectedMacroProviderId,
      message: "Loading selected-cell weather from Open-Meteo"
    }
  }));

  const summary = await fetchOpenMeteoMacroSummary({
    h3Id: state.selectedHexId,
    tier: state.selectedTier,
    resolution: state.selectedHexDetails.resolution,
    centroid: state.selectedMacroSummary.centroid
  });

  if (!summary) {
    set((current) => ({
      mapStatus: {
        ...current.mapStatus,
        macro: "fallback",
        macroProviderId: current.selectedMacroProviderId,
        message: "Open-Meteo unavailable; using deterministic mock macro fallback"
      }
    }));
    return;
  }

  set((current) => ({
    macroCache: { ...current.macroCache, [cacheKey]: summary },
    macroSummariesByH3: { ...current.macroSummariesByH3, [summary.h3Id]: summary },
    selectedMacroSummary: summary,
    dataFreshness: "live",
    mapStatus: {
      ...current.mapStatus,
      macro: "active",
      macroProviderId: current.selectedMacroProviderId,
      message: "Selected-cell weather loaded from Open-Meteo"
    }
  }));
}

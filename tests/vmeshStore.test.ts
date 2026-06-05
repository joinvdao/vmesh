import { describe, expect, it } from "vitest";

import { DEFAULT_SELECTED_HEX_ID, initialHexDataByTier } from "@/data/mockVmeshData";
import { OSS_MAP_OUTPUT_ZOOM } from "@/lib/globeViewer";
import { buildCellFromCoordinate } from "@/lib/h3Mesh";
import { MAPBOX_SATELLITE_PROVIDER_ID } from "@/lib/imagerySources";
import {
  MAPZEN_PROVIDER_ID,
  SOURCE_AUTO_DSM_PROVIDER_ID,
  SOURCE_AUTO_DTM_PROVIDER_ID
} from "@/lib/terrainSources";
import { useVmeshStore } from "@/store/useVmeshStore";

describe("vmesh store", () => {
  it("keeps only the selected-cell affordance visible until an analytical overlay is enabled", () => {
    useVmeshStore.getState().setLayerEnabled("macro", false);
    useVmeshStore.getState().setLayerEnabled("context", false);
    useVmeshStore.getState().setSelectedTier("U3");
    expect(useVmeshStore.getState().selectedTier).toBe("U3");
    expect(useVmeshStore.getState().visibleHexCount).toBe(1);

    useVmeshStore.getState().setLayerEnabled("macro", true);
    expect(useVmeshStore.getState().visibleHexCount).toBeGreaterThanOrEqual(
      initialHexDataByTier.U3.length
    );

    useVmeshStore.getState().setSelectedTier("U5");
    expect(useVmeshStore.getState().selectedTier).toBe("U5");
    expect(useVmeshStore.getState().visibleHexCount).toBe(initialHexDataByTier.U5.length);

    useVmeshStore.getState().setLayerEnabled("context", true);
    expect(useVmeshStore.getState().visibleHexCount).toBe(
      initialHexDataByTier.U5.length + initialHexDataByTier.U3.length
    );

    useVmeshStore.getState().setLayerEnabled("macro", false);
    useVmeshStore.getState().setLayerEnabled("context", false);
  });

  it("selects a U5 hex and keeps local U8 detail scoped", () => {
    useVmeshStore.getState().selectHex(DEFAULT_SELECTED_HEX_ID, "U5");
    const state = useVmeshStore.getState();
    expect(state.selectedHexId).toBe(DEFAULT_SELECTED_HEX_ID);
    expect(state.hexDataByTier.U8.length).toBeLessThanOrEqual(48);
    expect(
      state.hexDataByTier.U8.every((record) => record.parentH3Id === DEFAULT_SELECTED_HEX_ID)
    ).toBe(true);
  });

  it("adds local user records to the selected hex", () => {
    const before = useVmeshStore.getState().userRecords.length;
    useVmeshStore
      .getState()
      .updateDraftUserRecord({ title: "Test local observation", category: "observation" });
    const saved = useVmeshStore.getState().addUserRecord();
    expect(saved).toBe(true);
    expect(useVmeshStore.getState().userRecords.length).toBe(before + 1);
    expect(useVmeshStore.getState().userRecords[0].visibility).toBe("private-local");
  });

  it("creates a fly-to request and updates the camera target", () => {
    useVmeshStore.getState().flyToLocation({
      longitude: -0.1276,
      latitude: 51.5072,
      zoom: 9,
      label: "London"
    });

    const state = useVmeshStore.getState();
    const londonCell = buildCellFromCoordinate(51.5072, -0.1276, "U5");
    expect(state.flyToRequest?.label).toBe("London");
    expect(state.selectedHexId).toBe(londonCell);
    expect(state.selectedHexDetails.placeName).toBe("London");
    expect(state.activePanel).toBeNull();
    expect(state.viewState.longitude).toBeCloseTo(-0.1276);
    expect(state.viewState.latitude).toBeCloseTo(51.5072);
    expect(state.viewState.zoom).toBe(9);
    expect(state.activeLayers.imagery).toBe(true);
    expect(state.mapStatus.message).toContain("satellite-style imagery");
  });

  it("starts an official 1m DTM source coverage check for USA/Canada coordinate searches", () => {
    useVmeshStore.getState().setSelectedTerrainProvider(MAPZEN_PROVIDER_ID);
    useVmeshStore.getState().flyToLocation({
      longitude: -104.9903,
      latitude: 39.7392,
      zoom: 13,
      label: "Denver public test"
    });

    const state = useVmeshStore.getState();
    expect(state.selectedTerrainProviderId).toBe(SOURCE_AUTO_DTM_PROVIDER_ID);
    expect(state.activeLayers.terrain).toBe(true);
    expect(state.mapStatus.providerId).toBe(SOURCE_AUTO_DTM_PROVIDER_ID);
    expect(state.mapStatus.message).toContain("Checking official 1m DTM source coverage");
    expect(state.viewState.zoom).toBeGreaterThan(OSS_MAP_OUTPUT_ZOOM);
    expect(state.flyToRequest?.zoom).toBeGreaterThan(OSS_MAP_OUTPUT_ZOOM);
  });

  it("preserves the official DSM source preview when searching USA/Canada coordinates", () => {
    useVmeshStore.getState().setSelectedTerrainProvider(SOURCE_AUTO_DSM_PROVIDER_ID);
    useVmeshStore.getState().flyToLocation({
      longitude: -104.9903,
      latitude: 39.7392,
      zoom: 13,
      label: "Denver public DSM test"
    });

    const state = useVmeshStore.getState();
    expect(state.selectedTerrainProviderId).toBe(SOURCE_AUTO_DSM_PROVIDER_ID);
    expect(state.activeLayers.terrain).toBe(true);
    expect(state.mapStatus.providerId).toBe(SOURCE_AUTO_DSM_PROVIDER_ID);
    expect(state.mapStatus.message).toContain("Checking official 1m DSM source coverage");
    expect(state.flyToRequest?.zoom).toBeGreaterThan(OSS_MAP_OUTPUT_ZOOM);
  });

  it("toggles dashboard panels without pinning them to the first viewport", () => {
    useVmeshStore.getState().setActivePanel(null);
    expect(useVmeshStore.getState().activePanel).toBeNull();

    useVmeshStore.getState().togglePanel("sources");
    expect(useVmeshStore.getState().activePanel).toBe("sources");

    useVmeshStore.getState().togglePanel("playbook");
    expect(useVmeshStore.getState().activePanel).toBe("playbook");

    useVmeshStore.getState().togglePanel("playbook");
    expect(useVmeshStore.getState().activePanel).toBeNull();
  });

  it("toggles the globe visual theme without changing map providers", () => {
    const beforeProvider = useVmeshStore.getState().selectedTerrainProviderId;
    const beforeTheme = useVmeshStore.getState().globeTheme;
    const beforeBackdrop = useVmeshStore.getState().globeBackdropMode;

    useVmeshStore.getState().toggleGlobeTheme();
    const afterToggle = useVmeshStore.getState();

    expect(afterToggle.globeTheme).toBe(beforeTheme === "dark" ? "light" : "dark");
    expect(afterToggle.selectedTerrainProviderId).toBe(beforeProvider);

    useVmeshStore.getState().toggleGlobeTheme();
    expect(useVmeshStore.getState().globeTheme).toBe(beforeTheme);

    useVmeshStore.getState().cycleGlobeBackdropMode();
    expect(useVmeshStore.getState().globeBackdropMode).not.toBe(beforeBackdrop);
    useVmeshStore.getState().setGlobeBackdropMode("blank");
    expect(useVmeshStore.getState().globeBackdropMode).toBe("blank");
    useVmeshStore.getState().setGlobeBackdropMode(beforeBackdrop);
    expect(useVmeshStore.getState().globeBackdropMode).toBe(beforeBackdrop);
  });

  it("tracks terrain contour status and hub playbook actions in Zustand", () => {
    useVmeshStore.getState().setContourStatus("fallback", "contours pending preprocessing");
    expect(useVmeshStore.getState().mapStatus.contours).toBe("fallback");

    const task = useVmeshStore.getState().hubPlaybook.tasks[1];
    useVmeshStore.getState().toggleHubPlaybookTask(task.id);
    expect(useVmeshStore.getState().hubPlaybook.tasks[1].complete).toBe(!task.complete);

    useVmeshStore.getState().updateHubPlaybookTaskNotes(task.id, "stage filters at hub");
    expect(useVmeshStore.getState().hubPlaybook.tasks[1].notes).toBe("stage filters at hub");
  });

  it("lets users choose the terrain overlay provider at runtime", () => {
    useVmeshStore.getState().setLayerEnabled("terrain", false);
    useVmeshStore.getState().setSelectedTerrainProvider(MAPZEN_PROVIDER_ID);

    const state = useVmeshStore.getState();
    expect(state.selectedTerrainProviderId).toBe(MAPZEN_PROVIDER_ID);
    expect(state.activeLayers.terrain).toBe(true);
    expect(state.mapStatus.terrain).toBe("loading");
    expect(state.mapStatus.providerId).toBe(MAPZEN_PROVIDER_ID);
    expect(state.mapStatus.message).toContain("Mapzen Joerd Terrarium");
  });

  it("keeps micro summaries and hub gateway mocks in store state", () => {
    const state = useVmeshStore.getState();
    expect(state.selectedFoodNetworkSummary.assets).toBeDefined();
    expect(state.propertySignals.every((signal) => signal.approximateLocation.includes("H3"))).toBe(
      true
    );
    expect(state.hubNodeStatus.reticulum.status).toBe("bridge-connected");
    expect(state.hubMessages[0].signaturePlaceholder).toContain("signature");
  });

  it("tracks source layer selection and keeps deferred analysis layers off", () => {
    useVmeshStore.getState().setSelectedMacroLayer("vegetation-ndvi");
    useVmeshStore.getState().setMacroLayerOpacity(0.42);
    useVmeshStore.getState().setSelectedImageryLayer("ndvi");
    useVmeshStore.getState().setImageryOpacity(0.5);

    const state = useVmeshStore.getState();
    expect(state.selectedMacroLayer).toBe("vegetation-ndvi");
    expect(state.activeLayers.macro).toBe(true);
    expect(state.macroLayerOpacity).toBe(0.42);
    expect(state.selectedImageryLayer).toBe("ndvi");
    expect(state.activeLayers.imagery).toBe(true);
    expect(state.imageryManifest.clearPixelRatioAoi).toBeGreaterThanOrEqual(0.95);

    useVmeshStore.getState().setSelectedMacroLayer("climate-weather");
    expect(useVmeshStore.getState().selectedMacroLayer).toBe("terrain-elevation");
    expect(useVmeshStore.getState().activeLayers.macro).toBe(false);

    useVmeshStore.getState().setLayerEnabled("terrain", false);
    useVmeshStore.getState().setSelectedMacroLayer("terrain-elevation");
    expect(useVmeshStore.getState().activeLayers.terrain).toBe(true);

    useVmeshStore.getState().setLayerEnabled("macro", false);
    useVmeshStore.getState().setLayerEnabled("imagery", false);
  });

  it("selects an imagery provider and enables the raster layer", () => {
    useVmeshStore.getState().setLayerEnabled("imagery", false);
    useVmeshStore.getState().setSelectedImageryProvider(MAPBOX_SATELLITE_PROVIDER_ID);

    const state = useVmeshStore.getState();
    expect(state.selectedImageryProviderId).toBe(MAPBOX_SATELLITE_PROVIDER_ID);
    expect(state.activeLayers.imagery).toBe(true);
    expect(state.mapStatus.imagery).toBe("loading");
    expect(state.mapStatus.imageryProviderId).toBe(MAPBOX_SATELLITE_PROVIDER_ID);
    expect(state.mapStatus.message).toContain("Mapbox Satellite");
  });
});

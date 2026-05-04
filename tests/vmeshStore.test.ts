import { describe, expect, it } from "vitest";

import { DEFAULT_SELECTED_HEX_ID, initialHexDataByTier } from "@/data/mockVmeshData";
import { buildCellFromCoordinate } from "@/lib/h3Mesh";
import { useVmeshStore } from "@/store/useVmeshStore";

describe("vmesh store", () => {
  it("keeps the mesh index invisible until an analytical overlay is enabled", () => {
    useVmeshStore.getState().setLayerEnabled("macro", false);
    useVmeshStore.getState().setLayerEnabled("context", false);
    useVmeshStore.getState().setSelectedTier("U3");
    expect(useVmeshStore.getState().selectedTier).toBe("U3");
    expect(useVmeshStore.getState().visibleHexCount).toBe(0);

    useVmeshStore.getState().setLayerEnabled("macro", true);
    expect(useVmeshStore.getState().visibleHexCount).toBe(initialHexDataByTier.U3.length);

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
    expect(state.activePanel).toBe("hex");
    expect(state.viewState.longitude).toBeCloseTo(-0.1276);
    expect(state.viewState.latitude).toBeCloseTo(51.5072);
    expect(state.viewState.zoom).toBe(9);
  });

  it("toggles dashboard panels without pinning them to the first viewport", () => {
    useVmeshStore.getState().setActivePanel(null);
    expect(useVmeshStore.getState().activePanel).toBeNull();

    useVmeshStore.getState().togglePanel("playbook");
    expect(useVmeshStore.getState().activePanel).toBe("playbook");

    useVmeshStore.getState().togglePanel("playbook");
    expect(useVmeshStore.getState().activePanel).toBeNull();
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

  it("keeps micro summaries and hub gateway mocks in store state", () => {
    const state = useVmeshStore.getState();
    expect(state.selectedFoodNetworkSummary.assets).toBeDefined();
    expect(state.propertySignals.every((signal) => signal.approximateLocation.includes("H3"))).toBe(
      true
    );
    expect(state.hubNodeStatus.reticulum.status).toBe("bridge-connected");
    expect(state.hubMessages[0].signaturePlaceholder).toContain("signature");
  });
});

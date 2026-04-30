import { describe, expect, it } from "vitest";

import { DEFAULT_SELECTED_HEX_ID, initialHexDataByTier } from "@/data/mockVmeshData";
import { useVmeshStore } from "@/store/useVmeshStore";

describe("vmesh store", () => {
  it("switches tiers and tracks visible hex counts", () => {
    useVmeshStore.getState().setSelectedTier("U3");
    expect(useVmeshStore.getState().selectedTier).toBe("U3");
    expect(useVmeshStore.getState().visibleHexCount).toBe(initialHexDataByTier.U3.length);

    useVmeshStore.getState().setSelectedTier("U5");
    expect(useVmeshStore.getState().selectedTier).toBe("U5");
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
});

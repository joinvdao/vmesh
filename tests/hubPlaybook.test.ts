import { describe, expect, it } from "vitest";

import { createInitialHubPlaybookState } from "@/data/mockVmeshData";

describe("hub playbook state", () => {
  it("attaches checklist tasks to the selected H3 cell", () => {
    const state = createInitialHubPlaybookState("852a1073fffffff");

    expect(state.active).toBe(true);
    expect(state.tasks.every((task) => task.h3Id === state.selectedH3Id)).toBe(true);
    expect(state.tasks.map((task) => task.dimension)).toContain("comms");
  });
});

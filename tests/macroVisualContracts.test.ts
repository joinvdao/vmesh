import { describe, expect, it } from "vitest";

import { getGlobeViewerMode } from "@/lib/globeViewer";
import { useVmeshStore } from "@/store/useVmeshStore";

describe("macro visual contracts", () => {
  it("distinguishes orbit texture from close source-backed map output", () => {
    expect(getGlobeViewerMode(2.35)).toBe("orbit-globe");
    expect(getGlobeViewerMode(7.2)).toBe("oss-map-output");
  });

  it("loads the fixture macro package as the default broad macro mode", () => {
    const state = useVmeshStore.getState();

    expect(state.macroDataModeLabel).toBe("Fixture package");
    expect(state.macroPackageManifest.mode).toBe("fixture-package");
    expect(state.macroPackageSummary.records.length).toBeGreaterThan(0);
    expect(state.selectedMacroSummary.provenance.sourceType).toBe("fixture");
  });
});

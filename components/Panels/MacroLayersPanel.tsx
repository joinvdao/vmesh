"use client";

import {
  Activity,
  CloudSun,
  Database,
  Flame,
  Leaf,
  Mountain,
  RefreshCw,
  SunMedium,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  getMacroLayerCatalog,
  getMacroLayerCategories,
  getMacroLayersByCategory,
  isH3MacroLayer,
  type MacroLayerCategory
} from "@/lib/layerCatalog";
import { MACRO_LAYER_LABELS } from "@/lib/macroSources";
import { useVmeshStore } from "@/store/useVmeshStore";

const layerCatalog = getMacroLayerCatalog();
const categoryItems = getMacroLayerCategories();

const categoryLabels: Record<MacroLayerCategory, string> = {
  terrain: "Terrain",
  climate: "Climate",
  hazard: "Hazard",
  solar: "Solar",
  vegetation: "Vegetation",
  imagery: "Imagery"
};

const categoryIcons: Record<MacroLayerCategory, LucideIcon> = {
  terrain: Mountain,
  climate: CloudSun,
  hazard: Flame,
  solar: SunMedium,
  vegetation: Leaf,
  imagery: Activity
};

export function MacroLayersPanel() {
  const selectedHexId = useVmeshStore((state) => state.selectedHexId);
  const selectedMacroLayer = useVmeshStore((state) => state.selectedMacroLayer);
  const macroLayerOpacity = useVmeshStore((state) => state.macroLayerOpacity);
  const selectedMacroSummary = useVmeshStore((state) => state.selectedMacroSummary);
  const macroPackageManifest = useVmeshStore((state) => state.macroPackageManifest);
  const macroDataModeLabel = useVmeshStore((state) => state.macroDataModeLabel);
  const activeLayers = useVmeshStore((state) => state.activeLayers);
  const mapStatus = useVmeshStore((state) => state.mapStatus);
  const setActivePanel = useVmeshStore((state) => state.setActivePanel);
  const setLayerEnabled = useVmeshStore((state) => state.setLayerEnabled);
  const setSelectedMacroLayer = useVmeshStore((state) => state.setSelectedMacroLayer);
  const setMacroLayerOpacity = useVmeshStore((state) => state.setMacroLayerOpacity);
  const loadSelectedMacroWeather = useVmeshStore((state) => state.loadSelectedMacroWeather);

  useEffect(() => {
    if (!activeLayers.macro || !["weather", "climate-weather"].includes(selectedMacroLayer)) return;
    const timeout = globalThis.setTimeout(() => {
      void loadSelectedMacroWeather();
    }, 450);
    return () => globalThis.clearTimeout(timeout);
  }, [activeLayers.macro, loadSelectedMacroWeather, selectedHexId, selectedMacroLayer]);

  return (
    <div className="absolute left-6 top-6 z-30 w-[340px] rounded-[12px] border border-[#dfe8e6] bg-white/[0.94] p-4 shadow-[0_24px_80px_rgba(31,53,58,0.18)] backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#52616f]">
            Macro Layers
          </div>
          <div className="mt-1 text-[11px] text-[#7b8893]">
            H3 heat only appears when a layer is enabled.
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setActivePanel(null)}
          aria-label="Close macro layers"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="mb-3 flex items-center justify-between rounded-[8px] border border-[#e3ece9] bg-[#f7fbfa] px-3 py-2 text-xs">
        <span className="font-medium text-[#41515f]">Overlay</span>
        <button
          className={`rounded-[7px] px-2 py-1 text-[10px] font-semibold uppercase ${
            activeLayers.macro ? "bg-[#0f766e] text-white" : "bg-[#eef5f3] text-[#52616f]"
          }`}
          onClick={() => setLayerEnabled("macro", !activeLayers.macro)}
        >
          {activeLayers.macro ? "Visible" : "Hidden"}
        </button>
      </div>

      <div className="max-h-[430px] space-y-3 overflow-y-auto pr-1">
        {categoryItems.map((category) => {
          const CategoryIcon = categoryIcons[category];
          const layers = getMacroLayersByCategory(layerCatalog, category);
          return (
            <section
              key={category}
              className="rounded-[10px] border border-[#e3ece9] bg-[#fbfdfc] p-2"
            >
              <div className="mb-2 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#52616f]">
                <CategoryIcon className="h-3.5 w-3.5 text-[#0f766e]" />
                {categoryLabels[category]}
              </div>
              <div className="grid gap-2">
                {layers.map((item) => {
                  const isActive = selectedMacroLayer === item.id;
                  const rendersH3 = isH3MacroLayer(item.id);
                  return (
                    <button
                      key={item.id}
                      className={`rounded-[8px] border p-3 text-left transition ${
                        isActive
                          ? "border-[#78c8bd] bg-[#e8f6f3] text-[#0f766e]"
                          : "border-[#e3ece9] bg-white text-[#52616f] hover:border-[#b7dcd5]"
                      }`}
                      onClick={() => setSelectedMacroLayer(item.id)}
                    >
                      <div className="flex items-center justify-between gap-2 text-sm font-semibold">
                        <span>{MACRO_LAYER_LABELS[item.id]}</span>
                        <span className="rounded-full bg-[#eef5f3] px-2 py-0.5 text-[9px] font-semibold uppercase text-[#64727d]">
                          {item.sourceType}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] leading-4 text-[#7b8893]">
                        {item.description}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1 text-[9px] font-semibold uppercase">
                        <span className="rounded-full bg-[#f3f7f6] px-2 py-0.5 text-[#64727d]">
                          {item.readiness}
                        </span>
                        <span className="rounded-full bg-[#f3f7f6] px-2 py-0.5 text-[#64727d]">
                          {item.visualizationType}
                        </span>
                        {rendersH3 ? (
                          <span className="rounded-full bg-[#e7f4f1] px-2 py-0.5 text-[#0f766e]">
                            H3 overlay
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-4">
        <div className="mb-2 flex justify-between text-[11px] text-[#6f7d88]">
          <span>Subtle</span>
          <span>Strong</span>
        </div>
        <input
          aria-label="Macro layer opacity"
          type="range"
          min={16}
          max={86}
          value={Math.round(macroLayerOpacity * 100)}
          onChange={(event) => setMacroLayerOpacity(Number(event.target.value) / 100)}
          className="w-full accent-[#2f9b93]"
        />
      </div>

      <div className="mt-4 rounded-[8px] border border-[#e3ece9] bg-[#fbfdfc] p-3 text-xs text-[#52616f]">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-semibold text-[#41515f]">
            <Database className="h-3.5 w-3.5 text-[#0f766e]" />
            Source
          </span>
          <span className="rounded-full bg-[#e7f4f1] px-2 py-1 text-[10px] font-semibold uppercase text-[#0f766e]">
            {selectedMacroSummary.provenance.sourceType}
          </span>
        </div>
        <div className="mt-2 rounded-[8px] bg-[#f7fbfa] p-2">
          <div className="font-semibold text-[#41515f]">{macroDataModeLabel}</div>
          <div className="mt-1 text-[#7b8893]">
            {macroPackageManifest.packageId} | {macroPackageManifest.summaryStats.cellCount} H3
            cells | {macroPackageManifest.mode}
          </div>
        </div>
        <div className="mt-2 leading-5">
          {selectedMacroSummary.provenance.providerLabel} |{" "}
          {selectedMacroSummary.provenance.freshnessLabel} | confidence{" "}
          {selectedMacroSummary.provenance.confidence}%
        </div>
        <div className="mt-2 text-[#7b8893]">{selectedMacroSummary.provenance.limitations}</div>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full gap-2"
          onClick={() => void loadSelectedMacroWeather()}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh weather
        </Button>
      </div>

      <div className="mt-3 text-[11px] text-[#7b8893]">
        Macro provider status: <span className="font-medium text-[#41515f]">{mapStatus.macro}</span>
      </div>
    </div>
  );
}

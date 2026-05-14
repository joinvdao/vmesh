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
    <div className="absolute left-6 top-6 z-30 w-[340px] rounded-[12px] border border-[#B6D9D1] bg-white/[0.94] p-4 shadow-[0_24px_80px_rgba(31,53,58,0.18)] backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5F777C]">
            Macro Layers
          </div>
          <div className="mt-1 text-[11px] text-[#6F8589]">
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

      <div className="mb-3 flex items-center justify-between rounded-[8px] border border-[#D7EAE5] bg-[#F3FBF8] px-3 py-2 text-xs">
        <span className="font-medium text-[#2D545B]">Overlay</span>
        <button
          className={`rounded-[7px] px-2 py-1 text-[10px] font-semibold uppercase ${
            activeLayers.macro ? "bg-[#2DBA91] text-white" : "bg-[#eef5f3] text-[#5F777C]"
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
              className="rounded-[10px] border border-[#D7EAE5] bg-[#FFFFFF] p-2"
            >
              <div className="mb-2 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5F777C]">
                <CategoryIcon className="h-3.5 w-3.5 text-[#2DBA91]" />
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
                          ? "border-[#36DFAE] bg-[#E7F8F2] text-[#2DBA91]"
                          : "border-[#D7EAE5] bg-white text-[#5F777C] hover:border-[#B6D9D1]"
                      }`}
                      onClick={() => setSelectedMacroLayer(item.id)}
                    >
                      <div className="flex items-center justify-between gap-2 text-sm font-semibold">
                        <span>{MACRO_LAYER_LABELS[item.id]}</span>
                        <span className="rounded-full bg-[#eef5f3] px-2 py-0.5 text-[9px] font-semibold uppercase text-[#6F8589]">
                          {item.sourceType}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] leading-4 text-[#6F8589]">
                        {item.description}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1 text-[9px] font-semibold uppercase">
                        <span className="rounded-full bg-[#f3f7f6] px-2 py-0.5 text-[#6F8589]">
                          {item.readiness}
                        </span>
                        <span className="rounded-full bg-[#f3f7f6] px-2 py-0.5 text-[#6F8589]">
                          {item.visualizationType}
                        </span>
                        {rendersH3 ? (
                          <span className="rounded-full bg-[#E7F8F2] px-2 py-0.5 text-[#2DBA91]">
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
        <div className="mb-2 flex justify-between text-[11px] text-[#6F8589]">
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
          className="w-full accent-[#2DBA91]"
        />
      </div>

      <div className="mt-4 rounded-[8px] border border-[#D7EAE5] bg-[#FFFFFF] p-3 text-xs text-[#5F777C]">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-semibold text-[#2D545B]">
            <Database className="h-3.5 w-3.5 text-[#2DBA91]" />
            Source
          </span>
          <span className="rounded-full bg-[#E7F8F2] px-2 py-1 text-[10px] font-semibold uppercase text-[#2DBA91]">
            {selectedMacroSummary.provenance.sourceType}
          </span>
        </div>
        <div className="mt-2 rounded-[8px] bg-[#F3FBF8] p-2">
          <div className="font-semibold text-[#2D545B]">{macroDataModeLabel}</div>
          <div className="mt-1 text-[#6F8589]">
            {macroPackageManifest.packageId} | {macroPackageManifest.summaryStats.cellCount} H3
            cells | {macroPackageManifest.mode}
          </div>
        </div>
        <div className="mt-2 leading-5">
          {selectedMacroSummary.provenance.providerLabel} |{" "}
          {selectedMacroSummary.provenance.freshnessLabel} | confidence{" "}
          {selectedMacroSummary.provenance.confidence}%
        </div>
        <div className="mt-2 text-[#6F8589]">{selectedMacroSummary.provenance.limitations}</div>
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

      <div className="mt-3 text-[11px] text-[#6F8589]">
        Macro provider status: <span className="font-medium text-[#2D545B]">{mapStatus.macro}</span>
      </div>
    </div>
  );
}

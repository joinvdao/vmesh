"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useVmeshStore } from "@/store/useVmeshStore";

const tiers = ["U3", "U5", "U8"] as const;
const layerToggles = [
  { key: "macro", label: "Mesh overlay" },
  { key: "context", label: "Context cells" },
  { key: "micro", label: "Micro data" },
  { key: "terrain", label: "Terrain" }
] as const;

export function LayerScaleControl() {
  const layerScale = useVmeshStore((state) => state.layerScale);
  const selectedTier = useVmeshStore((state) => state.selectedTier);
  const activeLayers = useVmeshStore((state) => state.activeLayers);
  const setActivePanel = useVmeshStore((state) => state.setActivePanel);
  const setLayerEnabled = useVmeshStore((state) => state.setLayerEnabled);
  const setLayerScale = useVmeshStore((state) => state.setLayerScale);
  const setSelectedTier = useVmeshStore((state) => state.setSelectedTier);

  return (
    <div className="absolute right-6 top-6 z-30 w-72 rounded-[12px] border border-[#dfe8e6] bg-white/94 p-4 shadow-[0_24px_80px_rgba(31,53,58,0.18)] backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#52616f]">
          Layer Controls
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setActivePanel(null)}
          aria-label="Close layers"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="mb-3 rounded-[10px] border border-[#e3ece9] bg-[#f7fbfa] p-3 text-[11px] leading-5 text-[#52616f]">
        H3 is the private data index. The visible mesh stays off until you need an analytical
        overlay.
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        {layerToggles.map((layer) => (
          <button
            key={layer.key}
            className={`rounded-[8px] px-2 py-2 text-[10px] font-semibold uppercase ${
              activeLayers[layer.key] ? "bg-[#0f766e] text-white" : "bg-[#eef5f3] text-[#52616f]"
            }`}
            onClick={() => setLayerEnabled(layer.key, !activeLayers[layer.key])}
          >
            {layer.label}
          </button>
        ))}
      </div>

      <div className="mb-2 flex justify-between text-[11px] text-[#6f7d88]">
        <span>Macro</span>
        <span>Micro</span>
      </div>
      <input
        aria-label="Macro to micro layer scale"
        type="range"
        min={0}
        max={100}
        value={layerScale}
        onChange={(event) => setLayerScale(Number(event.target.value))}
        className="w-full accent-[#2f9b93]"
      />

      <div className="mt-4 grid grid-cols-3 gap-2">
        {tiers.map((tier) => (
          <button
            key={tier}
            className={`rounded-[8px] px-2 py-2 text-[10px] font-semibold ${
              selectedTier === tier ? "bg-[#0f766e] text-white" : "bg-[#eef5f3] text-[#52616f]"
            }`}
            onClick={() => setSelectedTier(tier)}
          >
            {tier}
          </button>
        ))}
      </div>
    </div>
  );
}

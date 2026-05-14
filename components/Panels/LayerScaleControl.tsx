"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { isMapReadyBasemapProvider } from "@/lib/basemapSources";
import { useVmeshStore } from "@/store/useVmeshStore";

const tiers = ["U3", "U5", "U8"] as const;
const layerToggles = [
  { key: "macro", label: "Macro heat" },
  { key: "imagery", label: "Imagery" },
  { key: "context", label: "Context cells" },
  { key: "micro", label: "Micro data" },
  { key: "terrain", label: "Terrain" }
] as const;

export function LayerScaleControl() {
  const layerScale = useVmeshStore((state) => state.layerScale);
  const selectedTier = useVmeshStore((state) => state.selectedTier);
  const activeLayers = useVmeshStore((state) => state.activeLayers);
  const basemapProviders = useVmeshStore((state) => state.basemapProviders);
  const selectedBasemapProviderId = useVmeshStore((state) => state.selectedBasemapProviderId);
  const setActivePanel = useVmeshStore((state) => state.setActivePanel);
  const setActiveBasemapProvider = useVmeshStore((state) => state.setActiveBasemapProvider);
  const setLayerEnabled = useVmeshStore((state) => state.setLayerEnabled);
  const setLayerScale = useVmeshStore((state) => state.setLayerScale);
  const setSelectedTier = useVmeshStore((state) => state.setSelectedTier);

  return (
    <div className="vmesh-scrollbar absolute right-6 top-6 z-30 max-h-[calc(100%-48px)] w-72 overflow-y-auto rounded-[12px] border border-[#dfe8e6] bg-white/[0.94] p-4 shadow-[0_24px_80px_rgba(31,53,58,0.18)] backdrop-blur-md">
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

      <div className="mb-4 rounded-[10px] border border-[#e3ece9] bg-white/[0.86] p-3">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#52616f]">
          Base globe
        </div>
        <div className="grid gap-2">
          {basemapProviders.map((provider) => {
            const mapReady = isMapReadyBasemapProvider(provider);
            const selected = selectedBasemapProviderId === provider.id;
            return (
              <button
                key={provider.id}
                className={`rounded-[8px] border px-2 py-2 text-left text-[11px] transition ${
                  selected
                    ? "border-[#78c8bd] bg-[#e8f6f3] text-[#0f766e]"
                    : mapReady
                      ? "border-[#e3ece9] bg-white text-[#52616f] hover:border-[#b7dcd5]"
                      : "border-[#eef2f1] bg-[#f8faf9] text-[#9aa6ad]"
                }`}
                disabled={!mapReady}
                onClick={() =>
                  setActiveBasemapProvider(provider.id, `Switching to ${provider.label}`)
                }
              >
                <span className="block font-semibold">{provider.label}</span>
                <span className="mt-1 block text-[9px] uppercase tracking-[0.08em]">
                  {mapReady ? provider.kind : provider.status}
                </span>
              </button>
            );
          })}
        </div>
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

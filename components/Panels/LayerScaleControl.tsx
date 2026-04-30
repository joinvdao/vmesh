"use client";

import { useVmeshStore } from "@/store/useVmeshStore";

const tiers = ["U3", "U5", "U8"] as const;

export function LayerScaleControl() {
  const layerScale = useVmeshStore((state) => state.layerScale);
  const selectedTier = useVmeshStore((state) => state.selectedTier);
  const setLayerScale = useVmeshStore((state) => state.setLayerScale);
  const setSelectedTier = useVmeshStore((state) => state.setSelectedTier);

  return (
    <div className="absolute right-[350px] top-[148px] z-20 flex h-[286px] w-16 flex-col items-center justify-between rounded-[12px] border border-[#dfe8e6] bg-white/90 px-3 py-4 shadow-[0_14px_35px_rgba(31,53,58,0.12)] backdrop-blur">
      <span className="text-[11px] text-[#6f7d88]">Macro</span>
      <input
        aria-label="Macro to micro layer scale"
        type="range"
        min={0}
        max={100}
        value={layerScale}
        onChange={(event) => setLayerScale(Number(event.target.value))}
        className="h-36 w-2 rotate-90 accent-[#2f9b93]"
      />
      <span className="text-[11px] text-[#6f7d88]">Micro</span>
      <div className="mt-2 grid gap-1">
        {tiers.map((tier) => (
          <button
            key={tier}
            className={`rounded-[6px] px-2 py-1 text-[10px] font-semibold ${
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

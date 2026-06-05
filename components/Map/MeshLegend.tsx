"use client";

import { CircleHelp } from "lucide-react";

import { MACRO_LAYER_LABELS } from "@/lib/macroSources";
import { useVmeshStore } from "@/store/useVmeshStore";

export function MeshLegend() {
  const activeLayers = useVmeshStore((state) => state.activeLayers);
  const selectedMacroLayer = useVmeshStore((state) => state.selectedMacroLayer);

  return (
    <div className="absolute bottom-6 left-6 z-20 w-[280px] rounded-[10px] border border-[#dfe8e6] bg-white/90 p-4 shadow-[0_14px_35px_rgba(31,53,58,0.12)] backdrop-blur">
      <div className="flex items-center gap-2 text-sm font-medium text-[#41515f]">
        {activeLayers.macro ? `${MACRO_LAYER_LABELS[selectedMacroLayer]} Coverage` : "Mesh Data"}
        <CircleHelp className="h-3.5 w-3.5 text-[#7b8893]" />
      </div>
      <div className="mt-4 space-y-3 text-xs text-[#52616f]">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-[3px] bg-[#2f9793]" />
            Source-linked cell
          </span>
          <span>{activeLayers.macro ? "visible" : "context"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-[3px] border border-white bg-[#14b8a6]" />
            Selected cell
          </span>
          <span>active</span>
        </div>
      </div>
    </div>
  );
}

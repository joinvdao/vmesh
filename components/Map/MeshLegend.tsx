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
        {activeLayers.macro ? `${MACRO_LAYER_LABELS[selectedMacroLayer]} Layer` : "Mesh Data Layer"}
        <CircleHelp className="h-3.5 w-3.5 text-[#7b8893]" />
      </div>
      <div
        className={`mt-4 h-5 rounded-[5px] ${
          activeLayers.macro && selectedMacroLayer === "flood"
            ? "bg-gradient-to-r from-[#5096bc] to-[#3d489c]"
            : activeLayers.macro && selectedMacroLayer === "fire"
              ? "bg-gradient-to-r from-[#e8c26f] to-[#ca4a3f]"
              : activeLayers.macro && selectedMacroLayer === "solar"
                ? "bg-gradient-to-r from-[#dfbc53] to-[#a5e6cb]"
                : "bg-gradient-to-r from-[#ead7a5] via-[#339792] to-[#a5e6cb]"
        }`}
      />
      <div className="mt-2 flex justify-between text-[11px] text-[#7b8893]">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
      <div className="mt-3 flex justify-between text-xs text-[#52616f]">
        <span>{activeLayers.macro ? "Low" : "Sparse"}</span>
        <span>{activeLayers.macro ? "High" : "Dense"}</span>
      </div>
    </div>
  );
}

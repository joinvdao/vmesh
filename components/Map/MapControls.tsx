"use client";

import { Crosshair, Download, Link2, Layers3, LocateFixed } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useVmeshStore } from "@/store/useVmeshStore";

const controls = [
  { label: "Recenter", icon: LocateFixed },
  { label: "Target hex", icon: Crosshair },
  { label: "Layers", icon: Layers3 },
  { label: "Copy link", icon: Link2 },
  { label: "Export view", icon: Download }
];

export function MapControls() {
  const activeLayers = useVmeshStore((state) => state.activeLayers);
  const setLayerEnabled = useVmeshStore((state) => state.setLayerEnabled);

  return (
    <div className="absolute left-8 top-8 z-20 flex flex-col gap-2 rounded-[10px] border border-[#dfe8e6] bg-white/90 p-2 shadow-[0_14px_35px_rgba(31,53,58,0.12)] backdrop-blur">
      {controls.map((control) => (
        <Tooltip key={control.label} label={control.label}>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 bg-white text-[#52616f] hover:text-[#0f766e]"
          >
            <control.icon className="h-4 w-4" />
          </Button>
        </Tooltip>
      ))}
      <div className="my-1 h-px bg-[#e6eeec]" />
      {(["macro", "micro", "terrain"] as const).map((layer) => (
        <button
          key={layer}
          className={`rounded-[6px] px-2 py-1 text-[10px] font-semibold uppercase ${
            activeLayers[layer] ? "bg-[#0f766e] text-white" : "bg-white text-[#52616f]"
          }`}
          onClick={() => setLayerEnabled(layer, !activeLayers[layer])}
        >
          {layer}
        </button>
      ))}
    </div>
  );
}

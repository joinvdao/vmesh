"use client";

import { Crosshair, Download, Link2, Layers3, LocateFixed, Mountain } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useVmeshStore } from "@/store/useVmeshStore";

const controls = [
  { label: "Recenter", icon: LocateFixed },
  { label: "Target hex", icon: Crosshair },
  { label: "Copy link", icon: Link2 },
  { label: "Export view", icon: Download }
];

export function MapControls() {
  const activeLayers = useVmeshStore((state) => state.activeLayers);
  const setLayerEnabled = useVmeshStore((state) => state.setLayerEnabled);
  const setActivePanel = useVmeshStore((state) => state.setActivePanel);
  const meshVisible = activeLayers.context;
  const terrainVisible = activeLayers.terrain;

  return (
    <div className="absolute left-6 top-6 z-20 flex flex-col gap-2 rounded-[10px] border border-[#B6D9D1] bg-white/[0.82] p-2 shadow-[0_14px_35px_rgba(31,53,58,0.12)] backdrop-blur">
      <Tooltip label={meshVisible ? "Hide mesh overlay" : "Show mesh overlay"}>
        <Button
          variant="ghost"
          size="icon"
          className={`h-10 w-10 bg-white ${
            meshVisible ? "text-[#2DBA91]" : "text-[#5F777C] hover:text-[#2DBA91]"
          }`}
          onClick={() => setLayerEnabled("context", !meshVisible)}
          aria-pressed={meshVisible}
          aria-label={meshVisible ? "Hide mesh overlay" : "Show mesh overlay"}
        >
          <Layers3 className="h-4 w-4" />
        </Button>
      </Tooltip>
      <Tooltip label="Terrain overlay">
        <Button
          variant="ghost"
          size="icon"
          className={`h-10 w-10 bg-white ${
            terrainVisible ? "text-[#2DBA91]" : "text-[#5F777C] hover:text-[#2DBA91]"
          }`}
          onClick={() => setActivePanel("terrain")}
          aria-pressed={terrainVisible}
          aria-label="Terrain overlay"
        >
          <Mountain className="h-4 w-4" />
        </Button>
      </Tooltip>
      {controls.map((control) => (
        <Tooltip key={control.label} label={control.label}>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 bg-white text-[#5F777C] hover:text-[#2DBA91]"
            onClick={control.label === "Target hex" ? () => setActivePanel("hex") : undefined}
            aria-label={control.label}
          >
            <control.icon className="h-4 w-4" />
          </Button>
        </Tooltip>
      ))}
    </div>
  );
}

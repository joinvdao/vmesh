"use client";

import { CloudSun, Crosshair, Database, Layers3, Mountain, Satellite } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useVmeshStore } from "@/store/useVmeshStore";

export function MapControls() {
  const activeLayers = useVmeshStore((state) => state.activeLayers);
  const setLayerEnabled = useVmeshStore((state) => state.setLayerEnabled);
  const setActivePanel = useVmeshStore((state) => state.setActivePanel);
  const meshVisible = activeLayers.context;
  const terrainVisible = activeLayers.terrain;
  const macroVisible = activeLayers.macro;
  const imageryVisible = activeLayers.imagery;

  return (
    <div className="absolute left-6 top-6 z-20 flex flex-col gap-2 rounded-[10px] border border-[#dfe8e6] bg-white/[0.82] p-2 shadow-[0_14px_35px_rgba(31,53,58,0.12)] backdrop-blur">
      <Tooltip label={macroVisible ? "Hide macro overlay" : "Show macro overlay"}>
        <Button
          variant="ghost"
          size="icon"
          className={`h-10 w-10 bg-white ${
            macroVisible ? "text-[#0f766e]" : "text-[#52616f] hover:text-[#0f766e]"
          }`}
          onClick={() => setLayerEnabled("macro", !macroVisible)}
          aria-pressed={macroVisible}
          aria-label={macroVisible ? "Hide macro overlay" : "Show macro overlay"}
        >
          <CloudSun className="h-4 w-4" />
        </Button>
      </Tooltip>
      <Tooltip label={imageryVisible ? "Hide imagery overlay" : "Show imagery overlay"}>
        <Button
          variant="ghost"
          size="icon"
          className={`h-10 w-10 bg-white ${
            imageryVisible ? "text-[#0f766e]" : "text-[#52616f] hover:text-[#0f766e]"
          }`}
          onClick={() => setLayerEnabled("imagery", !imageryVisible)}
          aria-pressed={imageryVisible}
          aria-label={imageryVisible ? "Hide imagery overlay" : "Show imagery overlay"}
        >
          <Satellite className="h-4 w-4" />
        </Button>
      </Tooltip>
      <Tooltip label={meshVisible ? "Hide mesh overlay" : "Show mesh overlay"}>
        <Button
          variant="ghost"
          size="icon"
          className={`h-10 w-10 bg-white ${
            meshVisible ? "text-[#0f766e]" : "text-[#52616f] hover:text-[#0f766e]"
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
            terrainVisible ? "text-[#0f766e]" : "text-[#52616f] hover:text-[#0f766e]"
          }`}
          onClick={() => setLayerEnabled("terrain", !terrainVisible)}
          aria-pressed={terrainVisible}
          aria-label="Terrain overlay"
        >
          <Mountain className="h-4 w-4" />
        </Button>
      </Tooltip>
      <Tooltip label="Layer and source controls">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 bg-white text-[#52616f] hover:text-[#0f766e]"
          onClick={() => setActivePanel("layers")}
          aria-label="Layer and source controls"
        >
          <Database className="h-4 w-4" />
        </Button>
      </Tooltip>
      <Tooltip label="Target hex">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 bg-white text-[#52616f] hover:text-[#0f766e]"
          onClick={() => setActivePanel("hex")}
          aria-label="Target hex"
        >
          <Crosshair className="h-4 w-4" />
        </Button>
      </Tooltip>
    </div>
  );
}

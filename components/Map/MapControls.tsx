"use client";

import { Crosshair, Download, Link2, Layers3, LocateFixed } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";

const controls = [
  { label: "Recenter", icon: LocateFixed },
  { label: "Target hex", icon: Crosshair },
  { label: "Layers", icon: Layers3 },
  { label: "Copy link", icon: Link2 },
  { label: "Export view", icon: Download }
];

export function MapControls() {
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
    </div>
  );
}

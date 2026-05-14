"use client";

import { Bot, Radio, Router, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useVmeshStore } from "@/store/useVmeshStore";

export function HubNetworkStatusPanel() {
  const hub = useVmeshStore((state) => state.hubNodeStatus);
  const setActivePanel = useVmeshStore((state) => state.setActivePanel);

  const rows = [
    {
      label: "Reticulum",
      value: hub.reticulum.status,
      detail: `${hub.reticulum.reachablePeers} peers`,
      icon: Router
    },
    {
      label: "Meshtastic",
      value: hub.meshtastic.status,
      detail: hub.meshtastic.radioPath,
      icon: Radio
    },
    {
      label: "Local LLM",
      value: hub.localLlm.status,
      detail: hub.localLlm.modelLabel,
      icon: Bot
    }
  ];

  return (
    <Card className="absolute right-6 top-6 z-30 w-80 bg-white/[0.94] p-3 shadow-[0_24px_80px_rgba(31,53,58,0.18)] backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5F777C]">
          Disaster Mode
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-[6px] bg-[#F3FBF8] px-2 py-1 text-[10px] font-semibold uppercase text-[#2DBA91]">
            {hub.lanMode}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setActivePanel(null)}
            aria-label="Close disaster mode"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[18px_1fr_auto] items-center gap-2 rounded-[8px] border border-[#D7EAE5] bg-[#FFFFFF] px-2 py-2 text-xs"
          >
            <row.icon className="h-4 w-4 text-[#2DBA91]" />
            <div className="min-w-0">
              <div className="truncate font-medium text-[#2D545B]">{row.label}</div>
              <div className="truncate text-[10px] text-[#6F8589]">{row.detail}</div>
            </div>
            <span className="text-[10px] text-[#5F777C]">{row.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

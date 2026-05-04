"use client";

import { Bot, Radio, Router } from "lucide-react";

import { Card } from "@/components/ui/card";
import { useVmeshStore } from "@/store/useVmeshStore";

export function HubNetworkStatusPanel() {
  const hub = useVmeshStore((state) => state.hubNodeStatus);

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
    <Card className="absolute left-3 top-[88px] z-20 w-72 bg-white/92 p-3 backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#52616f]">
          Disaster Mode
        </div>
        <span className="rounded-[6px] bg-[#eef8f6] px-2 py-1 text-[10px] font-semibold uppercase text-[#0f766e]">
          {hub.lanMode}
        </span>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[18px_1fr_auto] items-center gap-2 rounded-[8px] border border-[#e6eeec] bg-[#fbfdfc] px-2 py-2 text-xs"
          >
            <row.icon className="h-4 w-4 text-[#0f766e]" />
            <div className="min-w-0">
              <div className="truncate font-medium text-[#41515f]">{row.label}</div>
              <div className="truncate text-[10px] text-[#7b8893]">{row.detail}</div>
            </div>
            <span className="text-[10px] text-[#52616f]">{row.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

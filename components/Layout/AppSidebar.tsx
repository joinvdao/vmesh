"use client";

import {
  BarChart3,
  Bot,
  CloudSun,
  ClipboardList,
  Database,
  Hexagon,
  Layers3,
  MapPlus,
  Mountain,
  Orbit,
  Router,
  Satellite
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import type { DashboardPanel } from "@/lib/vmeshTypes";
import { useVmeshStore } from "@/store/useVmeshStore";

const railItems: {
  label: string;
  icon: LucideIcon;
  panel: DashboardPanel | null;
}[] = [
  { label: "Selected hex", icon: Hexagon, panel: "hex" },
  { label: "Macro layers", icon: CloudSun, panel: "macro" },
  { label: "Terrain", icon: Mountain, panel: "terrain" },
  { label: "Imagery", icon: Satellite, panel: "imagery" },
  { label: "Sources", icon: Database, panel: "sources" },
  { label: "Layers", icon: Layers3, panel: "layers" },
  { label: "Analytics", icon: BarChart3, panel: "analytics" },
  { label: "Add local data", icon: MapPlus, panel: "add-data" },
  { label: "Build a hub", icon: ClipboardList, panel: "playbook" },
  { label: "Disaster mode", icon: Router, panel: "network" }
];

export function AppSidebar() {
  const activePanel = useVmeshStore((state) => state.activePanel);
  const setActivePanel = useVmeshStore((state) => state.setActivePanel);

  return (
    <aside className="absolute bottom-0 left-0 top-0 z-40 flex w-20 flex-col items-center border-r border-[#B6D9D1] bg-white/[0.96] px-3 py-4 shadow-[2px_0_18px_rgba(31,53,58,0.04)] backdrop-blur">
      <Tooltip label="vmesh Atlas of Antifragility">
        <button
          className="flex h-12 w-12 items-center justify-center rounded-[10px] border border-[#B6D9D1] bg-[#f2fbf8] text-[#2DBA91]"
          onClick={() => setActivePanel(null)}
          aria-label="Show globe"
        >
          <Orbit className="h-7 w-7" />
        </button>
      </Tooltip>

      <nav className="mt-7 flex flex-1 flex-col items-center gap-2">
        {railItems.map((item) => {
          const isActive = activePanel === item.panel;
          return (
            <Tooltip key={item.label} label={item.label}>
              <Button
                variant={isActive ? "subtle" : "ghost"}
                size="icon"
                className={`h-11 w-11 rounded-[10px] ${
                  isActive ? "bg-[#E7F8F2] text-[#2DBA91]" : "text-[#5F777C]"
                }`}
                onClick={() => setActivePanel(item.panel)}
                aria-label={item.label}
              >
                <item.icon className="h-5 w-5" />
              </Button>
            </Tooltip>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-3">
        <Tooltip label="Public-safe data boundaries">
          <div className="flex h-10 w-10 items-center justify-center rounded-[9px] border border-[#D7EAE5] bg-[#FFFFFF] text-[#2DBA91]">
            <Database className="h-4 w-4" />
          </div>
        </Tooltip>
        <Tooltip label="Local LLM gateway mock">
          <div className="flex h-10 w-10 items-center justify-center rounded-[9px] border border-[#D7EAE5] bg-[#FFFFFF] text-[#2DBA91]">
            <Bot className="h-4 w-4" />
          </div>
        </Tooltip>
        <div className="h-2 w-2 rounded-full bg-[#36DFAE]" />
      </div>
    </aside>
  );
}

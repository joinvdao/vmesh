"use client";

import {
  Activity,
  Bell,
  BookOpenText,
  Braces,
  ChartColumn,
  Droplet,
  Gauge,
  Globe2,
  Hexagon,
  Landmark,
  MapPinned,
  Orbit,
  Settings,
  Shield,
  SunMedium,
  Zap
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const primaryNav = [
  { label: "Global View", icon: Globe2, active: true },
  { label: "Hex Explorer", icon: Hexagon },
  { label: "Antifragility", icon: Shield },
  { label: "Climate", icon: SunMedium },
  { label: "Energy", icon: Zap },
  { label: "Water", icon: Droplet },
  { label: "Parcels", icon: Landmark },
  { label: "Analytics", icon: ChartColumn }
];

const secondaryNav = [
  { label: "Saved Views", icon: MapPinned },
  { label: "Alerts", icon: Bell, count: 3 },
  { label: "Reports", icon: BookOpenText },
  { label: "API & Data", icon: Braces },
  { label: "Settings", icon: Settings }
];

export function AppSidebar() {
  return (
    <aside className="absolute bottom-0 left-0 top-0 z-40 flex w-64 flex-col border-r border-[#dfe8e6] bg-white px-4 py-5">
      <div className="flex items-center gap-3 px-1">
        <div className="flex h-12 w-12 items-center justify-center rounded-[8px] border border-[#bcded8] bg-[#f2fbf8]">
          <Orbit className="h-7 w-7 text-[#0f766e]" />
        </div>
        <div>
          <div className="text-[20px] font-semibold uppercase tracking-[0.25em] text-[#24323f]">
            vmesh
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f7d88]">
            Atlas of Antifragility
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1 px-14 text-[11px] text-[#6f7d88]">
        <Activity className="h-3.5 w-3.5" />
        Open Mesh
      </div>

      <nav className="mt-6 space-y-1">
        {primaryNav.map((item) => (
          <Button
            key={item.label}
            variant={item.active ? "subtle" : "ghost"}
            className="h-10 w-full justify-start px-3 text-[13px]"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Button>
        ))}
      </nav>

      <Separator className="my-5" />

      <nav className="space-y-1">
        {secondaryNav.map((item) => (
          <Button
            key={item.label}
            variant="ghost"
            className="h-9 w-full justify-start px-3 text-[13px]"
          >
            <item.icon className="h-4 w-4" />
            <span className="flex-1 text-left">{item.label}</span>
            {item.count ? (
              <span className="rounded-[6px] bg-[#dff3ef] px-1.5 py-0.5 text-[11px] text-[#0f766e]">
                {item.count}
              </span>
            ) : null}
          </Button>
        ))}
      </nav>

      <div className="mt-auto space-y-4">
        <div className="flex items-center gap-3 rounded-[8px] border border-[#e2ebe9] bg-[#fbfdfc] p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#d9ebe7] text-sm font-semibold text-[#0f766e]">
            AM
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-[#24323f]">Avery Morgan</div>
            <div className="text-xs text-[#7b8893]">Researcher</div>
          </div>
        </div>

        <div className="rounded-[8px] border border-[#dfe8e6] bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#52616f]">
              System Status
            </span>
            <span className="h-2 w-2 rounded-full bg-[#39a995]" />
          </div>
          <div className="text-xs font-medium text-[#0f766e]">All systems operational</div>
          <div className="mt-3 grid grid-cols-2 gap-y-2 text-xs">
            <span className="text-[#82909b]">Data Freshness</span>
            <span className="text-right text-[#52616f]">15m ago</span>
            <span className="text-[#82909b]">Uptime</span>
            <span className="text-right text-[#52616f]">99.98%</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 h-8 w-full justify-between px-0 text-xs"
          >
            View status page
            <Gauge className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

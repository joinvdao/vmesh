"use client";

import { Bell, ChevronDown, CircleHelp, Filter, Globe2, Search, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";

export function AppHeader() {
  return (
    <header className="absolute left-64 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-[#dfe8e6] bg-white/95 px-4 shadow-[0_2px_18px_rgba(31,53,58,0.04)] backdrop-blur">
      <div className="flex w-[420px] items-center gap-2 rounded-[8px] border border-[#dfe8e6] bg-white px-3 shadow-sm">
        <Search className="h-4 w-4 text-[#6d7b87]" />
        <Input
          className="h-9 border-0 px-0 shadow-none focus:border-0 focus:ring-0"
          placeholder="Search place or coordinates"
        />
        <span className="rounded-[4px] bg-[#f2f6f5] px-1.5 py-0.5 font-mono text-[10px] text-[#7b8893]">
          /
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" className="h-10 px-4">
          <Globe2 className="h-4 w-4" />
          Global
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="sm" className="h-10 px-4">
          <Filter className="h-4 w-4" />
          Filters
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
        <div className="ml-4 flex items-center gap-1 border-l border-[#e6eeec] pl-4">
          <Tooltip label="Notifications">
            <Button variant="ghost" size="icon">
              <Bell className="h-4 w-4" />
            </Button>
          </Tooltip>
          <Tooltip label="Help">
            <Button variant="ghost" size="icon">
              <CircleHelp className="h-4 w-4" />
            </Button>
          </Tooltip>
          <Tooltip label="Settings">
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
        <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#dfe8e6] bg-[#f6faf9] text-xs font-semibold text-[#52616f]">
          AM
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#54b7a7]" />
        </div>
      </div>
    </header>
  );
}

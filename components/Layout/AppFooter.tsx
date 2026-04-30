"use client";

import { Database, Hexagon, Lock, MapPin, ShieldCheck } from "lucide-react";

import { DEFAULT_FOCUS } from "@/lib/h3Mesh";
import { useVmeshStore } from "@/store/useVmeshStore";

export function AppFooter() {
  const selectedTier = useVmeshStore((state) => state.selectedTier);
  const globalResolution = useVmeshStore((state) => state.globalResolution);
  const visibleHexCount = useVmeshStore((state) => state.visibleHexCount);
  const dataFreshness = useVmeshStore((state) => state.dataFreshness);
  const mapStatus = useVmeshStore((state) => state.mapStatus);

  return (
    <footer className="absolute bottom-0 left-64 right-0 z-40 flex h-10 items-center justify-between border-t border-[#dfe8e6] bg-white/95 px-5 text-[11px] text-[#6f7d88] backdrop-blur">
      <div className="flex items-center gap-5">
        <span className="flex items-center gap-2">
          <Hexagon className="h-4 w-4 text-[#2f9b93]" />
          {DEFAULT_FOCUS.latitude.toFixed(4)} deg N, {Math.abs(DEFAULT_FOCUS.longitude).toFixed(4)}{" "}
          deg W
        </span>
        <span>Elev. 77m</span>
        <span>
          {selectedTier} Res {globalResolution}
        </span>
        <span>Hex Count {visibleHexCount.toLocaleString()}</span>
        <span className="flex items-center gap-2">
          <Database className="h-3.5 w-3.5" />
          Data updated {dataFreshness}
        </span>
      </div>

      <div className="flex items-center gap-6">
        <span className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-[#2f9b93]" />
          Terrain {mapStatus.terrain}
        </span>
        <span>Provider {mapStatus.providerId}</span>
        <span>v1.0.0</span>
        <span className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-[#39a995]" />
          Local Secure
        </span>
        <span className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-[#39a995]" />
          Mock Data
        </span>
      </div>
    </footer>
  );
}

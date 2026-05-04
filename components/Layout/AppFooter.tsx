"use client";

import { Database, Hexagon, Lock, MapPin, ShieldCheck } from "lucide-react";

import { useVmeshStore } from "@/store/useVmeshStore";

function formatCoordinate(value: number, positiveHemisphere: string, negativeHemisphere: string) {
  return `${Math.abs(value).toFixed(4)} deg ${value >= 0 ? positiveHemisphere : negativeHemisphere}`;
}

export function AppFooter() {
  const selectedTier = useVmeshStore((state) => state.selectedTier);
  const globalResolution = useVmeshStore((state) => state.globalResolution);
  const visibleHexCount = useVmeshStore((state) => state.visibleHexCount);
  const dataFreshness = useVmeshStore((state) => state.dataFreshness);
  const mapStatus = useVmeshStore((state) => state.mapStatus);
  const viewState = useVmeshStore((state) => state.viewState);

  return (
    <footer className="absolute bottom-0 left-64 right-0 z-40 flex h-10 items-center justify-between border-t border-[#dfe8e6] bg-white/95 px-5 text-[11px] text-[#6f7d88] backdrop-blur">
      <div className="flex items-center gap-5">
        <span className="flex items-center gap-2">
          <Hexagon className="h-4 w-4 text-[#2f9b93]" />
          {formatCoordinate(viewState.latitude, "N", "S")},{" "}
          {formatCoordinate(viewState.longitude, "E", "W")}
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
        <span>Contours {mapStatus.contours}</span>
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

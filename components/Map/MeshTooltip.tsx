"use client";

import { useVmeshStore } from "@/store/useVmeshStore";

export function MeshTooltip() {
  const hovered = useVmeshStore((state) => state.hoveredHexInfo);
  const hexDataByTier = useVmeshStore((state) => state.hexDataByTier);

  if (!hovered) return null;

  const record = hexDataByTier[hovered.tier].find((hex) => hex.h3Id === hovered.h3Id);
  if (!record) return null;

  return (
    <div
      className="pointer-events-none absolute z-30 w-56 rounded-[8px] border border-[#dfe8e6] bg-white/95 p-3 text-xs text-[#52616f] shadow-[0_18px_40px_rgba(31,53,58,0.18)] backdrop-blur"
      style={{ left: hovered.x + 16, top: hovered.y + 16 }}
    >
      <div className="font-mono text-[11px] text-[#24323f]">{record.h3Id}</div>
      <div className="mt-1">{record.placeName}</div>
      <div className="mt-2 flex items-center justify-between">
        <span>{record.tier} mesh</span>
        <span className="font-semibold text-[#0f766e]">{record.antifragilityScore}/100</span>
      </div>
    </div>
  );
}

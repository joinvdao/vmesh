"use client";

import type { MouseEvent, PointerEvent } from "react";
import { Map, RotateCcw } from "lucide-react";

import type { GlobeViewerMode } from "@/lib/globeViewer";
import { getApproxAltitudeKm, getViewerZoomPercent } from "@/lib/globeViewer";

interface GlobeModeHudProps {
  mode: GlobeViewerMode;
  zoom: number;
  basemapLabel: string;
  onBackToGlobe: () => void;
}

export function GlobeModeHud({ mode, zoom, basemapLabel, onBackToGlobe }: GlobeModeHudProps) {
  const isMapOutput = mode === "oss-map-output";
  const handleBackToGlobe = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onBackToGlobe();
  };
  const handleMouseBackToGlobe = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onBackToGlobe();
  };

  return (
    <div className="absolute bottom-6 left-6 z-20 w-60 rounded-[10px] border border-[#dce8e6] bg-white/[0.84] p-3 text-[#24323f] shadow-[0_18px_45px_rgba(0,0,0,0.18)] backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#697985]">
            {isMapOutput ? "OSS Map Output" : "Orbit Globe"}
          </div>
          <div className="mt-1 text-sm font-semibold text-[#15303f]">
            {isMapOutput ? "MapLibre detail view" : "Three.js atlas sphere"}
          </div>
          <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.1em] text-[#6d7d88]">
            {isMapOutput ? "Source-backed map output" : "Visual orbit mode"}
          </div>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#cfe1de] bg-[#f3fbfa] text-[#0f766e]">
          <Map className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[#60717e]">
        <div className="rounded-[6px] border border-[#dce8e6] bg-white/80 p-2">
          <div className="uppercase tracking-[0.14em] text-[#8a9aa5]">Altitude</div>
          <div className="mt-1 font-mono text-[#203846]">
            {getApproxAltitudeKm(zoom).toLocaleString()} km
          </div>
        </div>
        <div className="rounded-[6px] border border-[#dce8e6] bg-white/80 p-2">
          <div className="uppercase tracking-[0.14em] text-[#8a9aa5]">Zoom</div>
          <div className="mt-1 font-mono text-[#203846]">{getViewerZoomPercent(zoom)}%</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#dce8e6] pt-2 text-[11px] text-[#6d7d88]">
        <span className="truncate">{basemapLabel}</span>
        {isMapOutput ? (
          <button
            type="button"
            onClick={onBackToGlobe}
            onMouseDown={handleMouseBackToGlobe}
            onPointerDown={handleBackToGlobe}
            className="flex shrink-0 items-center gap-1 rounded-[6px] border border-[#c8ddda] bg-white px-2 py-1 font-semibold text-[#0f766e] transition hover:border-[#92c9c1] hover:bg-[#ecf8f6]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Globe
          </button>
        ) : (
          <span className="font-medium text-[#0f766e]">Drag to spin</span>
        )}
      </div>
    </div>
  );
}

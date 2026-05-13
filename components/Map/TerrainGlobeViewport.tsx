"use client";

import type { RefObject } from "react";

import { EarthGlobeFallback } from "@/components/Map/EarthGlobeFallback";
import { GlobeStageBackdrop } from "@/components/Map/GlobeStageBackdrop";
import type { SelectedMarkerPosition } from "@/components/Map/globeRuntime";
import { SelectedCellMarker } from "@/components/Map/SelectedCellMarker";
import type { GlobeViewerMode } from "@/lib/globeViewer";
import type { GlobeTheme } from "@/lib/vmeshTypes";

interface TerrainGlobeViewportProps {
  globeShellRef: RefObject<HTMLDivElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  globeShellClassName: string;
  viewerMode: GlobeViewerMode;
  globeTheme: GlobeTheme;
  mapOpacity: string;
  selectedMarkerPosition: SelectedMarkerPosition | null;
}

export function TerrainGlobeViewport({
  globeShellRef,
  containerRef,
  globeShellClassName,
  viewerMode,
  globeTheme,
  mapOpacity,
  selectedMarkerPosition
}: TerrainGlobeViewportProps) {
  const isMapOutput = viewerMode === "oss-map-output";
  const mapToneClass = isMapOutput
    ? globeTheme === "dark"
      ? "brightness-[0.98] contrast-[1.08] saturate-[0.95]"
      : "brightness-[1.08] contrast-[0.96] saturate-[1.04]"
    : globeTheme === "dark"
      ? "mix-blend-soft-light brightness-[0.92] contrast-[1.08] saturate-[0.8]"
      : "mix-blend-multiply brightness-[1.16] contrast-[0.94] saturate-[1.08]";

  return (
    <>
      <GlobeStageBackdrop globeTheme={globeTheme} viewerMode={viewerMode} />
      <div ref={globeShellRef} className={globeShellClassName}>
        <EarthGlobeFallback />
        <div className="vmesh-globe-inner-ring pointer-events-none absolute inset-[6%] z-10 rounded-full border border-[#7faad1]/25 opacity-90" />
        <div
          ref={containerRef}
          className={`relative z-10 h-full w-full ${mapToneClass}`}
          style={{ opacity: mapOpacity }}
        />
        <div className="vmesh-globe-lighting pointer-events-none absolute inset-0 z-20 rounded-full bg-[radial-gradient(circle_at_34%_20%,rgba(232,246,255,0.38),transparent_23%),radial-gradient(circle_at_72%_70%,rgba(0,3,12,0.58),transparent_42%),linear-gradient(112deg,rgba(255,255,255,0.05)_0%,rgba(10,34,52,0.02)_34%,rgba(0,0,0,0.48)_100%)]" />
        <div className="vmesh-atmosphere-drift pointer-events-none absolute inset-[1.2%] z-20 rounded-full border border-[#7eb7e4]/40 shadow-[inset_18px_16px_48px_rgba(255,255,255,0.12),0_0_34px_rgba(113,183,239,0.48)]" />
        <div className="vmesh-globe-outer-rim pointer-events-none absolute inset-[-1px] z-20 rounded-full border border-black/45" />
        {selectedMarkerPosition ? <SelectedCellMarker position={selectedMarkerPosition} /> : null}
      </div>
    </>
  );
}

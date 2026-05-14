"use client";

import type { RefObject } from "react";

import { EarthGlobeFallback } from "@/components/Map/EarthGlobeFallback";
import { GlobeStageBackdrop } from "@/components/Map/GlobeStageBackdrop";
import type { SelectedMarkerPosition } from "@/components/Map/globeRuntime";
import { SelectedCellMarker } from "@/components/Map/SelectedCellMarker";
import { ThreeEarthGlobe } from "@/components/Map/ThreeEarthGlobe";
import type { GlobeViewerMode } from "@/lib/globeViewer";
import type { GlobeBackdropMode, GlobeTheme } from "@/lib/vmeshTypes";

interface TerrainGlobeViewportProps {
  globeShellRef: RefObject<HTMLDivElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  globeShellClassName: string;
  viewerMode: GlobeViewerMode;
  globeTheme: GlobeTheme;
  backdropMode: GlobeBackdropMode;
  mapOpacity: string;
  selectedMarkerPosition: SelectedMarkerPosition | null;
  targetCoordinate: {
    latitude: number;
    longitude: number;
  };
  flightId: number | null;
  onOrbitWheelZoom: (deltaY: number) => void;
}

export function TerrainGlobeViewport({
  globeShellRef,
  containerRef,
  globeShellClassName,
  viewerMode,
  globeTheme,
  backdropMode,
  mapOpacity,
  selectedMarkerPosition,
  targetCoordinate,
  flightId,
  onOrbitWheelZoom
}: TerrainGlobeViewportProps) {
  const isMapOutput = viewerMode === "oss-map-output";
  const mapToneClass = isMapOutput
    ? globeTheme === "dark"
      ? "brightness-[0.98] contrast-[1.08] saturate-[0.95]"
      : "brightness-[1.08] contrast-[0.96] saturate-[1.04]"
    : globeTheme === "dark"
      ? "brightness-[0.82] contrast-[1.14] saturate-[0.92]"
      : "brightness-[1.05] contrast-[0.98] saturate-[1.05]";

  return (
    <>
      <GlobeStageBackdrop
        backdropMode={backdropMode}
        globeTheme={globeTheme}
        viewerMode={viewerMode}
      />
      <div
        ref={globeShellRef}
        className={globeShellClassName}
        onWheel={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onOrbitWheelZoom(event.deltaY);
        }}
      >
        <EarthGlobeFallback />
        <ThreeEarthGlobe
          viewerMode={viewerMode}
          globeTheme={globeTheme}
          targetCoordinate={targetCoordinate}
          flightId={flightId}
          onOrbitWheelZoom={onOrbitWheelZoom}
        />
        <div className="vmesh-globe-inner-ring pointer-events-none absolute inset-[6%] z-[16] rounded-full border border-[#7faad1]/25 opacity-90" />
        <div
          ref={containerRef}
          className={`relative z-10 h-full w-full ${mapToneClass}`}
          style={{ opacity: mapOpacity }}
        />
        <div className="vmesh-globe-lighting pointer-events-none absolute inset-0 z-[18] rounded-full bg-[radial-gradient(circle_at_32%_18%,rgba(232,246,255,0.13),transparent_9%),radial-gradient(circle_at_72%_70%,rgba(0,3,12,0.5),transparent_42%),linear-gradient(112deg,rgba(255,255,255,0.015)_0%,rgba(10,34,52,0.02)_34%,rgba(0,0,0,0.44)_100%)]" />
        <div className="vmesh-atmosphere-drift pointer-events-none absolute inset-[1.2%] z-[18] rounded-full border border-[#7eb7e4]/40 shadow-[inset_18px_16px_48px_rgba(255,255,255,0.12),0_0_34px_rgba(113,183,239,0.48)]" />
        <div className="vmesh-globe-outer-rim pointer-events-none absolute inset-[-1px] z-[18] rounded-full border border-black/45" />
        {isMapOutput && selectedMarkerPosition ? (
          <SelectedCellMarker position={selectedMarkerPosition} />
        ) : null}
      </div>
    </>
  );
}

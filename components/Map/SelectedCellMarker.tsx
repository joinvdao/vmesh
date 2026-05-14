import type { SelectedMarkerPosition } from "@/components/Map/globeRuntime";

export function SelectedCellMarker({ position }: { position: SelectedMarkerPosition }) {
  return (
    <div
      className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2"
      style={{ left: position.x, top: position.y }}
    >
      <div className="relative flex h-9 w-9 items-center justify-center">
        <span className="absolute h-9 w-9 animate-ping rounded-full border border-[#2DBA91]/30 bg-[#2DBA91]/12" />
        <span className="h-3.5 w-3.5 rounded-full border-2 border-white bg-[#2DBA91] shadow-[0_4px_16px_rgba(15,118,110,0.45)]" />
      </div>
    </div>
  );
}

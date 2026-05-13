import type { GlobeViewerMode } from "@/lib/globeViewer";
import type { GlobeTheme } from "@/lib/vmeshTypes";

export function getGlobeShellClassName(
  viewerMode: GlobeViewerMode,
  globeTheme: GlobeTheme
): string {
  return [
    "vmesh-globe-shell absolute left-1/2 top-1/2 overflow-hidden border transition-[border-radius,box-shadow,background-color,border-color] duration-500 ease-out",
    globeTheme === "dark"
      ? "border-[#22303d] bg-[#06101a] shadow-[0_0_22px_rgba(127,188,232,0.34),0_0_80px_rgba(37,112,179,0.28),0_46px_110px_rgba(0,0,0,0.64)]"
      : "border-[#b8d7dd] bg-[#d9eef0] shadow-[0_0_24px_rgba(99,180,196,0.28),0_0_86px_rgba(149,213,220,0.36),0_42px_95px_rgba(91,128,140,0.28)]",
    viewerMode === "oss-map-output"
      ? "vmesh-globe-shell--map-output h-[72vmin] max-h-[780px] min-h-[430px] w-[72vmin] max-w-[780px] min-w-[430px] rounded-[28px]"
      : "h-[72vmin] max-h-[780px] min-h-[430px] w-[72vmin] max-w-[780px] min-w-[430px] rounded-full"
  ].join(" ");
}

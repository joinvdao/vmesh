import type { GlobeViewerMode } from "@/lib/globeViewer";
import type { GlobeTheme } from "@/lib/vmeshTypes";

export function GlobeStageBackdrop({
  globeTheme,
  viewerMode
}: {
  globeTheme: GlobeTheme;
  viewerMode: GlobeViewerMode;
}) {
  return (
    <>
      <div className="vmesh-starfield pointer-events-none absolute inset-0" />
      <div
        className={`pointer-events-none absolute inset-0 transition-colors duration-500 ${
          globeTheme === "dark"
            ? "bg-[radial-gradient(circle_at_51%_47%,rgba(47,112,158,0.28),transparent_27%),radial-gradient(circle_at_50%_52%,rgba(4,10,21,0)_0,rgba(2,7,16,0.42)_44%,rgba(0,2,8,0.96)_78%),linear-gradient(180deg,#07111c_0%,#02050c_74%)]"
            : "bg-[radial-gradient(circle_at_50%_44%,rgba(135,217,226,0.34),transparent_29%),radial-gradient(circle_at_50%_54%,rgba(255,255,255,0.24)_0,rgba(234,246,245,0.72)_48%,rgba(221,237,238,0.96)_82%),linear-gradient(180deg,#fbfdfc_0%,#e8f3f2_78%)]"
        }`}
      />
      {viewerMode === "orbit-globe" ? (
        <div
          className={`vmesh-globe-shadow pointer-events-none absolute left-1/2 top-1/2 h-[72vmin] max-h-[780px] min-h-[430px] w-[72vmin] max-w-[780px] min-w-[430px] rounded-full ${
            globeTheme === "dark" ? "bg-[#06101a]" : "bg-[#cfe7e9]"
          }`}
        />
      ) : null}
    </>
  );
}

"use client";

import { Cloud, Eye, Layers3, Satellite, Sparkles, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ImageryLayerId } from "@/lib/vmeshTypes";
import { useVmeshStore } from "@/store/useVmeshStore";

const imageryLayers: { id: ImageryLayerId; label: string; icon: LucideIcon; note: string }[] = [
  {
    id: "sentinel2-recent-clear",
    label: "Sentinel-2 clear scene",
    icon: Satellite,
    note: "Recent clear-scene manifest and preview tiles"
  },
  {
    id: "sen2sr-enhanced-preview",
    label: "SEN2SR preview",
    icon: Sparkles,
    note: "Offline/server model output path; browser only displays tiles"
  },
  { id: "ndvi", label: "NDVI", icon: Layers3, note: "Vegetation proxy stored as H3 summary" },
  { id: "water", label: "Water index", icon: Cloud, note: "NDWI/water proxy summary" },
  {
    id: "soil-vegetation",
    label: "Soil/vegetation",
    icon: Eye,
    note: "Bare soil, water, and vegetation proxy bundle"
  }
];

export function ImageryPanel() {
  const activeLayers = useVmeshStore((state) => state.activeLayers);
  const imageryProviders = useVmeshStore((state) => state.imageryProviders);
  const selectedImageryProviderId = useVmeshStore((state) => state.selectedImageryProviderId);
  const selectedImageryLayer = useVmeshStore((state) => state.selectedImageryLayer);
  const imageryOpacity = useVmeshStore((state) => state.imageryOpacity);
  const imageryManifest = useVmeshStore((state) => state.imageryManifest);
  const mapStatus = useVmeshStore((state) => state.mapStatus);
  const setActivePanel = useVmeshStore((state) => state.setActivePanel);
  const setActiveImageryProvider = useVmeshStore((state) => state.setActiveImageryProvider);
  const setImageryOpacity = useVmeshStore((state) => state.setImageryOpacity);
  const setLayerEnabled = useVmeshStore((state) => state.setLayerEnabled);
  const setSelectedImageryLayer = useVmeshStore((state) => state.setSelectedImageryLayer);

  return (
    <div className="absolute left-6 top-6 z-30 w-[360px] rounded-[12px] border border-[#B6D9D1] bg-white/[0.94] p-4 shadow-[0_24px_80px_rgba(31,53,58,0.18)] backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5F777C]">
            Imagery
          </div>
          <div className="mt-1 text-[11px] text-[#6F8589]">
            Sentinel and SEN2SR are optional raster layers, never the basemap.
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setActivePanel(null)}
          aria-label="Close imagery"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="mb-3 flex items-center justify-between rounded-[8px] border border-[#D7EAE5] bg-[#F3FBF8] px-3 py-2 text-xs">
        <span className="font-medium text-[#2D545B]">Raster layer</span>
        <button
          className={`rounded-[7px] px-2 py-1 text-[10px] font-semibold uppercase ${
            activeLayers.imagery ? "bg-[#2DBA91] text-white" : "bg-[#eef5f3] text-[#5F777C]"
          }`}
          onClick={() => setLayerEnabled("imagery", !activeLayers.imagery)}
        >
          {activeLayers.imagery ? "Visible" : "Hidden"}
        </button>
      </div>

      <div className="grid gap-2">
        {imageryLayers.map((layer) => {
          const isActive = selectedImageryLayer === layer.id;
          return (
            <button
              key={layer.id}
              className={`rounded-[8px] border p-3 text-left ${
                isActive
                  ? "border-[#36DFAE] bg-[#E7F8F2] text-[#2DBA91]"
                  : "border-[#D7EAE5] bg-white text-[#5F777C] hover:border-[#B6D9D1]"
              }`}
              onClick={() => setSelectedImageryLayer(layer.id)}
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <layer.icon className="h-4 w-4" />
                {layer.label}
              </div>
              <div className="mt-1 text-[11px] leading-4 text-[#6F8589]">{layer.note}</div>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <div className="mb-2 flex justify-between text-[11px] text-[#6F8589]">
          <span>Compare</span>
          <span>Imagery</span>
        </div>
        <input
          aria-label="Imagery opacity"
          type="range"
          min={15}
          max={85}
          value={Math.round(imageryOpacity * 100)}
          onChange={(event) => setImageryOpacity(Number(event.target.value) / 100)}
          className="w-full accent-[#2DBA91]"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        {imageryProviders.map((provider) => (
          <button
            key={provider.id}
            className={`rounded-[8px] border px-2 py-2 text-left ${
              selectedImageryProviderId === provider.id
                ? "border-[#36DFAE] bg-[#E7F8F2] text-[#2DBA91]"
                : "border-[#D7EAE5] bg-white text-[#5F777C]"
            }`}
            onClick={() => setActiveImageryProvider(provider.id, `${provider.label} selected`)}
          >
            <div className="font-semibold">{provider.label}</div>
            <div className="mt-1 text-[10px] uppercase text-[#6F8589]">{provider.status}</div>
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-[8px] border border-[#D7EAE5] bg-[#FFFFFF] p-3 text-xs text-[#5F777C]">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[#2D545B]">Latest manifest</span>
          <span className="rounded-full bg-[#E7F8F2] px-2 py-1 text-[10px] font-semibold uppercase text-[#2DBA91]">
            clear {Math.round(imageryManifest.clearPixelRatioAoi * 100)}%
          </span>
        </div>
        <div className="mt-2 leading-5">
          {imageryManifest.sourceSceneId} | {imageryManifest.acquiredAt.slice(0, 10)}
        </div>
        <div className="mt-2 text-[#6F8589]">
          NDVI {imageryManifest.ndviMean.toFixed(2)} | NDWI {imageryManifest.ndwiMean.toFixed(2)} |
          cloud scene {imageryManifest.cloudCoverScene.toFixed(1)}%
        </div>
        <div className="mt-2 text-[#6F8589]">
          AI-enhanced imagery is not authoritative survey, emergency, or legal-boundary imagery.
        </div>
      </div>

      <div className="mt-3 text-[11px] text-[#6F8589]">
        Imagery status: <span className="font-medium text-[#2D545B]">{mapStatus.imagery}</span>
      </div>
    </div>
  );
}

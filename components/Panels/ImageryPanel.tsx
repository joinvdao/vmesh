"use client";

import { Cloud, Eye, Layers3, Satellite, Sparkles, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toImageryRasterSource } from "@/lib/imagerySources";
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
  const setSelectedImageryProvider = useVmeshStore((state) => state.setSelectedImageryProvider);
  const setImageryOpacity = useVmeshStore((state) => state.setImageryOpacity);
  const setLayerEnabled = useVmeshStore((state) => state.setLayerEnabled);
  const setSelectedImageryLayer = useVmeshStore((state) => state.setSelectedImageryLayer);
  const selectedProvider = imageryProviders.find(
    (provider) => provider.id === selectedImageryProviderId
  );

  return (
    <div className="absolute left-6 top-6 z-30 w-[360px] rounded-[12px] border border-[#dfe8e6] bg-white/[0.94] p-4 shadow-[0_24px_80px_rgba(31,53,58,0.18)] backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#52616f]">
            Imagery
          </div>
          <div className="mt-1 text-[11px] text-[#7b8893]">
            Mapbox Satellite can provide global ortho-style visual context. Sentinel/SEN2SR remain
            package imagery paths; none of these layers are terrain or survey truth.
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

      <div className="mb-3 flex items-center justify-between rounded-[8px] border border-[#e3ece9] bg-[#f7fbfa] px-3 py-2 text-xs">
        <span className="font-medium text-[#41515f]">Raster layer</span>
        <button
          className={`rounded-[7px] px-2 py-1 text-[10px] font-semibold uppercase ${
            activeLayers.imagery ? "bg-[#0f766e] text-white" : "bg-[#eef5f3] text-[#52616f]"
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
                  ? "border-[#78c8bd] bg-[#e8f6f3] text-[#0f766e]"
                  : "border-[#e3ece9] bg-white text-[#52616f] hover:border-[#b7dcd5]"
              }`}
              onClick={() => setSelectedImageryLayer(layer.id)}
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <layer.icon className="h-4 w-4" />
                {layer.label}
              </div>
              <div className="mt-1 text-[11px] leading-4 text-[#7b8893]">{layer.note}</div>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <div className="mb-2 flex justify-between text-[11px] text-[#6f7d88]">
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
          className="w-full accent-[#2f9b93]"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        {imageryProviders.map((provider) => {
          const isSelected = selectedImageryProviderId === provider.id;
          const isMapReady = toImageryRasterSource(provider) !== null;
          return (
            <button
              key={provider.id}
              className={`rounded-[8px] border px-2 py-2 text-left ${
                isSelected
                  ? "border-[#78c8bd] bg-[#e8f6f3] text-[#0f766e]"
                  : "border-[#e3ece9] bg-white text-[#52616f] hover:border-[#b7dcd5]"
              }`}
              onClick={() => setSelectedImageryProvider(provider.id)}
            >
              <div className="font-semibold">{provider.label}</div>
              <div className="mt-1 flex items-center justify-between gap-2 text-[10px] uppercase text-[#7b8893]">
                <span>{provider.status}</span>
                <span>{isMapReady ? "map-ready" : "gated"}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-[8px] border border-[#e3ece9] bg-[#fbfdfc] p-3 text-xs text-[#52616f]">
        <div className="font-semibold text-[#41515f]">
          {selectedProvider?.label ?? "No imagery provider selected"}
        </div>
        <div className="mt-2 leading-5 text-[#7b8893]">
          {selectedProvider?.notes ??
            "Imagery overlays are visual context only and must not upgrade terrain, legal, parcel, road, building, or emergency claims."}
        </div>
        <div className="mt-2 text-[#7b8893]">
          {selectedProvider?.license ?? "No imagery license selected"}
        </div>
      </div>

      <div className="mt-4 rounded-[8px] border border-[#e3ece9] bg-[#fbfdfc] p-3 text-xs text-[#52616f]">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[#41515f]">Latest manifest</span>
          <span className="rounded-full bg-[#e7f4f1] px-2 py-1 text-[10px] font-semibold uppercase text-[#0f766e]">
            clear {Math.round(imageryManifest.clearPixelRatioAoi * 100)}%
          </span>
        </div>
        <div className="mt-2 leading-5">
          {imageryManifest.sourceSceneId} | {imageryManifest.acquiredAt.slice(0, 10)}
        </div>
        <div className="mt-2 text-[#7b8893]">
          NDVI {imageryManifest.ndviMean.toFixed(2)} | NDWI {imageryManifest.ndwiMean.toFixed(2)} |
          cloud scene {imageryManifest.cloudCoverScene.toFixed(1)}%
        </div>
        <div className="mt-2 text-[#7b8893]">
          AI-enhanced imagery is not authoritative survey, emergency, or legal-boundary imagery.
        </div>
      </div>

      <div className="mt-3 text-[11px] text-[#7b8893]">
        Imagery status: <span className="font-medium text-[#41515f]">{mapStatus.imagery}</span>
      </div>
    </div>
  );
}

"use client";

import {
  Check,
  Database,
  ExternalLink,
  Layers3,
  Map,
  Mountain,
  ShieldCheck,
  X
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  MAPLIBRE_DEMO_PROVIDER_ID,
  MAPTERHORN_PROVIDER_ID,
  MAPZEN_PROVIDER_ID,
  toRasterDemSource
} from "@/lib/terrainSources";
import type { TerrainProviderAvailability, TerrainProviderConfig } from "@/lib/vmeshTypes";
import { useVmeshStore } from "@/store/useVmeshStore";

const availabilityLabels: Record<TerrainProviderAvailability, string> = {
  available: "available",
  fallback: "fallback",
  future: "future",
  "requires-api-key": "token gated",
  "requires-license": "license gated",
  "preprocessing-required": "preprocess"
};

const providerBadges: Record<string, string> = {
  [MAPTERHORN_PROVIDER_ID]: "Primary",
  [MAPZEN_PROVIDER_ID]: "Backup",
  [MAPLIBRE_DEMO_PROVIDER_ID]: "Final fallback",
  "env-raster-dem": "Configured"
};

function ProviderCard({
  provider,
  isSelected,
  onSelect
}: {
  provider: TerrainProviderConfig;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isMapReady = toRasterDemSource(provider) !== null;
  const badge = providerBadges[provider.id] ?? availabilityLabels[provider.status];

  return (
    <button
      className={`rounded-[10px] border p-3 text-left transition ${
        isSelected
          ? "border-[#36DFAE] bg-[#E7F8F2] shadow-[0_10px_24px_rgba(15,118,110,0.08)]"
          : "border-[#D7EAE5] bg-white hover:border-[#B6D9D1]"
      }`}
      onClick={onSelect}
      disabled={!isMapReady}
      aria-pressed={isSelected}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#2D545B]">
            <Mountain className="h-4 w-4 shrink-0 text-[#2DBA91]" />
            <span className="truncate">{provider.label}</span>
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.08em] text-[#6F8589]">
            {provider.kind} | {provider.encoding}
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${
            isSelected ? "bg-[#2DBA91] text-white" : "bg-[#f3f7f6] text-[#6F8589]"
          }`}
        >
          {isSelected ? "Selected" : badge}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[#5F777C]">
        <div className="rounded-[7px] bg-[#F3FBF8] px-2 py-1">
          Max zoom <span className="font-semibold">{provider.maxzoom ?? "n/a"}</span>
        </div>
        <div className="rounded-[7px] bg-[#F3FBF8] px-2 py-1">
          Tile <span className="font-semibold">{provider.tileSize ?? "n/a"}</span>
        </div>
      </div>

      <div className="mt-3 line-clamp-2 text-xs leading-5 text-[#6F8589]">{provider.notes}</div>
      <div className="mt-2 text-[11px] text-[#6F8589]">{provider.license}</div>

      {isSelected ? (
        <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#2DBA91]">
          <Check className="h-3.5 w-3.5" />
          Feeds terrain and hillshade overlay
        </div>
      ) : null}
    </button>
  );
}

export function TerrainPanel() {
  const activeLayers = useVmeshStore((state) => state.activeLayers);
  const terrainProviders = useVmeshStore((state) => state.terrainProviders);
  const selectedTerrainProviderId = useVmeshStore((state) => state.selectedTerrainProviderId);
  const mapStatus = useVmeshStore((state) => state.mapStatus);
  const setActivePanel = useVmeshStore((state) => state.setActivePanel);
  const setLayerEnabled = useVmeshStore((state) => state.setLayerEnabled);
  const setSelectedTerrainProvider = useVmeshStore((state) => state.setSelectedTerrainProvider);

  const mapReadyProviders = terrainProviders.filter((provider) => toRasterDemSource(provider));
  const futureProviders = terrainProviders.filter((provider) => !toRasterDemSource(provider));
  const selectedProvider = terrainProviders.find(
    (provider) => provider.id === selectedTerrainProviderId
  );

  return (
    <div className="absolute left-6 top-6 z-30 flex max-h-[calc(100%-48px)] w-[380px] flex-col rounded-[12px] border border-[#B6D9D1] bg-white/[0.94] p-4 shadow-[0_24px_80px_rgba(31,53,58,0.18)] backdrop-blur-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5F777C]">
            Terrain Overlay
          </div>
          <div className="mt-1 text-[11px] leading-4 text-[#6F8589]">
            Mapterhorn PMTiles first, Mapzen Joerd Terrarium as the no-token backup. Toggle this on
            over the searched place to move from flat basemap context into terrain relief.
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => setActivePanel(null)}
          aria-label="Close terrain overlay"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="mb-3 grid grid-cols-[1fr_auto] items-center gap-3 rounded-[10px] border border-[#D7EAE5] bg-[#F3FBF8] p-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#2D545B]">
            <Layers3 className="h-4 w-4 text-[#2DBA91]" />
            DEM overlay
          </div>
          <div className="mt-1 text-[11px] text-[#6F8589]">
            Applies MapLibre terrain plus hillshade, beneath the H3 data overlays.
          </div>
        </div>
        <button
          className={`rounded-[8px] px-3 py-2 text-[10px] font-semibold uppercase ${
            activeLayers.terrain ? "bg-[#2DBA91] text-white" : "bg-[#eef5f3] text-[#5F777C]"
          }`}
          onClick={() => setLayerEnabled("terrain", !activeLayers.terrain)}
          aria-pressed={activeLayers.terrain}
        >
          {activeLayers.terrain ? "Visible" : "Hidden"}
        </button>
      </div>

      <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
        <section className="grid gap-2">
          {mapReadyProviders.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              isSelected={provider.id === selectedTerrainProviderId}
              onSelect={() => setSelectedTerrainProvider(provider.id)}
            />
          ))}
        </section>

        <section className="rounded-[10px] border border-[#D7EAE5] bg-[#FFFFFF] p-3 text-xs text-[#5F777C]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-semibold text-[#2D545B]">
              <Database className="h-3.5 w-3.5 text-[#2DBA91]" />
              Runtime status
            </span>
            <span className="rounded-full bg-[#E7F8F2] px-2 py-1 text-[10px] font-semibold uppercase text-[#2DBA91]">
              {mapStatus.terrain}
            </span>
          </div>
          <div className="leading-5">
            Active provider:{" "}
            <span className="font-semibold text-[#2D545B]">
              {selectedProvider?.label ?? mapStatus.providerId}
            </span>
          </div>
          <div className="mt-1 text-[#6F8589]">{mapStatus.message}</div>
        </section>

        <section className="rounded-[10px] border border-[#D7EAE5] bg-white/[0.86] p-3">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#5F777C]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Future terrain sources
          </div>
          <div className="grid gap-2">
            {futureProviders.map((provider) => (
              <div
                key={provider.id}
                className="rounded-[8px] bg-[#F3FBF8] px-3 py-2 text-xs text-[#5F777C]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-[#2D545B]">{provider.label}</span>
                  <span className="rounded-full bg-[#eef5f3] px-2 py-1 text-[10px] font-semibold uppercase text-[#6F8589]">
                    {availabilityLabels[provider.status]}
                  </span>
                </div>
                <div className="mt-1 text-[#6F8589]">{provider.notes}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[10px] border border-[#D7EAE5] bg-[#FFFFFF] p-3 text-xs text-[#5F777C]">
          <div className="flex items-center gap-2 font-semibold text-[#2D545B]">
            <Map className="h-3.5 w-3.5 text-[#2DBA91]" />
            Click-through behavior
          </div>
          <div className="mt-2 leading-5 text-[#6F8589]">
            This panel changes the DEM overlay source only. It remains available after search zooms,
            so the selected area can be inspected as either source-backed basemap context or
            Mapterhorn/Mapzen terrain relief. The selected-cell marker, macro layers, imagery, and
            future H3 knowledge graph remain interactive above it.
          </div>
          <a
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#2DBA91]"
            href={selectedProvider?.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            Provider source
            <ExternalLink className="h-3 w-3" />
          </a>
        </section>
      </div>
    </div>
  );
}

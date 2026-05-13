"use client";

import {
  Bookmark,
  Droplet,
  Expand,
  Landmark,
  MoreVertical,
  ShieldCheck,
  Sprout,
  SunMedium,
  X,
  Zap
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Line, LineChart } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getScoreStatus } from "@/lib/meshScoring";
import type { MacroPillars } from "@/lib/vmeshTypes";
import { useVmeshStore } from "@/store/useVmeshStore";

const pillarLabels: { key: keyof MacroPillars; label: string; icon: LucideIcon }[] = [
  { key: "climate", label: "Climate", icon: SunMedium },
  { key: "energy", label: "Energy", icon: Zap },
  { key: "water", label: "Water", icon: Droplet },
  { key: "infrastructure", label: "Infrastructure", icon: Landmark },
  { key: "biodiversity", label: "Biodiversity", icon: Sprout },
  { key: "risk", label: "Risk", icon: ShieldCheck }
];

export function SelectedHexCard() {
  const selected = useVmeshStore((state) => state.selectedHexDetails);
  const macroSummary = useVmeshStore((state) => state.selectedMacroSummary);
  const imageryManifest = useVmeshStore((state) => state.imageryManifest);
  const userRecords = useVmeshStore((state) => state.userRecords);
  const foodSummary = useVmeshStore((state) => state.selectedFoodNetworkSummary);
  const propertySignals = useVmeshStore((state) => state.propertySignals);
  const setActivePanel = useVmeshStore((state) => state.setActivePanel);
  const localRecords = userRecords.filter((record) => record.h3Id === selected.h3Id);
  const localProperties = propertySignals.filter((record) => record.h3Id === selected.h3Id);

  return (
    <Card className="absolute bottom-6 right-6 top-6 z-30 flex w-[380px] flex-col overflow-hidden bg-white/[0.94] shadow-[0_24px_80px_rgba(31,53,58,0.18)] backdrop-blur-md">
      <div className="flex items-start justify-between border-b border-[#e6eeec] p-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#52616f]">
            Selected Hex
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center">
              <svg viewBox="0 0 100 100" className="h-12 w-12 text-[#0f766e]">
                <polygon
                  points="50 4 90 27 90 73 50 96 10 73 10 27"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="truncate font-mono text-lg text-[#24323f]">{selected.h3Id}</div>
              <div className="text-xs text-[#7b8893]">{selected.placeName}</div>
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Expand className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setActivePanel(null)}
            aria-label="Close selected hex"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border-b border-[#e6eeec] p-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#52616f]">
              Antifragility Index
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-light text-[#0f766e]">
                {selected.antifragilityScore}
              </span>
              <span className="text-sm text-[#7b8893]">/100</span>
            </div>
            <Badge className="mt-2">{getScoreStatus(selected.antifragilityScore)}</Badge>
          </div>
          <div className="h-16 w-28 overflow-hidden">
            <LineChart width={112} height={64} data={selected.trend}>
              <Line type="monotone" dataKey="value" stroke="#2f9b93" strokeWidth={2} dot={false} />
            </LineChart>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-b border-[#e6eeec] p-3">
        {pillarLabels.map((pillar) => (
          <div key={pillar.key} className="rounded-[8px] border border-[#e6eeec] bg-white p-2">
            <div className="flex items-center gap-2 text-xs text-[#52616f]">
              <pillar.icon className="h-4 w-4 text-[#0f766e]" />
              <span>{pillar.label}</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1 text-[#0f766e]">
              <span className="text-sm font-semibold">{selected.macro[pillar.key]}</span>
              <span className="text-[10px] text-[#7b8893]">/100</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 vmesh-scrollbar">
        <div className="rounded-[8px] border border-[#d8ebe7] bg-[#f6fbfa] p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-[#41515f]">Macro conditions</span>
            <span className="text-[#0f766e]">{macroSummary.provenance.sourceType}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <span className="text-[#7b8893]">Weather now</span>
            <span className="text-right font-medium">
              {macroSummary.weather.temperatureC.toFixed(1)} C
            </span>
            <span className="text-[#7b8893]">72h rain</span>
            <span className="text-right font-medium">{macroSummary.forecast.next72hRainMm} mm</span>
            <span className="text-[#7b8893]">Flood</span>
            <span className="text-right font-medium">{macroSummary.flood.classLabel}</span>
            <span className="text-[#7b8893]">Fire weather</span>
            <span className="text-right font-medium">{macroSummary.fire.classLabel}</span>
            <span className="text-[#7b8893]">Solar</span>
            <span className="text-right font-medium">{macroSummary.solar.classLabel}</span>
          </div>
          <div className="mt-3 border-t border-[#dfe8e6] pt-2 text-[#7b8893]">
            {macroSummary.provenance.freshnessLabel} | confidence{" "}
            {macroSummary.provenance.confidence}%
          </div>
        </div>

        <div className="rounded-[8px] border border-[#e6eeec] bg-[#fbfdfc] p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-[#41515f]">Sentinel imagery</span>
            <span className="text-[#0f766e]">
              clear {Math.round(imageryManifest.clearPixelRatioAoi * 100)}%
            </span>
          </div>
          <div className="mt-2 text-[#7b8893]">
            Scene {imageryManifest.acquiredAt.slice(0, 10)} | NDVI{" "}
            {imageryManifest.ndviMean.toFixed(2)} | NDWI {imageryManifest.ndwiMean.toFixed(2)}
          </div>
          <div className="mt-2 text-[#7b8893]">
            SEN2SR is an offline/server pipeline. Enhanced imagery is not authoritative survey
            evidence.
          </div>
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#52616f]">
            Micro Assets
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <span className="text-[#7b8893]">Properties</span>
            <span className="text-right font-medium">{selected.micro.properties}</span>
            <span className="text-[#7b8893]">Farmers markets</span>
            <span className="text-right font-medium">{selected.micro.farmersMarkets}</span>
            <span className="text-[#7b8893]">Growers</span>
            <span className="text-right font-medium">{selected.micro.growers}</span>
            <span className="text-[#7b8893]">Community assets</span>
            <span className="text-right font-medium">{selected.micro.communityAssets}</span>
          </div>
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#52616f]">
            Composition
          </div>
          <div className="mt-3 flex items-end gap-3 border-b border-[#e6eeec] pb-2 text-center text-[10px] text-[#7b8893]">
            {pillarLabels.map((pillar) => (
              <div key={pillar.key} className="flex-1">
                <div
                  className="mx-auto mb-2 w-1.5 rounded-full bg-[#2f9b93]"
                  style={{ height: selected.macro[pillar.key] / 3 }}
                />
                <div>{pillar.label.slice(0, 3)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[8px] border border-[#e6eeec] bg-[#fbfdfc] p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-[#41515f]">Food network</span>
            <span className="text-[#0f766e]">{foodSummary.assets.length} assets</span>
          </div>
          <div className="mt-2 text-[#7b8893]">
            Farms {foodSummary.farms} | markets {foodSummary.farmersMarkets} | gardens{" "}
            {foodSummary.communityGardens}
          </div>
        </div>

        <div className="rounded-[8px] border border-[#e6eeec] bg-[#fbfdfc] p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-[#41515f]">Property signals</span>
            <span className="text-[#0f766e]">{localProperties.length}</span>
          </div>
          <div className="mt-2 text-[#7b8893]">
            Mock bands only. No scraping, exact private addresses, or live listing calls.
          </div>
        </div>

        <div className="rounded-[8px] border border-[#e6eeec] bg-[#fbfdfc] p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-[#41515f]">User-added records</span>
            <span className="text-[#0f766e]">{localRecords.length}</span>
          </div>
          <div className="mt-2 text-[#7b8893]">
            Private/local observations attach to this mesh cell only.
          </div>
        </div>

        <div className="rounded-[8px] border border-[#e6eeec] bg-[#fbfdfc] p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-[#41515f]">Source confidence</span>
            <span className="text-[#0f766e]">{selected.confidence}%</span>
          </div>
          <div className="mt-2 text-[#7b8893]">
            {selected.provenance.label} | {selected.provenance.sourceCount} sources
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[#e6eeec] p-3">
        <span className="font-mono text-[11px] text-[#7b8893]">{selected.tier}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Bookmark className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

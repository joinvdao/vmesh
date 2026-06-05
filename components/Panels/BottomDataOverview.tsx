"use client";

import { CircleHelp, Database, FileSearch, Layers3, MoreVertical, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { initialHexDataByTier } from "@/data/mockVmeshData";
import { useVmeshStore } from "@/store/useVmeshStore";

function OverviewCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Card className={`h-full min-w-[250px] flex-1 shadow-sm ${className ?? ""}`}>{children}</Card>
  );
}

export function BottomDataOverview() {
  const userRecords = useVmeshStore((state) => state.userRecords);
  const terrainStatus = useVmeshStore((state) => state.mapStatus.terrain);
  const mapStatus = useVmeshStore((state) => state.mapStatus);
  const selectedHex = useVmeshStore((state) => state.selectedHexDetails);
  const foodSummary = useVmeshStore((state) => state.selectedFoodNetworkSummary);
  const propertySignals = useVmeshStore((state) => state.propertySignals);
  const macroPackageManifest = useVmeshStore((state) => state.macroPackageManifest);
  const setActivePanel = useVmeshStore((state) => state.setActivePanel);
  const localProperties = propertySignals.filter((record) => record.h3Id === selectedHex.h3Id);
  const regionalPackages = [...initialHexDataByTier.U5]
    .map((region) => ({
      ...region,
      dataCount:
        region.provenance.sourceCount +
        region.micro.properties +
        region.micro.farmersMarkets +
        region.micro.growers +
        region.micro.communityAssets +
        region.user.observations +
        region.user.privateNotes
    }))
    .sort((a, b) => b.dataCount - a.dataCount)
    .slice(0, 4);

  return (
    <section className="absolute bottom-4 left-6 right-6 z-30 h-72 rounded-[14px] border border-[#dfe8e6] bg-white/[0.94] p-3 shadow-[0_24px_80px_rgba(31,53,58,0.18)] backdrop-blur-md">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-3 top-3 z-10 h-7 w-7"
        onClick={() => setActivePanel(null)}
        aria-label="Close data overview"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
      <div className="flex h-full gap-3 overflow-x-auto pb-1 vmesh-scrollbar">
        <OverviewCard>
          <CardHeader>
            <CardTitle>Source Coverage</CardTitle>
            <CircleHelp className="h-3.5 w-3.5 text-[#8a98a5]" />
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex gap-1">
              <Badge variant="default">Regions</Badge>
              <Badge variant="neutral">Fixtures</Badge>
            </div>
            <div className="space-y-2">
              {regionalPackages.map((region) => (
                <div
                  key={region.h3Id}
                  className="grid grid-cols-[1fr_58px] items-center gap-2 text-xs"
                >
                  <span className="truncate text-[#41515f]">{region.placeName}</span>
                  <span className="text-right font-semibold text-[#0f766e]">
                    {region.dataCount} refs
                  </span>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-4 w-full text-xs">
              Review sources
            </Button>
          </CardContent>
        </OverviewCard>

        <OverviewCard>
          <CardHeader>
            <CardTitle>Selected Cell</CardTitle>
            <FileSearch className="h-3.5 w-3.5 text-[#8a98a5]" />
          </CardHeader>
          <CardContent>
            <div className="font-mono text-xs text-[#52616f]">{selectedHex.h3Id}</div>
            <div className="mt-2 text-lg font-semibold text-[#24323f]">{selectedHex.placeName}</div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-[8px] border border-[#e6eeec] bg-[#fbfdfc] p-2">
                <div className="text-[#7b8893]">Tier</div>
                <div className="mt-1 font-semibold text-[#0f766e]">{selectedHex.tier}</div>
              </div>
              <div className="rounded-[8px] border border-[#e6eeec] bg-[#fbfdfc] p-2">
                <div className="text-[#7b8893]">Sources</div>
                <div className="mt-1 font-semibold text-[#0f766e]">
                  {selectedHex.provenance.sourceCount}
                </div>
              </div>
            </div>
            <div className="mt-3 text-xs leading-5 text-[#7b8893]">
              H3 cell context only. Not a parcel boundary, legal record, or automated evaluation.
            </div>
          </CardContent>
        </OverviewCard>

        <OverviewCard>
          <CardHeader>
            <CardTitle>Active Providers</CardTitle>
            <Database className="h-3.5 w-3.5 text-[#8a98a5]" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-[8px] bg-[#f7fbfa] px-3 py-2">
                <span className="text-[#52616f]">Basemap</span>
                <span className="font-semibold text-[#0f766e]">{mapStatus.basemap}</span>
              </div>
              <div className="flex items-center justify-between rounded-[8px] bg-[#f7fbfa] px-3 py-2">
                <span className="text-[#52616f]">Terrain</span>
                <span className="font-semibold text-[#0f766e]">{terrainStatus}</span>
              </div>
              <div className="flex items-center justify-between rounded-[8px] bg-[#f7fbfa] px-3 py-2">
                <span className="text-[#52616f]">Imagery</span>
                <span className="font-semibold text-[#0f766e]">{mapStatus.imagery}</span>
              </div>
              <div className="flex items-center justify-between rounded-[8px] bg-[#f7fbfa] px-3 py-2">
                <span className="text-[#52616f]">Package</span>
                <span className="font-semibold text-[#0f766e]">{macroPackageManifest.mode}</span>
              </div>
            </div>
          </CardContent>
        </OverviewCard>

        <OverviewCard>
          <CardHeader>
            <CardTitle>Local Records</CardTitle>
            <Layers3 className="h-3.5 w-3.5 text-[#8a98a5]" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-[8px] border border-[#e6eeec] bg-[#fbfdfc] p-3">
                <div className="font-semibold text-[#41515f]">Food assets</div>
                <div className="mt-1 text-[#52616f]">{foodSummary.assets.length} linked</div>
              </div>
              <div className="rounded-[8px] border border-[#e6eeec] bg-[#fbfdfc] p-3">
                <div className="font-semibold text-[#41515f]">Properties</div>
                <div className="mt-1 text-[#52616f]">{localProperties.length} linked</div>
              </div>
              <div className="col-span-2 rounded-[8px] border border-[#e6eeec] bg-[#fbfdfc] p-3">
                <div className="font-semibold text-[#41515f]">User notes</div>
                <div className="mt-1 text-[#52616f]">{userRecords.length} local records</div>
              </div>
            </div>
          </CardContent>
        </OverviewCard>

        <OverviewCard className="max-w-[260px]">
          <CardHeader>
            <CardTitle>vmesh Notes</CardTitle>
            <MoreVertical className="h-4 w-4 text-[#7b8893]" />
          </CardHeader>
          <CardContent>
            <div className="rounded-[8px] bg-[#f5faf9] p-3 text-sm leading-5 text-[#52616f]">
              Terrain source is {terrainStatus}. Source layers are shown as availability and
              provenance until the analysis phase is reintroduced.
            </div>
            <Button variant="outline" size="sm" className="mt-4 w-full">
              Review local records
            </Button>
          </CardContent>
        </OverviewCard>
      </div>
    </section>
  );
}

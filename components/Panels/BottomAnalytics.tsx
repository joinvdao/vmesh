"use client";

import { ArrowUp, CircleHelp, MoreVertical, X } from "lucide-react";
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { initialHexDataByTier } from "@/data/mockVmeshData";
import { useVmeshStore } from "@/store/useVmeshStore";

const climateTrend = [
  { year: 1990, value: -0.3 },
  { year: 1995, value: -0.15 },
  { year: 2000, value: -0.1 },
  { year: 2005, value: 0.05 },
  { year: 2010, value: 0.18 },
  { year: 2015, value: 0.32 },
  { year: 2020, value: 0.44 },
  { year: 2025, value: 0.58 },
  { year: 2030, value: 0.68 },
  { year: 2035, value: 0.82 },
  { year: 2040, value: 0.95 }
];

const landUse = [
  { name: "Forest", value: 36, color: "#2f9b93" },
  { name: "Agriculture", value: 28, color: "#9fd8c5" },
  { name: "Grassland", value: 17, color: "#f3cf79" },
  { name: "Urban", value: 11, color: "#95a3ad" },
  { name: "Other", value: 8, color: "#d9e1df" }
];

function AnalyticsCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Card className={`h-full min-w-[260px] flex-1 shadow-sm ${className ?? ""}`}>{children}</Card>
  );
}

export function BottomAnalytics() {
  const userRecords = useVmeshStore((state) => state.userRecords);
  const terrainStatus = useVmeshStore((state) => state.mapStatus.terrain);
  const setActivePanel = useVmeshStore((state) => state.setActivePanel);
  const topRegions = [...initialHexDataByTier.U5]
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
        aria-label="Close analytics"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
      <div className="flex h-full gap-3 overflow-x-auto pb-1 vmesh-scrollbar">
        <AnalyticsCard>
          <CardHeader>
            <CardTitle>Regional Data Coverage</CardTitle>
            <CircleHelp className="h-3.5 w-3.5 text-[#8a98a5]" />
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex gap-1">
              <Badge variant="default">Regions</Badge>
              <Badge variant="neutral">Countries</Badge>
            </div>
            <div className="space-y-2">
              {topRegions.map((region, index) => (
                <div
                  key={region.h3Id}
                  className="grid grid-cols-[20px_1fr_52px] items-center gap-2 text-xs"
                >
                  <span className="text-[#7b8893]">{index + 1}</span>
                  <span className="truncate text-[#41515f]">{region.placeName}</span>
                  <span className="text-right font-semibold text-[#0f766e]">
                    {region.dataCount} src
                  </span>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-4 w-full text-xs">
              Review source coverage
            </Button>
          </CardContent>
        </AnalyticsCard>

        <AnalyticsCard>
          <CardHeader>
            <CardTitle>Climate Trend</CardTitle>
            <CircleHelp className="h-3.5 w-3.5 text-[#8a98a5]" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-[#7b8893]">Temperature Anomaly (C)</div>
            <div className="mt-1 text-2xl font-light text-[#24323f]">+0.6 C</div>
            <div className="h-28 overflow-hidden">
              <LineChart width={220} height={112} data={climateTrend}>
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 9 }}
                  interval={2}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis domain={[-1, 1]} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#2f9b93"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </div>
            <div className="mt-2 rounded-[8px] border border-[#e6eeec] px-3 py-2 text-xs text-[#52616f]">
              Rising | +0.18 C / decade
            </div>
          </CardContent>
        </AnalyticsCard>

        <AnalyticsCard>
          <CardHeader>
            <CardTitle>Energy Availability</CardTitle>
            <CircleHelp className="h-3.5 w-3.5 text-[#8a98a5]" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-5">
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[conic-gradient(#2f9b93_0_266deg,#dce9e7_266deg_360deg)]">
                <div className="flex h-16 w-16 flex-col items-center justify-center rounded-full bg-white">
                  <span className="text-2xl font-semibold text-[#0f766e]">74%</span>
                  <span className="text-[10px] text-[#52616f]">High</span>
                </div>
              </div>
              <div className="flex h-24 flex-1 items-end gap-1">
                {Array.from({ length: 12 }, (_, index) => (
                  <div
                    key={index}
                    className="flex-1 rounded-t bg-[#2f9b93]"
                    style={{ height: `${22 + index * 5}%`, opacity: 0.55 + index * 0.035 }}
                  />
                ))}
              </div>
            </div>
            <div className="mt-4 rounded-[8px] border border-[#e6eeec] px-3 py-2 text-center text-xs text-[#52616f]">
              <ArrowUp className="mr-1 inline h-3.5 w-3.5 text-[#0f766e]" /> 8% vs last year
            </div>
          </CardContent>
        </AnalyticsCard>

        <AnalyticsCard>
          <CardHeader>
            <CardTitle>Water Stress</CardTitle>
            <CircleHelp className="h-3.5 w-3.5 text-[#8a98a5]" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-[#7b8893]">Local Water Stress</div>
            <div className="mt-2 text-4xl font-light text-[#24323f]">2.6</div>
            <div className="text-sm text-[#52616f]">Medium</div>
            <div className="mt-8 h-2 rounded-full bg-gradient-to-r from-[#2f9b93] via-[#f3cf79] to-[#ee8f55]">
              <div className="ml-[52%] h-5 w-5 -translate-y-1.5 rounded-full border-2 border-white bg-[#f6c96f] shadow" />
            </div>
            <div className="mt-4 flex justify-between text-[10px] text-[#7b8893]">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
          </CardContent>
        </AnalyticsCard>

        <AnalyticsCard>
          <CardHeader>
            <CardTitle>Land Use</CardTitle>
            <CircleHelp className="h-3.5 w-3.5 text-[#8a98a5]" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="h-28 w-28 overflow-hidden">
                <PieChart width={112} height={112}>
                  <Pie
                    data={landUse}
                    dataKey="value"
                    innerRadius={32}
                    outerRadius={52}
                    stroke="none"
                  >
                    {landUse.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </div>
              <div className="flex-1 space-y-2">
                {landUse.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-[#52616f]">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      {item.name}
                    </span>
                    <span className="text-[#7b8893]">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </AnalyticsCard>

        <AnalyticsCard className="max-w-[220px]">
          <CardHeader>
            <CardTitle>Property Layer</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="neutral">Local Mock</Badge>
            <p className="mt-5 text-sm leading-6 text-[#6f7d88]">
              Parcel and listing signals are typed but fictional until lawful sources are
              configured.
            </p>
          </CardContent>
        </AnalyticsCard>

        <AnalyticsCard className="max-w-[260px]">
          <CardHeader>
            <CardTitle>vmesh Notes</CardTitle>
            <MoreVertical className="h-4 w-4 text-[#7b8893]" />
          </CardHeader>
          <CardContent>
            <div className="rounded-[8px] bg-[#f5faf9] p-3 text-sm leading-5 text-[#52616f]">
              Terrain source is {terrainStatus}. {userRecords.length} private/local records are
              attached to the mesh.
            </div>
            <Button variant="outline" size="sm" className="mt-4 w-full">
              Review local records
            </Button>
          </CardContent>
        </AnalyticsCard>
      </div>
    </section>
  );
}

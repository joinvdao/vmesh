"use client";

import {
  CloudSun,
  Database,
  FileSearch,
  Globe2,
  Map,
  Mountain,
  Satellite,
  ShieldCheck,
  Sprout,
  X
} from "lucide-react";
import { useMemo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { createSourceBrokerReport } from "@/lib/sourceBroker";
import type { TerrainProviderAvailability, TerrainProviderStatus } from "@/lib/vmeshTypes";
import { useVmeshStore } from "@/store/useVmeshStore";

const availabilityLabels: Record<TerrainProviderAvailability, string> = {
  available: "available",
  fallback: "fallback",
  future: "future",
  "requires-api-key": "token gated",
  "requires-license": "license gated",
  "preprocessing-required": "preprocess"
};

const statusTone: Record<TerrainProviderStatus, string> = {
  idle: "bg-[#eef5f3] text-[#5F777C]",
  loading: "bg-[#fff7e8] text-[#936316]",
  active: "bg-[#E7F8F2] text-[#2DBA91]",
  fallback: "bg-[#f6efe4] text-[#8a5a1d]",
  unavailable: "bg-[#f3f5f5] text-[#6F8589]",
  error: "bg-[#fdecec] text-[#b23b3b]"
};

function StatusPill({ status }: { status: TerrainProviderStatus }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${statusTone[status]}`}
    >
      {status}
    </span>
  );
}

function AvailabilityPill({ status }: { status: TerrainProviderAvailability }) {
  return (
    <span className="rounded-full bg-[#f3f7f6] px-2 py-1 text-[10px] font-semibold uppercase text-[#6F8589]">
      {availabilityLabels[status]}
    </span>
  );
}

function Section({
  title,
  icon,
  children
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[10px] border border-[#D7EAE5] bg-white/[0.86] p-3">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#5F777C]">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}

export function SourceProvenancePanel() {
  const mapStatus = useVmeshStore((state) => state.mapStatus);
  const selectedHex = useVmeshStore((state) => state.selectedHexDetails);
  const selectedMacroSummary = useVmeshStore((state) => state.selectedMacroSummary);
  const macroPackageManifest = useVmeshStore((state) => state.macroPackageManifest);
  const macroDataModeLabel = useVmeshStore((state) => state.macroDataModeLabel);
  const imageryManifest = useVmeshStore((state) => state.imageryManifest);
  const basemapProviders = useVmeshStore((state) => state.basemapProviders);
  const terrainProviders = useVmeshStore((state) => state.terrainProviders);
  const macroProviders = useVmeshStore((state) => state.macroProviders);
  const imageryProviders = useVmeshStore((state) => state.imageryProviders);
  const propertySignals = useVmeshStore((state) => state.propertySignals);
  const foodNetworkAssets = useVmeshStore((state) => state.foodNetworkAssets);
  const setActivePanel = useVmeshStore((state) => state.setActivePanel);

  const activeBasemap = basemapProviders.find(
    (provider) => provider.id === mapStatus.basemapProviderId
  );
  const activeTerrain = terrainProviders.find((provider) => provider.id === mapStatus.providerId);
  const activeMacro = macroProviders.find((provider) => provider.id === mapStatus.macroProviderId);
  const activeImagery = imageryProviders.find(
    (provider) => provider.id === mapStatus.imageryProviderId
  );
  const brokerReport = useMemo(
    () =>
      createSourceBrokerReport({
        h3Id: selectedHex.h3Id,
        centroid: selectedMacroSummary.centroid,
        preferredBasemapProviderId: mapStatus.basemapProviderId,
        preferredTerrainProviderId: mapStatus.providerId,
        preferredImageryProviderId: mapStatus.imageryProviderId,
        createdAt: "2026-05-10T00:00:00.000Z"
      }),
    [
      mapStatus.basemapProviderId,
      mapStatus.imageryProviderId,
      mapStatus.providerId,
      selectedHex.h3Id,
      selectedMacroSummary.centroid
    ]
  );

  return (
    <div className="absolute left-6 top-6 z-30 flex max-h-[calc(100%-48px)] w-[420px] flex-col rounded-[12px] border border-[#B6D9D1] bg-white/[0.94] p-4 shadow-[0_24px_80px_rgba(31,53,58,0.18)] backdrop-blur-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5F777C]">
            Sources
          </div>
          <div className="mt-1 text-[11px] leading-4 text-[#6F8589]">
            What is live, mock, local, open-data-ready, or future-provider-backed.
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => setActivePanel(null)}
          aria-label="Close source provenance"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
        <Section title="Visual treatment" icon={<Map className="h-3.5 w-3.5" />}>
          <div className="space-y-2 text-xs text-[#5F777C]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[#2D545B]">Decorative globe texture</span>
              <span className="rounded-full bg-[#f3f7f6] px-2 py-1 text-[10px] font-semibold uppercase text-[#6F8589]">
                not data
              </span>
            </div>
            <div className="text-[#6F8589]">
              Land tint, clouds, rim light, and lattice cues are visual staging only. Source-backed
              output begins with the basemap, terrain provider, package-backed H3 summaries, and
              explicit imagery layers below.
            </div>
          </div>
        </Section>

        <Section title="Active map sources" icon={<Globe2 className="h-3.5 w-3.5" />}>
          <div className="grid gap-2 text-xs">
            <div className="rounded-[8px] bg-[#F3FBF8] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[#2D545B]">Basemap</span>
                <StatusPill status={mapStatus.basemap} />
              </div>
              <div className="mt-1 text-[#5F777C]">{activeBasemap?.label ?? "Not selected"}</div>
              <div className="mt-1 text-[#6F8589]">{activeBasemap?.license ?? "No license"}</div>
            </div>
            <div className="rounded-[8px] bg-[#F3FBF8] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[#2D545B]">Terrain</span>
                <StatusPill status={mapStatus.terrain} />
              </div>
              <div className="mt-1 text-[#5F777C]">{activeTerrain?.label ?? "Not selected"}</div>
              <div className="mt-1 text-[#6F8589]">{activeTerrain?.license ?? "No license"}</div>
            </div>
          </div>
        </Section>

        <Section title="Selected cell evidence" icon={<FileSearch className="h-3.5 w-3.5" />}>
          <div className="space-y-2 text-xs text-[#5F777C]">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-[#2D545B]">{selectedHex.h3Id}</span>
              <span>{selectedHex.confidence}% confidence</span>
            </div>
            <div>
              {selectedHex.provenance.label} | {selectedHex.provenance.sourceCount} sources |{" "}
              {selectedHex.provenance.license}
            </div>
            <div className="text-[#6F8589]">
              Updated {selectedHex.provenance.updatedAt}. H3 is the index; it is not a parcel, legal
              boundary, or authoritative risk certificate.
            </div>
          </div>
        </Section>

        <Section title="Macro provider" icon={<CloudSun className="h-3.5 w-3.5" />}>
          <div className="space-y-2 text-xs text-[#5F777C]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[#2D545B]">
                {activeMacro?.label ?? selectedMacroSummary.provenance.providerLabel}
              </span>
              <StatusPill status={mapStatus.macro} />
            </div>
            <div>{selectedMacroSummary.provenance.freshnessLabel}</div>
            <div className="rounded-[8px] bg-[#F3FBF8] p-2">
              <div className="font-semibold text-[#2D545B]">{macroDataModeLabel}</div>
              <div className="mt-1 text-[#6F8589]">
                {macroPackageManifest.packageId} {macroPackageManifest.packageVersion} |{" "}
                {macroPackageManifest.summaryStats.cellCount} H3 cells | {macroPackageManifest.mode}
              </div>
            </div>
            <div className="text-[#6F8589]">{selectedMacroSummary.provenance.limitations}</div>
            <div className="text-[#6F8589]">{selectedMacroSummary.provenance.license}</div>
          </div>
        </Section>

        <Section title="Imagery manifest" icon={<Satellite className="h-3.5 w-3.5" />}>
          <div className="space-y-2 text-xs text-[#5F777C]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[#2D545B]">
                {activeImagery?.label ?? imageryManifest.provider}
              </span>
              <StatusPill status={mapStatus.imagery} />
            </div>
            <div>{imageryManifest.sourceSceneId}</div>
            <div className="text-[#6F8589]">
              Acquired {imageryManifest.acquiredAt.slice(0, 10)} | AOI clear{" "}
              {Math.round(imageryManifest.clearPixelRatioAoi * 100)}% | cloud scene{" "}
              {imageryManifest.cloudCoverScene.toFixed(1)}%
            </div>
            <div className="text-[#6F8589]">
              {imageryManifest.superResolutionModel}. AI-enhanced imagery is not authoritative
              survey or emergency-certification imagery.
            </div>
          </div>
        </Section>

        <Section title="Provider registry" icon={<Database className="h-3.5 w-3.5" />}>
          <div className="grid gap-2 text-xs">
            {[...basemapProviders, ...terrainProviders, ...macroProviders, ...imageryProviders]
              .slice(0, 14)
              .map((provider) => (
                <div
                  key={provider.id}
                  className="flex items-center justify-between gap-3 rounded-[8px] bg-[#F3FBF8] px-3 py-2"
                >
                  <span className="min-w-0 truncate font-medium text-[#2D545B]">
                    {provider.label}
                  </span>
                  <AvailabilityPill status={provider.status} />
                </div>
              ))}
          </div>
        </Section>

        <Section title="Source broker package" icon={<FileSearch className="h-3.5 w-3.5" />}>
          <div className="space-y-2 text-xs text-[#5F777C]">
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate font-semibold text-[#2D545B]">
                {brokerReport.packageManifest.id}
              </span>
              <span>{brokerReport.layerCatalogSummary.totalLayers} layers</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-[8px] bg-[#F3FBF8] p-2">
                <div className="font-semibold text-[#2D545B]">
                  {brokerReport.layerCatalogSummary.mapReadyLayers}
                </div>
                <div className="text-[#6F8589]">map-ready</div>
              </div>
              <div className="rounded-[8px] bg-[#F3FBF8] p-2">
                <div className="font-semibold text-[#2D545B]">
                  {brokerReport.layerCatalogSummary.preprocessingRequiredLayers}
                </div>
                <div className="text-[#6F8589]">preprocess</div>
              </div>
              <div className="rounded-[8px] bg-[#F3FBF8] p-2">
                <div className="font-semibold text-[#2D545B]">
                  {brokerReport.rejectedSources.length}
                </div>
                <div className="text-[#6F8589]">skipped</div>
              </div>
            </div>
            <div className="text-[#6F8589]">
              Package payloads are manifest contracts only: terrain, imagery, landcover,
              environment, contours, H3 summaries, and provenance. Heavy processing remains outside
              the browser.
            </div>
          </div>
        </Section>

        <Section title="Micro and local data" icon={<Sprout className="h-3.5 w-3.5" />}>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-[8px] bg-[#F3FBF8] p-3">
              <div className="font-semibold text-[#2D545B]">Food assets</div>
              <div className="mt-1 text-[#5F777C]">{foodNetworkAssets.length} mock records</div>
              <div className="mt-1 text-[#6F8589]">Public-directory boundary, not live ingest.</div>
            </div>
            <div className="rounded-[8px] bg-[#F3FBF8] p-3">
              <div className="font-semibold text-[#2D545B]">Property signals</div>
              <div className="mt-1 text-[#5F777C]">{propertySignals.length} mock records</div>
              <div className="mt-1 text-[#6F8589]">Approximate H3-area only, no scraping.</div>
            </div>
          </div>
        </Section>

        <Section title="Safety gates" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
          <div className="space-y-2 text-xs text-[#5F777C]">
            <div className="flex items-center gap-2">
              <Map className="h-3.5 w-3.5 text-[#2DBA91]" />
              No paid basemap, Mapbox, or provider token is required for the public demo.
            </div>
            <div className="flex items-center gap-2">
              <Mountain className="h-3.5 w-3.5 text-[#2DBA91]" />
              CUDEM/FABDEM/OpenTopography remain preprocessing or license-gated paths.
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

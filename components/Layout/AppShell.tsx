"use client";

import { AppFooter } from "@/components/Layout/AppFooter";
import { AppHeader } from "@/components/Layout/AppHeader";
import { AppSidebar } from "@/components/Layout/AppSidebar";
import { TerrainGlobe } from "@/components/Map/TerrainGlobe";
import { BottomDataOverview } from "@/components/Panels/BottomDataOverview";
import { HubNetworkStatusPanel } from "@/components/Panels/HubNetworkStatusPanel";
import { HubPlaybookPanel } from "@/components/Panels/HubPlaybookPanel";
import { ImageryPanel } from "@/components/Panels/ImageryPanel";
import { LayerScaleControl } from "@/components/Panels/LayerScaleControl";
import { MacroLayersPanel } from "@/components/Panels/MacroLayersPanel";
import { SelectedHexCard } from "@/components/Panels/SelectedHexCard";
import { SourceProvenancePanel } from "@/components/Panels/SourceProvenancePanel";
import { TerrainPanel } from "@/components/Panels/TerrainPanel";
import { UserDataPanel } from "@/components/Panels/UserDataPanel";
import { useVmeshStore } from "@/store/useVmeshStore";

export function AppShell() {
  const activePanel = useVmeshStore((state) => state.activePanel);
  const globeTheme = useVmeshStore((state) => state.globeTheme);

  return (
    <div
      data-globe-theme={globeTheme}
      className={`relative h-screen w-screen overflow-hidden text-[#24323f] transition-colors duration-500 ${
        globeTheme === "dark" ? "bg-[#02050c]" : "bg-[#f7faf9]"
      }`}
    >
      <AppSidebar />
      <AppHeader />
      <section className="absolute bottom-10 left-20 right-0 top-16 overflow-hidden">
        <TerrainGlobe />
        {activePanel === "network" ? <HubNetworkStatusPanel /> : null}
        {activePanel === "playbook" ? <HubPlaybookPanel /> : null}
        {activePanel === "macro" ? <MacroLayersPanel /> : null}
        {activePanel === "terrain" ? <TerrainPanel /> : null}
        {activePanel === "imagery" ? <ImageryPanel /> : null}
        {activePanel === "sources" ? <SourceProvenancePanel /> : null}
        {activePanel === "layers" ? <LayerScaleControl /> : null}
        {activePanel === "hex" ? <SelectedHexCard /> : null}
        {activePanel === "add-data" ? <UserDataPanel /> : null}
        {activePanel === "overview" ? <BottomDataOverview /> : null}
      </section>
      <AppFooter />
    </div>
  );
}

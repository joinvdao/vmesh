"use client";

import { AppFooter } from "@/components/Layout/AppFooter";
import { AppHeader } from "@/components/Layout/AppHeader";
import { AppSidebar } from "@/components/Layout/AppSidebar";
import { TerrainGlobe } from "@/components/Map/TerrainGlobe";
import { BottomAnalytics } from "@/components/Panels/BottomAnalytics";
import { HubNetworkStatusPanel } from "@/components/Panels/HubNetworkStatusPanel";
import { HubPlaybookPanel } from "@/components/Panels/HubPlaybookPanel";
import { LayerScaleControl } from "@/components/Panels/LayerScaleControl";
import { SelectedHexCard } from "@/components/Panels/SelectedHexCard";
import { UserDataPanel } from "@/components/Panels/UserDataPanel";
import { useVmeshStore } from "@/store/useVmeshStore";

export function AppShell() {
  const activePanel = useVmeshStore((state) => state.activePanel);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#f7faf9] text-[#24323f]">
      <AppSidebar />
      <AppHeader />
      <section className="absolute bottom-10 left-20 right-0 top-16 overflow-hidden">
        <TerrainGlobe />
        {activePanel === "network" ? <HubNetworkStatusPanel /> : null}
        {activePanel === "playbook" ? <HubPlaybookPanel /> : null}
        {activePanel === "layers" ? <LayerScaleControl /> : null}
        {activePanel === "hex" ? <SelectedHexCard /> : null}
        {activePanel === "add-data" ? <UserDataPanel /> : null}
        {activePanel === "analytics" ? <BottomAnalytics /> : null}
      </section>
      <AppFooter />
    </div>
  );
}

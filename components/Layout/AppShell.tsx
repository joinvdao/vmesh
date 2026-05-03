"use client";

import { AppFooter } from "@/components/Layout/AppFooter";
import { AppHeader } from "@/components/Layout/AppHeader";
import { AppSidebar } from "@/components/Layout/AppSidebar";
import { TerrainGlobe } from "@/components/Map/TerrainGlobe";
import { BottomAnalytics } from "@/components/Panels/BottomAnalytics";
import { LayerScaleControl } from "@/components/Panels/LayerScaleControl";
import { SelectedHexCard } from "@/components/Panels/SelectedHexCard";
import { UserDataPanel } from "@/components/Panels/UserDataPanel";

export function AppShell() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#f7faf9] text-[#24323f]">
      <AppSidebar />
      <AppHeader />
      <section className="absolute bottom-10 left-64 right-0 top-16 overflow-hidden">
        <TerrainGlobe />
        <LayerScaleControl />
        <SelectedHexCard />
        <UserDataPanel />
      </section>
      <BottomAnalytics />
      <AppFooter />
    </div>
  );
}

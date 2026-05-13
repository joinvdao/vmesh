import { climateSectorBoundary } from "@/lib/macroProviders/climateSectorBoundary";
import { era5Boundary } from "@/lib/macroProviders/era5Boundary";
import { firmsBoundary } from "@/lib/macroProviders/firmsBoundary";
import { nasaPowerBoundary } from "@/lib/macroProviders/nasaPowerBoundary";
import { openMeteoPointBoundary } from "@/lib/macroProviders/openMeteoPoint";
import { solarAccessBoundary } from "@/lib/macroProviders/solarAccessBoundary";
import { terrainFloodBoundary } from "@/lib/macroProviders/terrainFloodBoundary";
import type { MacroPackageProviderBoundary } from "@/lib/macroProviders/types";
import { windRoseBoundary } from "@/lib/macroProviders/windRoseBoundary";

export type { MacroPackageProviderBoundary } from "@/lib/macroProviders/types";

export const macroPackageProviderBoundaries: MacroPackageProviderBoundary[] = [
  openMeteoPointBoundary,
  nasaPowerBoundary,
  era5Boundary,
  firmsBoundary,
  terrainFloodBoundary,
  solarAccessBoundary,
  windRoseBoundary,
  climateSectorBoundary
];

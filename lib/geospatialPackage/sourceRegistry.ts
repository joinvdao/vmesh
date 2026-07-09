import type { GeospatialSourceCandidate, PackageLayerId } from "@/lib/geospatialPackage/types";
import {
  getTerrainPackageSources,
  type TerrainPackageSourceOptions
} from "@/lib/geospatialPackage/sourceRegistryTerrain";
import { getRegionalTerrainPackageSources } from "@/lib/geospatialPackage/sourceRegistryRegionalTerrain";
import {
  getOpenDataPackageSources,
  type OpenDataPackageSourceOptions
} from "@/lib/geospatialPackage/sourceRegistryOpenData";
import { getClimateHydrologyPackageSources } from "@/lib/geospatialPackage/sourceRegistryClimate";
import { getEnvironmentPackageSources } from "@/lib/geospatialPackage/sourceRegistryEnvironment";

export interface GeospatialSourceRegistryOptions
  extends TerrainPackageSourceOptions, OpenDataPackageSourceOptions {
  basemapPmtilesUrl?: string;
}

export function getGeospatialSourceRegistry(
  options: GeospatialSourceRegistryOptions = {}
): GeospatialSourceCandidate[] {
  return [
    ...getTerrainPackageSources(options),
    ...getRegionalTerrainPackageSources(),
    ...getOpenDataPackageSources(options),
    ...getClimateHydrologyPackageSources(),
    ...getEnvironmentPackageSources()
  ].sort((left, right) => left.priority - right.priority);
}

export function getPackageSourcesByLayer(
  sources: GeospatialSourceCandidate[],
  layerId: PackageLayerId
): GeospatialSourceCandidate[] {
  return sources.filter((candidate) => candidate.layerIds.includes(layerId));
}

export function getDefaultPackageLayers(): PackageLayerId[] {
  return [
    "terrain",
    "imagery",
    "roads",
    "buildings",
    "water",
    "vegetation",
    "ecology",
    "soil",
    "climate",
    "hydrology",
    "contours",
    "landcover"
  ];
}

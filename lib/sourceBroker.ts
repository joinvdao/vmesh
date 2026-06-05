import { getBasemapProviderRegistry, selectBasemapProvider } from "@/lib/basemapSources";
import {
  getClimateDataSourceRegistry,
  selectClimateSourceForLayer
} from "@/lib/climateDataSources";
import {
  createLayerCatalogSummary,
  getMacroLayerCatalog,
  type LayerCatalogSummary,
  type LayerDataStatus,
  type LayerReadiness
} from "@/lib/layerCatalog";
import { getOpenMapSourceRegistry, createOpenMapFunnelSummary } from "@/lib/openMapSources";
import {
  createDataPackageManifest,
  validateDataPackageManifest,
  type DataPackageManifest,
  type RejectedSourceRecord
} from "@/lib/sourcePackages";
import {
  createSourceProvenance,
  type GroundModelRole,
  type SourceProvenance
} from "@/lib/sourceProvenance";
import {
  getTerrainProviderCandidates,
  getTerrainProviderRegistry,
  selectTerrainProvider
} from "@/lib/terrainSources";
import { getImageryProviderRegistry, selectImageryProvider } from "@/lib/imagerySources";
import type {
  BasemapProviderConfig,
  ClimateDataSourceConfig,
  ClimateLayerId,
  ImageryProviderConfig,
  OpenMapSourceConfig,
  TerrainProviderAvailability,
  TerrainProviderConfig
} from "@/lib/vmeshTypes";

export interface SourceBrokerInput {
  h3Id: string;
  centroid: {
    latitude: number;
    longitude: number;
  };
  bounds?: [number, number, number, number];
  preferredBasemapProviderId?: string;
  preferredTerrainProviderId?: string;
  preferredImageryProviderId?: string;
  climateLayerId?: ClimateLayerId;
  createdAt?: string;
}

export interface SourceBrokerReport {
  openDataFirst: true;
  selected: {
    basemap: BasemapProviderConfig;
    terrain: TerrainProviderConfig;
    climate?: ClimateDataSourceConfig;
    imagery: ImageryProviderConfig;
  };
  candidateCounts: {
    basemap: number;
    terrain: number;
    climate: number;
    imagery: number;
    openMap: number;
  };
  layerCatalogSummary: LayerCatalogSummary;
  openMapSummary: ReturnType<typeof createOpenMapFunnelSummary>;
  packageManifest: DataPackageManifest;
  rejectedSources: RejectedSourceRecord[];
  recommendations: string[];
}

function readinessFromAvailability(
  status: TerrainProviderAvailability
): LayerReadiness | LayerDataStatus {
  if (status === "available") return "active-runtime";
  if (status === "fallback") return "fallback";
  if (status === "future") return "broker-planned";
  if (status === "requires-api-key") return "disabled";
  if (status === "requires-license") return "disabled";
  return "broker-planned";
}

function terrainRole(provider: TerrainProviderConfig): GroundModelRole {
  if (provider.id.includes("cudem")) return "topobathy";
  if (provider.id.includes("fabdem")) return "generic-dem";
  if (provider.kind === "dataset-dem") return "generic-dem";
  if (provider.kind === "api-dem") return "generic-dem";
  return "generic-dem";
}

function createTerrainProvenance(provider: TerrainProviderConfig): SourceProvenance {
  return createSourceProvenance({
    providerId: provider.id,
    sourceId: provider.id,
    sourceType: provider.status === "available" ? "static" : "future-provider",
    sourceUrl: provider.sourceUrl,
    groundModelRole: terrainRole(provider),
    vintage: "provider archive",
    license: provider.license,
    attribution: provider.attribution,
    confidence: provider.status === "available" ? 68 : 38,
    limitations: [
      provider.notes,
      "Terrain role remains confidence-capped unless source metadata proves bare-earth DTM semantics."
    ]
  });
}

function createClimateProvenance(provider?: ClimateDataSourceConfig): SourceProvenance {
  if (!provider) {
    return createSourceProvenance({
      providerId: "no-climate-source",
      sourceId: "no-climate-source",
      sourceType: "mock",
      groundModelRole: "not-authoritative",
      license: "No source selected",
      attribution: "vmesh mock climate context",
      confidence: 20,
      limitations: ["No climate provider candidate was selected."]
    });
  }

  return createSourceProvenance({
    providerId: provider.id,
    sourceId: provider.id,
    sourceType: provider.status === "available" ? "live" : "future-provider",
    sourceUrl: provider.sourceUrl,
    groundModelRole: "not-authoritative",
    vintage: provider.queryMode,
    license: provider.license,
    attribution: provider.attribution,
    confidence: provider.status === "available" ? 70 : 36,
    limitations: [provider.notes, "Climate and hazard layers are decision-support context only."]
  });
}

function createImageryProvenance(provider: ImageryProviderConfig): SourceProvenance {
  return createSourceProvenance({
    providerId: provider.id,
    sourceId: provider.id,
    sourceType: provider.status === "available" ? "static" : "future-provider",
    sourceUrl: provider.sourceUrl,
    groundModelRole:
      provider.kind === "sentinel2-sen2sr-pmtiles" || provider.kind === "sentinel2-sen2sr-xyz"
        ? "imagery-inferred-context"
        : "visual-context",
    vintage: "manifest/provider-specific",
    license: provider.license,
    attribution: provider.attribution,
    confidence: provider.status === "available" || provider.status === "fallback" ? 56 : 30,
    limitations: [
      provider.notes,
      "Imagery cannot raise terrain, parcel, road, building, legal, or emergency authority."
    ]
  });
}

function rejectedProviderRecords(
  providers: Array<
    TerrainProviderConfig | ImageryProviderConfig | BasemapProviderConfig | OpenMapSourceConfig
  >,
  selectedIds: Set<string>
): RejectedSourceRecord[] {
  return providers
    .filter((provider) => !selectedIds.has(provider.id))
    .filter(
      (provider) =>
        provider.requiresApiKey ||
        provider.status === "future" ||
        provider.status === "requires-api-key" ||
        provider.status === "requires-license" ||
        provider.status === "preprocessing-required"
    )
    .map((provider) => ({
      providerId: provider.id,
      reason:
        provider.status === "preprocessing-required"
          ? "Requires preprocessing before renderer use"
          : provider.requiresApiKey
            ? "Requires token or terms review"
            : provider.notes,
      status: readinessFromAvailability(provider.status)
    }));
}

export function createSourceBrokerReport(input: SourceBrokerInput): SourceBrokerReport {
  const basemapProviders = getBasemapProviderRegistry({
    preferredProviderId: input.preferredBasemapProviderId
  });
  const terrainProviders = getTerrainProviderRegistry({
    preferredProviderId: input.preferredTerrainProviderId
  });
  const climateSources = getClimateDataSourceRegistry();
  const imageryProviders = getImageryProviderRegistry({
    preferredProviderId: input.preferredImageryProviderId
  });
  const openMapSources = getOpenMapSourceRegistry();

  const selectedBasemap = selectBasemapProvider(basemapProviders, input.preferredBasemapProviderId);
  const selectedTerrain =
    getTerrainProviderCandidates(terrainProviders, input.preferredTerrainProviderId)[0] ??
    selectTerrainProvider(terrainProviders, input.preferredTerrainProviderId);
  const selectedClimate = selectClimateSourceForLayer(
    climateSources,
    input.climateLayerId ?? "weather"
  );
  const selectedImagery = selectImageryProvider(imageryProviders, input.preferredImageryProviderId);

  const selectedIds = new Set([
    selectedBasemap.id,
    selectedTerrain.id,
    selectedClimate?.id ?? "",
    selectedImagery.id
  ]);
  const rejectedSources = rejectedProviderRecords(
    [...basemapProviders, ...terrainProviders, ...imageryProviders, ...openMapSources],
    selectedIds
  );

  const packageManifest = createDataPackageManifest({
    id: `vmesh-macro-package-${input.h3Id}`,
    label: "vmesh macro atlas package",
    aoi: {
      h3Id: input.h3Id,
      bounds: input.bounds,
      centroid: input.centroid
    },
    payloads: {
      terrain: "terrain.json",
      imagery: "imagery.json",
      landcover: "landcover.json",
      environment: "environment.json",
      contours: "contours.json"
    },
    sources: [
      createTerrainProvenance(selectedTerrain),
      createClimateProvenance(selectedClimate),
      createImageryProvenance(selectedImagery)
    ],
    rejectedSources,
    createdAt: input.createdAt
  });

  return {
    openDataFirst: true,
    selected: {
      basemap: selectedBasemap,
      terrain: selectedTerrain,
      climate: selectedClimate,
      imagery: selectedImagery
    },
    candidateCounts: {
      basemap: basemapProviders.length,
      terrain: terrainProviders.length,
      climate: climateSources.length,
      imagery: imageryProviders.length,
      openMap: openMapSources.length
    },
    layerCatalogSummary: createLayerCatalogSummary(getMacroLayerCatalog()),
    openMapSummary: createOpenMapFunnelSummary(openMapSources),
    packageManifest,
    rejectedSources,
    recommendations: [
      "Keep the globe renderer on map-ready sources and package manifests.",
      "Convert Overture, OSM extracts, landcover, climate grids, and Sentinel products into H3 summaries outside the browser.",
      "Treat Mapterhorn and Mapzen as generic DEM unless source metadata proves DTM semantics.",
      "Keep super-resolved Sentinel as imagery-inferred context only."
    ]
  };
}

export function validateSourceBrokerReport(report: SourceBrokerReport): boolean {
  return (
    report.openDataFirst === true &&
    report.selected.basemap.id.length > 0 &&
    report.selected.terrain.id.length > 0 &&
    report.selected.imagery.id.length > 0 &&
    report.candidateCounts.terrain > 0 &&
    report.layerCatalogSummary.totalLayers > 0 &&
    validateDataPackageManifest(report.packageManifest)
  );
}

import {
  DEFAULT_SELECTED_HEX_ID,
  createInitialHubPlaybookState,
  createMockMacroCellSummary,
  initialHexDataByTier,
  initialMacroSummariesByH3,
  initialUserRecords,
  mockFoodNetworkAssets,
  mockHubMessages,
  mockHubNodeStatus,
  mockImageryManifest,
  mockPropertySignals,
  summarizeFoodNetwork
} from "@/data/mockVmeshData";
import macroPackageManifestJson from "@/fixtures/macro-packages/western-europe-demo.manifest.json";
import macroPackageSummaryJson from "@/fixtures/macro-packages/western-europe-demo.h3-summary.json";
import { getBasemapProviderRegistry, selectBasemapProvider } from "@/lib/basemapSources";
import { DEFAULT_FOCUS, MESH_TIER_DEFINITIONS } from "@/lib/h3Mesh";
import {
  getImageryProviderRegistry,
  selectImageryProvider,
  SENTINEL_COG_PREVIEW_PROVIDER_ID
} from "@/lib/imagerySources";
import { MAPBOX_SATELLITE_PROXY_TILE_URL } from "@/lib/mapboxSatelliteProxy";
import { importMacroPackageSummaries } from "@/lib/macro-packages/macroPackageImport";
import {
  macroPackageModeLabel,
  type MacroPackageH3SummaryArtifact,
  type MacroPackageManifest
} from "@/lib/macro-packages/macroPackages";
import {
  getMacroProviderRegistry,
  OPEN_METEO_PROVIDER_ID,
  selectMacroProvider
} from "@/lib/macroSources";
import {
  getContourProviderRegistry,
  getTerrainProviderRegistry,
  selectTerrainProvider
} from "@/lib/terrainSources";
import { findHexRecord } from "@/store/vmeshStoreHelpers";
import type { VmeshState } from "@/store/vmeshStoreTypes";

const publicEnv = {
  terrainProvider:
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_TERRAIN_PROVIDER : undefined,
  terrainTileJsonUrl:
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_TERRAIN_TILEJSON_URL : undefined,
  mapterhornPmtilesUrl:
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_MAPTERHORN_PMTILES_URL : undefined,
  mapzenTerrariumUrl:
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_MAPZEN_TERRARIUM_URL : undefined,
  basemapProvider:
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_BASEMAP_PROVIDER : undefined,
  basemapStyleUrl:
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_BASEMAP_STYLE_URL : undefined,
  basemapPmtilesUrl:
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_BASEMAP_PMTILES_URL : undefined,
  imageryProvider:
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_IMAGERY_PROVIDER : undefined,
  mapboxToken: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_MAPBOX_TOKEN : undefined,
  mapboxProxyUrl:
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_MAPBOX_PROXY_URL ||
        (process.env.NEXT_PUBLIC_MAPBOX_PROXY_ENABLED === "true"
          ? MAPBOX_SATELLITE_PROXY_TILE_URL
          : undefined)
      : undefined,
  sentinelPreviewTileUrl:
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SENTINEL_PREVIEW_TILE_URL : undefined,
  sen2srPmtilesUrl:
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SEN2SR_PMTILES_URL : undefined,
  sen2srXyzUrl: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SEN2SR_XYZ_URL : undefined,
  offlineRasterPmtilesUrl:
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_OFFLINE_RASTER_PMTILES_URL : undefined
};

const terrainProviderPreference = publicEnv.terrainProvider;
const basemapProviderPreference = publicEnv.basemapProvider;
const imageryProviderPreference = publicEnv.imageryProvider;

const basemapProviders = getBasemapProviderRegistry({
  preferredProviderId: basemapProviderPreference,
  customStyleUrl: publicEnv.basemapStyleUrl,
  protomapsPmtilesUrl: publicEnv.basemapPmtilesUrl,
  mapboxToken: publicEnv.mapboxToken,
  mapboxProxyUrl: publicEnv.mapboxProxyUrl
});
const selectedBasemapProvider = selectBasemapProvider(basemapProviders, basemapProviderPreference);

const terrainProviders = getTerrainProviderRegistry({
  envTileJsonUrl: publicEnv.terrainTileJsonUrl,
  preferredProviderId: terrainProviderPreference,
  mapterhornPmtilesUrl: publicEnv.mapterhornPmtilesUrl,
  mapzenTerrariumUrl: publicEnv.mapzenTerrariumUrl
});
const selectedProvider = selectTerrainProvider(terrainProviders, terrainProviderPreference);

const contourProviders = getContourProviderRegistry();
const macroProviders = getMacroProviderRegistry();
const selectedMacroProvider = selectMacroProvider(macroProviders, OPEN_METEO_PROVIDER_ID);

const imageryProviders = getImageryProviderRegistry({
  preferredProviderId: imageryProviderPreference,
  mapboxToken: publicEnv.mapboxToken,
  mapboxProxyUrl: publicEnv.mapboxProxyUrl,
  sentinelPreviewTileUrl: publicEnv.sentinelPreviewTileUrl,
  sen2srPmtilesUrl: publicEnv.sen2srPmtilesUrl,
  sen2srXyzUrl: publicEnv.sen2srXyzUrl,
  offlineRasterPmtilesUrl: publicEnv.offlineRasterPmtilesUrl
});
const selectedImageryProvider = selectImageryProvider(
  imageryProviders,
  imageryProviderPreference ?? SENTINEL_COG_PREVIEW_PROVIDER_ID
);

const initialSelected =
  findHexRecord(initialHexDataByTier, DEFAULT_SELECTED_HEX_ID) ?? initialHexDataByTier.U5[0];
const macroPackageManifest = macroPackageManifestJson as MacroPackageManifest;
const macroPackageSummary = macroPackageSummaryJson as MacroPackageH3SummaryArtifact;
const importedMacroPackage = importMacroPackageSummaries({
  manifest: macroPackageManifest,
  summary: macroPackageSummary,
  selectedH3Id: initialSelected.h3Id
});
const packagedMacroSummariesByH3 = {
  ...initialMacroSummariesByH3,
  ...importedMacroPackage.summariesByH3
};
const initialMacroSummary =
  packagedMacroSummariesByH3[initialSelected.h3Id] ?? createMockMacroCellSummary(initialSelected);

export const initialVmeshState: VmeshState = {
  viewState: {
    longitude: DEFAULT_FOCUS.longitude,
    latitude: DEFAULT_FOCUS.latitude,
    zoom: 2.35,
    pitch: 28,
    bearing: -12
  },
  globeTheme: "dark",
  globeBackdropMode: "stars",
  selectedHexId: initialSelected.h3Id,
  selectedTier: "U5",
  hoveredHexInfo: null,
  globalResolution: 5,
  visibleHexCount: 1,
  activeLayers: {
    macro: false,
    micro: true,
    userAdded: true,
    terrain: true,
    context: false,
    imagery: false
  },
  activePanel: null,
  layerScale: 44,
  meshTiers: MESH_TIER_DEFINITIONS,
  hexDataByTier: initialHexDataByTier,
  selectedHexDetails: initialSelected,
  userRecords: initialUserRecords,
  draftUserRecord: {
    category: "observation",
    title: ""
  },
  mapStatus: {
    map: "idle",
    basemap: "idle",
    terrain: "idle",
    contours: "fallback",
    macro: "active",
    imagery: "idle",
    providerId: selectedProvider.id,
    basemapProviderId: selectedBasemapProvider.id,
    macroProviderId: selectedMacroProvider.id,
    imageryProviderId: selectedImageryProvider.id,
    message: "Source layers initialized; terrain source not initialized"
  },
  basemapProviders,
  terrainProviders,
  contourProviders,
  macroProviders,
  imageryProviders,
  selectedBasemapProviderId: selectedBasemapProvider.id,
  selectedTerrainProviderId: selectedProvider.id,
  selectedMacroProviderId: selectedMacroProvider.id,
  selectedMacroLayer: "terrain-elevation",
  macroLayerOpacity: 0.54,
  macroSummariesByH3: packagedMacroSummariesByH3,
  macroCache: {},
  selectedMacroSummary: initialMacroSummary,
  macroPackageManifest,
  macroPackageSummary,
  macroDataModeLabel: macroPackageModeLabel(macroPackageManifest.mode),
  selectedImageryProviderId: selectedImageryProvider.id,
  selectedImageryLayer: "sentinel2-recent-clear",
  imageryOpacity: 0.62,
  imageryManifest: mockImageryManifest,
  foodNetworkAssets: mockFoodNetworkAssets,
  propertySignals: mockPropertySignals,
  selectedFoodNetworkSummary: summarizeFoodNetwork(initialSelected.h3Id),
  hubPlaybook: createInitialHubPlaybookState(initialSelected.h3Id),
  hubNodeStatus: mockHubNodeStatus,
  hubMessages: mockHubMessages,
  dataFreshness: "15m ago",
  flyToRequest: null
};

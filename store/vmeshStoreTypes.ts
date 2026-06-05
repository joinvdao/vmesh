import type {
  ActiveLayers,
  BasemapProviderConfig,
  ContourProviderConfig,
  DashboardPanel,
  DraftUserRecord,
  FoodNetworkAsset,
  GlobeBackdropMode,
  GlobeTheme,
  HubMessageEnvelope,
  HubNodeStatus,
  HubPlaybookState,
  HoveredHexInfo,
  ImageryLayerId,
  ImageryProviderConfig,
  ImageryTileManifest,
  MapFlyToRequest,
  MapStatus,
  MacroCellSummary,
  MacroLayerId,
  MacroProviderConfig,
  MeshTier,
  MeshTierDefinition,
  MicroFoodNetworkSummary,
  PropertySignalSummary,
  TerrainProviderConfig,
  TerrainProviderStatus,
  UserRecord,
  VmeshHexRecord,
  ViewState
} from "@/lib/vmeshTypes";
import type {
  MacroPackageH3SummaryArtifact,
  MacroPackageManifest
} from "@/lib/macro-packages/macroPackages";

export interface VmeshState {
  viewState: ViewState;
  globeTheme: GlobeTheme;
  globeBackdropMode: GlobeBackdropMode;
  selectedHexId: string;
  selectedTier: MeshTier;
  hoveredHexInfo: HoveredHexInfo | null;
  globalResolution: number;
  visibleHexCount: number;
  activeLayers: ActiveLayers;
  activePanel: DashboardPanel | null;
  layerScale: number;
  meshTiers: MeshTierDefinition[];
  hexDataByTier: Record<MeshTier, VmeshHexRecord[]>;
  selectedHexDetails: VmeshHexRecord;
  userRecords: UserRecord[];
  draftUserRecord: DraftUserRecord;
  mapStatus: MapStatus;
  basemapProviders: BasemapProviderConfig[];
  terrainProviders: TerrainProviderConfig[];
  contourProviders: ContourProviderConfig[];
  macroProviders: MacroProviderConfig[];
  imageryProviders: ImageryProviderConfig[];
  selectedBasemapProviderId: string;
  selectedTerrainProviderId: string;
  selectedMacroProviderId: string;
  selectedMacroLayer: MacroLayerId;
  macroLayerOpacity: number;
  macroSummariesByH3: Record<string, MacroCellSummary>;
  macroCache: Record<string, MacroCellSummary>;
  selectedMacroSummary: MacroCellSummary;
  macroPackageManifest: MacroPackageManifest;
  macroPackageSummary: MacroPackageH3SummaryArtifact;
  macroDataModeLabel: string;
  selectedImageryProviderId: string;
  selectedImageryLayer: ImageryLayerId;
  imageryOpacity: number;
  imageryManifest: ImageryTileManifest;
  foodNetworkAssets: FoodNetworkAsset[];
  propertySignals: PropertySignalSummary[];
  selectedFoodNetworkSummary: MicroFoodNetworkSummary;
  hubPlaybook: HubPlaybookState;
  hubNodeStatus: HubNodeStatus;
  hubMessages: HubMessageEnvelope[];
  dataFreshness: string;
  flyToRequest: MapFlyToRequest | null;
}

export interface VmeshActions {
  setViewState: (viewState: Partial<ViewState>) => void;
  toggleGlobeTheme: () => void;
  cycleGlobeBackdropMode: () => void;
  setGlobeBackdropMode: (mode: GlobeBackdropMode) => void;
  flyToLocation: (location: Omit<MapFlyToRequest, "id">) => void;
  selectHex: (h3Id: string, tier?: MeshTier) => void;
  setActivePanel: (panel: DashboardPanel | null) => void;
  togglePanel: (panel: DashboardPanel) => void;
  setHoveredHexInfo: (hoveredHexInfo: HoveredHexInfo | null) => void;
  setSelectedTier: (tier: MeshTier) => void;
  setLayerEnabled: (layer: keyof ActiveLayers, enabled: boolean) => void;
  setLayerScale: (layerScale: number) => void;
  setVisibleHexCount: (visibleHexCount: number) => void;
  addUserRecord: () => boolean;
  updateDraftUserRecord: (draft: Partial<DraftUserRecord>) => void;
  clearDraftUserRecord: () => void;
  setMapStatus: (status: Partial<MapStatus>) => void;
  setBasemapStatus: (status: TerrainProviderStatus, message?: string) => void;
  setTerrainStatus: (status: TerrainProviderStatus, message?: string) => void;
  setContourStatus: (status: TerrainProviderStatus, message?: string) => void;
  setMacroStatus: (status: TerrainProviderStatus, message?: string) => void;
  setImageryStatus: (status: TerrainProviderStatus, message?: string) => void;
  setActiveBasemapProvider: (providerId: string, message?: string) => void;
  setSelectedTerrainProvider: (providerId: string) => void;
  setActiveTerrainProvider: (providerId: string, message?: string) => void;
  setSelectedImageryProvider: (providerId: string) => void;
  setActiveImageryProvider: (providerId: string, message?: string) => void;
  setSelectedMacroLayer: (layer: MacroLayerId) => void;
  setMacroLayerOpacity: (opacity: number) => void;
  loadSelectedMacroWeather: () => Promise<void>;
  setSelectedImageryLayer: (layer: ImageryLayerId) => void;
  setImageryOpacity: (opacity: number) => void;
  toggleHubPlaybookTask: (taskId: string) => void;
  updateHubPlaybookTaskNotes: (taskId: string, notes: string) => void;
}

export type VmeshStore = VmeshState & VmeshActions;

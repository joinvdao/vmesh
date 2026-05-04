export type MeshTier = "U3" | "U5" | "U8";

export type TerrainProviderKind =
  | "raster-dem-xyz"
  | "raster-dem-tilejson"
  | "pmtiles-raster-dem"
  | "api-dem"
  | "dataset-dem"
  | "stac-catalog";

export type TerrainProviderStatus =
  | "idle"
  | "loading"
  | "active"
  | "fallback"
  | "unavailable"
  | "error";

export type TerrainProviderAvailability =
  | "available"
  | "fallback"
  | "future"
  | "requires-api-key"
  | "requires-license"
  | "preprocessing-required";

export type TerrainEncoding =
  | "terrarium"
  | "mapbox"
  | "geotiff"
  | "cog"
  | "pmtiles"
  | "stac"
  | "api";

export interface TerrainProviderConfig {
  id: string;
  label: string;
  kind: TerrainProviderKind;
  encoding: TerrainEncoding;
  tileSize?: number;
  maxzoom?: number;
  attribution: string;
  license: string;
  requiresApiKey: boolean;
  coverage: string;
  resolution: string;
  status: TerrainProviderAvailability;
  sourceUrl: string;
  priority: number;
  notes: string;
}

export interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface MapFlyToRequest {
  id: number;
  longitude: number;
  latitude: number;
  zoom: number;
  label: string;
}

export interface HoveredHexInfo {
  h3Id: string;
  tier: MeshTier;
  x: number;
  y: number;
}

export interface MacroPillars {
  climate: number;
  energy: number;
  water: number;
  infrastructure: number;
  biodiversity: number;
  risk: number;
}

export interface MicroSummary {
  properties: number;
  farmersMarkets: number;
  growers: number;
  communityAssets: number;
  localServices: number;
}

export interface UserSummary {
  privateNotes: number;
  observations: number;
  corrections: number;
}

export interface TrendPoint {
  year: number;
  value: number;
}

export interface ProvenanceSummary {
  label: string;
  sourceCount: number;
  updatedAt: string;
  license: string;
}

export interface VmeshHexRecord {
  h3Id: string;
  tier: MeshTier;
  resolution: number;
  label: string;
  placeName: string;
  antifragilityScore: number;
  macro: MacroPillars;
  micro: MicroSummary;
  user: UserSummary;
  provenance: ProvenanceSummary;
  confidence: number;
  trend: TrendPoint[];
  parentH3Id?: string;
}

export type UserRecordCategory =
  | "property-note"
  | "farmers-market"
  | "grower"
  | "community-asset"
  | "observation"
  | "correction";

export interface UserRecord {
  id: string;
  category: UserRecordCategory;
  title: string;
  h3Id: string;
  visibility: "private-local";
  provenance: "user-added-local";
  confidence: number;
  createdAt: string;
  updatedAt: string;
}

export interface DraftUserRecord {
  category: UserRecordCategory;
  title: string;
}

export interface ActiveLayers {
  macro: boolean;
  micro: boolean;
  userAdded: boolean;
  terrain: boolean;
  context: boolean;
}

export interface MeshTierDefinition {
  tier: MeshTier;
  resolution: number;
  label: string;
  description: string;
}

export interface MapStatus {
  map: TerrainProviderStatus;
  terrain: TerrainProviderStatus;
  contours: TerrainProviderStatus;
  providerId: string;
  message: string;
}

export type ContourProviderKind = "derived-dem-placeholder" | "precomputed-vector-pmtiles";

export interface ContourProviderConfig {
  id: string;
  label: string;
  kind: ContourProviderKind;
  status: TerrainProviderStatus;
  sourceUrl?: string;
  intervalMeters: number;
  attribution: string;
  notes: string;
}

export interface DataProvenance {
  sourceId: string;
  sourceLabel: string;
  sourceType: "mock" | "provider-interface" | "user-added-local" | "public-open-data";
  updatedAt: string;
  license: string;
  confidence: number;
}

export interface MacroClimateSummary {
  currentConditions: string;
  forecastSummary: string;
  heatStress: number;
  coldStress: number;
  windExposure: number;
  rainfallOutlook: number;
  droughtIndicator: number;
  provenance: DataProvenance;
}

export interface HazardRiskSummary {
  floodExposureScore: number;
  floodInputs: string[];
  fireRiskClass: "low" | "moderate" | "high" | "severe";
  fireRiskScore: number;
  fireInputs: string[];
  confidence: number;
  provenance: DataProvenance;
}

export interface SolarPotentialSummary {
  score: number;
  slopeReadiness: number;
  aspectReadiness: number;
  cloudinessPenalty: number;
  irradianceBand: "low" | "medium" | "high";
  hubUseInterpretation: string;
  provenance: DataProvenance;
}

export type FoodNetworkAssetType =
  | "farm"
  | "grower"
  | "farmers-market"
  | "food-hub"
  | "community-garden"
  | "storage"
  | "distribution-point";

export interface FoodNetworkAsset {
  id: string;
  type: FoodNetworkAssetType;
  name: string;
  h3Id: string;
  availability: "year-round" | "seasonal" | "intermittent" | "unknown";
  seasonality: string;
  contact: "not-stored" | "public-directory" | "user-added-private";
  provenance: DataProvenance;
}

export interface MicroFoodNetworkSummary {
  assets: FoodNetworkAsset[];
  farms: number;
  growers: number;
  farmersMarkets: number;
  foodHubs: number;
  communityGardens: number;
  storageAndDistribution: number;
}

export interface PropertySignalSummary {
  id: string;
  listingType: "land" | "homestead" | "mixed-use" | "unknown";
  h3Id: string;
  priceBand: "under-100k" | "100k-250k" | "250k-500k" | "500k-plus" | "unknown";
  acreageBand: "under-1" | "1-5" | "5-20" | "20-plus" | "unknown";
  approximateLocation: string;
  waterNotes: string;
  soilNotes: string;
  solarNotes: string;
  accessNotes: string;
  source: DataProvenance;
}

export type HubPlaybookDimension =
  | "water"
  | "food"
  | "power"
  | "comms"
  | "access"
  | "shelter"
  | "tools"
  | "governance";

export interface HubPlaybookTask {
  id: string;
  h3Id: string;
  dimension: HubPlaybookDimension;
  title: string;
  phase: "assess" | "stabilize" | "build" | "operate";
  complete: boolean;
  notes: string;
}

export interface HubPlaybookState {
  active: boolean;
  selectedH3Id: string;
  readinessScore: number;
  tasks: HubPlaybookTask[];
  updatedAt: string;
}

export type NetworkNodeStatus = "offline" | "local-only" | "bridge-connected" | "degraded";

export interface ReticulumGatewayStatus {
  status: NetworkNodeStatus;
  reachablePeers: number;
  queuedMessages: number;
  notes: string;
}

export interface MeshtasticBridgeStatus {
  status: NetworkNodeStatus;
  connectedNode: string;
  radioPath: "mock" | "serial" | "ble" | "tcp" | "mqtt";
  notes: string;
}

export interface LocalLlmStatus {
  status: NetworkNodeStatus;
  endpoint: string;
  modelLabel: string;
  notes: string;
}

export interface HubNodeStatus {
  reticulum: ReticulumGatewayStatus;
  meshtastic: MeshtasticBridgeStatus;
  localLlm: LocalLlmStatus;
  lanMode: "offline-ready" | "online-assisted";
  updatedAt: string;
}

export interface HubMessageEnvelope {
  id: string;
  h3Id: string;
  timestamp: string;
  priority: "routine" | "important" | "urgent";
  payloadType: "check-in" | "cell-status" | "hazard" | "need-offer" | "resource-report";
  payload: string;
  signaturePlaceholder: string;
  provenance: DataProvenance;
}

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
  providerId: string;
  message: string;
}

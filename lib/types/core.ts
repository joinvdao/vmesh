export type MeshTier = "U3" | "U5" | "U8";

export type GlobeTheme = "dark" | "light";

export type GlobeBackdropMode = "blank" | "grid" | "stars";

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
  imagery: boolean;
}

export type DashboardPanel =
  | "hex"
  | "layers"
  | "macro"
  | "terrain"
  | "imagery"
  | "sources"
  | "analytics"
  | "add-data"
  | "playbook"
  | "network";

export interface MeshTierDefinition {
  tier: MeshTier;
  resolution: number;
  label: string;
  description: string;
}

export interface DataProvenance {
  sourceId: string;
  sourceLabel: string;
  sourceType: "mock" | "provider-interface" | "user-added-local" | "public-open-data";
  updatedAt: string;
  license: string;
  confidence: number;
}

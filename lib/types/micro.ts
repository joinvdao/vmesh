import type { DataProvenance } from "@/lib/types/core";

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

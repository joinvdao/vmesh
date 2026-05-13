import { cellToLatLng, cellToParent, getResolution, gridDisk, latLngToCell } from "h3-js";

import { DEFAULT_U5_CELL, generateLocalU8Cells, MESH_TIER_RESOLUTIONS } from "@/lib/h3Mesh";
import { createMockSentinelManifest } from "@/lib/imagerySources";
import { computeAntifragilityScore } from "@/lib/meshScoring";
import type {
  DataProvenance,
  FoodNetworkAsset,
  HazardRiskSummary,
  HubMessageEnvelope,
  HubNodeStatus,
  HubPlaybookState,
  ImageryTileManifest,
  MacroClimateSummary,
  MacroCellSummary,
  MacroPillars,
  MacroProvenance,
  MeshTier,
  MicroFoodNetworkSummary,
  MicroSummary,
  PropertySignalSummary,
  ProvenanceSummary,
  SolarPotentialSummary,
  UserRecord,
  UserSummary,
  VmeshHexRecord
} from "@/lib/vmeshTypes";

interface SeedPlace {
  label: string;
  placeName: string;
  latitude: number;
  longitude: number;
}

const u3Seeds: SeedPlace[] = [
  { label: "Atlantic Europe", placeName: "Atlantic Europe", latitude: 46.2, longitude: -8.7 },
  { label: "Iberian Arc", placeName: "Iberian Peninsula", latitude: 40.1, longitude: -4.2 },
  {
    label: "Western Mediterranean",
    placeName: "Western Mediterranean",
    latitude: 39.1,
    longitude: 7.6
  },
  { label: "North Sea", placeName: "North Sea Region", latitude: 55.1, longitude: 4.2 },
  { label: "Nordic Forest Belt", placeName: "Nordic Forest Belt", latitude: 61.2, longitude: 15.4 },
  { label: "Alpine Watershed", placeName: "Alpine Watershed", latitude: 46.6, longitude: 9.4 },
  { label: "Maghreb Coast", placeName: "Maghreb Coast", latitude: 34.8, longitude: -3.9 },
  { label: "Sahara Edge", placeName: "Sahara Edge", latitude: 27.4, longitude: 2.1 },
  { label: "British Isles", placeName: "British Isles", latitude: 53.4, longitude: -2.6 },
  { label: "Central Europe", placeName: "Central Europe", latitude: 50.7, longitude: 14.2 },
  {
    label: "Eastern Mediterranean",
    placeName: "Eastern Mediterranean",
    latitude: 36.3,
    longitude: 23.5
  },
  { label: "West African Coast", placeName: "West African Coast", latitude: 14.5, longitude: -16.9 }
];

const u5Seeds: SeedPlace[] = [
  { label: "Lisbon Estuary", placeName: "Lisbon, Portugal", latitude: 38.7223, longitude: -9.1393 },
  { label: "Porto Watershed", placeName: "Porto, Portugal", latitude: 41.1579, longitude: -8.6291 },
  { label: "Douro Valley", placeName: "Douro Valley, Portugal", latitude: 41.16, longitude: -7.79 },
  {
    label: "Alentejo Agro-Solar",
    placeName: "Alentejo, Portugal",
    latitude: 38.05,
    longitude: -7.87
  },
  { label: "Algarve Coast", placeName: "Faro, Portugal", latitude: 37.0194, longitude: -7.9304 },
  {
    label: "Galicia Food Belt",
    placeName: "Galicia, Spain",
    latitude: 42.8782,
    longitude: -8.5448
  },
  {
    label: "Basque Circular Coast",
    placeName: "Bilbao, Spain",
    latitude: 43.263,
    longitude: -2.935
  },
  { label: "Madrid Water Grid", placeName: "Madrid, Spain", latitude: 40.4168, longitude: -3.7038 },
  {
    label: "Barcelona Commons",
    placeName: "Barcelona, Spain",
    latitude: 41.3874,
    longitude: 2.1686
  },
  { label: "Valencia Huerta", placeName: "Valencia, Spain", latitude: 39.4699, longitude: -0.3763 },
  {
    label: "Seville Heat Commons",
    placeName: "Seville, Spain",
    latitude: 37.3891,
    longitude: -5.9845
  },
  {
    label: "Pyrenees Headwaters",
    placeName: "Andorra / Pyrenees",
    latitude: 42.5063,
    longitude: 1.5218
  },
  { label: "Bordeaux Basin", placeName: "Bordeaux, France", latitude: 44.8378, longitude: -0.5792 },
  {
    label: "Occitanie Food Web",
    placeName: "Toulouse, France",
    latitude: 43.6047,
    longitude: 1.4442
  },
  {
    label: "Marseille Littoral",
    placeName: "Marseille, France",
    latitude: 43.2965,
    longitude: 5.3698
  },
  { label: "Lyon Energy Valley", placeName: "Lyon, France", latitude: 45.764, longitude: 4.8357 },
  {
    label: "Zurich Circular Hub",
    placeName: "Zurich, Switzerland",
    latitude: 47.3769,
    longitude: 8.5417
  },
  { label: "Milan Po Valley", placeName: "Milan, Italy", latitude: 45.4642, longitude: 9.19 },
  {
    label: "Copenhagen Blue-Green",
    placeName: "Copenhagen, Denmark",
    latitude: 55.6761,
    longitude: 12.5683
  },
  {
    label: "Stockholm Resilience",
    placeName: "Stockholm, Sweden",
    latitude: 59.3293,
    longitude: 18.0686
  }
];

function uniqueCells(seeds: SeedPlace[], tier: MeshTier): SeedPlace[] {
  const seen = new Set<string>();
  return seeds.filter((seed) => {
    const h3Id = latLngToCell(seed.latitude, seed.longitude, MESH_TIER_RESOLUTIONS[tier]);
    if (seen.has(h3Id)) return false;
    seen.add(h3Id);
    return true;
  });
}

function macroForSeed(seed: number): MacroPillars {
  return {
    climate: 54 + ((seed * 7) % 34),
    energy: 58 + ((seed * 9) % 30),
    water: 42 + ((seed * 11) % 36),
    infrastructure: 56 + ((seed * 13) % 31),
    biodiversity: 50 + ((seed * 5) % 37),
    risk: 22 + ((seed * 8) % 44)
  };
}

function microForSeed(seed: number): MicroSummary {
  return {
    properties: 2 + (seed % 7),
    farmersMarkets: 1 + (seed % 4),
    growers: 3 + ((seed * 2) % 8),
    communityAssets: 2 + ((seed * 3) % 6),
    localServices: 4 + ((seed * 5) % 9)
  };
}

function userForSeed(seed: number): UserSummary {
  return {
    privateNotes: seed % 3,
    observations: 1 + (seed % 4),
    corrections: seed % 2
  };
}

function provenanceForTier(tier: MeshTier): ProvenanceSummary {
  return {
    label: tier === "U8" ? "Local mock/user context" : "Prepopulated open-data sample",
    sourceCount: tier === "U3" ? 7 : tier === "U5" ? 11 : 4,
    updatedAt: "2026-04-30T00:00:00.000Z",
    license: "Mock sample; provider terms pending"
  };
}

function trendForSeed(seed: number, score: number) {
  return Array.from({ length: 5 }, (_, index) => ({
    year: 2022 + index,
    value: Math.max(0, Math.min(100, score - 8 + index * 3 + ((seed + index) % 4)))
  }));
}

function createHexRecord(
  h3Id: string,
  tier: MeshTier,
  seed: number,
  place: SeedPlace
): VmeshHexRecord {
  const macro = macroForSeed(seed);
  const antifragilityScore = computeAntifragilityScore(macro);
  return {
    h3Id,
    tier,
    resolution: getResolution(h3Id),
    label: place.label,
    placeName: place.placeName,
    antifragilityScore,
    macro,
    micro: microForSeed(seed),
    user: userForSeed(seed),
    provenance: provenanceForTier(tier),
    confidence: Math.min(96, 68 + ((seed * 5) % 24)),
    trend: trendForSeed(seed, antifragilityScore),
    parentH3Id: tier === "U8" ? cellToParent(h3Id, MESH_TIER_RESOLUTIONS.U5) : undefined
  };
}

function seedForH3Id(h3Id: string): number {
  return [...h3Id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 97;
}

function placeNameFromSearchLabel(label: string): string {
  const parts = label
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.slice(0, 2).join(", ") || label;
}

const u3Records = uniqueCells(u3Seeds, "U3").map((seed, index) =>
  createHexRecord(
    latLngToCell(seed.latitude, seed.longitude, MESH_TIER_RESOLUTIONS.U3),
    "U3",
    index + 1,
    seed
  )
);

const expandedU3Context = u3Seeds.flatMap((seed, seedIndex) => {
  const centerCell = latLngToCell(seed.latitude, seed.longitude, MESH_TIER_RESOLUTIONS.U3);
  return gridDisk(centerCell, 1).map((h3Id, ringIndex) =>
    createHexRecord(h3Id, "U3", seedIndex * 9 + ringIndex + 1, {
      ...seed,
      label: ringIndex === 0 ? seed.label : `${seed.label} context`,
      placeName: ringIndex === 0 ? seed.placeName : `${seed.placeName} context mesh`
    })
  );
});

const u3ContextRecords = Array.from(
  new Map([...u3Records, ...expandedU3Context].map((record) => [record.h3Id, record])).values()
);

const u5Records = uniqueCells(u5Seeds, "U5").map((seed, index) =>
  createHexRecord(
    latLngToCell(seed.latitude, seed.longitude, MESH_TIER_RESOLUTIONS.U5),
    "U5",
    index + 11,
    seed
  )
);

const defaultU5Record =
  u5Records.find((record) => record.h3Id === DEFAULT_U5_CELL) ??
  createHexRecord(DEFAULT_U5_CELL, "U5", 11, u5Seeds[0]);

export const DEFAULT_SELECTED_HEX_ID = defaultU5Record.h3Id;

export function createLocationHexRecord({
  h3Id,
  tier,
  label,
  latitude,
  longitude
}: {
  h3Id: string;
  tier: MeshTier;
  label: string;
  latitude: number;
  longitude: number;
}): VmeshHexRecord {
  return createHexRecord(h3Id, tier, seedForH3Id(h3Id) + 47, {
    label: "Search target",
    placeName: placeNameFromSearchLabel(label),
    latitude,
    longitude
  });
}

export function generateU8RecordsForParent(
  parentU5: string,
  placeName = defaultU5Record.placeName
): VmeshHexRecord[] {
  return generateLocalU8Cells(parentU5, 48).map((h3Id, index) =>
    createHexRecord(h3Id, "U8", index + 31, {
      label: `Local cell ${index + 1}`,
      placeName: `${placeName} local mesh`,
      latitude: 38.72,
      longitude: -9.14
    })
  );
}

const u8Records = generateU8RecordsForParent(DEFAULT_SELECTED_HEX_ID);

export const initialHexDataByTier: Record<MeshTier, VmeshHexRecord[]> = {
  U3: u3ContextRecords,
  U5: u5Records.some((record) => record.h3Id === defaultU5Record.h3Id)
    ? u5Records
    : [defaultU5Record, ...u5Records],
  U8: u8Records
};

export const initialUserRecords: UserRecord[] = [
  "Private watershed note",
  "Saturday growers market",
  "Repair cafe lead",
  "Vacant smallholding watch",
  "Community kitchen asset",
  "Soil moisture observation",
  "Farm access correction",
  "Local seed library"
].map((title, index) => ({
  id: `local-user-${index + 1}`,
  category: (
    [
      "observation",
      "farmers-market",
      "community-asset",
      "property-note",
      "community-asset",
      "observation",
      "correction",
      "grower"
    ] as const
  )[index],
  title,
  h3Id: index < 5 ? initialHexDataByTier.U5[index].h3Id : initialHexDataByTier.U8[index].h3Id,
  visibility: "private-local",
  provenance: "user-added-local",
  confidence: 70 + index * 3,
  createdAt: `2026-04-${String(20 + index).padStart(2, "0")}T12:00:00.000Z`,
  updatedAt: `2026-04-${String(20 + index).padStart(2, "0")}T12:00:00.000Z`
}));

export function getAllHexRecords(dataByTier = initialHexDataByTier): VmeshHexRecord[] {
  return [...dataByTier.U3, ...dataByTier.U5, ...dataByTier.U8];
}

export const mockProviderProvenance: DataProvenance = {
  sourceId: "vmesh-mock-provider-boundary",
  sourceLabel: "vmesh deterministic mock provider boundary",
  sourceType: "mock",
  updatedAt: "2026-05-01T00:00:00.000Z",
  license: "Fictional sample data; no paid APIs or scraped listings",
  confidence: 74
};

export const mockMacroProvenance: MacroProvenance = {
  providerId: "vmesh-mock-macro",
  providerLabel: "vmesh deterministic macro fallback",
  sourceType: "mock",
  observedAt: "2026-05-01T00:00:00.000Z",
  generatedAt: "2026-05-01T00:00:00.000Z",
  freshnessLabel: "deterministic mock fallback",
  confidence: 74,
  limitations:
    "Mock macro data for UI and scoring development. It is not operational climate, fire, flood, or solar intelligence.",
  license: "Fictional sample data; no paid APIs or scraped sources"
};

function macroRiskClass(score: number): "low" | "moderate" | "high" | "severe" {
  if (score >= 78) return "severe";
  if (score >= 58) return "high";
  if (score >= 34) return "moderate";
  return "low";
}

function solarClass(score: number): "low" | "medium" | "high" {
  if (score >= 72) return "high";
  if (score >= 42) return "medium";
  return "low";
}

export function createMockMacroCellSummary(record: VmeshHexRecord): MacroCellSummary {
  const seed = seedForH3Id(record.h3Id);
  const [latitude, longitude] = cellToLatLng(record.h3Id);
  const heat = 24 + ((seed * 7) % 48);
  const rain = 2 + ((seed * 3) % 34);
  const wind = 8 + ((seed * 5) % 42);
  const cloud = 18 + ((seed * 11) % 70);
  const floodScore = Math.min(100, Math.round(record.macro.water * 0.35 + rain * 1.2));
  const fireScore = Math.min(
    100,
    Math.round(record.macro.risk * 0.45 + heat * 0.62 + wind * 0.28 - rain * 0.18)
  );
  const solarScore = Math.max(
    0,
    Math.min(100, Math.round(record.macro.energy * 0.5 + (100 - cloud) * 0.38 + heat * 0.12))
  );

  return {
    h3Id: record.h3Id,
    tier: record.tier,
    resolution: record.resolution,
    centroid: {
      latitude,
      longitude
    },
    weather: {
      temperatureC: Math.round((14 + heat * 0.28) * 10) / 10,
      apparentTemperatureC: Math.round((15 + heat * 0.32) * 10) / 10,
      precipitationMm: Math.round((rain / 12) * 10) / 10,
      rainfallMm: Math.round((rain / 14) * 10) / 10,
      windSpeedKph: wind,
      windGustKph: wind + 12,
      relativeHumidityPercent: Math.max(20, Math.min(96, 78 - heat * 0.35 + rain * 0.5)),
      cloudCoverPercent: cloud
    },
    forecast: {
      next72hRainMm: rain,
      maxTemperatureC: Math.round((17 + heat * 0.31) * 10) / 10,
      minTemperatureC: Math.round((8 + heat * 0.13) * 10) / 10,
      maxWindGustKph: wind + 18,
      dominantCondition:
        rain > 24 ? "Wet spell" : cloud > 70 ? "Cloudy" : heat > 58 ? "Heat watch" : "Settled",
      stressScore: Math.min(100, Math.round(heat * 0.42 + rain * 0.32 + wind * 0.26))
    },
    climateTrend: {
      baselineLabel: "Mock 1991-2020 baseline",
      temperatureAnomalyC: Math.round((((seed % 15) - 4) / 10) * 10) / 10,
      rainfallAnomalyPercent: ((seed * 7) % 46) - 18,
      trendDirection: seed % 4 === 0 ? "stable" : "warming",
      confidence: 55 + (seed % 28)
    },
    flood: {
      exposureScore: floodScore,
      classLabel: macroRiskClass(floodScore),
      drivers: ["rainfall proxy", "water stress proxy", "DEM/HAND future input"],
      confidence: 62 + (seed % 22)
    },
    fire: {
      exposureScore: fireScore,
      classLabel: macroRiskClass(fireScore),
      drivers: ["heat proxy", "wind proxy", "vegetation dryness future input"],
      confidence: 60 + (seed % 24)
    },
    solar: {
      practicalityScore: solarScore,
      irradianceKwhM2Day: Math.round((2.1 + solarScore * 0.045) * 10) / 10,
      cloudPenalty: cloud,
      classLabel: solarClass(solarScore),
      interpretation: "Mock signal for local hub charging, refrigeration, and comms timing.",
      confidence: 58 + (seed % 28)
    },
    provenance: mockMacroProvenance
  };
}

export const initialMacroSummariesByH3: Record<string, MacroCellSummary> = Object.fromEntries(
  getAllHexRecords().map((record) => [record.h3Id, createMockMacroCellSummary(record)])
);

export const mockImageryManifest: ImageryTileManifest = createMockSentinelManifest({
  h3Coverage: initialHexDataByTier.U5.slice(0, 12).map((record) => record.h3Id)
});

export function createMockClimateSummary(seed: number): MacroClimateSummary {
  return {
    currentConditions: seed % 2 === 0 ? "Warm, dry, light wind" : "Mild, coastal humidity",
    forecastSummary: "Mock 72h forecast boundary; provider adapter not connected",
    heatStress: 38 + ((seed * 7) % 42),
    coldStress: 10 + ((seed * 5) % 28),
    windExposure: 24 + ((seed * 9) % 48),
    rainfallOutlook: 30 + ((seed * 11) % 52),
    droughtIndicator: 22 + ((seed * 6) % 50),
    provenance: mockProviderProvenance
  };
}

export function createMockHazardRisk(seed: number): HazardRiskSummary {
  const classes = ["low", "moderate", "high", "severe"] as const;
  return {
    floodExposureScore: 18 + ((seed * 10) % 66),
    floodInputs: ["DEM/HAND-ready architecture", "water proximity", "lowland exposure"],
    fireRiskClass: classes[seed % classes.length],
    fireRiskScore: 20 + ((seed * 13) % 70),
    fireInputs: ["vegetation dryness", "wind", "slope/topography"],
    confidence: 68 + (seed % 18),
    provenance: mockProviderProvenance
  };
}

export function createMockSolarPotential(seed: number): SolarPotentialSummary {
  return {
    score: 48 + ((seed * 8) % 44),
    slopeReadiness: 52 + ((seed * 6) % 38),
    aspectReadiness: 45 + ((seed * 7) % 45),
    cloudinessPenalty: 8 + ((seed * 5) % 32),
    irradianceBand: seed % 3 === 0 ? "high" : seed % 3 === 1 ? "medium" : "low",
    hubUseInterpretation: "Mock signal for sizing local charging, refrigeration, and comms loads.",
    provenance: mockProviderProvenance
  };
}

export const mockFoodNetworkAssets: FoodNetworkAsset[] = initialHexDataByTier.U5.slice(0, 7).map(
  (record, index) => {
    const types = [
      "farm",
      "grower",
      "farmers-market",
      "food-hub",
      "community-garden",
      "storage",
      "distribution-point"
    ] as const;
    return {
      id: `mock-food-${index + 1}`,
      type: types[index],
      name: `Mock ${types[index].replace("-", " ")} ${index + 1}`,
      h3Id: record.h3Id,
      availability: index % 2 === 0 ? "seasonal" : "year-round",
      seasonality: index % 2 === 0 ? "spring-autumn" : "all-season",
      contact: "not-stored",
      provenance: mockProviderProvenance
    };
  }
);

export function summarizeFoodNetwork(h3Id: string): MicroFoodNetworkSummary {
  const assets = mockFoodNetworkAssets.filter((asset) => asset.h3Id === h3Id);
  return {
    assets,
    farms: assets.filter((asset) => asset.type === "farm").length,
    growers: assets.filter((asset) => asset.type === "grower").length,
    farmersMarkets: assets.filter((asset) => asset.type === "farmers-market").length,
    foodHubs: assets.filter((asset) => asset.type === "food-hub").length,
    communityGardens: assets.filter((asset) => asset.type === "community-garden").length,
    storageAndDistribution: assets.filter(
      (asset) => asset.type === "storage" || asset.type === "distribution-point"
    ).length
  };
}

export const mockPropertySignals: PropertySignalSummary[] = initialHexDataByTier.U5.slice(0, 5).map(
  (record, index) => ({
    id: `mock-property-${index + 1}`,
    listingType: index % 2 === 0 ? "land" : "homestead",
    h3Id: record.h3Id,
    priceBand: index < 2 ? "100k-250k" : "250k-500k",
    acreageBand: index < 2 ? "1-5" : "5-20",
    approximateLocation: `${record.placeName} H3 area only`,
    waterNotes: "Mock water access note; no exact address.",
    soilNotes: "Mock soil suitability note.",
    solarNotes: "Mock solar access note.",
    accessNotes: "Mock access note; verify lawful source before real use.",
    source: mockProviderProvenance
  })
);

export function createInitialHubPlaybookState(h3Id = DEFAULT_SELECTED_HEX_ID): HubPlaybookState {
  return {
    active: true,
    selectedH3Id: h3Id,
    readinessScore: 41,
    updatedAt: "2026-05-01T00:00:00.000Z",
    tasks: [
      "Water storage and filtration baseline",
      "Food producers and shared pantry map",
      "Solar charging and battery audit",
      "Reticulum bridge placement",
      "Access route and shelter check",
      "Tool library and governance circle"
    ].map((title, index) => ({
      id: `hub-task-${index + 1}`,
      h3Id,
      dimension: (["water", "food", "power", "comms", "access", "governance"] as const)[index],
      title,
      phase: index < 2 ? "assess" : index < 4 ? "stabilize" : "build",
      complete: index === 0,
      notes: ""
    }))
  };
}

export const mockHubNodeStatus: HubNodeStatus = {
  reticulum: {
    status: "bridge-connected",
    reachablePeers: 3,
    queuedMessages: 1,
    notes: "Mock local gateway; browser talks to gateway, not radio hardware."
  },
  meshtastic: {
    status: "local-only",
    connectedNode: "mock-lora-bridge",
    radioPath: "mock",
    notes: "Bridge scaffold only; no live LoRa transmission."
  },
  localLlm: {
    status: "local-only",
    endpoint: "http://localhost:11434",
    modelLabel: "mock-local-llm",
    notes: "Local API placeholder for hub-hosted model access."
  },
  lanMode: "offline-ready",
  updatedAt: "2026-05-01T00:00:00.000Z"
};

export const mockHubMessages: HubMessageEnvelope[] = [
  {
    id: "mock-message-1",
    h3Id: DEFAULT_SELECTED_HEX_ID,
    timestamp: "2026-05-01T00:10:00.000Z",
    priority: "important",
    payloadType: "resource-report",
    payload: "Mock pantry inventory ready for local-only sharing.",
    signaturePlaceholder: "signature-pending-local-gateway",
    provenance: mockProviderProvenance
  }
];

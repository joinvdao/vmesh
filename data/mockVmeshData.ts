import { cellToParent, getResolution, gridDisk, latLngToCell } from "h3-js";

import { DEFAULT_U5_CELL, generateLocalU8Cells, MESH_TIER_RESOLUTIONS } from "@/lib/h3Mesh";
import { computeAntifragilityScore } from "@/lib/meshScoring";
import type {
  MacroPillars,
  MeshTier,
  MicroSummary,
  ProvenanceSummary,
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

export function generateU8RecordsForParent(parentU5: string): VmeshHexRecord[] {
  return generateLocalU8Cells(parentU5, 48).map((h3Id, index) =>
    createHexRecord(h3Id, "U8", index + 31, {
      label: `Local cell ${index + 1}`,
      placeName: `${defaultU5Record.placeName} local mesh`,
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

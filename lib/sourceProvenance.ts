import type { LayerSourceType } from "@/lib/layerCatalog";

export type GroundModelRole =
  | "bare-earth-dtm"
  | "generic-dem"
  | "surface-dsm"
  | "topobathy"
  | "imagery-inferred-context"
  | "visual-context"
  | "not-authoritative";

export interface SourceProvenance {
  providerId: string;
  sourceId: string;
  sourceType: LayerSourceType;
  sourceUrl?: string;
  groundModelRole: GroundModelRole;
  acquiredAt?: string;
  processedAt?: string;
  vintage?: string;
  license: string;
  attribution: string;
  confidence: number;
  limitations: string[];
}

export interface SourceRolePolicy {
  role: GroundModelRole;
  maxTerrainConfidence: number;
  canDriveTerrainMesh: boolean;
  canRaiseTerrainTrust: boolean;
  notes: string;
}

export const SOURCE_ROLE_POLICIES: Record<GroundModelRole, SourceRolePolicy> = {
  "bare-earth-dtm": {
    role: "bare-earth-dtm",
    maxTerrainConfidence: 95,
    canDriveTerrainMesh: true,
    canRaiseTerrainTrust: true,
    notes: "Preferred terrain role when provider metadata proves bare-earth semantics."
  },
  "generic-dem": {
    role: "generic-dem",
    maxTerrainConfidence: 72,
    canDriveTerrainMesh: true,
    canRaiseTerrainTrust: false,
    notes: "Useful fallback terrain, but confidence remains capped until source role is proven."
  },
  "surface-dsm": {
    role: "surface-dsm",
    maxTerrainConfidence: 45,
    canDriveTerrainMesh: false,
    canRaiseTerrainTrust: false,
    notes: "Surface context with canopy/buildings; do not use as bare-earth ground."
  },
  topobathy: {
    role: "topobathy",
    maxTerrainConfidence: 70,
    canDriveTerrainMesh: true,
    canRaiseTerrainTrust: false,
    notes: "Coastal/topobathymetric role; useful near shorelines, not generic inland DTM."
  },
  "imagery-inferred-context": {
    role: "imagery-inferred-context",
    maxTerrainConfidence: 20,
    canDriveTerrainMesh: false,
    canRaiseTerrainTrust: false,
    notes: "ML or imagery-derived context; cannot upgrade terrain, roads, parcels, or legal truth."
  },
  "visual-context": {
    role: "visual-context",
    maxTerrainConfidence: 10,
    canDriveTerrainMesh: false,
    canRaiseTerrainTrust: false,
    notes: "Display context only."
  },
  "not-authoritative": {
    role: "not-authoritative",
    maxTerrainConfidence: 0,
    canDriveTerrainMesh: false,
    canRaiseTerrainTrust: false,
    notes: "No authority for terrain, hazards, legal boundaries, or emergency decisions."
  }
};

export function createSourceProvenance(input: SourceProvenance): SourceProvenance {
  return {
    ...input,
    confidence: Math.max(0, Math.min(100, Math.round(input.confidence))),
    limitations: input.limitations.length > 0 ? input.limitations : ["No limitations provided."]
  };
}

export function getSourceRolePolicy(role: GroundModelRole): SourceRolePolicy {
  return SOURCE_ROLE_POLICIES[role];
}

export function capTerrainConfidenceByRole(provenance: SourceProvenance): number {
  const policy = getSourceRolePolicy(provenance.groundModelRole);
  return Math.min(provenance.confidence, policy.maxTerrainConfidence);
}

export function canSourceDriveTerrainMesh(provenance: SourceProvenance): boolean {
  return getSourceRolePolicy(provenance.groundModelRole).canDriveTerrainMesh;
}

export function validateSourceProvenance(provenance: SourceProvenance): boolean {
  return (
    provenance.providerId.length > 0 &&
    provenance.sourceId.length > 0 &&
    provenance.license.length > 0 &&
    provenance.attribution.length > 0 &&
    provenance.confidence >= 0 &&
    provenance.confidence <= 100 &&
    provenance.limitations.length > 0
  );
}

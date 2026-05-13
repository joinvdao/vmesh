import type { LayerDataStatus, LayerReadiness } from "@/lib/layerCatalog";
import {
  createSourceProvenance,
  validateSourceProvenance,
  type SourceProvenance
} from "@/lib/sourceProvenance";

export interface DataPackageAoi {
  h3Id?: string;
  bounds?: [number, number, number, number];
  centroid?: {
    latitude: number;
    longitude: number;
  };
}

export interface DataPackagePayloadRefs {
  terrain?: string;
  imagery?: string;
  landcover?: string;
  environment?: string;
  contours?: string;
  h3Summary?: string;
  provenance?: string;
}

export interface RejectedSourceRecord {
  providerId: string;
  reason: string;
  status: LayerReadiness | LayerDataStatus;
}

export interface DataPackageManifest {
  id: string;
  label: string;
  aoi: DataPackageAoi;
  payloads: DataPackagePayloadRefs;
  sources: SourceProvenance[];
  rejectedSources: RejectedSourceRecord[];
  createdAt: string;
  schemaVersion: string;
}

export interface CreateDataPackageManifestInput {
  id: string;
  label: string;
  aoi: DataPackageAoi;
  payloads?: DataPackagePayloadRefs;
  sources: SourceProvenance[];
  rejectedSources?: RejectedSourceRecord[];
  createdAt?: string;
  schemaVersion?: string;
}

export function createDataPackageManifest({
  id,
  label,
  aoi,
  payloads = {},
  sources,
  rejectedSources = [],
  createdAt = "2026-05-10T00:00:00.000Z",
  schemaVersion = "vmesh-data-package-v1"
}: CreateDataPackageManifestInput): DataPackageManifest {
  return {
    id,
    label,
    aoi,
    payloads: {
      provenance: "provenance-manifest.json",
      h3Summary: "h3-summary.json",
      ...payloads
    },
    sources: sources.map(createSourceProvenance),
    rejectedSources,
    createdAt,
    schemaVersion
  };
}

export function validateDataPackageManifest(manifest: DataPackageManifest): boolean {
  return (
    manifest.id.length > 0 &&
    manifest.label.length > 0 &&
    manifest.schemaVersion.length > 0 &&
    manifest.createdAt.length > 0 &&
    (Boolean(manifest.aoi.h3Id) ||
      Boolean(manifest.aoi.bounds) ||
      Boolean(manifest.aoi.centroid)) &&
    manifest.sources.length > 0 &&
    manifest.sources.every(validateSourceProvenance) &&
    manifest.rejectedSources.every(
      (source) => source.providerId.length > 0 && source.reason.length > 0
    )
  );
}

export function getPackagePayloadList(manifest: DataPackageManifest): string[] {
  return Object.values(manifest.payloads).filter((payload): payload is string => Boolean(payload));
}

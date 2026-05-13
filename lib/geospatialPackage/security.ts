import type {
  GeospatialPackagePlan,
  GeospatialSourceCandidate,
  PackageAoiDisclosure,
  PackageLayerId
} from "@/lib/geospatialPackage/types";
import { sanitizePublicUrl } from "@/lib/geospatialPackage/plannerUtils";

export const MAX_PACKAGE_PLAN_BODY_BYTES = 32_768;
export const MAX_PACKAGE_LABEL_LENGTH = 96;
export const MAX_CONSUMER_ID_LENGTH = 64;
export const MAX_PREFERRED_SOURCE_IDS = 20;
export const MAX_AOI_SPAN_DEGREES = 10;

export interface PackagePrivacyDisclosure {
  coordinateDisclosure: PackageAoiDisclosure;
  precisionWarning: string;
  remoteProviderWarning: string;
}

export function sanitizeTextLabel(value: string, maxLength = MAX_PACKAGE_LABEL_LENGTH): string {
  return value
    .replace(/[^\w .,:/()[\]-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeConsumerAppId(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9._:-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_CONSUMER_ID_LENGTH);

  return cleaned || "generic-downstream-app";
}

export function sanitizePreferredSourceId(value: string): string | null {
  const cleaned = value.trim().slice(0, 96);
  return /^[a-z0-9._:-]+$/i.test(cleaned) ? cleaned : null;
}

export function redactSourceCandidate(
  source: GeospatialSourceCandidate
): GeospatialSourceCandidate {
  return {
    ...source,
    sourceUrl: sanitizePublicUrl(source.sourceUrl)
  };
}

export function redactPackagePlanForPublic(plan: GeospatialPackagePlan): GeospatialPackagePlan {
  const layerIds = Object.keys(plan.selectedSources) as PackageLayerId[];
  const selectedSources = layerIds.reduce(
    (record, layerId) => ({
      ...record,
      [layerId]: plan.selectedSources[layerId]
        ? redactSourceCandidate(plan.selectedSources[layerId])
        : null
    }),
    {} as GeospatialPackagePlan["selectedSources"]
  );

  return {
    ...plan,
    selectedSources,
    artifacts: plan.artifacts.map((artifact) => ({
      ...artifact,
      url: artifact.url ? sanitizePublicUrl(artifact.url) : null
    }))
  };
}

export function createPrivacyDisclosure(plan: GeospatialPackagePlan): PackagePrivacyDisclosure {
  return {
    coordinateDisclosure: plan.aoiDisclosure,
    precisionWarning:
      "Package plans may include exact coordinates, H3 cells, or AOI bounds. Treat requested private locations as sensitive and avoid committing real package payloads.",
    remoteProviderWarning:
      "The planning API does not call remote providers, but future package workers may disclose AOIs to selected providers unless routed through a reviewed cache or local gateway."
  };
}

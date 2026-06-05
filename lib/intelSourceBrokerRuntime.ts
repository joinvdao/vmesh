import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  validateIntelSourceBrokerPackage,
  type IntelSourceBrokerPackage
} from "@/lib/intelSourceBroker";
import { INTEL_SOURCE_BROKER_SNAPSHOT } from "@/lib/intelSourceBrokerSnapshot";

export const DEFAULT_INTEL_SOURCE_BROKER_PACKAGE_PATH =
  ".artifacts/source-broker/intel-sidecar-source-broker-package.json";

const DEFAULT_INTEL_SOURCE_BROKER_PACKAGE_FILE = path.join(
  process.cwd(),
  ".artifacts",
  "source-broker",
  "intel-sidecar-source-broker-package.json"
);

export type IntelSourceBrokerPackageSource = "retained-artifact" | "integrated-snapshot";

export interface LoadedIntelSourceBrokerPackage {
  sourcePackage: IntelSourceBrokerPackage;
  packageSource: IntelSourceBrokerPackageSource;
}

async function loadRetainedArtifact(packagePath: string): Promise<IntelSourceBrokerPackage | null> {
  try {
    const content = await readFile(packagePath, "utf8");
    const parsed = JSON.parse(content) as unknown;

    if (validateIntelSourceBrokerPackage(parsed)) {
      return parsed;
    }
  } catch {
    // Missing, malformed, or stale operator artifacts fall back to the checked-in snapshot.
  }

  return null;
}

function loadIntegratedSnapshot(): LoadedIntelSourceBrokerPackage {
  return {
    sourcePackage: INTEL_SOURCE_BROKER_SNAPSHOT,
    packageSource: "integrated-snapshot"
  };
}

export async function loadDefaultIntelSourceBrokerPackage(): Promise<LoadedIntelSourceBrokerPackage> {
  const retainedArtifact = await loadRetainedArtifact(DEFAULT_INTEL_SOURCE_BROKER_PACKAGE_FILE);

  if (retainedArtifact) {
    return {
      sourcePackage: retainedArtifact,
      packageSource: "retained-artifact"
    };
  }

  return loadIntegratedSnapshot();
}

export async function loadIntelSourceBrokerPackage(
  options: {
    packagePath?: string;
  } = {}
): Promise<LoadedIntelSourceBrokerPackage> {
  if (!options.packagePath) {
    return loadDefaultIntelSourceBrokerPackage();
  }

  const retainedArtifact = await loadRetainedArtifact(options.packagePath);

  if (retainedArtifact) {
    return {
      sourcePackage: retainedArtifact,
      packageSource: "retained-artifact"
    };
  }

  return loadIntegratedSnapshot();
}

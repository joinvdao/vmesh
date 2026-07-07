import { readFile } from "node:fs/promises";
import path from "node:path";

export const KAMLOOPS_OPERATOR_TERRAIN_MANIFEST_RELATIVE_PATH =
  "config/operator-sources/kamloops-terrain.manifest.json";

export type KamloopsOperatorTerrainManifestLoadEvidence = {
  status: "loaded" | "absent" | "invalid";
  relativePath: typeof KAMLOOPS_OPERATOR_TERRAIN_MANIFEST_RELATIVE_PATH;
  pathDisclosure: "relative-conventional-path-only";
  warnings: string[];
};

export async function loadKamloopsOperatorTerrainManifest(): Promise<{
  manifest: unknown | undefined;
  evidence: KamloopsOperatorTerrainManifestLoadEvidence;
}> {
  const manifestPath = path.join(process.cwd(), KAMLOOPS_OPERATOR_TERRAIN_MANIFEST_RELATIVE_PATH);
  try {
    const raw = await readFile(manifestPath, "utf8");
    return {
      manifest: JSON.parse(raw) as unknown,
      evidence: {
        status: "loaded",
        relativePath: KAMLOOPS_OPERATOR_TERRAIN_MANIFEST_RELATIVE_PATH,
        pathDisclosure: "relative-conventional-path-only",
        warnings: []
      }
    };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : null;
    if (code === "ENOENT") {
      return {
        manifest: undefined,
        evidence: {
          status: "absent",
          relativePath: KAMLOOPS_OPERATOR_TERRAIN_MANIFEST_RELATIVE_PATH,
          pathDisclosure: "relative-conventional-path-only",
          warnings: [
            "No operator terrain manifest is present; VMesh will use public DEM-grid and regional terrain rails only."
          ]
        }
      };
    }

    return {
      manifest: undefined,
      evidence: {
        status: "invalid",
        relativePath: KAMLOOPS_OPERATOR_TERRAIN_MANIFEST_RELATIVE_PATH,
        pathDisclosure: "relative-conventional-path-only",
        warnings: [
          error instanceof Error
            ? `Operator terrain manifest could not be read or parsed: ${error.message}`
            : "Operator terrain manifest could not be read or parsed."
        ]
      }
    };
  }
}

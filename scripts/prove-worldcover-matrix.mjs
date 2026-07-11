#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  verifyWorldCoverTiles,
  worldCoverTilesForBbox
} from "../lib/geospatialPackage/worldCover.ts";

const outputPath = resolve(
  process.argv[2] ?? ".artifacts/source-registry/worldcover-live-matrix/latest.json"
);
const samples = [
  ["africa-cape-town", -33.92, 18.42],
  ["europe-lisbon", 38.72, -9.14],
  ["asia-tokyo", 35.68, 139.69],
  ["australia-sydney", -33.86, 151.21],
  ["south-america-buenos-aires", -34.6, -58.38],
  ["canada-kamloops-public", 50.67, -120.33],
  ["anti-meridian-fiji", -17.7, 179.99],
  ["outside-published-latitude", 85, 10]
];
const rows = [];
for (const [id, latitude, longitude] of samples) {
  const tiles = worldCoverTilesForBbox(frameAround(latitude, longitude));
  const verification = await verifyWorldCoverTiles(tiles);
  rows.push({
    id,
    status:
      tiles.length === 0
        ? "outside-published-coverage"
        : verification.missing.length === 0
          ? "source-refs-verified"
          : "source-ref-missing",
    resolutionMeters: 10,
    role: "classified-landcover-context",
    tileCount: tiles.length,
    verifiedTileCount: verification.available.length,
    missingTileCount: verification.missing.length
  });
}
const report = {
  schemaVersion: "vmesh-worldcover-live-matrix-v1",
  generatedAt: new Date().toISOString(),
  runClass: "live-proof",
  coordinateDisclosure: "public-safe-labels-only",
  limitations: [
    "WorldCover is classified landcover context, not surveyed habitat, ecology, soil, or species truth."
  ],
  rows
};
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (rows.some((row) => row.status === "source-ref-missing")) process.exitCode = 1;

function frameAround(latitude, longitude) {
  const latitudeDelta = 1500 / 111_320;
  const longitudeDelta = 1500 / (111_320 * Math.max(0.01, Math.cos((latitude * Math.PI) / 180)));
  const west = longitude - longitudeDelta;
  const east = longitude + longitudeDelta;
  return {
    west: west < -180 ? west + 360 : west,
    south: latitude - latitudeDelta,
    east: east > 180 ? east - 360 : east,
    north: latitude + latitudeDelta
  };
}

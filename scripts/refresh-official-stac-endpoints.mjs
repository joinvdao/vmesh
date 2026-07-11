#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { OFFICIAL_STAC_ENDPOINTS, probeOfficialEndpoint } from "../lib/officialEndpointRefresh.ts";

const outputPath = resolve(
  process.argv[2] ?? ".artifacts/source-registry/official-endpoint-refresh/latest.json"
);
const probes = [];
for (const endpoint of OFFICIAL_STAC_ENDPOINTS) {
  probes.push(await probeOfficialEndpoint(endpoint));
}
const report = {
  schemaVersion: "vmesh-official-endpoint-refresh-v1",
  generatedAt: new Date().toISOString(),
  runClass: "live-proof",
  promotionState: "quarantine",
  endpointCount: probes.length,
  healthyCount: probes.filter((probe) => probe.capabilityState === "metadata-probed").length,
  failedCount: probes.filter((probe) => probe.capabilityState === "probe-failed").length,
  endpoints: probes
};
await mkdir(resolve(outputPath, ".."), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (report.failedCount > 0) process.exitCode = 1;

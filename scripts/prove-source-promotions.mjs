#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const baseUrl = new URL(process.argv[2] ?? "http://127.0.0.1:3001");
const outputPath = resolve(
  process.argv[3] ?? ".artifacts/source-registry/promotion-summary/latest.json"
);
const response = await fetch(new URL("/api/source-registry/promotions", baseUrl), {
  headers: { accept: "application/json" }
});
if (!response.ok) throw new Error(`Promotion summary returned HTTP ${response.status}.`);
const report = await response.json();
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (report.rejectedCount > 0) process.exitCode = 1;

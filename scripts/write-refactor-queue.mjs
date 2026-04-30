import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

async function readJson(fileName, fallback) {
  try {
    return JSON.parse(await readFile(path.join(process.cwd(), fileName), "utf8"));
  } catch {
    return fallback;
  }
}

const readiness = await readJson(".agent-ready-report.json", { findings: [], warnings: [] });
const knip = await readJson("knip-report.json", null);

const lines = [
  "# Refactor Queue",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "## Agent-Ready Findings",
  ""
];

if (!readiness.findings?.length && !readiness.warnings?.length) {
  lines.push("No agent-ready findings.");
} else {
  for (const warning of readiness.warnings ?? []) {
    lines.push(`- Warning: ${warning}`);
  }
  for (const finding of readiness.findings ?? []) {
    lines.push(`- Finding: \`${JSON.stringify(finding)}\``);
  }
}

lines.push("", "## Knip Findings", "");

if (!knip) {
  lines.push("No knip report found.");
} else {
  const sections = Object.entries(knip).filter(([, value]) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (value && typeof value === "object") {
      return Object.keys(value).length > 0;
    }
    return Boolean(value);
  });

  if (sections.length === 0) {
    lines.push("No knip findings.");
  } else {
    for (const [section, value] of sections) {
      const count = Array.isArray(value)
        ? value.length
        : typeof value === "object" && value
          ? Object.keys(value).length
          : 1;
      lines.push(`- ${section}: ${count}`);
    }
  }
}

await writeFile(path.join(process.cwd(), "docs/REFACTOR_QUEUE.md"), `${lines.join("\n")}\n`);
console.log("Updated docs/REFACTOR_QUEUE.md.");

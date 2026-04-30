import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

async function readJson(fileName, fallback) {
  try {
    return JSON.parse(await readFile(path.join(process.cwd(), fileName), "utf8"));
  } catch {
    return fallback;
  }
}

const readiness = await readJson(".agent-ready-report.json", null);
const knip = await readJson("knip-report.json", null);

if (!readiness && !knip) {
  console.log(
    "No readiness or janitor reports found. Run npm run agent-ready:check and npm run janitor first."
  );
  process.exit(0);
}

if (readiness) {
  console.log(`Agent-ready status: ${readiness.status}`);
  console.log(`Source files: ${readiness.counts?.sourceFiles ?? 0}`);
  console.log(`Test files: ${readiness.counts?.testFiles ?? 0}`);
  console.log(`Warnings: ${readiness.warnings?.length ?? 0}`);
  console.log(`Findings: ${readiness.findings?.length ?? 0}`);
}

if (knip) {
  const issueCount = Object.values(knip).reduce((sum, value) => {
    if (Array.isArray(value)) {
      return sum + value.length;
    }
    if (value && typeof value === "object") {
      return sum + Object.keys(value).length;
    }
    return sum;
  }, 0);
  console.log(`Knip issue groups: ${issueCount}`);
}

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const reportPath = path.join(process.cwd(), "knip-report.json");

let report;
try {
  report = JSON.parse(await readFile(reportPath, "utf8"));
} catch {
  console.log("No knip-report.json found. Run npm run janitor first.");
  process.exit(0);
}

const sections = Object.entries(report).filter(([, value]) => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (value && typeof value === "object") {
    return Object.keys(value).length > 0;
  }
  return Boolean(value);
});

if (sections.length === 0) {
  console.log("Janitor report is clean.");
  process.exit(0);
}

console.log("Janitor report found possible cleanup work:");
for (const [section, value] of sections) {
  const count = Array.isArray(value)
    ? value.length
    : typeof value === "object" && value
      ? Object.keys(value).length
      : 1;
  console.log(`- ${section}: ${count}`);
}

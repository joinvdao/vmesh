import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const ignoredSegments = new Set([
  ".git",
  ".next",
  ".tickets",
  "agent-bootstrap-prompt",
  "node_modules",
  "coverage"
]);
const ignoredFiles = new Set([
  ".agent-ready-report.json",
  "package-lock.json",
  "tsconfig.tsbuildinfo"
]);
const ignoredRelativeFiles = new Set(["scripts/privacy-check.mjs"]);
const textExtensions = new Set([
  ".css",
  ".cjs",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".txt",
  ".yml",
  ".yaml"
]);

const patterns = [
  { label: "email address", pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/ },
  { label: "absolute Windows user path", pattern: /C:\\Users\\/i },
  { label: "local username", pattern: /\bkmill\b/i },
  { label: "private planning acronym", pattern: /\bGTD\b/i },
  { label: "private planning app", pattern: /\bObsidian\b/i },
  { label: "private local ticket folder", pattern: /\.tickets\//i }
];

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir) {
  if (!(await exists(dir))) {
    return [];
  }

  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (ignoredSegments.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
      continue;
    }

    const rel = path.relative(root, fullPath).replaceAll("\\", "/");
    if (
      !ignoredFiles.has(entry.name) &&
      !ignoredRelativeFiles.has(rel) &&
      textExtensions.has(path.extname(entry.name))
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

const findings = [];
const files = await walk(root);

for (const file of files) {
  const content = await readFile(file, "utf8");
  const rel = path.relative(root, file).replaceAll("\\", "/");

  for (const { label, pattern } of patterns) {
    if (pattern.test(content)) {
      findings.push({ file: rel, label });
    }
  }
}

if (findings.length > 0) {
  console.error("Privacy check failed.");
  for (const finding of findings) {
    console.error(`${finding.file}: ${finding.label}`);
  }
  process.exit(1);
}

console.log("Privacy check passed.");

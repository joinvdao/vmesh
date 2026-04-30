import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const requiredFiles = [
  ".github/ISSUE_TEMPLATE/config.yml",
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/feature_request.yml",
  ".github/ISSUE_TEMPLATE/task.yml",
  ".github/ISSUE_TEMPLATE/livestream_followup.yml",
  ".github/pull_request_template.md",
  "CONTRIBUTING.md",
  "docs/PROJECT_MANAGEMENT.md",
  "docs/LIVESTREAM.md"
];

const missing = [];

for (const file of requiredFiles) {
  try {
    await access(path.join(root, file));
  } catch {
    missing.push(file);
  }
}

const projectManagement = await readFile(
  path.join(root, "docs/PROJECT_MANAGEMENT.md"),
  "utf8"
).catch(() => "");
const livestream = await readFile(path.join(root, "docs/LIVESTREAM.md"), "utf8").catch(() => "");
const prTemplate = await readFile(
  path.join(root, ".github/pull_request_template.md"),
  "utf8"
).catch(() => "");

const contentChecks = [
  {
    ok:
      projectManagement.includes("GitHub Issues") &&
      projectManagement.includes("public ticket system"),
    message: "docs/PROJECT_MANAGEMENT.md must describe GitHub Issues as the public ticket system."
  },
  {
    ok: livestream.includes("Thursday") && livestream.includes("5pm UTC"),
    message: "docs/LIVESTREAM.md must include the weekly Thursday 5pm UTC schedule."
  },
  {
    ok: prTemplate.includes("Validation") && prTemplate.includes("Privacy"),
    message: ".github/pull_request_template.md must include validation and privacy sections."
  }
];

const failedContent = contentChecks.filter((check) => !check.ok);

if (missing.length > 0 || failedContent.length > 0) {
  console.error("Public workflow check failed.");
  if (missing.length > 0) {
    console.error(`Missing files: ${missing.join(", ")}`);
  }
  for (const failure of failedContent) {
    console.error(failure.message);
  }
  process.exit(1);
}

console.log("Public workflow check passed.");

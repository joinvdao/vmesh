import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] ?? ".");
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const sourceRoots = ["app", "components", "hooks", "lib", "store"];
const requiredDocs = [
  "README.md",
  "AGENTS.md",
  "docs/PRODUCT_SCOPE.md",
  "docs/SYSTEM_DESIGN.md",
  "docs/TESTING.md",
  "docs/USER_GUIDE.md",
  "docs/SECURITY_PRIVACY.md",
  "docs/OPERATIONS.md",
  "docs/ANALYTICS.md",
  "docs/RESEARCH.md",
  "docs/PROJECT_MANAGEMENT.md",
  "docs/LIVESTREAM.md",
  "CONTRIBUTING.md"
];

const ignoredSegments = new Set([
  "node_modules",
  ".next",
  ".git",
  "coverage",
  "agent-bootstrap-prompt"
]);

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
    if (ignoredSegments.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

function relative(filePath) {
  return path.relative(root, filePath).replaceAll("\\", "/");
}

async function countDirectSourceFiles(dir) {
  if (!(await exists(dir))) {
    return 0;
  }

  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile() && sourceExtensions.has(path.extname(entry.name)))
    .length;
}

const allFiles = await walk(root);
const sourceFiles = allFiles.filter((file) => {
  const rel = relative(file);
  const ext = path.extname(file);
  return (
    sourceExtensions.has(ext) &&
    !rel.startsWith("scripts/") &&
    !rel.startsWith("tools/") &&
    sourceRoots.some((sourceRoot) => rel.startsWith(`${sourceRoot}/`))
  );
});

const tests = allFiles.filter((file) =>
  /(?:^|\/)(tests|__tests__)\/.*\.(test|spec)\.(ts|tsx|js|jsx)$/.test(relative(file))
);

const failures = [];
const warnings = [];
const findings = [];

for (const doc of requiredDocs) {
  if (!(await exists(path.join(root, doc)))) {
    failures.push(`Missing required doc: ${doc}`);
  }
}

if (!(await exists(path.join(root, "eslint.config.mjs")))) {
  failures.push("Missing ESLint flat config.");
}

if (!(await exists(path.join(root, "package.json")))) {
  failures.push("Missing package.json.");
}

if (!(await exists(path.join(root, "app/page.tsx")))) {
  warnings.push(
    "No app/page.tsx yet. This is expected while workspace prep is intentionally not building product code."
  );
}

for (const file of sourceFiles) {
  const content = await readFile(file, "utf8");
  const lines = content.split(/\r?\n/).length;
  if (lines > 400) {
    findings.push({
      type: "oversized-file",
      file: relative(file),
      lines,
      limit: 400
    });
  }
  if (/\bany\b/.test(content)) {
    findings.push({
      type: "unsafe-any",
      file: relative(file)
    });
  }
}

for (const sourceRoot of sourceRoots) {
  const dir = path.join(root, sourceRoot);
  const directCount = await countDirectSourceFiles(dir);
  if (directCount > 20) {
    findings.push({
      type: "wide-directory",
      directory: sourceRoot,
      directSourceFiles: directCount,
      limit: 20
    });
  }
}

if (sourceFiles.length > 0 && tests.length === 0) {
  warnings.push("Source files exist but no tests are present yet.");
}

if (tests.length > 0 && sourceFiles.length / tests.length > 5) {
  findings.push({
    type: "source-to-test-ratio",
    sourceFiles: sourceFiles.length,
    testFiles: tests.length,
    limit: "5:1"
  });
}

const status =
  failures.length > 0 ? "fail" : findings.length > 0 || warnings.length > 0 ? "warn" : "pass";
const report = {
  generatedAt: new Date().toISOString(),
  root,
  status,
  counts: {
    sourceFiles: sourceFiles.length,
    testFiles: tests.length
  },
  failures,
  warnings,
  findings
};

await writeFile(
  path.join(root, ".agent-ready-report.json"),
  `${JSON.stringify(report, null, 2)}\n`
);

console.log(`Agent-ready status: ${status}`);
for (const failure of failures) {
  console.error(`FAIL: ${failure}`);
}
for (const warning of warnings) {
  console.warn(`WARN: ${warning}`);
}
for (const finding of findings) {
  console.warn(`FINDING: ${JSON.stringify(finding)}`);
}

if (failures.length > 0) {
  process.exit(1);
}

#!/usr/bin/env node

const projectRef =
  process.env.SUPABASE_PROJECT_REF ?? process.env.SIMPLELOOP_SUPABASE_PROJECT_REF ?? "";
const baseUrl =
  process.env.SUPABASE_URL ??
  process.env.SIMPLELOOP_SUPABASE_URL ??
  (projectRef ? `https://${projectRef}.supabase.co` : "");
const apiKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SIMPLELOOP_SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.SIMPLELOOP_SUPABASE_ANON_KEY ??
  "";
if (!baseUrl || !apiKey) throw new Error("Supabase project URL/ref and API key are required.");

const resources = [
  "source_authorities",
  "source_endpoints",
  "source_collections",
  "coverage_evidence",
  "source_runs",
  "source_gaps",
  "source_ingestions",
  "source_capability_ledger"
];
const rows = [];
for (const resource of resources) {
  try {
    const response = await fetch(
      `${baseUrl.replace(/\/$/, "")}/rest/v1/${resource}?select=id&limit=1`,
      { headers: headers("vmesh"), signal: AbortSignal.timeout(10_000) }
    );
    rows.push({ resource, httpStatus: response.status, errorClass: await errorClass(response) });
  } catch (error) {
    rows.push({ resource, httpStatus: null, errorClass: fetchErrorClass(error) });
  }
}

let openApiResponse = null;
let openApiErrorClass = null;
try {
  openApiResponse = await fetch(`${baseUrl.replace(/\/$/, "")}/rest/v1/`, {
    headers: {
      ...headers("vmesh"),
      accept: "application/openapi+json"
    },
    signal: AbortSignal.timeout(10_000)
  });
} catch (error) {
  openApiErrorClass = fetchErrorClass(error);
}
let rpcNames = [];
if (openApiResponse?.ok) {
  const document = await openApiResponse.json();
  rpcNames = Object.keys(document.paths ?? {})
    .filter((path) => path.startsWith("/rpc/"))
    .map((path) => path.slice(5))
    .filter((name) => /sql|query|migration|source|registry/i.test(name))
    .sort();
}

const report = {
  schemaVersion: "vmesh-canonical-registry-rest-probe-v1",
  generatedAt: new Date().toISOString(),
  runClass: "configured",
  disclosure: "schema-shape-only",
  resources: rows,
  openApi: {
    httpStatus: openApiResponse?.status ?? null,
    errorClass: openApiResponse ? await errorClass(openApiResponse) : openApiErrorClass,
    relevantRpcNames: rpcNames
  }
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (rows.some((row) => row.httpStatus !== 200)) process.exitCode = 1;

function headers(profile) {
  return {
    apikey: apiKey,
    authorization: `Bearer ${apiKey}`,
    "accept-profile": profile,
    "content-profile": profile,
    accept: "application/json"
  };
}

async function errorClass(response) {
  if (response.ok) return null;
  try {
    const value = await response.json();
    return typeof value?.code === "string" ? value.code : `http-${response.status}`;
  } catch {
    return `http-${response.status}`;
  }
}

function fetchErrorClass(error) {
  const causeCode = error?.cause?.code;
  if (typeof causeCode === "string") return causeCode.toLowerCase();
  if (error?.name === "TimeoutError") return "timeout";
  return "fetch-failed";
}

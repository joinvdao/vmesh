import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const { ingestIntelHandoffToQuarantine } = await import("../lib/intelSourceCampaign.ts");

const args = parseArgs(process.argv.slice(2));
const manifestPath = resolve(args.manifest ?? "config/intel-source-refresh.json");
const request = JSON.parse(await readFile(manifestPath, "utf8"));
let handoff;
let execution = {
  runClass: "replay",
  missionId: null,
  codeImplemented: true,
  liveOperationProven: false
};

if (args.handoffFile) {
  handoff = JSON.parse(await readFile(resolve(args.handoffFile), "utf8"));
  execution.missionId = handoff?.run?.runId ?? null;
  execution.runClass = handoff?.run?.runClass ?? "replay";
  execution.liveOperationProven = execution.runClass === "live_proof";
} else {
  const baseUrl = (args.baseUrl ?? process.env.INTEL_TOOLS_BASE_URL ?? "").replace(/\/$/, "");
  if (!baseUrl) throw new Error("INTEL_TOOLS_BASE_URL or --base-url is required for a remote run.");
  const apiKey = process.env.INTEL_TOOLS_API_KEY ?? "";
  const mode = args.mode ?? "dry-run";
  const runClass = mode === "live" ? "live-proof" : mode === "mock" ? "mock" : "dry-run";
  let missionId = args.missionId ?? null;
  if (!missionId) {
    if (!args.approve)
      throw new Error("Creating a remote Intel Tools campaign requires explicit --approve.");
    const created = await requestJson(baseUrl, "/api/swarm/missions", {
      method: "POST",
      apiKey,
      body: {
        mission_input: request.objective,
        template: request.template,
        quality: request.quality,
        limits: request.limits,
        run_class: runClass,
        context_overrides: {
          jurisdictionScope: request.jurisdictionScope,
          dataBuckets: request.dataBuckets,
          refreshRequestSchemaVersion: request.schemaVersion
        },
        delivery_contract: {
          schemaVersion: "vmesh-intel-source-handoff-v1",
          candidateOnly: true,
          consumer: "vmesh"
        }
      }
    });
    missionId = created.id;
    if (!missionId) throw new Error("Intel Tools did not return a mission id.");
    await requestJson(baseUrl, `/api/swarm/missions/${missionId}/approve-plan`, {
      method: "POST",
      apiKey,
      body: { approved_by: "vmesh-operator-cli", approval_mode: "explicit_cli_approval" }
    });
  }
  const executionMode = args.execution ?? (mode === "mock" ? "inline" : "managed");
  if (executionMode === "inline") {
    const runPath = mode === "mock" ? "run-mock" : "run-live";
    const runSummary = await requestJson(baseUrl, `/api/swarm/missions/${missionId}/${runPath}`, {
      method: "POST",
      apiKey,
      body:
        mode === "mock"
          ? {}
          : {
              allow_endpoint_probes: true,
              max_tasks: args.maxTasks ? Number(args.maxTasks) : null
            },
      timeoutMs: Number(args.timeoutMs ?? 3_600_000)
    });
    const unfinished = activeTaskCount(runSummary.task_counts ?? {});
    if (unfinished > 0) {
      await requestJson(baseUrl, `/api/swarm/missions/${missionId}/pause`, {
        method: "POST",
        apiKey
      });
      throw new Error(
        `Intel Tools smoke mission ${missionId} paused with ${unfinished} unfinished task(s); ` +
          "no VMesh handoff was exported. Resume the mission for a complete campaign."
      );
    }
  } else if (executionMode === "managed") {
    await waitForMission(baseUrl, missionId, apiKey, {
      pollMs: Number(args.pollMs ?? 10_000),
      timeoutMs: Number(args.timeoutMs ?? 86_400_000)
    });
  } else {
    throw new Error("--execution must be inline or managed.");
  }
  await requestJson(baseUrl, `/api/vmesh/source-campaigns/${missionId}/handoff`, {
    method: "POST",
    apiKey,
    body: { max_collections_per_bucket: Number(args.maxCollections ?? 250) }
  });
  handoff = await requestJson(baseUrl, `/api/vmesh/source-campaigns/${missionId}/handoff`, {
    method: "GET",
    apiKey
  });
  execution = {
    runClass: handoff?.run?.runClass ?? "configured",
    missionId,
    codeImplemented: true,
    liveOperationProven: handoff?.run?.runClass === "live_proof"
  };
}

const quarantine = ingestIntelHandoffToQuarantine(handoff);
const outputRoot = resolve(
  args.output ?? `.artifacts/source-registry/intel-handoffs/${quarantine.runId}`
);
await mkdir(outputRoot, { recursive: true });
await Promise.all([
  writeJson(resolve(outputRoot, "vmesh-intel-source-handoff-v1.json"), handoff),
  writeJson(resolve(outputRoot, "review-clean-report.json"), quarantine.review),
  writeJson(resolve(outputRoot, "vmesh-intel-quarantine-v1.json"), quarantine),
  writeJson(resolve(outputRoot, "run-report.json"), {
    schemaVersion: "vmesh-intel-refresh-run-report-v1",
    ...execution,
    runId: quarantine.runId,
    ingestionKey: quarantine.ingestionKey,
    readyForVmeshQuarantineIngest: quarantine.review.readyForQuarantineIngest,
    readyForOperationalPromotion: false,
    outputFiles: [
      "vmesh-intel-source-handoff-v1.json",
      "review-clean-report.json",
      "vmesh-intel-quarantine-v1.json"
    ]
  })
]);

process.stdout.write(
  `${JSON.stringify(
    {
      ok: true,
      runId: quarantine.runId,
      runClass: execution.runClass,
      readyForVmeshQuarantineIngest: true,
      readyForOperationalPromotion: false,
      authorities: quarantine.authorities.length,
      endpoints: quarantine.endpoints.length,
      collections: quarantine.collections.length,
      outputRoot
    },
    null,
    2
  )}\n`
);

async function requestJson(baseUrl, path, { method, apiKey, body, timeoutMs = 60_000 }) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs)
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { error: "Intel Tools returned a non-JSON response." };
  }
  if (!response.ok) {
    const message =
      typeof payload?.detail === "string"
        ? payload.detail
        : `Intel Tools request failed with HTTP ${response.status}.`;
    throw new Error(message);
  }
  return payload;
}

async function waitForMission(baseUrl, missionId, apiKey, { pollMs, timeoutMs }) {
  const deadline = Date.now() + timeoutMs;
  let transientFailures = 0;
  while (Date.now() < deadline) {
    let summary;
    try {
      summary = await requestJson(baseUrl, `/api/swarm/missions/${missionId}`, {
        method: "GET",
        apiKey
      });
      transientFailures = 0;
    } catch (error) {
      if (!isTransientNetworkError(error) || Date.now() >= deadline) throw error;
      transientFailures += 1;
      const retryMs = Math.min(Math.max(pollMs, 1_000) * transientFailures, 30_000);
      process.stderr.write(
        `Intel Tools poll transiently unavailable for mission ${missionId}; retrying in ${retryMs}ms.\n`
      );
      await new Promise((resolvePromise) => setTimeout(resolvePromise, retryMs));
      continue;
    }
    const counts = summary.task_counts ?? {};
    const active =
      Number(counts.queued ?? 0) + Number(counts.running ?? 0) + Number(counts.retrying ?? 0);
    const failed = Number(counts.failed ?? 0);
    if (active === 0) {
      if (["cancelled", "blocked", "paused"].includes(summary.status)) {
        throw new Error(`Intel Tools mission ${missionId} ended with status ${summary.status}.`);
      }
      if (failed > 0)
        throw new Error(
          `Intel Tools mission ${missionId} completed with ${failed} failed task(s).`
        );
      return summary;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, pollMs));
  }
  throw new Error(`Intel Tools mission ${missionId} did not finish before the configured timeout.`);
}

function isTransientNetworkError(error) {
  const code = error?.cause?.code;
  return (
    error instanceof TypeError &&
    (error.message === "fetch failed" ||
      ["ECONNRESET", "ECONNREFUSED", "EHOSTUNREACH", "ENETUNREACH", "ETIMEDOUT"].includes(code))
  );
}

function activeTaskCount(counts) {
  return (
    Number(counts.queued ?? 0) +
    Number(counts.running ?? 0) +
    Number(counts.retrying ?? 0) +
    Number(counts.planned ?? 0)
  );
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--approve") {
      parsed.approve = true;
      continue;
    }
    if (!value.startsWith("--")) throw new Error(`Unexpected argument: ${value}`);
    const key = value.slice(2).replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
    const next = values[index + 1];
    if (!next || next.startsWith("--")) throw new Error(`Missing value for ${value}.`);
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

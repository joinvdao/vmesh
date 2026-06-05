#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const appUrl = normalizeBaseUrl(
  argValue("--base-url", process.env.VMESH_VIEWER_PROOF_BASE_URL ?? "http://localhost:3000")
);
const artifactDir = path.join(".artifacts", "terrain-source-preview");
const viewerArtifactDir = path.join(artifactDir, "viewer-live-proof");
const defaultReportPath = path.join(
  artifactDir,
  "source-preview-viewer-live-proof-latest.json"
);
const reportPath = argValue("--output", defaultReportPath);
const timeoutMs = Number(
  argValue("--timeout-ms", process.env.VMESH_VIEWER_PROOF_TIMEOUT_MS ?? "300000")
);
const chromeCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
];

const checks = [
  {
    id: "canada-ottawa-dtm-viewer",
    label: "Ottawa public-safe DTM viewer proof",
    role: "dtm",
    selectedTerrainProviderId: "source-auto-dtm-preview",
    coordinate: { latitude: 45.4215, longitude: -75.6972 },
    zoom: 13,
    expected: {
      selectedTerrainProviderId: "source-auto-dtm-preview",
      terrainStatus: "active",
      messageIncludes: "Official 1m DTM worker tile rendered via canada-hrdem",
      provider: "canada-hrdem",
      role: "dtm",
      groundModelRole: "bare-earth-dtm",
      resolutionMeters: "1",
      renderMode: "worker-geotiff"
    }
  },
  {
    id: "usa-denver-dsm-viewer",
    label: "Denver public-safe DSM viewer proof",
    role: "dsm",
    selectedTerrainProviderId: "source-auto-dsm-preview",
    coordinate: { latitude: 39.7392, longitude: -104.9903 },
    zoom: 13,
    expected: {
      selectedTerrainProviderId: "source-auto-dsm-preview",
      terrainStatus: "active",
      messageIncludes: "Official 1m DSM worker tile rendered via usgs-3dep-lpc-dsm",
      provider: "usgs-3dep-lpc-dsm",
      role: "dsm",
      groundModelRole: "surface-dsm",
      resolutionMeters: "1",
      renderMode: "worker-point-cloud"
    }
  }
];

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function normalizeBaseUrl(value) {
  return String(value).replace(/\/+$/, "");
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchOk(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2500) });
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await fetchOk(appUrl)) return null;

  const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  const child = spawn(process.execPath, [nextBin, "dev", "--port", "3000"], {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await fetchOk(appUrl)) return child;
    await sleep(1000);
  }

  child.kill();
  throw new Error(`Dev server did not become ready. Output:\n${output}`);
}

function findChrome() {
  const found = chromeCandidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error("Chrome or Edge was not found for viewer live proof.");
  return found;
}

async function getJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`Request failed: ${url}`);
  return response.json();
}

async function launchChrome() {
  const port = 9440 + Math.floor(Math.random() * 250);
  const profile = path.resolve(viewerArtifactDir, "chrome-profile");
  await rm(profile, { recursive: true, force: true });
  const child = spawn(
    findChrome(),
    [
      "--headless=new",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-networking",
      "--disable-extensions",
      `--remote-debugging-port=${port}`,
      "--remote-debugging-address=127.0.0.1",
      `--user-data-dir=${profile}`,
      "--disable-gpu",
      "--hide-scrollbars",
      "--window-size=1440,900",
      "about:blank"
    ],
    { stdio: ["ignore", "pipe", "pipe"], windowsHide: true }
  );
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  for (let attempt = 0; attempt < 160; attempt += 1) {
    try {
      await getJson(`http://127.0.0.1:${port}/json/version`);
      return { child, port, profile };
    } catch {
      await sleep(250);
    }
  }

  child.kill();
  throw new Error(`Chrome remote debugging did not become ready. Output:\n${output}`);
}

async function createTab(port) {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(appUrl)}`, {
    method: "PUT"
  });
  if (!response.ok) throw new Error("Failed to create Chrome tab.");
  return response.json();
}

function createCdpClient(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  let nextId = 1;
  const pending = new Map();
  const errors = [];

  socket.addEventListener("message", (message) => {
    const data = JSON.parse(message.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(new Error(data.error.message));
      else resolve(data.result);
      return;
    }

    if (data.method === "Runtime.exceptionThrown") {
      const details = data.params.exceptionDetails;
      errors.push(
        details.exception?.description ??
          details.exception?.value ??
          details.text ??
          "Runtime exception"
      );
    }
    if (data.method === "Runtime.consoleAPICalled" && data.params.type === "error") {
      const text = data.params.args.map((arg) => arg.value ?? arg.description).join(" ");
      if (!text.includes("Failed to load resource")) errors.push(text);
    }
  });

  const ready = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  return {
    ready,
    errors,
    close: () => socket.close(),
    send(method, params = {}) {
      const id = nextId;
      nextId += 1;
      const promise = new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
      });
      socket.send(JSON.stringify({ id, method, params }));
      return promise;
    }
  };
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  return result.result.value;
}

async function waitForAppReady(client) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 60000) {
    const state = await evaluate(
      client,
      `Boolean(window.__vmeshStore?.getState && window.__vmeshMap?.getStyle)`
    );
    if (state) return;
    await sleep(500);
  }
  throw new Error("Dev-only vmesh store/map hooks did not become ready.");
}

async function waitForStoreCheck(client, check) {
  const startedAt = Date.now();
  let snapshot = null;
  while (Date.now() - startedAt < timeoutMs) {
    snapshot = await evaluate(
      client,
      `(() => {
        const state = window.__vmeshStore?.getState?.();
        if (!state) return null;
        return {
          selectedTerrainProviderId: state.selectedTerrainProviderId,
          selectedImageryProviderId: state.selectedImageryProviderId,
          selectedBasemapProviderId: state.selectedBasemapProviderId,
          activeLayers: state.activeLayers,
          mapStatus: state.mapStatus,
          viewState: state.viewState,
          flyToRequest: state.flyToRequest
            ? {
                id: state.flyToRequest.id,
                label: state.flyToRequest.label,
                zoom: state.flyToRequest.zoom
              }
            : null,
          viewerMode: document.querySelector("[data-viewer-mode]")?.getAttribute("data-viewer-mode") ?? null,
          sourcePreviewResources: performance
            .getEntriesByType("resource")
            .map((entry) => entry.name)
            .filter((name) => name.includes("/api/terrain/source-preview/"))
        };
      })()`
    );

    const message = snapshot?.mapStatus?.message ?? "";
    const terrainReady =
      snapshot?.selectedTerrainProviderId === check.expected.selectedTerrainProviderId &&
      snapshot?.mapStatus?.terrain === check.expected.terrainStatus &&
      message.includes(check.expected.messageIncludes);
    const hasSourceResource = (snapshot?.sourcePreviewResources ?? []).some((url) =>
      url.includes(`/source-auto/${check.role}/`)
    );

    if (terrainReady && hasSourceResource) return snapshot;
    await sleep(1000);
  }

  throw new Error(
    `Viewer terrain proof did not reach expected state for ${check.id}. Last snapshot:\n${JSON.stringify(
      snapshot,
      null,
      2
    )}`
  );
}

async function runViewerWorkflow(client, check) {
  await evaluate(
    client,
    `(() => {
      performance.clearResourceTimings();
      const store = window.__vmeshStore.getState();
      store.setSelectedTerrainProvider(${JSON.stringify(check.selectedTerrainProviderId)});
      store.flyToLocation({
        longitude: ${JSON.stringify(check.coordinate.longitude)},
        latitude: ${JSON.stringify(check.coordinate.latitude)},
        zoom: ${JSON.stringify(check.zoom)},
        label: ${JSON.stringify(check.label)}
      });
    })()`
  );

  return waitForStoreCheck(client, check);
}

function headerSummary(headers) {
  return {
    contentType: headers.get("content-type"),
    provider: headers.get("x-vmesh-terrain-provider"),
    role: headers.get("x-vmesh-terrain-role"),
    groundModelRole: headers.get("x-vmesh-ground-model-role"),
    resolutionMeters: headers.get("x-vmesh-terrain-resolution-meters"),
    sourceRelease: headers.get("x-vmesh-terrain-source-release"),
    renderMode: headers.get("x-vmesh-terrain-render-mode"),
    sourceStatus: headers.get("x-vmesh-terrain-source-status"),
    sourceReason: headers.get("x-vmesh-terrain-source-reason")
  };
}

function candidateUrlsFromSnapshot(snapshot, role) {
  const urls = Array.from(new Set(snapshot.sourcePreviewResources ?? []))
    .filter((url) => url.includes(`/api/terrain/source-preview/`) && url.includes(`/${role}/`))
    .filter((url) => !url.includes("/probe?"));

  return urls.sort((left, right) => {
    const leftIsAuto = left.includes(`/source-auto/${role}/`) ? 0 : 1;
    const rightIsAuto = right.includes(`/source-auto/${role}/`) ? 0 : 1;
    return leftIsAuto - rightIsAuto || left.length - right.length;
  });
}

function compareHeaders(headers, expected) {
  const reasons = [];
  if (!(headers.contentType ?? "").startsWith("image/png")) {
    reasons.push(`Expected image/png, got ${headers.contentType ?? "none"}.`);
  }
  for (const key of ["provider", "role", "groundModelRole", "resolutionMeters", "renderMode"]) {
    if (headers[key] !== expected[key]) {
      reasons.push(`Expected ${key}=${expected[key]}, got ${headers[key] ?? "none"}.`);
    }
  }
  if (headers.sourceStatus === "transparent") {
    reasons.push(`Source route returned transparent tile: ${headers.sourceReason ?? "no reason"}.`);
  }
  return reasons;
}

async function fetchTileArtifact(check, snapshot) {
  const candidates = candidateUrlsFromSnapshot(snapshot, check.role).slice(0, 6);
  const attempts = [];

  for (const candidate of candidates) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(candidate, {
        headers: { Accept: "image/png,image/*,*/*;q=0.8" },
        signal: controller.signal
      });
      const headers = headerSummary(response.headers);
      const body = Buffer.from(await response.arrayBuffer());
      const reasons = compareHeaders(headers, check.expected);
      if (response.status !== 200) reasons.push(`Expected HTTP 200, got ${response.status}.`);
      if (body.byteLength < 2048) {
        reasons.push(`Expected retained image to be at least 2048 bytes, got ${body.byteLength}.`);
      }
      const matchedExpected = reasons.length === 0;
      const artifactPath = path.join(viewerArtifactDir, `${check.id}.png`);

      attempts.push({
        url: candidate,
        httpStatus: response.status,
        headers,
        byteSize: body.byteLength,
        matchedExpected,
        reasons
      });

      if (matchedExpected) {
        await writeFile(artifactPath, body);
        return {
          selectedTileUrl: candidate,
          httpStatus: response.status,
          headers,
          byteSize: body.byteLength,
          retainedArtifact: artifactPath,
          matchedExpected: true,
          reasons: []
        };
      }
    } catch (error) {
      attempts.push({
        url: candidate,
        httpStatus: null,
        headers: null,
        byteSize: 0,
        matchedExpected: false,
        reasons: [`Tile fetch failed: ${error instanceof Error ? error.message : String(error)}.`]
      });
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    selectedTileUrl: attempts[0]?.url ?? null,
    httpStatus: attempts[0]?.httpStatus ?? null,
    headers: attempts[0]?.headers ?? null,
    byteSize: attempts[0]?.byteSize ?? 0,
    retainedArtifact: null,
    matchedExpected: false,
    reasons:
      attempts.length > 0
        ? attempts.flatMap((attempt) => attempt.reasons)
        : ["The viewer did not request a source-preview tile for this role."],
    attempts
  };
}

async function runCheck(client, check) {
  try {
    const snapshot = await runViewerWorkflow(client, check);
    const tile = await fetchTileArtifact(check, snapshot);

    return {
      id: check.id,
      runClass: "live-proof",
      coordinateDisclosure: "public-safe-eval-coordinate",
      expected: check.expected,
      viewerState: {
        selectedTerrainProviderId: snapshot.selectedTerrainProviderId,
        selectedImageryProviderId: snapshot.selectedImageryProviderId,
        selectedBasemapProviderId: snapshot.selectedBasemapProviderId,
        activeLayers: snapshot.activeLayers,
        mapStatus: snapshot.mapStatus,
        viewerMode: snapshot.viewerMode,
        flyToRequest: snapshot.flyToRequest
      },
      sourcePreviewResourceCount: snapshot.sourcePreviewResources.length,
      selectedTileUrl: tile.selectedTileUrl,
      httpStatus: tile.httpStatus,
      headers: tile.headers,
      byteSize: tile.byteSize,
      retainedArtifact: tile.retainedArtifact,
      matchedExpected: tile.matchedExpected,
      reasons: tile.reasons,
      attempts: tile.attempts
    };
  } catch (error) {
    return {
      id: check.id,
      runClass: "configured",
      coordinateDisclosure: "public-safe-eval-coordinate",
      expected: check.expected,
      viewerState: null,
      sourcePreviewResourceCount: 0,
      selectedTileUrl: null,
      httpStatus: null,
      headers: null,
      byteSize: 0,
      retainedArtifact: null,
      matchedExpected: false,
      reasons: [`Viewer workflow failed: ${error instanceof Error ? error.message : String(error)}.`]
    };
  }
}

async function main() {
  await mkdir(viewerArtifactDir, { recursive: true });
  await mkdir(path.dirname(reportPath), { recursive: true });
  let server = null;
  let chrome = null;
  let client = null;

  try {
    server = await ensureServer();
    chrome = await launchChrome();
    const tab = await createTab(chrome.port);
    client = createCdpClient(tab.webSocketDebuggerUrl);
    await client.ready;
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Log.enable");
    await client.send("Network.enable");
    await sleep(1500);
    await waitForAppReady(client);

    const results = [];
    for (const check of checks) {
      results.push(await runCheck(client, check));
    }

    const browserRuntimeErrors = client.errors.filter(
      (error) =>
        !error.includes("Failed to load resource") &&
        !error.includes("net::ERR_ABORTED") &&
        !error.includes("favicon")
    );
    const allMatched = results.every((result) => result.matchedExpected);
    const report = {
      schemaVersion: "vmesh-terrain-source-preview-viewer-live-proof-v1",
      generatedAt: new Date().toISOString(),
      runClass: allMatched && browserRuntimeErrors.length === 0 ? "live-proof" : "configured",
      status:
        allMatched && browserRuntimeErrors.length === 0 ? "viewer-live-proof-passed" : "failed",
      baseUrl: appUrl,
      universalUsaCanadaOneMeterDtmProven: false,
      universalDsmProven: false,
      note:
        "Public-safe browser proof for source-to-viewer ingestion. It drives the vmesh development store, waits for the real probe/tile-readiness path, then retains the actual source-preview worker tile requested by the viewer. It does not prove country-wide 1m USA/Canada coverage.",
      summary: {
        totalChecks: results.length,
        expectedMatches: results.filter((result) => result.matchedExpected).length,
        retainedArtifacts: results.filter((result) => result.retainedArtifact).length,
        browserRuntimeErrors: browserRuntimeErrors.length
      },
      browserRuntimeErrors,
      checks: results
    };

    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.status === "viewer-live-proof-passed" ? 0 : 1);
  } finally {
    client?.close();
    chrome?.child.kill();
    if (chrome?.profile) {
      await rm(chrome.profile, { recursive: true, force: true }).catch(() => {});
    }
    server?.kill();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

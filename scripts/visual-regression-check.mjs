import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import zlib from "node:zlib";

const appUrl = process.env.VMESH_VISUAL_URL ?? "http://localhost:3000";
const artifactDir = path.resolve(".artifacts/visual");
const chromeCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
];

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchOk(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
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

  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await fetchOk(appUrl)) return child;
    await sleep(1000);
  }

  child.kill();
  throw new Error(`Dev server did not become ready. Output:\n${output}`);
}

function findChrome() {
  const found = chromeCandidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error("Chrome or Edge was not found for visual verification.");
  return found;
}

async function getJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`Request failed: ${url}`);
  return response.json();
}

async function launchChrome() {
  const port = 9333 + Math.floor(Math.random() * 300);
  const profile = path.join(artifactDir, "chrome-profile");
  await rm(profile, { recursive: true, force: true });
  const child = spawn(
    findChrome(),
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      "--disable-gpu",
      "--hide-scrollbars",
      "--window-size=1440,900",
      "about:blank"
    ],
    { stdio: "ignore", windowsHide: true }
  );

  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      await getJson(`http://127.0.0.1:${port}/json/version`);
      return { child, port, profile };
    } catch {
      await sleep(250);
    }
  }

  child.kill();
  throw new Error("Chrome remote debugging did not become ready.");
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
  const events = [];
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

    events.push(data);
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
      errors.push(data.params.args.map((arg) => arg.value ?? arg.description).join(" "));
    }
    if (data.method === "Log.entryAdded" && data.params.entry.level === "error") {
      const text = data.params.entry.text;
      if (!text.startsWith("Failed to load resource:")) errors.push(text);
    }
    if (data.method === "Network.responseReceived" && data.params.response.status >= 400) {
      const { status, url } = data.params.response;
      if (!url.endsWith("/favicon.ico")) errors.push(`HTTP ${status}: ${url}`);
    }
  });

  const ready = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  return {
    ready,
    errors,
    events,
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

function parsePngRgba(buffer) {
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") throw new Error("Screenshot is not a PNG.");

  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
    }
    if (type === "IDAT") idat.push(data);
    if (type === "IEND") break;
  }

  if (colorType !== 2 && colorType !== 6) {
    throw new Error(`Unsupported screenshot color type: ${colorType}`);
  }
  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const sourceBytesPerPixel = colorType === 6 ? 4 : 3;
  const sourceStride = width * sourceBytesPerPixel;
  const outputBytesPerPixel = 4;
  const pixels = Buffer.alloc(width * outputBytesPerPixel * height);
  const rows = Buffer.alloc(sourceStride * height);
  let input = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[input];
    input += 1;
    const rowStart = y * sourceStride;
    const prevRowStart = rowStart - sourceStride;

    for (let x = 0; x < sourceStride; x += 1) {
      const raw = inflated[input];
      input += 1;
      const left = x >= sourceBytesPerPixel ? rows[rowStart + x - sourceBytesPerPixel] : 0;
      const up = y > 0 ? rows[prevRowStart + x] : 0;
      const upLeft =
        y > 0 && x >= sourceBytesPerPixel ? rows[prevRowStart + x - sourceBytesPerPixel] : 0;
      let value = raw;

      if (filter === 1) value = raw + left;
      else if (filter === 2) value = raw + up;
      else if (filter === 3) value = raw + Math.floor((left + up) / 2);
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        value = raw + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft);
      }

      rows[rowStart + x] = value & 0xff;
    }

    for (let x = 0; x < width; x += 1) {
      const sourceIndex = rowStart + x * sourceBytesPerPixel;
      const outputIndex = (y * width + x) * outputBytesPerPixel;
      pixels[outputIndex] = rows[sourceIndex];
      pixels[outputIndex + 1] = rows[sourceIndex + 1];
      pixels[outputIndex + 2] = rows[sourceIndex + 2];
      pixels[outputIndex + 3] = colorType === 6 ? rows[sourceIndex + 3] : 255;
    }
  }

  return { width, height, pixels };
}

function assertScreenshotNonblank(base64Png) {
  const { pixels } = parsePngRgba(Buffer.from(base64Png, "base64"));
  const colors = new Set();
  let dark = 0;
  let light = 0;
  let colored = 0;

  for (let index = 0; index < pixels.length; index += 4 * 37) {
    const r = pixels[index];
    const g = pixels[index + 1];
    const b = pixels[index + 2];
    const a = pixels[index + 3];
    if (a < 10) continue;
    const luminance = (r + g + b) / 3;
    if (luminance < 16) dark += 1;
    if (luminance > 239) light += 1;
    if (Math.max(r, g, b) - Math.min(r, g, b) > 20) colored += 1;
    colors.add(`${r >> 4}-${g >> 4}-${b >> 4}`);
  }

  if (colors.size < 40 || colored < 80) {
    throw new Error("Screenshot pixel check failed: page appears blank or monochrome.");
  }
  if (dark > colors.size * 400 || light > colors.size * 400) {
    throw new Error("Screenshot pixel check failed: page is dominated by blank extremes.");
  }
}

function assertMapRegionRenderable(base64Png, region) {
  const { width, height, pixels } = parsePngRgba(Buffer.from(base64Png, "base64"));
  const x0 = Math.max(0, Math.floor(region.x));
  const y0 = Math.max(0, Math.floor(region.y));
  const x1 = Math.min(width, Math.ceil(region.x + region.width));
  const y1 = Math.min(height, Math.ceil(region.y + region.height));
  const colors = new Set();
  let samples = 0;
  let dark = 0;
  let colored = 0;
  let luminanceTotal = 0;

  for (let y = y0; y < y1; y += 5) {
    for (let x = x0; x < x1; x += 5) {
      const index = (y * width + x) * 4;
      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];
      const a = pixels[index + 3];
      if (a < 10) continue;

      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      samples += 1;
      luminanceTotal += luminance;
      if (luminance < 30) dark += 1;
      if (Math.max(r, g, b) - Math.min(r, g, b) > 14) colored += 1;
      colors.add(`${r >> 4}-${g >> 4}-${b >> 4}`);
    }
  }

  if (samples < 100) {
    throw new Error("Close map pixel check failed: map surface crop was too small.");
  }

  const darkRatio = dark / samples;
  const averageLuminance = luminanceTotal / samples;
  if (darkRatio > 0.72 || averageLuminance < 38 || colors.size < 18 || colored < samples * 0.08) {
    throw new Error(
      `Close map pixel check failed: surface still appears blank or black (${JSON.stringify({
        darkRatio: Number(darkRatio.toFixed(3)),
        averageLuminance: Number(averageLuminance.toFixed(1)),
        colorBuckets: colors.size,
        coloredSamples: colored,
        samples
      })}).`
    );
  }
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  return result.result.value;
}

async function waitForBodyText(client, expectedFragments, errorMessage, timeoutMs = 30000) {
  const startedAt = Date.now();
  let text = "";
  while (Date.now() - startedAt < timeoutMs) {
    text = (await evaluate(client, "document.body.innerText")) ?? "";
    const normalized = text.toLowerCase();
    if (expectedFragments.every((fragment) => normalized.includes(fragment.toLowerCase()))) {
      return text;
    }
    await sleep(500);
  }

  throw new Error(`${errorMessage}\n\nBody text snapshot:\n${text.slice(0, 1600)}`);
}

async function waitForCloseMapTiles(client, timeoutMs = 45000) {
  const startedAt = Date.now();
  let tileHealth = null;

  while (Date.now() - startedAt < timeoutMs) {
    tileHealth = await evaluate(
      client,
      `(() => {
        const map = window.__vmeshMap;
        const resources = performance
          .getEntriesByType("resource")
          .map((entry) => entry.name)
          .filter((name) => name.includes("tile.openstreetmap.org/"));
        const closeTileResources = resources.filter((name) =>
          /tile\\.openstreetmap\\.org\\/(9|10|11|12|13|14)\\//.test(name)
        );
        const sourceCache = map?.style?.sourceCaches?.["osm-raster"];
        const tiles = Object.values(sourceCache?._tiles ?? {}).map((tile) => {
          const tileId = tile.tileID ?? {};
          const canonical = tileId.canonical ?? {};
          return {
            z: canonical.z ?? tileId.z ?? tileId.overscaledZ ?? null,
            state: tile.state ?? "unknown"
          };
        });
        return {
          hasMap: Boolean(map),
          zoom: map?.getZoom?.() ?? null,
          tileZoom: map?.transform?.tileZoom ?? null,
          styleLoaded: map?.isStyleLoaded?.() ?? false,
          closeTileResources: closeTileResources.length,
          closeLoadedTiles: tiles.filter((tile) => tile.z >= 9 && tile.state === "loaded").length,
          loadedTiles: tiles.filter((tile) => tile.state === "loaded").length,
          tileStates: tiles.slice(0, 12)
        };
      })()`
    );

    if (
      tileHealth?.hasMap &&
      tileHealth.zoom >= 9 &&
      (tileHealth.styleLoaded || tileHealth.closeTileResources > 0) &&
      tileHealth.closeLoadedTiles > 0
    ) {
      return tileHealth;
    }

    await sleep(500);
  }

  throw new Error(
    `Close map tile check failed: close-zoom source-backed tiles did not finish loading (${JSON.stringify(
      tileHealth
    )}).`
  );
}

async function main() {
  await mkdir(artifactDir, { recursive: true });
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

    await waitForBodyText(
      client,
      ["Three.js atlas sphere", "Visual orbit mode", "Hex Count 1"],
      "First viewport did not reach the expected orbit globe state."
    );
    const scroll = await evaluate(
      client,
      "({w: document.body.scrollWidth, h: document.body.scrollHeight, iw: innerWidth, ih: innerHeight})"
    );
    if (scroll.w > scroll.iw || scroll.h > scroll.ih) throw new Error("Body scroll is present.");

    const screenshot = await client.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false
    });
    assertScreenshotNonblank(screenshot.data);
    await writeFile(
      path.join(artifactDir, "first-viewport.png"),
      Buffer.from(screenshot.data, "base64")
    );

    await evaluate(
      client,
      "[...document.querySelectorAll('button')].find((button) => button.getAttribute('aria-label') === 'Sources')?.click()"
    );
    await waitForBodyText(
      client,
      ["Visual treatment", "Fixture package"],
      "Source drawer missing visual treatment or macro package disclosure."
    );

    await evaluate(
      client,
      "[...document.querySelectorAll('button')].find((button) => button.getAttribute('aria-label') === 'Macro layers')?.click()"
    );
    await waitForBodyText(
      client,
      ["Fixture package", "H3 overlay"],
      "Macro panel missing package mode or H3 overlay disclosure."
    );

    await evaluate(
      client,
      `(() => {
        const input = document.querySelector('input[name="location-search"]');
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        setter?.call(input, "London");
        input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: "London" }));
        input.closest("form").requestSubmit();
      })()`
    );
    await waitForBodyText(
      client,
      ["OSS Map Output", "Source-backed map output", "Hex Count 1"],
      "Close zoom did not switch to source-backed map output."
    );
    const closeMode = await evaluate(
      client,
      "({mode: document.querySelector('[data-viewer-mode]')?.getAttribute('data-viewer-mode'), opacity: Number(document.querySelector('[data-viewer-mode]')?.getAttribute('data-map-opacity') ?? 0)})"
    );
    if (closeMode.mode !== "oss-map-output" || closeMode.opacity < 0.85) {
      throw new Error(`Close zoom mode/opacity contract failed: ${JSON.stringify(closeMode)}`);
    }
    await waitForCloseMapTiles(client);
    await sleep(1000);
    const closeSurface = await evaluate(
      client,
      `(() => {
        const shell = document.querySelector(".vmesh-globe-shell--map-output");
        const rect = shell?.getBoundingClientRect();
        if (!rect) return null;
        return {
          x: rect.x + rect.width * 0.18,
          y: rect.y + rect.height * 0.18,
          width: rect.width * 0.64,
          height: rect.height * 0.64
        };
      })()`
    );
    if (!closeSurface) throw new Error("Close map surface was not measurable.");
    const closeScreenshot = await client.send("Page.captureScreenshot", { format: "png" });
    assertScreenshotNonblank(closeScreenshot.data);
    assertMapRegionRenderable(closeScreenshot.data, closeSurface);
    await writeFile(
      path.join(artifactDir, "close-zoom-source-output.png"),
      Buffer.from(closeScreenshot.data, "base64")
    );

    if (client.errors.length > 0) {
      throw new Error(`Console/runtime errors detected:\n${client.errors.join("\n")}`);
    }

    console.log("Visual regression check passed.");
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

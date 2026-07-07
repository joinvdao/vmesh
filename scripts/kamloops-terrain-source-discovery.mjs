import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ARCGIS_ROOT = "https://maps.kamloops.ca/arcgis/rest/services";
const DEFAULT_OUTPUT = ".artifacts/kamloops-terrain-source-discovery/latest.private.json";
const TERRAIN_TERMS =
  /dem|lidar|elev|terrain|contour|surface|height|hypso|breakline|pointz|slope|dtm|dsm|ortho|photo/i;
const RASTER_TERMS = /imageserver|raster|pixel|dtm|dsm|dem|lidar|elevation model|esri grid/i;

function usage() {
  return [
    "Kamloops terrain source discovery",
    "",
    "Usage:",
    "  npm run terrain:kamloops-discovery -- [--output .artifacts/kamloops-terrain-source-discovery/latest.private.json]",
    "",
    "Scans the official City of Kamloops ArcGIS REST service catalog for public terrain raster rails.",
    "The default output path is ignored/operator-local."
  ].join("\n");
}

function valueAfter(args, index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value.`);
  return value;
}

function parseArgs(args) {
  const options = { output: DEFAULT_OUTPUT };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      console.log(usage());
      process.exit(0);
    }
    if (arg === "--output") {
      options.output = valueAfter(args, index, arg);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

async function fetchJson(url, timeoutMs = 20_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function listFolder(folder = "") {
  const url = folder
    ? `${ARCGIS_ROOT}/${encodeURIComponent(folder)}?f=pjson`
    : `${ARCGIS_ROOT}?f=pjson`;
  return fetchJson(url);
}

function serviceUrl(service) {
  return `${ARCGIS_ROOT}/${service.name}/${service.type}`;
}

function textFor(value) {
  return JSON.stringify(value ?? {});
}

async function discoverServices() {
  const rootListing = await listFolder();
  const folders = Array.isArray(rootListing.folders) ? rootListing.folders : [];
  const services = Array.isArray(rootListing.services) ? [...rootListing.services] : [];

  for (const folder of folders) {
    try {
      const listing = await listFolder(folder);
      for (const service of listing.services ?? []) services.push({ ...service, folder });
    } catch (error) {
      services.push({
        name: `${folder}/[folder-list-failed]`,
        type: "unavailable",
        folder,
        error: error instanceof Error ? error.message : "folder list failed"
      });
    }
  }

  return { folders, services };
}

function summarizeService(service, metadata) {
  const url = serviceUrl(service);
  const layers = Array.isArray(metadata.layers) ? metadata.layers : [];
  const tables = Array.isArray(metadata.tables) ? metadata.tables : [];
  const terrainLayers = [...layers, ...tables]
    .filter((layer) => TERRAIN_TERMS.test(`${layer.id} ${layer.name}`))
    .map((layer) => ({ id: layer.id, name: layer.name }));
  const metadataText = textFor({
    service,
    documentInfo: metadata.documentInfo,
    serviceDescription: metadata.serviceDescription,
    description: metadata.description,
    copyrightText: metadata.copyrightText,
    layers,
    tables
  });

  const terrainRelevant =
    service.type === "ImageServer" || TERRAIN_TERMS.test(`${service.name} ${metadataText}`);
  const rasterCandidate =
    service.type === "ImageServer" || (terrainRelevant && RASTER_TERMS.test(metadataText));

  return {
    service: service.name,
    type: service.type,
    folder: service.folder ?? null,
    url,
    terrainRelevant,
    rasterCandidate,
    imageServer: service.type === "ImageServer",
    terrainLayers,
    serviceDescription: metadata.serviceDescription ?? metadata.description ?? null
  };
}

async function summarizeLayer(service, layer) {
  const url = `${serviceUrl(service)}/${layer.id}`;
  try {
    const metadata = await fetchJson(`${url}?f=pjson`);
    const fields = Array.isArray(metadata.fields)
      ? metadata.fields.map((field) => field.name).filter(Boolean)
      : [];
    return {
      id: layer.id,
      name: layer.name,
      url,
      type: metadata.type ?? null,
      geometryType: metadata.geometryType ?? null,
      fields,
      hasElevationField: fields.some((field) => /elev|height|z|contour/i.test(field)),
      extent: metadata.extent
        ? {
            spatialReference: metadata.extent.spatialReference,
            xmin: metadata.extent.xmin,
            ymin: metadata.extent.ymin,
            xmax: metadata.extent.xmax,
            ymax: metadata.extent.ymax
          }
        : null
    };
  } catch (error) {
    return {
      id: layer.id,
      name: layer.name,
      url,
      error: error instanceof Error ? error.message : "layer metadata failed"
    };
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { folders, services } = await discoverServices();
  const summaries = [];

  for (const service of services) {
    if (service.type === "unavailable") {
      summaries.push({
        service: service.name,
        type: service.type,
        folder: service.folder ?? null,
        url: null,
        terrainRelevant: false,
        rasterCandidate: false,
        imageServer: false,
        terrainLayers: [],
        error: service.error
      });
      continue;
    }
    try {
      const metadata = await fetchJson(`${serviceUrl(service)}?f=pjson`);
      const summary = summarizeService(service, metadata);
      if (summary.terrainRelevant || summary.imageServer) {
        summary.layerDetails = [];
        for (const layer of summary.terrainLayers) {
          summary.layerDetails.push(await summarizeLayer(service, layer));
        }
      }
      summaries.push(summary);
    } catch (error) {
      summaries.push({
        service: service.name,
        type: service.type,
        folder: service.folder ?? null,
        url: serviceUrl(service),
        terrainRelevant: false,
        rasterCandidate: false,
        imageServer: false,
        terrainLayers: [],
        error: error instanceof Error ? error.message : "service metadata failed"
      });
    }
  }

  const relevant = summaries.filter((summary) => summary.terrainRelevant || summary.imageServer);
  const imageServers = summaries.filter((summary) => summary.imageServer);
  const rasterCandidates = summaries.filter((summary) => summary.rasterCandidate);
  const vectorElevationCandidates = relevant.filter(
    (summary) => !summary.imageServer && summary.terrainLayers.length > 0
  );
  const report = {
    schemaVersion: "vmesh-kamloops-terrain-source-discovery-v1",
    generatedAt: new Date().toISOString(),
    source: {
      arcgisRoot: ARCGIS_ROOT
    },
    counts: {
      folderCount: folders.length,
      serviceCount: services.length,
      terrainRelevantCount: relevant.length,
      imageServerCount: imageServers.length,
      rasterCandidateCount: rasterCandidates.length,
      vectorElevationCandidateCount: vectorElevationCandidates.length
    },
    conclusion: {
      publicImageServerRailFound: imageServers.length > 0,
      publicRasterServiceCandidateFound: rasterCandidates.some(
        (candidate) => candidate.imageServer
      ),
      note:
        imageServers.length > 0
          ? "At least one official ImageServer exists; inspect before relying only on DEM ZIP refs."
          : "No official ImageServer terrain rail was exposed by the City of Kamloops ArcGIS REST catalog in this scan."
    },
    terrainRelevantServices: relevant
  };

  await mkdir(path.dirname(options.output), { recursive: true });
  await writeFile(options.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        schemaVersion: report.schemaVersion,
        generatedAt: report.generatedAt,
        counts: report.counts,
        conclusion: report.conclusion,
        output: options.output
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

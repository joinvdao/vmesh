import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.VMESH_BA_ROUTE_PROOF_BASE_URL ?? "http://127.0.0.1:3000";
const ARTIFACT_DIR = ".artifacts/source-broker";
const OUTPUT_PATH = path.join(ARTIFACT_DIR, "ba-golden-site-route-proof-latest.json");

const GEOSPATIAL_SEGMENTS = [
  "terrain_elevation",
  "imagery_observation",
  "water_hydrology",
  "access_infrastructure",
  "soils_landcover",
  "climate_weather"
].join(",");

const ECOSYSTEM_SEGMENTS = [
  "ecology_biodiversity_carbon",
  "soils_landcover",
  "water_hydrology",
  "climate_weather",
  "agriculture_operations",
  "community_economy"
].join(",");

const publicSafeSamples = [
  {
    id: "kamloops-city-public-safe",
    publicSafeLabel: "Kamloops public-safe city sample",
    latitude: 50.6745,
    longitude: -120.3273,
    coordinateDisclosure: "public-safe-city-coordinate",
    retainFullResponse: true
  },
  {
    id: "calgary-city-public-safe",
    publicSafeLabel: "Calgary public-safe city sample",
    latitude: 51.0447,
    longitude: -114.0719,
    coordinateDisclosure: "public-safe-city-coordinate",
    retainFullResponse: true
  }
];

function privateSampleFromEnv({ id, publicSafeLabel, latEnv, lngEnv }) {
  const latitude = Number(process.env[latEnv]);
  const longitude = Number(process.env[lngEnv]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return {
      id,
      publicSafeLabel,
      coordinateDisclosure: "setup-gap-private-coordinate-required",
      configured: false,
      missingEnv: [latEnv, lngEnv]
    };
  }

  return {
    id,
    publicSafeLabel,
    latitude,
    longitude,
    coordinateDisclosure: "operator-local-private-coordinate-redacted",
    configured: true,
    retainFullResponse: false
  };
}

const privateSamples = [
  privateSampleFromEnv({
    id: "kamloops-rose-golden",
    publicSafeLabel: "Kamloops / Rose golden evaluation site",
    latEnv: "VMESH_BA_KAMLOOPS_ROSE_LAT",
    lngEnv: "VMESH_BA_KAMLOOPS_ROSE_LNG"
  }),
  privateSampleFromEnv({
    id: "alberta-golden",
    publicSafeLabel: "Alberta golden evaluation site",
    latEnv: "VMESH_BA_ALBERTA_GOLDEN_LAT",
    lngEnv: "VMESH_BA_ALBERTA_GOLDEN_LNG"
  })
];

function endpointUrl(kind, sample) {
  const route = kind === "geospatial" ? "ba" : "ecosystem";
  const segments = kind === "geospatial" ? GEOSPATIAL_SEGMENTS : ECOSYSTEM_SEGMENTS;
  const url = new URL(`/api/geospatial-package/${route}`, BASE_URL);
  url.searchParams.set("lat", String(sample.latitude));
  url.searchParams.set("lng", String(sample.longitude));
  url.searchParams.set("segments", segments);
  url.searchParams.set("consumerAppId", "ba-gis-worker");
  return url;
}

function redactedEndpoint(kind) {
  return `/api/geospatial-package/${kind === "geospatial" ? "ba" : "ecosystem"}?lat=redacted&lng=redacted&segments=...`;
}

function intelBrokerUrl(segment = null) {
  const url = new URL("/api/geospatial-package/intel-broker", BASE_URL);
  if (segment) url.searchParams.set("segment", segment);
  return url;
}

function goldenEvalUrl(params = {}) {
  const url = new URL("/api/geospatial-package/ba-golden-evals", BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });
  const text = await response.text();
  let body = null;

  try {
    body = JSON.parse(text);
  } catch {
    body = { parseError: true, textLength: text.length };
  }

  return { response, body, text };
}

function summarizeGeospatial(body) {
  const sourceRecords = Array.isArray(body.sourceRecords) ? body.sourceRecords : [];
  const liveProof = Array.isArray(body.liveProof) ? body.liveProof : [];
  const gaps = Array.isArray(body.gaps) ? body.gaps : [];

  return {
    schemaVersion: body.schemaVersion ?? null,
    sourceRecordCount: sourceRecords.length,
    liveProofCount: liveProof.length,
    hasTerrainLiveProof: liveProof.length > 0,
    hasSentinel: sourceRecords.some((record) => record.id === "sentinel-2-l2a-earth-search"),
    hasClimate: sourceRecords.some((record) => record.segment === "climate_weather"),
    gapCount: gaps.length,
    gapLabels: gaps
  };
}

function summarizeEcosystem(body) {
  const ecosystemRecords = Array.isArray(body.ecosystemRecords) ? body.ecosystemRecords : [];
  const knowledgeReferences = Array.isArray(body.knowledgeReferences)
    ? body.knowledgeReferences
    : [];
  const gaps = Array.isArray(body.gaps) ? body.gaps : [];

  return {
    schemaVersion: body.schemaVersion ?? null,
    ecosystemRecordCount: ecosystemRecords.length,
    knowledgeReferenceCount: knowledgeReferences.length,
    defaultUiRecordCount: ecosystemRecords.filter((record) =>
      Array.isArray(record.displayModes) ? record.displayModes.includes("default_user_ui") : false
    ).length,
    communityGap: gaps.some((gap) => String(gap).startsWith("community_economy:")),
    gapCount: gaps.length,
    gapLabels: gaps
  };
}

function summarizeIntelBroker(body) {
  const readySources = Array.isArray(body.sourcesReadyForBA) ? body.sourcesReadyForBA : [];
  const ecosystemRecords = Array.isArray(body.ecosystemSourceRecords)
    ? body.ecosystemSourceRecords
    : [];
  const reviewQueue = Array.isArray(body.operatorReviewQueue) ? body.operatorReviewQueue : [];
  const gaps = Array.isArray(body.remainingGapRegister) ? body.remainingGapRegister : [];

  return {
    schemaVersion: body.schemaVersion ?? null,
    packageSource: body.packageSource ?? null,
    runClass: body.runClass ?? null,
    canonicalSourceCount: body.importSummary?.canonicalSourceCount ?? null,
    quarantineCandidateCount: body.importSummary?.quarantineCandidateCount ?? null,
    readySourceCount: readySources.length,
    ecosystemRecordCount: ecosystemRecords.length,
    reviewQueueCount: reviewQueue.length,
    gapCount: gaps.length,
    promotedIntelSourcesForBa: readySources.filter((source) =>
      ["ready_source_ref", "adapter_ready"].includes(source.status)
    ).length
  };
}

async function checkIntelBroker() {
  const overview = await fetchJson(intelBrokerUrl());
  const community = await fetchJson(intelBrokerUrl("community_economy"));
  const terrain = await fetchJson(intelBrokerUrl("terrain_elevation"));

  return {
    configured: true,
    redactedEndpoints: {
      overview: "/api/geospatial-package/intel-broker",
      community: "/api/geospatial-package/intel-broker?segment=community_economy",
      terrain: "/api/geospatial-package/intel-broker?segment=terrain_elevation"
    },
    overview: {
      httpStatus: overview.response.status,
      ...summarizeIntelBroker(overview.body)
    },
    communityEconomy: {
      httpStatus: community.response.status,
      ...summarizeIntelBroker(community.body)
    },
    terrainElevation: {
      httpStatus: terrain.response.status,
      ...summarizeIntelBroker(terrain.body)
    }
  };
}

async function checkGoldenEvalBroker() {
  const catalog = await fetchJson(goldenEvalUrl());
  const activeSite = await fetchJson(
    goldenEvalUrl({
      site: "scotland-rural-burmieston"
    })
  );
  const lebanon = await fetchJson(
    goldenEvalUrl({
      region: "lebanon"
    })
  );

  const catalogSites = Array.isArray(catalog.body.sites) ? catalog.body.sites : [];
  const activeRecords = Array.isArray(activeSite.body.cleanedSourceRecords)
    ? activeSite.body.cleanedSourceRecords
    : [];
  const lebanonSites = Array.isArray(lebanon.body.sites) ? lebanon.body.sites : [];
  const sitePackages = await Promise.all(
    catalogSites.map(async (site) => {
      const sitePackage = await fetchJson(goldenEvalUrl({ site: site.id }));
      const records = Array.isArray(sitePackage.body.cleanedSourceRecords)
        ? sitePackage.body.cleanedSourceRecords
        : [];
      return {
        siteId: site.id,
        httpStatus: sitePackage.response.status,
        oldOutputState: sitePackage.body.site?.oldOutputState ?? null,
        sourceRecordCount: sitePackage.body.baPipe?.sourceRecordCount ?? null,
        candidateReviewCount: sitePackage.body.baPipe?.candidateReviewCount ?? null,
        liveProofRefCount: records.filter((record) => record.runClass === "live-proof").length,
        candidateStatusCounts: records.reduce((counts, record) => {
          if (record.sourceClass !== "intel-candidate-review") return counts;
          counts[record.status] = (counts[record.status] ?? 0) + 1;
          return counts;
        }, {}),
        hasAdvancedOnlyResearch: records.some(
          (record) =>
            record.status === "research_only" && record.displayMode === "advanced_user_view"
        )
      };
    })
  );

  return {
    configured: true,
    redactedEndpoints: {
      catalog: "/api/geospatial-package/ba-golden-evals",
      activeSite: "/api/geospatial-package/ba-golden-evals?site=scotland-rural-burmieston",
      lebanon: "/api/geospatial-package/ba-golden-evals?region=lebanon"
    },
    catalog: {
      httpStatus: catalog.response.status,
      schemaVersion: catalog.body.schemaVersion ?? null,
      activeSiteId: catalog.body.activeSiteId ?? null,
      siteCount: catalogSites.length,
      oldOutputsExhaustedCount: catalogSites.filter(
        (site) => site.oldOutputState === "old_outputs_exhausted"
      ).length,
      focusedSourceSweepCompletedCount: catalogSites.filter(
        (site) => site.sourceSweepState === "focused_source_sweep_completed"
      ).length
    },
    activeSite: {
      httpStatus: activeSite.response.status,
      schemaVersion: activeSite.body.schemaVersion ?? null,
      siteId: activeSite.body.site?.id ?? null,
      oldOutputState: activeSite.body.site?.oldOutputState ?? null,
      sourceRecordCount: activeSite.body.baPipe?.sourceRecordCount ?? null,
      candidateReviewCount: activeSite.body.baPipe?.candidateReviewCount ?? null,
      rawProviderPayloadsStoredByVmesh:
        activeSite.body.baPipe?.rawProviderPayloadsStoredByVmesh ?? null,
      exactCoordinatesStoredByVmesh: activeSite.body.baPipe?.exactCoordinatesStoredByVmesh ?? null,
      liveProofRefCount: activeRecords.filter((record) => record.runClass === "live-proof").length
    },
    sitePackages,
    lebanon: {
      httpStatus: lebanon.response.status,
      siteCount: lebanonSites.length,
      firstSiteId: lebanonSites[0]?.id ?? null
    }
  };
}

async function maybeWriteFullResponse({ sample, kind, text }) {
  if (!sample.retainFullResponse) return null;

  const filePath = path.join(ARTIFACT_DIR, `${sample.id}-${kind}-response.json`);
  await writeFile(filePath, text, "utf8");
  return filePath.replaceAll("\\", "/");
}

async function checkConfiguredSample(sample) {
  const geospatialUrl = endpointUrl("geospatial", sample);
  const ecosystemUrl = endpointUrl("ecosystem", sample);
  const geospatial = await fetchJson(geospatialUrl);
  const ecosystem = await fetchJson(ecosystemUrl);
  const geospatialArtifact = await maybeWriteFullResponse({
    sample,
    kind: "geospatial",
    text: geospatial.text
  });
  const ecosystemArtifact = await maybeWriteFullResponse({
    sample,
    kind: "ecosystem",
    text: ecosystem.text
  });

  return {
    id: sample.id,
    publicSafeLabel: sample.publicSafeLabel,
    coordinateDisclosure: sample.coordinateDisclosure,
    configured: true,
    redactedEndpoints: {
      geospatial: redactedEndpoint("geospatial"),
      ecosystem: redactedEndpoint("ecosystem")
    },
    geospatial: {
      httpStatus: geospatial.response.status,
      ...summarizeGeospatial(geospatial.body)
    },
    ecosystem: {
      httpStatus: ecosystem.response.status,
      ...summarizeEcosystem(ecosystem.body)
    },
    retainedResponseArtifacts: {
      geospatial: geospatialArtifact,
      ecosystem: ecosystemArtifact
    }
  };
}

async function main() {
  await mkdir(ARTIFACT_DIR, { recursive: true });

  const configuredPrivateSamples = privateSamples.filter((sample) => sample.configured);
  const setupGaps = privateSamples.filter((sample) => !sample.configured);
  const samplesToRun = [...configuredPrivateSamples, ...publicSafeSamples];
  const checks = [];

  for (const sample of samplesToRun) {
    checks.push(await checkConfiguredSample(sample));
  }

  const intelBroker = await checkIntelBroker();
  const goldenEvalBroker = await checkGoldenEvalBroker();

  const proof = {
    schemaVersion: "vmesh-ba-golden-site-route-proof-v1",
    generatedAt: new Date().toISOString(),
    runClass: configuredPrivateSamples.length > 0 ? "configured" : "dry-run",
    baseUrl: BASE_URL,
    note: "Exact private golden-site coordinates are never written to this artifact. Full response bodies are retained only for public-safe samples.",
    setupGaps: setupGaps.map((sample) => ({
      id: sample.id,
      publicSafeLabel: sample.publicSafeLabel,
      coordinateDisclosure: sample.coordinateDisclosure,
      missingEnv: sample.missingEnv
    })),
    intelBroker,
    goldenEvalBroker,
    checks
  };

  await writeFile(OUTPUT_PATH, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

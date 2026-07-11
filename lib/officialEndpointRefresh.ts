export type OfficialEndpointType = "stac-api" | "stac-static-catalog";

export interface OfficialEndpointDefinition {
  id: string;
  authority: string;
  authorityClass: "official-government" | "official-intergovernmental" | "official-research";
  jurisdiction: string;
  endpointUrl: string;
  endpointType: OfficialEndpointType;
  dataBuckets: string[];
  authorityEvidenceUrl: string;
  licenseEvidenceUrl: string;
  licensePosture: "verified-open" | "per-collection-review";
}

export interface OfficialEndpointProbe {
  id: string;
  authority: string;
  authorityClass: OfficialEndpointDefinition["authorityClass"];
  jurisdiction: string;
  endpointUrl: string;
  endpointType: OfficialEndpointType;
  dataBuckets: string[];
  authorityEvidenceUrl: string;
  licenseEvidenceUrl: string;
  licensePosture: OfficialEndpointDefinition["licensePosture"];
  capabilityState: "metadata-probed" | "probe-failed";
  httpStatus: number | null;
  mediaType: string | null;
  catalogId: string | null;
  conformsToCount: number;
  linkedCollectionCount: number;
  linkedItemCount: number;
  sampledCollectionIds: string[];
  checkedAt: string;
  error: string | null;
  warnings: string[];
}

export const OFFICIAL_STAC_ENDPOINTS: OfficialEndpointDefinition[] = [
  {
    id: "canada-nrcan-geoca-stac",
    authority: "Natural Resources Canada / Geo.ca",
    authorityClass: "official-government",
    jurisdiction: "Canada",
    endpointUrl: "https://datacube.services.geo.ca/stac/api/",
    endpointType: "stac-api",
    dataBuckets: ["terrain_elevation", "imagery_observation", "water_hydrology"],
    authorityEvidenceUrl: "https://www.nrcan.gc.ca/",
    licenseEvidenceUrl: "https://open.canada.ca/en/open-government-licence-canada",
    licensePosture: "verified-open"
  },
  {
    id: "canada-eccc-geomet-stac",
    authority: "Environment and Climate Change Canada",
    authorityClass: "official-government",
    jurisdiction: "Canada",
    endpointUrl: "https://api.weather.gc.ca/stac/",
    endpointType: "stac-api",
    dataBuckets: ["climate_weather", "water_hydrology"],
    authorityEvidenceUrl: "https://eccc-msc.github.io/open-data/msc-data/readme_en/",
    licenseEvidenceUrl: "https://open.canada.ca/en/open-government-licence-canada",
    licensePosture: "verified-open"
  },
  {
    id: "nasa-cmr-cloud-stac",
    authority: "NASA Earthdata",
    authorityClass: "official-government",
    jurisdiction: "global",
    endpointUrl: "https://cmr.earthdata.nasa.gov/cloudstac/",
    endpointType: "stac-api",
    dataBuckets: ["terrain_elevation", "imagery_observation", "water_hydrology"],
    authorityEvidenceUrl: "https://www.earthdata.nasa.gov/",
    licenseEvidenceUrl:
      "https://www.earthdata.nasa.gov/engage/open-data-services-and-software/data-and-information-policy",
    licensePosture: "per-collection-review"
  },
  {
    id: "eu-copernicus-data-space-stac",
    authority: "Copernicus Data Space Ecosystem",
    authorityClass: "official-intergovernmental",
    jurisdiction: "global",
    endpointUrl: "https://stac.dataspace.copernicus.eu/v1/",
    endpointType: "stac-api",
    dataBuckets: ["terrain_elevation", "imagery_observation", "soils_landcover"],
    authorityEvidenceUrl: "https://dataspace.copernicus.eu/",
    licenseEvidenceUrl: "https://dataspace.copernicus.eu/terms-and-conditions",
    licensePosture: "per-collection-review"
  },
  {
    id: "swiss-federal-stac",
    authority: "Federal Office of Topography swisstopo",
    authorityClass: "official-government",
    jurisdiction: "Switzerland",
    endpointUrl: "https://data.geo.admin.ch/api/stac/v1/",
    endpointType: "stac-api",
    dataBuckets: ["terrain_elevation", "imagery_observation", "soils_landcover"],
    authorityEvidenceUrl: "https://www.swisstopo.admin.ch/",
    licenseEvidenceUrl:
      "https://www.swisstopo.admin.ch/en/terms-of-use-free-geodata-and-geoservices",
    licensePosture: "verified-open"
  },
  {
    id: "australia-dea-stac",
    authority: "Geoscience Australia / Digital Earth Australia",
    authorityClass: "official-government",
    jurisdiction: "Australia",
    endpointUrl: "https://explorer.dea.ga.gov.au/stac/",
    endpointType: "stac-api",
    dataBuckets: ["imagery_observation", "soils_landcover", "water_hydrology"],
    authorityEvidenceUrl: "https://www.dea.ga.gov.au/",
    licenseEvidenceUrl: "https://www.dea.ga.gov.au/about/terms-of-use/",
    licensePosture: "per-collection-review"
  },
  {
    id: "africa-dea-stac",
    authority: "Digital Earth Africa",
    authorityClass: "official-intergovernmental",
    jurisdiction: "Africa",
    endpointUrl: "https://explorer.digitalearth.africa/stac/",
    endpointType: "stac-api",
    dataBuckets: ["imagery_observation", "soils_landcover", "water_hydrology"],
    authorityEvidenceUrl: "https://www.digitalearthafrica.org/",
    licenseEvidenceUrl: "https://docs.digitalearthafrica.org/en/latest/about/License.html",
    licensePosture: "per-collection-review"
  },
  {
    id: "uk-ceda-stac",
    authority: "NERC Centre for Environmental Data Analysis",
    authorityClass: "official-research",
    jurisdiction: "United Kingdom",
    endpointUrl: "https://api.stac.ceda.ac.uk/",
    endpointType: "stac-api",
    dataBuckets: ["terrain_elevation", "imagery_observation", "climate_weather"],
    authorityEvidenceUrl: "https://www.ceda.ac.uk/",
    licenseEvidenceUrl: "https://help.ceda.ac.uk/article/4642-data-licences",
    licensePosture: "per-collection-review"
  },
  {
    id: "us-usgs-3dep-lidar-stac",
    authority: "U.S. Geological Survey",
    authorityClass: "official-government",
    jurisdiction: "United States",
    endpointUrl: "https://s3-us-west-2.amazonaws.com/usgs-lidar-stac/ept/catalog.json",
    endpointType: "stac-static-catalog",
    dataBuckets: ["terrain_elevation"],
    authorityEvidenceUrl: "https://www.usgs.gov/3d-elevation-program",
    licenseEvidenceUrl:
      "https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits",
    licensePosture: "verified-open"
  },
  {
    id: "polar-pgc-open-dems-stac",
    authority: "Polar Geospatial Center",
    authorityClass: "official-research",
    jurisdiction: "polar",
    endpointUrl: "https://pgc-opendata-dems.s3.us-west-2.amazonaws.com/pgc-data-stac.json",
    endpointType: "stac-static-catalog",
    dataBuckets: ["terrain_elevation", "imagery_observation"],
    authorityEvidenceUrl: "https://www.pgc.umn.edu/data/",
    licenseEvidenceUrl:
      "https://www.pgc.umn.edu/guides/stereo-derived-elevation-models/pgc-dem-products-arcticdem-rema-and-earthdem/",
    licensePosture: "per-collection-review"
  }
];

export async function probeOfficialEndpoint(
  definition: OfficialEndpointDefinition,
  options: {
    fetchImpl?: typeof fetch;
    now?: () => Date;
    maxBytes?: number;
    timeoutMs?: number;
  } = {}
): Promise<OfficialEndpointProbe> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxBytes = options.maxBytes ?? 1_000_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);
  const checkedAt = (options.now ?? (() => new Date()))().toISOString();
  try {
    const response = await fetchImpl(definition.endpointUrl, {
      signal: controller.signal,
      headers: { accept: "application/json", "user-agent": "VMesh official metadata verifier" },
      redirect: "follow"
    });
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > maxBytes) throw new Error("metadata-response-too-large");
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > maxBytes) throw new Error("metadata-response-too-large");
    if (!response.ok) throw new Error(`metadata-http-${response.status}`);
    const document = JSON.parse(text) as {
      id?: unknown;
      conformsTo?: unknown;
      links?: unknown;
      collections?: unknown;
    };
    const links = Array.isArray(document.links) ? document.links : [];
    let collections = Array.isArray(document.collections) ? document.collections : [];
    const dataLink = links.find(
      (link): link is { rel: string; href: string } =>
        typeof link === "object" &&
        link !== null &&
        (link as { rel?: unknown }).rel === "data" &&
        typeof (link as { href?: unknown }).href === "string"
    );
    const warnings: string[] = [];
    if (dataLink) {
      try {
        const collectionUrl = new URL(dataLink.href, definition.endpointUrl);
        const endpointUrl = new URL(definition.endpointUrl);
        if (
          collectionUrl.protocol !== "https:" ||
          collectionUrl.hostname !== endpointUrl.hostname
        ) {
          throw new Error("unsafe-collections-link");
        }
        const collectionResponse = await fetchImpl(collectionUrl, {
          signal: controller.signal,
          headers: {
            accept: "application/json",
            "user-agent": "VMesh official metadata verifier"
          },
          redirect: "follow"
        });
        const collectionText = await collectionResponse.text();
        if (Buffer.byteLength(collectionText, "utf8") > maxBytes)
          throw new Error("metadata-response-too-large");
        if (!collectionResponse.ok)
          throw new Error(`collections-http-${collectionResponse.status}`);
        const collectionDocument = JSON.parse(collectionText) as { collections?: unknown };
        collections = Array.isArray(collectionDocument.collections)
          ? collectionDocument.collections
          : [];
      } catch (error) {
        warnings.push(
          `collections-probe:${error instanceof Error ? error.message : "metadata-probe-failed"}`
        );
      }
    }
    const linkedCollections = links.filter(
      (link): link is { rel?: string; title?: string; id?: string } =>
        typeof link === "object" &&
        link !== null &&
        ["child", "collection"].includes(String((link as { rel?: unknown }).rel))
    );
    const sampledCollectionIds = [
      ...collections.map((collection) =>
        typeof collection === "object" && collection !== null
          ? String((collection as { id?: unknown }).id ?? "")
          : ""
      ),
      ...linkedCollections.map((link) => String(link.id ?? link.title ?? ""))
    ]
      .filter(Boolean)
      .slice(0, 20);
    return {
      ...definition,
      capabilityState: "metadata-probed",
      httpStatus: response.status,
      mediaType: response.headers.get("content-type"),
      catalogId: typeof document.id === "string" ? document.id : null,
      conformsToCount: Array.isArray(document.conformsTo) ? document.conformsTo.length : 0,
      linkedCollectionCount: collections.length || linkedCollections.length,
      linkedItemCount: links.filter(
        (link) =>
          typeof link === "object" && link !== null && (link as { rel?: unknown }).rel === "item"
      ).length,
      sampledCollectionIds,
      checkedAt,
      error: null,
      warnings
    };
  } catch (error) {
    return {
      ...definition,
      capabilityState: "probe-failed",
      httpStatus: null,
      mediaType: null,
      catalogId: null,
      conformsToCount: 0,
      linkedCollectionCount: 0,
      linkedItemCount: 0,
      sampledCollectionIds: [],
      checkedAt,
      error: error instanceof Error ? error.message : "metadata-probe-failed",
      warnings: []
    };
  } finally {
    clearTimeout(timer);
  }
}

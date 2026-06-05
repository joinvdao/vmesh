import { describe, expect, it } from "vitest";

import {
  BA_GOLDEN_EVAL_ACTIVE_SITE_ID,
  createBaGoldenEvalSitePackage,
  getBaGoldenEvalCatalog,
  getBaGoldenEvalSitesForRegion
} from "@/lib/geospatialPackage";

describe("BA golden eval source packages", () => {
  it("imports the relevant old BA/Intel output catalog without coordinates", () => {
    const catalog = getBaGoldenEvalCatalog();

    expect(catalog.activeSiteId).toBe(BA_GOLDEN_EVAL_ACTIVE_SITE_ID);
    expect(catalog.sites.map((site) => site.id)).toContain("germany-rural-bavaria-wegele");
    expect(catalog.sites.map((site) => site.id)).toContain("middle-east-lebanon-mount-lebanon");
    expect(catalog.sites.map((site) => site.id)).toContain("usa-urban-san-francisco");
    expect(catalog.sites.map((site) => site.id)).toContain("canada-dryland-kamloops-rose-hill");
    expect(
      catalog.sites.every((site) => site.sourceSweepState === "focused_source_sweep_completed")
    ).toBe(true);
    expect(JSON.stringify(catalog)).not.toContain('"coordinates":');
    expect(JSON.stringify(catalog)).not.toContain("2025 Rose Hill Rd");
    expect(JSON.stringify(catalog)).not.toContain("50.637484");
  });

  it("marks only the first active site as old-output exhausted", () => {
    const catalog = getBaGoldenEvalCatalog();
    const exhaustedSites = catalog.sites.filter(
      (site) => site.oldOutputState === "old_outputs_exhausted"
    );

    expect(exhaustedSites).toHaveLength(1);
    expect(exhaustedSites[0]?.id).toBe("scotland-rural-burmieston");
  });

  it("creates a cleaned BA pipe package for the active Burmieston site", () => {
    const sitePackage = createBaGoldenEvalSitePackage();

    expect(sitePackage.site.id).toBe("scotland-rural-burmieston");
    expect(sitePackage.baPipe.consumer).toBe("ba-gis-worker");
    expect(sitePackage.baPipe.rawProviderPayloadsStoredByVmesh).toBe(false);
    expect(sitePackage.baPipe.exactCoordinatesStoredByVmesh).toBe(false);
    expect(
      sitePackage.cleanedSourceRecords.some((record) => record.runClass === "live-proof")
    ).toBe(true);
    expect(
      sitePackage.cleanedSourceRecords.some(
        (record) => record.sourceClass === "intel-candidate-review"
      )
    ).toBe(true);
    expect(
      sitePackage.cleanedSourceRecords.some(
        (record) =>
          record.id === "intel-candidate:burmieston-sweep-scottish-remote-sensing-portal" &&
          record.retainedRefs.includes("https://remotesensingdata.gov.scot/") &&
          record.limitations.includes("Endpoint type: html_catalog_with_web_services")
      )
    ).toBe(true);
  });

  it("filters catalog sites by requested region", () => {
    expect(getBaGoldenEvalSitesForRegion("usa").map((site) => site.id)).toEqual([
      "usa-vermont-rural-mad-river-valley",
      "usa-colorado-mountain-boulder-canyon",
      "usa-florida-low-relief-coastal",
      "usa-urban-san-francisco"
    ]);
    expect(getBaGoldenEvalSitesForRegion("lebanon").map((site) => site.id)).toEqual([
      "middle-east-lebanon-mount-lebanon"
    ]);
  });

  it("creates a Comrie Croft package with site-specific ecosystem candidates", () => {
    const sitePackage = createBaGoldenEvalSitePackage("scotland-rural-comrie-croft");

    expect(sitePackage.site.id).toBe("scotland-rural-comrie-croft");
    expect(
      sitePackage.cleanedSourceRecords.some(
        (record) =>
          record.id === "intel-candidate:comrie-croft-sweep-perth-kinross-open-data" &&
          record.retainedRefs.includes("https://www.pkc.gov.uk/opendata") &&
          record.limitations.includes("Endpoint type: local_open_data_portal")
      )
    ).toBe(true);
    expect(
      sitePackage.cleanedSourceRecords.some(
        (record) =>
          record.id === "intel-candidate:comrie-croft-sweep-comrie-northwoods-context" &&
          record.status === "research_only" &&
          record.displayMode === "advanced_user_view"
      )
    ).toBe(true);
  });

  it("creates a Tangleha coastal package with protected-area and coastal candidates", () => {
    const sitePackage = createBaGoldenEvalSitePackage(
      "scotland-coastal-tangleha-artists-collective"
    );

    expect(sitePackage.site.id).toBe("scotland-coastal-tangleha-artists-collective");
    expect(
      sitePackage.cleanedSourceRecords.some(
        (record) =>
          record.id === "intel-candidate:tangleha-sweep-sepa-coastal-flood-data" &&
          record.status === "needs_probe" &&
          record.retainedRefs.includes("https://www2.sepa.org.uk/flooddata/")
      )
    ).toBe(true);
    expect(
      sitePackage.cleanedSourceRecords.some(
        (record) =>
          record.id === "intel-candidate:tangleha-sweep-st-cyrus-naturescot-reserve" &&
          record.status === "research_only" &&
          record.displayMode === "advanced_user_view"
      )
    ).toBe(true);
  });

  it("creates an Edinburgh McDonald Place package with adopted-road and urban data candidates", () => {
    const sitePackage = createBaGoldenEvalSitePackage("scotland-urban-edinburgh-mcdonald-place");

    expect(sitePackage.site.id).toBe("scotland-urban-edinburgh-mcdonald-place");
    expect(
      sitePackage.cleanedSourceRecords.some(
        (record) =>
          record.id === "intel-candidate:edinburgh-mcdonald-sweep-adopted-road-record" &&
          record.status === "needs_license_review" &&
          record.retainedRefs.includes(
            "https://www.edinburgh.gov.uk/directory-record/1810438/mcdonald-place"
          )
      )
    ).toBe(true);
    expect(
      sitePackage.cleanedSourceRecords.some(
        (record) =>
          record.id ===
            "intel-candidate:edinburgh-mcdonald-sweep-city-mobility-environment-context" &&
          record.status === "research_only" &&
          record.displayMode === "advanced_user_view"
      )
    ).toBe(true);
  });

  it("creates a Perth PH1 package with PKC open data and road-alignment candidates", () => {
    const sitePackage = createBaGoldenEvalSitePackage(
      "scotland-rural-perth-ph1-road-building-alignment"
    );

    expect(sitePackage.site.id).toBe("scotland-rural-perth-ph1-road-building-alignment");
    expect(
      sitePackage.cleanedSourceRecords.some(
        (record) =>
          record.id === "intel-candidate:perth-ph1-sweep-pkc-arcgis-hub-feed" &&
          record.status === "needs_probe" &&
          record.retainedRefs.includes(
            "https://open-data-perth-kinross.hub.arcgis.com/api/feed/dcat-ap/2.0.1.json"
          )
      )
    ).toBe(true);
    expect(
      sitePackage.cleanedSourceRecords.some(
        (record) =>
          record.id === "intel-candidate:perth-ph1-sweep-scone-surface-water-context" &&
          record.status === "research_only" &&
          record.displayMode === "advanced_user_view"
      )
    ).toBe(true);
  });

  it("creates a Pemberton package with BC lidar and regional ecosystem candidates", () => {
    const sitePackage = createBaGoldenEvalSitePackage("canada-rural-pemberton-bc");

    expect(sitePackage.site.id).toBe("canada-rural-pemberton-bc");
    expect(
      sitePackage.cleanedSourceRecords.some(
        (record) =>
          record.id === "intel-candidate:pemberton-sweep-lidarbc-open-data-index" &&
          record.status === "needs_probe" &&
          record.retainedRefs.includes(
            "https://www.arcgis.com/home/item.html?id=5f6a1f31212a4cb2826743d2e52ef02a"
          )
      )
    ).toBe(true);
    expect(
      sitePackage.cleanedSourceRecords.some(
        (record) =>
          record.id === "intel-candidate:pemberton-sweep-slrd-settlement-area-mapping" &&
          record.status === "research_only" &&
          record.displayMode === "advanced_user_view"
      )
    ).toBe(true);
  });

  it("creates a Kamloops/Rose package with priority BC dryland candidates", () => {
    const sitePackage = createBaGoldenEvalSitePackage("canada-dryland-kamloops-rose-hill");

    expect(sitePackage.site.id).toBe("canada-dryland-kamloops-rose-hill");
    expect(sitePackage.site.coordinateDisclosure).toBe("withheld-public-safe-site-id");
    expect(JSON.stringify(sitePackage)).not.toContain("2025 Rose Hill Rd");
    expect(
      sitePackage.cleanedSourceRecords.some(
        (record) =>
          record.id === "intel-candidate:kamloops-rose-sweep-lidarbc-dsm-index" &&
          record.status === "needs_probe" &&
          record.retainedRefs.includes(
            "https://www.arcgis.com/home/item.html?id=5f6a1f31212a4cb2826743d2e52ef02a&sublayer=1"
          )
      )
    ).toBe(true);
    expect(
      sitePackage.cleanedSourceRecords.some(
        (record) =>
          record.id ===
            "intel-candidate:kamloops-rose-sweep-bcdata-soil-wildfire-watershed-index" &&
          record.status === "research_only" &&
          record.displayMode === "advanced_user_view"
      )
    ).toBe(true);
  });

  it("creates an Alberta package with retained terrain proof and provincial candidates", () => {
    const sitePackage = createBaGoldenEvalSitePackage("canada-rural-alberta-parkland");

    expect(sitePackage.site.id).toBe("canada-rural-alberta-parkland");
    expect(
      sitePackage.cleanedSourceRecords.some(
        (record) =>
          record.sourceClass === "ba-retained-live-proof" &&
          record.segments.includes("terrain_elevation") &&
          record.runClass === "live-proof"
      )
    ).toBe(true);
    expect(
      sitePackage.cleanedSourceRecords.some(
        (record) =>
          record.id === "intel-candidate:alberta-golden-sweep-soil-information" &&
          record.status === "needs_probe" &&
          record.retainedRefs.includes("https://www.alberta.ca/about-soil-in-alberta")
      )
    ).toBe(true);
    expect(
      sitePackage.cleanedSourceRecords.some(
        (record) =>
          record.id === "intel-candidate:alberta-golden-sweep-acims-data" &&
          record.status === "needs_license_review"
      )
    ).toBe(true);
  });

  it("creates a Bavaria package with official terrain and ecosystem candidates", () => {
    const sitePackage = createBaGoldenEvalSitePackage("germany-rural-bavaria-wegele");

    expect(sitePackage.site.id).toBe("germany-rural-bavaria-wegele");
    expect(
      sitePackage.cleanedSourceRecords.some(
        (record) =>
          record.id === "intel-candidate:bavaria-sweep-dgm1-open-data" &&
          record.status === "needs_probe" &&
          record.retainedRefs.includes(
            "https://geodaten.bayern.de/opengeodata/OpenDataDetail.html?pn=dgm1"
          )
      )
    ).toBe(true);
    expect(
      sitePackage.cleanedSourceRecords.some(
        (record) =>
          record.id === "intel-candidate:bavaria-sweep-fis-natur-fin-web" &&
          record.status === "needs_license_review"
      )
    ).toBe(true);
  });

  it("creates a Vermont Mad River package with VCGI and ANR candidates", () => {
    const sitePackage = createBaGoldenEvalSitePackage("usa-vermont-rural-mad-river-valley");

    expect(sitePackage.site.id).toBe("usa-vermont-rural-mad-river-valley");
    expect(
      sitePackage.cleanedSourceRecords.some(
        (record) =>
          record.id === "intel-candidate:vermont-mad-river-sweep-anr-river-program-mapserver" &&
          record.status === "needs_probe" &&
          record.retainedRefs.includes(
            "https://anrmaps.vermont.gov/arcgis/rest/services/map_services/MAP_ANR_ANRATLASRIVERSPROGRAM_WM_NOCACHE/MapServer"
          )
      )
    ).toBe(true);
    expect(
      sitePackage.cleanedSourceRecords.some(
        (record) =>
          record.id === "intel-candidate:vermont-mad-river-sweep-mad-river-stormwater-context" &&
          record.status === "research_only" &&
          record.displayMode === "advanced_user_view"
      )
    ).toBe(true);
  });

  it("creates a Boulder Canyon package with Boulder County and USGS candidates", () => {
    const sitePackage = createBaGoldenEvalSitePackage("usa-colorado-mountain-boulder-canyon");

    expect(sitePackage.site.id).toBe("usa-colorado-mountain-boulder-canyon");
    expect(
      sitePackage.cleanedSourceRecords.some(
        (record) =>
          record.id === "intel-candidate:colorado-boulder-sweep-boulder-county-gis-downloads" &&
          record.status === "needs_probe" &&
          record.retainedRefs.includes("https://bouldercounty.gov/government/open-data/maps/")
      )
    ).toBe(true);
  });

  it("creates a Florida coastal package with FDEM and DEP candidates", () => {
    const sitePackage = createBaGoldenEvalSitePackage("usa-florida-low-relief-coastal");

    expect(sitePackage.site.id).toBe("usa-florida-low-relief-coastal");
    expect(
      sitePackage.cleanedSourceRecords.some(
        (record) =>
          record.id === "intel-candidate:florida-coastal-sweep-fdem-lidar" &&
          record.status === "needs_probe" &&
          record.retainedRefs.includes(
            "https://www.floridadisaster.org/dem/dem/ITM/geographic-information-systems/lidar/"
          )
      )
    ).toBe(true);
  });

  it("creates a San Francisco package with city, bay, and topobathy candidates", () => {
    const sitePackage = createBaGoldenEvalSitePackage("usa-urban-san-francisco");

    expect(sitePackage.site.id).toBe("usa-urban-san-francisco");
    expect(
      sitePackage.cleanedSourceRecords.some(
        (record) =>
          record.id === "intel-candidate:san-francisco-sweep-usgs-tbdem" &&
          record.status === "needs_probe" &&
          record.retainedRefs.includes(
            "https://www.usgs.gov/special-topics/coastal-national-elevation-database-applications-project/science/topobathymetric-0"
          )
      )
    ).toBe(true);
    expect(
      sitePackage.cleanedSourceRecords.some(
        (record) =>
          record.id === "intel-candidate:san-francisco-sweep-sfgov-open-data" &&
          record.status === "research_only" &&
          record.displayMode === "advanced_user_view"
      )
    ).toBe(true);
  });

  it("creates a Mount Lebanon package with national and global source candidates", () => {
    const sitePackage = createBaGoldenEvalSitePackage("middle-east-lebanon-mount-lebanon");

    expect(sitePackage.site.id).toBe("middle-east-lebanon-mount-lebanon");
    expect(
      sitePackage.cleanedSourceRecords.some(
        (record) =>
          record.id === "intel-candidate:lebanon-mount-sweep-cnrs-remote-sensing" &&
          record.status === "needs_license_review" &&
          record.retainedRefs.includes(
            "https://www.cnrs.edu.lb/english/about-cnrs/centers/national-center-for-remote-sensing"
          )
      )
    ).toBe(true);
    expect(
      sitePackage.cleanedSourceRecords.some(
        (record) =>
          record.id === "intel-candidate:lebanon-mount-sweep-earth-search-sentinel" &&
          record.status === "needs_probe" &&
          record.retainedRefs.includes("https://earth-search.aws.element84.com/v1")
      )
    ).toBe(true);
  });
});

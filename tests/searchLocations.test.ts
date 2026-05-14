import { describe, expect, it } from "vitest";

import { buildCellFromCoordinate } from "@/lib/h3Mesh";
import {
  buildNominatimSearchUrl,
  buildLocationSearchApiUrl,
  dedupeSearchLocations,
  getOfflineLocation,
  getOfflineLocationExamples,
  getOfflineLocationSuggestions,
  isRemoteGeocodingEnabled,
  normalizeNominatimResults,
  parseCoordinateQuery
} from "@/lib/searchLocations";

describe("typed search coordinates", () => {
  it("supports typed latitude longitude inputs through H3-compatible coordinates", () => {
    const londonCell = buildCellFromCoordinate(51.5072, -0.1276, "U5");

    expect(londonCell).toBeTypeOf("string");
    expect(londonCell.length).toBeGreaterThan(0);
  });

  it("parses decimal and directional coordinates for Google-Earth-style fly-to", () => {
    expect(parseCoordinateQuery("38.7223, -9.1393")).toMatchObject({
      latitude: 38.7223,
      longitude: -9.1393,
      zoom: 15.7,
      source: "coordinate"
    });
    expect(parseCoordinateQuery("38.7223 N, 9.1393 W")).toMatchObject({
      latitude: 38.7223,
      longitude: -9.1393
    });
    expect(parseCoordinateQuery("21.507755,12.128906,2")).toMatchObject({
      latitude: 21.507755,
      longitude: 12.128906,
      zoom: 2
    });
  });

  it("keeps known offline places available without remote geocoding", () => {
    expect(getOfflineLocation("Lisbon")).toMatchObject({
      label: "Lisbon, Portugal",
      zoom: 13.8,
      source: "offline"
    });
    expect(getOfflineLocationSuggestions("lon")[0]).toMatchObject({
      label: "London, United Kingdom"
    });
  });

  it("keeps global remote autocomplete enabled unless a deployment disables it", () => {
    expect(isRemoteGeocodingEnabled(undefined)).toBe(true);
    expect(isRemoteGeocodingEnabled("")).toBe(true);
    expect(isRemoteGeocodingEnabled("false")).toBe(false);
    expect(isRemoteGeocodingEnabled("true")).toBe(true);
    expect(getOfflineLocationExamples()).toContain("Lisbon");
  });

  it("normalizes remote geocoder results into fly-to suggestions without live calls", () => {
    const [suggestion] = normalizeNominatimResults([
      {
        display_name: "Paris, Ile-de-France, France",
        lat: "48.8535",
        lon: "2.3484",
        class: "place",
        type: "city"
      }
    ]);

    expect(buildNominatimSearchUrl("Paris", 4)).toContain("limit=4");
    expect(buildLocationSearchApiUrl("Paris", 4)).toBe("/api/geocode/search?q=Paris&limit=4");
    expect(suggestion).toMatchObject({
      label: "Paris, Ile-de-France, France",
      latitude: 48.8535,
      longitude: 2.3484,
      source: "remote"
    });

    const [postcode] = normalizeNominatimResults([
      {
        display_name: "PH1 3TH, Perth and Kinross, Scotland, United Kingdom",
        lat: "56.4515",
        lon: "-3.60733",
        class: "place",
        type: "postcode"
      }
    ]);
    expect(postcode?.zoom).toBeGreaterThanOrEqual(15);

    const [address] = normalizeNominatimResults([
      {
        display_name:
          "10 Downing Street, 10, Downing Street, Westminster, London, SW1A 2AA, United Kingdom",
        lat: "51.5034878",
        lon: "-0.1276965",
        type: "government"
      }
    ]);
    expect(address?.zoom).toBeGreaterThanOrEqual(16);
  });

  it("deduplicates autocomplete candidates by nearby coordinate and label", () => {
    const [first] = dedupeSearchLocations([
      {
        label: "Paris, France",
        latitude: 48.8535,
        longitude: 2.3484,
        zoom: 10.8,
        source: "remote"
      },
      {
        label: "Paris, Ile-de-France",
        latitude: 48.85349,
        longitude: 2.34839,
        zoom: 10.8,
        source: "remote"
      }
    ]);

    expect(first?.label).toBe("Paris, France");
  });
});

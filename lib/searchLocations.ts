export interface SearchLocationResult {
  latitude: number;
  longitude: number;
  zoom: number;
  label: string;
  source: "coordinate" | "offline" | "remote";
  category?: string;
}

export interface NominatimLocationResult {
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
  addresstype?: string;
  importance?: number;
  place_rank?: number;
}

interface OfflineLocation {
  name: string;
  aliases: string[];
  label: string;
  latitude: number;
  longitude: number;
  zoom: number;
  category: string;
}

const offlineLocations = [
  {
    name: "lisbon",
    aliases: ["lisboa", "portugal"],
    label: "Lisbon, Portugal",
    latitude: 38.7223,
    longitude: -9.1393,
    zoom: 13.8,
    category: "Built-in city"
  },
  {
    name: "london",
    aliases: ["united kingdom", "uk", "england"],
    label: "London, United Kingdom",
    latitude: 51.5072,
    longitude: -0.1276,
    zoom: 13.8,
    category: "Built-in city"
  },
  {
    name: "porto",
    aliases: ["oporto", "portugal"],
    label: "Porto, Portugal",
    latitude: 41.1579,
    longitude: -8.6291,
    zoom: 13.8,
    category: "Built-in city"
  },
  {
    name: "madrid",
    aliases: ["spain", "espana"],
    label: "Madrid, Spain",
    latitude: 40.4168,
    longitude: -3.7038,
    zoom: 13.8,
    category: "Built-in city"
  },
  {
    name: "barcelona",
    aliases: ["catalonia", "spain"],
    label: "Barcelona, Spain",
    latitude: 41.3874,
    longitude: 2.1686,
    zoom: 13.8,
    category: "Built-in city"
  },
  {
    name: "new york",
    aliases: ["nyc", "manhattan"],
    label: "New York, United States",
    latitude: 40.7128,
    longitude: -74.006,
    zoom: 13.6,
    category: "Built-in city"
  },
  {
    name: "tokyo",
    aliases: ["japan"],
    label: "Tokyo, Japan",
    latitude: 35.6762,
    longitude: 139.6503,
    zoom: 13.6,
    category: "Built-in city"
  },
  {
    name: "nairobi",
    aliases: ["kenya"],
    label: "Nairobi, Kenya",
    latitude: -1.2864,
    longitude: 36.8172,
    zoom: 13.6,
    category: "Built-in city"
  },
  {
    name: "sydney",
    aliases: ["australia"],
    label: "Sydney, Australia",
    latitude: -33.8688,
    longitude: 151.2093,
    zoom: 13.6,
    category: "Built-in city"
  },
  {
    name: "cape town",
    aliases: ["south africa"],
    label: "Cape Town, South Africa",
    latitude: -33.9249,
    longitude: 18.4241,
    zoom: 13.6,
    category: "Built-in city"
  }
] satisfies OfflineLocation[];

export function isRemoteGeocodingEnabled(value = process.env.NEXT_PUBLIC_ENABLE_REMOTE_GEOCODING) {
  return value !== "false";
}

export function getOfflineLocationExamples(): string {
  return offlineLocations.map((location) => location.label.split(",")[0]).join(", ");
}

function normalizeDirectionalCoordinate(rawValue: string, maxAbs: number): number | null {
  const trimmed = rawValue.trim().toUpperCase();
  const match = trimmed.match(/^([NSWE+-]?)\s*(\d+(?:\.\d+)?)\s*([NSWE]?)$/);
  if (!match) return null;

  const prefix = match[1];
  const value = Number(match[2]);
  const suffix = match[3];
  if (!Number.isFinite(value) || value > maxAbs) return null;

  const direction =
    suffix || (prefix === "N" || prefix === "S" || prefix === "W" || prefix === "E" ? prefix : "");
  const sign = prefix === "-" || direction === "S" || direction === "W" ? -1 : 1;
  return value * sign;
}

function normalizeCoordinateZoom(rawValue: string | undefined): number {
  if (!rawValue) return 15.7;
  const zoom = Number(rawValue.trim());
  if (!Number.isFinite(zoom)) return 15.7;
  return Math.min(16.4, Math.max(2, zoom));
}

export function parseCoordinateQuery(query: string): SearchLocationResult | null {
  const normalized = query
    .replace(/[\u00b0\u00ba]/g, " ")
    .replace(/\b(deg|degrees|lat|latitude|lon|lng|long|longitude)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const parts = normalized.includes(",")
    ? normalized.split(",")
    : normalized.split(/\s+(?=[NSWE+-]?\d)/i);
  if (parts.length < 2 || parts.length > 3) return null;

  const latitude = normalizeDirectionalCoordinate(parts[0], 90);
  const longitude = normalizeDirectionalCoordinate(parts[1], 180);
  if (latitude === null || longitude === null) return null;

  return {
    latitude,
    longitude,
    zoom: normalizeCoordinateZoom(parts[2]),
    label: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
    source: "coordinate",
    category: "Coordinate"
  };
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function offlineLocationToResult(location: OfflineLocation): SearchLocationResult {
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    zoom: location.zoom,
    label: location.label,
    source: "offline",
    category: location.category
  };
}

function offlineLocationScore(location: OfflineLocation, normalizedQuery: string): number {
  const haystack = [location.name, location.label.toLowerCase(), ...location.aliases];
  if (haystack.some((value) => value === normalizedQuery)) return 0;
  if (haystack.some((value) => value.startsWith(normalizedQuery))) return 1;
  if (haystack.some((value) => value.includes(normalizedQuery))) return 2;
  return Number.POSITIVE_INFINITY;
}

export function getOfflineLocationSuggestions(query: string, limit = 6): SearchLocationResult[] {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];
  const coordinate = parseCoordinateQuery(normalized);
  if (coordinate) return [coordinate];

  return offlineLocations
    .map((location) => ({ location, score: offlineLocationScore(location, normalized) }))
    .filter(({ score }) => Number.isFinite(score))
    .sort(
      (left, right) =>
        left.score - right.score || left.location.name.localeCompare(right.location.name)
    )
    .slice(0, limit)
    .map(({ location }) => offlineLocationToResult(location));
}

export function getOfflineLocation(query: string): SearchLocationResult | null {
  return getOfflineLocationSuggestions(query, 1)[0] ?? null;
}

function looksLikeStreetAddress(displayName: string): boolean {
  const hasStreetTerm =
    /\b(street|st|road|rd|lane|ln|avenue|ave|drive|dr|way|place|court|square|terrace|close|mews|crescent|boulevard|route|highway)\b/i.test(
      displayName
    );
  const hasHouseNumber = /(^|,\s*|\s)\d{1,6}[a-z]?(?=\s|,|$)/i.test(displayName);
  const hasUkPostcode = /\b[a-z]{1,2}\d[a-z\d]?\s*\d[a-z]{2}\b/i.test(displayName);
  return (hasStreetTerm && hasHouseNumber) || hasUkPostcode;
}

function zoomForRemoteResult(result: NominatimLocationResult): number {
  const resultType = result.type ?? "";
  const resultClass = result.class ?? "";
  const addressType = result.addresstype ?? "";

  if (resultType === "postcode" || addressType === "postcode") return 15.3;
  if (looksLikeStreetAddress(result.display_name)) return 16.2;
  if (["house", "building", "yes", "residential", "apartments"].includes(resultType)) return 16.1;
  if (["house", "building", "amenity", "shop", "office", "tourism"].includes(addressType)) {
    return 16;
  }
  if (["road", "street", "residential", "pedestrian", "service"].includes(resultType)) return 15.2;
  if (["amenity", "shop", "tourism", "leisure", "office"].includes(resultClass)) return 15.6;
  if (result.class === "place" && ["city", "town"].includes(result.type ?? "")) return 13.8;
  if (
    result.class === "place" &&
    ["village", "suburb", "neighbourhood"].includes(result.type ?? "")
  ) {
    return 14.2;
  }
  if (addressType === "city" || addressType === "town") return 13.8;
  if (["village", "suburb", "neighbourhood"].includes(addressType)) return 14.2;
  if (result.class === "boundary" && result.type === "administrative") return 6.8;
  if (result.type === "country") return 4.2;
  return 13.8;
}

export function buildNominatimSearchUrl(query: string, limit = 6): string {
  const params = new URLSearchParams({
    q: query.trim(),
    format: "jsonv2",
    addressdetails: "1",
    limit: String(limit)
  });

  return `https://nominatim.openstreetmap.org/search?${params}`;
}

export function buildLocationSearchApiUrl(query: string, limit = 6): string {
  const params = new URLSearchParams({
    q: query.trim(),
    limit: String(limit)
  });

  return `/api/geocode/search?${params}`;
}

export function normalizeNominatimResults(
  results: NominatimLocationResult[]
): SearchLocationResult[] {
  const locations: SearchLocationResult[] = [];

  for (const result of results) {
    const latitude = Number(result.lat);
    const longitude = Number(result.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    locations.push({
      latitude,
      longitude,
      zoom: zoomForRemoteResult(result),
      label: result.display_name,
      source: "remote",
      category: [result.class, result.type].filter(Boolean).join(" / ") || "Remote geocoder"
    });
  }

  return locations;
}

export function dedupeSearchLocations(
  locations: SearchLocationResult[],
  limit = 6
): SearchLocationResult[] {
  const seen = new Set<string>();
  const deduped: SearchLocationResult[] = [];

  for (const location of locations) {
    const key = `${location.latitude.toFixed(3)}:${location.longitude.toFixed(3)}:${location.label
      .split(",")[0]
      .toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(location);
    if (deduped.length >= limit) break;
  }

  return deduped;
}

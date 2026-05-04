"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Bell, ChevronDown, CircleHelp, Filter, Globe2, Search, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { useVmeshStore } from "@/store/useVmeshStore";

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
}

const offlineLocations = [
  { name: "lisbon", label: "Lisbon, Portugal", latitude: 38.7223, longitude: -9.1393, zoom: 9 },
  {
    name: "london",
    label: "London, United Kingdom",
    latitude: 51.5072,
    longitude: -0.1276,
    zoom: 9
  },
  { name: "porto", label: "Porto, Portugal", latitude: 41.1579, longitude: -8.6291, zoom: 9 },
  { name: "madrid", label: "Madrid, Spain", latitude: 40.4168, longitude: -3.7038, zoom: 9 },
  { name: "barcelona", label: "Barcelona, Spain", latitude: 41.3874, longitude: 2.1686, zoom: 9 }
];

function parseCoordinateQuery(query: string) {
  const match = query.match(/^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!match) return null;

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
    zoom: 8,
    label: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
  };
}

function getOfflineLocation(query: string) {
  const normalized = query.trim().toLowerCase();
  const coordinate = parseCoordinateQuery(normalized);
  if (coordinate) return coordinate;

  const place = offlineLocations.find((location) => normalized.includes(location.name));
  return place
    ? {
        latitude: place.latitude,
        longitude: place.longitude,
        zoom: place.zoom,
        label: place.label
      }
    : null;
}

export function AppHeader() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchState, setSearchState] = useState<"idle" | "error" | "found">("idle");
  const flyToLocation = useVmeshStore((state) => state.flyToLocation);
  const setMapStatus = useVmeshStore((state) => state.setMapStatus);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const formQuery = String(formData.get("location-search") ?? "");
    const trimmedQuery = (query || formQuery).trim();
    if (!trimmedQuery) return;

    setIsSearching(true);
    setSearchState("idle");

    try {
      const offlineLocation = getOfflineLocation(trimmedQuery);
      if (offlineLocation) {
        flyToLocation(offlineLocation);
        setMapStatus({
          map: "active",
          message: `Flying to ${offlineLocation.label}`
        });
        setSearchState("found");
        return;
      }

      const params = new URLSearchParams({
        q: trimmedQuery,
        format: "jsonv2",
        limit: "1"
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
      if (!response.ok) throw new Error("Location search failed");

      const [result] = (await response.json()) as NominatimResult[];
      if (!result) throw new Error("Location not found");

      const latitude = Number(result.lat);
      const longitude = Number(result.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error("Location returned invalid coordinates");
      }

      flyToLocation({
        latitude,
        longitude,
        zoom: result.class === "place" && result.type === "city" ? 9 : 5.8,
        label: result.display_name
      });
      setMapStatus({
        map: "active",
        message: `Flying to ${result.display_name.split(",")[0]}`
      });
      setSearchState("found");
    } catch (error) {
      setSearchState("error");
      setMapStatus({
        map: "fallback",
        message: error instanceof Error ? error.message : "Location search failed"
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <header className="absolute left-20 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-[#dfe8e6] bg-white/88 px-5 shadow-[0_2px_18px_rgba(31,53,58,0.04)] backdrop-blur">
      <form
        onSubmit={handleSubmit}
        className={`flex w-[min(520px,calc(100vw-460px))] min-w-[320px] items-center gap-2 rounded-[8px] border bg-white px-3 shadow-sm ${
          searchState === "error"
            ? "border-[#d99575]"
            : searchState === "found"
              ? "border-[#7acbc0]"
              : "border-[#dfe8e6]"
        }`}
      >
        <Search className="h-4 w-4 text-[#6d7b87]" />
        <Input
          name="location-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-9 border-0 px-0 shadow-none focus:border-0 focus:ring-0"
          placeholder={isSearching ? "Searching..." : "Search place or coordinates"}
        />
        <button
          type="submit"
          className="rounded-[4px] bg-[#f2f6f5] px-1.5 py-0.5 font-mono text-[10px] text-[#7b8893] transition hover:bg-[#e6f2ef] hover:text-[#0f766e]"
        >
          {isSearching ? "..." : "/"}
        </button>
      </form>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" className="h-10 px-4">
          <Globe2 className="h-4 w-4" />
          Global
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="sm" className="h-10 px-4">
          <Filter className="h-4 w-4" />
          Filters
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
        <div className="ml-4 flex items-center gap-1 border-l border-[#e6eeec] pl-4">
          <Tooltip label="Notifications">
            <Button variant="ghost" size="icon">
              <Bell className="h-4 w-4" />
            </Button>
          </Tooltip>
          <Tooltip label="Help">
            <Button variant="ghost" size="icon">
              <CircleHelp className="h-4 w-4" />
            </Button>
          </Tooltip>
          <Tooltip label="Settings">
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
        <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#dfe8e6] bg-[#f6faf9] text-xs font-semibold text-[#52616f]">
          AM
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#54b7a7]" />
        </div>
      </div>
    </header>
  );
}

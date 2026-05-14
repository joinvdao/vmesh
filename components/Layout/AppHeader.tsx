"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import {
  Bell,
  ChevronDown,
  CircleHelp,
  Filter,
  Globe2,
  Moon,
  Search,
  Settings,
  SunMedium
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import {
  buildNominatimSearchUrl,
  dedupeSearchLocations,
  getOfflineLocation,
  getOfflineLocationExamples,
  getOfflineLocationSuggestions,
  isRemoteGeocodingEnabled,
  normalizeNominatimResults
} from "@/lib/searchLocations";
import type { NominatimLocationResult, SearchLocationResult } from "@/lib/searchLocations";
import { useVmeshStore } from "@/store/useVmeshStore";

export function AppHeader() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchState, setSearchState] = useState<"idle" | "error" | "found">("idle");
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [remoteResult, setRemoteResult] = useState<{
    query: string;
    suggestions: SearchLocationResult[];
  }>({ query: "", suggestions: [] });
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const autocompleteAbortRef = useRef<AbortController | null>(null);
  const suppressedAutocompleteQueryRef = useRef<string | null>(null);
  const globeTheme = useVmeshStore((state) => state.globeTheme);
  const flyToLocation = useVmeshStore((state) => state.flyToLocation);
  const setMapStatus = useVmeshStore((state) => state.setMapStatus);
  const toggleGlobeTheme = useVmeshStore((state) => state.toggleGlobeTheme);
  const trimmedQuery = query.trim();
  const offlineSuggestions = useMemo(
    () => getOfflineLocationSuggestions(trimmedQuery, 6),
    [trimmedQuery]
  );
  const suggestions = useMemo(
    () =>
      dedupeSearchLocations(
        [
          ...offlineSuggestions,
          ...(remoteResult.query === trimmedQuery ? remoteResult.suggestions : [])
        ],
        6
      ),
    [offlineSuggestions, remoteResult.query, remoteResult.suggestions, trimmedQuery]
  );
  const isAutocompleteLoading =
    trimmedQuery.length >= 3 &&
    isRemoteGeocodingEnabled() &&
    offlineSuggestions[0]?.source !== "coordinate" &&
    remoteResult.query !== trimmedQuery;

  const applyLocation = (location: SearchLocationResult) => {
    autocompleteAbortRef.current?.abort();
    suppressedAutocompleteQueryRef.current = location.label;
    flyToLocation(location);
    setQuery(location.label);
    setRemoteResult({ query: location.label, suggestions: [] });
    setIsSuggestionOpen(false);
    setSearchState("found");
    setSearchMessage(null);
    setMapStatus({
      map: "active",
      message: `Flying to ${location.label.split(",")[0]}`
    });
  };

  const fetchRemoteSuggestions = useCallback(
    async (trimmedQuery: string, signal?: AbortSignal): Promise<SearchLocationResult[]> => {
      if (!isRemoteGeocodingEnabled() || trimmedQuery.length < 3) return [];

      const response = await fetch(buildNominatimSearchUrl(trimmedQuery, 6), { signal });
      if (!response.ok) throw new Error("Location search failed");

      const results = (await response.json()) as NominatimLocationResult[];
      return normalizeNominatimResults(results);
    },
    []
  );

  useEffect(() => {
    autocompleteAbortRef.current?.abort();
    if (!trimmedQuery) return;
    if (suppressedAutocompleteQueryRef.current === trimmedQuery) return;

    if (
      !isRemoteGeocodingEnabled() ||
      trimmedQuery.length < 3 ||
      offlineSuggestions[0]?.source === "coordinate"
    ) {
      return;
    }

    const controller = new AbortController();
    autocompleteAbortRef.current = controller;

    const timer = window.setTimeout(() => {
      fetchRemoteSuggestions(trimmedQuery, controller.signal)
        .then((remoteSuggestions) => {
          if (controller.signal.aborted) return;
          setRemoteResult({ query: trimmedQuery, suggestions: remoteSuggestions });
          setIsSuggestionOpen(true);
          setActiveSuggestionIndex(0);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          if (error instanceof DOMException && error.name === "AbortError") return;
        });
    }, 260);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [fetchRemoteSuggestions, offlineSuggestions, trimmedQuery]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const formQuery = String(formData.get("location-search") ?? "");
    const trimmedQuery = (query || formQuery).trim();
    if (!trimmedQuery) return;

    setIsSearching(true);
    setSearchState("idle");
    setSearchMessage(null);

    try {
      const activeSuggestion = isSuggestionOpen ? suggestions[activeSuggestionIndex] : null;
      const offlineLocation = getOfflineLocation(trimmedQuery);
      const selectedLocation = activeSuggestion ?? offlineLocation;

      if (selectedLocation) {
        applyLocation(selectedLocation);
        return;
      }

      if (!isRemoteGeocodingEnabled()) {
        throw new Error(
          `Remote geocoding is disabled. Use coordinates or known places: ${getOfflineLocationExamples()}.`
        );
      }

      const [remoteLocation] = await fetchRemoteSuggestions(trimmedQuery);
      if (!remoteLocation) throw new Error("Location not found");
      applyLocation(remoteLocation);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Location search failed";
      setSearchState("error");
      setSearchMessage(message);
      setMapStatus({
        map: "fallback",
        message
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isSuggestionOpen || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((index) => (index + 1) % suggestions.length);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((index) => (index - 1 + suggestions.length) % suggestions.length);
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const suggestion = suggestions[activeSuggestionIndex];
      if (suggestion) applyLocation(suggestion);
    }

    if (event.key === "Escape") {
      setIsSuggestionOpen(false);
    }
  };

  return (
    <header className="absolute left-20 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-[#B6D9D1] bg-white/[0.88] px-5 shadow-[0_2px_18px_rgba(31,53,58,0.04)] backdrop-blur">
      <div className="relative">
        <form
          onSubmit={handleSubmit}
          className={`flex w-[min(520px,calc(100vw-460px))] min-w-[320px] items-center gap-2 rounded-[8px] border bg-white px-3 shadow-sm ${
            searchState === "error"
              ? "border-[#d99575]"
              : searchState === "found"
                ? "border-[#36DFAE]"
                : "border-[#B6D9D1]"
          }`}
        >
          <Search className="h-4 w-4 text-[#6d7b87]" />
          <Input
            name="location-search"
            value={query}
            onChange={(event) => {
              suppressedAutocompleteQueryRef.current = null;
              setQuery(event.target.value);
              setIsSuggestionOpen(true);
              setActiveSuggestionIndex(0);
            }}
            onFocus={() => {
              if (suggestions.length > 0) setIsSuggestionOpen(true);
            }}
            onKeyDown={handleInputKeyDown}
            className="h-9 border-0 px-0 shadow-none focus:border-0 focus:ring-0"
            placeholder={isSearching ? "Searching..." : "Search place or coordinates"}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isSuggestionOpen}
            aria-controls="location-search-suggestions"
          />
          <button
            type="submit"
            className="rounded-[4px] bg-[#F3FBF8] px-1.5 py-0.5 font-mono text-[10px] text-[#6F8589] transition hover:bg-[#e6f2ef] hover:text-[#2DBA91]"
          >
            {isSearching || isAutocompleteLoading ? "..." : "/"}
          </button>
        </form>
        {isSuggestionOpen && suggestions.length > 0 ? (
          <div
            id="location-search-suggestions"
            role="listbox"
            className="absolute left-0 top-12 z-50 w-[min(520px,calc(100vw-460px))] min-w-[320px] overflow-hidden rounded-[10px] border border-[#B6D9D1] bg-white shadow-[0_18px_42px_rgba(31,53,58,0.16)]"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.latitude}:${suggestion.longitude}:${suggestion.label}`}
                type="button"
                role="option"
                aria-selected={index === activeSuggestionIndex}
                onMouseDown={(event) => {
                  event.preventDefault();
                  applyLocation(suggestion);
                }}
                className={`grid w-full grid-cols-[1fr_auto] gap-3 px-3 py-2.5 text-left transition ${
                  index === activeSuggestionIndex ? "bg-[#E7F8F2]" : "bg-white hover:bg-[#f4faf8]"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[#2D545B]">
                    {suggestion.label.split(",")[0]}
                  </span>
                  <span className="block truncate text-[11px] text-[#6F8589]">
                    {suggestion.label}
                  </span>
                </span>
                <span className="self-center rounded-full bg-[#F3FBF8] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6F8589]">
                  {suggestion.source === "remote" ? "OSM" : suggestion.category}
                </span>
              </button>
            ))}
          </div>
        ) : null}
        {searchMessage ? (
          <div className="absolute left-0 top-12 z-50 max-w-[520px] rounded-[8px] border border-[#efd5c7] bg-white px-3 py-2 text-[11px] leading-4 text-[#8a5a1d] shadow-[0_12px_28px_rgba(31,53,58,0.12)]">
            {searchMessage}
          </div>
        ) : null}
      </div>

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
        <div className="ml-4 flex items-center gap-1 border-l border-[#D7EAE5] pl-4">
          <Tooltip label={globeTheme === "dark" ? "Switch to light globe" : "Switch to dark globe"}>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleGlobeTheme}
              aria-label={globeTheme === "dark" ? "Switch to light globe" : "Switch to dark globe"}
            >
              {globeTheme === "dark" ? (
                <SunMedium className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </Tooltip>
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
        <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#B6D9D1] bg-[#f6faf9] text-xs font-semibold text-[#5F777C]">
          AM
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#36DFAE]" />
        </div>
      </div>
    </header>
  );
}

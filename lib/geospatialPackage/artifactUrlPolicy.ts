import { containsSecretLikeValue } from "@/lib/geospatialPackage/plannerUtils";

export interface TrustedArtifactUrlValidation {
  ok: boolean;
  url: string | null;
  reason: string;
  host: string | null;
}

export interface TrustedArtifactUrlOptions {
  allowedHosts: string[];
}

const LOCAL_HOSTNAMES = new Set(["localhost", "localhost.localdomain"]);

export function parseArtifactHostAllowlist(value: string | undefined): string[] {
  return Array.from(
    new Set(
      (value ?? "")
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function isIpv4Address(hostname: string): boolean {
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname);
}

function ipv4Octets(hostname: string): number[] | null {
  if (!isIpv4Address(hostname)) return null;
  const octets = hostname.split(".").map(Number);
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return null;
  }
  return octets;
}

function isBlockedIpv4(hostname: string): boolean {
  const octets = ipv4Octets(hostname);
  if (!octets) return false;
  const [first, second] = octets;

  return (
    first === 10 ||
    first === 127 ||
    first === 0 ||
    first >= 224 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    LOCAL_HOSTNAMES.has(normalized) ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized === "::1" ||
    normalized === "[::1]" ||
    isBlockedIpv4(normalized)
  );
}

function hostMatchesAllowlist(hostname: string, allowedHosts: string[]): boolean {
  const normalized = hostname.toLowerCase();
  return allowedHosts.some((entry) => {
    if (entry.startsWith("*.")) {
      const suffix = entry.slice(1);
      return normalized.endsWith(suffix) && normalized.length > suffix.length;
    }
    return normalized === entry;
  });
}

export function validateTrustedHttpsArtifactUrl(
  value: string | undefined,
  options: TrustedArtifactUrlOptions
): TrustedArtifactUrlValidation {
  if (!value?.trim()) {
    return {
      ok: false,
      url: null,
      reason: "Artifact URL is missing.",
      host: null
    };
  }
  if (containsSecretLikeValue(value)) {
    return {
      ok: false,
      url: null,
      reason: "Artifact URL contains credentials or secret-like query parameters.",
      host: null
    };
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return {
      ok: false,
      url: null,
      reason: "Artifact URL is not parseable.",
      host: null
    };
  }

  if (url.protocol !== "https:") {
    return {
      ok: false,
      url: null,
      reason: "Artifact URL must use https.",
      host: url.hostname || null
    };
  }
  if (url.username || url.password) {
    return {
      ok: false,
      url: null,
      reason: "Artifact URL must not include embedded credentials.",
      host: url.hostname || null
    };
  }
  if (isBlockedHostname(url.hostname)) {
    return {
      ok: false,
      url: null,
      reason: "Artifact URL host is local, private, link-local, or otherwise blocked.",
      host: url.hostname || null
    };
  }
  if (options.allowedHosts.length === 0) {
    return {
      ok: false,
      url: null,
      reason: "No trusted artifact host allowlist is configured.",
      host: url.hostname || null
    };
  }
  if (!hostMatchesAllowlist(url.hostname, options.allowedHosts)) {
    return {
      ok: false,
      url: null,
      reason: "Artifact URL host is not in the trusted allowlist.",
      host: url.hostname || null
    };
  }

  return {
    ok: true,
    url: url.toString(),
    reason: "Artifact URL passed trusted host policy.",
    host: url.hostname
  };
}

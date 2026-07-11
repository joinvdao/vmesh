import { describe, expect, it } from "vitest";

import {
  resolveSourceRegistryClientConfig,
  resolveSourceRegistryDatabaseUrl
} from "@/lib/sourceRegistryConnection";

describe("source registry database connection", () => {
  it("prefers an explicitly injected database URL", () => {
    expect(resolveSourceRegistryDatabaseUrl({ POSTGRES_URL: "postgresql://configured" })).toBe(
      "postgresql://configured"
    );
  });

  it("deterministically builds the session-pooler URL from retained Supabase config", () => {
    const url = resolveSourceRegistryDatabaseUrl({
      SIMPLELOOP_SUPABASE_DB_PASSWORD: "secret:/word",
      SIMPLELOOP_SUPABASE_PROJECT_REF: "abcdefghijklmnopqrst",
      SIMPLELOOP_SUPABASE_REGION: "eu-central-1"
    });

    expect(url).toBe(
      [
        "postgresql://postgres.abcdefghijklmnopqrst:secret%3A%2Fword",
        "aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
      ].join("@")
    );
  });

  it("requires an explicit CA for Supabase pooler connections", async () => {
    const poolerUrl = [
      "postgresql://postgres.example:secret",
      "aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
    ].join("@");
    await expect(resolveSourceRegistryClientConfig(poolerUrl)).rejects.toThrow(
      "SUPABASE_DB_CA_CERT"
    );
  });

  it("keeps verified CA configuration authoritative", async () => {
    const poolerUrl = [
      "postgresql://postgres.example:secret",
      "aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require"
    ].join("@");
    const config = await resolveSourceRegistryClientConfig(poolerUrl, {
      SUPABASE_DB_CA_CERT: "certificate"
    });

    expect(config.connectionString).not.toContain("sslmode");
    expect(config.ssl).toEqual({ ca: "certificate", rejectUnauthorized: true });
  });

  it("fails closed when the deterministic inputs are incomplete", () => {
    expect(
      resolveSourceRegistryDatabaseUrl({ SIMPLELOOP_SUPABASE_PROJECT_REF: "missing" })
    ).toBeNull();
  });
});

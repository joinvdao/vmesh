import { readFile } from "node:fs/promises";

export function resolveSourceRegistryDatabaseUrl(
  env: Record<string, string | undefined> = process.env
): string | null {
  const configured = env.SUPABASE_DB_URL ?? env.POSTGRES_URL ?? env.DATABASE_URL;
  if (configured?.trim()) return configured.trim();

  const password = env.SIMPLELOOP_SUPABASE_DB_PASSWORD?.trim();
  const projectRef = (env.SUPABASE_PROJECT_REF ?? env.SIMPLELOOP_SUPABASE_PROJECT_REF)?.trim();
  const region = env.SIMPLELOOP_SUPABASE_REGION?.trim();
  if (!password || !projectRef || !region) return null;
  if (!/^[a-z]{20}$/.test(projectRef)) throw new Error("Invalid Supabase project reference.");
  if (!/^[a-z0-9-]+$/.test(region)) throw new Error("Invalid Supabase region.");

  const username = encodeURIComponent(`postgres.${projectRef}`);
  const encodedPassword = encodeURIComponent(password);
  const host = `aws-0-${region}.pooler.supabase.com`;
  return `postgresql://${username}:${encodedPassword}@${host}:5432/postgres`;
}

export async function resolveSourceRegistryClientConfig(
  databaseUrl: string,
  env: Record<string, string | undefined> = process.env
): Promise<{ connectionString: string; ssl: true | { ca: string; rejectUnauthorized: true } }> {
  const parsed = new URL(databaseUrl);
  const requiresSupabaseCa = parsed.hostname.endsWith(".pooler.supabase.com");
  const inlineCa = env.SUPABASE_DB_CA_CERT?.trim();
  const caPath = env.SUPABASE_DB_CA_CERT_PATH?.trim();
  const ca = inlineCa || (caPath ? (await readFile(caPath, "utf8")).trim() : "");

  if (requiresSupabaseCa && !ca) {
    throw new Error(
      "Supabase pooler TLS requires SUPABASE_DB_CA_CERT or SUPABASE_DB_CA_CERT_PATH. " +
        "Download the project CA from Supabase Database Settings; certificate verification is never disabled."
    );
  }

  // node-postgres lets sslmode query parameters replace the explicit TLS object.
  for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) {
    parsed.searchParams.delete(key);
  }
  return {
    connectionString: parsed.toString(),
    ssl: ca ? { ca, rejectUnauthorized: true } : true
  };
}

#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const DEFAULT_API_URL = "https://us.infisical.com";
const DEFAULT_ENV = "dev";
const DEFAULT_PROJECT_SLUG = "simpleloop";
const DEFAULT_PATHS = ["/projects/_shared/providers/mapbox"];
const DEFAULT_COMMAND = ["npm", "run", "dev"];
const DEFAULT_MAPBOX_PROXY_URL = "/api/mapbox/satellite/{z}/{x}/{y}";
const DEFAULT_MAPBOX_BASEMAP_PROVIDER = "mapbox-satellite-basemap";
const DEFAULT_MAPBOX_IMAGERY_PROVIDER = "mapbox-satellite-global";

function parseArgs(argv) {
  const separatorIndex = argv.indexOf("--");
  const optionArgs = separatorIndex === -1 ? argv : argv.slice(0, separatorIndex);
  const command = separatorIndex === -1 ? DEFAULT_COMMAND : argv.slice(separatorIndex + 1);
  const options = {
    apiUrl: process.env.INFISICAL_API_URL || process.env.INFISICAL_SITE_URL || DEFAULT_API_URL,
    env: process.env.INFISICAL_ENV || DEFAULT_ENV,
    projectSlug: process.env.INFISICAL_PROJECT_SLUG || DEFAULT_PROJECT_SLUG,
    projectId: process.env.INFISICAL_PROJECT_ID || "",
    paths: [],
    recursive: false
  };

  for (let index = 0; index < optionArgs.length; index += 1) {
    const arg = optionArgs[index];
    if (arg === "--api-url") {
      options.apiUrl = requireValue(optionArgs, index, arg);
      index += 1;
    } else if (arg === "--env") {
      options.env = requireValue(optionArgs, index, arg);
      index += 1;
    } else if (arg === "--project") {
      options.projectSlug = requireValue(optionArgs, index, arg);
      index += 1;
    } else if (arg === "--project-id") {
      options.projectId = requireValue(optionArgs, index, arg);
      index += 1;
    } else if (arg === "--path") {
      options.paths.push(requireValue(optionArgs, index, arg));
      index += 1;
    } else if (arg === "--recursive") {
      options.recursive = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (command.length === 0) {
    throw new Error("No command supplied after --.");
  }

  options.apiUrl = options.apiUrl.replace(/\/+$/, "");
  options.paths = options.paths.length > 0 ? options.paths : DEFAULT_PATHS;
  return { options, command };
}

function requireValue(argv, index, arg) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${arg} requires a value.`);
  }
  return value;
}

function printHelp() {
  console.log(`Usage:
  node scripts/run-with-infisical.mjs -- npm run dev
  node scripts/run-with-infisical.mjs --path /projects/_shared/providers/mapbox -- npm run dev

Environment:
  INFISICAL_CLIENT_ID      Machine-identity Universal Auth client id.
  INFISICAL_CLIENT_SECRET  Machine-identity Universal Auth client secret.
  INFISICAL_TOKEN          Legacy service-token fallback.
  INFISICAL_PROJECT_ID     Optional direct project id.
  INFISICAL_PROJECT_SLUG   Defaults to simpleloop.
  INFISICAL_ENV            Defaults to dev.
  INFISICAL_API_URL        Defaults to https://us.infisical.com.

This script prints key names only. It never prints secret values.`);
}

async function main() {
  const { options, command } = parseArgs(process.argv.slice(2));
  const auth = await resolveInfisicalAuth(options.apiUrl);
  if (!auth.ok) throw new Error(auth.message);

  const client = createInfisicalClient({
    apiUrl: options.apiUrl,
    tokenCandidates: auth.tokenCandidates
  });
  const projectId = options.projectId || (await resolveProjectId(client, options.projectSlug));
  const loaded = await loadSecrets(client, {
    projectId,
    env: options.env,
    paths: options.paths,
    recursive: options.recursive
  });

  const env = {
    ...process.env,
    ...loaded.env
  };
  applyMapboxProxyDefaults(env);

  const summary = {
    runClass: "configured",
    project: options.projectSlug,
    environment: options.env,
    paths: options.paths,
    loadedKeys: Object.keys(loaded.env).sort(),
    defaultedKeys: loadedDefaultKeys(env, loaded.env)
  };
  console.log(
    `[infisical] ${summary.runClass}: project=${summary.project} env=${summary.environment} paths=${summary.paths.join(
      ", "
    )}`
  );
  console.log(
    `[infisical] loaded keys: ${summary.loadedKeys.length ? summary.loadedKeys.join(", ") : "(none)"}`
  );
  if (summary.defaultedKeys.length) {
    console.log(`[infisical] local defaults: ${summary.defaultedKeys.join(", ")}`);
  }

  const resolvedCommand = resolveCommand(command);
  const child = spawn(resolvedCommand.executable, resolvedCommand.args, {
    env,
    stdio: "inherit",
    shell: false
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
}

function resolveCommand(command) {
  const [executable, ...args] = command;
  if (process.platform !== "win32" || (executable !== "npm" && executable !== "npx")) {
    return { executable, args };
  }

  const cliName = executable === "npm" ? "npm-cli.js" : "npx-cli.js";
  const inheritedNpmCli = process.env.npm_execpath;
  const defaultCliPath = path.join(
    path.dirname(process.execPath),
    "node_modules",
    "npm",
    "bin",
    cliName
  );
  const cliPath =
    inheritedNpmCli && path.basename(inheritedNpmCli).toLowerCase() === cliName
      ? inheritedNpmCli
      : defaultCliPath;

  if (!existsSync(cliPath)) {
    throw new Error(`Could not resolve ${executable} CLI at ${cliPath}.`);
  }

  return { executable: process.execPath, args: [cliPath, ...args] };
}

async function resolveInfisicalAuth(apiUrl) {
  const clientId = process.env.INFISICAL_CLIENT_ID?.trim();
  const clientSecret = process.env.INFISICAL_CLIENT_SECRET?.trim();
  if (clientId || clientSecret) {
    if (!clientId || !clientSecret) {
      return {
        ok: false,
        message:
          "Machine-identity auth requires both INFISICAL_CLIENT_ID and INFISICAL_CLIENT_SECRET."
      };
    }
    const response = await fetch(`${apiUrl}/api/v1/auth/universal-auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, clientSecret })
    });
    const parsed = await parseResponse(response);
    if (!parsed.ok) {
      return {
        ok: false,
        message: `Machine-identity login failed: HTTP ${parsed.status} ${sanitizeErrorText(
          parsed.message
        )}`
      };
    }
    const accessToken = parsed.body.accessToken ?? parsed.body.token;
    if (!accessToken) {
      return {
        ok: false,
        message: "Machine-identity login succeeded but no access token was returned."
      };
    }
    return { ok: true, tokenCandidates: [accessToken] };
  }

  const token = process.env.INFISICAL_TOKEN?.trim();
  if (token) {
    return { ok: true, tokenCandidates: tokenCandidates(token) };
  }

  return {
    ok: false,
    message: "Set INFISICAL_CLIENT_ID and INFISICAL_CLIENT_SECRET, or set INFISICAL_TOKEN."
  };
}

function createInfisicalClient({ apiUrl, tokenCandidates: candidateTokens }) {
  let activeToken = "";

  async function requestJson(pathname, requestOptions = {}) {
    const errors = [];
    for (const token of activeToken ? [activeToken] : candidateTokens) {
      const response = await fetch(`${apiUrl}${pathname}`, {
        ...requestOptions,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(requestOptions.headers ?? {})
        }
      });
      const parsed = await parseResponse(response);
      if (response.status !== 401) {
        activeToken = token;
        return parsed;
      }
      errors.push(parsed);
    }
    return errors[0] ?? { ok: false, status: 401, message: "Unauthorized" };
  }

  return {
    async listProjects() {
      const response = await requestJson("/api/v1/projects", { method: "GET" });
      if (!response.ok) return response;
      const rows = response.body.projects ?? response.body.workspaces ?? [];
      return {
        ok: true,
        projects: rows.map((project) => ({
          id: project.id ?? project._id,
          name: project.name ?? project.projectName,
          slug: project.slug
        }))
      };
    },
    async listSecrets({ projectId, env, secretPath, recursive }) {
      const params = new URLSearchParams({
        workspaceId: projectId,
        environment: env,
        secretPath,
        viewSecretValue: "true",
        recursive: recursive ? "true" : "false"
      });
      return requestJson(`/api/v3/secrets/raw?${params.toString()}`, { method: "GET" });
    }
  };
}

async function resolveProjectId(client, projectSlug) {
  const response = await client.listProjects();
  if (!response.ok) {
    throw new Error(
      `Could not list Infisical projects. Set INFISICAL_PROJECT_ID directly if this identity is path-scoped. HTTP ${
        response.status
      } ${sanitizeErrorText(response.message)}`
    );
  }
  const project = response.projects.find(
    (candidate) => candidate.slug === projectSlug || candidate.name === projectSlug
  );
  if (!project?.id) {
    throw new Error(`Infisical project "${projectSlug}" is not visible to this identity.`);
  }
  return project.id;
}

async function loadSecrets(client, { projectId, env, paths, recursive }) {
  const values = {};
  for (const secretPath of paths) {
    const response = await client.listSecrets({ projectId, env, secretPath, recursive });
    if (!response.ok) {
      throw new Error(
        `Could not load Infisical path ${secretPath}. HTTP ${response.status} ${sanitizeErrorText(
          response.message
        )}`
      );
    }
    for (const secret of response.body.secrets ?? []) {
      if (!secret.secretKey) continue;
      const value = secret.secretValue;
      if (value === undefined || value === null || value === "") continue;
      values[secret.secretKey] = String(value);
    }
  }
  return { env: values };
}

function applyMapboxProxyDefaults(env) {
  if (!env.MAPBOX_TOKEN) return;
  env.NEXT_PUBLIC_MAPBOX_PROXY_ENABLED ||= "true";
  env.NEXT_PUBLIC_MAPBOX_PROXY_URL ||= DEFAULT_MAPBOX_PROXY_URL;
  env.NEXT_PUBLIC_BASEMAP_PROVIDER ||= DEFAULT_MAPBOX_BASEMAP_PROVIDER;
  env.NEXT_PUBLIC_IMAGERY_PROVIDER ||= DEFAULT_MAPBOX_IMAGERY_PROVIDER;
}

function loadedDefaultKeys(env, loadedEnv) {
  const keys = [];
  if (env.MAPBOX_TOKEN && !loadedEnv.NEXT_PUBLIC_MAPBOX_PROXY_ENABLED) {
    keys.push("NEXT_PUBLIC_MAPBOX_PROXY_ENABLED");
  }
  if (env.MAPBOX_TOKEN && !loadedEnv.NEXT_PUBLIC_MAPBOX_PROXY_URL) {
    keys.push("NEXT_PUBLIC_MAPBOX_PROXY_URL");
  }
  if (env.MAPBOX_TOKEN && !loadedEnv.NEXT_PUBLIC_BASEMAP_PROVIDER) {
    keys.push("NEXT_PUBLIC_BASEMAP_PROVIDER");
  }
  if (env.MAPBOX_TOKEN && !loadedEnv.NEXT_PUBLIC_IMAGERY_PROVIDER) {
    keys.push("NEXT_PUBLIC_IMAGERY_PROVIDER");
  }
  return keys;
}

async function parseResponse(response) {
  const text = await response.text();
  let body = {};
  if (text.trim()) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text.slice(0, 300) };
    }
  }
  const message =
    body.message ??
    body.error ??
    body.errorMessage ??
    body.error_description ??
    response.statusText;
  return {
    ok: response.ok,
    status: response.status,
    message: String(message),
    body
  };
}

function tokenCandidates(rawToken) {
  const candidates = [];
  if (rawToken.startsWith("st.")) {
    const parts = rawToken.split(".");
    if (parts.length > 3) candidates.push(parts.slice(0, -1).join("."));
  }
  candidates.push(rawToken);
  return [...new Set(candidates)];
}

function sanitizeErrorText(input) {
  return String(input)
    .replace(/st\.[A-Za-z0-9_.-]+/g, "[infisical-token-redacted]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[jwt-redacted]")
    .replace(/Bearer\s+[A-Za-z0-9_.-]+/gi, "Bearer [redacted]")
    .slice(0, 300);
}

main().catch((error) => {
  console.error(`[infisical] ${sanitizeErrorText(error.message)}`);
  process.exit(1);
});

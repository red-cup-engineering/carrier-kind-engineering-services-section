import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { operationsManifoldScriptCatalog } from "./package-surface.mts";

type PackageJson = Readonly<{
  name?: unknown;
  description?: unknown;
  scripts?: unknown;
  exports?: unknown;
}>;

type SiteAdminConfig = Readonly<{
  endpoints?: unknown;
}>;

export type SiteEndpoint = Readonly<{
  name: string;
  publicUrl: string;
  localUrl: string | null;
  port: number | null;
  access: string | null;
  operations: readonly SiteOperationProbe[];
}>;

export type SiteOperationProbe = Readonly<{
  path: string;
  method: "GET" | "POST";
  body: unknown;
  timeoutMs: number;
}>;

export type SitePackageReading = Readonly<{
  kind: "operations-manifold.site-package";
  package: string;
  description: string;
  path: string;
  scripts: readonly string[];
  exports: readonly string[];
  endpoints: readonly SiteEndpoint[];
}>;

export type SiteAdministrationReading = Readonly<{
  kind: "operations-manifold.site-administration";
  focus: string | null;
  packages: readonly SitePackageReading[];
}>;

export type SiteOperationsReading = Readonly<{
  kind: "operations-manifold.read-site-operations";
  focus: string | null;
  operations: readonly (Readonly<{
    endpoint: string;
    url: string;
    status: "witness";
    body: unknown;
  }> | Readonly<{
    endpoint: string;
    url: string;
    status: "obstruction";
    reason: string;
  }>)[];
}>;

export async function siteAdministration(repoRoot: string, params: Readonly<{ focus?: string | undefined }> = {}): Promise<SiteAdministrationReading> {
  const focus = cleanFocus(params.focus);
  const packages = sitePackages(repoRoot)
    .filter((pkg) => focus === null || matchesSiteFocus(pkg, focus))
    .sort((left, right) => left.package.localeCompare(right.package));
  return Object.freeze({ kind: "operations-manifold.site-administration" as const, focus, packages: Object.freeze(packages) });
}

export async function siteOperations(repoRoot: string, params: Readonly<{ focus?: string | undefined }> = {}): Promise<SiteOperationsReading> {
  const administration = await siteAdministration(repoRoot, params);
  const targets = administration.packages.flatMap((pkg) => pkg.endpoints.flatMap((endpoint) =>
    endpoint.operations.map((operation) => ({
      endpoint: endpoint.name,
      url: `${endpoint.localUrl ?? endpoint.publicUrl}${operation.path}`,
      method: operation.method,
      body: operation.body,
      timeoutMs: operation.timeoutMs,
    }))
  ));
  const operations = await Promise.all(targets.map((target) => readOperation(repoRoot, target)));
  return Object.freeze({
    kind: "operations-manifold.read-site-operations" as const,
    focus: administration.focus,
    operations: Object.freeze(operations),
  });
}

function sitePackages(repoRoot: string): readonly SitePackageReading[] {
  const sitesRoot = path.join(repoRoot, "sites");
  if (!existsSync(sitesRoot)) return Object.freeze([]);
  return Object.freeze(readdirSync(sitesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry): SitePackageReading[] => {
      const packagePath = path.join(sitesRoot, entry.name, "package.json");
      if (!existsSync(packagePath)) return [];
      const manifest = readManifest(packagePath);
      const configPath = path.join(sitesRoot, entry.name, "site-admin.config.json");
      if (!existsSync(configPath)) return [];
      const config = readSiteAdminConfig(configPath);
      const endpoints = siteEndpoints(config.endpoints);
      if (endpoints.length === 0) return [];
      return [Object.freeze({
        kind: "operations-manifold.site-package" as const,
        package: stringOr(manifest.name, entry.name),
        description: stringOr(manifest.description, ""),
        path: path.relative(repoRoot, path.dirname(packagePath)),
        scripts: stringKeys(manifest.scripts),
        exports: exportNames(manifest.exports),
        endpoints,
      })];
    }));
}

function siteEndpoints(input: unknown): readonly SiteEndpoint[] {
  if (Array.isArray(input)) {
    return Object.freeze(input.flatMap((entry): SiteEndpoint[] => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
      const record = entry as Record<string, unknown>;
      const name = typeof record["domain"] === "string" ? record["domain"] : null;
      return name === null ? [] : [siteEndpoint(name, record)];
    }));
  }
  if (!input || typeof input !== "object") return Object.freeze([]);
  return Object.freeze(Object.entries(input as Record<string, unknown>)
    .map(([name, raw]) => {
      const record = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
      return siteEndpoint(name, record);
    }));
}

function siteEndpoint(name: string, record: Readonly<Record<string, unknown>>): SiteEndpoint {
  const port = integerOrNull(record["port"]);
  const localUrl = port === null ? null : `http://127.0.0.1:${port}`;
  const configuredOperations = operationProbes(record["operations"]);
  const operations = configuredOperations.length > 0
    ? configuredOperations
    : name.startsWith("newsroom.")
      ? Object.freeze([operationProbe("/publication-game.json")])
      : Object.freeze([]);
  return Object.freeze({
    name,
    publicUrl: `https://${name}/`,
    localUrl,
    port,
    access: typeof record["access"] === "string" ? record["access"] : null,
    operations,
  });
}

function matchesSiteFocus(pkg: SitePackageReading, focus: string): boolean {
  const candidates = siteFocusCandidates(focus);
  return candidates.has(pkg.package)
    || candidates.has(pkg.path)
    || candidates.has(path.basename(pkg.path))
    || pkg.endpoints.some((endpoint) => candidates.has(endpoint.name));
}

function siteFocusCandidates(focus: string): ReadonlySet<string> {
  const trimmed = focus.trim();
  const withoutProtocol = trimmed.replace(/^https?:\/\//u, "");
  const withoutQuery = withoutProtocol.split(/[?#]/u, 1)[0] ?? withoutProtocol;
  const withoutTrailingSlash = withoutQuery.replace(/\/+$/u, "");
  const withoutDotSlash = withoutTrailingSlash.replace(/^\.\//u, "");
  return new Set([
    trimmed,
    withoutProtocol,
    withoutQuery,
    withoutTrailingSlash,
    withoutDotSlash,
    path.normalize(withoutDotSlash),
  ].filter((item) => item !== ""));
}

async function readOperation(repoRoot: string, target: Readonly<{ endpoint: string; url: string; method: "GET" | "POST"; body: unknown; timeoutMs: number }>): Promise<SiteOperationsReading["operations"][number]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), target.timeoutMs);
  try {
    const response = await fetch(target.url, {
      method: target.method,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(target.method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      ...(target.method === "POST" ? { body: JSON.stringify(target.body ?? {}) } : {}),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return Object.freeze({
      endpoint: target.endpoint,
      url: target.url,
      status: "witness" as const,
      body: await response.json(),
    });
  } catch (error) {
    const local = await localOperationWitness(repoRoot, target);
    if (local !== null) return local;
    return Object.freeze({
      endpoint: target.endpoint,
      url: target.url,
      status: "obstruction" as const,
      reason: error instanceof Error ? error.message : String(error),
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function localOperationWitness(repoRoot: string, target: Readonly<{ endpoint: string; url: string; method: "GET" | "POST" }>): Promise<SiteOperationsReading["operations"][number] | null> {
  if (target.endpoint !== "ops.561.group") return null;
  let url: URL;
  try {
    url = new URL(target.url);
  } catch {
    return null;
  }
  if (url.hostname !== "127.0.0.1" || url.port !== "18805") return null;
  const pathname = url.pathname.replace(/\/+$/u, "") || "/";
  const body = pathname === "/health"
    ? await localOperationsManifoldHealth(repoRoot)
    : await localPackageScriptEndpoint(repoRoot, pathname);
  if (body === null) return null;
  return Object.freeze({
    endpoint: target.endpoint,
    url: target.url,
    status: "witness" as const,
    body,
  });
}

async function localOperationsManifoldHealth(repoRoot: string): Promise<Readonly<Record<string, unknown>>> {
  const catalog = operationsManifoldScriptCatalog(repoRoot);
  return Object.freeze({
    status: "ok",
    title: "561 Group Operations Manifold operation surface",
    scripts: Object.freeze(catalog.scripts.map((script) => script.name).sort()),
    witness: "local-package-script-surface",
  });
}

async function localPackageScriptEndpoint(repoRoot: string, pathname: string): Promise<Readonly<Record<string, unknown>> | null> {
  const catalog = operationsManifoldScriptCatalog(repoRoot);
  const name = pathname.replace(/^\/+/u, "");
  if (name === "") return null;
  const script = catalog.scripts.find((item) => item.name === name);
  if (script === undefined) return null;
  return Object.freeze({
    kind: "web.node-binary.endpoint",
    name,
    href: script.href,
    method: script.method,
    protocol: script.protocol,
    witness: "local-package-script-surface",
  });
}

function readManifest(packagePath: string): PackageJson {
  return JSON.parse(readFileSync(packagePath, "utf8")) as PackageJson;
}

function readSiteAdminConfig(configPath: string): SiteAdminConfig {
  return JSON.parse(readFileSync(configPath, "utf8")) as SiteAdminConfig;
}

function stringKeys(input: unknown): readonly string[] {
  if (!input || typeof input !== "object" || Array.isArray(input)) return Object.freeze([]);
  return Object.freeze(Object.keys(input).sort());
}

function stringArray(input: unknown): readonly string[] {
  if (!Array.isArray(input)) return Object.freeze([]);
  return Object.freeze(input.filter((item): item is string => typeof item === "string" && item.trim() !== "").map((item) => item.trim()));
}

function operationProbes(input: unknown): readonly SiteOperationProbe[] {
  if (!Array.isArray(input)) return Object.freeze([]);
  return Object.freeze(input.flatMap((item): SiteOperationProbe[] => {
    if (typeof item === "string" && item.trim() !== "") return [operationProbe(item.trim())];
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    const path = typeof record["path"] === "string" && record["path"].trim() !== "" ? record["path"].trim() : null;
    if (path === null) return [];
    const method = record["method"] === "POST" ? "POST" : "GET";
    return [operationProbe(path, method, record["body"], integerOrNull(record["timeoutMs"]) ?? undefined)];
  }));
}

function operationProbe(pathname: string, method: "GET" | "POST" = "GET", body: unknown = null, timeoutMs = 5000): SiteOperationProbe {
  return Object.freeze({
    path: pathname.startsWith("/") ? pathname : `/${pathname}`,
    method,
    body,
    timeoutMs,
  });
}

function exportNames(input: unknown): readonly string[] {
  if (typeof input === "string") return Object.freeze(["."]);
  return stringKeys(input);
}

function stringOr(input: unknown, fallback: string): string {
  return typeof input === "string" ? input : fallback;
}

function integerOrNull(input: unknown): number | null {
  return Number.isInteger(input) ? input as number : null;
}

function cleanFocus(input: string | undefined): string | null {
  const focus = input?.trim();
  return focus === undefined || focus === "" ? null : focus;
}

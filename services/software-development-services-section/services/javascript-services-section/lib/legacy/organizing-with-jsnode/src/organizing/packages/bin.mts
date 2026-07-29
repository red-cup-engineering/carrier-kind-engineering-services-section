/**
 * @emsenn/organizing-with-jsnode/package-bin — Node package binaries as computing
 * strategy boundaries.
 *
 * A package binary is admitted from `package.json#bin`: the package manifest
 * supplies the public executable surface, and this module projects each command
 * onto relational utterances. HTTP, OpenAPI, and HTML are downstream transports;
 * they must import these carriers instead of inventing a second bin ontology.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { UtteranceCarrier } from "@emsenn/relating";
import { EAVT_JSONL } from "@emsenn/relating/writing";
import { jsNodeFact, jsNodeObservation, type Observation } from "../facts.mjs";

export type JSNodePackageBinAction = string;

export const PACKAGE_BIN_COMPUTING_ACTION = "stdio-eavt" satisfies JSNodePackageBinAction;
export const PACKAGE_BIN_DEFAULT_INPUT = EAVT_JSONL;
export const PACKAGE_BIN_DEFAULT_OUTPUT = EAVT_JSONL;

export type PackageBinManifest = string | Readonly<Record<string, string>>;
export type PackageBinProtocol = JSNodePackageBinAction;
export type PackageBinMediaType = string;
export type PackageBinJsonSchema = Readonly<Record<string, unknown>>;
export type PackageScriptCatalogPathLike = string | URL;

export interface PackageScriptCatalogPackageManifest {
  readonly name: string;
  readonly bin?: Readonly<Record<string, string>>;
  readonly "x-jsnode-bin"?: Readonly<Record<string, PackageBinMetadata>>;
  readonly "x-jsnode-bin-transport"?: PackageBinTransport;
  readonly [key: string]: unknown;
}

export interface PackageBinMetadata {
  readonly summary?: string;
  readonly description?: string;
  readonly inputSchema?: PackageBinJsonSchema;
  readonly outputSchema?: PackageBinJsonSchema;
  readonly annotations?: PackageBinToolAnnotations;
}

export type PackageBinToolAnnotations = Readonly<{
  readOnlyHint?: boolean;
  openWorldHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  title?: string;
}>;

export interface PackageBinTransport {
  readonly protocol: PackageBinProtocol;
  readonly input: PackageBinMediaType;
  readonly output: PackageBinMediaType;
}

export interface PackageBinCarrier {
  readonly kind: "organizing-with-jsnode.package-bin";
  readonly term: string;
  readonly strategyTerm: string;
  readonly sessionTerm: string;
  readonly packageName: string;
  readonly name: string;
  readonly target: string;
  readonly executable: string;
  readonly summary?: string;
  readonly description?: string;
  readonly inputSchema?: PackageBinJsonSchema;
  readonly outputSchema?: PackageBinJsonSchema;
  readonly annotations?: PackageBinToolAnnotations;
  readonly action: JSNodePackageBinAction;
  readonly protocol: PackageBinProtocol;
  readonly input: PackageBinMediaType;
  readonly output: PackageBinMediaType;
  readonly utterances: readonly UtteranceCarrier[];
  readonly observation: Observation;
}

export interface PackageBin {
  readonly carrier: PackageBinCarrier;
}

export interface PackageBinFact {
  readonly subject: unknown;
  readonly predicate: string;
  readonly object: unknown;
}

export interface PackageBinEndpoint {
  readonly name: string;
  readonly href: string;
  readonly method: "POST";
  readonly input: PackageBinMediaType;
  readonly output: PackageBinMediaType;
  readonly argsQuery: "arg";
  readonly target: string;
  readonly executable: string;
  readonly summary?: string;
  readonly description?: string;
  readonly inputSchema?: PackageBinJsonSchema;
  readonly outputSchema?: PackageBinJsonSchema;
  readonly annotations?: PackageBinToolAnnotations;
  readonly protocol: PackageBinCarrier["protocol"];
  readonly carrier: Pick<PackageBinCarrier, "kind" | "term" | "strategyTerm" | "sessionTerm" | "packageName" | "name" | "action" | "protocol"> & {
    readonly facts: readonly PackageBinFact[];
  };
}

export interface PackageBinDiscovery {
  readonly kind: "organizing-with-jsnode.package-bin.discovery";
  readonly package: string;
  readonly protocol: PackageBinProtocol;
  readonly mediaTypes: Readonly<{ input: PackageBinMediaType; output: PackageBinMediaType }>;
  readonly utterances: readonly UtteranceCarrier[];
  readonly observation: Observation;
  readonly bins: readonly PackageBinEndpoint[];
}

export interface PackageScript {
  readonly kind: "organizing-with-jsnode.package-script";
  readonly name: string;
  readonly href: string;
  readonly method: "POST";
  readonly input: PackageBinMediaType;
  readonly output: PackageBinMediaType;
  readonly argsQuery: "arg";
  readonly target: string;
  readonly executable: string;
  readonly summary?: string;
  readonly description?: string;
  readonly inputSchema?: PackageBinJsonSchema;
  readonly outputSchema?: PackageBinJsonSchema;
  readonly annotations?: PackageBinToolAnnotations;
  readonly protocol: PackageBinProtocol;
  readonly term: string;
  readonly strategyTerm: string;
  readonly sessionTerm: string;
  readonly facts: readonly PackageBinFact[];
}

export interface PackageScriptCatalog {
  readonly kind: "organizing-with-jsnode.package-script.catalog";
  readonly package: string;
  readonly packageDir: string;
  readonly protocol: PackageBinProtocol;
  readonly mediaTypes: Readonly<{ input: PackageBinMediaType; output: PackageBinMediaType }>;
  readonly utterances: readonly UtteranceCarrier[];
  readonly observation: Observation;
  readonly discovery: PackageBinDiscovery;
  readonly scripts: readonly PackageScript[];
}

export interface PackageBinsOptions {
  readonly packageName: string;
  readonly packageDir: string;
  readonly bin: PackageBinManifest;
  readonly metadata?: Readonly<Record<string, PackageBinMetadata>>;
  readonly transport?: PackageBinTransport;
  readonly basePath?: string;
}

export interface PackageScriptCatalogFromPackageOptions extends Pick<PackageBinsOptions, "basePath"> {
  readonly packageDir?: PackageScriptCatalogPathLike;
  readonly packageJson?: PackageScriptCatalogPathLike;
  readonly packageName?: string;
  readonly manifest?: Readonly<Record<string, unknown>>;
  readonly bin?: PackageBinManifest;
}

export interface PackageScriptCatalogProjection {
  readonly manifest: PackageScriptCatalogPackageManifest;
  readonly packageDir: string;
  readonly catalog: PackageScriptCatalog;
}

function packageTerm(name: string): string {
  return `jsnode.package.${name}`;
}

function hasBinPredicate(): string {
  return "jsnode.has-bin";
}

export function packageBinTerm(packageName: string, name: string): string {
  return `organizing-with-jsnode.package-bin.${packageName}:${name}`;
}

export function packageBinStrategyTerm(packageName: string, name: string): string {
  return `organizing-with-jsnode.strategy.package-bin.${packageName}:${name}`;
}

export function packageBinSessionTerm(protocol: PackageBinProtocol): string {
  return `organizing-with-jsnode.session.${protocol}`;
}

export function hasBinTargetPredicate(): string {
  return "organizing-with-jsnode.package-bin.has-target";
}

export function hasBinExecutablePredicate(): string {
  return "organizing-with-jsnode.package-bin.has-executable";
}

export function speaksProtocolPredicate(): string {
  return "organizing-with-jsnode.package-bin.speaks-protocol";
}

export function acceptsMediaTypePredicate(): string {
  return "organizing-with-jsnode.package-bin.accepts-media-type";
}

export function emitsMediaTypePredicate(): string {
  return "organizing-with-jsnode.package-bin.emits-media-type";
}

export function realizesStrategyPredicate(): string {
  return "organizing-with-jsnode.package-bin.realizes-strategy";
}

export function hasSessionPredicate(): string {
  return "organizing-with-jsnode.package-bin.has-session";
}

export function protocolTerm(protocol: PackageBinCarrier["protocol"]): string {
  return `computing.protocol.${protocol}`;
}

export function defaultPackageBinTransport(): PackageBinTransport {
  return Object.freeze({
    protocol: PACKAGE_BIN_COMPUTING_ACTION,
    input: PACKAGE_BIN_DEFAULT_INPUT,
    output: PACKAGE_BIN_DEFAULT_OUTPUT,
  });
}

export function normalizeBin(packageName: string, bin: PackageBinManifest): Readonly<Record<string, string>> {
  return typeof bin === "string" ? { [packageName]: bin } : bin;
}

/** Project the standard package.json `bin` field into command -> target form.
 *  A string-valued `bin` is named by the package itself; object-valued bins keep
 *  their declared command names and ignore non-string targets. */
export function packageBinManifest(
  manifest: Readonly<Record<string, unknown>>,
  packageName: string,
): Readonly<Record<string, string>> {
  const raw = manifest["bin"];
  if (typeof raw === "string") return raw.trim() === "" ? Object.freeze({}) : Object.freeze({ [packageName]: raw });
  if (raw === null || typeof raw !== "object") return Object.freeze({});

  const entries = Object.entries(raw as Record<string, unknown>)
    .filter((entry): entry is [string, string] =>
      entry[0].trim() !== "" &&
      typeof entry[1] === "string" &&
      entry[1].trim() !== ""
    )
    .sort(([a], [b]) => a.localeCompare(b));
  return Object.freeze(Object.fromEntries(entries));
}

function schemaRecord(value: unknown): PackageBinJsonSchema | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  return Object.freeze({ ...(value as Record<string, unknown>) });
}

function toolAnnotations(value: unknown): PackageBinToolAnnotations | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const annotations: PackageBinToolAnnotations = {
    ...(typeof record["readOnlyHint"] === "boolean" ? { readOnlyHint: record["readOnlyHint"] } : {}),
    ...(typeof record["openWorldHint"] === "boolean" ? { openWorldHint: record["openWorldHint"] } : {}),
    ...(typeof record["destructiveHint"] === "boolean" ? { destructiveHint: record["destructiveHint"] } : {}),
    ...(typeof record["idempotentHint"] === "boolean" ? { idempotentHint: record["idempotentHint"] } : {}),
    ...(typeof record["title"] === "string" && record["title"].trim().length > 0 ? { title: record["title"].trim() } : {}),
  };
  return Object.keys(annotations).length === 0 ? undefined : Object.freeze(annotations);
}

export function packageBinMetadataManifest(
  manifest: Readonly<Record<string, unknown>>,
): Readonly<Record<string, PackageBinMetadata>> {
  const raw = manifest["x-jsnode-bin"];
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return Object.freeze({});
  const entries = Object.entries(raw as Record<string, unknown>).flatMap(([name, value]): [string, PackageBinMetadata][] => {
    if (name.trim() === "" || value === null || typeof value !== "object" || Array.isArray(value)) return [];
    const record = value as Record<string, unknown>;
    const summary = typeof record["summary"] === "string" ? record["summary"].trim() : "";
    const description = typeof record["description"] === "string" ? record["description"].trim() : "";
    const inputSchema = schemaRecord(record["inputSchema"]);
    const outputSchema = schemaRecord(record["outputSchema"]);
    const annotations = toolAnnotations(record["annotations"]);
    const metadata: PackageBinMetadata = {
      ...(summary.length === 0 ? {} : { summary }),
      ...(description.length === 0 ? {} : { description }),
      ...(inputSchema === undefined ? {} : { inputSchema }),
      ...(outputSchema === undefined ? {} : { outputSchema }),
      ...(annotations === undefined ? {} : { annotations }),
    };
    return Object.keys(metadata).length === 0 ? [] : [[name, Object.freeze(metadata)]];
  }).sort(([a], [b]) => a.localeCompare(b));
  return Object.freeze(Object.fromEntries(entries));
}

export function packageBinTransportManifest(
  manifest: Readonly<Record<string, unknown>>,
): PackageBinTransport {
  const defaults = defaultPackageBinTransport();
  const raw = manifest["x-jsnode-bin-transport"];
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return defaults;
  const record = raw as Record<string, unknown>;
  const protocol = typeof record["protocol"] === "string" && record["protocol"].trim() !== ""
    ? record["protocol"].trim()
    : defaults.protocol;
  const input = typeof record["input"] === "string" && record["input"].trim() !== ""
    ? record["input"].trim()
    : defaults.input;
  const output = typeof record["output"] === "string" && record["output"].trim() !== ""
    ? record["output"].trim()
    : defaults.output;
  return Object.freeze({ protocol, input, output });
}

export function packageBinCarrier(
  packageName: string,
  packageDir: string,
  name: string,
  target: string,
  metadata: PackageBinMetadata = {},
  transport: PackageBinTransport = defaultPackageBinTransport(),
): PackageBinCarrier {
  const term = packageBinTerm(packageName, name);
  const strategyTerm = packageBinStrategyTerm(packageName, name);
  const executable = path.resolve(packageDir, target);
  const protocol = transport.protocol;
  const sessionTerm = packageBinSessionTerm(protocol);
  const utterances = Object.freeze([
    jsNodeFact(packageTerm(packageName), hasBinPredicate(), term),
    jsNodeFact(term, realizesStrategyPredicate(), strategyTerm),
    jsNodeFact(strategyTerm, hasSessionPredicate(), sessionTerm),
    jsNodeFact(term, hasBinTargetPredicate(), target),
    jsNodeFact(term, hasBinExecutablePredicate(), executable),
    jsNodeFact(term, speaksProtocolPredicate(), protocolTerm(protocol)),
    jsNodeFact(term, acceptsMediaTypePredicate(), transport.input),
    jsNodeFact(term, emitsMediaTypePredicate(), transport.output),
    ...(metadata.summary === undefined ? [] : [jsNodeFact(term, "organizing-with-jsnode.package-bin.summary", metadata.summary)]),
    ...(metadata.description === undefined ? [] : [jsNodeFact(term, "organizing-with-jsnode.package-bin.description", metadata.description)]),
  ]);
  return Object.freeze({
    kind: "organizing-with-jsnode.package-bin" as const,
    term,
    strategyTerm,
    sessionTerm,
    packageName,
    name,
    target,
    executable,
    ...(metadata.summary === undefined ? {} : { summary: metadata.summary }),
    ...(metadata.description === undefined ? {} : { description: metadata.description }),
    ...(metadata.inputSchema === undefined ? {} : { inputSchema: metadata.inputSchema }),
    ...(metadata.outputSchema === undefined ? {} : { outputSchema: metadata.outputSchema }),
    ...(metadata.annotations === undefined ? {} : { annotations: metadata.annotations }),
    action: protocol,
    protocol,
    input: transport.input,
    output: transport.output,
    utterances,
    observation: jsNodeObservation(utterances),
  });
}

export function packageBins(options: PackageBinsOptions): readonly PackageBin[] {
  return Object.freeze(
    Object.entries(normalizeBin(options.packageName, options.bin))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, target]) => Object.freeze({
        carrier: packageBinCarrier(options.packageName, options.packageDir, name, target, options.metadata?.[name], options.transport),
      })),
  );
}

export function packageBinDiscovery(options: PackageBinsOptions): PackageBinDiscovery {
  const basePath = normalizeBasePath(options.basePath);
  const transport = options.transport ?? defaultPackageBinTransport();
  const bins = packageBins(options);
  const utterances = Object.freeze(bins.flatMap(({ carrier }) => [...carrier.utterances]));
  return Object.freeze({
    kind: "organizing-with-jsnode.package-bin.discovery" as const,
    package: options.packageName,
    protocol: transport.protocol,
    mediaTypes: Object.freeze({ input: transport.input, output: transport.output }),
    utterances,
    observation: jsNodeObservation(utterances),
    bins: Object.freeze(bins.map(({ carrier }) => packageBinEndpoint(carrier, basePath))),
  });
}

export function packageBinFact(uttered: UtteranceCarrier): PackageBinFact {
  const tokenValue = uttered.token.mark.value;
  const predicate = String(uttered.claim.mark.value);
  if (
    tokenValue !== null &&
    typeof tokenValue === "object" &&
    "subject" in tokenValue &&
    "object" in tokenValue
  ) {
    const cell = tokenValue as { readonly subject: unknown; readonly object: unknown };
    return Object.freeze({ subject: cell.subject, predicate, object: cell.object });
  }
  return Object.freeze({ subject: tokenValue, predicate, object: undefined });
}

export function packageBinEndpoint(carrier: PackageBinCarrier, basePath: string): PackageBinEndpoint {
  return Object.freeze({
    name: carrier.name,
    href: joinPath(basePath, carrier.name),
    method: "POST" as const,
    input: carrier.input,
    output: carrier.output,
    argsQuery: "arg" as const,
    target: carrier.target,
    executable: carrier.executable,
    ...(carrier.summary === undefined ? {} : { summary: carrier.summary }),
    ...(carrier.description === undefined ? {} : { description: carrier.description }),
    ...(carrier.inputSchema === undefined ? {} : { inputSchema: carrier.inputSchema }),
    ...(carrier.outputSchema === undefined ? {} : { outputSchema: carrier.outputSchema }),
    ...(carrier.annotations === undefined ? {} : { annotations: carrier.annotations }),
    protocol: carrier.protocol,
    carrier: Object.freeze({
      kind: carrier.kind,
      term: carrier.term,
      strategyTerm: carrier.strategyTerm,
      sessionTerm: carrier.sessionTerm,
      packageName: carrier.packageName,
      name: carrier.name,
      action: carrier.action,
      protocol: carrier.protocol,
      facts: Object.freeze(carrier.utterances.map(packageBinFact)),
    }),
  });
}

export function packageScriptFromEndpoint(endpoint: PackageBinEndpoint): PackageScript {
  return Object.freeze({
    kind: "organizing-with-jsnode.package-script" as const,
    name: endpoint.name,
    href: endpoint.href,
    method: endpoint.method,
    input: endpoint.input,
    output: endpoint.output,
    argsQuery: endpoint.argsQuery,
    target: endpoint.target,
    executable: endpoint.executable,
    ...(endpoint.summary === undefined ? {} : { summary: endpoint.summary }),
    ...(endpoint.description === undefined ? {} : { description: endpoint.description }),
    ...(endpoint.inputSchema === undefined ? {} : { inputSchema: endpoint.inputSchema }),
    ...(endpoint.outputSchema === undefined ? {} : { outputSchema: endpoint.outputSchema }),
    ...(endpoint.annotations === undefined ? {} : { annotations: endpoint.annotations }),
    protocol: endpoint.protocol,
    term: endpoint.carrier.term,
    strategyTerm: endpoint.carrier.strategyTerm,
    sessionTerm: endpoint.carrier.sessionTerm,
    facts: endpoint.carrier.facts,
  });
}

export function packageScriptCatalog(options: PackageBinsOptions): PackageScriptCatalog {
  const discovery = packageBinDiscovery(options);
  return Object.freeze({
    kind: "organizing-with-jsnode.package-script.catalog" as const,
    package: discovery.package,
    packageDir: options.packageDir,
    protocol: discovery.protocol,
    mediaTypes: discovery.mediaTypes,
    utterances: discovery.utterances,
    observation: discovery.observation,
    discovery,
    scripts: Object.freeze(discovery.bins.map(packageScriptFromEndpoint)),
  });
}

function pathFrom(value: PackageScriptCatalogPathLike): string {
  return value instanceof URL ? fileURLToPath(value) : path.resolve(value);
}

function packageDirFrom(options: Pick<PackageScriptCatalogFromPackageOptions, "packageDir" | "packageJson">): string {
  if (options.packageDir !== undefined) return pathFrom(options.packageDir);
  if (options.packageJson !== undefined) return path.dirname(pathFrom(options.packageJson));
  return process.cwd();
}

function packageJsonFrom(options: Pick<PackageScriptCatalogFromPackageOptions, "packageDir" | "packageJson">): string {
  if (options.packageJson !== undefined) return pathFrom(options.packageJson);
  return path.join(packageDirFrom(options), "package.json");
}

function readPackageManifest(packageJson: string): Readonly<Record<string, unknown>> {
  const parsed = JSON.parse(readFileSync(packageJson, "utf8")) as unknown;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${packageJson} must contain a JSON object`);
  }
  return parsed as Readonly<Record<string, unknown>>;
}

function packageManifestName(manifest: Readonly<Record<string, unknown>>): string | undefined {
  return typeof manifest["name"] === "string" && manifest["name"].trim() !== "" ? manifest["name"] : undefined;
}

export function packageScriptCatalogFromPackage(
  options: PackageScriptCatalogFromPackageOptions = {},
): PackageScriptCatalogProjection {
  const packageDir = packageDirFrom(options);
  const manifestRecord = options.manifest ?? readPackageManifest(packageJsonFrom(options));
  const packageName = options.packageName ?? packageManifestName(manifestRecord);
  if (packageName === undefined) {
    throw new Error(`${packageJsonFrom(options)} must declare a package name`);
  }
  const bin = normalizeBin(packageName, options.bin ?? packageBinManifest(manifestRecord, packageName));
  const metadata = packageBinMetadataManifest(manifestRecord);
  const transport = packageBinTransportManifest(manifestRecord);
  const manifest = Object.freeze({
    ...manifestRecord,
    name: packageName,
    bin,
    "x-jsnode-bin": metadata,
    "x-jsnode-bin-transport": transport,
  }) as PackageScriptCatalogPackageManifest;
  const catalog = packageScriptCatalog({
    packageName,
    packageDir,
    bin,
    metadata,
    transport,
    ...(options.basePath === undefined ? {} : { basePath: options.basePath }),
  });
  return Object.freeze({
    manifest,
    packageDir,
    catalog,
  });
}

export function normalizeBasePath(pathname: string | undefined): string {
  if (pathname === undefined || pathname.trim() === "" || pathname === "/") return "";
  const rooted = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return rooted.replace(/\/+$/, "");
}

function joinPath(basePath: string, leaf: string): string {
  const escaped = encodeURIComponent(leaf);
  return basePath === "" ? `/${escaped}` : `${basePath}/${escaped}`;
}

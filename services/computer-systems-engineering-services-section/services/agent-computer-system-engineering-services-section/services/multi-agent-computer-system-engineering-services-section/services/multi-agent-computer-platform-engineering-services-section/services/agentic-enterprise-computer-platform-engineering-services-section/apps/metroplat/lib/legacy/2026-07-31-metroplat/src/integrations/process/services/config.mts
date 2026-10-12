import { basename, dirname, resolve } from "node:path";

import { processArguments } from "./entrypoint.mts";
import { processEnvironment, type ProcessEnvironment } from "./environment.mts";
import { pathExists, readFileUtf8 } from "../../../lib/filesystem/index.mts";

export interface ProcessDataRootConfigOptions {
  readonly defaultRoot: string;
  readonly args?: readonly string[];
  readonly env?: ProcessEnvironment;
  readonly envName: string;
  readonly configEnvName?: string;
  readonly configFileName?: string;
  readonly dataRootFlag?: string;
  readonly configFlag?: string;
  readonly legacyEnvNames?: readonly string[];
  readonly cwd?: string;
}

export interface ProcessDataRootConfig {
  readonly dataRoot: string;
  readonly source: "default" | "config" | "env" | "argv";
  readonly configPath?: string;
}

type FlagRead = Readonly<{
  value?: string;
  found: boolean;
}>;

/** Resolve the canonical settlement data root for a process boundary. */
export function processDataRootConfig(options: ProcessDataRootConfigOptions): ProcessDataRootConfig {
  const args = options.args ?? processArguments();
  const env = options.env ?? processEnvironment();
  const cwd = options.cwd ?? process.cwd();
  const dataRootFlag = options.dataRootFlag ?? "--data-root";
  const configFlag = options.configFlag ?? "--config";
  rejectLegacyDataRootEnv(env, options.legacyEnvNames ?? [], options.envName);

  let dataRoot = resolve(cwd, options.defaultRoot);
  let source: ProcessDataRootConfig["source"] = "default";
  const configPath = resolveConfigPath({
    args,
    env,
    cwd,
    configFlag,
    ...(options.configEnvName === undefined ? {} : { configEnvName: options.configEnvName }),
    defaultConfigPath: resolve(dataRoot, options.configFileName ?? "metroplat.config.json"),
  });
  if (configPath !== undefined) {
    const configured = readDataRootConfig(configPath);
    if (configured !== undefined) {
      dataRoot = resolve(dirname(configPath), configured);
      source = "config";
    }
  }

  const envRoot = trimmed(env[options.envName]);
  if (envRoot !== undefined) {
    dataRoot = resolve(cwd, envRoot);
    source = "env";
  }

  const argvRoot = readFlagValue(args, dataRootFlag, "process data root");
  if (argvRoot.value !== undefined) {
    dataRoot = resolve(cwd, argvRoot.value);
    source = "argv";
  }
  rejectDataTierRoot(dataRoot, source);

  return Object.freeze({
    dataRoot,
    source,
    ...(configPath === undefined ? {} : { configPath }),
  });
}

/** Remove process config flags before forwarding argv to a domain dispatcher. */
export function processArgumentsWithoutConfigFlags(
  args: readonly string[],
  flags: readonly string[] = ["--data-root", "--config"],
): readonly string[] {
  const kept: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index]!;
    const flag = flags.find((candidate) => value === candidate || value.startsWith(`${candidate}=`));
    if (flag === undefined) {
      kept.push(value);
    } else if (value === flag) {
      index += 1;
    }
  }
  return Object.freeze(kept);
}

function resolveConfigPath(options: {
  readonly args: readonly string[];
  readonly env: ProcessEnvironment;
  readonly cwd: string;
  readonly configFlag: string;
  readonly configEnvName?: string;
  readonly defaultConfigPath: string;
}): string | undefined {
  const argvConfig = readFlagValue(options.args, options.configFlag, "process config");
  if (argvConfig.value !== undefined) return resolve(options.cwd, argvConfig.value);
  const envConfig = options.configEnvName === undefined ? undefined : trimmed(options.env[options.configEnvName]);
  if (envConfig !== undefined) return resolve(options.cwd, envConfig);
  return pathExists(options.defaultConfigPath) ? options.defaultConfigPath : undefined;
}

function readDataRootConfig(configPath: string): string | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileUtf8(configPath));
  } catch (error) {
    throw new Error(`invalid process config ${configPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`invalid process config ${configPath}: expected a JSON object`);
  }
  const dataRoot = (parsed as { readonly dataRoot?: unknown }).dataRoot;
  if (dataRoot === undefined) return undefined;
  if (typeof dataRoot !== "string" || dataRoot.trim() === "") {
    throw new Error(`invalid process config ${configPath}: dataRoot must be a non-empty string`);
  }
  return dataRoot.trim();
}

function rejectLegacyDataRootEnv(env: ProcessEnvironment, legacyEnvNames: readonly string[], envName: string): void {
  for (const name of legacyEnvNames) {
    if (name === envName) continue;
    if (trimmed(env[name]) !== undefined) {
      throw new Error(`${name} is no longer a data-root input; use ${envName}, --data-root, or the process config file`);
    }
  }
}

function rejectDataTierRoot(dataRoot: string, source: ProcessDataRootConfig["source"]): void {
  if (basename(dataRoot) !== "data") return;
  const hasDataTierShape = pathExists(resolve(dataRoot, "logs")) ||
    pathExists(resolve(dataRoot, "state")) ||
    pathExists(resolve(dataRoot, "records")) ||
    pathExists(resolve(dataRoot, "record"));
  if (!hasDataTierShape) return;
  throw new Error(`process data root from ${source} names a data tier (${dataRoot}); pass the settlement root instead (${dirname(dataRoot)})`);
}

function readFlagValue(args: readonly string[], flag: string, label: string): FlagRead {
  let found = false;
  let value: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (arg === flag) {
      if (found) throw new Error(`${label}: ${flag} must be supplied once`);
      const next = trimmed(args[index + 1]);
      if (next === undefined || next.startsWith("--")) throw new Error(`${label}: ${flag} requires a non-empty value`);
      found = true;
      value = next;
      index += 1;
    } else if (arg.startsWith(`${flag}=`)) {
      if (found) throw new Error(`${label}: ${flag} must be supplied once`);
      const next = trimmed(arg.slice(flag.length + 1));
      if (next === undefined) throw new Error(`${label}: ${flag} requires a non-empty value`);
      found = true;
      value = next;
    }
  }
  return Object.freeze({ found, ...(value === undefined ? {} : { value }) });
}

function trimmed(value: string | undefined): string | undefined {
  const text = value?.trim();
  return text === undefined || text === "" ? undefined : text;
}

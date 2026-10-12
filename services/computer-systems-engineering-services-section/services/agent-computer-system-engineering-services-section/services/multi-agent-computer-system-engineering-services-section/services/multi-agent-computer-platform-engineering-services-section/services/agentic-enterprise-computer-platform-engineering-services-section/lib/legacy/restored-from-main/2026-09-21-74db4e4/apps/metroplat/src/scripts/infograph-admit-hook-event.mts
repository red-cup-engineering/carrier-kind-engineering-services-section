#!/usr/bin/env node
/**
 * infograph-admit-hook-event - admits one harness hook-event JSON from
 * stdin into metroplat's causal journal via `appendHookEventAtRoot`.
 *
 *   cat hook-event.json | infograph-admit-hook-event
 *   infograph-admit-hook-event --root /path/to/data-root < hook-event.json
 *   infograph-admit-hook-event --session my-session --actor operator-1 < hook-event.json
 */
import { parse as parseJson, type JsonRecord, type JsonValue } from "../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { appendHookEventAtRoot } from "../integrations/hooks/index.mts";
import {
  isDirectEntrypoint,
  processArguments,
  processDataRootConfig,
  processEntrypointArgument,
  processPackageRoot,
  readProcessStdinText,
  runProcessMain,
  writeProcessStdout,
} from "@red-cup-engineering/node-process-services-section";

interface CliOptions {
  readonly session?: string;
  readonly actor?: string;
}

function flagValue(args: readonly string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}

function cliOptions(args: readonly string[]): CliOptions {
  const session = flagValue(args, "--session");
  const actor = flagValue(args, "--actor");
  return Object.freeze({
    ...(session === undefined ? {} : { session }),
    ...(actor === undefined ? {} : { actor }),
  });
}

/** Merge a CLI-supplied session id into a hook payload that names none of
 *  its own, so a hand-invoked or session-less hook can still be attributed. */
function withSessionFallback(input: JsonValue, session: string | undefined): JsonValue {
  if (session === undefined || input === null || typeof input !== "object" || Array.isArray(input)) return input;
  const record = input as JsonRecord;
  if (typeof record["session_id"] === "string" || typeof record["sessionId"] === "string") return input;
  return Object.freeze({ ...record, session_id: session });
}

function callerDescriptor(options: CliOptions): JsonRecord | undefined {
  if (options.actor === undefined && options.session === undefined) return undefined;
  return Object.freeze({
    transport: "agent-hook-cli",
    ...(options.actor === undefined ? {} : { actor: options.actor }),
    ...(options.session === undefined ? {} : { session: options.session }),
  });
}

async function main(): Promise<number> {
  const args = processArguments();
  const options = cliOptions(args);
  const dataRoot = processDataRootConfig({
    defaultRoot: processPackageRoot(import.meta.url),
    args,
    envName: "METROPLAT_DATA_ROOT", configFileName: "metroplat.config.json",
    configEnvName: "METROPLAT_CONFIG",
    legacyEnvNames: Object.freeze(["METROPLAT_DATA"]),
  }).dataRoot;

  const stdinText = (await readProcessStdinText()).trim();
  if (stdinText === "") {
    throw new Error("infograph-admit-hook-event: expected one hook-event JSON object on stdin");
  }
  const payload = withSessionFallback(parseJson(stdinText), options.session);
  const caller = callerDescriptor(options);

  const receipt = appendHookEventAtRoot(dataRoot, payload, {
    rootName: "@red-cup-engineering/metroplat",
    ...(caller === undefined ? {} : { caller }),
  });

  writeProcessStdout(`${JSON.stringify(receipt)}\n`);
  return 0;
}

if (isDirectEntrypoint(import.meta.url, processEntrypointArgument())) {
  void runProcessMain(main, { name: "infograph-admit-hook-event" });
}

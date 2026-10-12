/** argv/stdin adaptation into the protocol-neutral RPC dispatcher. */
import type { ProjectedSurface } from "../../presentation/surface.mts";
import {
  dispatch,
  invocation,
  type ExecutionReceipt,
  type OperationCatalog,
  type RpcAuthorize,
  type RpcWitness,
} from "../../rpc/index.mts";
import { contentAddress } from "../../lib/identity/index.mts";
import { type JsonRecord, type JsonValue } from "../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { wireCodec } from "../../lib/codecs/wire/index.mts";

export interface DispatchOptions {
  /** Subject resolved by the composition root; never inferred from caller metadata. */
  readonly subject: string;
  readonly caller?: JsonValue;
  readonly program?: string;
  readonly now: () => string;
  readonly witness: RpcWitness;
  /** Stable boundary request identity, when the protocol supplies one. */
  readonly request?: string;
  /** Causal predecessors admitted by the protocol boundary. */
  readonly causes?: readonly string[];
}

export interface DispatchResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly receipt?: ExecutionReceipt;
}

interface ParsedArgv {
  readonly positionals: readonly string[];
  readonly values: Readonly<Record<string, string | boolean | readonly string[]>>;
}

function pushValue(values: Record<string, string | boolean | string[]>, key: string, value: string | boolean): void {
  const prior = values[key];
  if (prior === undefined) values[key] = value;
  else values[key] = Array.isArray(prior) ? [...prior, String(value)] : [String(prior), String(value)];
}

function parseArgv(argv: readonly string[], valuedOptions: ReadonlySet<string>): ParsedArgv {
  const positionals: string[] = [];
  const values: Record<string, string | boolean | string[]> = {};
  let positionalOnly = false;
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]!;
    if (positionalOnly || !token.startsWith("-") || token === "-") {
      positionals.push(token);
      continue;
    }
    if (token === "--") {
      positionalOnly = true;
      continue;
    }
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }
    const raw = token.slice(2);
    const equals = raw.indexOf("=");
    const key = equals < 0 ? raw : raw.slice(0, equals);
    if (key === "") throw new TypeError("empty option name");
    if (equals >= 0) {
      pushValue(values, key, raw.slice(equals + 1));
      continue;
    }
    if (valuedOptions.has(key)) {
      const next = argv[index + 1];
      if (next === undefined) throw new TypeError(`Option '--${key}' argument missing`);
      index += 1;
      pushValue(values, key, next);
      continue;
    }
    pushValue(values, key, true);
  }
  return Object.freeze({ positionals: Object.freeze(positionals), values: Object.freeze(values) });
}

function argumentRecord(values: Readonly<Record<string, unknown>>): JsonRecord {
  const args: Record<string, JsonValue> = {};
  for (const [key, value] of Object.entries(values)) {
    if (key === "input-format" || key === "output-format" || value === undefined) continue;
    if (typeof value === "string" || typeof value === "boolean") args[key] = value;
    else if (Array.isArray(value)) args[key] = value.filter((item): item is string => typeof item === "string");
  }
  return Object.freeze(args);
}

export async function dispatchWire(
  catalog: OperationCatalog,
  argv: readonly string[],
  stdin: string,
  options: DispatchOptions,
  authorize: RpcAuthorize,
): Promise<DispatchResult> {
  const verbs = [...catalog.byVerb.keys()].sort().join(", ");
  const program = options.program ?? "infograph";
  let verb: string | undefined;
  try {
    verb = parseArgv(argv, new Set()).positionals[0];
  } catch (error) {
    return { code: 2, stdout: "", stderr: `${program}: ${error instanceof Error ? error.message : String(error)}\n` };
  }
  if (verb === undefined) return { code: 2, stdout: "", stderr: `${program}: a verb is required; known: ${verbs}\n` };
  const operation = catalog.byVerb.get(verb);
  if (operation === undefined) return { code: 2, stdout: "", stderr: `${program}: unknown verb ${JSON.stringify(verb)}; known: ${verbs}\n` };

  let values: Record<string, unknown>;
  try {
    values = parseArgv(argv, new Set(["input-format", "output-format", ...operation.options])).values as Record<string, unknown>;
  } catch (error) {
    return { code: 2, stdout: "", stderr: `${program} ${verb}: ${error instanceof Error ? error.message : String(error)}\n` };
  }
  const inputFormat = typeof values["input-format"] === "string" ? values["input-format"] as string : operation.inputFormat;
  const outputFormat = typeof values["output-format"] === "string" ? values["output-format"] as string : operation.outputFormat;
  let input: JsonValue;
  try {
    input = wireCodec(inputFormat).decode(stdin);
  } catch (error) {
    return { code: 1, stdout: "", stderr: `${program} ${verb}: ${error instanceof Error ? error.message : String(error)}\n` };
  }

  const caller = options.caller ?? Object.freeze({ transport: "unknown" });
  const observedAt = options.now();
  const request = options.request ?? contentAddress(Object.freeze({ program, argv: Object.freeze([...argv]), stdin, caller, observedAt }) as JsonValue);
  const candidate = invocation({
    request,
    subject: options.subject,
    operation: operation.ref,
    verb: operation.verb,
    resource: program,
    input,
    arguments: argumentRecord(values),
    caller,
    observedAt,
    causes: options.causes ?? [],
  });
  const receipt = await dispatch({ catalog, witness: options.witness, authorize, now: options.now }, candidate);
  if (!receipt.ok || receipt.value === undefined) {
    return {
      code: 1,
      stdout: "",
      stderr: `${program} ${verb}: ${receipt.reasons.join("; ") || `execution obstructed at ${receipt.phase}`}\n`,
      receipt,
    };
  }
  try {
    return { code: 0, stdout: wireCodec(outputFormat).encode(receipt.value), stderr: "", receipt };
  } catch (error) {
    return { code: 1, stdout: "", stderr: `${program} ${verb}: ${error instanceof Error ? error.message : String(error)}\n`, receipt };
  }
}

export function dispatchProjectedSurface(
  surface: ProjectedSurface,
  argv: readonly string[],
  stdin: string,
  options: DispatchOptions,
): Promise<DispatchResult> {
  return dispatchWire(surface.catalog, argv, stdin, options, surface.authorize);
}

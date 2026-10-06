/** argv/stdin adaptation into the protocol-neutral RPC dispatcher. */

import { dispatch } from "./dispatch.mjs";
import { invocation } from "./invocation.mjs";
import { artifactId } from "@red-cup-engineering/semiotic-eavt-services-section/identity";
import { wireCodec } from "../wire-eavt-tuple.mjs";
import { parseArgv } from "@red-cup-engineering/javascript-node-services-section/argv";

function argumentRecord(values) {
  const args = {};
  for (const [key, value] of Object.entries(values)) {
    if (key === "input-format" || key === "output-format" || value === undefined) continue;
    if (typeof value === "string" || typeof value === "boolean") args[key] = value;
    else if (Array.isArray(value)) args[key] = value.filter((item) => typeof item === "string");
  }
  return Object.freeze(args);
}

export async function dispatchWire(
  catalog,
  argv,
  stdin,
  options,
  authorize,
) {
  const verbs = [...catalog.byVerb.keys()].sort().join(", ");
  const program = options.program ?? "infograph";
  let verb;
  try {
    verb = parseArgv(argv, new Set()).positionals[0];
  } catch (error) {
    return { code: 2, stdout: "", stderr: `${program}: ${error instanceof Error ? error.message : String(error)}\n` };
  }
  if (verb === undefined) return { code: 2, stdout: "", stderr: `${program}: a verb is required; known: ${verbs}\n` };
  const operation = catalog.byVerb.get(verb);
  if (operation === undefined) return { code: 2, stdout: "", stderr: `${program}: unknown verb ${JSON.stringify(verb)}; known: ${verbs}\n` };

  let values;
  try {
    values = parseArgv(argv, new Set(["input-format", "output-format", ...operation.options])).values;
  } catch (error) {
    return { code: 2, stdout: "", stderr: `${program} ${verb}: ${error instanceof Error ? error.message : String(error)}\n` };
  }
  const inputFormat = typeof values["input-format"] === "string" ? values["input-format"] : operation.inputFormat;
  const outputFormat = typeof values["output-format"] === "string" ? values["output-format"] : operation.outputFormat;
  let input;
  try {
    input = wireCodec(inputFormat).decode(stdin);
  } catch (error) {
    return { code: 1, stdout: "", stderr: `${program} ${verb}: ${error instanceof Error ? error.message : String(error)}\n` };
  }

  const caller = options.caller ?? Object.freeze({ transport: "unknown" });
  const observedAt = options.now();
  const request = options.request ?? artifactId(Object.freeze({ program, argv: Object.freeze([...argv]), stdin, caller, observedAt }));
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
  const receipt = await dispatch({ catalog, witness: options.witness, authorize, now: options.now, ...(options.coordinate === undefined ? {} : { coordinate: options.coordinate }) }, candidate);
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
  surface,
  argv,
  stdin,
  options,
) {
  return dispatchWire(surface.catalog, argv, stdin, options, surface.authorize);
}

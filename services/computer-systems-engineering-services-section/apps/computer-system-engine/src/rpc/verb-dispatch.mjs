/**
 * @packageDocumentation
 *
 * The one dispatcher behind the `relate` binary: reads argv (verb positional,
 * `--input-format`/`--output-format` codec overrides, remaining flags as action
 * args), decodes stdin, runs the pure morphism, encodes the result, and -- when a
 * data root is given -- witnesses the play as EAVT here, replacing every
 * per-script stdin/argv tail.
 */

import { programObject } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { wireCodec } from "@red-cup-engineering/computer-system-engine/wire";
import { parseArgv } from "@red-cup-engineering/javascript-node-services-section/argv";

/** Options governing one dispatch. */

/** The outcome of one dispatch. */

export function isPromiseLike(value) {
  return typeof value === "object" && value !== null && "then" in value && typeof (value).then === "function";
}

/** Index a catalog of actions by verb. */
export function actionsByVerb(actions) {
  return new Map(actions.map((act) => [act.verb, act]));
}

function reportInvocation(options, invocation) {
  try {
    options.onInvocation?.(invocation);
  } catch {
    // Witnessing is advisory; a hook must not change dispatch output.
  }
}

/** Collect non-codec flags as the action's argument record. */
function argRecord(values) {
  const args = {};
  for (const [key, value] of Object.entries(values)) {
    if (key === "input-format" || key === "output-format" || value === undefined) continue;
    if (typeof value === "string" || typeof value === "boolean") args[key] = value;
    else if (Array.isArray(value)) args[key] = value.filter((item) => typeof item === "string");
  }
  return Object.freeze(args);
}

/** Run one dispatch: argv + stdin â†’ stdout, witnessing the play when configured. */
export function dispatch(
  actions,
  argv,
  stdin,
  options = {},
) {
  const catalog = actionsByVerb(actions);
  const verbs = [...catalog.keys()].sort().join(", ");
  const program = options.program ?? "relate";

  // First pass: discover the verb from the positionals (permissive).
  let verb;
  try {
    verb = parseArgv(argv, new Set()).positionals[0];
  } catch (error) {
    return { code: 2, stdout: "", stderr: `${program}: ${error instanceof Error ? error.message : String(error)}\n` };
  }
  if (verb === undefined) return { code: 2, stdout: "", stderr: `${program}: a verb is required; known: ${verbs}\n` };
  const act = catalog.get(verb);
  if (act === undefined) return { code: 2, stdout: "", stderr: `${program}: unknown verb ${JSON.stringify(verb)}; known: ${verbs}\n` };

  // Second pass: configure the codec flags and the action's declared valued options.
  const valuedOptions = new Set(["input-format", "output-format", ...act.options]);
  let values;
  try {
    values = parseArgv(argv, valuedOptions).values;
  } catch (error) {
    return { code: 2, stdout: "", stderr: `${program} ${verb}: ${error instanceof Error ? error.message : String(error)}\n` };
  }

  const inName = typeof values["input-format"] === "string" ? (values["input-format"]) : act.inputFormat;
  const outName = typeof values["output-format"] === "string" ? (values["output-format"]) : act.outputFormat;
  const args = argRecord(values);

  let stdout;
  let value;
  try {
    const input = wireCodec(inName).decode(stdin);
    const runValue = act.execute(input, args);
    if (isPromiseLike(runValue)) {
      throw new TypeError("async action requires dispatchAsync");
    }
    value = runValue;
    stdout = wireCodec(outName).encode(value);
  } catch (error) {
    return { code: 1, stdout: "", stderr: `${program} ${verb}: ${error instanceof Error ? error.message : String(error)}\n` };
  }

  if (options.onInvocation !== undefined) {
    if (options.now === undefined) {
      return {
        code: 2,
        stdout: "",
        stderr: `${program} ${verb}: dispatch witnessing requires options.now from the service boundary\n`,
      };
    }
    const at = options.now();
    const invocation = {
      caller: options.caller ?? { transport: "cli" },
      verb,
      args,
      action: programObject(act),
      value: value,
      at,
    };
    reportInvocation(options, invocation);
  }

  return { code: 0, stdout, stderr: "" };
}

/** Run one dispatch, allowing the action body to await external effects. */
export async function dispatchAsync(
  actions,
  argv,
  stdin,
  options = {},
) {
  const catalog = actionsByVerb(actions);
  const verbs = [...catalog.keys()].sort().join(", ");
  const program = options.program ?? "relate";

  let verb;
  try {
    verb = parseArgv(argv, new Set()).positionals[0];
  } catch (error) {
    return { code: 2, stdout: "", stderr: `${program}: ${error instanceof Error ? error.message : String(error)}\n` };
  }
  if (verb === undefined) return { code: 2, stdout: "", stderr: `${program}: a verb is required; known: ${verbs}\n` };
  const act = catalog.get(verb);
  if (act === undefined) return { code: 2, stdout: "", stderr: `${program}: unknown verb ${JSON.stringify(verb)}; known: ${verbs}\n` };

  const valuedOptions = new Set(["input-format", "output-format", ...act.options]);
  let values;
  try {
    values = parseArgv(argv, valuedOptions).values;
  } catch (error) {
    return { code: 2, stdout: "", stderr: `${program} ${verb}: ${error instanceof Error ? error.message : String(error)}\n` };
  }

  const inName = typeof values["input-format"] === "string" ? (values["input-format"]) : act.inputFormat;
  const outName = typeof values["output-format"] === "string" ? (values["output-format"]) : act.outputFormat;
  const args = argRecord(values);

  let value;
  let stdout;
  try {
    const input = wireCodec(inName).decode(stdin);
    value = await act.execute(input, args);
    stdout = wireCodec(outName).encode(value);
  } catch (error) {
    return { code: 1, stdout: "", stderr: `${program} ${verb}: ${error instanceof Error ? error.message : String(error)}\n` };
  }

  if (options.onInvocation !== undefined) {
    if (options.now === undefined) {
      return {
        code: 2,
        stdout: "",
        stderr: `${program} ${verb}: dispatch witnessing requires options.now from the service boundary\n`,
      };
    }
    const at = options.now();
    const invocation = {
      caller: options.caller ?? { transport: "cli" },
      verb,
      args,
      action: programObject(act),
      value: value,
      at,
    };
    reportInvocation(options, invocation);
  }

  return { code: 0, stdout, stderr: "" };
}

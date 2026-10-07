// Thin CLI over src/nuclei.mjs: reads one context and starting readings
// (stdin or a file argument), runs the settle loop to its H-theorem-checked
// fixed point, and prints the settled valuation with its receipt (steps,
// the free-energy ledger, witnesses). All settlement logic stays in
// src/nuclei.mjs.

import { jsonCommand } from "./json-command.mjs";
import { makeContext } from "@red-cup-engineering/metrologic/closure/formal-context";
import { makeValuation, withReading, settle } from "@red-cup-engineering/signcraft/inference/nuclei";

const HELP = `Usage: settle-valuation.mjs [corpus.json]

Reads {objects, attributes, pairs, readings?} as JSON from the given file,
or from stdin when no file is given, settles the valuation those readings
found, and prints the settled valuation plus its receipt as JSON on stdout.

  objects      object ids (required)
  attributes   the attribute universe (required)
  pairs        [[object, attribute], ...] incidence told for
  readings      [[object, attribute, value], ...] extra readings (knowledge family)
               (absurd, potential, active, or stable)

Output: {"valuation": [{g, m, value}, ...],
         "receipt": {"steps", "ledger": {"initialDeficit", "totalFlux", "closes"}, "witnesses"}}

Exit 0 with {"ok":true,"result":...} on success.
Exit 1 with {"ok":false,"refusal":{"code":...,"message":...}} on refusal.

  --help, -h   print this text and exit
`;

/**
 * Validates and normalizes one settle-valuation input.
 * @param {unknown} input the parsed JSON input
 * @returns {{objects: string[], attributes: string[], pairs: Array<[string,string]>, readings: Array<[string,string,string]>}}
 * @throws {Error} with `.code = "malformed-input"` when the shape is wrong
 */
export function settleValuationRequest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throwMalformed("input must be one JSON object");
  const { objects, attributes, pairs, readings = [] } = input;
  if (!Array.isArray(objects) || !Array.isArray(attributes) || !Array.isArray(pairs)) {
    throwMalformed("input requires objects, attributes, and pairs arrays");
  }
  if (!Array.isArray(readings)) throwMalformed("readings must be an array of [object, attribute, reading] tuples");
  return { objects, attributes, pairs, readings };
}

/**
 * Settles one context's valuation to its fixed point and returns it as a
 * plain JSON-serializable receipt: the flat valuation array, the step
 * count, the free-energy ledger, and every witness fired.
 * @param {unknown} input the parsed JSON input
 * @returns {{valuation: Array<{g: string, m: string, value: string}>, receipt: {steps: number, ledger: {initialDeficit: number, totalFlux: number, closes: boolean}, witnesses: object[]}}}
 * @throws {Error} with `.code = "malformed-input"` when the shape is wrong, propagated H-theorem/fixed-point errors otherwise
 */
export function settleValuation(input) {
  const request = settleValuationRequest(input);
  const ctx = makeContext(request.objects, request.attributes, request.pairs);
  let v = makeValuation();
  for (const [g, m] of request.pairs) v = withReading(v, g, m, "potential");
  for (const [g, m, value] of request.readings) v = withReading(v, g, m, value);
  const settled = settle(ctx, v);
  const valuation = [...settled.v.entries()].map(([key, q]) => {
    const [g, m] = key.split(" ");
    return { g, m, value: q };
  });
  const witnesses = settled.trace.flatMap((step) => step.witnesses);
  return { valuation, receipt: { steps: settled.steps, ledger: settled.ledger, witnesses } };
}

function throwMalformed(message) {
  const error = new Error(message);
  error.code = "malformed-input";
  throw error;
}

/** The runnable declaration: javascript-node's runJavascriptNodeOperationModule executes it. */
export const command = jsonCommand({ help: HELP, errorCode: "settlement-error", execute: (input, parsed) => settleValuation(input) });

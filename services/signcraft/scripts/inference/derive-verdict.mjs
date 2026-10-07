// Thin CLI over src/infer.mjs: reads one derivation request (stdin or a
// file argument), runs the kernel's exact non-sampling inference, and
// prints its verdict JSON. All derivation logic stays in src/infer.mjs.

import { jsonCommand } from "./json-command.mjs";
import { makeInference, infer } from "@red-cup-engineering/signcraft/inference/infer";

const HELP = `Usage: derive-verdict.mjs [input.json]

Reads {rules, facts?, denials?, query, attributes?, conductances?} as JSON
from the given file, or from stdin when no file is given, and prints
infer()'s verdict as JSON on stdout.

  rules         [{ name?, if: string[], then: string[] }, ...] (required)
  query         the attribute to verdict on (required)
  facts         attributes held true (default [])
  denials       attributes held false (default [])
  attributes    the attribute universe (default: derived from rules/facts/
                denials/query/conductances)
  conductances  [[a, b, weight], ...] for the refusal-number complex

Exit 0 with {"ok":true,"result":...} on success.
Exit 1 with {"ok":false,"refusal":{"code":...,"message":...}} on refusal.

  --help, -h    print this text and exit
`;

/**
 * Collects the attribute universe implied by a request when no explicit
 * `attributes` list is given, so a caller need only state rules and facts.
 * @param {{rules: Array<{if?: string[], then?: string[]}>, facts?: string[], denials?: string[], query?: string, conductances?: Array<[string,string,number]>}} request
 * @returns {string[]} every attribute named anywhere in the request
 */
export function deriveAttributeUniverse({ rules, facts = [], denials = [], query, conductances = [] }) {
  const attrs = new Set();
  for (const r of rules) {
    for (const a of r.if ?? []) attrs.add(a);
    for (const a of r.then ?? []) attrs.add(a);
  }
  for (const f of facts) attrs.add(f);
  for (const f of denials) attrs.add(f);
  for (const [a, b] of conductances) { attrs.add(a); attrs.add(b); }
  if (query) attrs.add(query);
  return [...attrs];
}

/**
 * Validates and normalizes one derive-verdict input into an infer()-ready
 * request.
 * @param {unknown} input the parsed JSON input
 * @returns {{rules: object[], facts: string[], denials: string[], query: string, conductances: Array<[string,string,number]>, attributes: string[]}}
 * @throws {Error} with `.code = "malformed-input"` when the shape is wrong
 */
export function deriveVerdictRequest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throwMalformed("input must be one JSON object");
  const { rules, facts = [], denials = [], query, conductances = [], attributes } = input;
  if (!Array.isArray(rules)) throwMalformed("input requires a rules array");
  if (typeof query !== "string" || query.trim() === "") throwMalformed("input requires a query attribute");
  const request = { rules, facts, denials, query, conductances };
  return { ...request, attributes: attributes ?? deriveAttributeUniverse(request) };
}

/**
 * Runs the kernel's exact derivation over one request and returns infer()'s
 * result: verdict, witness DAGs, refusal number, and typed questions.
 * @param {unknown} input the parsed JSON input
 * @returns {ReturnType<typeof infer>}
 * @throws {Error} with `.code = "malformed-input"` when the shape is wrong
 */
export function deriveVerdict(input) {
  const request = deriveVerdictRequest(input);
  const engine = makeInference({ attributes: request.attributes, rules: request.rules });
  return infer(engine, {
    facts: request.facts,
    denials: request.denials,
    query: request.query,
    conductances: request.conductances,
  });
}

function throwMalformed(message) {
  const error = new Error(message);
  error.code = "malformed-input";
  throw error;
}

/** The runnable declaration: javascript-node's runJavascriptNodeOperationModule executes it. */
export const command = jsonCommand({ help: HELP, errorCode: "derivation-error", execute: (input, parsed) => deriveVerdict(input) });

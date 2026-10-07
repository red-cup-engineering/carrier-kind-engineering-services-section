// Thin CLI over src/learn.mjs: reads one incidence corpus (stdin or a file
// argument) and prints both learned masses -- the proof-grade exact basis
// and the predictive-grade weighted rules. All induction logic stays in
// src/learn.mjs.

import { jsonCommand } from "./json-command.mjs";
import { induceBasis, learnedImplications, induceWeightedImplications } from "@red-cup-engineering/signcraft/inference/learn";

const HELP = `Usage: induce-implications.mjs [corpus.json]

Reads {objects, attributes, pairs, weightedOptions?} as JSON from the given
file, or from stdin when no file is given, and prints the learned mass as
JSON on stdout.

  objects         object ids (required)
  attributes      the attribute universe (required)
  pairs           [[object, attribute], ...] witnessed incidence (required)
  weightedOptions  { minSupport?, minConfidence?, maxRules? } (optional)

Output: {"exact": learnedImplications, "weighted": induceWeightedImplications}

Exit 0 with {"ok":true,"result":...} on success.
Exit 1 with {"ok":false,"refusal":{"code":...,"message":...}} on refusal.

  --help, -h    print this text and exit
`;

/**
 * Validates and normalizes one induce-implications input.
 * @param {unknown} input the parsed JSON input
 * @returns {{objects: string[], attributes: string[], pairs: Array<[string,string]>, weightedOptions: object}}
 * @throws {Error} with `.code = "malformed-input"` when the shape is wrong
 */
export function induceImplicationsRequest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throwMalformed("input must be one JSON object");
  const { objects, attributes, pairs, weightedOptions = {} } = input;
  if (!Array.isArray(objects) || !Array.isArray(attributes) || !Array.isArray(pairs)) {
    throwMalformed("input requires objects, attributes, and pairs arrays");
  }
  return { objects, attributes, pairs, weightedOptions };
}

/**
 * Induces both learned masses from one incidence corpus: the exact
 * Duquenne-Guigues basis (learnedImplications) and the soft, support/
 * confidence-weighted rules (induceWeightedImplications).
 * @param {unknown} input the parsed JSON input
 * @returns {{exact: ReturnType<typeof learnedImplications>, weighted: ReturnType<typeof induceWeightedImplications>}}
 * @throws {Error} with `.code = "malformed-input"` when the shape is wrong
 */
export function induceImplications(input) {
  const request = induceImplicationsRequest(input);
  const { ctx, basis } = induceBasis(request.objects, request.attributes, request.pairs);
  return {
    exact: learnedImplications(ctx, basis, request.pairs),
    weighted: induceWeightedImplications(request.pairs, request.weightedOptions),
  };
}

function throwMalformed(message) {
  const error = new Error(message);
  error.code = "malformed-input";
  throw error;
}

/** The runnable declaration: javascript-node's runJavascriptNodeOperationModule executes it. */
export const command = jsonCommand({ help: HELP, errorCode: "induction-error", execute: (input, parsed) => induceImplications(input) });

// Thin CLI over src/algebra.mjs and src/network.mjs: reads an input
// relation X and a target relation Y over FOUR lanes, trains the two-layer
// residuated stack by alternating residuation (no gradients), and prints
// the learned weights, the convergence receipt, and the exactness of the
// reproduction X⊗W1⊗W2 against Y. All algebra stays in src/.

import { jsonCommand } from "./json-command.mjs";
import { makeRel, compose, relLeq } from "@red-cup-engineering/signcraft/inference/algebra";
import { trainTwoLayer, relEq } from "@red-cup-engineering/signcraft/inference/network";

const HELP = `Usage: train-residuated-network.mjs [corpus.json]

Reads {rows, inputs, outputs, x, y, maxIters?} as JSON from the given
file, or from stdin when no file is given.

  rows      object ids shared by X and Y (required)
  inputs    X's column alphabet (required)
  outputs   Y's column alphabet (required)
  x         {pos: [[row, input], ...], neg: [[row, input], ...]}
  y         {pos: [[row, output], ...], neg: [[row, output], ...]}
  maxIters  bound on alternating-residuation rounds, default 16

Output: {"W1": {rows, cols, pos, neg}, "W2": {...},
         "iters", "converged", "exact": boolean (X⊗W1⊗W2 equals Y),
         "sound": boolean (X⊗W1⊗W2 ≤ Y — never asserts beyond the target)}

Exit 0 with {"ok":true,"result":...} on success.
Exit 1 with {"ok":false,"refusal":{"code":...,"message":...}} on refusal.

  --help, -h   print this text and exit
`;

function relOf(spec, rows, cols, name) {
  if (!spec || typeof spec !== "object") throwMalformed(`${name} must be {pos, neg}`);
  const pos = spec.pos ?? [];
  const neg = spec.neg ?? [];
  if (!Array.isArray(pos) || !Array.isArray(neg)) throwMalformed(`${name}.pos and ${name}.neg must be arrays`);
  return makeRel(rows, cols, pos, neg);
}

function plain(R) {
  return { rows: R.rows, cols: R.cols, pos: [...R.pos].map((k) => k.split(" ")), neg: [...R.neg].map((k) => k.split(" ")) };
}

export function trainResiduatedNetworkRequest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throwMalformed("input must be one JSON object");
  const { rows, inputs, outputs, x, y, maxIters = 16 } = input;
  if (!Array.isArray(rows) || !Array.isArray(inputs) || !Array.isArray(outputs)) {
    throwMalformed("input requires rows, inputs, and outputs arrays");
  }
  if (!Number.isInteger(maxIters) || maxIters < 1) throwMalformed("maxIters must be a positive integer");
  return { rows, inputs, outputs, X: relOf(x, rows, inputs, "x"), Y: relOf(y, rows, outputs, "y"), maxIters };
}

export function trainResiduatedNetwork(input) {
  const r = trainResiduatedNetworkRequest(input);
  const { W1, W2, iters, converged } = trainTwoLayer(r.X, r.Y, { maxIters: r.maxIters });
  const Yhat = compose(compose(r.X, W1), W2);
  return { W1: plain(W1), W2: plain(W2), iters, converged, exact: relEq(Yhat, r.Y), sound: relLeq(Yhat, r.Y) };
}

function throwMalformed(message) {
  const error = new Error(message);
  error.code = "malformed-input";
  throw error;
}

/** The runnable declaration: javascript-node's runJavascriptNodeOperationModule executes it. */
export const command = jsonCommand({ help: HELP, errorCode: "training-error", execute: (input, parsed) => trainResiduatedNetwork(input) });

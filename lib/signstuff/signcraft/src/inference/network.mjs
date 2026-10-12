// Stacked residuated network: layers alternate compose (X⊗W_i, ./algebra.mjs)
// with an optional nucleus activation. Training is alternating residuation —
// each layer's weight is solved by the exact adjoint of compose, never a
// gradient — and for consistent data (the target is realizable) it is
// relational-equation solving: iterate the two adjoints to a fixed point.

import { compose, residualLeft, residualRight, relLeq, supportCols, restrictRows } from "./algebra.mjs";

/**
 * Run a relation forward through a stack of layers.
 * @param {object} X input relation
 * @param {Array<{W: object, activation?: (r: object) => object}>} layers
 * @returns {object[]} activation at each stage: [X, H1, H2, ..., Y]
 */
export function forward(X, layers) {
  const acts = [X];
  let cur = X;
  for (const { W, activation } of layers) {
    cur = compose(cur, W);
    if (activation) cur = activation(cur);
    acts.push(cur);
  }
  return acts;
}

/**
 * Two relations agree exactly (both lanes, both directions of ≤).
 * @param {object} A
 * @param {object} B
 * @returns {boolean}
 */
export function relEq(A, B) {
  return relLeq(A, B) && relLeq(B, A);
}

/**
 * Train a 2-layer stack (X⊗W1)⊗W2 ≈ Y by alternating residuation: solve W2
 * from the current hidden activity, pull the hidden TARGET back through W2
 * via the right adjoint, then resolve W1 from that target. Each half-step is
 * the greatest lawful weight on the WITNESSED directions (a theorem) and ⊥
 * on the unwitnessed ones: a weight row for an input column no training
 * row ever bore is unknown, never the vacuous ⊤ — otherwise an unseen
 * input at test time composes through as true for every output. The pair
 * sequence is monotone non-increasing per lane on a finite lattice —
 * bounded iteration either reaches a fixed point or exhausts maxIters.
 * @param {object} X input relation
 * @param {object} Y target relation
 * @param {{maxIters?: number}} [opts]
 * @returns {{W1: object, W2: object, iters: number, converged: boolean}}
 */
export function trainTwoLayer(X, Y, { maxIters = 16 } = {}) {
  const xSupport = supportCols(X);
  let W2 = residualLeft(X, Y);
  let W1 = restrictRows(residualLeft(X, residualRight(Y, W2)), xSupport);
  let iters = 1;
  let converged = false;
  for (; iters < maxIters; iters++) {
    const H = compose(X, W1);
    const nextW2 = restrictRows(residualLeft(H, Y), supportCols(H));
    const Htarget = residualRight(Y, nextW2);
    const nextW1 = restrictRows(residualLeft(X, Htarget), xSupport);
    if (relEq(nextW1, W1) && relEq(nextW2, W2)) {
      W1 = nextW1; W2 = nextW2;
      converged = true;
      break;
    }
    W1 = nextW1; W2 = nextW2;
  }
  return { W1, W2, iters, converged };
}

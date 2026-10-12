/**
 * sigma-pass (σ-pass) — tensor resolution of contested cells.
 *
 * For each cell in the contested set (output of δ-pass), tensors ⊤ with the
 * new datum using the twist-product tensor ⊙ (Busaniche–Cignoli 2014):
 *
 *   (a₁,a₂) ⊙ (b₁,b₂) = (a₁∧b₁,  (¬a₁∨b₂)∧(¬b₁∨a₂))
 *
 * Since ⊤=(1,1) is ⊙-identity: ⊤⊙datum = datum for any datum.
 * Since f=(0,1) is ⊙-absorber:  datum⊙f = f for any datum.
 *
 * The σ-pass produces a new positing-entry at each contested cell with value
 * = datum (the resolution). State change from f to t is possible only via ⊤:
 * the Δ-pass accumulates assertion onto a denial cell → value reaches ⊤,
 * then σ-pass resolves ⊤ to datum. f cannot be extended in a single step
 * because f is absorber — f⊙anything = f (no direct override of refutation).
 *
 * Input:  { contested: Array<{e,a,v}>, datum: {pos,neg}, t: string }
 * Output: Array<{ class: string, entry: {e,a,v,t} }> — new positing-entries
 */

import { positing } from '#settling/library/positing/scripts/positing.mjs';

/**
 * Twist-product tensor ⊙ on FOUR.
 * @param {{ pos: boolean, neg: boolean }} a
 * @param {{ pos: boolean, neg: boolean }} b
 * @returns {{ pos: boolean, neg: boolean }}
 */
function tensor(a, b) {
  return {
    pos: a.pos && b.pos,
    neg: (!a.pos || b.neg) && (!b.pos || a.neg),
  };
}

const TOP = { pos: true, neg: true };

/**
 * @param {{ contested: Array<{e: string, a: string, v: string}>, datum: { pos: boolean, neg: boolean }, t: string }} input
 * @returns {Array<{ class: string, entry: { e: string, a: string, v: string, t: string } }>}
 */
export function sigmaPass({ contested, datum, t }) {
  const resolved = tensor(TOP, datum);
  const newEntries = [];

  for (const cell of contested) {
    const result = positing({
      cell: { subject: cell.e, predicate: cell.a, object: cell.v },
      datum: resolved,
      t,
    });
    newEntries.push(result);
  }

  return newEntries;
}

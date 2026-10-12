/**
 * perlocution — closure-rule firing to the Knaster–Tarski least fixed point.
 *
 * This is the third step of the Austin–Searle factorization (locution →
 * illocution → perlocution). After positing has placed a new entry into the
 * log (illocution), the perlocution fires all closure rules and iterates the
 * σ∘Δ cycle until no new positing-entries are produced.
 *
 * Convergence is guaranteed by Knaster–Tarski (1955): the σ∘Δ cycle is a
 * monotone operator on the complete lattice (positing-log ordered by ≤ₖ).
 * Each cycle can only ADD entries (never remove), so the sequence is
 * ≤ₖ-ascending and bounded above → it reaches a least fixed point in at most
 * 2n steps for n distinct cells (Belnap 1977: each cell traverses at most
 * ⊥ → {t or f} → ⊤ → {t or f}, four transitions maximum per cell pair).
 *
 * Input:  { entries: {assertions, denials, contestations, abstentions}, datum, t, maxSteps? }
 * Output: { entries: {assertions, denials, contestations, abstentions}, steps: number }
 */

import { deltaPass } from '#settling/library/perlocution/library/sigma-delta-cycle/library/delta-pass/scripts/delta-pass.mjs';
import { sigmaPass } from '#settling/library/perlocution/library/sigma-delta-cycle/library/sigma-pass/scripts/sigma-pass.mjs';

const US = '\x1f';
const entryKey = (row) => `${row.e}${US}${row.a}${US}${row.v}${US}${row.t}`;

/**
 * @param {{
 *   entries: { assertions: object[], denials: object[], contestations: object[], abstentions: object[] },
 *   datum: { pos: boolean, neg: boolean },
 *   t: string,
 *   maxSteps?: number
 * }} input
 * @returns {{ entries: { assertions: object[], denials: object[], contestations: object[], abstentions: object[] }, steps: number }}
 */
export function perlocution({ entries, datum, t, maxSteps = 1024 }) {
  let current = {
    assertions: [...entries.assertions],
    denials: [...entries.denials],
    contestations: [...entries.contestations],
    abstentions: [...entries.abstentions],
  };

  const seen = {
    assertion: new Set(current.assertions.map(entryKey)),
    denial: new Set(current.denials.map(entryKey)),
    contestation: new Set(current.contestations.map(entryKey)),
    abstention: new Set(current.abstentions.map(entryKey)),
  };

  let steps = 0;
  while (steps < maxSteps) {
    const contested = deltaPass(current);
    if (contested.length === 0) break;

    const newPositings = sigmaPass({ contested, datum, t });
    let novel = false;

    for (const { class: cls, entry } of newPositings) {
      const k = entryKey(entry);
      if (!seen[cls].has(k)) {
        seen[cls].add(k);
        current[`${cls}s`].push(entry);
        novel = true;
      }
    }

    if (!novel) break;
    steps++;
  }

  return { entries: current, steps };
}

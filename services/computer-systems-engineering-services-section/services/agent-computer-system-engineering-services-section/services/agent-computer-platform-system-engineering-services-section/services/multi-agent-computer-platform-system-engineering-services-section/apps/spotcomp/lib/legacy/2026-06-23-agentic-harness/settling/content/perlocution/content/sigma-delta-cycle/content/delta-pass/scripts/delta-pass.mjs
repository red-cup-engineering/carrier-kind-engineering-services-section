/**
 * delta-pass (Δ-pass) — evidence accumulation via knowledge-join.
 *
 * Reads the positing-log, projects a bilattice value at each distinct cell
 * by computing the ≤ₖ-join (componentwise max on (pos,neg)) over all entries
 * at that cell. Returns the set of cells whose projected value is ⊤=(1,1),
 * i.e., cells where both assertion and denial exist — these require σ-pass.
 *
 * This is a READ-ONLY pass: it produces no new positing-entries itself.
 * It is the operator whose monotonicity (Belnap 1977, Knaster–Tarski 1955)
 * guarantees that the σ∘Δ cycle converges to a least fixed point.
 *
 * Input:  { entries: { assertions, denials, contestations, abstentions } }
 *         where each array contains eavt-rows {e,a,v,t}
 * Output: contested cells as Array<{e,a,v}> — cells with projected value ⊤
 */

/**
 * @param {{ pos: boolean, neg: boolean }} a
 * @param {{ pos: boolean, neg: boolean }} b
 * @returns {{ pos: boolean, neg: boolean }}
 */
function kJoin(a, b) {
  return { pos: a.pos || b.pos, neg: a.neg || b.neg };
}

/**
 * @param {{ assertions: Array<{e,a,v,t}>, denials: Array<{e,a,v,t}>, contestations: Array<{e,a,v,t}>, abstentions: Array<{e,a,v,t}> }} entries
 * @returns {Array<{e: string, a: string, v: string}>} cells with projected value ⊤
 */
export function deltaPass({ assertions = [], denials = [], contestations = [], abstentions = [] }) {
  const cells = new Map();
  const key = (row) => `${row.e}\x1f${row.a}\x1f${row.v}`;

  const bottom = { pos: false, neg: false };
  const get = (k) => cells.get(k) ?? { ...bottom };

  for (const row of assertions) {
    const k = key(row);
    cells.set(k, kJoin(get(k), { pos: true, neg: false }));
  }
  for (const row of denials) {
    const k = key(row);
    cells.set(k, kJoin(get(k), { pos: false, neg: true }));
  }
  for (const row of contestations) {
    const k = key(row);
    cells.set(k, kJoin(get(k), { pos: true, neg: true }));
  }

  const contested = [];
  for (const [k, value] of cells) {
    if (value.pos && value.neg) {
      const [e, a, v] = k.split('\x1f');
      contested.push({ e, a, v });
    }
  }
  return contested;
}

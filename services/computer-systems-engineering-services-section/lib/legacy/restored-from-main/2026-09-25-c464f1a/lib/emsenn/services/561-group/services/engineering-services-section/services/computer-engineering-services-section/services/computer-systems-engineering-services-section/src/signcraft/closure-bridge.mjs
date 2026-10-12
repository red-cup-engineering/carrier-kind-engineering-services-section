// closure-bridge.mjs — the floor's settle IS the general closure morphism at finite κ.
//
// `settle` (this package's descent) iterates the knowledge closure ◇_k∘□_k to its least fixed point —
// i.e. it runs EXACTLY the transfinite closure iteration metrologic's `closure/src/iterate.mjs` defines,
// but always halts at a finite stage. We expose its closure as a (lattice, phi) pair so
// `closureOrdinal(fromBilattice(positedCategory))` (metrologic's `closure/src/closure.mjs`, applied here)
// recovers settle's depth as κ — a witness that settle is the finite-regime (κ < ω) restriction of the
// general closure morphism. This lived beside metrologic's other (lattice, phi) witnesses
// (`closure/src/lattices.mjs`: `reachability`, `omegaPlusOne`, `tower`) until the descent it bridges to
// (`commutate`/`possibilizeKnowledge`/`necessitateKnowledge`/`lastValuation`/`settle`) moved here; those
// three sibling witnesses need no Sign carrier and stay in metrologic.
import { leqKnowledge, joinKnowledge } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { stabilizingSup } from "@lenticule-science/metrologic/closure/iterate";
import { commutate, possibilizeKnowledge, necessitateKnowledge, lastValuation, settle } from "./descent.mjs";

const S = (x) => JSON.stringify(x);
const cells = (v) => v["fiber-algebras"].flatMap((fa) => fa.assignments);

/**
 * The closure of a posited category as a (lattice, phi) pair. `category` is a `posit` result
 * (`{ presheaf, traces }`); Φ runs one knowledge-closure round; the closure ordinal is settle's depth.
 * @param {{ presheaf: object, traces: object[] }} category
 * @returns {{ lattice: object, phi: (v:object)=>object, settledValuation: object }}
 */
export function fromBilattice(category) {
  const { saturated: presheaf, residue: traces } = commutate(category);
  const wrap = (v) => ({ presheaf, traces: [{ valuations: [v] }] });
  const bottom = traces[0].valuations[0];          // the value-free posited section
  const phi = (v) => lastValuation(possibilizeKnowledge(necessitateKnowledge(wrap(v)))); // ◇_k∘□_k, one round
  const lattice = {
    bottom,
    eq: (a, b) => S(a) === S(b),                    // settle's own fixed-point test
    // ≤_k pointwise: every cell of `a` carries no more knowledge than the matching cell of `b`.
    leq: (a, b) => { const cb = cells(b); return cells(a).every((ca, i) => leqKnowledge(ca.charge, cb[i].charge)); },
    // the knowledge-join valuation, cell-by-cell (structure shared, so we zip the assignment lists).
    join: (a, b) => ({
      ...a,
      "fiber-algebras": a["fiber-algebras"].map((fa, j) => ({
        ...fa,
        assignments: fa.assignments.map((asg, i) => ({
          cell: asg.cell,
          charge: joinKnowledge(asg.charge, b["fiber-algebras"][j].assignments[i].charge),
        })),
      })),
    }),
    sup: null,
  };
  lattice.sup = stabilizingSup(lattice);            // settle terminates ⇒ the closure chain stabilizes
  return { lattice, phi, settledValuation: settle(category).sheaf.section };
}

import { charge, chargeValue, chargeValueName, valueOf } from "@red-cup-engineering/metrologic/articulation/predicating/positing/bilattice-charge";
// consensus.mjs — multi-observer settling & consensus over the shared trace.
//
// The corpus's consensus note (computer/docs/dev/notes/multi-observer-settling-and-consensus.md) gives
// the object and the theorem. A swarm is a MULTI-OBSERVER SYSTEM V : O → Settlings — each worker is an
// observer, its local settling is its fold of the shared trace. The network-sheaf-consensus theorem
// (status PROVED in the corpus) then says:
//   • CONSENSUS = the limit = H⁰ = "the maximum information shared by all agents," computed pointwise
//     as the bilattice KNOWLEDGE-MEET ⋀_k of the observers' values.
//   • DISAGREEMENT = the cellwise knowledge-JOIN ⋁_k "produces ⊤-content at cells where two or more
//     agents have (t,f)-disagreeing values." Paraconsistency arises EXACTLY at the disagreement loci.
//   • CRDT/CALM coordination-freeness: the merge IS the disagreement detector — no lock, no clock, no
//     resolver. The disagreement is a first-class HELD value (⊤), never resolved away.
//
// The note's §4 maps this onto THIS machine: "the OS need not COMPUTE a separate consensus object — it
// is the limit, available on demand." So this module does not build a consensus protocol; it READS the
// consensus (the meet) and the disagreement (the join) off the per-observer folds of the trace. It
// rides the kernel charge ops (meetKnowledge = the limit, joinKnowledge = the disagreement join) and
// the eavt-chu Chu space already in swarm (each observer's term is a point; a proposition is a state).

import { joinKnowledge, meetKnowledge, present } from "@red-cup-engineering/metrologic/articulation/predicating/positing/bilattice-charge";


import { memoryChu, propositionColumn, ABSURD } from "./eavt-chu.mjs";

// observerConsensus(root, observers, options) — read the consensus and disagreement over a set of
// observer terms (each a subject in EAVT memory — a worker's recorded view). For every proposition any
// observer holds, the CONSENSUS is the knowledge-meet of the observers' charges (H⁰, what all share)
// and the DISAGREEMENT is the knowledge-join (⊤ at the loci where observers conflict). Both are read
// off the eavt-chu Chu space — no separate consensus object is computed, exactly as the note says.
export function observerConsensus(root, observers, options = {}) {
  const space = memoryChu(root, observers, options);
  const rows = space.states.map((state) => {
    const column = propositionColumn(space, state);
    // the limit (consensus): knowledge-meet of every observer's charge on this proposition.
    const consensus = column.reduce((acc, cell) => meetKnowledge(acc, cell.charge), topCharge());
    // the join (disagreement detector): knowledge-join — ⊤ exactly where observers (t,f)-disagree.
    const join = column.reduce((acc, cell) => joinKnowledge(acc, cell.charge), ABSURD);
    const [jpos, jneg] = present(join);
    return {
      proposition: space.labelOf(state),
      consensus,
      consensusValue: chargeValueName(valueOf(consensus)),
      join,
      joinValue: chargeValueName(valueOf(join)),
      disagreed: jpos.name === "present" && jneg.name === "present",          // ⊤: a held disagreement at this cell (paraconsistent witness)
      observers: column.map((cell) => ({ observer: cell.point, value: cell.value })),
    };
  });
  return Object.freeze({
    kind: "swarm.consensus",
    observers: [...space.points],
    cells: rows,
    // the shared section (H⁰): the propositions every observer affirms (consensus reads t).
    shared: rows.filter((r) => r.consensusValue === "potential").map((r) => r.proposition),
    // the disagreement section (the ⊤-content of the join): where the swarm holds a contradiction.
    disagreements: rows.filter((r) => r.disagreed).map((r) => ({ proposition: r.proposition, observers: r.observers })),
  });
}

// the knowledge-top charge ⊤_k (identity of meetKnowledge): both bits set, no evidence. The meet of an
// empty column is ⊤_k, so a proposition no observer touches contributes nothing to the consensus floor.
function topCharge() {
  return charge(chargeValue("stable"));
}

// consensusReady(consensus, propositions) — a swarm-domain gate: is the consensus SUFFICIENT to act,
// i.e. does every required proposition sit in the shared section (consensus = t) with NO standing
// disagreement (⊤)? Returns a FOUR-style verdict the dispatch path can fold in: t when all shared and
// undisputed, ⊤ when a required proposition is disagreed (held, surfaced), f when one is denied/absent.
export function consensusReady(consensus, propositions = []) {
  const required = [].concat(propositions ?? []).map((p) => JSON.stringify(p));
  const byKey = new Map(consensus.cells.map((c) => [JSON.stringify(c.proposition), c]));
  if (!required.length) return { value: consensus.disagreements.length ? "stable" : "potential", reason: "no required propositions; consensus open" };
  for (const key of required) {
    const cell = byKey.get(key);
    if (!cell) return { value: "absurd", reason: `required proposition ${key} unwitnessed by any observer` };
    if (cell.disagreed) return { value: "stable", reason: `required proposition ${key} stands in disagreement (held ⊤)` };
    if (cell.consensusValue !== "potential") return { value: "active", reason: `required proposition ${key} not shared by all observers` };
  }
  return { value: "potential", reason: "every required proposition is shared and undisputed" };
}

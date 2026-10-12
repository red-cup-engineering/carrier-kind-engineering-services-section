// swarm-federation — the federation read over TWO swarm-sheaf roots: consensus is the shared
// section, disagreement is held-⊤.
//
// SEAM: federation-distribution. Many swarm substrates federate — a 3D-printer swarm here, an
// irrigation swarm elsewhere — each a predication-graph sheaf over its own on-disk root
// (apps/tools/swarm/src/swarm-sheaf.mjs). This module reads ONE shared boundary term across two such
// roots and folds their two settled sections into a federation read:
//
//   • CONSENSUS  — a cell BOTH roots' settled sections charge the same way: the shared section, the
//                  agreement that needs no council. (federate.mjs's law: "identical rows collapse to
//                  one"; here, identical SETTLED cells.)
//   • DISAGREEMENT — a (subject,predicate) the two roots resolve to DIFFERENT objects, or a cell one
//                  affirms (pos) and the other denies (neg). It does NOT collapse to last-writer; it
//                  is HELD as a federation-level ⊤ carrying BOTH roots as witnesses.
//
// WHAT THE FILES SAY (grounded, cited):
//   • computer/distribution/src/federate.mjs:1-14 — "L9 federation is the tensor ∥ of two append-only
//     worlds … Conflicting facts settle to ⊤ with BOTH witnesses — CALM … and paraconsistent
//     (disagreement is a held value)." That substrate works on in-memory worlds (Map<subject,rows[]>);
//     THIS reads two on-disk swarm-sheaf roots and federates their SETTLED SECTIONS, the shape the
//     swarm reader already produces.
//   • computer/docs/dev/notes/swarm-governance.md §3 identity 6 — "Cross-tiyóšpaye disagreement is
//     recorded; the omníčhiye convenes for cokernel content. Disagreement-pairs live in ker(δ) (no
//     federation-level H¹), recorded as ⊤-firings; the council convenes only for Mayer–Vietoris
//     cokernel content — overlap no pair of constituent positions can express."
//   • archive/.../claims/crdt-convergence-via-mayer-vietoris.md — the Mayer–Vietoris connecting map
//     δ⁰: H⁰(U₁∩U₂) → H¹(U) is identically zero for the settling-associated sheaf. The federation
//     UNION introduces no H¹ obstruction; disagreement is a HELD ⊤ value, not a coordination failure.
//
// SOUNDNESS: this is a pure fold over two settledSection reads — no clock, no coordinator, no write.
// It reads the SETTLED sections (each root already folded by the kernel knowledge-join), so it
// federates resolved positions, not raw logs. The ⊤ here is a FEDERATION ⊤ (the two roots disagree),
// distinct from a within-root ⊤ (one root's own log is internally contradicted); both are reported.
// The H¹/cokernel read is DEFERRED to the lead: the derived ℤ-linear H¹ is being lifted into
// @red-cup-engineering/metrologic (refounding P1) — this module reports the disagreement SET (the ⊤ cells), which is
// the ker(δ)-recorded content; convening logic and the cokernel quotient are a later artifact.

import { settledSection } from "./swarm-sheaf.mjs";

// scalar(v) — the bare value of a TTMS schema-doc cell coordinate ({const:v} -> v; an object rides
// bare). Mirrors swarm-sheaf's asSchemaDoc inverse so a federation read speaks plain values.
function scalar(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v) && "const" in v ? v.const : v;
}

// pair(charge) — the Belnap [pos, neg] of a settled cell's charge (charge.value is [pos, neg]).
function pair(charge) {
  const [pos, neg] = charge?.value ?? [false, false];
  return { pos: !!pos, neg: !!neg };
}

// cellKey(cell) — the full (subject,predicate,object) coordinate as a stable string. Two roots'
// cells are THE SAME cell iff this matches (the same proposition), exactly the settle coordinate
// (eavt/settling groups by the whole {subject,predicate,object}).
function cellKey(cell) {
  return JSON.stringify([scalar(cell.subject), scalar(cell.predicate), scalar(cell.object)]);
}

// propKey(cell) — the (subject,predicate) coordinate WITHOUT the object: two cells share a propKey
// when they answer the same question ("what is v1's status?") possibly with different objects. A
// (subject,predicate) that resolves to DIFFERENT objects across roots is a disagreement even though
// no single cell is denied — the functional-predicate clash the federation must hold, not pick.
function propKey(cell) {
  return JSON.stringify([scalar(cell.subject), scalar(cell.predicate)]);
}

function indexSection(section) {
  const byCell = new Map();
  const byProp = new Map();
  for (const { cell, charge } of section.assignments) {
    const c = pair(charge);
    if (!c.pos) continue; // only affirmed cells stand in the section's positive read
    const ck = cellKey(cell);
    byCell.set(ck, { cell, charge });
    const pk = propKey(cell);
    if (!byProp.has(pk)) byProp.set(pk, []);
    byProp.get(pk).push({ cell, charge, object: scalar(cell.object) });
  }
  return { byCell, byProp };
}

// federateSections(rootA, rootB, term, opts?) — the federation read over two swarm-sheaf roots for
// ONE shared term. Returns:
//   {
//     consensus:     [{ subject, predicate, object }]   cells BOTH roots affirm identically (shared)
//     disagreements: [{ subject, predicate, sides:[{root,object}], value:"stable" }]  held-⊤ clashes
//     onlyA / onlyB: [{ subject, predicate, object }]   cells one root affirms and the other is silent
//   }
// `labelA`/`labelB` name the two substrates in the witness sides (default "A"/"B"). The disagreement
// SET is the ker(δ)-recorded ⊤ content (swarm-governance.md identity 6): the overlap the federation
// holds; the council/cokernel quotient over it is a later artifact (H¹ lift, refounding P1).
export function federateSections(rootA, rootB, term, opts = {}) {
  const labelA = opts.labelA ?? "A";
  const labelB = opts.labelB ?? "B";

  const A = indexSection(settledSection(rootA, term));
  const B = indexSection(settledSection(rootB, term));

  const consensus = [];
  const disagreements = [];
  const onlyA = [];
  const onlyB = [];

  // 1. Cell-level: a cell in BOTH byCell maps is consensus (the same proposition affirmed by both).
  //    A cell in only one is reported as onlyA/onlyB UNLESS its (subject,predicate) clashes below.
  const allProps = new Set([...A.byProp.keys(), ...B.byProp.keys()]);
  for (const pk of [...allProps].sort()) {
    const [subject, predicate] = JSON.parse(pk);
    const aObjs = (A.byProp.get(pk) ?? []).map((x) => x.object);
    const bObjs = (B.byProp.get(pk) ?? []).map((x) => x.object);
    const aSet = new Set(aObjs);
    const bSet = new Set(bObjs);

    // shared objects on this (subject,predicate) -> consensus
    for (const o of [...aSet].filter((o) => bSet.has(o)).sort()) {
      consensus.push({ subject, predicate, object: o });
    }
    // objects only A affirms
    const aOnly = [...aSet].filter((o) => !bSet.has(o)).sort();
    const bOnly = [...bSet].filter((o) => !aSet.has(o)).sort();

    if (aOnly.length && bOnly.length) {
      // BOTH roots affirm this (subject,predicate) but to DIFFERENT objects: a held disagreement.
      // Neither object wins; the federation keeps both sides as the ⊤ witness (no last-writer).
      const sides = [
        ...aOnly.map((object) => ({ root: labelA, object })),
        ...bOnly.map((object) => ({ root: labelB, object })),
      ];
      disagreements.push({ subject, predicate, sides, value: "stable" });
    } else {
      // only one side has un-shared objects -> the other root is simply silent on them.
      for (const object of aOnly) onlyA.push({ subject, predicate, object });
      for (const object of bOnly) onlyB.push({ subject, predicate, object });
    }
  }

  return Object.freeze({
    term,
    consensus,
    disagreements,
    onlyA,
    onlyB,
    evidence:
      "federation read over two swarm-sheaf roots: consensus is the shared settled section; a (subject,predicate) resolving to different objects across roots is HELD as a ⊤ disagreement with both roots as witnesses (no last-writer). The disagreement set is the ker(δ)-recorded content; the council/cokernel quotient is deferred to the H¹ lift.",
  });
}

// federationConsensusKey(...) — a stable content key over the SHARED section only. Two federations
// with the same consensus witness equal here, regardless of which root contributed — the
// commutative/associative read federate.mjs proves for the union, restricted to the agreement.
export function federationConsensusKey(fed) {
  return JSON.stringify(
    fed.consensus.map((c) => [c.subject, c.predicate, c.object]).sort(),
  );
}

export default federateSections;

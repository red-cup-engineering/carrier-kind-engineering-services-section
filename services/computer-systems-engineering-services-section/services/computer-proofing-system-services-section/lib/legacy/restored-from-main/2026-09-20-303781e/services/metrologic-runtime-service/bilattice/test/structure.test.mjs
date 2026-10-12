// structure — property tests for the relational/structural morphisms (cohere, estrange, precipitate, compare) on
// RANDOM inputs run through the real morphisms. Asserts the defining property of each (transitive closure, the
// complement, path composition, the partition) rather than a hand-built case with a baked answer.
//
// Ported from @561/development.active.math-kernel's tests/structure.mjs (6 checks), retargeted at
// @lenticule-science/metrologic/bilattice's named exports (cohere/compare live in ../src/descent.mjs, estrange/precipitate in
// ../src/void.mjs, isTop in ../src/charge.mjs — the kernel had these flat in scripts/) and reshaped into discrete
// node:test cases. The math is unchanged.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cohere, compare } from "../src/descent.mjs";
import { estrange, precipitate } from "../src/void.mjs";
import { isTop } from "../src/charge.mjs";
import { id, charge } from "./_construct-utterance.mjs";
import { randomBytes } from "node:crypto";

const S = (x) => JSON.stringify(x);
const pair = (s, t) => S([s, t]);
const rbool = () => (randomBytes(1)[0] & 1) === 1;

// a random transfinite category: a few predicates with a random specialization relation.
const randCategory = () => {
  const preds = Array.from({ length: 4 }, () => id());
  const spec = [];
  for (const s of preds) for (const t of preds) if (s !== t && rbool() && rbool()) spec.push({ source: s, target: t });
  const predicateSet = { predicates: preds };
  const cellSet = { "entity-set": { entities: [] }, "predicate-set": predicateSet };
  return {
    preds, spec,
    cat: {
      "cell-set": cellSet,
      fiber: {
        "cell-set": cellSet, "entity-set": { entities: [] },
        base: { objects: predicateSet, specialization: spec, converse: [], "subject-projection": [], "object-projection": [] },
      },
    },
  };
};

const cats = Array.from({ length: 30 }, randCategory);

test("cohere: closure is transitive (a→b, b→c ⟹ a→c)", () => {
  assert.ok(cats.every(({ cat }) => {
    const e = cohere(cat).residue.base.specialization;
    const has = (s, t) => e.some((x) => pair(x.source, x.target) === pair(s, t));
    return e.every((ab) => e.every((cd) => pair(ab.target, "") !== pair(cd.source, "") || ab.source === cd.target || has(ab.source, cd.target)));
  }));
});
test("cohere: closure contains the original edges", () => {
  assert.ok(cats.every(({ cat, spec }) => {
    const e = cohere(cat).residue.base.specialization;
    const has = (s, t) => e.some((x) => pair(x.source, x.target) === pair(s, t));
    return spec.every((edge) => has(edge.source, edge.target));
  }));
});

// estrange is the complement of the closure within objects×objects: disjoint from it, and together they cover all.
test("estrange: apex ∪ closure = all pairs, and they are disjoint (the complement)", () => {
  assert.ok(cats.every(({ cat, preds }) => {
    const closed = cohere(cat).residue.base.specialization;
    const inClosed = (s, t) => closed.some((x) => pair(x.source, x.target) === pair(s, t));
    const apex = estrange(cat).apex;
    const inApex = (s, t) => apex.some((p) => pair(p.source, p.target) === pair(s, t));
    let covered = true, disjoint = true;
    for (const s of preds) for (const t of preds) {
      const c = inClosed(s, t), a = inApex(s, t);
      if (!(c || a)) covered = false; // every pair is in one
      if (c && a) disjoint = false; // none in both
    }
    return covered && disjoint;
  }));
});

// precipitate (aperiodic GFP): a composable pair yields a non-empty residue; a lone self-loop yields none.
const edge = (s, c, o) => ({ subject: s, predicate: c, object: o });
test("precipitate: composable edges (a,p,b)·(b,q,c) ⟹ residue [[p,q]]", () => {
  assert.equal(S(precipitate({ apex: [edge("a", "p", "b"), edge("b", "q", "c")] }).residue), S([["p", "q"]]));
});
test("precipitate: a lone self-loop has nothing to compose ⟹ empty residue", () => {
  assert.equal(precipitate({ apex: [edge("x", "p", "x")] }).residue.length, 0);
});

// compare PARTITIONS a section: paraconsistent = exactly the ⊤ (stable) cells, consistent = the rest, no overlap.
test("compare: partitions the section — paraconsistent = the ⊤ cells, consistent = the rest, disjoint & total", () => {
  const states = ["bot", "t", "f", "top"];
  const randSection = () => ({
    base: {},
    "fiber-algebras": [{
      assignments: Array.from({ length: 6 }, () => ({ cell: { c: id() }, charge: charge(states[randomBytes(1)[0] % 4]) })),
    }],
  });
  const sections = Array.from({ length: 30 }, randSection);
  assert.ok(sections.every((sec) => {
    const total = sec["fiber-algebras"][0].assignments.length;
    const { consistent, paraconsistent } = compare(sec);
    const con = consistent["fiber-algebras"][0].assignments, par = paraconsistent["fiber-algebras"][0].assignments;
    return con.length + par.length === total
      && par.every((a) => isTop(a.charge)) && con.every((a) => !isTop(a.charge));
  }));
});

// cochain — tests for the CONSTRUCTED cellular cochain complex of a settled relation
// (cohomologyOfRelation, settledRelation, cohomologyOf). Per cochain.mjs's own header: a settled
// relation is a directed graph on entities (each cell `{subject, predicate, object}` is an edge
// subject → object); H⁰ = ker δ⁰ is read as the graph's connected components, H¹ = coker δ⁰ is read as
// the first Betti number |cells| − |entities| + #components — computed by union–find, no linear algebra.
//
// These are hand-built graphs of known topology (empty / tree / cycle / disjoint union), so the
// expected Betti number is checked by hand against the combinatorial read.
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { cohomologyOfRelation, settledRelation, cohomologyOf } from "../src/cochain.mjs";
import { articulate, predicate, posit, settle } from "../../bilattice/src/descent.mjs";

const id = () => randomBytes(3).toString("hex");
const cell = (subject, predicate, object) => ({ subject, predicate, object });

test("cohomologyOfRelation: the empty relation — no entities, H⁰ = H¹ = 0", () => {
  const r = cohomologyOfRelation([]);
  assert.deepEqual(r.entities, []);
  assert.equal(r.H0.rank, 0);
  assert.equal(r.H1.rank, 0);
  assert.equal(r.H1.vanishes, true);
});

test("cohomologyOfRelation: a tree (acyclic, connected) — H⁰ = 1 component, H¹ = 0", () => {
  // a --p--> b, a --p--> c : 3 vertices, 2 edges, 1 component, Betti = E - V + C = 2 - 3 + 1 = 0
  const cells = [cell("a", "p", "b"), cell("a", "p", "c")];
  const r = cohomologyOfRelation(cells);
  assert.equal(r.entities.length, 3);
  assert.equal(r.H0.rank, 1);
  assert.equal(r.H1.rank, 0);
  assert.equal(r.H1.vanishes, true);
  // the H⁰ basis is the per-component indicator cochain — here, all-ones (one component)
  assert.deepEqual(r.H0.cocycles, [[1, 1, 1]]);
});

test("cohomologyOfRelation: a 3-cycle — H⁰ = 1 component, H¹ = 1 (one independent cycle)", () => {
  // a -> b -> c -> a : 3 vertices, 3 edges, 1 component, Betti = 3 - 3 + 1 = 1
  const cells = [cell("a", "p", "b"), cell("b", "p", "c"), cell("c", "p", "a")];
  const r = cohomologyOfRelation(cells);
  assert.equal(r.H0.rank, 1);
  assert.equal(r.H1.rank, 1);
  assert.equal(r.H1.vanishes, false);
});

test("cohomologyOfRelation: a single self-loop — 1 vertex, 1 edge is itself a cycle, H¹ = 1", () => {
  // a -> a : V=1, E=1, C=1, Betti = 1 - 1 + 1 = 1 — a self-loop is a nontrivial cycle
  const r = cohomologyOfRelation([cell("a", "p", "a")]);
  assert.equal(r.H0.rank, 1);
  assert.equal(r.H1.rank, 1);
  assert.equal(r.H1.vanishes, false);
});

test("cohomologyOfRelation: disjoint components combine additively — one cycle, one bare edge", () => {
  // {a<->b (a 2-cycle), d->e (a tree edge)}: V=4, E=3, C=2, Betti = 3 - 4 + 2 = 1
  const cells = [cell("a", "p", "b"), cell("b", "p", "a"), cell("d", "p", "e")];
  const r = cohomologyOfRelation(cells);
  assert.equal(r.entities.length, 4);
  assert.equal(r.H0.rank, 2, "two connected components");
  assert.equal(r.H1.rank, 1, "the a<->b 2-cycle is the only independent loop");
});

test("cohomologyOfRelation: H⁰'s indicator cocycles are constant on each component and disjoint", () => {
  const cells = [cell("a", "p", "b"), cell("d", "p", "e")];
  const r = cohomologyOfRelation(cells);
  assert.equal(r.H0.cocycles.length, 2);
  // each entity is covered by exactly one component's indicator
  for (let i = 0; i < r.entities.length; i++) {
    const coverage = r.H0.cocycles.reduce((n, cocycle) => n + cocycle[i], 0);
    assert.equal(coverage, 1);
  }
});

test("cohomologyOfRelation: δ⁰ is the signed incidence matrix — +1 at object, −1 at subject", () => {
  const r = cohomologyOfRelation([cell("a", "p", "b")]);
  const ai = r.entities.indexOf(JSON.stringify("a"));
  const bi = r.entities.indexOf(JSON.stringify("b"));
  assert.equal(r.d0[0][ai], -1);
  assert.equal(r.d0[0][bi], 1);
});

// ── the bilattice-backed reading: settledRelation / cohomologyOf ────────────────────────────────────

test("settledRelation: reads exactly the cells the descent settles to, as {subject,predicate,object}", () => {
  const token = id(), claim = id();
  const cat = posit(predicate(articulate([token, claim])));
  const rel = settledRelation(cat);
  const settled = settle(cat).sheaf.section["fiber-algebras"].flatMap((fa) => fa.assignments.map((a) => a.cell));
  assert.deepEqual(rel, settled);
});

test("cohomologyOf: a bare single-token utterance settles to one self-loop cell (subject = object = token)", () => {
  // predicate() builds an entity-set of exactly the ONE token on both sides of the relation, so posit's
  // entities × entities is the single pair (token, token) — the settled relation is always a self-loop,
  // never a vacuously-acyclic empty or multi-entity graph. This is a real, slightly surprising shape:
  // the smallest nontrivial utterance already carries H¹ ≠ 0 (a self-loop is its own cycle).
  const token = id(), claim = id();
  const r = cohomologyOf([token, claim]);
  assert.equal(r.entities.length, 1);
  assert.equal(r.cells.length, 1);
  assert.deepEqual(r.cells[0], { subject: token, predicate: claim, object: token });
  assert.equal(r.H1.rank, 1);
  assert.equal(r.H1.vanishes, false);
});

test("cohomologyOf: articulate/predicate/posit round-trip is deterministic for a fixed utterance", () => {
  const token = id(), claim = id();
  const r1 = cohomologyOf([token, claim]);
  const r2 = cohomologyOf([token, claim]);
  assert.deepEqual(r1, r2);
});

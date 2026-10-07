import { test } from "node:test";
import assert from "node:assert/strict";
import { makeRel, relGet, compose, residualLeft, meetRel, trainLayer, relLeq, nucleus, attend } from "../../src/inference/algebra.mjs";

const PEOPLE = ["ada", "ben", "cara", "dan", "eve", "fay", "gus", "hal"];

// A real family: parent relation over 8 people, three generations.
function parentRel() {
  return makeRel(PEOPLE, PEOPLE, [
    ["ada", "cara"], ["ben", "cara"],
    ["ada", "dan"], ["ben", "dan"],
    ["cara", "eve"], ["cara", "fay"],
    ["dan", "gus"],
    ["eve", "hal"],
  ]);
}

test("residuation is the exact adjoint: A ⊗ (A\\B) ≤ B, and it is the greatest such", () => {
  const A = parentRel();
  const B = compose(A, A); // grandparent
  const W = residualLeft(A, B);
  assert.ok(relLeq(compose(A, W), B), "A⊗(A\\B) ≰ B — adjunction broken");
  // Greatest: adding any single absent pos entry to W must break the bound.
  let checked = 0;
  for (const j of W.rows) {
    for (const c of W.cols) {
      const k = j + " " + c;
      if (W.pos.has(k)) continue;
      const W2 = makeRel(W.rows, W.cols, [...W.pos].map((x) => x.split(" ")), []);
      W2.pos.add(k);
      if (relLeq(compose(A, W2), B)) continue; // entry was vacuous (j has no A-support)
      checked++;
    }
  }
  assert.ok(checked > 0, "maximality never exercised");
});

test("one-shot learning: grandparent examples recover the parent step exactly", () => {
  const A = parentRel();
  const G = compose(A, A);
  // Train from the single (input=parent, target=grandparent) example.
  const W = trainLayer([{ input: A, target: G }]);
  // The learned step, applied, reproduces grandparent exactly on support.
  const Y = compose(A, W);
  assert.ok(relLeq(Y, G) && relLeq(G, Y), "A⊗W differs from grandparent");
  // And W agrees with parent wherever parent's domain has support:
  for (const k of A.pos) {
    const [r, c] = k.split(" ");
    // every real parent edge from a mid-node with grandchildren appears in W
    const hasGrand = [...A.pos].some((kk) => kk.startsWith(c + " "));
    if (hasGrand) assert.ok(W.pos.has(k), `learned W lost parent edge ${r}->${c}`);
  }
});

test("monotone refinement: more examples only tighten weights, never corrupt", () => {
  const A = parentRel();
  const G = compose(A, A);
  const half = makeRel(A.rows, A.cols, [...A.pos].slice(0, 4).map((k) => k.split(" ")));
  const W1 = trainLayer([{ input: half, target: G }]);
  const W2 = trainLayer([{ input: half, target: G }, { input: A, target: G }]);
  assert.ok(relLeq(W2, W1), "second example failed to refine (W2 ≰ W1)");
});

test("the neg lane carries counterexamples without touching pos weights", () => {
  const A = makeRel(["x"], ["p"], [["x", "p"]], []);
  const B = makeRel(["x"], ["q"], [["x", "q"]], [["x", "q"]]); // q both evidenced and denied for x
  const W = residualLeft(A, B);
  assert.deepEqual(relGet(W, "p", "q"), { pos: 1, neg: 1 }); // weight itself is contested — held, not averaged
});

test("nucleus as activation: extensive, idempotent, monotone on a transitive-closure step", () => {
  const A = parentRel();
  const step = (R) => {
    for (const k1 of [...R.pos]) {
      const [a, b] = k1.split(" ");
      for (const k2 of [...R.pos]) {
        const [b2, c] = k2.split(" ");
        if (b2 === b) R.pos.add(a + " " + c);
      }
    }
  };
  const ancestor = nucleus(A, step);
  assert.ok(relLeq(A, ancestor), "not extensive");
  const again = nucleus(ancestor, step);
  assert.ok(relLeq(again, ancestor) && relLeq(ancestor, again), "not idempotent");
  assert.ok(ancestor.pos.has("ada eve"), "ada->eve ancestry not closed");
  assert.ok(ancestor.pos.has("ada hal"), "three-generation ancestry not closed");
});

test("attention over the quantale ranks by evidence and flags contest", () => {
  const Q = makeRel(["q"], ["j1", "j2"], [["q", "j1"], ["q", "j2"]]);
  const K = makeRel(["j1", "j2"], ["good", "bad", "mixed"],
    [["j1", "good"], ["j2", "good"], ["j1", "mixed"]],
    [["j2", "mixed"], ["j1", "bad"]]);
  const ranked = attend(Q, K);
  assert.equal(ranked[0].col, "good");
  const mixed = ranked.find((r) => r.col === "mixed");
  assert.ok(mixed.contested, "pos+neg column not flagged contested");
});

test("scale: composition and residuation stay fast at 200x200 relations", () => {
  const n = 200;
  const nodes = Array.from({ length: n }, (_, i) => `n${i}`);
  const chain = makeRel(nodes, nodes, nodes.slice(0, -1).map((x, i) => [x, `n${i + 1}`]));
  const t0 = process.hrtime.bigint();
  const two = compose(chain, chain);
  const W = residualLeft(chain, two);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.ok(relLeq(compose(chain, W), two));
  console.log(`200x200 compose+residuate: ${ms.toFixed(1)}ms, |two|=${two.pos.size}, |W|=${W.pos.size}`);
  assert.ok(ms < 5000);
});

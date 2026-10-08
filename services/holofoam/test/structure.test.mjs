import test from "node:test";
import assert from "node:assert/strict";
import { historyHeads, historySection } from "@red-cup-engineering/signcraft/history";
import {
  admitDesign, createStructureHistory, designOfHistory, failure, loads, observeDesign, observeFirings, observeStaging, rigidity, structureOf,
} from "../src/structure.mjs";

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} !~ ${b}`);
const part = (id, at, mass = 10, extra = {}) => ({ id, at, mass, kind: "part", ...extra });
const weld = (id, from, to) => ({ id, from, to, kind: "weld", strength: 1e9 });
const strut = (id, from, to, strength = 1e9, extra = {}) => ({ id, from, to, kind: "strut", strength, ...extra });

// Two rigid bodies, A and B, each a welded triangle of parts, held by the six bars of a Stewart platform.
const triangle = (name, z, offsets) => offsets.map((o, i) => part(`${name}${i + 1}`, [o[0], o[1], z + o[2]]));
const parts = [...triangle("a", 0, [[0, 0, 0], [2, 0, 0], [0, 2, 0]]), ...triangle("b", 5, [[0.5, 0.3, 0], [2.1, 0.2, 0.5], [0.4, 2.2, -0.2]])];
const welds = [weld("wa1", "a1", "a2"), weld("wa2", "a2", "a3"), weld("wb1", "b1", "b2"), weld("wb2", "b2", "b3")];
const six = [["s1", "a1", "b1"], ["s2", "a1", "b2"], ["s3", "a2", "b2"], ["s4", "a2", "b3"], ["s5", "a3", "b3"], ["s6", "a3", "b1"]];
const bars = (list, strength = 1e9) => list.map(([id, from, to]) => strut(id, from, to, strength));
const joined = (struts) => admitDesign({ parts, joints: [...welds, ...struts] });
const braced = (extra = []) => joined([...bars(six), ...extra]);

test("admission: designs are validated and canonical", () => {
  assert.throws(() => admitDesign({ parts: [part("a", [0, 0, 0]), part("a", [1, 0, 0])], joints: [] }), TypeError);
  assert.throws(() => admitDesign({ parts: [part("a", [0, 0, 0])], joints: [strut("s", "a", "z")] }), TypeError);
  assert.throws(() => admitDesign({ parts: [part("a", [0, 0, 0], -1)], joints: [] }), TypeError);
  const d = admitDesign({ parts: [part("b", [0.5, 0.25, 1e-7]), part("a", [1, 2, 3])], joints: [] });
  assert.deepEqual(d.parts.map((p) => p.id), ["a", "b"]);
  assert.deepEqual([...d.parts[1].at], ["1/2", "1/4", "1/10000000"]);
});

test("rigidity: welds fuse clusters; bar counts give mechanisms and self-stresses; Maxwell holds", () => {
  const free = rigidity(joined([]));
  assert.equal(free.clusters.length, 2);
  assert.equal(free.pieces.length, 2);
  assert.ok(free.maxwell.holds);
  const rigid = rigidity(braced());
  assert.equal(rigid.pieces.length, 1);
  assert.equal(rigid.mechanisms, 0);
  assert.equal(rigid.selfStresses, 0);
  assert.ok(rigid.rigid);
  assert.ok(rigid.maxwell.holds);
  const five = rigidity(joined(bars(six.slice(0, 5))));
  assert.equal(five.mechanisms, 1);
  assert.equal(five.selfStresses, 0);
  assert.ok(!five.rigid);
  assert.ok(five.maxwell.holds);
  const seven = rigidity(braced(bars([["s7", "a1", "b3"]])));
  assert.equal(seven.mechanisms, 0);
  assert.equal(seven.selfStresses, 1);
  assert.ok(seven.maxwell.holds);
  // a bar inside a welded cluster is internal: it adds no constraint
  const internal = rigidity(braced(bars([["s8", "a1", "a3"]])));
  assert.deepEqual([...internal.internal], ["s8"]);
  assert.equal(internal.selfStresses, 0);
  // a hinge leaves one mechanism between two bodies; a decoupler (ball joint) leaves three
  const hinge = rigidity(joined([{ id: "h", from: "a1", to: "b1", kind: "hinge", strength: 1, at: [0, 0, 2], axis: [1, 0, 0] }]));
  assert.equal(hinge.mechanisms, 1);
  const pin = rigidity(joined([{ id: "d", from: "a1", to: "b1", kind: "decoupler", strength: 1, at: [0, 0, 2] }]));
  assert.equal(pin.mechanisms, 3);
});

test("loads: a free piece accelerates as one rigid body and its members carry finite, balanced forces", () => {
  const d = braced();
  const thrust = [{ part: "a1", force: [0, 0, 600] }];
  const l = loads(d, thrust, { gravity: [0, 0, -10] });
  assert.ok(l.resolved);
  near(l.pieces[0].mass, 60);
  near(l.pieces[0].acceleration[2], 600 / 60 - 10, 1e-9);
  assert.equal(l.members.filter((m) => m.kind === "strut").length, 6);
  assert.ok(l.members.every((m) => Number.isFinite(m.load) && m.resolved));
  // the thrust enters at a1 and is carried to the rest through the bars, so the bars carry real load
  assert.ok(l.members.some((m) => m.kind === "strut" && m.load > 1));
  assert.deepEqual(loads(d, thrust, { gravity: [0, 0, -10] }).members, l.members); // deterministic
  // over-braced: the minimum-norm (harmonic) force still balances
  const over = loads(braced(bars([["s7", "a1", "b3"]])), thrust, { gravity: [0, 0, -10] });
  assert.ok(over.resolved);
  assert.ok(over.members.every((m) => Number.isFinite(m.load)));
  // free fall carries nothing
  const fall = loads(d, [], { gravity: [0, 0, -10] });
  assert.ok(fall.members.every((m) => m.load < 1e-6));
});

test("loads: a mechanism that cannot carry the load reports the obstruction, not NaN", () => {
  const d = joined(bars(six.slice(0, 5)));
  // equal and opposite pushes along the free motion's direction
  const l = loads(d, [{ part: "b1", force: [100, 0, 0] }, { part: "a1", force: [-100, 0, 0] }], { gravity: [0, 0, 0] });
  assert.ok(!l.resolved);
  assert.equal(l.obstructions.length, 1);
  assert.equal(l.obstructions[0].kind, "mechanism");
  assert.equal(l.obstructions[0].mechanisms, 1);
  assert.ok(l.obstructions[0].residual > 1);
  assert.ok(l.members.every((m) => !m.resolved));
});

test("failure: members over strength are told against, the most overloaded fires first, the survivor is re-settled", () => {
  const strengths = { s1: 5, s2: 400, s3: 1e9, s4: 1e9, s5: 1e9, s6: 1e9, s7: 1e9 };
  const d = joined(bars([...six, ["s7", "a1", "b3"]]).map((s) => ({ ...s, strength: strengths[s.id] })));
  const forces = [{ part: "a1", force: [0, 0, 600] }];
  const settled = failure(d, forces, { gravity: [0, 0, -10] });
  assert.ok(settled.firings.length >= 1);
  assert.ok(settled.firings.every((f, i) => f.step === i + 1 && f.event === "T2" && f.load > f.strength));
  const first = settled.firings[0];
  const state = loads(d, forces, { gravity: [0, 0, -10] });
  const worst = state.members.filter((m) => m.load > m.strength).reduce((a, b) => (b.ratio > a.ratio ? b : a));
  assert.equal(first.member, worst.id);
  for (const f of settled.firings) assert.ok(!settled.design.joints.some((j) => j.id === f.member));
  assert.ok(settled.loads.members.every((m) => !m.resolved || m.load <= m.strength));
  assert.deepEqual(failure(d, forces, { gravity: [0, 0, -10] }).firings, settled.firings); // deterministic
  assert.equal(failure(braced(), forces, { gravity: [0, 0, -10] }).firings.length, 0);
});

test("failure: removing the last link of a piece is a T1 split", () => {
  // two bodies joined by a weak ball joint and a rigid brace set; overload fires the joint and the piece parts
  const d = joined([{ id: "d", from: "a1", to: "b1", kind: "decoupler", strength: 1, at: [0.1, 0.2, 2] }, ...bars(six.slice(0, 3)).map((s) => ({ ...s, releasedBy: "d" }))]);
  const r = failure(d, [{ part: "b1", force: [0, 0, 100] }], { gravity: [0, 0, 0] });
  assert.ok(r.firings.some((f) => f.split !== null));
  assert.equal(r.firings.find((f) => f.split !== null).split.length, 2);
  assert.equal(structureOf(r.design).pieces.length, 2);
});

test("history: a design is cells, firings tell a member against its design cell (FOUR top), the design in force is derived", () => {
  const d = braced();
  let h = observeDesign(createStructureHistory(), d);
  assert.deepEqual(designOfHistory(h), d);
  const before = historySection(h, "joint:s5", "holds")[0];
  assert.equal(before.for.length, 1);
  assert.equal(before.against.length, 0);
  h = observeFirings(h, [{ step: 1, member: "s5", load: 9, strength: 1 }], { tick: 3 });
  const after = historySection(h, "joint:s5", "holds")[0];
  assert.equal(after.for.length, 1);
  assert.equal(after.against.length, 1);
  assert.ok(!designOfHistory(h).joints.some((j) => j.id === "s5"));
  assert.ok(designOfHistory(h, { tick: 2 }).joints.some((j) => j.id === "s5"));
  const again = observeFirings(observeDesign(createStructureHistory(), d), [{ step: 1, member: "s5", load: 9, strength: 1 }], { tick: 3 });
  assert.deepEqual(historyHeads(again), historyHeads(h));
});

test("history: staging removes a decoupler and the joints it releases", () => {
  const d = admitDesign({ parts, joints: [...welds, { id: "dec", from: "a1", to: "b1", kind: "decoupler", strength: 9, at: [0, 0, 2] }, strut("k1", "a1", "b1", 9, { releasedBy: "dec" })] });
  let h = observeDesign(createStructureHistory(), d);
  assert.throws(() => observeStaging(h, "k1"), TypeError);
  h = observeStaging(h, "dec", { tick: 7 });
  assert.equal(designOfHistory(h).joints.length, 4);
  assert.equal(designOfHistory(h, { tick: 6 }).joints.length, 6);
  assert.equal(structureOf(designOfHistory(h)).pieces.length, 2);
});

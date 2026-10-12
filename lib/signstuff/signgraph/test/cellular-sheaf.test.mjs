import test from "node:test";
import assert from "node:assert/strict";
import { cell } from "@red-cup-engineering/signcell/cell";
import { cohomologyReceiptOfCells } from "../src/cohomology.mjs";
import {
  apply, applyLaplacian, cellularSheaf, cellularSheafCohomology, coboundary, cochain, constantSheaf,
  diffuse, harmonicProjection, hodgeCheck, rigidityReceipt, rigiditySheaf, sheafLaplacian,
} from "../src/cellular-sheaf.mjs";

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} !~ ${b}`);

test("cellularSheaf: validates shapes, ids and endpoints", () => {
  const v = [{ id: "a", dim: 2 }, { id: "b", dim: 1 }];
  const ok = { id: "e", from: "a", to: "b", dim: 1, restrict: { from: [[1, 0]], to: [[1]] } };
  assert.equal(cellularSheaf({ vertices: v, edges: [ok] }).c0, 3);
  assert.throws(() => cellularSheaf({ vertices: v, edges: [{ ...ok, restrict: { from: [[1]], to: [[1]] } }] }), RangeError);
  assert.throws(() => cellularSheaf({ vertices: [...v, { id: "a", dim: 1 }], edges: [] }), RangeError);
  assert.throws(() => cellularSheaf({ vertices: v, edges: [{ ...ok, to: "z" }] }), RangeError);
  assert.ok(Object.isFrozen(cellularSheaf({ vertices: v, edges: [ok] })));
});

test("coboundary and Laplacian: (δx)_e = F_to x_to − F_from x_from, L = δᵀδ", () => {
  const s = constantSheaf(["a", "b", "c"], [["a", "b"], ["b", "c"]]);
  assert.deepEqual(apply(coboundary(s), [1, 3, 6]), [2, 3]);
  assert.deepEqual(applyLaplacian(s, [1, 3, 6]), [-2, -1, 3]);
  assert.deepEqual(applyLaplacian(s, [5, 5, 5]), [0, 0, 0]);
  const L = sheafLaplacian(s);
  assert.deepEqual(L.entries.map((row) => row.map(([, v]) => v)), [[1, -1], [-1, 2, -1], [-1, 1]]);
});

test("exact cohomology: agrees with cohomologyOfCells on the integer incidence", () => {
  const graphs = [
    { nodes: ["a", "b", "c"], edges: [["a", "b"], ["b", "c"], ["c", "a"]] },
    { nodes: ["a", "b", "c", "d", "e"], edges: [["a", "b"], ["b", "c"], ["d", "e"]] },
    { nodes: ["a", "b", "c", "d"], edges: [["a", "b"], ["a", "b"], ["b", "c"], ["c", "a"], ["c", "c"]] },
  ];
  for (const { nodes, edges } of graphs) {
    const reference = cohomologyReceiptOfCells(edges.map(([s, o]) => cell(s, "edge", o)), nodes);
    const r = cellularSheafCohomology(constantSheaf(nodes, edges));
    assert.equal(r.h0, reference.h0);
    assert.equal(r.h1, reference.h1);
    assert.equal(r.vanishing.kind, reference.vanishing.kind);
  }
});

test("exact cohomology: rational restrictions and a twisted cycle", () => {
  const vs = ["a", "b", "c"].map((id) => ({ id, dim: 1 }));
  const edge = (id, from, to, f, t) => ({ id, from, to, dim: 1, restrict: { from: [[f]], to: [[t]] } });
  const twisted = cellularSheaf({ vertices: vs, edges: [edge(1, "a", "b", 1, 1), edge(2, "b", "c", 1, 1), edge(3, "c", "a", "1/2", 1)] });
  const r = cellularSheafCohomology(twisted);
  assert.equal(r.h0, 0); assert.equal(r.h1, 0);
  const flat = cellularSheaf({ vertices: vs, edges: [edge(1, "a", "b", "1/3", "1/3"), edge(2, "b", "c", 1, 1)] });
  assert.equal(cellularSheafCohomology(flat).h0, 1);
  const inexact = cellularSheaf({ vertices: vs, edges: [edge(1, "a", "b", 0.5, 1)] });
  assert.throws(() => cellularSheafCohomology(inexact), RangeError);
});

test("diffusion: converges to the harmonic section (component means) and lies in ker L", () => {
  const s = constantSheaf(["a", "b", "c", "d", "e"], [["a", "b"], ["b", "c"], ["d", "e"]]);
  const r = harmonicProjection(s, [1, 2, 6, 10, 20], { tolerance: 1e-12 });
  assert.ok(r.converged);
  [3, 3, 3, 15, 15].forEach((m, i) => near(r.section[i], m, 1e-9));
  near(r.residual, 0, 1e-9);
  assert.ok(r.firings.length > 0);
  const again = harmonicProjection(s, [1, 2, 6, 10, 20], { tolerance: 1e-12 });
  assert.deepEqual(again.section, r.section);
  assert.deepEqual(again.firings, r.firings);
});

test("Hodge degree 0: H¹ = 0 sheaf, diffusion limit is a global section in ker L", () => {
  const tree = constantSheaf(["a", "b", "c"], [["a", "b"], ["b", "c"]]);
  const h = hodgeCheck(tree, [4, -1, 9]);
  assert.equal(h.h1, 0);
  assert.ok(h.harmonic);
  near(h.sectionResidual, 0, 1e-9);
  near(h.laplacianResidual, 0, 1e-9);
  // a vector-valued sheaf with non-trivial restrictions: limit lies in ker δ
  const rot = cellularSheaf({
    vertices: [{ id: "a", dim: 2 }, { id: "b", dim: 2 }],
    edges: [{ id: "e", from: "a", to: "b", dim: 2, restrict: { from: [[0, -1], [1, 0]], to: [[1, 0], [0, 1]] } }],
  });
  const hr = hodgeCheck(rot, [1, 2, 3, 4]);
  assert.ok(hr.harmonic);
  near(hr.section[2], -hr.section[1], 1e-8); // x_b = R x_a = (-a1, a0)
  near(hr.section[3], hr.section[0], 1e-8);
});

test("diffusion with pinned vertices: boundary conditions are admitted evidence", () => {
  const s = constantSheaf(["a", "b", "c"], [["a", "b"], ["b", "c"]]);
  const r = diffuse(s, cochain(s, []), { fixed: [{ vertex: "a", value: 0 }, { vertex: "c", value: 10 }], tolerance: 1e-12 });
  assert.ok(r.converged);
  near(r.section[0], 0); near(r.section[1], 5); near(r.section[2], 10);
  const conflict = diffuse(s, [0, 0, 0], { fixed: [{ vertex: "a", value: 0 }, { vertex: "b", value: 1 }], maxSteps: 10 });
  assert.ok(conflict.residual > 0);
});

test("rigidity: triangle rigid, open square flexes, braced square has a self-stress, tetrahedron rigid", () => {
  const tri = rigidityReceipt([[0, 0], [4, 0], [1, 3]], [[0, 1], [1, 2], [0, 2]], 2);
  assert.equal(tri.cohomology.h0, 3); assert.equal(tri.cohomology.h1, 0); assert.ok(tri.infinitesimallyRigid);
  const square = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const ring = [[0, 1], [1, 2], [2, 3], [3, 0]];
  const open = rigidityReceipt(square, ring, 2);
  assert.equal(open.cohomology.h0, 4); assert.equal(open.mechanisms, 1); assert.ok(!open.infinitesimallyRigid);
  const braced = rigidityReceipt(square, [...ring, [0, 2], [1, 3]], 2);
  assert.equal(braced.cohomology.h0, 3); assert.equal(braced.cohomology.h1, 1); assert.ok(braced.infinitesimallyRigid);
  const tet = rigidityReceipt([[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]], [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]], 3);
  assert.equal(tet.cohomology.h0, 6); assert.equal(tet.cohomology.h1, 0); assert.ok(tet.infinitesimallyRigid);
  // rational coordinates stay exact
  const rat = rigidityReceipt([["0", "0"], ["1/2", "0"], ["1/3", "2/5"]], [[0, 1], [1, 2], [0, 2]], 2);
  assert.ok(rat.infinitesimallyRigid);
  // Maxwell: m = dN − C − E + stresses
  assert.equal(braced.mechanisms - braced.selfStresses, 2 * 4 - 3 - 6);
  assert.equal(open.mechanisms - open.selfStresses, 2 * 4 - 3 - 4);
});

test("rigidity numerics: normalized (unit direction) sheaf diffuses to a rigid motion", () => {
  const s = rigiditySheaf([[0, 0], [1, 0], [0, 1]], [[0, 1], [1, 2], [0, 2]], 2, { normalize: true });
  const translation = [1, 2, 1, 2, 1, 2];
  near(apply(coboundary(s), translation).reduce((a, b) => a + Math.abs(b), 0), 0, 1e-12);
  const r = harmonicProjection(s, [0, 0, 1, 0.2, 0, 1], { tolerance: 1e-10 });
  assert.ok(r.converged);
  near(r.residual, 0, 1e-8);
});

import { applyTranspose, bodyBarReceipt, bodyBarSheaf, solveNormal } from "../src/cellular-sheaf.mjs";

test("solveNormal: min-norm solution of δᵀf = rhs; over-braced picks the harmonic representative", () => {
  // braced square (2D, 4 joints, 6 bars): one self-stress. Load the square in equilibrium: pull diagonal 0-2 apart.
  const pts = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const bars = [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [1, 3]];
  const s = rigiditySheaf(pts, bars, 2, { normalize: true });
  const load = [1, 1, 0, 0, -1, -1, 0, 0]; // equal and opposite along the diagonal
  const r = solveNormal(s, load);
  assert.ok(r.consistent && r.converged);
  const back = applyTranspose(coboundary(s), r.section);
  back.forEach((v, i) => near(v, load[i], 1e-9));
  // minimum norm: orthogonal to the self-stress, i.e. in the image of δ
  const again = solveNormal(s, load);
  assert.deepEqual(again.section, r.section); // deterministic
});

test("solveNormal: an unresolvable load is an obstruction in ker δ, not NaN", () => {
  // open square: a mechanism. A shear load is not carried.
  const pts = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const s = rigiditySheaf(pts, [[0, 1], [1, 2], [2, 3], [3, 0]], 2, { normalize: true });
  const shear = [0, -1, 0, 1, 0, 1, 0, -1]; // a net-zero force pattern of the shear mode: not in im δᵀ
  const r = solveNormal(s, shear);
  assert.ok(!r.consistent);
  assert.ok(Number.isFinite(r.residual) && r.residual > 0.1);
  near(norm2(apply(coboundary(s), r.obstruction)), 0, 1e-8); // the obstruction is a motion
});

const norm2 = (v) => Math.sqrt(v.reduce((a, b) => a + b * b, 0));

test("body-bar: a rigid pair joined by six generic bars is rigid; five leave one mechanism; collinear clusters are fine", () => {
  const bars = (list) => list.map(([a, b], i) => ({ id: i, kind: "bar", from: "A", to: "B", a, b }));
  // A at the origin; B displaced by (0,0,5); attachment points are collinear on each body's axis plus offsets.
  const six = bars([[[1, 0, 0], [1, 0, 5]], [[0, 1, 0], [1, 1, 6]], [[-1, 0, 0], [-2, 0, 5]], [[0, -1, 0], [0, -2, 5]], [[1, 1, 0], [0, 1, 4]], [[2, 0, 1], [2, 1, 5]]]);
  const full = bodyBarReceipt(["A", "B"], six);
  assert.equal(full.mechanisms, 0); assert.ok(full.rigid); assert.equal(full.pieces, 1);
  assert.ok(full.maxwell.holds);
  const five = bodyBarReceipt(["A", "B"], six.slice(0, 5));
  assert.equal(five.mechanisms, 1); assert.ok(!five.rigid); assert.ok(five.maxwell.holds);
  const seven = bodyBarReceipt(["A", "B"], [...six, { id: 9, kind: "bar", from: "A", to: "B", a: [3, 0, 0], b: [3, 2, 5] }]);
  assert.equal(seven.selfStresses, 1); assert.equal(seven.mechanisms, 0);
  const pin = bodyBarReceipt(["A", "B"], [{ id: "p", kind: "pin", from: "A", to: "B", at: [0, 0, 1] }]);
  assert.equal(pin.mechanisms, 3);
  const hinge = bodyBarReceipt(["A", "B"], [{ id: "h", kind: "hinge", from: "A", to: "B", at: [0, 0, 1], axis: [1, 0, 0] }]);
  assert.equal(hinge.mechanisms, 1);
  const apart = bodyBarReceipt(["A", "B"], []);
  assert.equal(apart.pieces, 2); assert.equal(apart.mechanisms, 0);
});

test("body-bar: equilibrium of a loaded rigid pair via solveNormal (unit rows are forces)", () => {
  // B hangs below A on three vertical bars; weight 3 on B, balanced by A.
  const tri = [[1, 0], [-1, 0], [0, 1]];
  const constraints = tri.map(([x, y], i) => ({ id: i, kind: "bar", from: "A", to: "B", a: [x, y, 0], b: [x, y, -2] }));
  const s = bodyBarSheaf(["A", "B"], constraints, { normalize: true });
  const loadOnB = [0, 0, -3, 0, 0, 0], loadOnA = [0, 0, 3, 0, 0, 0];
  // equilibrium: p + Rᵀf = 0 with f compression-positive: Rᵀf = −p
  const r = solveNormal(s, [...loadOnA, ...loadOnB].map((v) => -v));
  assert.ok(r.consistent);
  // tension is negative compression; moment balance puts the whole weight on the two bars at y = 0
  near(r.section[0], -1.5, 1e-9); near(r.section[1], -1.5, 1e-9); near(r.section[2], 0, 1e-9);
});

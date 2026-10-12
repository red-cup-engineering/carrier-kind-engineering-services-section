import assert from "node:assert/strict";
import test from "node:test";
import { order, rational, topology } from "@red-cup-engineering/feltos/math";
import * as graphs from "@lenticule-science/graph-theory-services-section";
test("shared finite sets and graphs retain Metro wire kinds and exact string labels", () => {
  const universe = ["a\0b", "c", "a", "b\0c", "__proto__"];
  const set = graphs.finiteSet(universe, ["__proto__", "a"]);
  assert.equal(set.kind, "discrete.set");
  assert.deepEqual(set.members, ["a", "__proto__"]);
  const g = graphs.directedGraph(universe, [[universe[0], universe[1]], [universe[2], universe[3]]]);
  assert.equal(g.kind, "discrete.graph.directed");
  assert.equal(g.edges.length, 2);
  assert.equal(graphs.directedHandshakeReceipt(g).sumOutdegree, 2);
  const order = Object.fromEntries(universe.map((v, i) => [v, i]));
  assert.equal(graphs.topologicalDagReceipt(g, order).order.__proto__, 4);
  assert.throws(() => graphs.topologicalDagReceipt(g, Object.create(order)), TypeError);
  assert.throws(() => graphs.finiteSet(["a", "a"], []), TypeError);
});

test("shared Alexandrov operators preserve point tuples and reject inherited maps", () => {
  const a = topology.alexandrovHusainov;
  const points = ["a\0b", "c", "__proto__"];
  const p = a.finitePoset(points, [[points[0], points[1]]]);
  assert.equal(p.leq.length, 4);
  assert.ok(p.leq.every((pair) => pair.length === 2));
  const identity = Object.fromEntries(points.map((point) => [point, point]));
  assert.deepEqual(a.monotoneMap(p, p, identity).map, identity);
  assert.throws(() => a.monotoneMap(p, p, Object.create(identity)), TypeError);
  assert.equal(a.topologyReceipt(p).specializationRecoversOrder, true);
});

test("associated sheaf support profiles agree with all four charge masks", () => {
  const s = topology.settlingAssociatedSheaf;
  const profile = s.settlingAssociatedSheafReceipt().supportProfile;
  for (const [name, expected] of Object.entries({
    unknown: [false, false, false], held: [true, true, false],
    denied: [false, false, false], contested: [false, true, true],
  })) {
    const value = [s.chargedCell("potential", name)];
    assert.deepEqual([profile[name].dT, profile[name].dK, profile[name].dTop], expected);
    assert.deepEqual([s.dT(value), s.dK(value), s.dTop(value)].map((mask) => mask.cells.includes("potential")), expected);
  }
  assert.deepEqual(s.cochain([{cell:"__proto__",coefficient:2},{cell:"__proto__",coefficient:-1}]).coefficients, [{cell:"__proto__",coefficient:1}]);
});

test("harmonic receipts retain charge names and truth-firing counts", () => {
  const h = topology.lawvereHarmonicCohomology;
  for (const [name, count] of Object.entries({unknown:1,held:1,denied:0,contested:0})) {
    const seed = {kind:"flow.valuation",cells:["potential"],values:{potential:name}};
    const result = h.lawvereHarmonicCohomologyReceipt(seed);
    assert.equal(result.seed, seed);
    assert.equal(result.h0TruthFiringCount, count);
    assert.equal(result.settled.values.potential, count ? "held" : "contested");
  }
});

test("exact matrix arithmetic retains Smith factors, determinant and rank", () => {
  const exact = rational.exactNumber;
  const matrix = exact.fromInts([[4, 0], [0, 6]]);
  assert.deepEqual(exact.smithNormalForm(matrix).map(exact.toInt), [2, 12]);
  assert.equal(exact.toInt(exact.determinant(matrix)), 24);
  assert.equal(exact.toCount(exact.rank(exact.fromInts([[2, 4], [4, 8]]))), 1);
  assert.throws(() => exact.fromCount(-1), RangeError);
});

test("finite order, residuation and algebra hierarchy retain witnesses and obstructions", () => {
  const finite = order.orderInfra;
  assert.equal(finite.completeLattice(finite.booleanOrderSystem).kind, "orderInfra.completeLattice:witness");
  assert.equal(finite.distributiveLattice(finite.booleanLatticeSystem).kind, "orderInfra.distributiveLattice:witness");
  const invalid = finite.finitePreorderSystem(["a", "b"], [[true, true], [true, true]]);
  assert.equal(finite.partialOrder(invalid).reason, "antisymmetry");
  const residuated = topology.residuatedLattice;
  assert.equal(residuated.laws(residuated.twoBooleanResiduatedLattice).kind, "residuatedLattice.laws:witness");
  assert.equal(topology.algebraHierarchy.algebraHierarchy().kind, "algebraHierarchy.receipt:witness");
});

test("FCA preserves closure, finite-size errors and the Metroplat receipt shape", () => {
  const fca = topology.fcaLambek;
  const context = fca.workedContext;
  const closed = fca.closeExtent(context, ["a", "b"]);
  assert.deepEqual(fca.closeExtent(context, closed), closed);
  assert.equal(fca.circle(context, topology.residuatedLattice.twoBooleanResiduatedLattice).kind, "fcaLambek.circle:witness");
  const receipt = fca.formalConceptAnalysisReceipt();
  assert.equal(receipt.closeAIdempotent, true);
  assert.equal(Object.isFrozen(receipt), true);
  assert.equal("sourceModule" in receipt, false);
  assert.equal("theorems" in receipt, false);
  const large = fca.finiteFcaContext(Array.from({ length: 17 }, (_, index) => ({ subject: String(index), predicate: "p" })));
  assert.throws(() => fca.circle(large, topology.residuatedLattice.twoBooleanResiduatedLattice), { name: "RangeError", message: "fcaLambek: finite context exceeds max size 16" });
  assert.throws(() => fca.formalConceptAnalysisReceipt(large), { name: "RangeError", message: "fcaLambek: finite context exceeds max size 16" });
});

test("graded arithmetic rejects cross-sector sums and information preserves entropy", () => {
  const exact = rational.exactNumber;
  const first = topology.graded(exact.fromRatio(1, 2), "mass");
  assert.equal(exact.ratEqual(topology.gradedAdd(first, first).value, exact.ratOne), true);
  assert.throws(() => topology.gradedAdd(first, topology.graded(exact.ratOne, "time")), /grade mismatch/u);
  assert.equal(topology.shannonEntropy([1, 1]), 1);
  assert.equal(topology.topologicalEntropy(exact.fromInts([[1, 0], [0, 1]])), 0);
});

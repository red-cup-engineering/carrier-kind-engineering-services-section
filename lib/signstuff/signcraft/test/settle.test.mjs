// settle — the settlement admission law and the delegated filtration analysis.
//
// Obsmetrologia Settlement.lean: a settlement is content over a base admitted by the base's own law;
// Closure/RuleSystem.lean: T_S v = v ⊔ fire S v, clS its least fixed point above the seed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { address, cell, triple } from "@red-cup-engineering/signcell/cell";
import { rule } from "@red-cup-engineering/signchain/rules";
import { coincidenceKey } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import * as metrologic from "@red-cup-engineering/metrologic/obstruction/settling";
import {
  settleCells, relate, evidenceIn, settlementAdmits, settlementEvidence, filtration, filtrationOf, increments, firings,
  limitStages, nonScottFirings, firstCohomology, gradedGap, closureInvariant, closureEquivalent, classify,
  derivationOrderOf, derivationOrderAdmits, derivationPath, derivationCone, derivationSeparation,
} from "../src/settle.mjs";

const at = (s, p, o) => cell(s, p, o, { for: [{ subject: s, predicate: p, object: o }] });
const t = (s, p, o) => triple(cell(s, p, o));

function chain() {
  const a = at("a", "is", "b");
  const rules = [
    rule("r1", [{ cell: t("a", "is", "b"), atLeast: "potential" }], { cell: t("b", "is", "c"), reading: "potential" }),
    rule("r2", [{ cell: t("b", "is", "c"), atLeast: "potential" }], { cell: t("c", "is", "d"), reading: "potential" }),
  ];
  return settleCells([a], rules);
}

test("an honest settlement is admitted and evidences its strict phase", () => {
  const s = chain();
  assert.ok(s.stages.length >= 3);
  const admission = settlementAdmits(s);
  assert.equal(admission.admitted, true);
  assert.equal(admission.reason, undefined);
  assert.ok(Object.isFrozen(admission));
  assert.equal(settlementEvidence(s).settledAt, s.settledAt);
});

test("a tampered stage is refused, naming the stage", () => {
  const s = chain();
  const stages = s.stages.map((stage, i) => i === 1 ? { ...stage, valuation: stage.valuation.slice(0, -1) } : stage);
  const bad = { ...s, stages };
  const admission = settlementAdmits(bad);
  assert.equal(admission.admitted, false);
  assert.match(admission.reason, /stage 1/);
  assert.throws(() => settlementEvidence(bad), TypeError);
});

test("a dropped stage is refused", () => {
  const s = chain();
  const stages = s.stages.filter((_, i) => i !== 1).map((stage, i) => ({ ...stage, stage: i }));
  const bad = { ...s, stages, settledAt: stages.length - 1 };
  const admission = settlementAdmits(bad);
  assert.equal(admission.admitted, false);
  assert.match(admission.reason, /stage 1/);
  assert.throws(() => settlementEvidence(bad), /not admitted/);
});

test("a settled valuation that is not closed (not the orbit's last stage) is refused", () => {
  const s = chain();
  const bad = { ...s, settled: s.stages[0].valuation };
  const admission = settlementAdmits(bad);
  assert.equal(admission.admitted, false);
  assert.match(admission.reason, /settled valuation/);
  assert.throws(() => settlementEvidence(bad), TypeError);
});

test("a settlement stopped before its fixed point (last stage not S-closed) is refused", () => {
  const s = chain();
  const stages = s.stages.slice(0, -1);
  const bad = { ...s, stages, settled: stages[stages.length - 1].valuation, settledAt: stages.length - 1 };
  assert.equal(settlementAdmits(bad).admitted, false);
});

test("signcell address and content coincidence agree on triples", () => {
  const ts = [t("a", "is", "b"), t("a", "is", "b"), t("b", "is", "a"), t("a", "is", "c")];
  for (const x of ts) for (const y of ts) assert.equal(address(x) === address(y), coincidenceKey(x) === coincidenceKey(y));
});

test("signcraft's filtration reads delegate to metrologic's and add signcraft kinds", () => {
  const f = filtration([
    { ordinal: 0, shape: "initial", designated: [t("a", "is", "b")] },
    { ordinal: 1, shape: "successor", designated: [t("a", "is", "b"), t("b", "is", "c")] },
    { ordinal: "ω", shape: "limit", designated: [t("a", "is", "b"), t("b", "is", "c"), t("c", "is", "d")] },
  ]);
  assert.equal(f.kind, "signcraft.filtration");
  assert.equal(limitStages(f).length, 1);
  assert.equal(increments(f).length, 3);
  assert.equal(firings(f).length, 3);
  assert.equal(nonScottFirings(f).length, 1);
  const h = firstCohomology(f);
  assert.equal(h.kind, "signcraft.firstCohomology");
  assert.equal(h.rank, 1);
  assert.equal(gradedGap(f).kind, "signcraft.gradedGap");
  assert.equal(closureInvariant(f).kind, "signcraft.closureInvariant");
  const c = classify(f);
  assert.equal(c.kind, "signcraft.classification");
  assert.equal(c.regime, metrologic.classify(f).regime);
  assert.equal(c.regime, "transfinite-bounded");
  assert.equal(closureEquivalent(f, f), true);
  assert.throws(() => filtration([{ ordinal: 0, shape: "successor", designated: [] }]), TypeError);
});

test("a settlement's own filtration is strict", () => {
  const s = chain();
  assert.equal(classify(s).regime, "strict");
  assert.equal(classify(s).depth, s.settledAt);
  assert.equal(filtrationOf(s).stages.length, s.stages.length);
});


// Rules can be dormant in each local settlement and fire only after their
// evidence is joined. A derivation label is not the identity of that license.
test("relating settlements preserves same-name rules with distinct conclusions", () => {
  const premise = t("job", "has", "input");
  const conclusions = [t("job", "can", "analyze"), t("job", "can", "plan")];
  const local = settleCells([], conclusions.map((conclusion) => rule("advance", [
    { cell: premise, atLeast: "potential" },
  ], { cell: conclusion, reading: "potential" })));
  const evidence = settleCells([at("job", "has", "input")]);
  const joined = relate(local, evidence);
  for (const conclusion of conclusions) {
    const telling = evidenceIn(joined.settled, conclusion.subject, conclusion.predicate, conclusion.object);
    assert.equal(telling.for.length, 1);
    assert.equal(telling.for[0].rule, "advance");
    assert.deepEqual(telling.for[0].from, [address(premise)]);
  }
  assert.equal(joined.rules.length, 2);
  assert.equal(settlementAdmits(joined).admitted, true);
  assert.deepEqual(relate(evidence, local).settled, joined.settled);
});

test("relating settlements retains both same-name evidence lanes without explosion", () => {
  const premise = t("job", "has", "input");
  const conclusion = t("job", "can", "plan");
  const local = settleCells([], ["potential", "active"].map((reading) => rule("advance", [
    { cell: premise, atLeast: reading },
  ], { cell: conclusion, reading })));
  const evidence = settleCells([cell("job", "has", "input", { for: ["observed"], against: ["disputed"] })]);
  const joined = relate(local, evidence);
  const telling = evidenceIn(joined.settled, "job", "can", "plan");
  assert.equal(telling.for.length, 1);
  assert.equal(telling.against.length, 1);
  assert.equal(joined.settled.length, 2);
  assert.equal(joined.rules.length, 2);
  assert.equal(settlementAdmits(joined).admitted, true);
});

test("relating settlements retains same-name rules distinguished by their threshold", () => {
  const premise = t("job", "has", "input"), conclusion = t("job", "can", "plan");
  const local = settleCells([], ["potential", "active"].map((atLeast) => rule("advance", [
    { cell: premise, atLeast },
  ], { cell: conclusion, reading: "potential" })));
  const joined = relate(local, settleCells([at("job", "has", "input")]));
  assert.equal(evidenceIn(joined.settled, "job", "can", "plan").for.length, 1);
  assert.equal(joined.rules.length, 2);
  assert.equal(settlementAdmits(joined).admitted, true);
});

test("relating coincident rule content is idempotent, including NFC-equivalent labels", () => {
  const make = (name) => rule(name, [{ cell: t("job", "has", "input"), atLeast: "potential" }], {
    cell: t("job", "can", "plan"), reading: "potential",
  });
  const left = settleCells([at("job", "has", "input")], [make("caf\u00e9")]);
  const right = settleCells([], [make("cafe\u0301")]);
  const joined = relate(left, right);
  assert.equal(joined.rules.length, 1);
  assert.deepEqual(joined.settled, left.settled);
  assert.deepEqual(relate(joined, joined).settled, joined.settled);
  assert.equal(relate(joined, joined).rules.length, 1);
  assert.equal(settlementAdmits(joined).admitted, true);
});


test("kinematic derivation order follows actual rule licenses, not shared terms", () => {
  const settlement = chain();
  const order = derivationOrderOf(settlement);
  const event = (predicate, side = "for") => order.events.find((e) => e.cell.predicate === predicate && e.side === side);
  const initial = event("is");
  // Every cell in chain() has the same predicate, so select by subject.
  const a = order.events.find((e) => e.cell.subject === "a");
  const b = order.events.find((e) => e.cell.subject === "b");
  const c = order.events.find((e) => e.cell.subject === "c");
  assert.equal(order.kind, "signcraft.derivationOrder");
  assert.ok(order.settledAt >= 2);
  assert.equal(initial.id, a.id);
  assert.deepEqual([a.stage, b.stage, c.stage], [0, 1, 2]);
  assert.deepEqual(a.predecessors, []);
  assert.deepEqual(b.predecessors, [a.id]);
  assert.deepEqual(c.predecessors, [b.id]);
  assert.equal(typeof b.ruleId, "string");
  assert.equal(typeof c.ruleId, "string");
  assert.notEqual(b.ruleId, c.ruleId);
  assert.deepEqual(derivationPath(order, c.id).events.map((e) => e.id), [a.id, b.id, c.id]);
  assert.equal(derivationPath(order, "unknown").kind, "signcraft.derivationPath-obstruction");
});

test("kinematic derivation tracks negative evidence without designating it as positive", () => {
  const premise = t("object", "witnesses", "no");
  const conclusion = t("object", "requires", "review");
  const settlement = settleCells([
    cell("object", "witnesses", "no", { against: ["opposition"] }),
  ], [rule("negative-premise", [{ cell: premise, atLeast: "active" }], { cell: conclusion, reading: "active" })]);
  const order = derivationOrderOf(settlement);
  const a = order.events.find((e) => e.cell.predicate === "witnesses" && e.side === "against");
  const b = order.events.find((e) => e.cell.predicate === "requires" && e.side === "against");
  assert.ok(a && b);
  assert.equal(a.stage, 0);
  assert.equal(b.stage, 1);
  assert.deepEqual(b.predecessors, [a.id]);
  assert.equal(order.events.filter((e) => e.side === "for").length, 0);
});

test("kinematic derivation of a stable-premise rule requires both evidence lanes", () => {
  const premise = t("measurement", "reads", "value");
  const conclusion = t("measurement", "requires", "review");
  const s = settleCells([cell("measurement", "reads", "value", {
    for: ["positive"], against: ["negative"],
  })], [rule("review-contradiction", [{ cell: premise, atLeast: "stable" }],
    { cell: conclusion, reading: "potential" })]);
  const order = derivationOrderOf(s);
  const parents = order.events.filter((e) => e.cell.predicate === "reads");
  const review = order.events.find((e) => e.cell.predicate === "requires");
  assert.deepEqual(new Set(parents.map((e) => e.side)), new Set(["for", "against"]));
  assert.deepEqual(new Set(review.predecessors), new Set(parents.map((e) => e.id)));
  assert.deepEqual(derivationPath(order, review.id).events.map((e) => e.id), [...parents, review].map((e) => e.id));
});

test("kinematic derivation refuses changed stages and weak historical rule IDs", () => {
  const good = chain();
  const altered = { ...good, stages: good.stages.map((stage, i) => i === 1
    ? { ...stage, valuation: stage.valuation.slice(0, -1) } : stage) };
  assert.throws(() => derivationOrderOf(altered), /not admitted/);
  const seedOnly = settleCells([]);
  assert.equal(settlementAdmits({ ...seedOnly, derivationVersion: 1 }).admitted, true);
  assert.throws(() => derivationOrderOf({ ...seedOnly, derivationVersion: 1 }), /version 2/);
});

test("previously derived evidence is a stage-zero assumption, not a fabricated cross-history edge", () => {
  const alreadySettled = chain();
  const newSettlement = settleCells(alreadySettled.settled);
  const order = derivationOrderOf(newSettlement);
  const derivedWitnesses = order.events.filter((e) => e.ruleId !== undefined);
  assert.ok(derivedWitnesses.length >= 2);
  assert.ok(derivedWitnesses.every((e) => e.stage === 0 && e.predecessors.length === 0));
});

test("kinematic proof motion is rule-licensed, not merely temporal term sharing", () => {
  const a = t("shared-subject", "marks", "one");
  const b = t("independent", "marks", "two");
  const c = t("shared-subject", "produces", "three");
  const s = settleCells([
    at("shared-subject", "marks", "one"),
    at("independent", "marks", "two"),
  ], [rule("licensed-by-independent", [{ cell: b, atLeast: "potential" }],
    { cell: c, reading: "potential" })]);
  const order = derivationOrderOf(s);
  const observedA = order.events.find((e) => e.cell.predicate === "marks" && e.cell.subject === "shared-subject");
  const observedB = order.events.find((e) => e.cell.predicate === "marks" && e.cell.subject === "independent");
  const derivedC = order.events.find((e) => e.cell.predicate === "produces");
  assert.ok(observedA && observedB && derivedC);
  assert.deepEqual(derivedC.predecessors, [observedB.id]);
  assert.ok(!derivedC.predecessors.includes(observedA.id));
  // The existing geometric causal reader can see shared terms and stages;
  // that is deliberately not the proof-licensing relation.
});

test("kinematic proof admission distinguishes well-formed graphs from real rule licenses", () => {
  const settlement = chain();
  const order = derivationOrderOf(settlement);
  assert.equal(typeof order.sourceSettlementId, "string");
  assert.equal(derivationOrderAdmits(order).level, "structural-only");
  assert.equal(derivationOrderAdmits(order, settlement).level, "settlement-replayed");
  const a = order.events.find(e => e.cell.subject === "a" && e.side === "for");
  const c = order.events.find(e => e.cell.subject === "c" && e.side === "for");
  assert.ok(a && c);
  assert.equal(derivationPath(order, c.id, settlement).events.at(-1).id, c.id);
  assert.equal(derivationPath(order, c.id).admissionLevel, "structural-only");
  assert.equal(derivationPath(order, c.id, settlement).admissionLevel, "settlement-replayed");
  assert.equal(derivationSeparation(order, a.id, c.id, settlement).admissionLevel, "settlement-replayed");
  const falseLicense = { ...order, events: order.events.map(e => e.id === c.id
    ? { ...e, predecessors: [a.id] } : e) };
  assert.equal(derivationOrderAdmits(falseLicense).level, "structural-only");
  assert.match(derivationOrderAdmits(falseLicense, settlement).reason, /not the replayed derivation/);
  assert.throws(() => derivationPath(falseLicense, c.id, settlement), /not admitted/);
});

test("kinematic proof paths refuse forged cycles, same-stage edges and repeated identities", () => {
  const order = derivationOrderOf(chain());
  const source = order.events.find(e => e.cell.subject === "a" && e.side === "for");
  const middle = order.events.find(e => e.cell.subject === "b" && e.side === "for");
  const target = order.events.find(e => e.cell.subject === "c" && e.side === "for");
  assert.ok(source && middle && target);
  const tamper = (id, change) => ({ ...order, events: order.events.map(e => e.id === id ? { ...e, ...change } : e) });
  assert.match(derivationOrderAdmits(tamper(source.id, { predecessors: [target.id] })).reason, /ancestor before the seed/);
  assert.match(derivationOrderAdmits(tamper(middle.id, { predecessors: [middle.id] })).reason, /same-stage or backwards/);
  assert.match(derivationOrderAdmits(tamper(target.id, { predecessors: [middle.id, middle.id] })).reason, /repeated predecessor/);
  assert.match(derivationOrderAdmits({ ...order, events: [...order.events, order.events.at(-1)] }).reason, /duplicates/);
  assert.throws(() => derivationPath(tamper(source.id, { predecessors: [target.id] }), target.id), /not admitted/);
});

test("kinematic witness cones distinguish derivational order from shared-term proximity", () => {
  const premise = t("isolated", "is", "evidence");
  const conclusion = t("shared", "has", "conclusion");
  const settlement = settleCells([
    at("isolated", "is", "evidence"),
    at("shared", "has", "unrelated"),
  ], [rule("only-isolated-supports-conclusion", [
    { cell: premise, atLeast: "potential" },
  ], { cell: conclusion, reading: "potential" })]);
  const order = derivationOrderOf(settlement);
  const supporting = order.events.find(e => e.cell.subject === "isolated" && e.side === "for");
  const incidental = order.events.find(e => e.cell.object === "unrelated" && e.side === "for");
  const derived = order.events.find(e => e.cell.object === "conclusion" && e.side === "for");
  assert.ok(supporting && incidental && derived);
  const fromSupport = derivationCone(order, supporting.id, settlement);
  assert.equal(fromSupport.admissionLevel, "settlement-replayed");
  assert.ok(fromSupport.future.some(e => e.id === derived.id));
  assert.deepEqual(derivationCone(order, derived.id).past.map(e => e.id), [supporting.id]);
  assert.equal(derivationSeparation(order, supporting.id, derived.id).kind, "signcraft.derivationSeparation.before");
  assert.equal(derivationSeparation(order, derived.id, supporting.id).kind, "signcraft.derivationSeparation.after");
  assert.equal(derivationSeparation(order, incidental.id, derived.id).kind, "signcraft.derivationSeparation.unordered");
  assert.equal(derivationSeparation(order, supporting.id, supporting.id).kind, "signcraft.derivationSeparation.same-event");
  assert.equal(derivationCone(order, "unknown").kind, "signcraft.derivationCone-obstruction");
  assert.equal(derivationSeparation(order, "unknown", derived.id).kind, "signcraft.derivationCone-obstruction");
});

test("kinematic cones preserve both evidence colors for a stable antecedent", () => {
  const p = t("measurement", "has", "conflict");
  const q = t("measurement", "needs", "inspection");
  const settlement = settleCells([
    cell("measurement", "has", "conflict", { for: ["affirmed"], against: ["denied"] }),
  ], [rule("both-sides", [{ cell: p, atLeast: "stable" }],
    { cell: q, reading: "potential" })]);
  const order = derivationOrderOf(settlement);
  const result = order.events.find(e => e.cell.predicate === "needs");
  const cone = derivationCone(order, result.id);
  assert.deepEqual(new Set(cone.past.map(e => e.side)), new Set(["for", "against"]));
  assert.equal(cone.past.length, 2);
});

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
  settleCells, settlementAdmits, settlementEvidence, filtration, filtrationOf, increments, firings,
  limitStages, nonScottFirings, firstCohomology, gradedGap, closureInvariant, closureEquivalent, classify,
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

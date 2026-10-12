import { test } from "node:test";
import assert from "node:assert/strict";

import {
  tobtobKin,
  wakanOfReading,
  readingOfWakan,
  discharge,
  markWakhan,
  wakanTanka,
  mitakuyeOyasin,
} from "../dist/index.mjs";

test("the four superior Wakȟáŋ are the four charges, bijectively", () => {
  assert.equal(tobtobKin.length, 4);
  for (const charge of ["absurd", "potential", "active", "stable"]) {
    assert.equal(readingOfWakan(wakanOfReading(charge).name), charge);
  }
  // the captain's mapping, pinned to the LIVE relating convention
  assert.equal(wakanOfReading("absurd").name, "Škáŋ"); // ⊥
  assert.equal(wakanOfReading("potential").name, "Wí"); // t
  assert.equal(wakanOfReading("active").name, "Makȟá"); // f
  assert.equal(wakanOfReading("stable").name, "Íŋyaŋ"); // ⊤
});

test("the cosmogony is DERIVED from the charge algebra, not asserted", () => {
  const cosmogony = discharge();
  // every recorded cosmogonic relation is the algebra's own verdict
  assert.equal(cosmogony.coherent, true, "the cosmogony must be coherent in the substrate");
  for (const relation of cosmogony.relations) {
    assert.equal(relation.holds, true, `relation must hold: ${relation.statement}`);
  }
  // the load-bearing two: Wí ∨ₖ Makȟá = Íŋyaŋ, Wí ∧ₖ Makȟá = Škáŋ
  const join = cosmogony.relations.find((r) => r.operation === "joinKnowledgeValue(potential, active)");
  const meet = cosmogony.relations.find((r) => r.operation === "meetKnowledgeValue(potential, active)");
  assert.equal(join?.result, "Íŋyaŋ");
  assert.equal(meet?.result, "Škáŋ");
});

test("the discharge seed is the initial ⊤ (Íŋyaŋ-in-Haŋhépi)", () => {
  const cosmogony = discharge();
  assert.equal(cosmogony.seed.position, "⊤");
  assert.equal(cosmogony.seed.charge, "stable");
  // emergence order: Makȟá (blood→earth) before Wí (made later); Íŋyaŋ-residual last
  assert.deepEqual(cosmogony.dischargeOrder, ["Makȟá", "Škáŋ", "Wí", "Íŋyaŋ"]);
});

test("wakȟáŋ is a quality read through its Wakȟáŋ aspect; Wakȟáŋ Tȟáŋka is the global pattern", () => {
  const marks = [
    markWakhan({ cell: "pipe" }, "potential"), // wakȟáŋ at t → Wí
    markWakhan({ cell: "treaty" }, "stable"), // wakȟáŋ at ⊤ → Íŋyaŋ (the sacred under attack)
  ];
  assert.equal(marks[0].aspect, "Wí");
  assert.equal(marks[1].aspect, "Íŋyaŋ");
  const whole = wakanTanka(marks);
  assert.equal(whole.marked, 2);
  assert.equal(whole.wholeIsWakhan, true);
  assert.deepEqual([...whole.aspects].sort(), ["Wí", "Íŋyaŋ"].sort());
});

test("mitakuye oyasin is the global theorem over the four-charge field", () => {
  const theorem = mitakuyeOyasin();
  assert.equal(theorem.relationalWhole, true);
  assert.equal(theorem.selfSimilar, true);
  assert.deepEqual([...theorem.field].sort(), ["absurd", "active", "potential", "stable"]);
});

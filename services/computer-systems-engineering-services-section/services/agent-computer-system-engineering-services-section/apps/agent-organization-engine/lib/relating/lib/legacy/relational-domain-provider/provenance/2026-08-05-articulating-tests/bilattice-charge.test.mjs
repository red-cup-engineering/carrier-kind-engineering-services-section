import assert from "node:assert/strict";
import test from "node:test";
import { bottom, chargeBilatticeLawReceipt, chargeSideName, chargeValue, chargeValueName, joinKnowledgeValue, valueOf } from "@red-cup-engineering/metrologic/articulation/predicating/positing/bilattice-charge";

test("the public charge algebra preserves the four authoritative values", () => {
  assert.deepEqual(chargeValue("absurd").coordinates.map(chargeSideName), ["absent", "absent"]);
  assert.deepEqual(chargeValue("potential").coordinates.map(chargeSideName), ["present", "absent"]);
  assert.deepEqual(chargeValue("active").coordinates.map(chargeSideName), ["absent", "present"]);
  assert.deepEqual(chargeValue("stable").coordinates.map(chargeSideName), ["present", "present"]);
  assert.equal(chargeValueName(valueOf(bottom)), "absurd");
  assert.equal(chargeValueName(joinKnowledgeValue(chargeValue("potential"), chargeValue("active"))), "stable");
  assert.equal(chargeValueName(joinKnowledgeValue(chargeValue("absurd"), chargeValue("active"))), "active");
});

test("the public charge algebra carries an exhaustive finite-law receipt", () => {
  const receipt = chargeBilatticeLawReceipt();
  assert.ok(Object.entries(receipt).every(([name, value]) => name === "kind" || value === true));
});

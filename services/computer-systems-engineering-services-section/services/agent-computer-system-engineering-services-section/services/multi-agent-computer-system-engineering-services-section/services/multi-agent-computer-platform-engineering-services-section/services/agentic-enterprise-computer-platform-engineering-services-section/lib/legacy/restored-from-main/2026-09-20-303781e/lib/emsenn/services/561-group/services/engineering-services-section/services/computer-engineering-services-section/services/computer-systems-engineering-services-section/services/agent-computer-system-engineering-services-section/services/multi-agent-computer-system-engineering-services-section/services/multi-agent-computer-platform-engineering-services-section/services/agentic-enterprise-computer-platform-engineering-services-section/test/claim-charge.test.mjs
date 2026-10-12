import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chargeValue,
  chargeValueName,
  chargeValueNames,
  joinKnowledgeValue,
  isChargeValueName,
  toArticulatingName,
  fromArticulatingName,
} from "../dist/lib/claim-charge.mjs";

test("chargeValueNames names exactly the wire vocabulary", () => {
  assert.deepEqual(chargeValueNames, ["unknown", "held", "denied", "contested"]);
});

test("toArticulatingName/fromArticulatingName round-trip every wire name", () => {
  for (const name of chargeValueNames) assert.equal(fromArticulatingName(toArticulatingName(name)), name);
});

test("isChargeValueName accepts only the four wire names", () => {
  for (const name of chargeValueNames) assert.equal(isChargeValueName(name), true);
  assert.equal(isChargeValueName("potential"), false);
  assert.equal(isChargeValueName("nonsense"), false);
});

test("joinKnowledgeValue is the knowledge-order join over the wire vocabulary", () => {
  const held = chargeValue("held");
  const denied = chargeValue("denied");
  const joined = joinKnowledgeValue(held, denied);
  assert.equal(chargeValueName(joined), "contested");
  const unknown = chargeValue("unknown");
  assert.equal(chargeValueName(joinKnowledgeValue(unknown, held)), "held");
});

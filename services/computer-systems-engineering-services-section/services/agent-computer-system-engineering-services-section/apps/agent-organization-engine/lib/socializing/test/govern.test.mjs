import assert from "node:assert/strict";
import test from "node:test";
import { governance } from "../src/socialize/govern.mjs";

const membrane = (text) => text.split("\n").map((line) => {
  const [token, claim] = line.split("|");
  return { token: { mark: { value: token } }, claim: { mark: { value: claim } } };
});

test("governance delegates pooling and directed-cycle reading to the shared jural provider", () => {
  const reading = governance(membrane("a|power>b>task\nb|power>a>task\na|power>b>task"));
  assert.equal(reading.kind, "socializing.governance");
  assert.equal(reading.relations.length, 2);
  assert.equal(reading.powers, 2);
  assert.equal(reading.directedCycle, true);
});

test("only a potential duty with the same holder, party, and scope closes accountability", () => {
  const missing = governance(membrane("boss|power>worker>task\nboss|duty>council>task"));
  const matched = governance(membrane("boss|power>worker>task\nboss|duty>worker>task"));
  assert.equal(missing.accountabilityGap, 1);
  assert.equal(matched.accountabilityGap, 0);
});

test("membrane relations never fabricate governance-act evidence", () => {
  const absent = governance(membrane("a|power>b>task"));
  const supplied = governance(membrane("a|power>b>task"), {
    attribution: "potential", binding: "potential", becoming: "potential",
  });
  assert.deepEqual(absent.act, { kind: "governance.act-reading", attribution: "absurd", binding: "absurd", becoming: "absurd", operativity: "absurd" });
  assert.equal(supplied.act.operativity, "potential");
});

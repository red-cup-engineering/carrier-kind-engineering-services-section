import assert from "node:assert/strict";
import test from "node:test";
import { incompleteRules, judgeAction, normalizeRule, ruleIsComplete, ruleNorms } from "../../src/agency/rules.mjs";

const registry = (...raws) => ({ rules: new Map(raws.map((raw) => [raw.id, normalizeRule(raw.id, raw)])) });

// A rule stated only in prose over every actor and every verb names no check the machine can
// run. Judged as written it forbade every action of every actor, officers included.
const prose = { id: "no-work-outside-an-office", statement: "A session MUST NOT do Group work that no office it holds bears as a duty.", subject: ["*"], action: ["*"] };

test("a prose-only rule neither refuses nor permits an action, and is reported incomplete", () => {
  const judgment = judgeAction(registry(prose), { actor: "actor:any", verb: "world-connect", input: {} });
  assert.equal(judgment.decision, "proceed");
  assert.deepEqual(judgment.reasons, []);
  assert.deepEqual(judgment.incomplete, [prose.statement]);
  assert.equal(ruleIsComplete(normalizeRule(prose.id, prose)), false);
  assert.deepEqual(incompleteRules(registry(prose)).map((entry) => entry.rule), [prose.id]);
});

test("a rule narrowed by subject, action, conditions or requirement still decides", () => {
  const byVerb = { id: "no-transfer", statement: "michael561 MUST NOT transfer.", subject: ["hive:michael561"], action: ["hive:transfer"] };
  const byCondition = { id: "no-alpha-sale", statement: "No account MUST NOT sell the Alpha Vial.", when: { input: { somewhere: { symbol: "ZINGALPHA" } } } };
  const agency = registry(prose, byVerb, byCondition);
  assert.equal(judgeAction(agency, { actor: "hive:michael561", verb: "hive:transfer", input: {} }).decision, "refuse");
  assert.equal(judgeAction(agency, { actor: "hive:michael561", verb: "hive:vote", input: {} }).decision, "proceed");
  assert.equal(judgeAction(agency, { actor: "hive:any", verb: "hive:custom_json", input: { ops: [{ symbol: "ZINGALPHA" }] } }).decision, "refuse");
  assert.equal(judgeAction(agency, { actor: "hive:any", verb: "hive:custom_json", input: { ops: [{ symbol: "OTHER" }] } }).decision, "proceed");
  assert.deepEqual(incompleteRules(agency).map((entry) => entry.rule), [prose.id]);
});

test("a prose-only rule is no governance norm until it is completed", () => {
  const scoped = { id: "scoped", statement: "Agents MUST NOT spend.", subject: ["agent:*"], action: ["spend"] };
  assert.deepEqual(ruleNorms(registry(prose, scoped)).map((norm) => norm.id), ["scoped:agent:*"]);
});

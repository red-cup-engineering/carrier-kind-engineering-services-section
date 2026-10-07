import assert from "node:assert/strict";
import test from "node:test";
import { assayIntentOf, deliveriesToVerify, VERIFIER_ROLE_NAMES, verifierFindingCodomainOf, verifierIntentOf, verifyingMovesOf, assayVerdictOf } from "../../src/enterprise/work-arena.mjs";
import { enterpriseOf } from "../../src/enterprise/constitution.mjs";

const thread = {
  id: "ni:///sha-256;abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG", standing: "delivered",
  opening: { move: "request", id: "ni:///sha-256;abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG", need: "The ledger books only sales to outside parties.", requirements: [], conditions: [] },
  refinements: [],
  deliveries: [{ player: "services/engineering-services-section#senior-engineer", evidence: ["git:abc"], at: "2026-10-03T00:00:00.000Z", revision: 0 }],
};
const board = { threads: [thread] };
const WHITE = "services/561-group-services-section#white-army";

test("the four roles are white, black, blue and red; red alone may find nothing to rehearse, and any may find the evidence uninspectable", () => {
  assert.deepEqual(VERIFIER_ROLE_NAMES, ["white", "black", "blue", "red"]);
  const operative = { conditions: [] };
  assert.deepEqual(verifierFindingCodomainOf("red", operative).properties.verdict.enum, ["met", "unmet", "none", "unverified"]);
  assert.deepEqual(verifierFindingCodomainOf("white", operative).properties.verdict.enum, ["met", "unmet", "unverified"]);
  assert.equal(verifierFindingCodomainOf("blue", operative).properties.evidence.minItems, 1);
});

test("a verifier owes every unjudged delivery but its own and those it already witnessed", () => {
  assert.equal(deliveriesToVerify(board, WHITE).length, 1);
  assert.equal(deliveriesToVerify(board, thread.deliveries[0].player).length, 0);
  const witnessed = { threads: [{ ...thread, deliveries: [{ ...thread.deliveries[0], witnesses: [{ player: WHITE, met: [], unmet: [] }] }] }] };
  assert.equal(deliveriesToVerify(witnessed, WHITE).length, 0);
});

test("a role's intent asks its question and carries the assay-of exemption; its finding tells a witness with evidence", () => {
  const [owed] = deliveriesToVerify(board, WHITE);
  const intent = verifierIntentOf("white", thread, owed.delivery, owed.ordinal, WHITE);
  assert.match(intent.id, /^verify-white-/u);
  assert.ok(intent.items[0].evidence.includes(`assay-of:${thread.id}`));
  assert.ok(intent.items[0].evidence.includes("verifier-role:white"));
  const [reject] = verifyingMovesOf([owed], () => assayVerdictOf({ verdict: "unmet", unmet: ["need"], reason: "a self-payment books as a sale", evidence: ["ledger:6919"] }));
  assert.deepEqual({ move: reject.move, by: reject.by, unmet: reject.unmet }, { move: "reject", by: WHITE, unmet: ["need"] });
  assert.deepEqual(verifyingMovesOf([owed], () => assayVerdictOf({ verdict: "none", evidence: ["no traversal planned"] })), []);
  assert.deepEqual(verifyingMovesOf([owed], () => ({ verdict: "met", evidence: [] })), []);
  assert.deepEqual(verifyingMovesOf([owed], () => assayVerdictOf({ verdict: "unverified", evidence: ["read timed out"] })), []);
});

test("an assay and a verifier's finding are admitted as the judging enterprise's own work, never as the assessing of demand", () => {
  const judging = enterpriseOf({ id: "group-operations", kind: "market", judges: { work: "judging-a-delivery", skill: "judge-a-delivery" } }).judges;
  const [assay] = assayIntentOf(thread, thread.deliveries[0], 1, [], { judging }).items;
  assert.deepEqual([assay.work, assay.skill], ["judging-a-delivery", "judge-a-delivery"]);
  const [owed] = deliveriesToVerify(board, WHITE);
  const [finding] = verifierIntentOf("white", thread, owed.delivery, owed.ordinal, WHITE, [], { judging }).items;
  assert.equal(finding.work, "judging-a-delivery");
  assert.equal(assayIntentOf(thread, thread.deliveries[0], 1).items[0].work, undefined);
  assert.equal(enterpriseOf({ id: "x", kind: "market" }).judges, null);
});

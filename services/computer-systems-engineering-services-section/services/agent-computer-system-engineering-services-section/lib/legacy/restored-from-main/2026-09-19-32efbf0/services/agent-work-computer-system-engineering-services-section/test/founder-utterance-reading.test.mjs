import test from "node:test";
import assert from "node:assert/strict";
import { assayFounderUtteranceInterpretation, formFounderUtteranceInterpretationDemand, readFounderUtterance } from "../src/founder-utterance-reading.mjs";

const UTTERANCE = Object.freeze({ s: "session-a", t: "2026-09-09T00:00:00.000Z", cwd: "/home/emsenn/info", n: 4, text: "Every Actor MUST have one shared model. Stop duplicating identities.", source: "rollout.jsonl", line: 80 });
const bcp = ({ text }) => ({ type: "Bcp14RequirementSet", version: 1, requirements: [{ type: "Bcp14Requirement", version: 1, force: "MUST", subject: "Every Actor", predicate: "have", object: "one shared model", text: "Every Actor MUST have one shared model", line: 1 }], refusals: [] });

test("one reading preserves the raw Founder record while adding deterministic language and BCP readings", () => {
  const reading = readFounderUtterance({ utterance: UTTERANCE, readBcp14Requirements: bcp, settleLanguage: (text) => ({ type: "ParseForest", text }) });
  assert.equal(reading.text, UTTERANCE.text);
  assert.deepEqual(reading.source, { s: "session-a", t: "2026-09-09T00:00:00.000Z", cwd: "/home/emsenn/info", n: 4, source: "rollout.jsonl", line: 80 });
  assert.equal(reading.requirements[0].source.line, 80);
  assert.equal(reading.requirements[0].text, "Every Actor MUST have one shared model");
  assert.equal(reading.needsProvisionalInterpretation, false);
});

test("inference demand is zero-cash and asks for a bounded provisional reading", () => {
  const reading = readFounderUtterance({ utterance: UTTERANCE, readBcp14Requirements: bcp, settleLanguage: () => ({}) });
  const demand = formFounderUtteranceInterpretationDemand(reading);
  assert.equal(demand.zeroCashOnly, true);
  assert.equal(demand.enforceProviderSchema, true);
  assert.equal(demand.outputSchema.additionalProperties, false);
  assert.match(demand.objective, /provisional/u);
});

test("the receiver refuses a model proposal unless each claim pins an exact source excerpt", () => {
  const reading = readFounderUtterance({ utterance: UTTERANCE, readBcp14Requirements: bcp, settleLanguage: () => ({}) });
  const accepted = assayFounderUtteranceInterpretation({ reading, result: { candidate: { type: "FounderUtteranceInterpretation", version: 1, source: { s: "session-a", n: 4 }, interpretations: [{ kind: "correction-interpretation", sourceText: "Stop duplicating identities.", proposal: "Identify and replace competing identity implementations." }] } } });
  assert.equal(accepted.accepted, true);
  const refused = assayFounderUtteranceInterpretation({ reading, result: { candidate: { type: "FounderUtteranceInterpretation", version: 1, source: { s: "session-a", n: 4 }, interpretations: [{ kind: "correction-interpretation", sourceText: "invented", proposal: "invented" }] } } });
  assert.equal(refused.accepted, false);
  assert.match(refused.refusals[0], /contiguous source excerpt/u);
});

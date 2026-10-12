import assert from "node:assert/strict";
import test from "node:test";
import * as scientific from "@red-cup-engineering/computer-data-engineering-services-section/signcell/utterance";
import { Mark, Token, Claim, mark, token, claim, markKinds, isMarkKind, utterance, articulatingUtter, articulatingPair, articulatingHead, articulatingDepth, articulatingFloor, articulatingUtterNePair, utteranceSchema, articulate, articulationCellSchema, tokenIdentity, claimIdentity, isArticulationCell, isMark, markBoundarySchema, markObservationReport, coincides } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/utterance";
import { artifactTier, artifactProjectionStep, artifactInformationChain, isStatementValue, statementValue, canonicalStatementValue, statementRow, statementTuple, statementCell, statementAttributes, sameStatement, statementIdentity, statementLogInformation, feedEntropyCharge, normalizeStatementLog, sameStatementLog, artifactTiers } from "@lenticule-science/metrologic/settling/records/persistence";
const records = Object.freeze({ Mark, Token, Claim, mark, token, claim, markKinds, isMarkKind, utterance, articulatingUtter, articulatingPair, articulatingHead, articulatingDepth, articulatingFloor, articulatingUtterNePair, utteranceSchema, articulate, articulationCellSchema, tokenIdentity, claimIdentity, isArticulationCell, isMark, markBoundarySchema, markObservationReport, coincides, artifactTier, artifactProjectionStep, artifactInformationChain, isStatementValue, statementValue, canonicalStatementValue, statementRow, statementTuple, statementCell, statementAttributes, sameStatement, statementIdentity, statementLogInformation, feedEntropyCharge, normalizeStatementLog, sameStatementLog, artifactTiers });
import { utteranceSchemaContract, articulationCellSchemaContract } from "@red-cup-engineering/relating/carriers/schema";
import { dehydrateUtterances, rehydrateUtterances } from "@red-cup-engineering/eavt/log-path";
import { utterOperation, articulateOperation, predicateOperation, induceOperation } from "../src/apps/infograph/operations/inducing.mjs";
import { compose } from "../src/rpc/operation.mjs";
import { jsonToTerm, termToJson } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/json-codec";

const wire = value => JSON.parse(JSON.stringify(value));
const run = (operation, input) => operation.execute(input, {});

test("the tooling uses the scientific objects and schemas directly", () => {
  for (const name of ["Mark", "Token", "Claim", "mark", "token", "claim", "utterance", "articulate"]) {
    assert.equal(records[name], scientific[name]);
  }
  assert.equal(utteranceSchemaContract.schema, scientific.utteranceSchema);
  assert.equal(articulationCellSchemaContract.schema, scientific.articulationCellSchema);
});

test("existing logs reconstitute shared objects without changing persisted payloads", () => {
  const saved = { kind: "meme-topology.utteranceLog", utterances: [
    { token: { device: "sensor", reading: false }, claim: "held" },
    { token: ["unknown", 0, null], claim: { observed: true } },
    { token: JSON.parse('{"__proto__":{"observed":true},"constructor":"held"}'), claim: false },
  ] };
  const admitted = rehydrateUtterances(saved);
  assert.ok(admitted.every(value => value.token instanceof scientific.Token && value.claim instanceof scientific.Claim));
  assert.ok(admitted.every(value => utteranceSchemaContract.validate(value)));
  assert.deepEqual(dehydrateUtterances(admitted), saved);
});

test("tool operations compose through canonical objects and one portable encoding", () => {
  const input = { token: JSON.parse('{"reading":false,"__proto__":{"observed":true}}'), claim: "held" };
  const admitted = run(utterOperation, input);
  assert.deepEqual(termToJson(jsonToTerm(admitted)), admitted);
  const opened = run(articulateOperation, admitted);
  assert.deepEqual(opened, wire(scientific.articulate(admitted)));
  assert.ok(articulationCellSchemaContract.validate(opened));
  const composed = compose(articulateOperation, predicateOperation, "articulate-then-predicate");
  assert.deepEqual(run(composed, admitted), run(predicateOperation, opened));
  const result = run(induceOperation, admitted);
  assert.deepEqual(result.cells[0].subject.mark.value, input.token);
  assert.deepEqual(result.cells[0].predicate.claim.mark.value, input.claim);
});

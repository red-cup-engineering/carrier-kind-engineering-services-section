import assert from "node:assert/strict";
import test from "node:test";
import { makeNiUri, verifyNiUri } from "@red-cup-engineering/ni-uri-services-section";
import {
  induceCapabilityRepairDemand,
  inducePrivateLiveMudDemand,
  PRIVATE_LIVE_MUD_REQUIREMENTS,
} from "../src/semiotic-exchange-demand-induction.mjs";
const ni = (value) => makeNiUri(Buffer.from(value, "utf8"));
const observation = (requirement, positive = [], negative = []) => ({ requirement, positive: positive.map(ni), negative: negative.map(ni) });

test("induces the private live MUD as canonical raiseDemand material through the actual four-stage descent", () => {
  const observations = PRIVATE_LIVE_MUD_REQUIREMENTS.map(({ id }) => observation(id, [`${id}:present`]));
  const missing = observations.find(({ requirement }) => requirement === "lawful-zero-custody-moves");
  missing.positive = [];
  missing.negative = [ni("actuator-not-deployed")];
  const result = inducePrivateLiveMudDemand({ observations });

  assert.equal(result.type, "SemioticExchangeDemandInductionReceipt");
  assert.match(result.id, /^ni:\/\/\/sha-256;/u);
  assert.equal(verifyNiUri(result.receiptBytes, result.id), true);
  assert.match(result.demandNi, /^ni:\/\/\/sha-256;/u);
  assert.match(result.demandBytes32, /^0x[0-9a-f]{64}$/u);
  assert.match(result.groundingDigest, /^0x[0-9a-f]{64}$/u);
  assert.match(result.wantedLawDigest, /^0x[0-9a-f]{64}$/u);
  assert.equal(verifyNiUri(result.demandBytes, result.demandNi), true);
  assert.equal(verifyNiUri(result.groundingBytes, result.groundingNi), true);
  assert.equal(verifyNiUri(result.wantedLawBytes, result.wantedLawNi), true);
  assert.deepEqual(result.raiseDemand.args, [`0x${result.demandBytes.toString("hex")}`, result.groundingDigest, result.wantedLawDigest]);
  assert.equal(result.descentEvidence.length, PRIVATE_LIVE_MUD_REQUIREMENTS.length);
  for (const evidence of result.descentEvidence) {
    assert.equal(evidence.articulation.kind, "utterance.articulation.cell");
    assert.equal(evidence.predication.kind, "predication.site");
    assert.equal(evidence.positing.kind, "predication.posit.presheaf");
    assert.equal(evidence.settlement.kind, "predication.settlement.filtration");
  }
  assert.deepEqual(result.restrictedArena.map(({ operation, prerequisite, evidenceSide, resultingHistoricalSupport }) => ({ operation, prerequisite, evidenceSide, resultingHistoricalSupport })), [
    { operation: "admit-prerequisite-evidence", prerequisite: "lawful-zero-custody-moves", evidenceSide: "positive", resultingHistoricalSupport: "stable" },
    { operation: "admit-prerequisite-evidence", prerequisite: "lawful-zero-custody-moves", evidenceSide: "negative", resultingHistoricalSupport: "active" },
  ]);
  assert.match(result.restrictedArena[0].postcondition, /zero-custody SemioticExchange actuator/u);
  assert.match(result.restrictedArena[0].completionWitness, /potential successor observation/u);
  assert.deepEqual(result.causalGraph.find(({ id }) => id === "private-live-mud").blockedBy, ["lawful-zero-custody-moves"]);
});

test("retains positive and negative evidence as Lakota-named FOUR charges without resolving contradiction", () => {
  const observations = PRIVATE_LIVE_MUD_REQUIREMENTS.map(({ id }) => observation(id, [`${id}:present`]));
  const contested = observations.find(({ requirement }) => requirement === "machine-only-admission");
  contested.negative = [ni("gate-publicly-bypassable")];
  const result = inducePrivateLiveMudDemand({ observations });
  const node = result.causalGraph.find(({ id }) => id === "machine-only-admission");
  assert.equal(node.support, "stable");
  assert.equal(node.satisfied, false);
  assert.ok(result.restrictedArena.some(({ prerequisite }) => prerequisite === "machine-only-admission"));
});

test("preserves exact observed evidence in both posit and settlement presentations", () => {
  const left = PRIVATE_LIVE_MUD_REQUIREMENTS.map(({ id }) => observation(id, [`${id}:left`], [`${id}:against`]));
  const right = PRIVATE_LIVE_MUD_REQUIREMENTS.map(({ id }) => observation(id, [`${id}:right`], [`${id}:against`]));
  const leftResult = inducePrivateLiveMudDemand({ observations: left });
  const rightResult = inducePrivateLiveMudDemand({ observations: right });

  assert.equal(leftResult.descentEvidence[0].positing.observedCharge, "stable");
  assert.notEqual(leftResult.descentEvidence[0].positing.presentation, rightResult.descentEvidence[0].positing.presentation);
  assert.notEqual(leftResult.descentEvidence[0].settlement.presentation, rightResult.descentEvidence[0].settlement.presentation);
});

test("uses the exact FOUR support map: neither absurd, true-only potential, false-only active, both stable", () => {
  const shapes = [
    [[], [], "absurd"],
    [["for"], [], "potential"],
    [[], ["against"], "active"],
    [["for"], ["against"], "stable"],
  ];
  const observations = PRIVATE_LIVE_MUD_REQUIREMENTS.map(({ id }, index) => observation(id, shapes[index % 4][0], shapes[index % 4][1]));
  const result = inducePrivateLiveMudDemand({ observations });
  assert.deepEqual(result.causalGraph.slice(0, 4).map(({ support }) => support), shapes.map((shape) => shape[2]));
  assert.equal(result.causalGraph[1].satisfied, true);
  assert.equal(result.causalGraph[3].satisfied, false);
});

test("refuses missing, duplicate, foreign, or non-content-addressed observations", () => {
  const complete = PRIVATE_LIVE_MUD_REQUIREMENTS.map(({ id }) => observation(id));
  assert.throws(() => inducePrivateLiveMudDemand({ observations: complete.slice(1) }), /every private live-MUD requirement/u);
  assert.throws(() => inducePrivateLiveMudDemand({ observations: [...complete, complete[0]] }), /duplicate/u);
  assert.throws(() => inducePrivateLiveMudDemand({ observations: [...complete.slice(1), observation("foreign")] }), /unknown/u);
  assert.throws(() => inducePrivateLiveMudDemand({ observations: complete.map((item, index) => index ? item : { ...item, positive: ["claim"] }) }), /canonical SHA-256 ni/u);
});

test("conserves a witnessed refusal as canonical raiseDemand material rather than a local backlog", () => {
  const result = induceCapabilityRepairDemand({
    raiser: "0x08E4B3bc9ef76b403879C0eC372d1Fd146E3a07B",
    locus: "https://gui.561.group/l-space/obsmetrologia",
    operation: "normalize-obsmetrologia-carrier",
    objective: "normalize a real Obsmetrologia carrier under its public law",
    refusalCode: "normalizer-actuator-unavailable",
    refusalWitnessNis: [ni("normalizer-refusal")],
    requiredStandard: "RMN canonical relational value",
    inputNi: ni("frozen-carrier"),
  });
  assert.equal(result.type, "CapabilityRepairDemandInductionReceipt");
  assert.match(result.residueNi, /^ni:\/\/\/sha-256;/u);
  assert.equal(result.market.discovery, "federated-capability-offer-discovery");
  assert.deepEqual(result.raiseDemand.args, [`0x${result.demandBytes.toString("hex")}`, result.groundingDigest, result.wantedLawDigest]);
  assert.equal(verifyNiUri(result.receiptBytes, result.id), true);
  assert.throws(() => induceCapabilityRepairDemand({
    raiser: "0x08E4B3bc9ef76b403879C0eC372d1Fd146E3a07B", locus: "https://gui.561.group/l-space/obsmetrologia",
    operation: "normalize-obsmetrologia-carrier", objective: "normalize one real carrier", refusalCode: "normalizer-actuator-unavailable",
    refusalWitnessNis: [], requiredStandard: "RMN canonical relational value", inputNi: ni("frozen-carrier"),
  }), /refusal witness/u);
});

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { encodeRelationalValue } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";
import { createCarrierAdmissionReceipt, createModeledUnionDimension, induceTemporalFailureRepairMoves } from "../src/index.mjs";
import {
  inducePrivateLiveMudDemand,
  PRIVATE_LIVE_MUD_REQUIREMENTS,
} from "../../../../../src/semiotic-exchange-demand-induction.mjs";
import { induceCapabilityRepairDemand } from "../../../../../src/semiotic-exchange-demand-induction.mjs";
import { scanTemporalFailureMarks } from "../../../../../../../../software-development-services-section/services/typed-resource-catalog-service/src/temporal-failure-normalization.mjs";

const exchange = "0x98bBC65824962b61dF876A47B5779C4EcBBD4939";
const controller = "0x08E4B3bc9ef76b403879C0eC372d1Fd146E3a07B";
const id = (byte) => `0x${byte.repeat(64)}`;
const ni = (label) => `ni:///sha-256;${createHash("sha256").update(label).digest("base64url")}`;
const canonical = (value) => { const encoded = encodeRelationalValue(value), term = ["ascribe", encoded.type, encoded.term]; return { ni: semanticId(term), bytes: semanticBytes(term) }; };
const position = (logIndex) => Object.freeze({ blockNumber: 5619n, blockHash: id("a"), transactionHash: id(String(logIndex + 1)), logIndex });
const event = (kind, logIndex, fields) => Object.freeze({ kind, chainPosition: position(logIndex), ...fields });
const cell = id("1"), law = id("2"), demand = id("3"), offer = id("4"), result = id("5");
const cellCarrier = createCarrierAdmissionReceipt({ carrier: { type: "SemioticExchangeCellCarrier", value: { type: "SemioticExchangeCellCarrier", cell, law } }, protocolVerificationReceiptNis: [ni("cell-protocol")] });
const demandCarrier = createCarrierAdmissionReceipt({ carrier: { type: "SemioticExchangeDemandCarrier", value: { type: "SemioticExchangeDemandCarrier", objective: "private live MUD" } }, protocolVerificationReceiptNis: [ni("demand-protocol")] });
const offerCarrier = createCarrierAdmissionReceipt({ carrier: { type: "SemioticExchangeOfferCarrier", value: { type: "SemioticExchangeOfferCarrier", demand, cell } }, protocolVerificationReceiptNis: [ni("offer-protocol")] });

const history = Object.freeze([
  event("CellSeated", 0, { cell, controller, law, carrierNi: cellCarrier.contentNi }),
  event("DemandRaised", 1, { demand, raiser: controller, wantedLaw: law, grounding: id("6"), carrierNi: demandCarrier.contentNi }),
  event("DemandOffered", 2, { demand, offer, cell, controller, carrierNi: offerCarrier.contentNi }),
  event("PurchaseMoved", 3, { demand, offer, cell, raiser: controller, controller }),
  event("DemandSettled", 4, { demand, cell, controller, result, carrierNi: ni("result") }),
  event("CellRetired", 5, { cell, controller }),
]);
const create = (options = {}) => createModeledUnionDimension({ events: history, chainId: "eip155:5615610", exchange, ...options });
const standing = (object, support) => { const encoded = canonical(object); return Object.freeze({ type: "FederationHistoryStanding", objectNi: encoded.ni, objectBytes: encoded.bytes, object: Object.freeze(object), witnesses: Object.freeze([ni(`witness:${encoded.ni}`)]), support: Object.freeze(support) }); };

test("replays monotone live contract history into earned loci and causal relations", () => {
  const presentation = create().presentation();
  assert.deepEqual(presentation.events.map(({ kind }) => kind), ["CellSeated", "DemandRaised", "DemandOffered", "PurchaseMoved", "DemandSettled", "CellRetired"]);
  assert.deepEqual(presentation.loci.map(({ type }) => type), ["SemioticCellLocus", "SemioticDemandLocus", "SemioticOfferLocus"]);
  assert.ok(presentation.relations.some((edge) => edge.type === "purchaseMove" && edge.from === `demand:${demand}` && edge.to === `cell:${cell}`));
  assert.equal(presentation.relations.filter(({ type }) => type === "causallyFollows").length, history.length - 1);
});

test("FOUR charge consumes only exact top-level admitted federation standings", () => {
  const absurd = create().presentation().loci.find(({ id: locus }) => locus === demand);
  assert.deepEqual(absurd.support, { positive: false, negative: false, charge: "absurd" });
  const positive = standing({ type: "SemioticSupportClaim", locus: demand }, { positive: true, negative: false, value: "potential" });
  const negative = standing({ type: "SemioticSupportClaim", locus: demand }, { positive: false, negative: true, value: "active" });
  const nestedLie = standing({ type: "UnrelatedCarrier", nested: { type: "SemioticSupportClaim", locus: cell } }, { positive: true, negative: false, value: "potential" });
  const presentation = create({ federationHistory: [positive, negative, nestedLie] }).presentation();
  assert.deepEqual(presentation.loci.find(({ id: locus }) => locus === demand).support, { positive: true, negative: true, charge: "stable" });
  assert.deepEqual(presentation.loci.find(({ id: locus }) => locus === cell).support, { positive: false, negative: false, charge: "absurd" });
});

test("canonical carrier and paired UCAN/controller receipts enable one restricted purchase move", async () => {
  const ucan = { id: ni("ucan"), type: "UcanInvocationVerificationReceipt", version: 1, disposition: "authorized", revocationStatus: "active", controller: "did:key:zController111111", actor: "did:key:zActor11111111111", invocationCid: "bafy-invocation", delegationCid: "bafy-delegation", capabilityNi: ni("capability"), capability: { can: "semiotic-exchange/purchase-move" } };
  ucan.capability.with = "did:pkh:eip155:5615610:0x08e4b3bc9ef76b403879c0ec372d1fd146e3a07b";
  const binding = { id: ni("binding"), type: "EnterpriseAccountControllerBindingReceipt", version: 1, disposition: "bound", protocol: "ERC-1271", resource: ucan.capability.with, controller: ucan.controller, actor: ucan.actor, invocationCid: ucan.invocationCid, delegationCid: ucan.delegationCid, capabilityNi: ucan.capabilityNi };
  const calls = [];
  const partial = createModeledUnionDimension({ events: history.slice(0, 3), chainId: "eip155:5615610", exchange, carrierAdmissions: [cellCarrier, demandCarrier, offerCarrier], authorityReceipts: { ucan: [ucan], controllerBindings: [binding] }, actuator: async (action) => { calls.push(action); return { settled: true, action: action.id }; } });
  const action = partial.restrictedArena(controller).actions.find(({ operation }) => operation === "purchaseMove");
  assert.equal(action.available, true);
  assert.deepEqual(action.evidence, { carrierAdmissionReceiptNis: [cellCarrier.id, demandCarrier.id, offerCarrier.id], ucanInvocationVerificationReceiptNi: ucan.id, enterpriseAccountControllerBindingReceiptNi: binding.id });
  assert.deepEqual(await partial.actuate(action.id, controller), { settled: true, action: action.id });
  assert.equal(calls.length, 1);
});

test("refuses forged carrier identity and ungrounded authority", () => {
  assert.throws(() => create({ carrierAdmissions: [{ ...demandCarrier, contentNi: ni("forged") }] }), /canonical identity/u);
  const partial = createModeledUnionDimension({ events: history.slice(0, 3), chainId: "eip155:5615610", exchange, carrierAdmissions: [cellCarrier, demandCarrier, offerCarrier] });
  const action = partial.restrictedArena(controller).actions.find(({ operation }) => operation === "purchaseMove");
  assert.equal(action.available, false);
  assert.equal(action.unavailability, "authority-receipts-required");
});

test("a witnessed canonical induction projects private GUI deployment as a real restricted move", async () => {
  const observations = PRIVATE_LIVE_MUD_REQUIREMENTS.map(({ id: requirement }) => ({ requirement, positive: [ni(`${requirement}:earned`)], negative: [] }));
  const final = observations.find(({ requirement }) => requirement === "private-live-mud"); final.positive = []; final.negative = [ni("private-live-mud:not-yet-deployed")];
  const induction = inducePrivateLiveMudDemand({ observations });
  const raised = event("DemandRaised", 0, { demand: induction.demandBytes32, raiser: controller, wantedLaw: induction.wantedLawDigest, grounding: induction.groundingDigest, carrierNi: induction.demandNi });
  const calls = [];
  const dimension = createModeledUnionDimension({ events: [raised], chainId: "eip155:5615610", exchange, demandInductionReceipts: [induction], deploymentActuator: async (action) => { calls.push(action); return { deployed: action.demand }; } });
  const action = dimension.restrictedArena(controller).actions.find(({ operation }) => operation === "deployPrivateLiveMud");
  assert.equal(action.available, true);
  assert.equal(action.evidence.demandInductionReceiptNi, induction.id);
  assert.deepEqual(await dimension.actuate(action.id, controller), { deployed: induction.demandBytes32.toLowerCase() });
  assert.equal(calls.length, 1);
});

test("x402 evidence is exact top-level federation matter, never a recursive shape scan", () => {
  const evidence = { type: "X402SettlementEvidence", success: true, network: "eip155:5615610", transaction: id("b"), invocation: `sha256:${"c".repeat(64)}`, amount: "17" };
  const direct = standing(evidence, { positive: true, negative: false, value: "potential" });
  const nested = standing({ type: "Other", evidence }, { positive: true, negative: false, value: "potential" });
  assert.equal(create({ federationHistory: [direct, nested] }).presentation().x402SettlementEvidence.length, 1);
});

test("refuses displaced roles, noncausal ordering, and incoherent FOUR standings", () => {
  const displaced = history.slice(0, 4).map((move) => ({ ...move })); displaced[3].raiser = "0x1111111111111111111111111111111111111111";
  assert.throws(() => createModeledUnionDimension({ events: displaced, chainId: "eip155:5615610", exchange }), /roles do not match/u);
  assert.throws(() => createModeledUnionDimension({ events: [history[1], history[0]], chainId: "eip155:5615610", exchange }), /strict chain order/u);
  const bad = { ...standing({ type: "SemioticSupportClaim", locus: demand }, { positive: true, negative: false, value: "potential" }), support: { positive: true, negative: false, value: "stable" } };
  assert.throws(() => create({ federationHistory: [bad] }), /incoherent FOUR/u);
});

test("a refusal becomes an open capability market locus and only a later positive settled provider receipt closes it", () => {
  const induction = induceCapabilityRepairDemand({
    raiser: controller,
    locus: "https://gui.561.group/l-space/obsmetrologia",
    operation: "normalize-obsmetrologia-carrier",
    objective: "normalize one real Obsmetrologia carrier",
    refusalCode: "normalizer-actuator-unavailable",
    refusalWitnessNis: [ni("normalizer-refusal")],
    requiredStandard: "RMN canonical relational value",
    inputNi: ni("frozen-carrier"),
  });
  const unraised = createModeledUnionDimension({ events: [], chainId: "eip155:5615610", exchange, capabilityDemandInductionReceipts: [induction] });
  const ready = unraised.presentation().capabilityDemandMetabolism[0];
  assert.equal(ready.phase, "ready-to-raise");
  assert.equal(ready.grayDegree, "active");
  assert.deepEqual(ready.raiseDemand, induction.raiseDemand);
  const raise = unraised.restrictedArena(controller).actions.find(({ operation }) => operation === "raiseDemand");
  assert.equal(raise.available, false);
  assert.equal(raise.unavailability, "carrier-admission-required");

  const capabilityCell = id("7"), capabilityOffer = id("8"), completed = id("9");
  const capabilityHistory = [
    event("CellSeated", 0, { cell: capabilityCell, controller, law: induction.wantedLawDigest, carrierNi: cellCarrier.contentNi }),
    event("DemandRaised", 1, { demand: induction.demandBytes32, raiser: controller, wantedLaw: induction.wantedLawDigest, grounding: induction.groundingDigest, carrierNi: induction.demandNi }),
    event("DemandOffered", 2, { demand: induction.demandBytes32, offer: capabilityOffer, cell: capabilityCell, controller, carrierNi: offerCarrier.contentNi }),
    event("PurchaseMoved", 3, { demand: induction.demandBytes32, offer: capabilityOffer, cell: capabilityCell, raiser: controller, controller }),
    event("DemandSettled", 4, { demand: induction.demandBytes32, cell: capabilityCell, controller, result: completed, carrierNi: ni("normalization-result") }),
  ];
  const refusal = standing({ type: "CapabilityProviderAttemptReceipt", version: 1, demand: induction.demandBytes32, offer: capabilityOffer, provider: controller, outcome: "refused", residueNi: induction.residueNi }, { positive: false, negative: true, value: "active" });
  const success = standing({ type: "CapabilityProviderAttemptReceipt", version: 1, demand: induction.demandBytes32, offer: capabilityOffer, provider: controller, outcome: "completed", result: completed, outputReceiptNi: ni("normalization-output") }, { positive: true, negative: false, value: "potential" });
  const settled = createModeledUnionDimension({ events: capabilityHistory, chainId: "eip155:5615610", exchange, capabilityDemandInductionReceipts: [induction], federationHistory: [refusal, success] }).presentation().capabilityDemandMetabolism[0];
  assert.equal(settled.phase, "succeeded");
  assert.equal(settled.grayDegree, "stable");
  assert.equal(settled.obstruction, null);
  assert.equal(settled.attempts.length, 2);
  assert.equal(settled.offers[0].provider, controller);
  assert.throws(() => createModeledUnionDimension({ events: capabilityHistory, chainId: "eip155:5615610", exchange, capabilityDemandInductionReceipts: [induction], federationHistory: [{ ...success, support: { positive: false, negative: true, value: "active" } }] }), /completion requires result and positive support/u);
});

test("an A2A repository observation and temporal scan induce an actual restricted repair-market move", () => {
  const source = { path: "src/runner.mjs", content: "AbortSignal.timeout(1);" };
  const scan = scanTemporalFailureMarks({ resources: [source] });
  const observation = { type: "RepositoryMaterialObservation", id: ni("repository-material-observation"), projection: { kind: "matching-lines", carrier: "inline", hits: [{ path: source.path, line: 1, text: source.content }] } };
  const moves = induceTemporalFailureRepairMoves({ raiser: controller, repositoryObservation: observation, scanReceipt: scan, induceDemand: induceCapabilityRepairDemand });
  assert.equal(moves.demands.length, 1);
  assert.equal(moves.demands[0].inputNi, scan.id);
  assert.deepEqual(moves.demands[0].refusalWitnessNis, [observation.id, scan.id].sort());
  const dimension = createModeledUnionDimension({ events: [], chainId: "eip155:5615610", exchange, capabilityDemandInductionReceipts: moves.demands });
  const action = dimension.restrictedArena(controller).actions.find(({ operation }) => operation === "raiseDemand");
  assert.ok(action);
  assert.equal(action.capabilityDemandInductionReceiptNi, moves.demands[0].id);
  assert.equal(dimension.presentation().capabilityDemandMetabolism[0].phase, "ready-to-raise");
});

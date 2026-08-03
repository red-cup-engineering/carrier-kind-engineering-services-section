import assert from "node:assert/strict";
import test from "node:test";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
import { createCarrierAdmissionReceipt, createModeledUnionDimension, createWorkCarrier, deriveCultivationDemandCarrier } from "../src/index.mjs";
import { makeNiUri } from "@red-cup-engineering/ni-uri-services-section";

const ni = (value) => makeNiUri(Buffer.from(value, "utf8"));
const id = (byte) => `0x${byte.repeat(64)}`;
const exchange = "0x98bBC65824962b61dF876A47B5779C4EcBBD4939";
const worker = "0x08E4B3bc9ef76b403879C0eC372d1Fd146E3a07B";
const other = "0x18E4B3bc9ef76b403879C0eC372d1Fd146E3a07B";
const law = id("1"), cell = id("2"), demand = id("3"), offer = id("4"), result = id("5");
const canonical = (value) => { const identified = identifyJsonSemanticContent({ objectKind: `modeled-union-dimension.${value?.type ?? "material"}`, value, witnessRoot: EMPTY_WITNESS_ROOT }); return { ni: identified.token, bytes: identified.bytes }; };
const standing = (object, support) => { const encoded = canonical(object); return Object.freeze({ type: "FederationHistoryStanding", objectNi: encoded.ni, objectBytes: encoded.bytes, object: Object.freeze(object), witnesses: Object.freeze([ni(`witness:${encoded.ni}`)]), support: Object.freeze(support) }); };
const event = (kind, logIndex, fields) => Object.freeze({ kind, chainPosition: Object.freeze({ blockNumber: 5620n, blockHash: id("a"), transactionHash: id(String(logIndex + 1)), logIndex }), ...fields });

const work = createWorkCarrier({
  endeavor: { id: "heal-semiotic-foam" },
  project: { id: "activate-latent-compute", endeavor: "heal-semiotic-foam" },
  milestone: { id: "circulate-a-real-provider-reaction", project: "activate-latent-compute" },
  duty: { id: "procuring-inference-work", office: "integrated-portfolio-management-team" },
  qualification: { ranks: ["qualified"], cohorts: ["2026-07-union-officer-corps"], capabilities: ["broker-inference-work"] },
  evidenceNis: [ni("work-law")],
});
const workCarrier = createCarrierAdmissionReceipt({ carrier: work, protocolVerificationReceiptNis: [ni("work-carrier-protocol")] });
const cellCarrier = createCarrierAdmissionReceipt({ carrier: { type: "SemioticExchangeCellCarrier", value: { cell, law } }, protocolVerificationReceiptNis: [ni("cell-protocol")] });
const offerCarrier = createCarrierAdmissionReceipt({ carrier: { type: "SemioticExchangeOfferCarrier", value: { demand, cell } }, protocolVerificationReceiptNis: [ni("offer-protocol")] });
const history = Object.freeze([
  event("CellSeated", 0, { cell, controller: worker, law, carrierNi: cellCarrier.contentNi }),
  event("DemandRaised", 1, { demand, raiser: other, wantedLaw: law, grounding: id("6"), carrierNi: workCarrier.contentNi }),
  event("DemandOffered", 2, { demand, offer, cell, controller: worker, carrierNi: offerCarrier.contentNi }),
  event("PurchaseMoved", 3, { demand, offer, cell, raiser: other, controller: worker }),
  event("DemandSettled", 4, { demand, cell, controller: worker, result, carrierNi: ni("result") }),
]);
const create = (options = {}) => createModeledUnionDimension({ events: history, chainId: "eip155:5615610", exchange, carrierAdmissions: [workCarrier, cellCarrier, offerCarrier], ...options });

const qualification = standing({ type: "WorkQualificationClaim", version: 1, actor: worker, office: "integrated-portfolio-management-team", rank: "qualified", cohorts: ["2026-07-union-officer-corps"], duties: ["procuring-inference-work"], capabilities: ["broker-inference-work"] }, { positive: true, negative: false, value: "potential" });
const workCompletion = standing({ type: "WorkAssignmentAttemptReceipt", version: 1, demand, offer, actor: worker, office: "integrated-portfolio-management-team", duty: "procuring-inference-work", outcome: "completed", result, outputReceiptNi: ni("provider-output") }, { positive: true, negative: false, value: "potential" });

test("one admitted work carrier gives a chain demand an endeavor/project/milestone/duty descent", () => {
  const presentation = create({ federationHistory: [workCompletion] }).presentation();
  const locus = presentation.workCirculation.loci[0];
  assert.equal(locus.type, "UnionWorkLocus");
  assert.equal(locus.endeavor.id, "heal-semiotic-foam");
  assert.equal(locus.project.endeavor, locus.endeavor.id);
  assert.equal(locus.milestone.project, locus.project.id);
  assert.deepEqual(locus.duty, { id: "procuring-inference-work", office: "integrated-portfolio-management-team" });
  assert.equal(presentation.loci.find((value) => value.type === "UnionMilestoneLocus").phase, "settled");
  assert.equal(presentation.loci.find((value) => value.type === "UnionProjectLocus").phase, "settled");
  assert.equal(presentation.loci.find((value) => value.type === "UnionEndeavorLocus").phase, "settled");
  assert.ok(presentation.relations.some((edge) => edge.type === "borneAsDuty"));
});

test("only an office-qualified cohort member can offer a work demand", () => {
  const beforeOffer = create({ federationHistory: [] , events: history.slice(0, 2) });
  assert.equal(beforeOffer.restrictedArena(worker).actions.some((action) => action.operation === "offerDemand" && action.demand === demand), false);
  const qualified = createModeledUnionDimension({ events: history.slice(0, 2), chainId: "eip155:5615610", exchange, carrierAdmissions: [workCarrier, cellCarrier], federationHistory: [qualification] });
  const action = qualified.restrictedArena(worker).actions.find((candidate) => candidate.operation === "offerDemand" && candidate.demand === demand);
  assert.ok(action);
  assert.equal(action.workQualificationEvidenceNi, qualification.objectNi);
  assert.deepEqual(qualified.restrictedWorkArena(worker).actions.map((candidate) => candidate.id), [action.id]);
  assert.equal(qualified.workCirculation().type, "WorkCirculationPresentation");
});

test("a negative provider assignment is retained as a canonical cultivation demand, while later completion settles the milestone", () => {
  const refusal = standing({ type: "WorkAssignmentAttemptReceipt", version: 1, demand, offer, actor: worker, office: "integrated-portfolio-management-team", duty: "procuring-inference-work", outcome: "refused", residueNi: ni("provider-refusal") }, { positive: false, negative: true, value: "active" });
  const locus = create({ federationHistory: [refusal, workCompletion] }).presentation().workCirculation.loci.find((value) => value.type === "UnionWorkLocus");
  assert.equal(locus.phase, "settled");
  assert.equal(locus.grayDegree, "stable");
  assert.equal(locus.cultivation.length, 1);
  assert.equal(locus.cultivation[0].carrier.type, "UnionCultivationDemandCarrier");
  assert.equal(locus.cultivation[0].carrier.value.requiredDuty, "procuring-inference-work");
  assert.equal(deriveCultivationDemandCarrier({ workLocus: locus, refusal: locus.attempts[0] }).value.residueNi, ni("provider-refusal"));
});

test("malformed work hierarchy cannot be admitted as a demand carrier", () => {
  assert.throws(() => createWorkCarrier({ endeavor: { id: "one" }, project: { id: "two", endeavor: "wrong" }, milestone: { id: "three", project: "two" }, duty: { id: "duty", office: "office" } }), /project must descend/);
});

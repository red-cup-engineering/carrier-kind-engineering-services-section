import { createHash } from "node:crypto";
import { articulate, mark, predicating, utterance } from "@lenticule-science/articulating";
import {
  charge,
  chargeValue,
  chargeValueName,
  joinKnowledgeValue,
  posit,
  presentPositPresheaf,
  valuationOfCharge,
  valueOf,
} from "@lenticule-science/articulating/predicating/positing";
import {
  presentSettlementFiltration,
  settleKnowledge,
  settlementClosureProfile,
} from "@lenticule-science/articulating/predicating/positing/settling";
import { isCanonicalSha256NiUri } from "@red-cup-engineering/semantic-content-identify-service";
import {
  EMPTY_WITNESS_ROOT,
  identifyJsonSemanticContent,
} from "@red-cup-engineering/semantic-content-identify-service";

const LOCUS = "https://gui.561.group/";
const REQUIREMENTS = Object.freeze([
  Object.freeze({ id: "canonical-carrier-admission", claim: "every world-state carrier is canonically decoded, re-encoded, and admitted with its protocol-verification receipt", dependsOn: Object.freeze([]) }),
  Object.freeze({ id: "live-chain-federation-history", claim: "world state is reconstructed from live finalized SemioticExchange and admitted federation history", dependsOn: Object.freeze(["canonical-carrier-admission"]) }),
  Object.freeze({ id: "narrow-history-reader", claim: "the GUI receives only the bounded history projection needed to reconstruct its witnessed arena", dependsOn: Object.freeze(["live-chain-federation-history"]) }),
  Object.freeze({ id: "machine-only-admission", claim: "Bare Cedar Fog alone is admitted to gui.561.group by a machine-bound gate before GUI assets or state are disclosed", dependsOn: Object.freeze([]) }),
  Object.freeze({ id: "no-fabricated-state", claim: "every rendered cell, actor, demand, offer, move, and settlement traces to admitted live evidence", dependsOn: Object.freeze(["canonical-carrier-admission", "live-chain-federation-history"]) }),
  Object.freeze({ id: "no-public-disclosure", claim: "an unadmitted client receives neither GUI assets nor world-state data", dependsOn: Object.freeze(["machine-only-admission"]) }),
  Object.freeze({ id: "lawful-zero-custody-moves", claim: "each enabled move is projected from current law and executes only through the bounded zero-custody SemioticExchange actuator", dependsOn: Object.freeze(["canonical-carrier-admission", "narrow-history-reader"]) }),
  Object.freeze({ id: "private-live-mud", claim: "the admitted machine can traverse the live private Modeled Union Dimension at gui.561.group", dependsOn: Object.freeze(["narrow-history-reader", "no-fabricated-state", "no-public-disclosure", "lawful-zero-custody-moves"]) }),
]);

function typed(value) {
  const presentation = JSON.parse(JSON.stringify(value));
  const identified = identifyJsonSemanticContent({
    objectKind: `semiotic-exchange.${presentation.type ?? "material"}`,
    value: presentation,
    witnessRoot: EMPTY_WITNESS_ROOT,
  });
  return Object.freeze({ term: identified.envelope.settledBody, bytes: identified.bytes, ni: identified.token });
}

function bytes32(bytes) {
  return `0x${createHash("sha256").update(bytes).digest("hex")}`;
}

function exactEvidence(values, label) {
  if (!Array.isArray(values) || values.some((value) => !isCanonicalSha256NiUri(value))) {
    throw new TypeError(`${label} must be an array of canonical SHA-256 ni evidence identifiers`);
  }
  return Object.freeze([...new Set(values)].sort());
}

function supportOf(observation) {
  const positive = exactEvidence(observation?.positive, `${observation?.requirement ?? "observation"}.positive`);
  const negative = exactEvidence(observation?.negative, `${observation?.requirement ?? "observation"}.negative`);
  const value = positive.length && negative.length ? "stable" : positive.length ? "potential" : negative.length ? "active" : "absurd";
  const carrier = charge(chargeValue(value), [positive.map(mark), negative.map(mark)]);
  return Object.freeze({
    value: chargeValueName(valueOf(carrier)),
    coordinates: Object.freeze(carrier.value.map(({ name }) => name)),
    positive,
    negative,
  });
}

function descent(requirement, support) {
  const admitted = utterance(mark({ locus: LOCUS, requirement: requirement.id }), mark({ claim: requirement.claim, support }));
  const articulation = articulate(admitted);
  const predication = predicating.predicate(articulation);
  const predicationGenerators = predicating.presentPredicationSite(predication);
  const observedCharge = charge(chargeValue(support.value), [support.positive.map(mark), support.negative.map(mark)]);
  const positing = posit(predication, valuationOfCharge(predication, observedCharge));
  const positGenerators = presentPositPresheaf(positing);
  const closureProfile = settlementClosureProfile("knowledge");
  const settlement = settleKnowledge(positing);
  const settlementGenerators = presentSettlementFiltration(positing, closureProfile);
  const articulationPresentation = typed(admitted);
  const predicationPresentation = typed(predicationGenerators);
  const positPresentation = typed({ generators: positGenerators, observedSupport: support });
  const settlementPresentation = typed(settlementGenerators);
  return Object.freeze({
    requirement: requirement.id,
    articulation: Object.freeze({ kind: articulation.kind, presentation: articulationPresentation.ni }),
    predication: Object.freeze({ kind: predication.kind, generators: predicationGenerators.cells.length, presentation: predicationPresentation.ni }),
    positing: Object.freeze({ kind: positing.kind, presentation: positPresentation.ni, observedCharge: support.value }),
    settlement: Object.freeze({ kind: settlement.kind, stages: settlement.stages.length, presentation: settlementPresentation.ni }),
  });
}

/**
 * Induce the private live-MUD objective into the exact carrier commitments
 * consumed by SemioticExchange.raiseDemand. This function never submits them.
 *
 * Evidence is supplied by observers, not asserted by this fabricator. Every
 * requirement must have one exact observation so absence and contradiction
 * remain visible in FOUR rather than becoming defaults or prose.
 */
export function inducePrivateLiveMudDemand({ observations }) {
  if (!Array.isArray(observations)) throw new TypeError("observations must be an array");
  const byRequirement = new Map();
  for (const observation of observations) {
    if (!REQUIREMENTS.some(({ id }) => id === observation?.requirement)) throw new TypeError(`unknown GUI demand requirement ${JSON.stringify(observation?.requirement)}`);
    if (byRequirement.has(observation.requirement)) throw new TypeError(`duplicate observation for ${observation.requirement}`);
    byRequirement.set(observation.requirement, observation);
  }
  if (byRequirement.size !== REQUIREMENTS.length) throw new TypeError("one observation is required for every private live-MUD requirement");

  const nodes = REQUIREMENTS.map((requirement) => {
    const support = supportOf(byRequirement.get(requirement.id));
    return Object.freeze({ ...requirement, support, satisfied: support.value === "potential" });
  });
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const causalGraph = Object.freeze(nodes.map((node) => Object.freeze({
    id: node.id,
    postcondition: node.claim,
    dependsOn: node.dependsOn,
    blockedBy: Object.freeze(node.dependsOn.filter((id) => !nodeById.get(id).satisfied)),
    support: node.support.value,
    satisfied: node.satisfied,
    successorRequired: !node.satisfied,
  })));
  const restrictedArena = Object.freeze(causalGraph
    .filter((node) => !node.satisfied && node.blockedBy.length === 0)
    .flatMap(({ id, postcondition, support }) => ["positive", "negative"].map((side) => {
      const evidenceCharge = side === "positive" ? "potential" : "active";
      return Object.freeze({
        operation: "admit-prerequisite-evidence",
        prerequisite: id,
        postcondition,
        evidenceSide: side,
        evidenceType: "canonical admitted receipt ni",
        observedSupport: support,
        resultingHistoricalSupport: chargeValueName(joinKnowledgeValue(chargeValue(support), chargeValue(evidenceCharge))),
        completionWitness: side === "positive"
          ? "a potential successor observation at a later witnessed chain/federation position"
          : null,
      });
    })));
  const descentEvidence = Object.freeze(nodes.map((node) => descent(node, node.support)));

  const wantedLaw = typed({
    type: "PrivateLiveModeledUnionDimensionLaw",
    version: 1,
    locus: LOCUS,
    postconditions: nodes.map(({ id, claim }) => Object.freeze({ id, claim })),
    completion: "every unmet postcondition has a later causally linked successor observation with potential (positive-only) support; prior negative or contested observations remain immutable history",
  });
  const grounding = typed({
    type: "PrivateLiveModeledUnionDimensionGrounding",
    version: 1,
    locus: LOCUS,
    nodes: nodes.map(({ id, claim, dependsOn, support }) => Object.freeze({ id, claim, dependsOn, support })),
    descentEvidence,
    causalGraph,
    restrictedArena,
  });
  const demand = typed({
    type: "SemioticExchangeDemandCarrier",
    version: 1,
    objective: "heal the semiotic foam until it can privately project and operate its live Modeled Union Dimension",
    locus: LOCUS,
    grounding: grounding.ni,
    wantedLaw: wantedLaw.ni,
  });

  const body = Object.freeze({
    type: "SemioticExchangeDemandInductionReceipt",
    version: 1,
    demandNi: demand.ni,
    demandBytes: demand.bytes,
    demandBytes32: bytes32(demand.bytes),
    groundingNi: grounding.ni,
    groundingBytes: grounding.bytes,
    groundingDigest: bytes32(grounding.bytes),
    wantedLawNi: wantedLaw.ni,
    wantedLawBytes: wantedLaw.bytes,
    wantedLawDigest: bytes32(wantedLaw.bytes),
    descentEvidence,
    causalGraph,
    restrictedArena,
    raiseDemand: Object.freeze({ operation: "raiseDemand", args: Object.freeze([`0x${demand.bytes.toString("hex")}`, bytes32(grounding.bytes), bytes32(wantedLaw.bytes)]) }),
  });
  const receipt = typed({
    ...body,
    demandBytes: `0x${body.demandBytes.toString("hex")}`,
    groundingBytes: `0x${body.groundingBytes.toString("hex")}`,
    wantedLawBytes: `0x${body.wantedLawBytes.toString("hex")}`,
  });
  return Object.freeze({ id: receipt.ni, receiptBytes: receipt.bytes, ...body });
}

function exactAddress(value, label) {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{40}$/u.test(value)) throw new TypeError(`${label} must be an EVM address`);
  return value.toLowerCase();
}

function exactCode(value, label) {
  if (typeof value !== "string" || !/^[a-z][a-z0-9-]{2,127}$/u.test(value)) throw new TypeError(`${label} must be a lowercase hyphenated refusal code`);
  return value;
}

/**
 * Turn one actually witnessed inability into an addressable capability demand.
 * This is deliberately not a queue entry: it is immutable RMN material for
 * `SemioticExchange.raiseDemand`, and its failure witness stays in the
 * grounding after a provider later succeeds.
 */
export function induceCapabilityRepairDemand({ raiser, locus, operation, objective, refusalCode, refusalWitnessNis, requiredStandard, inputNi }) {
  const requester = exactAddress(raiser, "raiser");
  if (typeof locus !== "string" || locus.length === 0) throw new TypeError("locus must be nonempty text");
  const requestedOperation = exactCode(operation, "operation");
  if (typeof objective !== "string" || objective.length === 0) throw new TypeError("objective must be nonempty text");
  const refusal = exactCode(refusalCode, "refusalCode");
  const witnesses = exactEvidence(refusalWitnessNis, "refusalWitnessNis");
  if (witnesses.length === 0) throw new TypeError("at least one refusal witness is required");
  if (typeof requiredStandard !== "string" || requiredStandard.length === 0) throw new TypeError("requiredStandard must be nonempty text");
  if (!isCanonicalSha256NiUri(inputNi)) throw new TypeError("inputNi must be a canonical SHA-256 ni identifier");

  const residue = typed({
    type: "CapabilityRefusalResidue",
    version: 1,
    locus,
    operation: requestedOperation,
    refusalCode: refusal,
    inputNi,
    witnesses,
  });
  const wantedLaw = typed({
    type: "CapabilityRepairLaw",
    version: 1,
    locus,
    operation: requestedOperation,
    requiredStandard,
    completion: "a positive CapabilityProviderAttemptReceipt must name this demand and a settled SemioticExchange result; refusal residues remain in grounding",
  });
  const grounding = typed({
    type: "CapabilityRepairGrounding",
    version: 1,
    locus,
    objective,
    requester,
    residue: residue.ni,
    refusalWitnessNis: witnesses,
    inputNi,
  });
  const demand = typed({
    type: "SemioticExchangeDemandCarrier",
    version: 1,
    objective,
    locus,
    grounding: grounding.ni,
    wantedLaw: wantedLaw.ni,
  });
  const body = Object.freeze({
    type: "CapabilityRepairDemandInductionReceipt",
    version: 1,
    raiser: requester,
    demandNi: demand.ni,
    demandBytes: demand.bytes,
    demandBytes32: bytes32(demand.bytes),
    groundingNi: grounding.ni,
    groundingBytes: grounding.bytes,
    groundingDigest: bytes32(grounding.bytes),
    wantedLawNi: wantedLaw.ni,
    wantedLawBytes: wantedLaw.bytes,
    wantedLawDigest: bytes32(wantedLaw.bytes),
    residueNi: residue.ni,
    residueBytes: residue.bytes,
    inputNi,
    refusalWitnessNis: witnesses,
    market: Object.freeze({ operation: requestedOperation, requiredStandard, discovery: "federated-capability-offer-discovery" }),
    raiseDemand: Object.freeze({ operation: "raiseDemand", args: Object.freeze([`0x${demand.bytes.toString("hex")}`, bytes32(grounding.bytes), bytes32(wantedLaw.bytes)]) }),
  });
  const receipt = typed({
    ...body,
    demandBytes: `0x${body.demandBytes.toString("hex")}`,
    groundingBytes: `0x${body.groundingBytes.toString("hex")}`,
    wantedLawBytes: `0x${body.wantedLawBytes.toString("hex")}`,
    residueBytes: `0x${body.residueBytes.toString("hex")}`,
  });
  return Object.freeze({ id: receipt.ni, receiptBytes: receipt.bytes, ...body });
}

export { LOCUS as PRIVATE_LIVE_MUD_LOCUS, REQUIREMENTS as PRIVATE_LIVE_MUD_REQUIREMENTS };

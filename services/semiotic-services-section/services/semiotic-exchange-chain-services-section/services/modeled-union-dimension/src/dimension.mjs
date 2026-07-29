import {
  chargeValue,
  chargeValueName,
  joinKnowledgeValue,
} from "@lenticule-science/articulating/predicating/positing";
import { decodeSemantic, semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { decodeRelationalValue, relationalValueId } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";
import { projectTerritoryFoam } from "./foam-field.mjs";
import { projectLSpace } from "./l-space.mjs";
import { projectWorkCirculation } from "./work-circulation.mjs";
import { induceUnboundCodexToolBindingDemands, projectCodexToolObservations } from "./codex-tool-observation.mjs";

export const ACTOR = "urn:ame:modeled-union-dimension";

const KINDS = Object.freeze(["CellSeated", "CellRetired", "DemandRaised", "DemandOffered", "PurchaseMoved", "DemandSettled"]);
const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
const OPERATION_ABILITY = Object.freeze({
  raiseDemand: "semiotic-exchange/raise-demand",
  retireCell: "semiotic-exchange/retire-cell",
  offerDemand: "semiotic-exchange/offer-demand",
  purchaseMove: "semiotic-exchange/purchase-move",
  settleDemand: "semiotic-exchange/settle-demand",
});

function required(value, label) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${label} must be a non-empty string`);
  return value;
}
function exactNi(value, label) {
  if (typeof value !== "string" || !NI.test(value)) throw new TypeError(`${label} must be a canonical SHA-256 ni identifier`);
  return value;
}
function same(left, right) { return String(left).toLowerCase() === String(right).toLowerCase(); }
function find(items, field, value) { return items.find((item) => same(item[field], value)); }
function chainKey(event) { return `${event.chainPosition.blockNumber.toString()}:${event.chainPosition.logIndex}`; }
function before(left, right) {
  const a = BigInt(left.chainPosition.blockNumber), b = BigInt(right.chainPosition.blockNumber);
  return a < b || (a === b && left.chainPosition.logIndex < right.chainPosition.logIndex);
}
function freeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}
function identify(value) { return relationalValueId(value); }

/** The single carrier boundary consumed by this MUD. */
export function createCarrierAdmissionReceipt({ carrier, protocolVerificationReceiptNis }) {
  if (carrier === null || typeof carrier !== "object" || Array.isArray(carrier)) throw new TypeError("carrier must be one typed decoded relational value");
  required(carrier.type, "carrier.type");
  if (!("value" in carrier)) throw new TypeError("carrier.value is required");
  if (!Array.isArray(protocolVerificationReceiptNis) || protocolVerificationReceiptNis.length === 0) throw new TypeError("at least one protocol verification receipt ni is required");
  const receipts = Object.freeze([...new Set(protocolVerificationReceiptNis.map((ni, index) => exactNi(ni, `protocolVerificationReceiptNis[${index}]`)))].sort());
  const contentNi = identify(carrier);
  const body = freeze({ type: "CarrierAdmissionReceipt", version: 1, disposition: "admitted", contentNi,
    carrier: { type: carrier.type, value: structuredClone(carrier.value) }, protocolVerificationReceiptNis: receipts });
  return freeze({ id: identify(body), ...body });
}

function admitCarriers(values) {
  if (!Array.isArray(values)) throw new TypeError("carrierAdmissions must be an array");
  const byContent = new Map();
  for (const [index, value] of values.entries()) {
    if (value?.type !== "CarrierAdmissionReceipt" || value.version !== 1 || value.disposition !== "admitted") throw new TypeError(`carrierAdmissions[${index}] is not a CarrierAdmissionReceipt v1`);
    exactNi(value.id, `carrierAdmissions[${index}].id`); exactNi(value.contentNi, `carrierAdmissions[${index}].contentNi`);
    const canonical = createCarrierAdmissionReceipt({ carrier: value.carrier, protocolVerificationReceiptNis: value.protocolVerificationReceiptNis });
    if (canonical.id !== value.id || canonical.contentNi !== value.contentNi) throw new Error(`carrierAdmissions[${index}] does not match its canonical identity`);
    if (byContent.has(value.contentNi)) throw new Error(`carrier ${value.contentNi} was admitted twice`);
    byContent.set(value.contentNi, canonical);
  }
  return byContent;
}

function admitFederationHistory(values) {
  if (!Array.isArray(values)) throw new TypeError("federationHistory must be an array of FederationHistoryStanding values");
  return freeze(values.map((standing, index) => {
    if (standing?.type !== "FederationHistoryStanding") throw new TypeError(`federationHistory[${index}] is not a FederationHistoryStanding`);
    exactNi(standing.objectNi, `federationHistory[${index}].objectNi`);
    if (identify(standing.object) !== standing.objectNi) throw new Error(`federationHistory[${index}] object differs from its canonical identity`);
    if (!Array.isArray(standing.witnesses) || standing.witnesses.length === 0) throw new TypeError(`federationHistory[${index}] has no carrier-admission witnesses`);
    standing.witnesses.forEach((ni, witness) => exactNi(ni, `federationHistory[${index}].witnesses[${witness}]`));
    const { positive, negative, value } = standing.support ?? {};
    const expected = positive && negative ? "stable" : positive ? "potential" : negative ? "active" : "absurd";
    if (value !== expected) throw new Error(`federationHistory[${index}] has incoherent FOUR support`);
    return standing;
  }));
}
function support(locus, federationHistory) {
  let value = chargeValue("absurd"), positive = false, negative = false;
  for (const standing of federationHistory) {
    if (standing.object?.type !== "SemioticSupportClaim") continue;
    const claim = standing.object;
    if (!claim || typeof claim !== "object" || !same(claim.locus, locus)) continue;
    if (standing.support.positive) { positive = true; value = joinKnowledgeValue(value, chargeValue("potential")); }
    if (standing.support.negative) { negative = true; value = joinKnowledgeValue(value, chargeValue("active")); }
  }
  return freeze({ positive, negative, charge: chargeValueName(value) });
}
function relation(type, from, to, event) { return freeze({ type, from, to, chainPosition: event.chainPosition, carrierNi: event.carrierNi }); }
function settlementEvidence(federationHistory) {
  const found = [];
  for (const standing of federationHistory) {
    if (standing.object?.type !== "X402SettlementEvidence" || !standing.support.positive) continue;
    const value = standing.object;
    if (value?.success === true && /^eip155:[1-9][0-9]*$/u.test(value.network ?? "")
      && /^0x[0-9a-fA-F]{64}$/u.test(value.transaction ?? "") && /^sha256:[0-9a-f]{64}$/u.test(value.invocation ?? "")
      && /^(?:0|[1-9][0-9]*)$/u.test(value.amount ?? "")) found.push(freeze({ ...structuredClone(value), federationCarrierAdmissionReceiptNis: standing.witnesses }));
  }
  return freeze(found);
}

function demandInductions(values, demands) {
  if (!Array.isArray(values)) throw new TypeError("demandInductionReceipts must be an array");
  const byDemand = new Map();
  for (const [index, receipt] of values.entries()) {
    if (receipt?.type !== "SemioticExchangeDemandInductionReceipt" || receipt.version !== 1) throw new TypeError(`demandInductionReceipts[${index}] is not a demand induction receipt v1`);
    exactNi(receipt.id, `demandInductionReceipts[${index}].id`); exactNi(receipt.demandNi, `demandInductionReceipts[${index}].demandNi`);
    if (!(receipt.receiptBytes instanceof Uint8Array)) throw new TypeError(`demandInductionReceipts[${index}].receiptBytes must be canonical RMN bytes`);
    // The fabricator's receipt bytes are the canonical coordinate. Never trust a parallel projection whose id differs.
    const decoded = decodeSemantic(receipt.receiptBytes), reencoded = semanticBytes(decoded);
    if (reencoded.length !== receipt.receiptBytes.length || reencoded.some((byte, offset) => byte !== receipt.receiptBytes[offset]) || semanticId(decoded) !== receipt.id) throw new Error("demand induction receipt bytes do not match their canonical identity");
    const canonicalReceipt = decodeRelationalValue(decoded[1], decoded[2]);
    for (const field of ["type", "version", "demandNi", "demandBytes32", "groundingDigest", "wantedLawDigest", "causalGraph", "restrictedArena"]) {
      if (identify(canonicalReceipt[field]) !== identify(receipt[field])) throw new Error(`demand induction ${field} differs from its canonical receipt bytes`);
    }
    const demand = demands.find((candidate) => same(candidate.id, receipt.demandBytes32));
    if (!demand || demand.raised.carrierNi !== receipt.demandNi || !same(demand.grounding, receipt.groundingDigest) || !same(demand.wantedLaw, receipt.wantedLawDigest)) throw new Error("demand induction receipt is not bound to one witnessed DemandRaised event");
    if (!Array.isArray(receipt.causalGraph) || !Array.isArray(receipt.restrictedArena)) throw new TypeError("demand induction receipt lacks its settled causal graph and restricted arena");
    byDemand.set(demand.id.toLowerCase(), freeze(receipt));
  }
  return byDemand;
}

/** Admit residue-to-demand material without treating an off-chain induction as chain history. */
function capabilityRepairInductions(values) {
  if (!Array.isArray(values)) throw new TypeError("capabilityDemandInductionReceipts must be an array");
  const byDemand = new Map();
  for (const [index, receipt] of values.entries()) {
    if (receipt?.type !== "CapabilityRepairDemandInductionReceipt" || receipt.version !== 1) throw new TypeError(`capabilityDemandInductionReceipts[${index}] is not a capability repair induction receipt v1`);
    for (const field of ["id", "demandNi", "groundingNi", "wantedLawNi", "residueNi", "inputNi"]) exactNi(receipt[field], `capabilityDemandInductionReceipts[${index}].${field}`);
    if (!/^0x[0-9a-fA-F]{64}$/u.test(receipt.demandBytes32 ?? "") || !/^0x[0-9a-fA-F]{64}$/u.test(receipt.groundingDigest ?? "") || !/^0x[0-9a-fA-F]{64}$/u.test(receipt.wantedLawDigest ?? "")) throw new TypeError(`capabilityDemandInductionReceipts[${index}] lacks exact SXC coordinates`);
    if (!(receipt.receiptBytes instanceof Uint8Array)) throw new TypeError(`capabilityDemandInductionReceipts[${index}].receiptBytes must be canonical RMN bytes`);
    const decoded = decodeSemantic(receipt.receiptBytes), reencoded = semanticBytes(decoded);
    if (reencoded.length !== receipt.receiptBytes.length || reencoded.some((byte, offset) => byte !== receipt.receiptBytes[offset]) || semanticId(decoded) !== receipt.id) throw new Error("capability repair induction receipt bytes do not match their canonical identity");
    const canonical = decodeRelationalValue(decoded[1], decoded[2]);
    for (const field of ["type", "version", "raiser", "demandNi", "demandBytes32", "groundingNi", "groundingDigest", "wantedLawNi", "wantedLawDigest", "residueNi", "inputNi", "refusalWitnessNis", "market", "raiseDemand"]) if (identify(canonical[field]) !== identify(receipt[field])) throw new Error(`capability repair induction ${field} differs from its canonical receipt bytes`);
    if (byDemand.has(receipt.demandBytes32.toLowerCase())) throw new Error("capability repair demand was inducted twice");
    byDemand.set(receipt.demandBytes32.toLowerCase(), freeze(receipt));
  }
  return byDemand;
}

function capabilityMetabolism(inductions, demands, offers, federationHistory) {
  return freeze([...inductions.entries()].map(([key, induction]) => {
    const demand = demands.find((candidate) => same(candidate.id, key)) ?? null;
    if (demand && (!same(demand.raiser, induction.raiser) || !same(demand.wantedLaw, induction.wantedLawDigest) || !same(demand.grounding, induction.groundingDigest) || demand.raised.carrierNi !== induction.demandNi)) throw new Error("capability repair induction is displaced from its witnessed DemandRaised move");
    const demandOffers = demand === null ? [] : offers.filter((offer) => same(offer.demand, demand.id));
    const attempts = [];
    for (const standing of federationHistory) {
      const attempt = standing.object;
      if (attempt?.type !== "CapabilityProviderAttemptReceipt" || attempt.version !== 1 || !same(attempt.demand, induction.demandBytes32)) continue;
      const offer = demandOffers.find((candidate) => same(candidate.id, attempt.offer));
      if (!offer || !same(offer.controller, attempt.provider) || !["refused", "completed"].includes(attempt.outcome)) throw new Error("capability provider attempt is not grounded in a witnessed offer");
      if (attempt.outcome === "refused") {
        exactNi(attempt.residueNi, "capability provider refusal.residueNi");
        if (!standing.support.negative) throw new Error("capability provider refusal requires negative support");
      } else {
        exactNi(attempt.outputReceiptNi, "capability provider completion.outputReceiptNi");
        if (!/^0x[0-9a-fA-F]{64}$/u.test(attempt.result ?? "") || !standing.support.positive) throw new Error("capability provider completion requires result and positive support");
      }
      attempts.push(freeze({ ...attempt, evidenceNi: standing.objectNi, federationCarrierAdmissionReceiptNis: standing.witnesses, charge: standing.support.value }));
    }
    const closes = demand?.settlement && attempts.some((attempt) => attempt.outcome === "completed" && same(attempt.result, demand.settlement.result) && same(attempt.offer, demand.purchase?.offer));
    return freeze({ type: "CapabilityRepairDemandLocus", id: key, demandNi: induction.demandNi, residueNi: induction.residueNi, inputNi: induction.inputNi, wantedLaw: induction.wantedLawDigest, market: induction.market, phase: closes ? "succeeded" : demand === null ? "ready-to-raise" : demand.purchase ? "purchased" : "open", grayDegree: closes ? "stable" : "active", obstruction: closes ? null : freeze({ residueNi: induction.residueNi, reason: demand === null ? "demand-not-yet-witnessed-on-chain" : "no-positive-settled-provider-receipt" }), raiseDemand: demand === null ? induction.raiseDemand : null, offers: freeze(demandOffers.map((offer) => freeze({ id: offer.id, cell: offer.cell, provider: offer.controller, phase: offer.purchase ? "purchased" : "offered" }))), attempts: freeze(attempts) });
  }));
}

function authorityPair(action, authorityReceipts) {
  const ucans = authorityReceipts?.ucan ?? [], bindings = authorityReceipts?.controllerBindings ?? [];
  if (!Array.isArray(ucans) || !Array.isArray(bindings)) throw new TypeError("authorityReceipts must contain ucan and controllerBindings arrays");
  const ability = OPERATION_ABILITY[action.operation];
  const ucan = ucans.find((receipt) => receipt?.type === "UcanInvocationVerificationReceipt" && receipt.version === 1
    && receipt.disposition === "authorized" && receipt.revocationStatus === "active" && receipt.capability?.can === ability && NI.test(receipt.id ?? ""));
  if (!ucan) return null;
  const binding = bindings.find((receipt) => receipt?.type === "EnterpriseAccountControllerBindingReceipt" && receipt.version === 1
    && receipt.disposition === "bound" && receipt.protocol === "ERC-1271" && NI.test(receipt.id ?? "")
    && receipt.controller === ucan.controller && receipt.actor === ucan.actor && receipt.invocationCid === ucan.invocationCid
    && receipt.delegationCid === ucan.delegationCid && receipt.capabilityNi === ucan.capabilityNi
    && NI.test(ucan.capabilityNi ?? "") && same(receipt.resource, ucan.capability?.with));
  return binding ? freeze({ ucanInvocationVerificationReceiptNi: ucan.id, enterpriseAccountControllerBindingReceiptNi: binding.id }) : null;
}

function admitMissionLaw(value) {
  if (value === null) return null;
  if (value?.type !== "ModeledUnionMissionLawLocus" || value.locus !== "law:semiotic-foam-one-machine" || value.language !== "rmn/v2" || !NI.test(value.carrierNi ?? "")) {
    throw new TypeError("missionLaw must be the canonical RMN v2 Semiotic Foam One Machine law locus");
  }
  return freeze({ type: value.type, locus: value.locus, carrierNi: value.carrierNi, language: value.language });
}

/** Reconstruct one MUD from monotone SemioticExchange history plus admitted evidence. */
export function createModeledUnionDimension({ witnessed, events = witnessed, chainId, exchange, carrierAdmissions = [], federationHistory = [], demandInductionReceipts = [], capabilityDemandInductionReceipts = [], authorityReceipts = {}, observerFamily = null, missionLaw = null, actuator = null, deploymentActuator = null, notebookQueryReceipts = [], notebookQueryActuator = null, notebookQueryAvailability = null } = {}) {
  if (!Array.isArray(events)) throw new TypeError("events must be an array of witnessed SemioticExchange moves");
  required(chainId, "chainId"); required(exchange, "exchange");
  const admissions = admitCarriers(carrierAdmissions), admittedFederationHistory = admitFederationHistory(federationHistory), ordered = [...events];
  const territoryAdmissions = [...admissions.values()].filter(({ carrier }) => carrier.type === "NodeWorkspaceSourceCatalogReceipt");
  if (territoryAdmissions.length > 1) throw new Error("more than one canonical codebase territory was admitted");
  if (observerFamily !== null && territoryAdmissions.length !== 1) throw new Error("observerFamily requires exactly one admitted NodeWorkspaceSourceCatalogReceipt");
  const territoryFoam = observerFamily === null ? null : projectTerritoryFoam({ territoryAdmission: territoryAdmissions[0], observerFamily });
  const admittedMissionLaw = admitMissionLaw(missionLaw);
  const notebookCatalogAdmissions = [...admissions.values()].filter(({ carrier }) => carrier.type === "NotebookLMLibraryCatalogReceipt");
  const lSpace = notebookCatalogAdmissions.length === 0 ? null : projectLSpace({ catalogAdmissions: notebookCatalogAdmissions, queryReceipts: notebookQueryReceipts, queryActuator: notebookQueryActuator, queryAvailability: notebookQueryAvailability });
  for (let index = 0; index < ordered.length; index += 1) {
    const event = ordered[index];
    if (!KINDS.includes(event?.kind)) throw new TypeError(`events[${index}] is not a SemioticExchange move`);
    if (!event.chainPosition || event.chainPosition.blockNumber === undefined || !Number.isInteger(event.chainPosition.logIndex)) throw new TypeError(`events[${index}] has no exact chain position`);
    if (index > 0 && !before(ordered[index - 1], event)) throw new Error("SemioticExchange history is not in strict chain order");
  }
  const cells = [], demands = [], offers = [], relations = [];
  for (const event of ordered) {
    if (event.kind === "CellSeated") {
      if (find(cells, "id", event.cell)) throw new Error(`cell ${event.cell} was seated twice`);
      cells.push({ type: "SemioticCellLocus", id: event.cell, controller: event.controller, law: event.law, seated: event, retired: null });
    } else if (event.kind === "CellRetired") {
      const cell = find(cells, "id", event.cell);
      if (!cell || cell.retired) throw new Error(`retirement does not name one active seated cell ${event.cell}`);
      if (!same(cell.controller, event.controller)) throw new Error(`retirement controller does not hold cell ${event.cell}`);
      cell.retired = event; relations.push(relation("retires", `event:${chainKey(event)}`, `cell:${cell.id}`, event));
    } else if (event.kind === "DemandRaised") {
      if (find(demands, "id", event.demand)) throw new Error(`demand ${event.demand} was raised twice`);
      demands.push({ type: "SemioticDemandLocus", id: event.demand, raiser: event.raiser, wantedLaw: event.wantedLaw, grounding: event.grounding, raised: event, purchase: null, settlement: null });
    } else if (event.kind === "DemandOffered") {
      const demand = find(demands, "id", event.demand), cell = find(cells, "id", event.cell);
      if (!demand) throw new Error(`offer precedes demand ${event.demand}`);
      if (!cell || cell.retired) throw new Error(`offer does not name one active cell ${event.cell}`);
      if (demand.purchase) throw new Error(`offer follows the purchase of demand ${event.demand}`);
      if (find(offers, "id", event.offer)) throw new Error(`offer ${event.offer} was emitted twice`);
      if (!same(cell.controller, event.controller)) throw new Error(`offer controller does not hold cell ${event.cell}`);
      if (!same(cell.law, demand.wantedLaw)) throw new Error(`cell ${event.cell} does not bear wanted law ${demand.wantedLaw}`);
      offers.push({ type: "SemioticOfferLocus", id: event.offer, demand: demand.id, cell: cell.id, controller: event.controller, offered: event, purchase: null });
      relations.push(relation("offersFor", `offer:${event.offer}`, `demand:${demand.id}`, event)); relations.push(relation("offersCell", `offer:${event.offer}`, `cell:${cell.id}`, event));
    } else if (event.kind === "PurchaseMoved") {
      const demand = find(demands, "id", event.demand), offer = find(offers, "id", event.offer), cell = find(cells, "id", event.cell);
      if (!demand || !offer || !cell || cell.retired) throw new Error("purchase references an absent or retired locus");
      if (demand.purchase || offer.purchase) throw new Error(`demand ${event.demand} was purchased twice`);
      if (!same(offer.demand, demand.id) || !same(offer.cell, cell.id)) throw new Error("purchase references a displaced offer");
      if (!same(demand.raiser, event.raiser) || !same(cell.controller, event.controller) || !same(offer.controller, event.controller)) throw new Error("purchase roles do not match the witnessed loci");
      demand.purchase = event; offer.purchase = event; relations.push(relation("purchaseMove", `demand:${demand.id}`, `cell:${cell.id}`, event));
    } else {
      const demand = find(demands, "id", event.demand), cell = find(cells, "id", event.cell);
      if (!demand || !cell || !demand.purchase || demand.settlement) throw new Error(`settlement is not enabled for demand ${event.demand}`);
      if (!same(demand.purchase.cell, cell.id) || !same(cell.controller, event.controller)) throw new Error("settlement is displaced from the purchased cell");
      demand.settlement = event; relations.push(relation("settles", `cell:${cell.id}`, `demand:${demand.id}`, event)); relations.push(relation("resultsIn", `demand:${demand.id}`, event.result, event));
    }
  }
  const inductions = demandInductions(demandInductionReceipts, demands);
  const capabilityInductions = capabilityRepairInductions(capabilityDemandInductionReceipts);
  const capabilityDemands = capabilityMetabolism(capabilityInductions, demands, offers, admittedFederationHistory);
  const workCirculation = projectWorkCirculation({ admissions, demands, offers, federationHistory: admittedFederationHistory });
  const codexToolObservations = projectCodexToolObservations({ admissions });
  const loci = freeze([
    ...cells.map((cell) => ({ ...cell, phase: cell.retired ? "retired" : "seated", support: support(cell.id, admittedFederationHistory) })),
    ...demands.map((demand) => ({ ...demand, phase: demand.settlement ? "settled" : demand.purchase ? "purchased" : "raised", support: support(demand.id, admittedFederationHistory), inductionReceiptNi: inductions.get(demand.id.toLowerCase())?.id ?? null })),
    ...offers.map((offer) => ({ ...offer, phase: offer.purchase ? "purchased" : "offered", support: support(offer.id, admittedFederationHistory) })),
  ]);
  const eventRelations = ordered.slice(1).map((event, index) => relation("causallyFollows", `event:${chainKey(event)}`, `event:${chainKey(ordered[index])}`, event));

  function restrictedArena(actor) {
    required(actor, "actor"); const candidates = [];
    for (const [demandId, induction] of capabilityInductions) if (!demands.some((demand) => same(demand.id, demandId)) && same(induction.raiser, actor)) candidates.push({ operation: "raiseDemand", demand: demandId, carrierNi: induction.demandNi, raiseDemand: induction.raiseDemand, capabilityDemandInductionReceiptNi: induction.id });
    for (const cell of cells.filter((candidate) => !candidate.retired && same(candidate.controller, actor))) {
      candidates.push({ operation: "retireCell", cell: cell.id });
      for (const demand of demands.filter((candidate) => !candidate.purchase && !candidate.settlement && same(candidate.wantedLaw, cell.law))) {
        if (offers.some((offer) => same(offer.demand, demand.id) && same(offer.cell, cell.id))) continue;
        const qualification = workCirculation.qualification(actor, demand.id);
        if (qualification !== null && !qualification.qualified) continue;
        candidates.push({ operation: "offerDemand", demand: demand.id, cell: cell.id, ...(qualification?.evidence ? { workQualificationEvidenceNi: qualification.evidence.evidenceNi } : {}) });
      }
    }
    for (const demand of demands.filter((candidate) => !candidate.purchase && same(candidate.raiser, actor))) for (const offer of offers.filter((candidate) => same(candidate.demand, demand.id) && !candidate.purchase)) candidates.push({ operation: "purchaseMove", demand: demand.id, offer: offer.id, cell: offer.cell });
    for (const demand of demands.filter((candidate) => candidate.purchase && !candidate.settlement)) { const cell = find(cells, "id", demand.purchase.cell); if (cell && same(cell.controller, actor)) candidates.push({ operation: "settleDemand", demand: demand.id, cell: cell.id }); }
    for (const [demandId, induction] of inductions) for (const move of induction.restrictedArena) {
      const graph = induction.causalGraph.find(({ id }) => id === move.prerequisite);
      if (move.evidenceSide !== "positive" || graph?.blockedBy?.length) continue;
      candidates.push({ operation: move.prerequisite === "private-live-mud" ? "deployPrivateLiveMud" : "admitPrerequisiteEvidence", demand: demandId, prerequisite: move.prerequisite, postcondition: move.postcondition, completionWitness: move.completionWitness, demandInductionReceiptNi: induction.id });
    }
    const actions = candidates.map((candidate) => {
      const id = identify({ type: "RestrictedModeledUnionAction", actor, ...candidate });
      if (candidate.operation === "deployPrivateLiveMud") return { type: "SemioticExchangeAction", id, ...candidate, polarity: "positive", available: typeof deploymentActuator === "function", ...(typeof deploymentActuator === "function" ? {} : { unavailability: "private-deployment-actuator-unavailable" }), evidence: { demandInductionReceiptNi: candidate.demandInductionReceiptNi } };
      if (candidate.operation === "admitPrerequisiteEvidence") return { type: "SemioticExchangeAction", id, ...candidate, polarity: "positive", available: false, unavailability: "canonical-evidence-observation-required", evidence: { demandInductionReceiptNi: candidate.demandInductionReceiptNi } };
      const pair = authorityPair(candidate, authorityReceipts), relevantNis = [
        candidate.carrierNi,
        candidate.cell && find(cells, "id", candidate.cell)?.seated.carrierNi,
        candidate.demand && find(demands, "id", candidate.demand)?.raised.carrierNi,
        candidate.offer && find(offers, "id", candidate.offer)?.offered.carrierNi,
      ].filter(Boolean);
      const carrierReceiptNis = relevantNis.map((ni) => admissions.get(ni)?.id).filter(Boolean);
      const fullyAdmitted = carrierReceiptNis.length === relevantNis.length;
      const available = fullyAdmitted && pair !== null && typeof actuator === "function";
      return { type: "SemioticExchangeAction", id, ...candidate, polarity: "positive", available,
        ...(!fullyAdmitted ? { unavailability: "carrier-admission-required" } : !pair ? { unavailability: "authority-receipts-required" } : typeof actuator !== "function" ? { unavailability: "zero-custody-append-actuator-unavailable" } : {}),
        evidence: { carrierAdmissionReceiptNis: freeze(carrierReceiptNis), ...(pair ?? {}) } };
    });
    return freeze({ type: "RestrictedModeledUnionArena", actor, actions });
  }
  async function actuate(actionId, actor) {
    const action = restrictedArena(actor).actions.find(({ id }) => id === actionId);
    if (!action) throw Object.assign(new Error("action is not in the actor's current restricted arena"), { code: "MUD_ACTION_NOT_RESTRICTED", status: 403 });
    if (!action.available) throw Object.assign(new Error(action.unavailability), { code: "MUD_ACTION_UNAVAILABLE", status: 409 });
    if (action.operation === "deployPrivateLiveMud") return deploymentActuator(action);
    return actuator(action);
  }
  function restrictedWorkArena(actor) {
    const workDemandIds = new Set(workCirculation.workLoci.map(({ id }) => String(id).toLowerCase()));
    const actions = restrictedArena(actor).actions.filter((action) => action.demand && workDemandIds.has(String(action.demand).toLowerCase()));
    return freeze({ type: "RestrictedUnionWorkArena", actor, actions: freeze(actions) });
  }
  const projectedLoci = freeze([
    ...loci,
    ...(territoryFoam === null ? [] : territoryFoam.sections.map((section) => ({ ...section, type: "CodebaseTerritoryActorLocus", id: section.locus, sectionNi: section.id }))),
    ...capabilityDemands,
    ...workCirculation.loci,
    ...codexToolObservations,
    ...workCirculation.loci.flatMap((locus) => locus.cultivation),
    ...(lSpace === null ? [] : lSpace.presentation.loci),
  ]);
  const projectedRelations = freeze(territoryFoam === null ? [...relations, ...eventRelations, ...workCirculation.relations] : [...relations, ...eventRelations, ...workCirculation.relations, ...territoryFoam.relations]);
  return freeze({ actor: ACTOR, restrictedArena, restrictedWorkArena, actuate,
    restrictedLSpaceArena: (actor, request) => lSpace === null ? freeze({ type: "RestrictedLSpaceArena", actor, actions: [] }) : lSpace.restrictedArena(actor, request),
    queryLSpace: async (request) => { if (lSpace === null) throw Object.assign(new Error("no witnessed L-space catalog is admitted"), { code: "MUD_LSPACE_UNAVAILABLE", status: 409 }); return lSpace.query(request); },
    induceUnboundCodexToolBindingDemands: ({ raiser, induceDemand }) => induceUnboundCodexToolBindingDemands({ raiser, observationLoci: codexToolObservations, induceDemand }),
    presentation: () => freeze({ type: "ModeledUnionDimensionPresentation", version: 5, ledger: { chainId, exchange }, missionLaw: admittedMissionLaw, events: ordered, loci: projectedLoci, relations: projectedRelations, territoryFoam, lSpace: lSpace?.presentation ?? null, workCirculation: { loci: workCirculation.loci, operation: "project-work-circulation" }, capabilityDemandMetabolism: capabilityDemands, carrierAdmissionReceiptNis: freeze([...admissions.values()].map(({ id }) => id)), federationCarrierAdmissionReceiptNis: freeze(admittedFederationHistory.flatMap(({ witnesses }) => witnesses)), demandInductionReceiptNis: freeze([...inductions.values()].map(({ id }) => id)), capabilityDemandInductionReceiptNis: freeze([...capabilityInductions.values()].map(({ id }) => id)), x402SettlementEvidence: settlementEvidence(admittedFederationHistory) }),
    loci: () => projectedLoci, relations: () => projectedRelations, territoryFoam: () => territoryFoam, lSpace: () => lSpace?.presentation ?? null, codexToolObservations: () => freeze({ type: "CodexToolObservationPresentation", version: 1, providerCell: "urn:ame:codex-session-activity-provider:tool-observation", loci: codexToolObservations, authority: { observation: true, execution: false, restrictedMove: false, actuatorBinding: false, outcomeAssertion: false } }), workCirculation: () => freeze({ type: "WorkCirculationPresentation", version: 1, loci: workCirculation.loci, relations: workCirculation.relations }) });
}

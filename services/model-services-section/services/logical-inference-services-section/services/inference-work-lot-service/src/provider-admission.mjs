import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { circuitInterfaceFromAgentCard } from "@red-cup-engineering/rmn-semantic-conformance/hierarchical-circuit";
import { migrateConsiderationAlternative, validateConsiderationAlternative } from "./consideration.mjs";

export const INFERENCE_MARKET_OFFER_EXTENSION = "ni:///sha-256;hLCUM4R4uZnPEVaY9Cb6sDwruIVBtw2bjleYGbeATaQ";
const AGENT_CARD = "urn:inference-market:agent-card";
const SERVICE_ROLES = Object.freeze({
  rmn: "urn:union:service-role:rmn-conformance",
  witnessJournal: "urn:union:service-role:witness-journal-rdf",
});
export const DEFAULT_PROVIDER_ADMISSION_GRAPH = "urn:ame:inference-work-lot-service:provider-admissions";
const QUAD = /^<([^>]+)> <([^>]+)> <([^>]+)> <([^>]+)> \.$/u;
const OPERATION_TYPE = ["product", ["mark"], ["product", ["mark"], ["product", ["mark"], ["mark"]]]];
const words = (value, label) => {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`signed inference market offer has no ${label}`);
  return value.trim().split(/\s+/u);
};
const boundedNumber = (value, label, { integer = false } = {}) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || (integer && !Number.isSafeInteger(number))) throw new Error(`signed inference market offer has invalid ${label}`);
  return number;
};

export function loadProviderAdmissions(path, { admissionGraph = DEFAULT_PROVIDER_ADMISSION_GRAPH } = {}) {
  if (typeof admissionGraph !== "string" || !admissionGraph.startsWith("urn:")) throw new Error("provider admission graph must be one exact URN");
  const admitted = [];
  for (const [index, line] of readFileSync(resolve(path), "utf8").split(/\r?\n/u).entries()) {
    if (line.trim() === "" || line.startsWith("#")) continue;
    const match = line.match(QUAD);
    if (!match) throw new Error(`provider admission line ${index + 1} is not one exact RDF quad`);
    const [, actor, predicate, agentCard, graph] = match;
    if (!actor.startsWith("urn:") || predicate !== AGENT_CARD || graph !== admissionGraph) throw new Error(`provider admission line ${index + 1} violates the customer admission profile`);
    const url = new URL(agentCard);
    if (url.protocol !== "https:" && url.hostname !== "127.0.0.1" && url.hostname !== "localhost") throw new Error(`provider admission line ${index + 1} uses non-HTTPS remote ingress`);
    admitted.push(Object.freeze({ id: actor.slice(actor.lastIndexOf(":") + 1), actor, agentCard: url.href }));
  }
  if (admitted.length === 0) throw new Error("customer provider admission plate is empty");
  const actors = new Set(admitted.map(({ actor }) => actor));
  if (actors.size !== admitted.length) throw new Error("customer provider admission plate repeats an actor");
  return Object.freeze(admitted.sort((left, right) => left.actor.localeCompare(right.actor)));
}

const ADMITTED_CUSTOMER = "urn:inference-market:admitted-customer";
export const DEFAULT_CUSTOMER_ADMISSION_GRAPH = "urn:ame:inference-work-lot-service:customer-admissions";

export function loadCustomerAdmissions(path, { admissionGraph = DEFAULT_CUSTOMER_ADMISSION_GRAPH, market } = {}) {
  if (typeof admissionGraph !== "string" || !admissionGraph.startsWith("urn:")) throw new Error("customer admission graph must be one exact URN");
  if (typeof market !== "string" || !market.startsWith("urn:")) throw new Error("customer admissions must name the admitting market actor as one exact URN");
  const admitted = [];
  for (const [index, line] of readFileSync(resolve(path), "utf8").split(/\r?\n/u).entries()) {
    if (line.trim() === "" || line.startsWith("#")) continue;
    const match = line.match(QUAD);
    if (!match) throw new Error(`customer admission line ${index + 1} is not one exact RDF quad`);
    const [, actor, predicate, object, graph] = match;
    if (!actor.startsWith("urn:") || predicate !== ADMITTED_CUSTOMER || object !== market || graph !== admissionGraph) throw new Error(`customer admission line ${index + 1} violates the customer admission profile`);
    admitted.push(actor);
  }
  if (admitted.length === 0) throw new Error("customer admission plate is empty");
  const actors = new Set(admitted);
  if (actors.size !== admitted.length) throw new Error("customer admission plate repeats an actor");
  return Object.freeze(actors);
}

export function loadCustomerServiceAdmissions(path, {
  admissionGraph,
  requiredRoles = Object.keys(SERVICE_ROLES),
  agentCardOverrides = {},
} = {}) {
  if (typeof admissionGraph !== "string" || !admissionGraph.startsWith("urn:")) throw new Error("service admission graph must be one exact URN");
  if (!Array.isArray(requiredRoles) || requiredRoles.length === 0 || requiredRoles.some((role) => !Object.hasOwn(SERVICE_ROLES, role))) throw new Error("required service roles must name known exact roles");
  const admitted = new Map();
  for (const [index, line] of readFileSync(resolve(path), "utf8").split(/\r?\n/u).entries()) {
    if (line.trim() === "" || line.startsWith("#")) continue;
    const match = line.match(QUAD);
    if (!match) throw new Error(`service admission line ${index + 1} is not one exact RDF quad`);
    const [, actor, predicate, agentCard, graph] = match;
    const role = Object.entries(SERVICE_ROLES).find(([, iri]) => iri === predicate)?.[0];
    if (!actor.startsWith("urn:") || !role || graph !== admissionGraph) throw new Error(`service admission line ${index + 1} violates the customer service profile`);
    if (admitted.has(role)) throw new Error(`service admission plate repeats the ${role} role`);
    const url = new URL(agentCardOverrides[role] || agentCard);
    if (!url.pathname.endsWith("/.well-known/agent-card.json")) throw new Error(`service admission line ${index + 1} does not name a standard Agent Card`);
    if (url.protocol !== "https:" && url.hostname !== "127.0.0.1" && url.hostname !== "localhost") throw new Error(`service admission line ${index + 1} uses non-HTTPS remote ingress`);
    admitted.set(role, Object.freeze({ actor, agentCard: url.href }));
  }
  for (const role of requiredRoles) if (!admitted.has(role)) throw new Error(`customer service admission plate lacks the ${role} role`);
  return Object.freeze(Object.fromEntries([...admitted].sort(([left], [right]) => left.localeCompare(right))));
}

export function standingOfferFromAgentCard(provider, card, source, demand, commitment) {
  const extensions = card?.capabilities?.extensions ?? [];
  const sovereign = circuitInterfaceFromAgentCard(card);
  const advertised = extensions.find(({ uri }) => uri === INFERENCE_MARKET_OFFER_EXTENSION)?.params;
  if (!advertised || advertised.profile !== "org.emsenn.inference.market-offer.v2") throw new Error("signed Agent Card carries no v2 inference market offer");
  if (!Array.isArray(advertised.considerationAlternatives) || advertised.considerationAlternatives.length === 0) throw new Error("signed inference market offer has no consideration alternatives");
  const considerationAlternatives = advertised.considerationAlternatives.map(migrateConsiderationAlternative);
  considerationAlternatives.forEach(validateConsiderationAlternative);
  const object = {
    type: "TypedRmnInferenceServiceOffer",
    contract: sovereign.component.law,
    providerAccount: sovereign.account,
    agentCard: provider.agentCard,
    operationType: OPERATION_TYPE,
    model: advertised.model,
    mode: demand.mode,
    workTypes: words(advertised.workTypes, "workTypes"),
    capabilities: words(advertised.capabilities, "capabilities"),
    maximumDifficulty: boundedNumber(advertised.maximumDifficulty, "maximumDifficulty"),
    maximumSourceWords: boundedNumber(advertised.maximumSourceWords, "maximumSourceWords", { integer: true }),
    maximumSourceCharacters: boundedNumber(advertised.maximumSourceCharacters, "maximumSourceCharacters", { integer: true }),
    maximumRequestCharacters: boundedNumber(advertised.maximumRequestCharacters, "maximumRequestCharacters", { integer: true }),
    maximumOutputTokens: boundedNumber(advertised.maximumOutputTokens, "maximumOutputTokens", { integer: true }),
    maximumConcurrentLots: boundedNumber(advertised.maximumConcurrentLots, "maximumConcurrentLots", { integer: true }),
    considerationAlternatives,
    requestCommitment: commitment(demand),
    availability: "accepted-task-must-still-settle",
    customerAcceptanceRequired: true,
    advertisement: INFERENCE_MARKET_OFFER_EXTENSION,
  };
  return Object.freeze({ "@context": "https://www.w3.org/ns/activitystreams", id: commitment({ actor: provider.actor, source: source.id, object }), type: "Offer", actor: provider.actor, target: source.actor, inReplyTo: source.id, object });
}

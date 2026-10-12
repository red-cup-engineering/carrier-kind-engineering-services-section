#!/usr/bin/env node
// RMN effect-cell proposal/completion assay, carried over A2A on top of this
// section's own a2a-client.mjs/rmn-part.mjs, the way every other RMN-over-A2A
// consumer in the house is built.
//
// Recovered from the deleted a2a-effect-assay-services-section (git
// 678af4dad41 dropped it "with no external consumer"; that was wrong --
// cloudflare-activitystreams-operation-services-section still imports it for
// completeEffect/proposeEffect/semanticBytesId/textNi/artifactChecksum). The
// recovered proposeEffect used to reach `conformTerm` through the deleted
// @red-cup-engineering/relation-model-notation-conformance/client re-export;
// that package still exists, but it depends on this section (a2a-services-section),
// so importing it back here would make the two packages depend on each other.
// Instead this module hires the RMN conformance provider directly over
// rmn-part.mjs, matching relation-model-notation-conformance/client.mjs's own
// implementation term-for-term (ascribe the term, send it as one RMN part,
// decode and re-check the typed response).
//
// completeEffect still hires a distinct WIT transition provider over A2A:
// relation-model-notation/runtime's own conformance boundary explicitly
// refuses to substitute normalization for a WIT transition's "distinct typed
// receipt" (an independent witness, not a self-attestation), so this module
// never computes one locally even though the math (assayEffectTransition)
// lives in the RMN runtime it already depends on.
import { createHash, randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { admitJsonSemanticContent, ascribedBytes, checkTerm, effectTerm, EMPTY_WITNESS_ROOT, identifyJsonSemanticContent, inferTerm } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/runtime";
import { decodeSemantic, semanticBytes, semanticId } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";
import { witnessBit } from "@red-cup-engineering/hierarchical-circuit-law";
import { a2aResultParts, ROLE_AGENT, ROLE_USER } from "./a2a-client.mjs";
import { createA2aServer } from "./a2a-server.mjs";
import { ephemeralAgentCardSigning } from "./agent-card-signing.mjs";
import { extractRmnPart, rmnPart, sendRmnTask, SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION } from "./rmn-part.mjs";

export const artifactChecksum = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

export function semanticJsonId(objectKind, value) {
  return identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
}
export function semanticBytesId(objectKind, bytes) {
  return semanticJsonId(objectKind, { mediaType: "application/octet-stream", contentBase64: Buffer.from(bytes).toString("base64") });
}
export function textNi(value, objectKind = "resource-brokerage.effect-coordinate") {
  return semanticJsonId(objectKind, value);
}

function agentUrl() {
  if (!process.env.RMN_CONFORMANCE_AGENT) throw new Error("RMN_CONFORMANCE_AGENT must name the hired RMN provider's A2A 1.0 Agent Card");
  return process.env.RMN_CONFORMANCE_AGENT;
}
function witAgentUrl() {
  if (!process.env.WIT_TRANSITION_ASSAY_AGENT) throw new Error("WIT_TRANSITION_ASSAY_AGENT must name the hired WIT transition provider's signed A2A 1.0 Agent Card");
  return process.env.WIT_TRANSITION_ASSAY_AGENT;
}

/** Hires the RMN conformance A2A provider named by RMN_CONFORMANCE_AGENT with
 * one ascribed term. `send` is overridable so callers (and this module's own
 * tests) can exercise the ascribe/decode judgment without a live provider. */
async function hireRmnConformance({ agentUrl: url, term, expectedType, send = sendRmnTask }) {
  const requestBytes = ascribedBytes(term, expectedType);
  const message = {
    messageId: randomUUID(), contextId: "", taskId: "", role: ROLE_USER,
    parts: [rmnPart(requestBytes, "ascribed-term.rmn.cbor")], metadata: {}, extensions: [SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION], referenceTaskIds: [],
  };
  const exchange = await send({ agentUrl: url, requireSignature: true, message });
  const output = extractRmnPart(a2aResultParts(exchange.result));
  const response = decodeSemantic(output.bytes);
  if (!semanticBytes(response).equals(output.bytes)) throw new Error("RMN provider returned noncanonical CBOR");
  if (response?.[0] !== "ascribe" || response.length !== 3) throw new Error("RMN provider returned an untyped response");
  checkTerm(response[2], response[1]);
  return { term: semanticId(term), normalForm: response[2], conformance: exchange.outputNi };
}

export async function proposeEffect(_actor, cell, _now, { send } = {}) {
  const term = effectTerm(cell);
  const response = await hireRmnConformance({ agentUrl: agentUrl(), term, expectedType: inferTerm(term), ...(send ? { send } : {}) });
  return { semanticId: response.term, evidence: cell.evidenceRoot, conformance: response.conformance };
}

export async function completeEffect(_actor, proposalCell, completionCell, evidence, _now) {
  const agentUrl = witAgentUrl();
  const response = await assayWitTransition({ agentUrl, proposalCell, completionCell, evidence });
  return { proposal: response.proposal, completion: response.completion, witness: response.witness, outcome: response.outcome, conformance: response.exchange.outputNi };
}

// The WIT transition provider speaks addressed semantic JSON records of this
// object kind: the request carries both effect cells and the evidence, the
// receipt binds the exact request and names the provider's CAIP-10 account.
export const WIT_TRANSITION_ASSAY_PROFILE = "org.emsenn.obsmetrology.wit-transition-assay.v2";
const WIT_OBJECT_KIND = "lenticule-science.wit-transition-assay.json";
const CAIP10 = /^eip155:[1-9][0-9]*:0x[0-9a-fA-F]{40}$/u;
const witIdentified = (value) => identifyJsonSemanticContent({ objectKind: WIT_OBJECT_KIND, value, witnessRoot: EMPTY_WITNESS_ROOT });
const witRecord = (value) => Object.freeze({ ...structuredClone(value), id: witIdentified(value).token });
const isWitRecord = (value) => {
  if (value === null || typeof value !== "object" || typeof value.id !== "string") return false;
  const { id, ...body } = value;
  return witIdentified(body).token === id;
};

const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
// Fields one effect keeps across its proposal→completion transition.
const STABLE_CELL_FIELDS = ["caller", "law", "operation", "parent", "postcondition", "precondition", "provider", "refusal"];
function witFail(code, message) { const error = new TypeError(message); error.code = code; throw error; }
function witFour(value, name) {
  if (value === null || typeof value !== "object" || Object.keys(value).sort().join("\0") !== "negativeEvidence\0positiveEvidence" || typeof value.positiveEvidence !== "boolean" || typeof value.negativeEvidence !== "boolean") witFail("malformed-four", `${name} must expose exactly the independent positiveEvidence and negativeEvidence bits`);
  return Object.freeze({ positiveEvidence: value.positiveEvidence, negativeEvidence: value.negativeEvidence });
}
function witCell(value, name) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) witFail("malformed-wit-transition", `${name} must be an effect cell`);
  if (!NI.test(value.evidenceRoot ?? "")) witFail("malformed-wit-transition", `${name}.evidenceRoot must be semantic content identity`);
  return Object.freeze({ ...structuredClone(value), outcome: witFour(value.outcome, `${name}.outcome`) });
}

/** The addressed request a WIT transition provider assays. */
export function encodeWitTransitionAssayRequest({ proposalCell, completionCell, evidence }) {
  if (!NI.test(evidence ?? "")) witFail("malformed-wit-transition", "transition evidence must be semantic content identity");
  return witRecord({ type: "WitTransitionAssayRequest", proposalCell: witCell(proposalCell, "proposalCell"), completionCell: witCell(completionCell, "completionCell"), evidence });
}

/** A provider's receipt, admitted only when it is exact current semantic content. */
export function decodeWitTransitionAssayReceipt(value) {
  if (!isWitRecord(value) || value.kind !== "WitTransitionAssayReceipt" || value.profile !== WIT_TRANSITION_ASSAY_PROFILE || !CAIP10.test(value.provider ?? "") || !isWitRecord(value.witnessTerm) || value.witness !== value.witnessTerm.id) {
    witFail("malformed-wit-transition", "WIT transition receipt is not exact current semantic content");
  }
  return Object.freeze(value);
}

/** Hires the WIT transition provider at agentUrl to assay one proposal→completion
 * cover; the receipt must bind this exact request. */
export async function assayWitTransition({ agentUrl: url, proposalCell, completionCell, evidence, signal, send = sendRmnTask }) {
  const request = encodeWitTransitionAssayRequest({ proposalCell, completionCell, evidence });
  const message = {
    messageId: randomUUID(), contextId: "", taskId: "", role: ROLE_USER,
    parts: [rmnPart(witIdentified(request).bytes, "wit-transition-request.rmn.cbor")], metadata: { request: request.id }, extensions: [], referenceTaskIds: [],
  };
  const exchange = await send({ agentUrl: url, message, requireSignature: true, ...(signal ? { signal } : {}) });
  const output = extractRmnPart(a2aResultParts(exchange.result));
  const receipt = decodeWitTransitionAssayReceipt(admitJsonSemanticContent({ bytes: output.bytes, objectKind: WIT_OBJECT_KIND }).value);
  if (receipt.request !== request.id) throw new Error("WIT transition receipt does not bind the exact request");
  return { ...receipt, receipt, receiptNi: receipt.id, exchange };
}

/** The provider's judgment: one exact 0→1 FOUR cover between two cells of the
 * same effect, completed with the named evidence, receipted by providerAccount. */
export function witnessWitTransition(request, { providerAccount } = {}) {
  if (!CAIP10.test(providerAccount ?? "")) witFail("missing-wit-provider", "WIT transition assay requires the deployed provider's CAIP-10 account");
  if (!isWitRecord(request) || request.type !== "WitTransitionAssayRequest") witFail("malformed-wit-transition", "WIT transition request must be exact addressed semantic JSON");
  const proposal = witCell(request.proposalCell, "proposalCell"), completion = witCell(request.completionCell, "completionCell");
  if (!NI.test(request.evidence ?? "")) witFail("malformed-wit-transition", "transition evidence must be semantic content identity");
  const articulatedAxis = witnessBit(proposal.outcome, completion.outcome);
  for (const field of STABLE_CELL_FIELDS) if (!isDeepStrictEqual(proposal[field], completion[field])) witFail("malformed-effect-transition", `${field} changed across one effect transition`);
  if (completion.evidenceRoot !== request.evidence) witFail("malformed-effect-transition", "completion evidenceRoot must equal the WIT evidence identity");
  const proposalId = witIdentified(proposal).token, completionId = witIdentified(completion).token;
  const witnessTerm = witRecord({ type: "WitTransitionWitness", proposal: proposalId, completion: completionId, evidence: request.evidence, before: proposal.outcome, after: completion.outcome, articulatedAxis });
  return witRecord({ kind: "WitTransitionAssayReceipt", profile: WIT_TRANSITION_ASSAY_PROFILE, provider: providerAccount, request: request.id, proposal: proposalId, completion: completionId, evidence: request.evidence, witness: witnessTerm.id, witnessTerm, outcome: completion.outcome });
}

/** The A2A message/send handler of a WIT transition provider. */
export function witTransitionAssayHandler({ providerAccount }) {
  return (message) => {
    const request = admitJsonSemanticContent({ bytes: extractRmnPart(message.parts).bytes, objectKind: WIT_OBJECT_KIND }).value;
    const receipt = witnessWitTransition(request, { providerAccount });
    return {
      messageId: randomUUID(), contextId: message.contextId, taskId: message.taskId, role: ROLE_AGENT,
      parts: [rmnPart(witIdentified(receipt).bytes, "wit-transition-receipt.rmn.cbor")],
      metadata: { disposition: "witnessed-cover", receiptNi: receipt.id, witnessNi: receipt.witness }, extensions: [], referenceTaskIds: [],
    };
  };
}

export const WIT_TRANSITION_AGENT_CARD = Object.freeze({
  name: "WIT Transition Assay",
  description: "Independently verifies one evidence-bound FOUR knowledge-order cover between immutable RMN effect cells.",
  version: "1.0.0",
  capabilities: { streaming: false, pushNotifications: false, extensions: [], extendedAgentCard: false },
  securitySchemes: {}, securityRequirements: [],
  defaultInputModes: ["application/rmn+cbor"], defaultOutputModes: ["application/rmn+cbor"],
  skills: [{ id: "assay-wit-transition", name: "Assay one WIT transition", description: "Requires one exact 0-to-1 FOUR cover, active effect identity, and matching evidence root; returns a provider-bound typed WIT receipt.", tags: ["rmn", "four", "wit", "obsmetrology"], examples: [], inputModes: ["application/rmn+cbor"], outputModes: ["application/rmn+cbor"], securityRequirements: [] }],
  signatures: [],
});

/** Serves a WIT transition provider over A2A with a signed Agent Card. Without
 * a signing configuration, an ephemeral Ed25519 key signs the card. */
export function serveWitTransitionAssay({ providerAccount, host = "127.0.0.1", port = 0, signing } = {}) {
  let keys = signing;
  const signer = (baseUrl) => (keys ??= ephemeralAgentCardSigning(baseUrl, "wit-transition-assay"));
  return createA2aServer({
    host, port, handlers: { "message/send": witTransitionAssayHandler({ providerAccount }) },
    agentCard: (baseUrl) => signer(baseUrl).sign({ ...WIT_TRANSITION_AGENT_CARD, supportedInterfaces: [{ url: baseUrl, protocolBinding: "JSONRPC", tenant: "", protocolVersion: "1.0" }] }),
    jwks: (baseUrl) => signer(baseUrl).jwks,
  });
}

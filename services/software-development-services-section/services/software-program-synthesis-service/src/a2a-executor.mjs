import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { runProgram } from "./program-runtime.mjs";
import { ACTOR, SYNTHESIS_EFFECTS, SYNTHESIS_LAW, exactOperation, operationBytes, operationFromBytes, record } from "./protocol.mjs";
export { ACTOR, SYNTHESIS_EFFECTS, SYNTHESIS_LAW, exactOperation, operationBytes, operationFromBytes, record } from "./protocol.mjs";

function hasExactKeys(value, keys) {
  return Object.keys(value).sort().join("\n") === [...keys].sort().join("\n");
}

const INTENT_SIGNATURE = record({
  type: "SoftwareProgramSynthesisIntent",
  provider: ACTOR,
  law: SYNTHESIS_LAW.id,
  operation: "invoke-software-program-synthesis",
  effects: SYNTHESIS_EFFECTS,
}).id;

function exactRequest(value) {
  return exactOperation(value)
    && hasExactKeys(value, ["id", "type", "provider", "program"])
    && value.type === "SoftwareProgramSynthesisRequest"
    && value.provider === ACTOR
    && value.program !== null
    && typeof value.program === "object"
    && !Array.isArray(value.program)
    && exactOperation(value.program);
}

export function solicitSoftwareProgramSynthesis(solicitation) {
  if (!exactOperation(solicitation)
    || !hasExactKeys(solicitation, ["id", "type", "provider", "customer", "request"])
    || solicitation.type !== "SoftwareProgramSynthesisSolicitation"
    || solicitation.provider !== ACTOR
    || typeof solicitation.customer !== "string"
    || !solicitation.customer.startsWith("urn:")
    || !exactRequest(solicitation.request)) {
    throw new Error("exact provider-addressed software program synthesis solicitation is required");
  }
  return record({
    type: "SoftwareProgramSynthesisOffer",
    provider: ACTOR,
    customer: solicitation.customer,
    solicitation: solicitation.id,
    request: solicitation.request.id,
    program: solicitation.request.program.id,
    law: SYNTHESIS_LAW.id,
    operation: "invoke-software-program-synthesis",
    effects: SYNTHESIS_EFFECTS,
    requirements: [{ type: "ResourceGrantRequirement", effects: SYNTHESIS_EFFECTS }],
    intentSignature: INTENT_SIGNATURE,
  });
}

function validateContract(contract) {
  if (!exactOperation(contract)
    || !hasExactKeys(contract, ["id", "type", "provider", "customer", "offer", "request", "resourceGrant"])
    || contract.type !== "SoftwareProgramSynthesisContract"
    || contract.provider !== ACTOR
    || typeof contract.customer !== "string"
    || !exactRequest(contract.request)
    || !exactOperation(contract.offer)
    || !exactOperation(contract.resourceGrant)) {
    throw new Error("exact software program synthesis contract is required");
  }
  const expectedOffer = solicitSoftwareProgramSynthesis(record({
    type: "SoftwareProgramSynthesisSolicitation",
    provider: ACTOR,
    customer: contract.customer,
    request: contract.request,
  }));
  const offer = contract.offer;
  if (offer.id !== expectedOffer.id
    || offer.provider !== ACTOR
    || offer.customer !== contract.customer
    || offer.request !== contract.request.id
    || offer.program !== contract.request.program.id
    || offer.law !== SYNTHESIS_LAW.id
    || offer.operation !== "invoke-software-program-synthesis"
    || offer.intentSignature !== INTENT_SIGNATURE
    || JSON.stringify(offer.effects) !== JSON.stringify(SYNTHESIS_EFFECTS)) {
    throw new Error("software program synthesis offer is not bound to the exact solicitation and law");
  }
  const grant = contract.resourceGrant;
  const granted = new Set(Array.isArray(grant.effects) ? grant.effects : []);
  if (Object.hasOwn(grant, "maxRuntimeMs")) {
    throw new Error("maxRuntimeMs is retired: the durable A2A task remains live until completion, refusal, or customer cancellation");
  }
  if (grant.type !== "ResourceGrant"
    || grant.issuer !== contract.customer
    || grant.holder !== ACTOR
    || grant.law !== SYNTHESIS_LAW.id
    || grant.program !== contract.request.program.id
    || !SYNTHESIS_EFFECTS.every((effect) => granted.has(effect))) {
    throw new Error("resource grant does not cover the offered synthesis effects");
  }
  return { offer, request: contract.request, grant };
}

export async function executeContractedSoftwareProgramSynthesis(contract, options = {}) {
  const { offer, request } = validateContract(contract);
  const result = await (options.runProgram ?? runProgram)(request.program, options.execution);
  return record({
    type: "SoftwareProgramSynthesisContractResult",
    provider: ACTOR,
    customer: contract.customer,
    contract: contract.id,
    offer: offer.id,
    request: request.id,
    program: request.program.id,
    result,
  });
}

export async function executeOperation(operation, options = {}) {
  if (operation?.type === "SoftwareProgramSynthesisSolicitation") return solicitSoftwareProgramSynthesis(operation);
  if (operation?.type === "SoftwareProgramSynthesisContract") return executeContractedSoftwareProgramSynthesis(operation, options);
  throw new Error("only synthesis solicitation or contracted synthesis invocation is admitted");
}

export async function executeA2aMessage(source, options = {}) {
  const message = Message.fromJSON(source);
  if (message.role !== Role.ROLE_USER) throw new Error("software program executor requires an A2A user Message");
  const input = extractRmnPart(message.parts);
  const response = await executeOperation(operationFromBytes(input.bytes), options);
  return Message.toJSON({
    messageId: "", contextId: message.contextId ?? "", taskId: message.taskId ?? "", role: Role.ROLE_AGENT,
    parts: [rmnPart(operationBytes(response))],
    metadata: { inputNi: input.ni, outputNi: response.id, provider: ACTOR },
    extensions: [], referenceTaskIds: [],
  });
}

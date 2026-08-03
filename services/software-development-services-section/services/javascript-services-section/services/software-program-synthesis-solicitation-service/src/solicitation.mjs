import { projectSoftwareDesignInputs } from "./design-inputs.mjs";

function hasExactKeys(value, keys) {
  return Object.keys(value).sort().join("\n") === [...keys].sort().join("\n");
}

export function createSoftwareProgramSynthesisSolicitation({ actor, effects, exactOperation, record }) {
  const intentSignature = record({
    type: "SoftwareProgramSynthesisIntent",
    provider: actor,
    operation: "invoke-software-program-synthesis",
    effects,
  }).id;

  function exactRequest(value) {
    return exactOperation(value)
      && hasExactKeys(value, ["id", "type", "provider", "program"])
      && value.type === "SoftwareProgramSynthesisRequest"
      && value.provider === actor
      && value.program !== null
      && typeof value.program === "object"
      && !Array.isArray(value.program)
      && exactOperation(value.program);
  }

  function solicitSoftwareProgramSynthesis(solicitation) {
    if (!exactOperation(solicitation)
      || !hasExactKeys(solicitation, ["id", "type", "provider", "customer", "request"])
      || solicitation.type !== "SoftwareProgramSynthesisSolicitation"
      || solicitation.provider !== actor
      || typeof solicitation.customer !== "string"
      || !solicitation.customer.startsWith("urn:")
      || !exactRequest(solicitation.request)) {
      throw new Error("exact provider-addressed software program synthesis solicitation is required");
    }
    return record({
      type: "SoftwareProgramSynthesisOffer",
      provider: actor,
      customer: solicitation.customer,
      solicitation: solicitation.id,
      request: solicitation.request.id,
      program: solicitation.request.program.id,
      operation: "invoke-software-program-synthesis",
      effects,
      requirements: [{ type: "ResourceGrantRequirement", effects }],
      intentSignature,
    });
  }

  function validateContractedSoftwareProgramSynthesis(contract) {
    if (!exactOperation(contract)
      || !hasExactKeys(contract, ["id", "type", "provider", "customer", "offer", "request", "resourceGrant"])
      || contract.type !== "SoftwareProgramSynthesisContract"
      || contract.provider !== actor
      || typeof contract.customer !== "string"
      || !exactRequest(contract.request)
      || !exactOperation(contract.offer)
      || !exactOperation(contract.resourceGrant)) {
      throw new Error("exact software program synthesis contract is required");
    }
    const expectedOffer = solicitSoftwareProgramSynthesis(record({
      type: "SoftwareProgramSynthesisSolicitation",
      provider: actor,
      customer: contract.customer,
      request: contract.request,
    }));
    const offer = contract.offer;
    if (offer.id !== expectedOffer.id
      || offer.provider !== actor
      || offer.customer !== contract.customer
      || offer.request !== contract.request.id
      || offer.program !== contract.request.program.id
      || offer.operation !== "invoke-software-program-synthesis"
      || offer.intentSignature !== intentSignature
      || JSON.stringify(offer.effects) !== JSON.stringify(effects)) {
      throw new Error("software program synthesis offer is not bound to the exact solicitation");
    }
    const grant = contract.resourceGrant;
    const granted = new Set(Array.isArray(grant.effects) ? grant.effects : []);
    if (Object.hasOwn(grant, "maxRuntimeMs")) {
      throw new Error("maxRuntimeMs is retired: the durable A2A task remains live until completion, refusal, or customer cancellation");
    }
    if (grant.type !== "ResourceGrant"
      || grant.issuer !== contract.customer
      || grant.holder !== actor
      || grant.program !== contract.request.program.id
      || !effects.every((effect) => granted.has(effect))) {
      throw new Error("resource grant does not cover the offered synthesis effects");
    }
    const request = contract.request;
    const designInputs = projectSoftwareDesignInputs({ actor, contract, effects, grant, offer, request });
    return { offer, request, grant, designInputs };
  }

  return Object.freeze({ intentSignature, solicitSoftwareProgramSynthesis, validateContractedSoftwareProgramSynthesis });
}

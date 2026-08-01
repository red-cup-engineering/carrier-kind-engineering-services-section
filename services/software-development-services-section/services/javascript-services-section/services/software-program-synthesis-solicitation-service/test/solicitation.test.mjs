import assert from "node:assert/strict";
import test from "node:test";
import { createSoftwareProgramSynthesisSolicitation } from "../src/solicitation.mjs";

function record(body) { return Object.freeze({ id: JSON.stringify(body), ...body }); }
function exactOperation(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const { id, ...body } = value;
  return id === JSON.stringify(body);
}

test("forms and validates a deterministic solicitation offer without an effect", () => {
  const actor = "urn:ame:test-synthesis";
  const effects = Object.freeze(["provider-local-compute"]);
  const solicitationMaterial = createSoftwareProgramSynthesisSolicitation({ actor, effects, exactOperation, record });
  const program = record({ type: "SoftwareProgram" });
  const request = record({ type: "SoftwareProgramSynthesisRequest", provider: actor, program });
  const solicitation = record({ type: "SoftwareProgramSynthesisSolicitation", provider: actor, customer: "urn:ame:customer", request });
  const offer = solicitationMaterial.solicitSoftwareProgramSynthesis(solicitation);
  const grant = record({ type: "ResourceGrant", issuer: "urn:ame:customer", holder: actor, program: program.id, effects });
  const contract = record({ type: "SoftwareProgramSynthesisContract", provider: actor, customer: "urn:ame:customer", offer, request, resourceGrant: grant });
  assert.equal(solicitationMaterial.validateContractedSoftwareProgramSynthesis(contract).offer.id, offer.id);
});

import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createSoftwareProgramSynthesisSolicitation } from "../src/solicitation.mjs";
import {
  ADMITTED_DEMAND_CATEGORY,
  createSoftwareDesignInputJournal,
  REQUIREMENTS_AUTHORITY_CATEGORY,
} from "../src/design-inputs.mjs";

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

test("contracted customer demand unfolds into addressed design layers and append-only custody", (t) => {
  const actor = "urn:ame:test-synthesis";
  const customer = "urn:ame:receiver";
  const effects = Object.freeze(["provider-local-compute"]);
  const material = createSoftwareProgramSynthesisSolicitation({ actor, effects, exactOperation, record });
  const program = record({
    type: "SoftwareProgram",
    objective: "Repair the receiver-facing parser.",
    territory: "/srv/receiver",
    requiredFocusPaths: ["src/parser.mjs", "test/parser.test.mjs"],
    requiredAcceptanceKeys: ["parser-receiver"],
    requiredMissionBundles: [{ acceptanceKey: "parser-receiver", focusPaths: ["src/parser.mjs", "test/parser.test.mjs"] }],
    acceptanceCatalog: { "parser-receiver": { command: "node --test test/parser.test.mjs" } },
    verifyCommand: "npm run verify",
    acceptanceCommand: "node --test test/parser.test.mjs",
    missionPlan: null,
    plannerCount: 3,
    missionRoutingProfile: "bounded",
  });
  const request = record({ type: "SoftwareProgramSynthesisRequest", provider: actor, program });
  const solicitation = record({ type: "SoftwareProgramSynthesisSolicitation", provider: actor, customer, request });
  const offer = material.solicitSoftwareProgramSynthesis(solicitation);
  const grant = record({ type: "ResourceGrant", issuer: customer, holder: actor, program: program.id, effects });
  const contract = record({ type: "SoftwareProgramSynthesisContract", provider: actor, customer, offer, request, resourceGrant: grant });

  const { designInputs } = material.validateContractedSoftwareProgramSynthesis(contract);
  assert.match(designInputs.admittedDemand.id, /^ni:\/\/\/sha-256;/u);
  assert.equal(designInputs.requirementsAuthority.admittedDemand, designInputs.admittedDemand.id);
  assert.equal(designInputs.designConstraints.requirementsAuthority, designInputs.requirementsAuthority.id);
  assert.deepEqual(designInputs.designConstraints.requiredFocusPaths, ["src/parser.mjs", "test/parser.test.mjs"]);
  assert.equal(designInputs.receiverTests.proofObligations, designInputs.proofObligations.id);
  assert.equal(designInputs.fabrication.compositionSearch, designInputs.compositionSearch.id);
  assert.equal(designInputs.operationalEvidence, null);

  const root = mkdtempSync(join(tmpdir(), "software-design-inputs-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const journal = createSoftwareDesignInputJournal({ root });
  assert.equal(journal.record(designInputs, "2096-08-03T18:00:00.000Z").appended, 2);
  assert.equal(journal.record(designInputs, "2096-08-03T18:00:00.000Z").appended, 0);
  assert.deepEqual(journal.query(ADMITTED_DEMAND_CATEGORY), [designInputs.admittedDemand]);
  assert.deepEqual(journal.query(REQUIREMENTS_AUTHORITY_CATEGORY), [designInputs.requirementsAuthority]);
});

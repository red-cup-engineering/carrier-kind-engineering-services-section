import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { admitGoverningWork, admitGoverningWorkDelegation, authorizeGoverningWorkExecution, compileGoverningWorkProgram, governingWorkReadout, loadGoverningWorkDefinitionReadModel, receiveGoverningWorkResult, validateGoverningWorkDefinitions } from "../src/index.mjs";

const definitions = { principals: [{ id: "principal:board-leader-movement-team", kind: "leader-movement-team", normativeSystem: "corporate-contract", reservedDecisionClasses: ["external-contract", "capital", "credential", "settlement"] }], offices: [{ id: "cto", normativeSystem: "corporate-contract", appointingPrincipal: "principal:board-leader-movement-team", reportsTo: "principal:board-leader-movement-team", actionDomain: ["technology"], deonticProfile: ["duty"], installationEvidence: ["record:cto"] }], duties: [{ id: "direct", bearer: "cto", position: "duty", normativeSystem: "corporate-contract", requiredActOrState: "direct", correlative: "enterprise", receiverCondition: "receiver-test", service: "engineering", source: "record:cto", requiredCapabilities: ["code"], allowedEffects: ["workspace-write"] }], services: [{ id: "engineering", requiredCapabilities: ["code"], accountableOffice: "cto", duties: ["direct"], offeredOutcome: "working system", receiverCondition: "receiver-test" }] };
const admission = () => admitGoverningWork({ definitions, intent: { id: "intent", source: "founder", scope: "task:cut" }, allocation: { id: "allocation", office: "cto", duty: "direct", character: "actor:cto", incumbencyEvidence: "record:incumbency", capabilities: ["code"], scope: "task:cut", receiver: "actor:receiver", allowedEffects: ["workspace-write"], effectClasses: ["workspace-write"] } });

test("admission, attenuating delegation, revocation, and execution refuse at their own boundary", () => {
  const accepted = admission(); assert.equal(accepted.status, "admitted");
  const delegated = admitGoverningWorkDelegation(accepted, { id: "delegate", delegate: "actor:engineer", scope: "task:cut", allowedEffects: ["workspace-write"], requiredCapabilities: ["code"] });
  assert.equal(delegated.admitted.residualAccountability, "actor:cto");
  const execution = authorizeGoverningWorkExecution({ admission: accepted, delegation: delegated, execution: { id: "run", actor: "actor:engineer", scope: "task:cut", effects: ["workspace-write"] } });
  assert.equal(execution.status, "authorized");
  assert.equal(receiveGoverningWorkResult({ authorization: execution, receiver: "actor:receiver", outcome: { status: "done" }, evidence: ["test"] }).status, "accepted");
  assert.equal(authorizeGoverningWorkExecution({ admission: accepted, delegation: delegated, revoked: ["delegate"], execution: { id: "run", actor: "actor:engineer", scope: "task:cut", effects: [] } }).reason, "delegation-revoked");
  assert.equal(admitGoverningWorkDelegation(accepted, { id: "bad", delegate: "actor:engineer", scope: "task:other", allowedEffects: [], requiredCapabilities: [] }).reason, "nemo-dat-attenuation-failed");
});

test("principals are distinct from offices and reserved effects need an explicit founder grant", () => {
  assert.equal(validateGoverningWorkDefinitions(definitions).theoryStatus, "conditional-not-theorem-certified");
  assert.throws(() => validateGoverningWorkDefinitions({ ...definitions, offices: [{ ...definitions.offices[0], appointingPrincipal: "cto" }] }), /appointing principal/u);
  const refused = admitGoverningWork({ definitions, intent: { id: "reserved", source: "founder", scope: "task:reserved" }, allocation: { id: "reserved", office: "cto", duty: "direct", character: "actor:cto", incumbencyEvidence: "record:incumbency", capabilities: ["code"], scope: "task:reserved", receiver: "actor:receiver", allowedEffects: [], effectClasses: ["settlement"] } });
  assert.equal(refused.reason, "reserved-effect-requires-founder-grant");
});

test("Codex-shaped work is admitted with dependency refusals and content identities", () => {
  const result = compileGoverningWorkProgram({ cycle: "cycle", source: "prompt:1", workItems: [{ ref: "root", objective: "root", desiredOutcome: "done", completionConditions: ["checked"], dependencies: [], candidate: { principal: "actor:cto" } }, { ref: "child", objective: "child", desiredOutcome: "done", completionConditions: ["checked"], dependencies: ["root"], candidate: { principal: "actor:cto" } }] });
  assert.equal(result.status, "admitted"); assert.match(result.program.items[0].id, /^ni:\/\/\/sha-256;/u); assert.equal(result.program.items[1].typedReadiness.refusal.reason, "task-dependencies-not-achieved");
  assert.equal(governingWorkReadout([result]).pending.length, 1);
});

test("a domain-owned definition layout is projected only after generic validation", () => {
  const root = mkdtempSync(join(tmpdir(), "governing-work-definitions-"));
  try {
    const suite = join(root, "c-suite", "cto"); mkdirSync(suite, { recursive: true });
    writeFileSync(join(root, "governing-principals.json"), JSON.stringify(definitions.principals));
    writeFileSync(join(suite, "office.json"), JSON.stringify(definitions.offices[0]));
    writeFileSync(join(suite, "duties.json"), JSON.stringify(definitions.duties));
    writeFileSync(join(suite, "services.json"), JSON.stringify(definitions.services));
    const admitted = loadGoverningWorkDefinitionReadModel({ recordsRoot: root });
    assert.equal(admitted.status, "admitted");
    assert.equal(admitted.definitions.offices[0].id, "cto");
    writeFileSync(join(suite, "office.json"), "{}");
    assert.equal(loadGoverningWorkDefinitionReadModel({ recordsRoot: root }).reason, "definitions-invalid");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

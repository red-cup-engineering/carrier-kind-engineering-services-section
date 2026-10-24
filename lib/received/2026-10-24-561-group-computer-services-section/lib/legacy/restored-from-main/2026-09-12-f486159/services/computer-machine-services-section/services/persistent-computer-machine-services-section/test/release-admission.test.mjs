import assert from "node:assert/strict";
import test from "node:test";
import { decideReleaseAdmission } from "../src/release-admission.mjs";
import { admitControlCommand, resolvePrincipalSession } from "@red-cup-engineering/principal-office-seating-service";

const authorityEvidence = "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

function admittedControlCommand(machine, binding, reservationReceipt) {
  const authentication = { principal: { issuer: "https://accounts.example", subject: "founder" }, evidence: authorityEvidence, audience: "https://ops.561.group", authenticatedAt: "2026-09-09T00:00:00Z", expiresAt: "2026-09-10T00:00:00Z" };
  const session = resolvePrincipalSession({ authentication, actor: "actor:test", seating: "chief-technology-officer", audience: authentication.audience, now: "2026-09-09T00:00:00Z", delegations: [{ id: "delegation", evidence: authorityEvidence, principal: authentication.principal, actor: "actor:test", audience: authentication.audience, recognition: true, induction: true, notBefore: "2026-09-08T00:00:00Z" }], seatings: [{ id: "chief-technology-officer", evidence: authorityEvidence, actor: "actor:test", character: "test", office: "chief-technology-officer", incumbency: "test-incumbency", recognition: true, induction: true, notBefore: "2026-09-08T00:00:00Z" }] });
  assert.equal(session.ok, true);
  if (!session.ok) throw new Error("test session unresolved");
  return admitControlCommand({
    session: session.session,
    now: "2026-09-09T00:00:00Z",
    dutyAuthorizations: [{ id: "release-duty", evidence: authorityEvidence, actor: "actor:test", office: "chief-technology-officer", duty: "direct-technology-delivery", capabilities: ["release-admission"], allowedEffects: ["release"], recognition: true, induction: true, notBefore: "2026-09-08T00:00:00Z", expiresAt: "2026-09-10T00:00:00Z" }],
    command: { type: "ControlCommand", version: 1, identity: "command:release", actor: "actor:test", office: "chief-technology-officer", duty: "direct-technology-delivery", requiredCapabilities: ["release-admission"], effect: "release", message: { type: "ControlMessage", version: 1, identity: "message:release", evidence: authorityEvidence, channelIdentity: "channel:release" }, channel: { type: "RuntimeChannel", version: 1, identity: "channel:release", evidence: authorityEvidence, audience: authentication.audience }, machine: { type: "MachineBinding", version: 1, machineIdentity: machine.machineIdentity, observationEvidenceIdentity: authorityEvidence, observedAt: machine.observedAt, validUntil: machine.validUntil, allowedEffects: machine.allowedEffects }, runtimeEndpoint: machine.runtimeEndpoint, resourceReservation: { providerIdentity: binding.providerIdentity, accountIdentity: binding.accountIdentity, windowIdentity: binding.windowIdentity, reservationIdentity: reservationReceipt.reservationIdentity } },
  });
}

function admittedInput(overrides = {}) {
  const machine = { type: "ReleaseMachineBinding", version: 1, machineIdentity: "machine:cold-red-gate", observationEvidenceIdentity: authorityEvidence, observedAt: "2026-09-09T00:00:00.000Z", validUntil: "2026-09-10T00:00:00.000Z", allowedEffects: ["release"], runtimeEndpoint: { type: "RuntimeEndpoint", version: 1, transport: "ssh", address: "cold-red-gate" } };
  const binding = { providerIdentity: "provider:test", accountIdentity: "account:test", windowIdentity: "window:test", evidenceIdentity: "evidence:capacity", observedAt: "2026-09-09T00:00:00.000Z", validFrom: "2026-09-09T00:00:00.000Z", validUntil: "2026-09-10T00:00:00.000Z", resetsAt: "2026-09-10T00:00:00.000Z", availableResources: [{ resource: "release", unit: "operation", amount: { numerator: "1", denominator: "1" } }], financialControl: { type: "WorkResourceFinancialControl", costState: "observed", costEvidenceIdentity: "evidence:cost", costObservedAt: "2026-09-09T00:00:00.000Z", costValidUntil: "2026-09-10T00:00:00.000Z", consideration: [{ kind: "currency", asset: "urn:currency:usd", unit: "cent", amount: { numerator: "0", denominator: "1" } }], billing: { status: "not-required" }, meterEvidenceIdentity: "evidence:meter", meterObservedAt: "2026-09-09T00:00:00.000Z", meterValidUntil: "2026-09-10T00:00:00.000Z" } };
  const reservationReceipt = { type: "WorkResourceReservationResult", disposition: "attempted", providerIdentity: binding.providerIdentity, accountIdentity: binding.accountIdentity, windowIdentity: binding.windowIdentity, reservationIdentity: "reservation:test" };
  return {
    evaluatedAt: "2026-09-09T00:00:00.000Z",
    machine,
    resourceControl: { type: "WorkResourceControlEvaluation", disposition: "admitted", binding },
    reservationReceipt,
    controlCommand: admittedControlCommand(machine, binding, reservationReceipt),
    reserve: { type: "ReleaseCapacityReserve", version: 1, minimumRootAvailableBytes: 5 * 1024 * 1024 * 1024, minimumMemoryAvailableMb: 250 },
    capacity: { type: "ReleaseCapacityObservation", version: 1, machineIdentity: "machine:cold-red-gate", observationEvidenceIdentity: authorityEvidence, observedAt: "2026-09-09T00:00:00.000Z", rootAvailableBytes: 8 * 1024 * 1024 * 1024, memoryAvailableMb: 512 },
    deploy: { type: "ReleaseDeployIntent", version: 1, mutation: true },
    receipt: { type: "ReleaseReceiptRequirement", version: 1, durable: true },
    ...overrides,
  };
}

test("decideReleaseAdmission admits only fully typed zero-cash release work", () => {
  const decision = decideReleaseAdmission(admittedInput());
  assert.equal(decision.admitted, true, JSON.stringify(decision.reasons));
  assert.deepEqual(decision.reasons, []);
  assert.deepEqual(decision.evidence.capacity, { rootAvailableBytes: 8 * 1024 * 1024 * 1024, memoryAvailableMb: 512 });
});

test("decideReleaseAdmission refuses missing shared control and durable reservation receipts", () => {
  const decision = decideReleaseAdmission(admittedInput({ resourceControl: undefined, reservationReceipt: undefined }));
  assert.equal(decision.admitted, false);
  assert.deepEqual(decision.reasons.map(({ code }) => code), ["resource-control-not-admitted", "reservation-receipt-not-admitted", "control-command-not-admitted"]);
});

test("the receiver refuses a command with a mismatched binding, effect, or endpoint-port substitution before release", () => {
  const mismatchedBinding = admittedInput();
  mismatchedBinding.reservationReceipt = { ...mismatchedBinding.reservationReceipt, reservationIdentity: "reservation:other" };
  assert.ok(decideReleaseAdmission(mismatchedBinding).reasons.some(({ code }) => code === "control-command-not-admitted"));

  const missingEffect = admittedInput();
  missingEffect.controlCommand = { ...missingEffect.controlCommand, command: { ...missingEffect.controlCommand.command, effect: "inspect" } };
  assert.ok(decideReleaseAdmission(missingEffect).reasons.some(({ code }) => code === "control-command-not-admitted"));

  const portInPlaceOfEndpoint = admittedInput();
  portInPlaceOfEndpoint.machine = { ...portInPlaceOfEndpoint.machine, runtimeEndpoint: { type: "RelationalMachinePort", version: 1, transport: "ssh", address: "cold-red-gate" } };
  assert.ok(decideReleaseAdmission(portInPlaceOfEndpoint).reasons.some(({ code }) => code === "machine-binding-not-admitted"));
});

test("decideReleaseAdmission returns machine-readable capacity and authority refusals without performing a release", () => {
  const decision = decideReleaseAdmission(admittedInput({
    capacity: { type: "ReleaseCapacityObservation", version: 1, rootAvailableBytes: 1, memoryAvailableMb: 1 },
  }));
  assert.equal(decision.admitted, false);
  assert.ok(decision.reasons.some(({ code }) => code === "capacity-not-admitted"));

  const lowCapacity = decideReleaseAdmission(admittedInput({
    capacity: { type: "ReleaseCapacityObservation", version: 1, rootAvailableBytes: 1, memoryAvailableMb: 1 },
  }));
  assert.deepEqual(lowCapacity.reasons.map(({ code }) => code), ["capacity-not-admitted", "capacity-root-below-reserve", "capacity-memory-below-reserve"]);
});

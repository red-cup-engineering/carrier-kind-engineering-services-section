import assert from "node:assert/strict";
import test from "node:test";
import { admitControlCommand, resolvePrincipalSession, verifyControlCommandAdmission, type AdmitControlCommandInput, type ResolvePrincipalSessionInput } from "../src/principal-office-seating.mts";

const evidence = "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const otherEvidence = "ni:///sha-256;BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
const input: ResolvePrincipalSessionInput = {
  authentication: { principal: { issuer: "https://accounts.example", subject: "founder" }, evidence, audience: "https://ops.561.group", authenticatedAt: "2026-09-09T00:00:00Z", expiresAt: "2026-09-09T02:00:00Z" },
  actor: "actor:WWOM5azg-fTrn1Id0YVbz5AhppbnFny_W5Xl-rKgSs4",
  seating: "chief-executive-officer",
  audience: "https://ops.561.group",
  now: "2026-09-09T01:00:00Z",
  delegations: [{ id: "founder-operates-codex", evidence, principal: { issuer: "https://accounts.example", subject: "founder" }, actor: "actor:WWOM5azg-fTrn1Id0YVbz5AhppbnFny_W5Xl-rKgSs4", audience: "https://ops.561.group", recognition: true, induction: true, notBefore: "2026-09-01T00:00:00Z" }],
  seatings: [{ id: "chief-executive-officer", evidence, actor: "actor:WWOM5azg-fTrn1Id0YVbz5AhppbnFny_W5Xl-rKgSs4", character: "dignitas-codex-chief-executive-officer-session", office: "chief-executive-officer", incumbency: "dignitas-codex-chief-executive-officer-session-as-chief-executive-officer", recognition: true, induction: true, notBefore: "2026-09-09T00:00:00Z" }],
};

test("an independently authenticated principal resolves exactly one admitted office seating", () => {
  const result = resolvePrincipalSession(input);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.session.seating.office, "chief-executive-officer");
  assert.equal(result.session.expiresAt, "2026-09-09T02:00:00.000Z");
});

test("a model/session label is absent from the contract and cannot replace delegation or seating evidence", () => {
  assert.deepEqual(resolvePrincipalSession({ ...input, delegations: [] }), { ok: false, reason: "delegation-not-admitted" });
  assert.deepEqual(resolvePrincipalSession({ ...input, seatings: [] }), { ok: false, reason: "seating-not-admitted" });
  assert.deepEqual(resolvePrincipalSession({ ...input, audience: "https://bare-cedar-fog" }), { ok: false, reason: "authentication-audience-mismatch" });
});

test("expired and ambiguous authority is refused", () => {
  assert.deepEqual(resolvePrincipalSession({ ...input, now: "2026-09-09T03:00:00Z" }), { ok: false, reason: "authentication-expired" });
  assert.deepEqual(resolvePrincipalSession({ ...input, seatings: [...input.seatings, { ...input.seatings[0]!, evidence: otherEvidence }] }), { ok: false, reason: "seating-not-admitted" });
});

function admittedCommandInput(overrides: Partial<AdmitControlCommandInput> = {}): AdmitControlCommandInput {
  const resolved = resolvePrincipalSession(input);
  assert.equal(resolved.ok, true);
  if (!resolved.ok) throw new Error("fixture session did not resolve");
  return {
    session: resolved.session,
    now: "2026-09-09T01:00:00Z",
    dutyAuthorizations: [{ id: "ceo-release-duty", evidence, actor: input.actor, office: "chief-executive-officer", duty: "direct-technology-delivery", capabilities: ["release-admission"], allowedEffects: ["release"], recognition: true, induction: true, notBefore: "2026-09-09T00:00:00Z", expiresAt: "2026-09-09T02:00:00Z" }],
    command: {
      type: "ControlCommand", version: 1, identity: "command:release-1", actor: input.actor, office: "chief-executive-officer", duty: "direct-technology-delivery", requiredCapabilities: ["release-admission"], effect: "release",
      message: { type: "ControlMessage", version: 1, identity: "message:release-1", evidence, channelIdentity: "channel:release" },
      channel: { type: "RuntimeChannel", version: 1, identity: "channel:release", evidence, audience: input.audience },
      machine: { type: "MachineBinding", version: 1, machineIdentity: "machine:cold-red-gate", observationEvidenceIdentity: evidence, observedAt: "2026-09-09T00:00:00Z", validUntil: "2026-09-09T02:00:00Z", allowedEffects: ["release"] },
      runtimeEndpoint: { type: "RuntimeEndpoint", version: 1, transport: "ssh", address: "cold-red-gate" },
      resourceReservation: { providerIdentity: "provider:test", accountIdentity: "account:test", windowIdentity: "window:test", reservationIdentity: "reservation:test" },
    },
    ...overrides,
  };
}

test("an admitted duty binds a resolved session to an effect, message/channel, machine endpoint, and reservation", () => {
  const admitted = admitControlCommand(admittedCommandInput());
  assert.equal(admitted.disposition, "admitted");
  assert.equal(verifyControlCommandAdmission(admitted, {
    now: "2026-09-09T01:00:00Z", effect: "release", machineIdentity: "machine:cold-red-gate", observationEvidenceIdentity: evidence, observedAt: "2026-09-09T00:00:00Z", runtimeEndpoint: { type: "RuntimeEndpoint", version: 1, transport: "ssh", address: "cold-red-gate" }, providerIdentity: "provider:test", accountIdentity: "account:test", windowIdentity: "window:test", reservationIdentity: "reservation:test",
  }), true);
});

test("expired or undescribed duty, effect, and endpoint/port substitution refuse before a receiver", () => {
  assert.equal(admitControlCommand(admittedCommandInput({ now: "2026-09-09T03:00:00Z" })).disposition, "refused");
  assert.deepEqual(admitControlCommand(admittedCommandInput({ dutyAuthorizations: [] })), { type: "ControlCommandAdmission", version: 1, disposition: "refused", reason: "duty-not-admitted" });
  const noRelease = admittedCommandInput();
  noRelease.dutyAuthorizations = [{ ...noRelease.dutyAuthorizations[0]!, allowedEffects: [] }];
  assert.deepEqual(admitControlCommand(noRelease), { type: "ControlCommandAdmission", version: 1, disposition: "refused", reason: "effect-not-admitted" });
  const admitted = admitControlCommand(admittedCommandInput());
  assert.equal(verifyControlCommandAdmission(admitted, {
    now: "2026-09-09T01:00:00Z", effect: "release", machineIdentity: "machine:cold-red-gate", observationEvidenceIdentity: evidence, observedAt: "2026-09-09T00:00:00Z", runtimeEndpoint: { type: "RelationalMachinePort", version: 1, transport: "ssh", address: "cold-red-gate" } as never, providerIdentity: "provider:test", accountIdentity: "account:test", windowIdentity: "window:test", reservationIdentity: "reservation:test",
  }), false);
});

test("a command refuses before session issue, after machine observation expiry, or across audiences", () => {
  assert.deepEqual(admitControlCommand(admittedCommandInput({ now: "2026-09-08T23:00:00Z" })), { type: "ControlCommandAdmission", version: 1, disposition: "refused", reason: "session-expired" });
  const expiredMachine = admittedCommandInput();
  expiredMachine.command = { ...expiredMachine.command, machine: { ...expiredMachine.command.machine, validUntil: "2026-09-09T00:30:00Z" } };
  expiredMachine.now = "2026-09-09T01:00:00Z";
  assert.deepEqual(admitControlCommand(expiredMachine), { type: "ControlCommandAdmission", version: 1, disposition: "refused", reason: "machine-observation-expired" });
  const foreignChannel = admittedCommandInput();
  foreignChannel.command = { ...foreignChannel.command, channel: { ...foreignChannel.command.channel, audience: "https://other.example" } };
  assert.deepEqual(admitControlCommand(foreignChannel), { type: "ControlCommandAdmission", version: 1, disposition: "refused", reason: "invalid-command" });
});

import assert from "node:assert/strict";
import test from "node:test";
import { evaluateAuthority, specializeAuthorityEvaluation } from "../src/corporate-authority.mjs";

const now = "2026-09-06T12:00:00.000Z";
const membership = (actorId, overrides = {}) => ({ id: `membership:${actorId}`, actorId, groupId: "group:one", standing: "verified", effectiveFrom: "2026-01-01T00:00:00.000Z", evidenceRef: `evidence:membership:${actorId}`, ...overrides });
const office = (overrides = {}) => ({ id: "office:treasurer", actorId: "actor:treasurer", groupId: "group:one", issuerId: "issuer:one", authorities: ["treasury.write"], resources: ["account:one"], actions: ["transfer"], standing: "verified", effectiveFrom: "2026-01-01T00:00:00.000Z", evidenceRef: "evidence:office", ...overrides });
const delegation = (overrides = {}) => ({ id: "delegation:bot", actorId: "actor:bot", fromActorId: "actor:treasurer", parentId: "office:treasurer", groupId: "group:one", issuerId: "issuer:one", authorities: ["treasury.write"], resources: ["account:one"], actions: ["transfer"], standing: "verified", effectiveFrom: "2026-02-01T00:00:00.000Z", evidenceRef: "evidence:delegation", ...overrides });
const request = (overrides = {}) => ({ kind: "governance.authority-evaluation-request", actorId: "actor:bot", groupId: "group:one", resource: "account:one", action: "transfer", requiresAuthority: "treasury.write", serverNow: now, maxStateAgeMs: 60_000, trustedState: { kind: "governance.trusted-authority-state", revision: "state:1", observedAt: now, rootIssuerId: "issuer:one", rootOfficeId: "office:treasurer", rootAuthorizedGroups: ["group:one"], memberships: [membership("actor:treasurer"), membership("actor:bot")], offices: [office()], delegations: [delegation()] }, ...overrides });

test("allows a verified, rooted, exact and attenuated delegation", () => {
  assert.equal(evaluateAuthority(request()).allowed, true);
});

test("denies untrusted, disputed, revoked, amplified, cyclic, duplicate, and stale carriers", () => {
  const valid = request();
  const cases = [
    request({ trustedState: { ...valid.trustedState, observedAt: "2026-09-06T11:58:00.000Z" } }),
    request({ trustedState: { ...valid.trustedState, memberships: [membership("actor:treasurer"), membership("actor:bot", { standing: "contested" })] } }),
    request({ trustedState: { ...valid.trustedState, delegations: [delegation({ standing: "revoked" })] } }),
    request({ trustedState: { ...valid.trustedState, delegations: [delegation({ resources: ["account:one", "account:two"] })] } }),
    request({ trustedState: { ...valid.trustedState, delegations: [delegation({ parentId: "delegation:bot" })] } }),
    request({ trustedState: { ...valid.trustedState, memberships: [...valid.trustedState.memberships, membership("actor:bot", { id: "membership:duplicate" })] } }),
  ];
  for (const input of cases) assert.equal(evaluateAuthority(input).allowed, false);
});

test("specializes both request and snapshot carrier kinds for an engineering receiver", () => {
  const model = specializeAuthorityEvaluation({ requestKind: "receiver.request", decisionKind: "receiver.decision", stateKind: "receiver.state" });
  const generic = request();
  const decision = model.evaluate({ ...generic, kind: "receiver.request", trustedState: { ...generic.trustedState, kind: "receiver.state" } });
  assert.equal(decision.kind, "receiver.decision");
  assert.equal(decision.allowed, true);
});

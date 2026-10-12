import assert from "node:assert/strict";
import test from "node:test";
import { corporateAuthorityAction, evaluateCorporateAuthority } from "../src/corporate-authority.mjs";

const now = "2026-09-06T12:00:00.000Z";
const groupId = "group:one";
const issuerId = "issuer:group-one";
const membership = (actorId, overrides = {}) => ({ id: `membership:${actorId}`, actorId, groupId, standing: "verified", effectiveFrom: "2026-01-01T00:00:00.000Z", evidenceRef: `evidence:membership:${actorId}`, ...overrides });
const rootOffice = (overrides = {}) => ({ id: "office:treasurer", actorId: "actor:treasurer", groupId, issuerId, authorities: ["treasury.write"], resources: ["account:one"], actions: ["transfer"], standing: "verified", effectiveFrom: "2026-01-01T00:00:00.000Z", evidenceRef: "evidence:office:treasurer", ...overrides });
const delegation = (id, actorId, fromActorId, parentId, overrides = {}) => ({ id, actorId, fromActorId, parentId, groupId, issuerId, authorities: ["treasury.write"], resources: ["account:one"], actions: ["transfer"], standing: "verified", effectiveFrom: "2026-02-01T00:00:00.000Z", evidenceRef: `evidence:${id}`, ...overrides });
const state = (overrides = {}) => ({ kind: "organizing.trusted-authority-state", revision: "state:1", observedAt: now, rootIssuerId: issuerId, rootOfficeId: "office:treasurer", rootAuthorizedGroups: [groupId], memberships: [membership("actor:treasurer"), membership("actor:bot"), membership("actor:assistant")], offices: [rootOffice()], delegations: [delegation("delegation:bot", "actor:bot", "actor:treasurer", "office:treasurer")], ...overrides });
const request = (trustedState, overrides = {}) => ({ kind: "organizing.corporate-authority-request", actorId: "actor:bot", groupId, resource: "account:one", action: "transfer", requiresAuthority: "treasury.write", serverNow: now, maxStateAgeMs: 60_000, trustedState, ...overrides });
const allowed = (input) => evaluateCorporateAuthority(input).allowed;

test("allows exact direct and multi-hop authority with only successful ancestry evidence", () => {
  assert.equal(allowed(request(state({ delegations: [] }), { actorId: "actor:treasurer" })), true);
  const first = delegation("delegation:assistant", "actor:assistant", "actor:treasurer", "office:treasurer");
  const second = delegation("delegation:bot", "actor:bot", "actor:assistant", "delegation:assistant");
  const decision = evaluateCorporateAuthority(request(state({ delegations: [first, second] })));
  assert.equal(decision.allowed, true);
  assert.deepEqual(decision.evidenceRefs, ["evidence:delegation:assistant", "evidence:delegation:bot", "evidence:membership:actor:assistant", "evidence:membership:actor:bot", "evidence:membership:actor:treasurer", "evidence:office:treasurer"]);
});

test("refuses malformed, stale, future, invalid-period, duplicate, and missing-evidence snapshots", () => {
  const valid = state();
  const cases = [
    request({ ...valid, observedAt: "not-a-date" }), request({ ...valid, observedAt: "2026-09-06T12:00:00.001Z" }), request({ ...valid, observedAt: "2026-02-30T00:00:00.000Z" }), request({ ...valid, observedAt: "2026-09-06T11:58:00.000Z" }),
    request({ ...valid, memberships: [...valid.memberships, membership("actor:bot", { id: "membership:bot:two" })] }), request({ ...valid, delegations: [...valid.delegations, { ...valid.delegations[0] }] }),
    request({ ...valid, offices: [rootOffice({ effectiveUntil: "2026-01-01T00:00:00.000Z" })] }), request({ ...valid, offices: [rootOffice({ effectiveUntil: "2026-02-30T00:00:00.000Z" })] }), request({ ...valid, offices: [rootOffice({ evidenceRef: "" })] }), request({ ...valid, delegations: [{ ...valid.delegations[0], resources: ["*"] }] }),
    request(valid, { maxStateAgeMs: 0 }), request(valid, { maxStateAgeMs: 300_001 }), { kind: "organizing.corporate-authority-request" },
  ];
  for (const [index, input] of cases.entries()) assert.equal(allowed(input), false, `case ${index}`);
});

test("ignores other-group and revoked historical grants while evaluating the requested scope", () => {
  const otherGroup = { ...delegation("delegation:bot:two", "actor:bot", "actor:treasurer", "office:treasurer"), groupId: "group:two" };
  const revoked = delegation("delegation:bot:old", "actor:bot", "actor:treasurer", "office:treasurer", { standing: "revoked" });
  assert.equal(allowed(request(state({ delegations: [state().delegations[0], otherGroup, revoked] }))), true);
});

test("allows overlapping valid delegations and selects stable successful evidence", () => {
  const later = delegation("delegation:z", "actor:bot", "actor:treasurer", "office:treasurer");
  const earlier = delegation("delegation:a", "actor:bot", "actor:treasurer", "office:treasurer");
  const decision = evaluateCorporateAuthority(request(state({ delegations: [later, earlier] })));
  assert.equal(decision.allowed, true);
  assert.ok(decision.evidenceRefs.includes("evidence:delegation:a"));
  assert.ok(!decision.evidenceRefs.includes("evidence:delegation:z"));
});

test("refuses forged roots, cross-group authority, revoked or expired links, amplification, cycles, and wrong delegators", () => {
  const valid = state();
  const expired = delegation("delegation:bot", "actor:bot", "actor:treasurer", "office:treasurer", { effectiveUntil: "2026-09-01T00:00:00.000Z" });
  const cases = [
    request({ ...valid, rootIssuerId: "issuer:forged" }), request({ ...valid, rootOfficeId: "office:forged" }), request({ ...valid, rootAuthorizedGroups: ["group:two"] }), request(valid, { groupId: "group:two" }),
    request({ ...valid, delegations: [{ ...valid.delegations[0], standing: "revoked" }] }), request({ ...valid, memberships: valid.memberships.map((item) => item.actorId === "actor:treasurer" ? { ...item, standing: "revoked" } : item) }), request({ ...valid, delegations: [expired] }),
    request({ ...valid, delegations: [{ ...valid.delegations[0], resources: ["account:one", "account:two"] }] }), request({ ...valid, delegations: [{ ...valid.delegations[0], effectiveFrom: "2025-01-01T00:00:00.000Z" }] }), request({ ...valid, delegations: [{ ...valid.delegations[0], parentId: "delegation:bot" }] }), request({ ...valid, delegations: [{ ...valid.delegations[0], fromActorId: "actor:forged" }] }),
  ];
  for (const input of cases) assert.equal(allowed(input), false);
});

test("the registered action applies the same carrier boundary and refusal result", async () => {
  assert.equal((await corporateAuthorityAction.execute(request(state()), {})).allowed, true);
  assert.equal((await corporateAuthorityAction.execute(request({ ...state(), observedAt: "2026-09-06T12:00:00.001Z" }), {})).allowed, false);
  assert.throws(() => corporateAuthorityAction.execute(request({ ...state(), observedAt: "bad-date" }), {}));
  assert.throws(() => corporateAuthorityAction.execute({ kind: "organizing.corporate-authority-request", unexpected: true }, {}));
});

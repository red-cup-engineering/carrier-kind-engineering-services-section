import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { deriveCborNi } from "@red-cup-engineering/cbor-services-section";
import { defaultFilesystemBinding } from "../src/integrations/filesystem/services/read-write.mjs";
import { operation } from "../src/rpc/operation.mjs";
import { admitProviderDelegationAuthoritySource, journalProviderDelegationAuthorizer, journalWorkDischargeReceiverAuthorizer } from "../src/work/provider-delegation-authority.mjs";

const at = "2026-09-09T12:00:00.000Z";
test("journaled Founder and CEO sources authorize only the exact registered read operation", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-provider-authority-"));
  try {
    const binding = defaultFilesystemBinding(root);
    const read = operation({ verb: "fixture-ledger-read", run: () => null });
    const receive = operation({ verb: "work-discharge-admit", run: () => null });
    const grant = (id, actorId, extra = {}) => ({ id, actorId, groupId: "fixture-group", issuerId: "fixture-founder", authorities: [read.ref], resources: ["work-item:fixture-verify"], actions: [read.ref], standing: "verified", effectiveFrom: "2026-09-09T11:59:00.000Z", evidenceRef: `evidence:${id}`, ...extra });
    const source = (id, role, state) => ({ source: { id, role, locator: `fixture:${id}`, content: id, contentIdentity: deriveCborNi({ value: id }).uri }, state });
    const founderReceipt = admitProviderDelegationAuthoritySource(binding, source("founder-source", "founder-appointment", { revision: "fixture-revision", rootIssuerId: "fixture-founder", rootOfficeId: "root-office", rootAuthorizedGroups: ["fixture-group"], memberships: [{ id: "member-ceo", actorId: "fixture-ceo", groupId: "fixture-group", standing: "verified", effectiveFrom: "2026-09-09T11:59:00.000Z", evidenceRef: "evidence:member-ceo" }, { id: "member-provider", actorId: "fixture-provider", groupId: "fixture-group", standing: "verified", effectiveFrom: "2026-09-09T11:59:00.000Z", evidenceRef: "evidence:member-provider" }, { id: "member-receiver", actorId: "fixture-receiver", groupId: "fixture-group", standing: "verified", effectiveFrom: "2026-09-09T11:59:00.000Z", evidenceRef: "evidence:member-receiver" }], office: grant("root-office", "fixture-ceo", { authorities: [read.ref, receive.ref], actions: [read.ref, receive.ref] }) }), at);
    const delegationReceipt = admitProviderDelegationAuthoritySource(binding, source("ceo-decision", "ceo-provider-delegation", { revision: "fixture-revision", rootIssuerId: "fixture-founder", rootOfficeId: "root-office", rootAuthorizedGroups: ["fixture-group"], memberships: [], office: grant("unused-office", "fixture-ceo"), delegation: grant("provider-grant", "fixture-provider", { parentId: "root-office", fromActorId: "fixture-ceo" }) }), at);
    const forgedReceipt = admitProviderDelegationAuthoritySource(binding, source("forged-later-ceo-decision", "ceo-provider-delegation", { revision: "fixture-revision", rootIssuerId: "fixture-founder", rootOfficeId: "root-office", rootAuthorizedGroups: ["fixture-group"], memberships: [], office: grant("unused-office", "fixture-ceo"), delegation: grant("forged-grant", "forged-provider", { parentId: "root-office", fromActorId: "fixture-ceo" }) }), at);
    const authorize = journalProviderDelegationAuthorizer(binding, { rootReceipt: founderReceipt, delegationReceipts: [delegationReceipt] });
    assert.equal(authorize({ holder: "fixture-ceo", provider: "fixture-provider", scope: "work-item:fixture-verify", operations: [read.ref], effects: ["host-read"], authority: "provider-grant", at }).authority, "provider-grant");
    assert.throws(() => authorize({ holder: "fixture-ceo", provider: "fixture-provider", scope: "work-item:other", operations: [read.ref], effects: ["host-read"], authority: "provider-grant", at }), /refused/u);
    assert.throws(() => authorize({ holder: "fixture-ceo", provider: "forged-provider", scope: "work-item:fixture-verify", operations: [read.ref], effects: ["host-read"], authority: "forged-grant", at }), /no matching CEO bounded grant/u);
    const receiverReceipt = admitProviderDelegationAuthoritySource(binding, source("ceo-receiver-delegation", "ceo-provider-delegation", { revision: "fixture-revision", rootIssuerId: "fixture-founder", rootOfficeId: "root-office", rootAuthorizedGroups: ["fixture-group"], memberships: [{ id: "member-receiver", actorId: "fixture-receiver", groupId: "fixture-group", standing: "verified", effectiveFrom: "2026-09-09T11:59:00.000Z", evidenceRef: "evidence:member-receiver" }], office: grant("unused-office", "fixture-ceo"), delegation: grant("receiver-grant", "fixture-receiver", { parentId: "root-office", fromActorId: "fixture-ceo", authorities: [receive.ref], actions: [receive.ref] }) }), at);
    const authorizeReceiver = journalWorkDischargeReceiverAuthorizer(binding, { rootReceipt: founderReceipt, delegationReceipts: [receiverReceipt] });
    const decision = authorizeReceiver({ receiver: "fixture-receiver", scope: "work-item:fixture-verify", operation: receive.ref, at }).evaluation;
    assert.equal(decision.allowed, true);
    assert.throws(() => authorizeReceiver({ receiver: "fixture-receiver", scope: "work-item:other", operation: receive.ref, at }), /not authorized/u);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

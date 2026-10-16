import assert from "node:assert/strict";
import test from "node:test";
import { delegate, invoke } from "@ucanto/core";
import { ed25519 } from "@ucanto/principal";
import {
  EMPTY_WITNESS_ROOT,
  identifyJsonSemanticContent,
} from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/semantic-content-identity";
import { verifyUcanInvocation } from "../src/index.mjs";

const ACCOUNT = "0x1111111111111111111111111111111111111111";
const RESOURCE = `did:pkh:eip155:5615610:${ACCOUNT}`;
const CAPABILITY = Object.freeze({
  with: RESOURCE,
  can: "semiotic-exchange/settle-demand",
  nb: Object.freeze({ demand: `0x${"22".repeat(32)}` }),
});
const OBJECT_KIND = "animating.ucan-semantic-material";

function legacyIdentityFixture(value) {
  return identifyJsonSemanticContent({
    objectKind: OBJECT_KIND,
    value,
    witnessRoot: EMPTY_WITNESS_ROOT,
  }).token;
}

async function fixture(capability = CAPABILITY) {
  const controller = await ed25519.generate();
  const actor = await ed25519.generate();
  const executor = await ed25519.generate();
  const now = Math.floor(Date.now() / 1000);
  const delegation = await delegate({
    issuer: controller,
    audience: actor,
    capabilities: [capability],
    notBefore: now - 1,
    expiration: now + 300,
    nonce: "delegation-1",
  });
  const invocation = await invoke({
    issuer: actor,
    audience: executor,
    capability,
    proofs: [delegation],
    notBefore: now - 1,
    expiration: now + 60,
    nonce: "invocation-1",
  }).delegate();
  return { controller, actor, executor, delegation, invocation };
}

test("official ucanto proof DAG emits one v2-identified invocation verification receipt", async () => {
  const value = await fixture();
  const receipt = await verifyUcanInvocation({
    invocation: value.invocation,
    authority: value.executor,
    controller: value.controller.did(),
    actor: value.actor.did(),
    capability: CAPABILITY,
    isRevoked: async () => false,
  });
  assert.equal(receipt.type, "UcanInvocationVerificationReceipt");
  assert.equal(receipt.protocol, "UCAN");
  assert.equal(receipt.ucanVersion, "0.9.1");
  assert.equal(receipt.disposition, "authorized");
  assert.equal(receipt.revocationStatus, "active");
  assert.equal(receipt.controller, value.controller.did());
  assert.equal(receipt.actor, value.actor.did());
  assert.equal(receipt.audience, value.executor.did());
  assert.equal(receipt.delegationCid, value.delegation.cid.toString());
  assert.equal(receipt.invocationCid, value.invocation.cid.toString());
  assert.deepEqual(receipt.proofChain, [value.delegation.cid.toString(), value.invocation.cid.toString()]);
  assert.match(receipt.id, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/u);
  assert.match(receipt.capabilityNi, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/u);
});

test("legacy UCAN material identity is preserved through the v2 JSON identity boundary", async () => {
  const value = await fixture();
  const receipt = await verifyUcanInvocation({
    invocation: value.invocation,
    authority: value.executor,
    controller: value.controller.did(),
    actor: value.actor.did(),
    capability: CAPABILITY,
    isRevoked: async () => false,
  });
  assert.equal(receipt.capabilityNi, legacyIdentityFixture(CAPABILITY));
  const receiptBody = { ...receipt };
  delete receiptBody.id;
  assert.equal(receipt.id, legacyIdentityFixture(receiptBody));
});

test("revoked proof cannot produce an authorized receipt", async () => {
  const value = await fixture();
  await assert.rejects(() => verifyUcanInvocation({
    invocation: value.invocation,
    authority: value.executor,
    controller: value.controller.did(),
    actor: value.actor.did(),
    capability: CAPABILITY,
    isRevoked: async (cid) => cid === value.delegation.cid.toString(),
  }), /revoked/u);
});

test("capability widening and displaced actor are refused", async () => {
  const value = await fixture();
  await assert.rejects(() => verifyUcanInvocation({
    invocation: value.invocation,
    authority: value.executor,
    controller: value.controller.did(),
    actor: value.actor.did(),
    capability: { ...CAPABILITY, can: "semiotic-exchange/raise-demand" },
    isRevoked: async () => false,
  }), /unauthorized/u);
  const stranger = await ed25519.generate();
  await assert.rejects(() => verifyUcanInvocation({
    invocation: value.invocation,
    authority: value.executor,
    controller: value.controller.did(),
    actor: stranger.did(),
    capability: CAPABILITY,
    isRevoked: async () => false,
  }), /issuer differs/u);
});

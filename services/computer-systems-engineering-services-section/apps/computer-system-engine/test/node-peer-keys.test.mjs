import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import { signRequest } from "@red-cup-engineering/http-services-section/message-signatures";
import { systemNode, systemNodeDeclaredPeerKeys, systemSettlementPeering } from "@red-cup-engineering/computer-system-engine/rpc/node";

// Lenticule swarm theory (predicated-agentic-orchestration-platform): a PeerRecord holds the peer's
// signing key, and a known-intermittent peer's absence reads unknown (⊥), never refused (f).

const COLONY = "https://soft-grass-pebble.example";
const HUB = "https://cold-red-gate.example";
const pair = () => generateKeyPairSync("ed25519");
const pem = (key) => key.export({ type: "spki", format: "pem" });
const hub = systemNode({ id: "cold-red-gate", origin: HUB, peers: [COLONY] });
const signed = (privateKey, body = "{\"date\":\"2026-10-10\"}") => ({
  method: "POST", path: "/settlement/heads", body,
  headers: signRequest({ method: "POST", path: "/settlement/heads", body, keyId: COLONY, privateKey }),
});
const away = async () => { throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNREFUSED" } }); };
const advertising = (key) => async (url) => {
  assert.equal(url, `${COLONY}/.well-known/system-node`);
  return new Response(JSON.stringify(systemNode({ id: "soft-grass-pebble", origin: COLONY, key: pem(key) })), { status: 200 });
};

test("a peer verifies a known-intermittent colony against its declared key without dialing it", async () => {
  const colony = pair();
  let dialed = 0;
  const fetcher = async (...args) => { dialed += 1; return away(...args); };
  const declaredKeys = systemNodeDeclaredPeerKeys({ SYSTEM_NODE_PEER_KEYS: JSON.stringify({ [COLONY]: pem(colony.publicKey) }) }, hub);
  const peering = systemSettlementPeering(hub, pair().privateKey, fetcher, { declaredKeys });
  const verdict = await peering.verify(signed(colony.privateKey));
  assert.deepEqual({ ...verdict }, { ok: true, keyId: COLONY });
  assert.equal(dialed, 0, "a declared key is used as held: the away colony is never dialed");
});

test("a declared key refuses a request signed by any other key, and nothing is fetched", async () => {
  const colony = pair();
  let dialed = 0;
  const declaredKeys = systemNodeDeclaredPeerKeys({ SYSTEM_NODE_PEER_KEYS: JSON.stringify({ [COLONY]: pem(colony.publicKey) }) }, hub);
  const peering = systemSettlementPeering(hub, pair().privateKey, async () => { dialed += 1; throw new Error("unreachable"); }, { declaredKeys });
  const verdict = await peering.verify(signed(pair().privateKey));
  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, "signature does not verify");
  assert.equal(dialed, 0);
});

test("a peer that was away at the first check is verified once it is back: absence is not kept as refusal", async () => {
  const colony = pair();
  let present = false;
  const fetcher = async (url, init) => (present ? advertising(colony.publicKey)(url, init) : away());
  const peering = systemSettlementPeering(hub, pair().privateKey, fetcher);
  const whileAway = await peering.verify(signed(colony.privateKey));
  assert.equal(whileAway.ok, false, "while away the signer is unknown");
  assert.match(whileAway.reason, /unknown signer/u);
  present = true;
  const whenBack = await peering.verify(signed(colony.privateKey));
  assert.deepEqual({ ...whenBack }, { ok: true, keyId: COLONY });
});

test("a successful discovery is kept: the peer is dialed once", async () => {
  const colony = pair();
  let dialed = 0;
  const fetcher = async (url, init) => { dialed += 1; return advertising(colony.publicKey)(url, init); };
  const peering = systemSettlementPeering(hub, pair().privateKey, fetcher);
  assert.equal((await peering.verify(signed(colony.privateKey))).ok, true);
  assert.equal((await peering.verify(signed(colony.privateKey))).ok, true);
  assert.equal(dialed, 1);
});

test("declared peer keys name only configured peers and only Ed25519 keys", () => {
  assert.equal(systemNodeDeclaredPeerKeys({}, hub).size, 0);
  assert.throws(() => systemNodeDeclaredPeerKeys({ SYSTEM_NODE_PEER_KEYS: JSON.stringify({ "https://stranger.example": pem(pair().publicKey) }) }, hub), /unconfigured peer/u);
  const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 }).publicKey;
  assert.throws(() => systemNodeDeclaredPeerKeys({ SYSTEM_NODE_PEER_KEYS: JSON.stringify({ [COLONY]: pem(rsa) }) }, hub), /Ed25519/u);
  assert.throws(() => systemNodeDeclaredPeerKeys({ SYSTEM_NODE_PEER_KEYS: JSON.stringify({ [COLONY]: 7 }) }, hub), /PEM string/u);
});

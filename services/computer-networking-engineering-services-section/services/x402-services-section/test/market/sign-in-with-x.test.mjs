import assert from "node:assert/strict";
import test from "node:test";

import { createSIWxMessage, verifySIWxSignature } from "@x402/extensions/sign-in-with-x";
import { generateAccount, signMessage } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/evm";

import { admitAccessGrants } from "../../src/market/access-grants.mjs";
import { createMarket } from "../../src/market/market.mjs";
import { decodeSignInHeader, encodeSignInHeader, formatSignInMessage, SIGN_IN_WITH_X, signInChallenge, verifySignIn } from "../../src/sign-in-with-x.mjs";

const SECRET = "a-deployment-secret-of-enough-length";
const ORIGIN = "https://market.test";
const NETWORK = "eip155:84532";
const T0 = Date.parse("2026-09-27T12:00:00.000Z");
const at = (ms) => () => T0 + ms;

// What a wallet does with a challenge: sign the EIP-4361 text for its address.
function signIn(challenge, account, overrides = {}) {
  const info = { ...challenge.info, chainId: challenge.supportedChains[0].chainId, ...overrides };
  const message = formatSignInMessage(info, account.address);
  return { ...info, address: account.address, type: "eip191", signature: signMessage(message, account.privateKey).signature };
}

test("the sign-in text is byte for byte what the official x402 implementation asks a wallet to sign", () => {
  const { address } = generateAccount();
  const challenge = signInChallenge({ secret: SECRET, origin: ORIGIN, url: "https://market.test/v1/demo?x=1", network: NETWORK, statement: "Sign in to use your grants.", now: at(0) });
  for (const info of [challenge.info, { ...challenge.info, statement: undefined }, { ...challenge.info, resources: undefined, expirationTime: undefined }]) {
    const withChain = { ...info, chainId: NETWORK };
    assert.equal(formatSignInMessage(withChain, address), createSIWxMessage(withChain, address));
  }
  assert.match(challenge.info.nonce, /^[0-9a-f]{32}$/u);
  assert.equal(challenge.info.domain, "market.test");
  assert.equal(challenge.info.uri, "https://market.test/v1/demo?x=1");
});

test("a house-signed proof verifies here and under the official verifier, and names a CAIP-10 account", async () => {
  const account = generateAccount();
  const url = "https://market.test/v1/demo";
  const payload = signIn(signInChallenge({ secret: SECRET, origin: ORIGIN, url, network: NETWORK, now: at(0) }), account);
  const decoded = decodeSignInHeader(encodeSignInHeader(payload));
  const proof = await verifySignIn(decoded, { secret: SECRET, origin: ORIGIN, url, now: at(60_000) });
  assert.deepEqual({ ...proof }, { verified: true, account: `${NETWORK}:${account.address}`, address: account.address });
  const official = await verifySIWxSignature(decoded);
  assert.equal(official.isValid, true, official.invalidMessage);
});

test("a proof is refused for another resource, after its window, with a nonce this deployment did not issue, or signed by someone else", async () => {
  const account = generateAccount();
  const url = "https://market.test/v1/demo";
  const challenge = signInChallenge({ secret: SECRET, origin: ORIGIN, url, network: NETWORK, now: at(0) });
  const payload = signIn(challenge, account);
  const check = (candidate, options = {}) => verifySignIn(candidate, { secret: SECRET, origin: ORIGIN, url, now: at(1000), ...options });
  assert.equal((await check(payload, { url: "https://market.test/v1/other" })).reason, "uri-mismatch");
  assert.equal((await check(payload, { now: at(6 * 60_000) })).reason, "outside-window");
  assert.equal((await check(payload, { secret: "another-deployment-secret-entirely" })).reason, "unknown-challenge");
  assert.equal((await check(payload, { origin: "https://elsewhere.test" })).reason, "domain-mismatch");
  const stranger = generateAccount();
  const forged = { ...payload, address: stranger.address };
  assert.equal((await check(forged)).reason, "bad-signature");
  const contract = await check(forged, { verifyContractSignature: async ({ address, digest }) => address === stranger.address && /^0x[0-9a-f]{64}$/u.test(digest) });
  assert.equal(contract.account, `${NETWORK}:${stranger.address}`);
});

test("grants name wallets on a chain or on every EVM chain, cover named operations or all, and lapse", () => {
  const grants = admitAccessGrants({ type: "MarketAccessGrants", version: 1, grants: [
    { account: "eip155:8453:0x00000000000000000000000000000000000000Aa", operations: ["read-demo"], note: "A reviewer.", grantedBy: "founder", grantedAt: "2026-09-27", until: "2026-10-31" },
    { account: "0x00000000000000000000000000000000000000Bb", operations: ["*"], note: "A collaborator.", grantedBy: "founder", grantedAt: "2026-09-27" },
  ] }, { operations: ["read-demo", "look-up-other"] });
  const now = Date.parse("2026-10-01");
  assert.ok(grants.grantFor("eip155:8453:0x00000000000000000000000000000000000000aa", "read-demo", now));
  assert.equal(grants.grantFor("eip155:1:0x00000000000000000000000000000000000000aa", "read-demo", now), null);
  assert.equal(grants.grantFor("eip155:8453:0x00000000000000000000000000000000000000aa", "look-up-other", now), null);
  assert.equal(grants.grantFor("eip155:8453:0x00000000000000000000000000000000000000aa", "read-demo", Date.parse("2026-11-01")), null);
  assert.ok(grants.grantFor("eip155:1:0x00000000000000000000000000000000000000bb", "look-up-other", now));
  assert.throws(() => admitAccessGrants({ type: "MarketAccessGrants", version: 1, grants: [{ account: "0xAb", operations: ["read-demo"], note: "x", grantedBy: "f", grantedAt: "2026-09-27" }] }, { operations: ["read-demo"] }), /CAIP-10/);
  assert.throws(() => admitAccessGrants({ type: "MarketAccessGrants", version: 1, grants: [{ account: "0x00000000000000000000000000000000000000bb", operations: ["nothing-sold"], note: "x", grantedBy: "f", grantedAt: "2026-09-27" }] }, { operations: ["read-demo"] }), /sells no operation/);
});

test("the market offers sign-in in its 402, serves a granted wallet without payment, and asks everyone else to pay", async () => {
  const granted = generateAccount(); const stranger = generateAccount();
  let computed = 0; const uses = [];
  const market = createMarket({
    catalog: [{
      name: "Demo Reading", gateway: "demo-gateway", gatewayPackageName: "@red-cup-engineering/demo-gateway",
      section: "lib/emsenn/services/561-group/services/engineering-services-section/services/demo-services-section",
      operation: "read-demo", origin: ORIGIN, route: "/v1/demo", method: "GET", price: "$0.02",
      output: { schema: { type: "object" }, example: { value: 1 } },
      framings: [{ key: "default", title: "Demo Reading", description: "One demo reading.", tags: ["demo"], serviceName: "demo-reading" }],
      ledgerAccount: "Income:Sales:X402:Demo-gateway", markets: ["x402-bazaar"],
    }],
    env: { X402_NETWORK: NETWORK, X402_PAY_TO: "0x32886F6F361C1d570255c2762967A2e41D0E9B1a", X402_FACILITATOR: "https://facilitator.invalid" },
    compute: { "/v1/demo": () => { computed += 1; return { value: 1 }; } },
    facilitatorClient: {
      async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }], extensions: [], signers: {} }; },
      async verify() { throw new Error("no payment is made in this test"); },
      async settle() { throw new Error("no payment is made in this test"); },
    },
    now: () => new Date(T0 + 1000).toISOString(),
    access: {
      onGrantUse: (use) => { uses.push(use); },
      secret: SECRET, origin: ORIGIN, statement: "Sign in to use what this wallet has been granted.",
      grants: admitAccessGrants({ type: "MarketAccessGrants", version: 1, grants: [{ account: `${NETWORK}:${granted.address}`, operations: ["read-demo"], note: "A reviewer.", grantedBy: "founder", grantedAt: "2026-09-27" }] }, { operations: ["read-demo"] }),
    },
  });
  const unpaid = await market.fetch(new Request("https://market.test/v1/demo"));
  assert.equal(unpaid.status, 402);
  const required = JSON.parse(Buffer.from(unpaid.headers.get("payment-required"), "base64").toString("utf8"));
  assert.ok(required.accepts.length > 0);
  const challenge = required.extensions[SIGN_IN_WITH_X];
  assert.equal(challenge.info.uri, "https://market.test/v1/demo");
  assert.deepEqual(challenge.supportedChains, [{ chainId: NETWORK, type: "eip191" }]);
  const free = await market.fetch(new Request("https://market.test/v1/demo", { headers: { "sign-in-with-x": encodeSignInHeader(signIn(challenge, granted)) } }));
  assert.equal(free.status, 200);
  assert.equal(free.headers.get("x402-access"), "grant");
  assert.equal(free.headers.get("x402-account"), `${NETWORK}:${granted.address}`);
  assert.deepEqual(await free.json(), { value: 1 });
  const other = await market.fetch(new Request("https://market.test/v1/demo", { headers: { "sign-in-with-x": encodeSignInHeader(signIn(challenge, stranger)) } }));
  assert.equal(other.status, 402);
  assert.equal(computed, 1);
  assert.equal(uses.length, 1);
  assert.equal(uses[0].account, `${NETWORK}:${granted.address}`);
  assert.equal(uses[0].operation, "read-demo");
});

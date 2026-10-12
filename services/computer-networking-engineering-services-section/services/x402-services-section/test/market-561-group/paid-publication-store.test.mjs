import test from "node:test";
import assert from "node:assert/strict";
import { createPaidPublicationStore } from "../../apps/market-561-group/src/paid-publication-store.mjs";

const identity = "a".repeat(64);
const tx = `0x${"b".repeat(64)}`;
const blockHash = `0x${"c".repeat(64)}`;
const authFrom = "0x1111111111111111111111111111111111111111";
const payTo = "0x2222222222222222222222222222222222222222";
const asset = "0x3333333333333333333333333333333333333333";
const nonce = `0x${"d".repeat(64)}`;
const terms = { network: "eip155:8453", asset, amount: "1200", payTo };
const context = {
  identity, requestDigest: "request-digest", credentialDigest: "credential-digest",
  path: "/handbook", method: "GET", requirements: terms,
  payload: { payload: { authorization: {
    from: authFrom, to: payTo, value: "1200", nonce, validAfter: "0", validBefore: "1800003000",
  } } },
};

function memoryBucket() {
  const values = new Map();
  let revision = 0;
  return {
    async get(key) {
      const entry = values.get(key);
      return entry && { etag: entry.etag, json: async () => structuredClone(entry.value) };
    },
    async put(key, body, options = {}) {
      const current = values.get(key);
      const condition = options.onlyIf ?? {};
      if (condition.etagDoesNotMatch === "*" && current) return null;
      if (condition.etagMatches && condition.etagMatches !== current?.etag) return null;
      const value = JSON.parse(body);
      const etag = `etag-${++revision}`;
      values.set(key, { value, etag });
      return { etag };
    },
  };
}

function receiptLogs({ recipient = payTo, logNonce = nonce } = {}) {
  const topicAddress = (value) => `0x${value.slice(2).toLowerCase().padStart(64, "0")}`;
  return [
    { removed: false, address: asset, topics: ["0x98de503528ee59b575ef0c0a2576a82497bfc029a5685b209e9ec333479b10a5", topicAddress(authFrom), logNonce], data: "0x" },
    { removed: false, address: asset, topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", topicAddress(authFrom), topicAddress(recipient)], data: "0x4b0" },
  ];
}

function rpcFor({ recipient, logNonce, logsEmpty = false } = {}) {
  return async (_url, init) => {
    const { method, params } = JSON.parse(init.body);
    let result;
    if (method === "eth_chainId") result = "0x2105";
    else if (method === "eth_blockNumber") result = "0x100";
    else if (method === "eth_getLogs") result = logsEmpty ? [] : [{
      removed: false, address: asset, blockNumber: "0x80", blockHash, transactionHash: tx,
      topics: ["0x98de503528ee59b575ef0c0a2576a82497bfc029a5685b209e9ec333479b10a5", `0x${authFrom.slice(2).padStart(64, "0")}`, logNonce ?? nonce],
    }];
    else if (method === "eth_getTransactionReceipt") result = { status: "0x1", blockHash, transactionHash: tx, logs: receiptLogs({ recipient, logNonce }) };
    else if (method === "eth_getBlockByNumber") result = params[0] === "finalized"
      ? { number: "0x100", timestamp: "0x70000000" }
      : { number: params[0], timestamp: "0x70000000" };
    else throw new Error(`Unexpected RPC method ${method}`);
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), { status: 200 });
  };
}

function makeStore({ bucket = memoryBucket(), fetchImpl = rpcFor(), now = () => 1_800_000_000_000, afterSettle } = {}) {
  return { bucket, store: createPaidPublicationStore({ MARKET_SETTLEMENTS: bucket }, { fetchImpl, now, afterSettle }) };
}

test("atomic claim admits one worker; a concurrent same-authorization claim cannot compute twice", async () => {
  const { store } = makeStore();
  const [first, second] = await Promise.all([store.claim(context), store.claim(context)]);
  assert.equal([first, second].filter((result) => result.claimed).length, 1);
  assert.equal([first, second].filter((result) => result.pending).length, 1);
  assert.ok(first.claim || second.claim);
  assert.deepEqual(await store.recover(context), { state: "pending" });
});

test("same payment identity with a different request or credential is a conflict", async () => {
  const { store } = makeStore();
  await store.claim(context);
  assert.equal((await store.claim({ ...context, requestDigest: "other-request" })).state, "conflict");
  assert.deepEqual(await store.recover({ ...context, credentialDigest: "other-credential" }), { state: "conflict" });
});

test("conditional state transitions reject a losing worker", async () => {
  const { store } = makeStore();
  const { claim } = await store.claim(context);
  const prepared = await store.prepare({ claim, response: new Response("publication", { headers: { "content-type": "text/plain" } }) });
  await assert.rejects(store.prepare({ claim, response: new Response("other") }), /superseded/);
  await assert.rejects(store.finalize({ claim, settlementResponse: { headers: { "payment-response": Buffer.from(JSON.stringify({ success: true, network: terms.network, transaction: tx, payer: authFrom })).toString("base64") } } }), /changed while recording settlement/);
  const recovered = await store.recover(context);
  assert.equal(recovered.state, "complete");
  assert.equal(await recovered.response.text(), "publication");
  assert.equal(prepared.state, "prepared");
});

test("failed durable prepare leaves no settled response and is safely retryable", async () => {
  let rpcCalls = 0;
  const { store } = makeStore({ fetchImpl: async () => { rpcCalls++; throw new Error("RPC unavailable"); } });
  const { claim } = await store.claim(context);
  await assert.rejects(store.prepare({ claim, response: new Response("publication") }), /recovery window/);
  assert.equal(rpcCalls, 2);
  assert.deepEqual(await store.recover(context), { state: "pending" });
  await store.release({ claim });
  assert.deepEqual(await store.recover(context), { state: "absent" });
  assert.equal((await store.claim(context)).claimed, true);
});

test("prepared response recovers only after two providers corroborate exact nonce, transfer, and receipt", async () => {
  const witnesses = [];
  const { store } = makeStore({ afterSettle: async (entry) => witnesses.push(entry) });
  const { claim } = await store.claim(context);
  await store.prepare({ claim, response: new Response("paid handbook", { status: 200, headers: { "content-type": "text/plain" } }) });
  const result = await store.recover(context);
  assert.equal(result.state, "complete");
  assert.equal(await result.response.text(), "paid handbook");
  const repeated = await store.recover(context);
  assert.equal(repeated.state, "complete");
  assert.equal(await repeated.response.text(), "paid handbook");
  assert.equal(witnesses.length, 2);
  assert.equal(witnesses[0].result.transaction, tx);
  assert.deepEqual(witnesses[1].result, witnesses[0].result);
});

test("completed response retries the saved seller witness while remaining available if witness storage fails", async () => {
  const observed = [];
  let attempts = 0;
  const { store } = makeStore({ afterSettle: async (entry) => {
    attempts += 1;
    observed.push(entry.result);
    if (attempts === 1) throw new Error("witness bucket unavailable");
  } });
  const { claim } = await store.claim(context);
  const prepared = await store.prepare({ claim, response: new Response("paid publication") });
  const settlement = { success: true, network: terms.network, transaction: tx, payer: authFrom };
  const settlementResponse = { headers: { "payment-response": Buffer.from(JSON.stringify(settlement)).toString("base64") } };
  await assert.rejects(store.finalize({ claim: prepared, settlementResponse }), /witness bucket unavailable/);

  const recovered = await store.recover(context);
  assert.equal(recovered.state, "complete");
  assert.equal(await recovered.response.text(), "paid publication");
  assert.equal(attempts, 2);
  assert.deepEqual(observed, [settlement, settlement]);

  const again = await store.recover(context);
  assert.equal(again.state, "complete");
  assert.equal(await again.response.text(), "paid publication");
  assert.equal(attempts, 3);
  assert.deepEqual(observed[2], settlement);
});

test("wrong recipient, wrong nonce, or a failed receipt cannot recover a prepared response", async (t) => {
  for (const scenario of [
    { name: "wrong recipient", fetchImpl: rpcFor({ recipient: authFrom }) },
    { name: "wrong nonce", fetchImpl: rpcFor({ logsEmpty: true }) },
    { name: "no nonce event", fetchImpl: rpcFor({ logsEmpty: true }) },
  ]) {
    await t.test(scenario.name, async () => {
      const { store } = makeStore({ fetchImpl: scenario.fetchImpl });
      const { claim } = await store.claim(context);
      await store.prepare({ claim, response: new Response("secret publication") });
      const recovered = await store.recover(context);
      assert.ok(["pending", "expired"].includes(recovered.state));
    });
  }
});

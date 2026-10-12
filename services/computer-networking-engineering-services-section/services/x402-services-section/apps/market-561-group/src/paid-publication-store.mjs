// A paid publication is prepared durably before money moves. The private bucket
// also holds the existing seller witnesses; no customer request body or usable
// payment signature is stored. R2 conditional writes fence concurrent retries.
const AUTHORIZATION_USED = "0x98de503528ee59b575ef0c0a2576a82497bfc029a5685b209e9ec333479b10a5";
const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const RPC_URLS = ["https://mainnet.base.org", "https://base-rpc.publicnode.com"];
const topicAddress = value => `0x${value.slice(2).toLowerCase().padStart(64, "0")}`;
const pending = () => ({ state: "pending" });
const lower = value => String(value ?? "").toLowerCase();

export function createPaidPublicationStore(env, { afterSettle, fetchImpl = fetch, now = Date.now } = {}) {
  const bucket = env.MARKET_SETTLEMENTS;
  function storage() {
    if (!bucket?.get || !bucket?.put) throw new Error("Paid publication recovery storage is unavailable");
    return bucket;
  }
  const key = identity => `purchases/${identity}.json`;
  async function read(identity) {
    const object = await storage().get(key(identity));
    return object ? { ...await object.json(), etag: object.etag } : null;
  }
  async function write(record, etag) {
    const { etag: ignored, ...data } = record;
    const object = await storage().put(key(record.identity), JSON.stringify(data), {
      onlyIf: etag ? { etagMatches: etag } : { etagDoesNotMatch: "*" },
      httpMetadata: { contentType: "application/json" },
    });
    return object ? { ...data, etag: object.etag } : null;
  }
  function matches(record, context) {
    return record.requestDigest === context.requestDigest && record.credentialDigest === context.credentialDigest;
  }
  async function rpc(url, method, params) {
    const response = await fetchImpl(url, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(10000),
    });
    const result = await response.json();
    if (!response.ok || result.error || result.result === undefined) throw new Error("Payment recovery chain observation unavailable");
    return result.result;
  }
  async function blockNumber() {
    for (const url of RPC_URLS) {
      try {
        if (await rpc(url, "eth_chainId", []) !== "0x2105") continue;
        const block = await rpc(url, "eth_blockNumber", []);
        if (/^0x[0-9a-f]+$/iu.test(block)) return block;
      } catch { /* Try the independent public provider before refusing payment. */ }
    }
    throw new Error("Cannot establish the publication settlement recovery window");
  }
  function responseFrom(record) {
    const headers = new Headers(record.response.headers);
    for (const [name, value] of Object.entries(record.settlementHeaders)) headers.set(name, value);
    headers.set("cache-control", "private, no-store");
    headers.set("x-payment-recovered", "true");
    return new Response(Buffer.from(record.response.body, "base64"), { status: record.response.status, headers });
  }
  function settlementResult(record) {
    const encoded = new Headers(record.settlementHeaders).get("payment-response");
    if (!encoded) throw new Error("Completed payment has no settlement receipt");
    return JSON.parse(Buffer.from(encoded, "base64").toString());
  }
  async function witness(record, result) {
    if (!afterSettle) return;
    await afterSettle({
      result, requirements: record.requirements,
      transportContext: { request: { path: record.path, method: record.method } },
    });
  }
  async function finish(record, headers) {
    const encoded = new Headers(headers).get("payment-response");
    if (!encoded) throw new Error("Completed payment has no settlement receipt");
    const result = JSON.parse(Buffer.from(encoded, "base64").toString());
    if (!result.success || result.network !== record.requirements.network || !/^0x[0-9a-f]{64}$/iu.test(result.transaction)
      || lower(result.payer) !== lower(record.authorization.from)) throw new Error("Settlement receipt does not match purchase");
    const saved = await write({ ...record, state: "complete", settlementHeaders: Object.fromEntries(new Headers(headers)), completedAt: new Date(now()).toISOString() }, record.etag);
    if (!saved) {
      const current = await read(record.identity);
      if (current?.state !== "complete" || !matches(current, record)) throw new Error("Purchase changed while recording settlement");
      return current;
    }
    await witness(saved, result);
    return saved;
  }

  // Resolve the only distributed-commit gap: payment was mined, but the worker
  // stopped before saving its receipt. Both providers must corroborate a
  // successful receipt containing this nonce and this exact token transfer.
  async function chainSettlement(record) {
    const { requirements: terms, authorization: auth } = record;
    if (terms.network !== "eip155:8453") return null;
    const observations = [];
    for (const url of RPC_URLS) {
      try {
        if (await rpc(url, "eth_chainId", []) !== "0x2105") return null;
        const head = BigInt(await rpc(url, "eth_blockNumber", []));
        let cursor = BigInt(record.fromBlock);
        // Bound a recovery request. Prepared authorizations are at most one
        // hour long; settlement cannot occur after their expiration. Old
        // retries still inspect the original bounded block window.
        const last = cursor + 2400n < head ? cursor + 2400n : head;
        let found = null;
        while (cursor <= last) {
          const end = cursor + 499n < last ? cursor + 499n : last;
          const logs = await rpc(url, "eth_getLogs", [{
            address: terms.asset, fromBlock: `0x${cursor.toString(16)}`, toBlock: `0x${end.toString(16)}`,
            topics: [AUTHORIZATION_USED, topicAddress(auth.from), auth.nonce],
          }]);
          if (!Array.isArray(logs)) return null;
          found = logs.find(log => log.removed === false && lower(log.address) === lower(terms.asset)
            && log.topics?.length === 3 && lower(log.topics[0]) === AUTHORIZATION_USED
            && lower(log.topics[1]) === topicAddress(auth.from) && lower(log.topics[2]) === lower(auth.nonce));
          if (found) break;
          cursor = end + 1n;
        }
        if (!found) {
          const finalBlock = await rpc(url, "eth_getBlockByNumber", ["finalized", false]);
          const endBlock = await rpc(url, "eth_getBlockByNumber", [`0x${last.toString(16)}`, false]);
          if (BigInt(finalBlock.number) < last || BigInt(endBlock.timestamp) <= BigInt(auth.validBefore)) return null;
          observations.push({ expired: true });
          continue;
        }
        if (head - BigInt(found.blockNumber) < 2n) return null;
        const receipt = await rpc(url, "eth_getTransactionReceipt", [found.transactionHash]);
        if (receipt?.status !== "0x1" || lower(receipt.blockHash) !== lower(found.blockHash)
          || lower(receipt.transactionHash) !== lower(found.transactionHash)) return null;
        const nonce = receipt.logs?.some(log => log.removed === false && lower(log.address) === lower(terms.asset)
          && log.topics?.length === 3 && lower(log.topics[0]) === AUTHORIZATION_USED
          && lower(log.topics[1]) === topicAddress(auth.from) && lower(log.topics[2]) === lower(auth.nonce));
        const transfer = receipt.logs?.some(log => log.removed === false && lower(log.address) === lower(terms.asset)
          && log.topics?.length === 3 && lower(log.topics[0]) === TRANSFER
          && lower(log.topics[1]) === topicAddress(auth.from) && lower(log.topics[2]) === topicAddress(terms.payTo)
          && BigInt(log.data) === BigInt(terms.amount));
        if (!nonce || !transfer) return null;
        observations.push({ transaction: lower(receipt.transactionHash), blockHash: lower(receipt.blockHash) });
      } catch { return null; }
    }
    if (JSON.stringify(observations[0]) !== JSON.stringify(observations[1])) return null;
    if (observations[0].expired) return { expired: true };
    return { success: true, network: terms.network, transaction: observations[0].transaction, payer: auth.from };
  }

  return {
    async recover(context) {
      const record = await read(context.identity);
      if (!record) return { state: "absent" };
      if (!matches(record, context)) return { state: "conflict" };
      if (record.state === "complete") {
        // The response is already committed and must remain deliverable even
        // when evidence recording is temporarily unavailable. Replay the
        // saved receipt to the idempotent witness sink on later exact retries.
        try { await witness(record, settlementResult(record)); } catch { /* Keep the paid publication available. */ }
        return { state: "complete", response: responseFrom(record) };
      }
      if (record.state === "failed" || (record.state === "claimed" && now() - record.claimedAt > 120000)) return { state: "absent" };
      if (record.state === "prepared") {
        const result = await chainSettlement(record);
        if (result?.expired) return { state: "expired" };
        if (result) {
          const saved = await finish(record, { "payment-response": Buffer.from(JSON.stringify(result)).toString("base64") });
          return { state: "complete", response: responseFrom(saved) };
        }
      }
      return pending();
    },
    async claim(context) {
      const prior = await read(context.identity);
      if (prior && !matches(prior, context)) return { claimed: false, state: "conflict" };
      if (prior && prior.state !== "failed" && !(prior.state === "claimed" && now() - prior.claimedAt > 120000)) return { claimed: false, pending: true };
      const payload = context.payload ?? context.paymentPayload;
      const authorization = payload.payload.authorization;
      const requirements = context.requirements ?? context.paymentRequirements;
      // This adapter's chain recovery is the Base EIP-3009 contract, not an
      // unverified recovery promise for arbitrary assets or networks.
      if (requirements.network !== "eip155:8453" || BigInt(authorization.validBefore) > BigInt(Math.floor(now() / 1000) + 3600)) {
        throw new TypeError("Recoverable publications require Base authorization expiring within one hour");
      }
      const record = await write({
        identity: context.identity, requestDigest: context.requestDigest, credentialDigest: context.credentialDigest,
        state: "claimed", claimedAt: now(), requirements,
        authorization: { from: authorization.from, nonce: authorization.nonce, validBefore: authorization.validBefore },
        path: context.path, method: context.method,
      }, prior?.etag);
      return record ? { claimed: true, claim: record } : { claimed: false, pending: true };
    },
    async prepare({ claim, response }) {
      const bytes = response instanceof Response ? Buffer.from(await response.clone().arrayBuffer()) : Buffer.from(response.body);
      if (bytes.length > 16 * 1024 * 1024) throw new Error("Publication exceeds recoverable delivery size");
      const fromBlock = await blockNumber();
      const saved = await write({ ...claim, state: "prepared", fromBlock,
        response: { status: response.status, headers: Object.fromEntries(new Headers(response.headers)), body: bytes.toString("base64") },
      }, claim.etag);
      if (!saved) throw new Error("Purchase claim was superseded before settlement");
      return saved;
    },
    async finalize({ claim, settlementResponse }) { await finish(claim, settlementResponse.headers); },
    async release({ claim }) {
      // Called only before settlement, never after an ambiguous facilitator call.
      await write({ ...claim, state: "failed" }, claim.etag);
    },
  };
}

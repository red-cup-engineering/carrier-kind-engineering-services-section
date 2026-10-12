# verify-hbd-payment
## Requirements
- `two-node-independent-read`: The operation reads the Hive block stream independently from exactly two caller-supplied public node URLs (via `@red-cup-engineering/hive-blockchain-client-service`'s `RpcClient`, one single-node instance per URL so neither read can silently fail over to the other), never merging them before comparison; an optional `fixtureResponses` pair of raw RPC results (or `{error}` records) replaces either node's live call for deterministic offline testing and documentation examples.
- `block-or-history-lookup`: The operation locates the candidate transfer either by an exact `claim.block` (via `condenser_api.get_ops_in_block`) or, when no block is given, by scanning the payee's recent `condenser_api.get_account_history` (bounded by `claim.historyLimit`, default 1000); an optional `claim.transactionId` narrows the match to that exact transaction id instead of matching by memo.
- `verified-outcome`: When both nodes independently report the identical transfer (same `from`, `to`, exact `amount`, `memo`, `block`, and transaction id) matching the requirement's `payTo`, `maxAmountRequired`, `asset`, and `extra.memo`, and its timestamp is at or before `extra.expiresAt`, the operation returns a `verified` status carrying that transfer and the two agreeing node URLs.
- `typed-refusal-outcome`: When verification does not succeed, the operation returns (never throws) a `refused` status naming exactly one reason: `not-found`, `wrong-amount`, `wrong-memo`, `expired`, `nodes-disagree`, or `node-unavailable`.
- `exact-decimal-amount-comparison`: The operation compares the on-chain transfer amount against `requirement.maxAmountRequired` as an exact stripped decimal string (`@red-cup-engineering/computer-ledger-system-services-section`'s `stripUnitSuffix`), never as a parsed float.
## Prohibitions
- `malformed-requirement-refusal`: The operation must refuse (throw `TypeError`) a request whose `requirement.scheme` is not `"hbd-transfer"`, whose `requirement.network` is not `"hive:mainnet"`, or whose `requirement.payTo`, `requirement.maxAmountRequired`, `requirement.asset`, `requirement.extra.memo`, or `requirement.extra.expiresAt` is not a string.
- `malformed-nodes-refusal`: The operation must refuse a request whose `nodes` is not an array of exactly two distinct strings each matching `^https://`.
- `malformed-observed-at-refusal`: The operation must refuse a request whose `observedAt` is not a parseable ISO 8601 UTC timestamp ending in `Z`.
- `no-keys-no-broadcast`: The operation must never hold, read, or use a Hive private key, and must never broadcast a transaction; it only reads public chain state.
- `no-silent-node-merge`: The operation must never let one node's failure or disagreement be silently absorbed by the other; a single-node failure is the typed `node-unavailable` refusal, and a content mismatch between the two nodes is the typed `nodes-disagree` refusal.
## Laws
- `fabricate-do-not-hand-write` | 561 Group working discipline, dispatch-agents skill | 2026-09-04 | .claude/skills/dispatch-agents/SKILL.md | Applies to this whole operation. | The operation is born through the jsnode fabrication line rather than hand-written.
- `primitives-exist-once` | 561 Group working discipline | 2026-08-30 | CLAUDE.md | Applies to the RPC transport and decimal comparison. | Reuses the house `RpcClient`/`condenser_api` client (`@red-cup-engineering/hive-blockchain-client-service`) and exact-decimal primitive (`@red-cup-engineering/computer-ledger-system-services-section`) rather than hand-rolling a second Hive HTTP client or a float-based amount comparison.
- `no-keys-fence` | commissioning brief, hive-exit-tightness-as-x402 lot | 2026-09-05 | this work order's own commission | Applies to this whole operation. | The commissioning lot is fenced from ever holding keys or sending transfers; this operation is read-only by construction.
## Standards
- `hive-condenser-api-read` | Hive blockchain (graphene) | `condenser_api.get_ops_in_block`, `condenser_api.get_account_history` | https://developers.hive.io/apidefinitions/#condenser_api.get_ops_in_block | Applies to both lookup modes. | Names the exact public JSON-RPC methods used to read the block stream, matching the house `hive-blockchain-client-service`'s own `chain.mjs` (`condenser_api.get_account_history`).
- `x402-payment-required-v1` | x402 protocol | v1 field shape (`PaymentRequirementsV1`) | node_modules/@x402/core (x402-boundary-reference sibling package) | Applies to the `requirement` input shape (the `accepts[]` entry `form-hbd-payment-requirement` produces). | Reads the same fields that operation writes, never inventing a parallel shape.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/verify-hbd-payment-service","packageVersion":"0.1.0","license":"MIT","dependencies":{"@red-cup-engineering/hive-blockchain-client-service":"0.1.0","@red-cup-engineering/computer-ledger-system-services-section":"0.2.0"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/verify-hbd-payment.mjs
#!/usr/bin/env node
import { RpcClient } from "@red-cup-engineering/hive-blockchain-client-service/src/rpc.mjs";
import { stripUnitSuffix } from "@red-cup-engineering/computer-ledger-system-services-section/src/decimal.mjs";

const HTTPS_PATTERN = /^https:\/\//u;
const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u;

function fail(message) {
  throw new TypeError(`verify-hbd-payment: ${message}`);
}

function validateRequirement(requirement) {
  if (requirement?.scheme !== "hbd-transfer") fail("requirement.scheme must be hbd-transfer");
  if (requirement?.network !== "hive:mainnet") fail("requirement.network must be hive:mainnet");
  for (const field of ["payTo", "maxAmountRequired", "asset"]) {
    if (typeof requirement[field] !== "string" || requirement[field].length === 0) fail(`requirement.${field} must be a non-empty string`);
  }
  if (typeof requirement?.extra?.memo !== "string" || requirement.extra.memo.length === 0) fail("requirement.extra.memo must be a non-empty string");
  if (typeof requirement?.extra?.expiresAt !== "string" || Number.isNaN(Date.parse(requirement.extra.expiresAt))) fail("requirement.extra.expiresAt must be a parseable timestamp");
}

function validateNodes(nodes) {
  if (!Array.isArray(nodes) || nodes.length !== 2 || nodes[0] === nodes[1] || !nodes.every((n) => typeof n === "string" && HTTPS_PATTERN.test(n))) {
    fail("nodes must be an array of exactly two distinct https:// URLs");
  }
}

function normalizeRows(result, claim) {
  return Number.isInteger(claim.block)
    ? result.map((entry) => ({ op: entry.op, block: entry.block, trxId: entry.trx_id, timestamp: entry.timestamp }))
    : result.map(([, entry]) => ({ op: entry.op, block: entry.block, trxId: entry.trx_id, timestamp: entry.timestamp }));
}

async function getRows(node, requirement, claim, fixture) {
  if (fixture !== undefined) {
    if (fixture !== null && typeof fixture === "object" && !Array.isArray(fixture) && typeof fixture.error === "string") {
      throw new Error(fixture.error);
    }
    return normalizeRows(fixture, claim);
  }
  const rpc = new RpcClient({ nodes: [node] });
  if (Number.isInteger(claim.block)) {
    return normalizeRows(await rpc.call("condenser_api.get_ops_in_block", [claim.block, false]), claim);
  }
  const limit = Number.isInteger(claim.historyLimit) ? claim.historyLimit : 1000;
  return normalizeRows(await rpc.call("condenser_api.get_account_history", [requirement.payTo, -1, limit]), claim);
}

function candidateFromRows(rows, requirement, claim) {
  const candidates = rows.filter((row) => {
    if (row.op[0] !== "transfer" || row.op[1].to !== requirement.payTo) return false;
    return typeof claim.transactionId === "string" ? row.trxId === claim.transactionId : row.op[1].memo === requirement.extra.memo;
  });
  if (candidates.length === 0) return { found: false };
  const chosen = candidates[0];
  const parts = String(chosen.op[1].amount).trim().split(/\s+/u);
  return {
    found: true,
    from: chosen.op[1].from,
    to: chosen.op[1].to,
    amount: stripUnitSuffix(chosen.op[1].amount),
    asset: parts[parts.length - 1],
    memo: chosen.op[1].memo,
    block: chosen.block,
    transactionId: chosen.trxId,
    timestamp: chosen.timestamp,
  };
}

function combine(a, b, requirement, nodes) {
  if (!a.found && !b.found) return { status: "refused", reason: "not-found", detail: "neither node reports a matching transfer" };
  if (a.found !== b.found) return { status: "refused", reason: "nodes-disagree", detail: "one node reports a matching transfer and the other does not" };
  const sameIdentity = a.transactionId === b.transactionId && a.block === b.block && a.timestamp === b.timestamp
    && a.from === b.from && a.to === b.to && a.amount === b.amount && a.memo === b.memo && a.asset === b.asset;
  if (!sameIdentity) return { status: "refused", reason: "nodes-disagree", detail: "the two nodes report different transfer content for the same query" };
  if (a.amount !== requirement.maxAmountRequired || a.asset !== requirement.asset) {
    return { status: "refused", reason: "wrong-amount", detail: `expected ${requirement.maxAmountRequired} ${requirement.asset}, found ${a.amount} ${a.asset}` };
  }
  if (a.memo !== requirement.extra.memo) {
    return { status: "refused", reason: "wrong-memo", detail: "the found transfer's memo does not match the requirement's memo" };
  }
  const transferTime = Date.parse(`${a.timestamp}Z`);
  const expiry = Date.parse(requirement.extra.expiresAt);
  if (Number.isNaN(transferTime)) return { status: "refused", reason: "not-found", detail: "the found transfer carries an unparseable timestamp" };
  if (transferTime > expiry) {
    return { status: "refused", reason: "expired", detail: `transfer at ${a.timestamp}Z is after expiry ${requirement.extra.expiresAt}` };
  }
  return {
    status: "verified",
    transfer: { from: a.from, to: a.to, amount: a.amount, asset: a.asset, memo: a.memo, block: a.block, transactionId: a.transactionId, timestamp: a.timestamp },
    nodesAgreeing: nodes,
  };
}

/**
 * Verifies one buyer-claimed hbd-transfer x402 payment by independently reading two public Hive nodes and requiring both to report one identical transfer matching the requirement's payee, price, asset, memo, and expiry; returns a typed verified or refused outcome and never throws for a domain-level mismatch.
 * @param {object} request A record with `requirement` (one hbd-transfer accepts[] entry), `claim` ({block?, transactionId?, historyLimit?}), `nodes` (exactly two distinct https:// URLs), `observedAt` (an ISO 8601 UTC timestamp), and optional `fixtureResponses` (exactly two raw RPC results, or `{error}` records, replacing either node's live call for deterministic offline testing).
 * @returns {Promise<object>} An HbdPaymentVerification record: type, version, status ("verified" | "refused"), and either `transfer`/`nodesAgreeing` or `reason`/`detail`.
 * @throws {TypeError} When `requirement`, `nodes`, or `observedAt` is missing or malformed.
 */
export async function verifyHbdPayment(request) {
  validateRequirement(request?.requirement);
  validateNodes(request?.nodes);
  if (typeof request?.observedAt !== "string" || !ISO_UTC_PATTERN.test(request.observedAt) || Number.isNaN(Date.parse(request.observedAt))) {
    fail("observedAt must be a parseable ISO 8601 UTC timestamp ending in Z");
  }
  const { requirement, nodes, fixtureResponses } = request;
  const claim = request.claim && typeof request.claim === "object" ? request.claim : {};
  const [fixtureA, fixtureB] = Array.isArray(fixtureResponses) && fixtureResponses.length === 2 ? fixtureResponses : [undefined, undefined];
  const [aResult, bResult] = await Promise.allSettled([
    getRows(nodes[0], requirement, claim, fixtureA),
    getRows(nodes[1], requirement, claim, fixtureB),
  ]);
  const a = aResult.status === "fulfilled" ? candidateFromRows(aResult.value, requirement, claim) : { found: false, error: aResult.reason instanceof Error ? aResult.reason.message : String(aResult.reason) };
  const b = bResult.status === "fulfilled" ? candidateFromRows(bResult.value, requirement, claim) : { found: false, error: bResult.reason instanceof Error ? bResult.reason.message : String(bResult.reason) };
  if (a.error || b.error) {
    return { type: "HbdPaymentVerification", version: 1, status: "refused", reason: "node-unavailable", detail: a.error ?? b.error };
  }
  const outcome = combine(a, b, requirement, nodes);
  return { type: "HbdPaymentVerification", version: 1, ...outcome };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write(
      "verifyHbdPayment — Verifies one buyer-claimed hbd-transfer x402 payment by independently reading two public Hive nodes and requiring both to report one identical transfer matching the requirement's payee, price, asset, memo, and expiry; returns a typed verified or refused outcome and never throws for a domain-level mismatch.\n",
    );
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(await verifyHbdPayment(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/verify-hbd-payment.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { verifyHbdPayment } from "../scripts/verify-hbd-payment.mjs";

const REQUIREMENT = {
  scheme: "hbd-transfer",
  network: "hive:mainnet",
  maxAmountRequired: "0.002",
  resource: "hive-engine-exit-tightness-report",
  payTo: "emsenn0",
  asset: "HBD",
  maxTimeoutSeconds: 900,
  extra: { memo: "the-memo", expiresAt: "2021-03-30T00:00:00.000Z" },
};

const REAL_TRANSFER_ROW = {
  op: ["transfer", { to: "emsenn0", from: "actifit.pay", memo: "the-memo", amount: "0.002 HBD" }],
  block: 52555235,
  trx_id: "3138e2ef6b5881d0752c9512047ab7360a9b9127",
  timestamp: "2021-03-29T09:07:45",
};

const BASE_REQUEST = {
  requirement: REQUIREMENT,
  claim: { block: 52555235, transactionId: "3138e2ef6b5881d0752c9512047ab7360a9b9127" },
  nodes: ["https://fixture-node-a.example", "https://fixture-node-b.example"],
  observedAt: "2021-03-29T10:00:00.000Z",
};

test("verifies when both nodes independently agree on the identical transfer", async () => {
  const verification = await verifyHbdPayment({ ...BASE_REQUEST, fixtureResponses: [[REAL_TRANSFER_ROW], [REAL_TRANSFER_ROW]] });
  assert.equal(verification.status, "verified");
  assert.equal(verification.transfer.from, "actifit.pay");
  assert.equal(verification.transfer.amount, "0.002");
  assert.equal(verification.transfer.transactionId, "3138e2ef6b5881d0752c9512047ab7360a9b9127");
  assert.deepEqual(verification.nodesAgreeing, BASE_REQUEST.nodes);
});

test("looks up by account history when no claim.block is given, matching by memo", async () => {
  const verification = await verifyHbdPayment({ ...BASE_REQUEST, claim: {}, fixtureResponses: [[[1, REAL_TRANSFER_ROW]], [[1, REAL_TRANSFER_ROW]]] });
  assert.equal(verification.status, "verified");
});

test("refuses not-found when neither node reports a matching transfer", async () => {
  const verification = await verifyHbdPayment({ ...BASE_REQUEST, fixtureResponses: [[], []] });
  assert.equal(verification.status, "refused");
  assert.equal(verification.reason, "not-found");
});

test("refuses nodes-disagree when only one node reports the transfer", async () => {
  const verification = await verifyHbdPayment({ ...BASE_REQUEST, fixtureResponses: [[REAL_TRANSFER_ROW], []] });
  assert.equal(verification.status, "refused");
  assert.equal(verification.reason, "nodes-disagree");
});

test("refuses wrong-amount when the found transfer does not match the requirement's price", async () => {
  const row = { ...REAL_TRANSFER_ROW, op: ["transfer", { ...REAL_TRANSFER_ROW.op[1], amount: "0.003 HBD" }] };
  const verification = await verifyHbdPayment({ ...BASE_REQUEST, fixtureResponses: [[row], [row]] });
  assert.equal(verification.status, "refused");
  assert.equal(verification.reason, "wrong-amount");
});

test("refuses wrong-memo when a transactionId-matched transfer carries a different memo", async () => {
  const row = { ...REAL_TRANSFER_ROW, op: ["transfer", { ...REAL_TRANSFER_ROW.op[1], memo: "a-different-memo" }] };
  const verification = await verifyHbdPayment({ ...BASE_REQUEST, fixtureResponses: [[row], [row]] });
  assert.equal(verification.status, "refused");
  assert.equal(verification.reason, "wrong-memo");
});

test("refuses expired when the transfer lands after the requirement's expiry", async () => {
  const expired = { ...REQUIREMENT, extra: { ...REQUIREMENT.extra, expiresAt: "2021-01-01T00:00:00.000Z" } };
  const verification = await verifyHbdPayment({ ...BASE_REQUEST, requirement: expired, fixtureResponses: [[REAL_TRANSFER_ROW], [REAL_TRANSFER_ROW]] });
  assert.equal(verification.status, "refused");
  assert.equal(verification.reason, "expired");
});

test("refuses node-unavailable when one node's fixture reports an error", async () => {
  const verification = await verifyHbdPayment({ ...BASE_REQUEST, fixtureResponses: [[REAL_TRANSFER_ROW], { error: "bad gateway" }] });
  assert.equal(verification.status, "refused");
  assert.equal(verification.reason, "node-unavailable");
});

test("refuses a requirement of the wrong scheme", () => {
  return assert.rejects(verifyHbdPayment({ ...BASE_REQUEST, requirement: { ...REQUIREMENT, scheme: "exact" } }), /requirement\.scheme/u);
});

test("refuses fewer or more than two nodes", () => {
  return assert.rejects(verifyHbdPayment({ ...BASE_REQUEST, nodes: ["https://only-one.example"] }), /nodes/u);
});

test("refuses a malformed observedAt", () => {
  return assert.rejects(verifyHbdPayment({ ...BASE_REQUEST, observedAt: "not-a-date" }), /observedAt/u);
});
```
## Examples
```json name="verifies the real 2021-03-29 actifit.pay to emsenn0 HBD transfer against two matching fixture rows"
{"input":{"requirement":{"scheme":"hbd-transfer","network":"hive:mainnet","maxAmountRequired":"0.002","resource":"hive-engine-exit-tightness-report","payTo":"emsenn0","asset":"HBD","maxTimeoutSeconds":900,"extra":{"memo":"Weekly delegator share payment. Thank you for supporting @actifit :)","expiresAt":"2021-03-30T00:00:00.000Z"}},"claim":{"block":52555235,"transactionId":"3138e2ef6b5881d0752c9512047ab7360a9b9127"},"nodes":["https://api.hive.blog","https://api.openhive.network"],"observedAt":"2021-03-29T10:00:00.000Z","fixtureResponses":[[{"op":["transfer",{"to":"emsenn0","from":"actifit.pay","memo":"Weekly delegator share payment. Thank you for supporting @actifit :)","amount":"0.002 HBD"}],"block":52555235,"trx_id":"3138e2ef6b5881d0752c9512047ab7360a9b9127","timestamp":"2021-03-29T09:07:45"}],[{"op":["transfer",{"to":"emsenn0","from":"actifit.pay","memo":"Weekly delegator share payment. Thank you for supporting @actifit :)","amount":"0.002 HBD"}],"block":52555235,"trx_id":"3138e2ef6b5881d0752c9512047ab7360a9b9127","timestamp":"2021-03-29T09:07:45"}]]},"output":{"type":"HbdPaymentVerification","version":1,"status":"verified","transfer":{"from":"actifit.pay","to":"emsenn0","amount":"0.002","asset":"HBD","memo":"Weekly delegator share payment. Thank you for supporting @actifit :)","block":52555235,"transactionId":"3138e2ef6b5881d0752c9512047ab7360a9b9127","timestamp":"2021-03-29T09:07:45"},"nodesAgreeing":["https://api.hive.blog","https://api.openhive.network"]}}
```
## Traceability
- `two-node-independent-read` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`, `hive-condenser-api-read`
- `block-or-history-lookup` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `hive-condenser-api-read`
- `verified-outcome` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `x402-payment-required-v1`
- `typed-refusal-outcome` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `x402-payment-required-v1`
- `exact-decimal-amount-comparison` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`
- `malformed-requirement-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `x402-payment-required-v1`
- `malformed-nodes-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `hive-condenser-api-read`
- `malformed-observed-at-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `hive-condenser-api-read`
- `no-keys-no-broadcast` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `no-keys-fence`
- `no-silent-node-merge` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `no-keys-fence`

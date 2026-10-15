#!/usr/bin/env node
import { RpcClient } from "@red-cup-engineering/hive-blockchain-client-service/rpc.mjs";
import { stripUnitSuffix } from "@red-cup-engineering/computer-data-engineering-services-section/number/decimal-string";
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-operation-engineering-services-section/operation";

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
  const result = await runJavascriptNodeOperation({ name: "verify-hbd-payment", description: "Verifies one buyer-claimed hbd-transfer x402 payment by independently reading two public Hive nodes and requiring both to report one identical transfer matching the requirement's payee, price, asset, memo, and expiry; returns a typed verified or refused outcome and never throws for a domain-level mismatch.", operation: verifyHbdPayment }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}

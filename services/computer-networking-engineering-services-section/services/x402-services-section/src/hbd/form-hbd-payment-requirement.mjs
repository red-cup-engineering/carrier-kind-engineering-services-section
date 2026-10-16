#!/usr/bin/env node
import { encodeCanonical } from "@red-cup-engineering/cbor-services-section";
import { canonicalCborToNiUri } from "@red-cup-engineering/cbor-services-section";
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-operation-service";

const RESOURCE_ID_PATTERN = /^[a-z][a-z0-9-]{2,63}$/u;
const PRICE_PATTERN = /^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,3})?$/u;
const SELLER_ACCOUNT_PATTERN = /^[a-z][a-z0-9.-]{2,15}$/u;
const MEMO_PREFIX_PATTERN = /^[a-z][a-z0-9-]{0,19}$/u;
const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u;
const MEMO_CARRIER_TYPE = "org.emsenn.x402.hbd-scheme.memo.v1";

function fail(field, message) {
  throw new TypeError(`form-hbd-payment-requirement: ${field} ${message}`);
}

/**
 * Forms one x402 v1 PaymentRequired body for the hbd-transfer scheme on hive:mainnet: a priced resource, its unique content-addressed memo, its explicit expiry, and the stated two-node transfer-verification rule a buyer and a seller both read from the same body.
 * @param {object} request A record with `resource` ({id, price, description?}), `sellerAccount`,
 *   `memoPrefix`, `nonce`, `expirySeconds`, and `requestedAt` (an ISO 8601 UTC timestamp).
 * @returns {object} An X402PaymentRequired record: type, version, x402Version, resourceId, accepts.
 * @throws {TypeError} When any field is missing or malformed; the message names the exact field.
 */
export function formHbdPaymentRequirement(request) {
  const resource = request?.resource;
  if (typeof resource?.id !== "string" || !RESOURCE_ID_PATTERN.test(resource.id)) {
    fail("resource.id", "must match ^[a-z][a-z0-9-]{2,63}$");
  }
  if (typeof resource?.price !== "string" || !PRICE_PATTERN.test(resource.price) || resource.price === "0") {
    fail("resource.price", "must be a canonical positive decimal string with at most 3 fractional digits");
  }
  if (typeof request?.sellerAccount !== "string" || !SELLER_ACCOUNT_PATTERN.test(request.sellerAccount)) {
    fail("sellerAccount", "must match ^[a-z][a-z0-9.-]{2,15}$");
  }
  if (typeof request?.memoPrefix !== "string" || !MEMO_PREFIX_PATTERN.test(request.memoPrefix)) {
    fail("memoPrefix", "must match ^[a-z][a-z0-9-]{0,19}$");
  }
  if (typeof request?.nonce !== "string" || request.nonce.length === 0 || request.nonce.length > 64) {
    fail("nonce", "must be a non-empty string of at most 64 characters");
  }
  if (!Number.isInteger(request?.expirySeconds) || request.expirySeconds < 1 || request.expirySeconds > 86400) {
    fail("expirySeconds", "must be an integer between 1 and 86400 inclusive");
  }
  if (typeof request?.requestedAt !== "string" || !ISO_UTC_PATTERN.test(request.requestedAt) || Number.isNaN(Date.parse(request.requestedAt))) {
    fail("requestedAt", "must be a parseable ISO 8601 UTC timestamp ending in Z");
  }
  const { id: resourceId, price, description } = resource;
  const { sellerAccount, memoPrefix, nonce, expirySeconds, requestedAt } = request;
  const expiresAt = new Date(Date.parse(requestedAt) + expirySeconds * 1000).toISOString();
  const canonical = encodeCanonical({ type: MEMO_CARRIER_TYPE, resourceId, sellerAccount, nonce });
  const memo = `${memoPrefix}:${canonicalCborToNiUri(canonical)}`;
  return {
    type: "X402PaymentRequired",
    version: 1,
    x402Version: 1,
    resourceId,
    accepts: [
      {
        scheme: "hbd-transfer",
        network: "hive:mainnet",
        maxAmountRequired: price,
        resource: resourceId,
        description: typeof description === "string" && description.length > 0 ? description : `x402 hbd-transfer purchase of ${resourceId}`,
        mimeType: "application/json",
        payTo: sellerAccount,
        asset: "HBD",
        maxTimeoutSeconds: expirySeconds,
        extra: {
          memo,
          memoPrefix,
          expiresAt,
          verificationRule: {
            kind: "hive-transfer-with-memo",
            operation: "transfer",
            nodesRequired: 2,
            instructions: `Broadcast one Hive transfer operation to ${sellerAccount} for exactly ${price} HBD, with memo copied exactly as extra.memo, before ${expiresAt}. Settlement reads two independent public Hive nodes and requires both to report one identical transfer (from, to, amount, memo, block, transaction id) before it is accepted.`,
          },
        },
      },
    ],
  };
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "form-hbd-payment-requirement", description: "Forms one x402 v1 PaymentRequired body for the hbd-transfer scheme on hive:mainnet: a priced resource, its unique content-addressed memo, its explicit expiry, and the stated two-node transfer-verification rule a buyer and a seller both read from the same body.", operation: formHbdPaymentRequirement }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}

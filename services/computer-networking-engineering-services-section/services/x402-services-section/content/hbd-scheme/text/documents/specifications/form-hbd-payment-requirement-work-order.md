# form-hbd-payment-requirement
## Requirements
- `x402-payment-required-body`: The operation returns one x402Version 1 PaymentRequired-shaped body carrying exactly one `accepts` entry for the `hbd-transfer` scheme on the `hive:mainnet` network, with `payTo`, `asset: "HBD"`, `maxAmountRequired` equal to the requested resource price, and `resource` equal to the requested resource id.
- `content-addressed-memo`: The operation computes the unique memo the buyer must include by RFC 8949 core-deterministic CBOR encoding of the resource id, seller account, and a caller-supplied nonce (`@red-cup-engineering/cbor-codec-service`), then names it with its RFC 6920 sha-256 `ni:` URI (`@red-cup-engineering/cbor-ni-service`), prefixed by the caller's `memoPrefix`.
- `explicit-expiry`: The operation computes `extra.expiresAt` from the caller-supplied `requestedAt` plus `expirySeconds` and carries both the expiry and `maxTimeoutSeconds` (`expirySeconds`) in the returned requirement.
- `stated-verification-rule`: The returned requirement's `extra.verificationRule` names the exact Hive operation the buyer must broadcast (`transfer`), the count of independent public nodes settlement requires (2), and the fields that must match (`from`, `to`, `amount`, `memo`, `block`, transaction id).
- `pure-computation`: The operation performs no filesystem or network access; it is a deterministic function of its request fields (including the caller-supplied `requestedAt`, never `Date.now()`).
## Prohibitions
- `missing-or-malformed-resource-refusal`: The operation must refuse (throw `TypeError` naming the field) a request whose `resource.id` does not match `^[a-z][a-z0-9-]{2,63}$`, or whose `resource.price` is not a canonical positive decimal string with at most 3 fractional digits.
- `missing-or-malformed-seller-refusal`: The operation must refuse a request whose `sellerAccount` does not match `^[a-z][a-z0-9.-]{2,15}$`.
- `missing-or-malformed-memo-prefix-refusal`: The operation must refuse a request whose `memoPrefix` does not match `^[a-z][a-z0-9-]{0,19}$` (a leading `#` would trigger Hive's encrypted-memo convention, which this scheme never uses).
- `missing-nonce-refusal`: The operation must refuse a request whose `nonce` is not a non-empty string of at most 64 characters.
- `missing-or-malformed-expiry-refusal`: The operation must refuse a request whose `expirySeconds` is not an integer strictly between 0 and 86400 inclusive of neither bound plus one (i.e. `1 <= expirySeconds <= 86400`), or whose `requestedAt` is not a parseable ISO 8601 UTC timestamp ending in `Z`.
- `no-second-scheme-invention`: The operation must never return more than one `accepts` entry or invent a scheme other than `hbd-transfer`.
## Laws
- `fabricate-do-not-hand-write` | 561 Group working discipline, dispatch-agents skill | 2026-09-04 | .claude/skills/dispatch-agents/SKILL.md | Applies to this whole operation. | The operation is born through the jsnode fabrication line rather than hand-written.
- `primitives-exist-once` | 561 Group working discipline | 2026-08-30 | CLAUDE.md | Applies to the memo content-addressing. | Reuses the same canonical-CBOR-then-`ni:`-URI pattern `@red-cup-engineering/x402-settlement-witness-identity` already established for settlement identity, instead of hand-rolling a second content-addressing scheme.
## Standards
- `x402-payment-required-v1` | x402 protocol | v1 field shape (`PaymentRequirementsV1`/`PaymentRequiredV1`) | node_modules/@x402/core (x402-boundary-reference sibling package, `dist/cjs/x402Client-DeWYb6yN.d.ts`) | Applies to the shape of the returned body (`x402Version`, `accepts[]` with `scheme`, `network`, `maxAmountRequired`, `resource`, `description`, `mimeType`, `payTo`, `maxTimeoutSeconds`, `asset`, `extra`). | Names its exact fields rather than inventing new ones; `extra` is the standard's own named extension point for scheme-specific data (here: `memo`, `memoPrefix`, `expiresAt`, `verificationRule`).
- `hive-transfer-operation` | Hive blockchain | graphene `transfer` virtual-machine operation | https://developers.hive.io/tutorials-recipes/transfer-hive-and-hbd-tokens.html | Applies to the `verificationRule.operation` field. | Names the exact broadcastable operation a buyer must use to satisfy this requirement.
- `rfc-6920-named-information` | IETF RFC 6920 | 2013 | https://www.rfc-editor.org/rfc/rfc6920 | Applies to the `ni:` URI form of the computed memo. | The memo is one `ni:///sha-256;<43 base64url chars>` identity, matching the same standard `x402-settlement-witness-identity` already uses.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/form-hbd-payment-requirement-service","packageVersion":"0.1.0","license":"MIT","dependencies":{"@red-cup-engineering/cbor-codec-service":"0.0.3","@red-cup-engineering/cbor-ni-service":"0.0.2"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/form-hbd-payment-requirement.mjs
#!/usr/bin/env node
import { encodeCanonical } from "@red-cup-engineering/cbor-codec-service";
import { canonicalCborToNiUri } from "@red-cup-engineering/cbor-ni-service";

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
  if (process.argv.includes("--help")) {
    process.stdout.write(
      "formHbdPaymentRequirement — Forms one x402 v1 PaymentRequired body for the hbd-transfer scheme on hive:mainnet: a priced resource, its unique content-addressed memo, its explicit expiry, and the stated two-node transfer-verification rule a buyer and a seller both read from the same body.\n",
    );
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(formHbdPaymentRequirement(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/form-hbd-payment-requirement.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { formHbdPaymentRequirement } from "../scripts/form-hbd-payment-requirement.mjs";

const BASE_REQUEST = {
  resource: { id: "hive-engine-exit-tightness-report", price: "0.100" },
  sellerAccount: "emsenn0",
  memoPrefix: "x402",
  nonce: "n-1",
  expirySeconds: 900,
  requestedAt: "2026-09-05T00:00:00.000Z",
};

test("forms one hbd-transfer accepts entry with the exact requested price and resource", () => {
  const body = formHbdPaymentRequirement(BASE_REQUEST);
  assert.equal(body.type, "X402PaymentRequired");
  assert.equal(body.x402Version, 1);
  assert.equal(body.accepts.length, 1);
  const entry = body.accepts[0];
  assert.equal(entry.scheme, "hbd-transfer");
  assert.equal(entry.network, "hive:mainnet");
  assert.equal(entry.maxAmountRequired, "0.100");
  assert.equal(entry.resource, "hive-engine-exit-tightness-report");
  assert.equal(entry.payTo, "emsenn0");
  assert.equal(entry.asset, "HBD");
  assert.equal(entry.maxTimeoutSeconds, 900);
});

test("computes a content-addressed ni: memo prefixed by memoPrefix", () => {
  const entry = formHbdPaymentRequirement(BASE_REQUEST).accepts[0];
  assert.match(entry.extra.memo, /^x402:ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
});

test("is deterministic for identical inputs", () => {
  const a = formHbdPaymentRequirement(BASE_REQUEST).accepts[0].extra.memo;
  const b = formHbdPaymentRequirement(BASE_REQUEST).accepts[0].extra.memo;
  assert.equal(a, b);
});

test("changes the memo when the nonce changes", () => {
  const a = formHbdPaymentRequirement(BASE_REQUEST).accepts[0].extra.memo;
  const b = formHbdPaymentRequirement({ ...BASE_REQUEST, nonce: "n-2" }).accepts[0].extra.memo;
  assert.notEqual(a, b);
});

test("computes expiresAt from requestedAt plus expirySeconds", () => {
  const entry = formHbdPaymentRequirement(BASE_REQUEST).accepts[0];
  assert.equal(entry.extra.expiresAt, "2026-09-05T00:15:00.000Z");
});

test("states the verification rule naming the transfer operation and two required nodes", () => {
  const rule = formHbdPaymentRequirement(BASE_REQUEST).accepts[0].extra.verificationRule;
  assert.equal(rule.kind, "hive-transfer-with-memo");
  assert.equal(rule.operation, "transfer");
  assert.equal(rule.nodesRequired, 2);
});

test("refuses a malformed resource id", () => {
  assert.throws(() => formHbdPaymentRequirement({ ...BASE_REQUEST, resource: { ...BASE_REQUEST.resource, id: "Bad Id" } }), /resource\.id/u);
});

test("refuses a malformed resource price", () => {
  assert.throws(() => formHbdPaymentRequirement({ ...BASE_REQUEST, resource: { ...BASE_REQUEST.resource, price: "0" } }), /resource\.price/u);
  assert.throws(() => formHbdPaymentRequirement({ ...BASE_REQUEST, resource: { ...BASE_REQUEST.resource, price: "0.1000" } }), /resource\.price/u);
});

test("refuses a malformed seller account", () => {
  assert.throws(() => formHbdPaymentRequirement({ ...BASE_REQUEST, sellerAccount: "AB" }), /sellerAccount/u);
});

test("refuses a memo prefix starting with # (Hive encrypted-memo marker)", () => {
  assert.throws(() => formHbdPaymentRequirement({ ...BASE_REQUEST, memoPrefix: "#x402" }), /memoPrefix/u);
});

test("refuses a missing nonce", () => {
  assert.throws(() => formHbdPaymentRequirement({ ...BASE_REQUEST, nonce: "" }), /nonce/u);
});

test("refuses an out-of-range expirySeconds", () => {
  assert.throws(() => formHbdPaymentRequirement({ ...BASE_REQUEST, expirySeconds: 0 }), /expirySeconds/u);
  assert.throws(() => formHbdPaymentRequirement({ ...BASE_REQUEST, expirySeconds: 86401 }), /expirySeconds/u);
});

test("refuses a requestedAt without a trailing Z", () => {
  assert.throws(() => formHbdPaymentRequirement({ ...BASE_REQUEST, requestedAt: "2026-09-05T00:00:00.000" }), /requestedAt/u);
});
```
## Examples
```json name="forms a payment requirement for a 0.100 HBD report"
{"input":{"resource":{"id":"hive-engine-exit-tightness-report","price":"0.100"},"sellerAccount":"emsenn0","memoPrefix":"x402","nonce":"n-1","expirySeconds":900,"requestedAt":"2026-09-05T00:00:00.000Z"},"output":{"type":"X402PaymentRequired","version":1,"x402Version":1,"resourceId":"hive-engine-exit-tightness-report","accepts":[{"scheme":"hbd-transfer","network":"hive:mainnet","maxAmountRequired":"0.100","resource":"hive-engine-exit-tightness-report","description":"x402 hbd-transfer purchase of hive-engine-exit-tightness-report","mimeType":"application/json","payTo":"emsenn0","asset":"HBD","maxTimeoutSeconds":900,"extra":{"memo":"x402:ni:///sha-256;LpCgyBcpZ7vCzsq-SdvVTiCXskr17aW-wUw2l7exPjE","memoPrefix":"x402","expiresAt":"2026-09-05T00:15:00.000Z","verificationRule":{"kind":"hive-transfer-with-memo","operation":"transfer","nodesRequired":2,"instructions":"Broadcast one Hive transfer operation to emsenn0 for exactly 0.100 HBD, with memo copied exactly as extra.memo, before 2026-09-05T00:15:00.000Z. Settlement reads two independent public Hive nodes and requires both to report one identical transfer (from, to, amount, memo, block, transaction id) before it is accepted."}}}]}}
```
## Traceability
- `x402-payment-required-body` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `x402-payment-required-v1`
- `content-addressed-memo` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`, `rfc-6920-named-information`
- `explicit-expiry` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `x402-payment-required-v1`
- `stated-verification-rule` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `hive-transfer-operation`
- `pure-computation` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `fabricate-do-not-hand-write`
- `missing-or-malformed-resource-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `x402-payment-required-v1`
- `missing-or-malformed-seller-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `hive-transfer-operation`
- `missing-or-malformed-memo-prefix-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `hive-transfer-operation`
- `missing-nonce-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `rfc-6920-named-information`
- `missing-or-malformed-expiry-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `x402-payment-required-v1`
- `no-second-scheme-invention` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `x402-payment-required-v1`

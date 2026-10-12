# settle-hbd-purchase
## Requirements
- `witness-row-identity`: The operation computes the settlement's WitnessJournal graph identity by reusing `@red-cup-engineering/x402-settlement-witness-identity`'s `settlementWitnessGraphId({network, transaction})` over the verified transfer's network and transaction id, instead of hand-rolling a second content-addressing scheme.
- `witness-record`: The operation returns one `HbdPurchaseSettlementWitness` record naming the graph id, network, transaction, resource id, seller account, buyer account, exact amount, asset, memo, block, and settlement date.
- `beancount-transaction-text`: The operation returns one Beancount transaction directive (date, narration, and exactly two postings: a debit to `Assets:Hive:HBD:<SellerAccount>` and an equal, opposite credit to `Income:Sales:X402:<ResourceId>`, both in the verified transfer's exact decimal amount and asset) as both structured postings and rendered text; each dynamic account-path component is capitalized on its first character (Beancount requires every account component to begin with a capital letter or digit), while the raw lowercase `sellerAccount`/`resourceId` values are preserved unchanged everywhere else (witness record, narration).
- `exact-decimal-validation`: The operation validates `resource.price` as a canonical decimal string using `@red-cup-engineering/computer-ledger-system-services-section`'s `parseDecimal`, never a hand-rolled regex or a parsed float.
- `pure-computation`: The operation performs no filesystem or network access and never itself writes the settlement to a journal; it is a deterministic function of its request fields, so the caller composes it with the actual journal write.
## Prohibitions
- `unverified-input-refusal`: The operation must refuse (throw `TypeError`) a request whose `verification.status` is not `"verified"`, or whose `verification.transfer` is missing any of `from`, `to`, `amount`, `asset`, `memo`, `block`, `transactionId`, `timestamp`.
- `amount-mismatch-refusal`: The operation must refuse a request whose `resource.price` does not exactly equal `verification.transfer.amount`.
- `seller-mismatch-refusal`: The operation must refuse a request whose `sellerAccount` does not exactly equal `verification.transfer.to`.
- `malformed-resource-or-date-refusal`: The operation must refuse a request whose `resource.id` does not match `^[a-z][a-z0-9-]{2,63}$`, or whose `date` does not match `^\d{4}-\d{2}-\d{2}$`.
- `no-second-ledger-writer`: The operation must never call the semantic record journal or any filesystem API itself; settlement recording is the caller's own effect.
## Laws
- `fabricate-do-not-hand-write` | 561 Group working discipline, dispatch-agents skill | 2026-09-04 | .claude/skills/dispatch-agents/SKILL.md | Applies to this whole operation. | The operation is born through the jsnode fabrication line rather than hand-written.
- `primitives-exist-once` | 561 Group working discipline | 2026-08-30 | CLAUDE.md | Applies to the witness identity and decimal validation. | Reuses `@red-cup-engineering/x402-settlement-witness-identity` and `@red-cup-engineering/computer-ledger-system-services-section` at their current published versions rather than hand-rolling either.
## Standards
- `beancount-double-entry-syntax` | Beancount plain-text accounting | 3.2.3 | https://beancount.github.io/docs/beancount_language_syntax.html | Applies to the rendered `beancount.text` field. | One `<date> * "<narration>"` transaction header followed by two indented postings whose amounts sum to zero, the plain-text double-entry form `bean-check` admits; every account-path component after the fixed root (`Assets`, `Income`, ...) must itself begin with a capital letter or digit, verified empirically against `bean-check` 3.2.3 (a lowercase-leading component is a syntax error, not merely a style preference).
- `x402-payment-required-v1` | x402 protocol | v1 field shape (`PaymentRequirementsV1`) | node_modules/@x402/core (x402-boundary-reference sibling package) | Applies to reading the upstream `verify-hbd-payment` output shape. | Consumes the same `HbdPaymentVerification` shape that operation produces, never inventing a parallel one.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/settle-hbd-purchase-service","packageVersion":"0.1.1","license":"MIT","dependencies":{"@red-cup-engineering/x402-settlement-witness-identity":"0.2.0","@red-cup-engineering/computer-ledger-system-services-section":"0.2.0"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/settle-hbd-purchase.mjs
#!/usr/bin/env node
import { settlementWitnessGraphId } from "@red-cup-engineering/x402-settlement-witness-identity";
import { parseDecimal } from "@red-cup-engineering/computer-ledger-system-services-section/src/decimal.mjs";

const RESOURCE_ID_PATTERN = /^[a-z][a-z0-9-]{2,63}$/u;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const TRANSFER_FIELDS = ["from", "to", "amount", "asset", "memo", "block", "transactionId", "timestamp"];

function fail(message) {
  throw new TypeError(`settle-hbd-purchase: ${message}`);
}

function renderTransaction(date, narration, postings) {
  const lines = [`${date} * "${narration}"`];
  for (const posting of postings) lines.push(`  ${posting.account}  ${posting.amount} ${posting.commodity}`);
  return `${lines.join("\n")}\n`;
}

// Beancount requires every account-path component to begin with a capital letter or digit
// (verified empirically against bean-check 3.2.3); this capitalizes only the first character
// of a dynamic segment (sellerAccount, resourceId) for the account path, leaving hyphens and
// the rest of the value untouched, and leaving the raw lowercase value itself unchanged
// everywhere else in the returned record.
function capitalizeAccountComponent(value) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

/**
 * Settles one verified hbd-transfer x402 payment into a witness record and a Beancount double-entry transaction directive with capitalized account-path components, reusing the house settlement-witness identity and exact-decimal primitives; performs no filesystem or network access itself, leaving the actual journal write to its caller.
 * @param {object} request A record with `verification` (a verified HbdPaymentVerification record), `resource` ({id, price}), `sellerAccount`, and `date` (YYYY-MM-DD).
 * @returns {object} An HbdPurchaseSettlement record: type, version, witnessRecord, beancount ({date, narration, postings, text}).
 * @throws {TypeError} When the verification is not verified, a required transfer field is missing, the price or seller does not match the verified transfer, or `resource.id`/`date` is malformed.
 */
export function settleHbdPurchase(request) {
  const verification = request?.verification;
  if (verification?.status !== "verified") fail("verification.status must be verified");
  const transfer = verification.transfer;
  for (const field of TRANSFER_FIELDS) {
    if (transfer?.[field] === undefined || transfer[field] === null) fail(`verification.transfer.${field} is required`);
  }
  const resource = request?.resource;
  if (typeof resource?.id !== "string" || !RESOURCE_ID_PATTERN.test(resource.id)) fail("resource.id must match ^[a-z][a-z0-9-]{2,63}$");
  parseDecimal(resource?.price ?? fail("resource.price is required"));
  if (resource.price !== transfer.amount) fail("resource.price must exactly equal verification.transfer.amount");
  if (typeof request?.sellerAccount !== "string" || request.sellerAccount !== transfer.to) fail("sellerAccount must exactly equal verification.transfer.to");
  if (typeof request?.date !== "string" || !DATE_PATTERN.test(request.date)) fail("date must match ^\\d{4}-\\d{2}-\\d{2}$");
  const { sellerAccount, date } = request;
  const network = "hive:mainnet";
  const graphId = settlementWitnessGraphId({ network, transaction: transfer.transactionId });
  const assetAccount = `Assets:Hive:HBD:${capitalizeAccountComponent(sellerAccount)}`;
  const incomeAccount = `Income:Sales:X402:${capitalizeAccountComponent(resource.id)}`;
  const narration = `x402 hbd-transfer sale: ${resource.id} to ${transfer.from}`;
  const postings = [
    { account: assetAccount, amount: resource.price, commodity: transfer.asset },
    { account: incomeAccount, amount: `-${resource.price}`, commodity: transfer.asset },
  ];
  return {
    type: "HbdPurchaseSettlement",
    version: 1,
    witnessRecord: {
      type: "HbdPurchaseSettlementWitness",
      version: 1,
      graphId,
      network,
      transaction: transfer.transactionId,
      resourceId: resource.id,
      sellerAccount,
      buyerAccount: transfer.from,
      amount: resource.price,
      asset: transfer.asset,
      memo: transfer.memo,
      block: transfer.block,
      settledAt: date,
    },
    beancount: { date, narration, postings, text: renderTransaction(date, narration, postings) },
  };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write(
      "settleHbdPurchase — Settles one verified hbd-transfer x402 payment into a witness record and a Beancount double-entry transaction directive with capitalized account-path components, reusing the house settlement-witness identity and exact-decimal primitives; performs no filesystem or network access itself, leaving the actual journal write to its caller.\n",
    );
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(settleHbdPurchase(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/settle-hbd-purchase.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { settleHbdPurchase } from "../scripts/settle-hbd-purchase.mjs";

const VERIFIED = {
  type: "HbdPaymentVerification",
  version: 1,
  status: "verified",
  transfer: {
    from: "actifit.pay",
    to: "emsenn0",
    amount: "0.002",
    asset: "HBD",
    memo: "Weekly delegator share payment. Thank you for supporting @actifit :)",
    block: 52555235,
    transactionId: "3138e2ef6b5881d0752c9512047ab7360a9b9127",
    timestamp: "2021-03-29T09:07:45",
  },
  nodesAgreeing: ["https://api.hive.blog", "https://api.openhive.network"],
};

const BASE_REQUEST = {
  verification: VERIFIED,
  resource: { id: "hive-engine-exit-tightness-report", price: "0.002" },
  sellerAccount: "emsenn0",
  date: "2021-03-29",
};

test("computes the settlement witness graph id from the verified network and transaction", () => {
  const settlement = settleHbdPurchase(BASE_REQUEST);
  assert.equal(settlement.witnessRecord.transaction, "3138e2ef6b5881d0752c9512047ab7360a9b9127");
  assert.match(settlement.witnessRecord.graphId, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
});

test("carries the exact resource, seller, buyer, amount, memo, and block into the witness record", () => {
  const settlement = settleHbdPurchase(BASE_REQUEST);
  assert.equal(settlement.witnessRecord.resourceId, "hive-engine-exit-tightness-report");
  assert.equal(settlement.witnessRecord.sellerAccount, "emsenn0");
  assert.equal(settlement.witnessRecord.buyerAccount, "actifit.pay");
  assert.equal(settlement.witnessRecord.amount, "0.002");
  assert.equal(settlement.witnessRecord.memo, VERIFIED.transfer.memo);
  assert.equal(settlement.witnessRecord.block, 52555235);
  assert.equal(settlement.witnessRecord.settledAt, "2021-03-29");
});

test("renders one balanced two-posting Beancount transaction with capitalized account-path components", () => {
  const settlement = settleHbdPurchase(BASE_REQUEST);
  assert.deepEqual(settlement.beancount.postings, [
    { account: "Assets:Hive:HBD:Emsenn0", amount: "0.002", commodity: "HBD" },
    { account: "Income:Sales:X402:Hive-engine-exit-tightness-report", amount: "-0.002", commodity: "HBD" },
  ]);
  assert.equal(
    settlement.beancount.text,
    '2021-03-29 * "x402 hbd-transfer sale: hive-engine-exit-tightness-report to actifit.pay"\n  Assets:Hive:HBD:Emsenn0  0.002 HBD\n  Income:Sales:X402:Hive-engine-exit-tightness-report  -0.002 HBD\n',
  );
});

test("preserves the raw lowercase sellerAccount and resourceId everywhere outside the account path", () => {
  const settlement = settleHbdPurchase(BASE_REQUEST);
  assert.equal(settlement.witnessRecord.sellerAccount, "emsenn0");
  assert.equal(settlement.witnessRecord.resourceId, "hive-engine-exit-tightness-report");
  assert.equal(settlement.beancount.narration, "x402 hbd-transfer sale: hive-engine-exit-tightness-report to actifit.pay");
});

test("refuses an unverified verification", () => {
  assert.throws(() => settleHbdPurchase({ ...BASE_REQUEST, verification: { ...VERIFIED, status: "refused" } }), /verification\.status/u);
});

test("refuses a verification missing a required transfer field", () => {
  const { block, ...rest } = VERIFIED.transfer;
  assert.throws(() => settleHbdPurchase({ ...BASE_REQUEST, verification: { ...VERIFIED, transfer: rest } }), /verification\.transfer\.block/u);
});

test("refuses a resource price that does not match the verified transfer amount", () => {
  assert.throws(() => settleHbdPurchase({ ...BASE_REQUEST, resource: { ...BASE_REQUEST.resource, price: "0.003" } }), /resource\.price/u);
});

test("refuses a seller account that does not match the verified transfer's payee", () => {
  assert.throws(() => settleHbdPurchase({ ...BASE_REQUEST, sellerAccount: "someoneelse" }), /sellerAccount/u);
});

test("refuses a malformed resource id", () => {
  assert.throws(() => settleHbdPurchase({ ...BASE_REQUEST, resource: { ...BASE_REQUEST.resource, id: "Bad Id" } }), /resource\.id/u);
});

test("refuses a malformed date", () => {
  assert.throws(() => settleHbdPurchase({ ...BASE_REQUEST, date: "03/29/2021" }), /date/u);
});
```
## Examples
```json name="settles the real 2021-03-29 actifit.pay to emsenn0 verified transfer"
{"input":{"verification":{"type":"HbdPaymentVerification","version":1,"status":"verified","transfer":{"from":"actifit.pay","to":"emsenn0","amount":"0.002","asset":"HBD","memo":"Weekly delegator share payment. Thank you for supporting @actifit :)","block":52555235,"transactionId":"3138e2ef6b5881d0752c9512047ab7360a9b9127","timestamp":"2021-03-29T09:07:45"},"nodesAgreeing":["https://api.hive.blog","https://api.openhive.network"]},"resource":{"id":"hive-engine-exit-tightness-report","price":"0.002"},"sellerAccount":"emsenn0","date":"2021-03-29"},"output":{"type":"HbdPurchaseSettlement","version":1,"witnessRecord":{"type":"HbdPurchaseSettlementWitness","version":1,"graphId":"ni:///sha-256;PoVMRp8VDUEPKQG6nwMJUO9YUU-Gqy_HxO3ZVFVO6zg","network":"hive:mainnet","transaction":"3138e2ef6b5881d0752c9512047ab7360a9b9127","resourceId":"hive-engine-exit-tightness-report","sellerAccount":"emsenn0","buyerAccount":"actifit.pay","amount":"0.002","asset":"HBD","memo":"Weekly delegator share payment. Thank you for supporting @actifit :)","block":52555235,"settledAt":"2021-03-29"},"beancount":{"date":"2021-03-29","narration":"x402 hbd-transfer sale: hive-engine-exit-tightness-report to actifit.pay","postings":[{"account":"Assets:Hive:HBD:Emsenn0","amount":"0.002","commodity":"HBD"},{"account":"Income:Sales:X402:Hive-engine-exit-tightness-report","amount":"-0.002","commodity":"HBD"}],"text":"2021-03-29 * \"x402 hbd-transfer sale: hive-engine-exit-tightness-report to actifit.pay\"\n  Assets:Hive:HBD:Emsenn0  0.002 HBD\n  Income:Sales:X402:Hive-engine-exit-tightness-report  -0.002 HBD\n"}}}
```
## Traceability
- `witness-row-identity` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`
- `witness-record` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `x402-payment-required-v1`
- `beancount-transaction-text` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `beancount-double-entry-syntax`
- `exact-decimal-validation` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`
- `pure-computation` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `fabricate-do-not-hand-write`
- `unverified-input-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `x402-payment-required-v1`
- `amount-mismatch-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`
- `seller-mismatch-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `x402-payment-required-v1`
- `malformed-resource-or-date-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `beancount-double-entry-syntax`
- `no-second-ledger-writer` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `fabricate-do-not-hand-write`

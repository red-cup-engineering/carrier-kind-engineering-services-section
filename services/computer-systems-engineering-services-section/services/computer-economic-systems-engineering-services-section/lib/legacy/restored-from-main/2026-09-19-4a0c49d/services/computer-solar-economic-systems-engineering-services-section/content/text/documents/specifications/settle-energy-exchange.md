# settle-energy-exchange
## Requirements
- `compose-settlement`: The operation composes `@red-cup-engineering/settle-energy-exchange-record-service`'s own `settleEnergyExchangeRecord` to settle a `record` that does not yet carry `id`/`settlement`; a `record` that already carries both passes through unchanged rather than being re-settled.
- `settled-only-unit`: The operation refuses as data unless the settled record's `settlement.status` is exactly `"settled"`.
- `witnessed-kilowatt-hour-unit`: For a settled `KWH` record with a positive, milli-kWh-representable `quantity` and at least two distinct witness kinds, the operation returns `unit: {commodity: "KWH", quantity, digest, witnesses}`, where `digest` is the record's own `ni:` `id` decoded to its 32-byte digest and `witnesses` is the two agreeing witness sub-records' own digests, in the same byte-identical scheme.
- `contract-call-args`: The operation returns the exact `call: {contract: "WitnessedKilowattHour", function: "mint", args: [recordDigest, witnessADigest, witnessBDigest, milliKwh, to]}` the `unit` licenses, `milliKwh` a decimal string of `quantity` scaled by 1000, and `to` the caller-supplied recipient address, lowercased; it never submits this call.
- `never-a-second-identity`: The record digest is decoded from the record's own `ni:` `id` via `@red-cup-engineering/ni-services-section`'s own `niUriDigestBytes`, never re-hashed; the two witness digests hash the two agreeing witness sub-records with `@red-cup-engineering/canonicalize-json-service` and `@red-cup-engineering/make-ni-uri-service`, the same composition `settleEnergyExchangeRecord` itself uses for the record.
- `declared-tolerance`: An optional `tolerance` decimal string on the request is forwarded to `settleEnergyExchangeRecord` when `record` is not yet settled, never a constant hidden in the operation.
## Prohibitions
- `missing-record-refusal`: The operation must refuse a request whose `record` is not an object.
- `invalid-recipient-refusal`: The operation must refuse a `to` that is not a `0x`-prefixed 40-hex-digit EVM address.
- `malformed-settled-record-refusal`: The operation must refuse an already-settled `record` (carrying both `id` and `settlement`) whose `settlement` is not itself an object.
- `not-kilowatt-hour-refusal`: The operation must refuse as data, never mint, a settled record whose `commodity` is not `"KWH"`.
- `sub-milliwatt-hour-precision-refusal`: The operation must refuse as data, never truncate, a `quantity` carrying more than three decimal digits (finer than the milli-kWh the contract's `uint256` seats).
- `non-positive-quantity-refusal`: The operation must refuse as data, never mint, a `quantity` whose milli-kWh value is zero or negative.
- `insufficient-witness-refusal`: The operation must refuse as data, never mint, a settled record whose `witnesses` do not carry at least two distinct kinds.
- `never-submits`: The operation must never sign, broadcast, or otherwise submit the `call` it returns; the call is data only, submitted downstream by the chain-actuating section that holds that custody.
## Laws
- `admitted-example-face-equivalence` | JSNode operation face-equivalence law | v1 | lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-code-engineering-services-section/services/javascript-engineering-services-section/services/javascript-code-fabrication-services-section/services/javascript-node-code-fabrication-services-section/services/jsnode-package-services-section/README.md | Applies to the shared examples projected to the JSNode import and command faces. | Every admitted example has equivalent import and command outputs under the downstream JSNode face assay.
- `two-witnesses-or-not-settled` | Cistern reconciliation discipline | v1 | lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-economic-systems-engineering-services-section/README.md | Applies to the settlement status the operation reads before it will name a mint call. | Two witnesses or it is not settled, unknown never zero: only a settled record, agreed by two witnesses of different kinds, licenses the witnessed-kilowatt-hour unit.
- `obsmetrologic-function-contract` | Org layering rule 1 | v1 | .claude/rules/org-layering.md | Applies to this operation's seat and its `lib/contracts/settle-energy-exchange.sol`. | Every obsmetrologic function gets its own services section, with `scripts/<function>.mjs` and `lib/contracts/<function>.sol`; the contract belongs in the function's own service.
- `standards-first` | Standards-first data, networking, and deployment (owner-ruled 2026-09-04) | v1 | .claude/rules/org-layering.md | Applies to how the operation computes and reuses content identity. | An operation composes computer-data's own scripts (canonical JSON, `ni:` identity, the energy-exchange-record settlement service) rather than hand-rolling any of them.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation, its import.meta.main guard, and downstream package-birth assays. | The package uses one executable ESM operation source file that is eligible for downstream staged package-birth assays.
- `rfc-6920` | Naming Things with Hashes | RFC 6920 | https://www.rfc-editor.org/rfc/rfc6920 | Applies to the `ni:` URI the operation decodes rather than re-hashes. | The record digest is `niUriDigestBytes` of the record's own `id`; the witness digests are built the same way `settleEnergyExchangeRecord` builds the record's `id`.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/settle-energy-exchange-service","packageVersion":"0.1.0","license":"MIT","dependencies":{"@red-cup-engineering/settle-energy-exchange-record-service":"0.1.0","@red-cup-engineering/canonicalize-json-service":"0.2.0","@red-cup-engineering/make-ni-uri-service":"0.1.0","@red-cup-engineering/ni-services-section":"0.2.0"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/settle-energy-exchange.mjs
#!/usr/bin/env node
import { settleEnergyExchangeRecord } from "@red-cup-engineering/settle-energy-exchange-record-service";
import { canonicalizeJson } from "@red-cup-engineering/canonicalize-json-service";
import { makeNiUriService } from "@red-cup-engineering/make-ni-uri-service";
import { niUriDigestBytes } from "@red-cup-engineering/ni-services-section";

const DECIMAL = /^-?[0-9]+(?:\.[0-9]+)?$/u;
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/u;

function toMilliKwh(quantity) {
  if (typeof quantity !== "string" || !DECIMAL.test(quantity)) throw new TypeError("record.quantity must be a decimal string");
  const negative = quantity.startsWith("-");
  const unsigned = negative ? quantity.slice(1) : quantity;
  const [intPart, fracPart = ""] = unsigned.split(".");
  if (fracPart.length > 3) return null;
  const milli = BigInt(`${intPart}${fracPart.padEnd(3, "0")}`);
  return negative ? -milli : milli;
}

function firstTwoDistinctKindWitnesses(witnesses) {
  const firstByKind = new Map();
  for (const witness of witnesses) {
    if (!firstByKind.has(witness.kind)) firstByKind.set(witness.kind, witness);
  }
  const distinct = [...firstByKind.values()];
  return distinct.length >= 2 ? [distinct[0], distinct[1]] : null;
}

function digestBytes32(uri) {
  return `0x${niUriDigestBytes(uri).toString("hex")}`;
}

function digestWitness(witness) {
  const { text } = canonicalizeJson({ value: witness });
  const { uri } = makeNiUriService({ text });
  return digestBytes32(uri);
}

/**
 * Composes @red-cup-engineering/settle-energy-exchange-record-service's own `settleEnergyExchangeRecord` to settle an EnergyExchangeRecord that does not yet carry `id`/`settlement` (an already-settled record, carrying both, passes through unchanged), refuses as data unless the settlement reaches `status: "settled"`, and otherwise names the exact `WitnessedKilowattHour.mint` call the settled record and its two agreeing witnesses license: the record digest decodes the record's own `ni:` `id` (never a second hash), and the two witness digests hash the two agreeing witness sub-records `settleEnergyExchangeRecord` used to settle it, composing `@red-cup-engineering/canonicalize-json-service` and `@red-cup-engineering/make-ni-uri-service`. Never submits the call itself.
 * @param {{record: object, to: string, tolerance?: string}} request A record with `record` (an EnergyExchangeRecord, settled or not), `to` (the EVM address to credit, `0x` followed by 40 hex digits), and an optional `tolerance` decimal string forwarded to `settleEnergyExchangeRecord` when `record` does not yet carry `id`/`settlement`.
 * @returns {object} `{record, unit: {commodity: "KWH", quantity, digest, witnesses}, call: {contract: "WitnessedKilowattHour", function: "mint", args: [recordDigest, witnessADigest, witnessBDigest, milliKwh, to]}}` once the record is settled in `KWH` with a positive, milli-kWh-representable quantity and at least two distinct witness kinds; otherwise `{refused: true, reason, record, ...}` naming `"not-settled"`, `"not-kilowatt-hour-commodity"`, `"sub-milliwatt-hour-precision"`, `"non-positive-quantity"`, or `"insufficient-distinct-witnesses"`.
 * @throws {TypeError} When `request` or `record` is not an object, an already-settled `record.settlement` is not an object, or `to` is not a `0x`-prefixed 40-hex-digit address.
 */
export function settleEnergyExchange(request) {
  if (request === null || typeof request !== "object" || Array.isArray(request)) throw new TypeError("request must be an object");
  const record = request.record;
  if (record === null || typeof record !== "object" || Array.isArray(record)) throw new TypeError("record is required");
  if (typeof request.to !== "string" || !EVM_ADDRESS.test(request.to)) throw new TypeError("to must be a 0x-prefixed 40-hex-digit EVM address");
  const to = request.to.toLowerCase();

  const alreadySettled = Object.prototype.hasOwnProperty.call(record, "id") && Object.prototype.hasOwnProperty.call(record, "settlement");
  if (alreadySettled && (record.settlement === null || typeof record.settlement !== "object")) {
    throw new TypeError("record.settlement must be an object when record already carries id and settlement");
  }
  const settled = alreadySettled ? record : settleEnergyExchangeRecord({ record, tolerance: request.tolerance });

  if (settled.settlement.status !== "settled") {
    return { refused: true, reason: "not-settled", status: settled.settlement.status, record: settled };
  }
  if (settled.commodity !== "KWH") {
    return { refused: true, reason: "not-kilowatt-hour-commodity", commodity: settled.commodity, record: settled };
  }
  const milliKwh = toMilliKwh(settled.quantity);
  if (milliKwh === null) {
    return { refused: true, reason: "sub-milliwatt-hour-precision", quantity: settled.quantity, record: settled };
  }
  if (milliKwh <= 0n) {
    return { refused: true, reason: "non-positive-quantity", quantity: settled.quantity, record: settled };
  }
  const witnessPair = firstTwoDistinctKindWitnesses(settled.witnesses);
  if (witnessPair === null) {
    return { refused: true, reason: "insufficient-distinct-witnesses", record: settled };
  }

  const recordDigest = digestBytes32(settled.id);
  const witnessDigests = witnessPair.map(digestWitness);

  return {
    record: settled,
    unit: { commodity: "KWH", quantity: settled.quantity, digest: recordDigest, witnesses: witnessDigests },
    call: {
      contract: "WitnessedKilowattHour",
      function: "mint",
      args: [recordDigest, witnessDigests[0], witnessDigests[1], milliKwh.toString(), to],
    },
  };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write("settleEnergyExchange — Composes settleEnergyExchangeRecord to settle an EnergyExchangeRecord, refuses as data unless it settles, and names the exact WitnessedKilowattHour.mint call its unit licenses; never submits the call.\n");
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(settleEnergyExchange(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/settle-energy-exchange.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { settleEnergyExchange } from "../scripts/settle-energy-exchange.mjs";

const TO = "0x0000000000000000000000000000000000000a11";

const settledInput = {"kind":"energy-exchange","period":{"start":"2026-08-01T00:00:00Z","end":"2026-08-31T23:59:59Z"},"commodity":"KWH","quantity":"412.5","from":{"id":"urn:example:household-a","role":"producer"},"to":{"id":"urn:example:utility-co","role":"grid"},"place":{"lat":44.9778,"lon":-93.265,"utilityId":"urn:example:utility-co"},"witnesses":[{"kind":"meter","value":"412.5","source":"urn:example:household-a-inverter-export-2026-08","asOf":"2026-09-01T00:00:00Z"},{"kind":"utility-statement","value":"412.5","source":"https://utility-co.example/statements/2026-08","asOf":"2026-09-03T00:00:00Z"}],"price":{"amount":"0.11","commodity":"USD","perUnit":true}};
const mismatchInput = {"kind":"energy-exchange","period":{"start":"2026-08-01T00:00:00Z","end":"2026-08-31T23:59:59Z"},"commodity":"KWH","quantity":"398.0","from":{"id":"urn:example:household-b","role":"producer"},"to":{"id":"urn:example:utility-co","role":"grid"},"place":{"lat":46.7296,"lon":-94.6859,"utilityId":"urn:example:utility-co"},"witnesses":[{"kind":"meter","value":"398.0","source":"urn:example:household-b-inverter-export-2026-08","asOf":"2026-09-01T00:00:00Z"},{"kind":"utility-statement","value":"371.2","source":"https://utility-co.example/statements/2026-08-household-b","asOf":"2026-09-03T00:00:00Z"}]};
const postedPropaneInput = {"kind":"energy-exchange","period":{"start":"2026-08-01T00:00:00Z","end":"2026-08-31T23:59:59Z"},"commodity":"PROPANE_GAL","quantity":"150","from":{"id":"did:example:propane-co","role":"producer"},"to":{"id":"urn:example:household-c","role":"consumer"},"place":{"lat":47.455,"lon":-95.5822},"witnesses":[{"kind":"bank-row","value":"150","source":"urn:example:household-c-bank-statement-2026-08","asOf":"2026-08-15T00:00:00Z"},{"kind":"bank-row","value":"150","source":"urn:example:household-c-bank-statement-2026-08-corrected","asOf":"2026-08-20T00:00:00Z"}],"price":{"amount":"2.79","commodity":"USD","perUnit":true}};

const alreadySettledRecord = {"id":"ni:///sha-256;hwS8YQPMpxlttQoauP1v-luJHmq1nCNNwZ0tmy5zvVA","kind":"energy-exchange","period":{"start":"2026-08-01T00:00:00Z","end":"2026-08-31T23:59:59Z"},"commodity":"KWH","quantity":"412.5","from":{"id":"urn:example:household-a","role":"producer"},"to":{"id":"urn:example:utility-co","role":"grid"},"place":{"lat":44.9778,"lon":-93.265,"utilityId":"urn:example:utility-co"},"witnesses":[{"kind":"meter","value":"412.5","source":"urn:example:household-a-inverter-export-2026-08","asOf":"2026-09-01T00:00:00Z"},{"kind":"utility-statement","value":"412.5","source":"https://utility-co.example/statements/2026-08","asOf":"2026-09-03T00:00:00Z"}],"price":{"amount":"0.11","commodity":"USD","perUnit":true},"settlement":{"status":"settled","mismatch":null,"settledAt":"2026-09-03T00:00:00Z"}};

test("a record that settles in KWH with two distinct witnesses names the exact mint call", () => {
  const result = settleEnergyExchange({ record: settledInput, to: TO });
  assert.equal(result.unit.commodity, "KWH");
  assert.equal(result.unit.quantity, "412.5");
  assert.equal(result.unit.digest, "0x8704bc6103cca7196db50a1ab8fd6ffa5b891e6ab59c234dc19d2d9b2e73bd50");
  assert.deepEqual(result.unit.witnesses, [
    "0x1f5a3e864abe16da1beb603b95f860f07cb2e8cf1b66ab27357d0f9d8250ab63",
    "0x91acdfca05b31ddc8a46414fcc93225b3ca068aae7410de4c8f296b6d3304003",
  ]);
  assert.deepEqual(result.call, {
    contract: "WitnessedKilowattHour",
    function: "mint",
    args: [
      "0x8704bc6103cca7196db50a1ab8fd6ffa5b891e6ab59c234dc19d2d9b2e73bd50",
      "0x1f5a3e864abe16da1beb603b95f860f07cb2e8cf1b66ab27357d0f9d8250ab63",
      "0x91acdfca05b31ddc8a46414fcc93225b3ca068aae7410de4c8f296b6d3304003",
      "412500",
      TO,
    ],
  });
});

test("an already-settled record (carrying id and settlement) passes through unsettled a second time", () => {
  const result = settleEnergyExchange({ record: alreadySettledRecord, to: TO });
  assert.equal(result.record, alreadySettledRecord);
  assert.equal(result.unit.digest, "0x8704bc6103cca7196db50a1ab8fd6ffa5b891e6ab59c234dc19d2d9b2e73bd50");
});

test("a mismatched record refuses as data: not-settled", () => {
  const result = settleEnergyExchange({ record: mismatchInput, to: TO });
  assert.equal(result.refused, true);
  assert.equal(result.reason, "not-settled");
  assert.equal(result.status, "mismatch");
});

test("a lone-witness-kind record refuses as data: not-settled (posted)", () => {
  const result = settleEnergyExchange({ record: postedPropaneInput, to: TO });
  assert.equal(result.refused, true);
  assert.equal(result.reason, "not-settled");
  assert.equal(result.status, "posted");
});

test("a non-KWH settled record refuses as data: not-kilowatt-hour-commodity", () => {
  const result = settleEnergyExchange({ record: { ...alreadySettledRecord, commodity: "PROPANE_GAL" }, to: TO });
  assert.equal(result.refused, true);
  assert.equal(result.reason, "not-kilowatt-hour-commodity");
  assert.equal(result.commodity, "PROPANE_GAL");
});

test("a quantity finer than milli-kWh refuses as data: sub-milliwatt-hour-precision", () => {
  const result = settleEnergyExchange({ record: { ...alreadySettledRecord, quantity: "0.0001" }, to: TO });
  assert.equal(result.refused, true);
  assert.equal(result.reason, "sub-milliwatt-hour-precision");
});

test("a zero quantity refuses as data: non-positive-quantity", () => {
  const result = settleEnergyExchange({ record: { ...alreadySettledRecord, quantity: "0" }, to: TO });
  assert.equal(result.refused, true);
  assert.equal(result.reason, "non-positive-quantity");
});

test("an already-settled record with fewer than two distinct witness kinds refuses as data: insufficient-distinct-witnesses", () => {
  const record = { ...alreadySettledRecord, witnesses: [alreadySettledRecord.witnesses[0]] };
  const result = settleEnergyExchange({ record, to: TO });
  assert.equal(result.refused, true);
  assert.equal(result.reason, "insufficient-distinct-witnesses");
});

test("refuses a missing record", () => {
  assert.throws(() => settleEnergyExchange({ to: TO }), /record is required/u);
});

test("refuses a malformed EVM address", () => {
  assert.throws(() => settleEnergyExchange({ record: alreadySettledRecord, to: "not-an-address" }), /0x-prefixed 40-hex-digit EVM address/u);
});

test("refuses an already-settled record whose settlement is not an object", () => {
  assert.throws(() => settleEnergyExchange({ record: { ...alreadySettledRecord, settlement: "settled" }, to: TO }), /settlement must be an object/u);
});
```
## Examples
```json name="a settled KWH record with two distinct witnesses names the exact mint call"
{"input":{"record":{"kind":"energy-exchange","period":{"start":"2026-08-01T00:00:00Z","end":"2026-08-31T23:59:59Z"},"commodity":"KWH","quantity":"412.5","from":{"id":"urn:example:household-a","role":"producer"},"to":{"id":"urn:example:utility-co","role":"grid"},"place":{"lat":44.9778,"lon":-93.265,"utilityId":"urn:example:utility-co"},"witnesses":[{"kind":"meter","value":"412.5","source":"urn:example:household-a-inverter-export-2026-08","asOf":"2026-09-01T00:00:00Z"},{"kind":"utility-statement","value":"412.5","source":"https://utility-co.example/statements/2026-08","asOf":"2026-09-03T00:00:00Z"}],"price":{"amount":"0.11","commodity":"USD","perUnit":true}},"to":"0x0000000000000000000000000000000000000a11"},"output":{"record":{"id":"ni:///sha-256;hwS8YQPMpxlttQoauP1v-luJHmq1nCNNwZ0tmy5zvVA","kind":"energy-exchange","period":{"start":"2026-08-01T00:00:00Z","end":"2026-08-31T23:59:59Z"},"commodity":"KWH","quantity":"412.5","from":{"id":"urn:example:household-a","role":"producer"},"to":{"id":"urn:example:utility-co","role":"grid"},"place":{"lat":44.9778,"lon":-93.265,"utilityId":"urn:example:utility-co"},"witnesses":[{"kind":"meter","value":"412.5","source":"urn:example:household-a-inverter-export-2026-08","asOf":"2026-09-01T00:00:00Z"},{"kind":"utility-statement","value":"412.5","source":"https://utility-co.example/statements/2026-08","asOf":"2026-09-03T00:00:00Z"}],"price":{"amount":"0.11","commodity":"USD","perUnit":true},"settlement":{"status":"settled","mismatch":null,"settledAt":"2026-09-03T00:00:00Z"}},"unit":{"commodity":"KWH","quantity":"412.5","digest":"0x8704bc6103cca7196db50a1ab8fd6ffa5b891e6ab59c234dc19d2d9b2e73bd50","witnesses":["0x1f5a3e864abe16da1beb603b95f860f07cb2e8cf1b66ab27357d0f9d8250ab63","0x91acdfca05b31ddc8a46414fcc93225b3ca068aae7410de4c8f296b6d3304003"]},"call":{"contract":"WitnessedKilowattHour","function":"mint","args":["0x8704bc6103cca7196db50a1ab8fd6ffa5b891e6ab59c234dc19d2d9b2e73bd50","0x1f5a3e864abe16da1beb603b95f860f07cb2e8cf1b66ab27357d0f9d8250ab63","0x91acdfca05b31ddc8a46414fcc93225b3ca068aae7410de4c8f296b6d3304003","412500","0x0000000000000000000000000000000000000a11"]}}}
```
```json name="a disagreeing pair of witnesses refuses as data: not-settled"
{"input":{"record":{"kind":"energy-exchange","period":{"start":"2026-08-01T00:00:00Z","end":"2026-08-31T23:59:59Z"},"commodity":"KWH","quantity":"398.0","from":{"id":"urn:example:household-b","role":"producer"},"to":{"id":"urn:example:utility-co","role":"grid"},"place":{"lat":46.7296,"lon":-94.6859,"utilityId":"urn:example:utility-co"},"witnesses":[{"kind":"meter","value":"398.0","source":"urn:example:household-b-inverter-export-2026-08","asOf":"2026-09-01T00:00:00Z"},{"kind":"utility-statement","value":"371.2","source":"https://utility-co.example/statements/2026-08-household-b","asOf":"2026-09-03T00:00:00Z"}]},"to":"0x0000000000000000000000000000000000000a11"},"output":{"refused":true,"reason":"not-settled","status":"mismatch","record":{"id":"ni:///sha-256;gz8u7e88tr7_hNiadFM0bw6aRlyH4DFIoMxHF_UQ8uQ","kind":"energy-exchange","period":{"start":"2026-08-01T00:00:00Z","end":"2026-08-31T23:59:59Z"},"commodity":"KWH","quantity":"398.0","from":{"id":"urn:example:household-b","role":"producer"},"to":{"id":"urn:example:utility-co","role":"grid"},"place":{"lat":46.7296,"lon":-94.6859,"utilityId":"urn:example:utility-co"},"witnesses":[{"kind":"meter","value":"398.0","source":"urn:example:household-b-inverter-export-2026-08","asOf":"2026-09-01T00:00:00Z"},{"kind":"utility-statement","value":"371.2","source":"https://utility-co.example/statements/2026-08-household-b","asOf":"2026-09-03T00:00:00Z"}],"settlement":{"status":"mismatch","mismatch":"26.8","settledAt":null}}}}
```
```json name="a settled non-KWH commodity refuses as data: not-kilowatt-hour-commodity"
{"input":{"record":{"id":"ni:///sha-256;hwS8YQPMpxlttQoauP1v-luJHmq1nCNNwZ0tmy5zvVA","kind":"energy-exchange","period":{"start":"2026-08-01T00:00:00Z","end":"2026-08-31T23:59:59Z"},"commodity":"PROPANE_GAL","quantity":"412.5","from":{"id":"urn:example:household-a","role":"producer"},"to":{"id":"urn:example:utility-co","role":"grid"},"place":{"lat":44.9778,"lon":-93.265,"utilityId":"urn:example:utility-co"},"witnesses":[{"kind":"meter","value":"412.5","source":"urn:example:household-a-inverter-export-2026-08","asOf":"2026-09-01T00:00:00Z"},{"kind":"utility-statement","value":"412.5","source":"https://utility-co.example/statements/2026-08","asOf":"2026-09-03T00:00:00Z"}],"price":{"amount":"0.11","commodity":"USD","perUnit":true},"settlement":{"status":"settled","mismatch":null,"settledAt":"2026-09-03T00:00:00Z"}},"to":"0x0000000000000000000000000000000000000a11"},"output":{"refused":true,"reason":"not-kilowatt-hour-commodity","commodity":"PROPANE_GAL","record":{"id":"ni:///sha-256;hwS8YQPMpxlttQoauP1v-luJHmq1nCNNwZ0tmy5zvVA","kind":"energy-exchange","period":{"start":"2026-08-01T00:00:00Z","end":"2026-08-31T23:59:59Z"},"commodity":"PROPANE_GAL","quantity":"412.5","from":{"id":"urn:example:household-a","role":"producer"},"to":{"id":"urn:example:utility-co","role":"grid"},"place":{"lat":44.9778,"lon":-93.265,"utilityId":"urn:example:utility-co"},"witnesses":[{"kind":"meter","value":"412.5","source":"urn:example:household-a-inverter-export-2026-08","asOf":"2026-09-01T00:00:00Z"},{"kind":"utility-statement","value":"412.5","source":"https://utility-co.example/statements/2026-08","asOf":"2026-09-03T00:00:00Z"}],"price":{"amount":"0.11","commodity":"USD","perUnit":true},"settlement":{"status":"settled","mismatch":null,"settledAt":"2026-09-03T00:00:00Z"}}}}
```
## Traceability
- `compose-settlement` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `standards-first`, `node-esm-operation`
- `settled-only-unit` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `two-witnesses-or-not-settled`, `node-esm-operation`
- `witnessed-kilowatt-hour-unit` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `obsmetrologic-function-contract`, `rfc-6920`, `node-esm-operation`
- `contract-call-args` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `obsmetrologic-function-contract`, `node-esm-operation`
- `never-a-second-identity` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `standards-first`, `rfc-6920`, `node-esm-operation`
- `declared-tolerance` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `missing-record-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `invalid-recipient-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `malformed-settled-record-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `not-kilowatt-hour-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `two-witnesses-or-not-settled`, `node-esm-operation`
- `sub-milliwatt-hour-precision-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `obsmetrologic-function-contract`, `node-esm-operation`
- `non-positive-quantity-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `obsmetrologic-function-contract`, `node-esm-operation`
- `insufficient-witness-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `two-witnesses-or-not-settled`, `node-esm-operation`
- `never-submits` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `obsmetrologic-function-contract`, `node-esm-operation`

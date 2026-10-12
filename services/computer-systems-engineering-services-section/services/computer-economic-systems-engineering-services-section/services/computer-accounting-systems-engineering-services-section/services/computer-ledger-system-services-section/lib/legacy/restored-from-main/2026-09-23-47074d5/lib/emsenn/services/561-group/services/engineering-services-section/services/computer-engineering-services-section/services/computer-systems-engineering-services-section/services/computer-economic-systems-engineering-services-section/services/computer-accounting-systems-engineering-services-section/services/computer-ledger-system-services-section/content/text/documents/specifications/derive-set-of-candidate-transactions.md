# derive-set-of-candidate-transactions
## Requirements
- `one-transaction-per-mismatch`: The operation must return one candidate transaction per input mismatch row, dated the day before the row's `assertionDate` so a Beancount `balance` directive dated `assertionDate` includes it.
- `exact-delta`: The operation must compute the posting amount as the exact decimal difference between `assertedBalance` and `postedBalance` (treated as `0` when null), accepting either a plain decimal string or a reduced `numerator/denominator` fraction string (optionally unit-suffixed), never a floating-point approximation.
- `rule-chosen-counter-account`: The operation must post the balancing amount to `Income:Investment:Unrealized-Gains` when the delta increases the custody account and to `Expenses:Investment:Unrealized-Losses` when it decreases it.
- `witnessed-metadata`: Every candidate transaction must carry the mismatch row's `sourceId` as a `source_id` metadata line, and the rendered directive text must be included on each transaction.
- `open-only-when-missing`: The operation must emit an `open` directive for a counter account only when that account's name is absent from the input's `openAccounts` list, never for an account already open.
## Prohibitions
- `no-zero-postings`: The operation must not emit a transaction for a mismatch row whose exact delta is zero; it must instead list that row under `skipped` with reason `zero-delta`.
- `no-float-arithmetic`: The operation must not convert any amount through a JavaScript floating-point number; all arithmetic is exact BigInt-scaled decimal or fraction reduction.
- `no-nonterminating-fraction`: The operation must throw when a fraction's reduced denominator carries a prime factor other than 2 or 5 (a non-terminating decimal).
## Laws
- `beancount-balance-semantics` | Beancount balance directive semantics | v3 | https://beancount.github.io/docs/the_double_entry_counting_method.html | Applies to the one-day-earlier dating rule. | A `balance` directive dated D checks the account's cumulative balance from postings dated strictly before D; a correcting posting dated D or later is invisible to that check.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation. | The package uses one executable ESM operation source file with no runtime dependencies.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/derive-set-of-candidate-transactions-service","packageVersion":"0.1.0","license":"MIT","dependencies":{},"devDependencies":{}}
```
## Operation
```mjs path=scripts/derive-set-of-candidate-transactions.mjs
#!/usr/bin/env node
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/u;
const FRACTION_PATTERN = /^(-?\d+)\/(\d+)$/u;
const DECIMAL_PATTERN = /^-?\d+(?:\.\d+)?$/u;
const INCREASE_ACCOUNT = "Income:Investment:Unrealized-Gains";
const DECREASE_ACCOUNT = "Expenses:Investment:Unrealized-Losses";

function bareAmount(raw) {
  const trimmed = String(raw).trim();
  const withoutUnit = trimmed.replace(/\s+\S+$/u, "");
  return FRACTION_PATTERN.test(withoutUnit) || DECIMAL_PATTERN.test(withoutUnit) ? withoutUnit : trimmed;
}

function toScaled(raw) {
  const body = bareAmount(raw);
  const fractionMatch = FRACTION_PATTERN.exec(body);
  if (fractionMatch) {
    let numerator = BigInt(fractionMatch[1]);
    let denominator = BigInt(fractionMatch[2]);
    if (denominator === 0n) throw new RangeError(`derive-set-of-candidate-transactions: zero denominator in ${JSON.stringify(raw)}`);
    const negative = numerator < 0n;
    if (negative) numerator = -numerator;
    let twos = 0;
    let fives = 0;
    while (denominator % 2n === 0n) { denominator /= 2n; twos += 1; }
    while (denominator % 5n === 0n) { denominator /= 5n; fives += 1; }
    if (denominator !== 1n) throw new RangeError(`derive-set-of-candidate-transactions: non-terminating value ${JSON.stringify(raw)}`);
    const scale = Math.max(twos, fives);
    const magnitude = numerator * (2n ** BigInt(scale - twos)) * (5n ** BigInt(scale - fives));
    return { negative, magnitude, scale };
  }
  if (!DECIMAL_PATTERN.test(body)) throw new TypeError(`derive-set-of-candidate-transactions: not a decimal or fraction amount: ${JSON.stringify(raw)}`);
  const negative = body.startsWith("-");
  const unsigned = negative ? body.slice(1) : body;
  const [whole, frac = ""] = unsigned.split(".");
  return { negative, magnitude: BigInt(`${whole}${frac}`), scale: frac.length };
}

function formatScaled(negative, magnitude, scale) {
  const digits = magnitude.toString().padStart(scale + 1, "0");
  const whole = scale === 0 ? digits : digits.slice(0, digits.length - scale);
  const frac = scale === 0 ? "" : digits.slice(digits.length - scale).replace(/0+$/u, "");
  const body = frac === "" ? whole : `${whole}.${frac}`;
  return negative && /[1-9]/u.test(body) ? `-${body}` : body;
}

function decimalDifference(assertedRaw, postedRaw) {
  const asserted = toScaled(assertedRaw);
  const posted = postedRaw === null || postedRaw === undefined ? { negative: false, magnitude: 0n, scale: 0 } : toScaled(postedRaw);
  const scale = Math.max(asserted.scale, posted.scale);
  const scaleUp = (v) => v.magnitude * (10n ** BigInt(scale - v.scale));
  const assertedMagnitude = asserted.negative ? -scaleUp(asserted) : scaleUp(asserted);
  const postedMagnitude = posted.negative ? -scaleUp(posted) : scaleUp(posted);
  const delta = assertedMagnitude - postedMagnitude;
  return formatScaled(delta < 0n, delta < 0n ? -delta : delta, scale);
}

function negateDecimalString(text) {
  if (/^0(\.0+)?$/u.test(text)) return text;
  return text.startsWith("-") ? text.slice(1) : `-${text}`;
}

function dayBefore(dateStr) {
  const match = DATE_PATTERN.exec(dateStr);
  if (!match) throw new TypeError(`derive-set-of-candidate-transactions: not a YYYY-MM-DD date: ${JSON.stringify(dateStr)}`);
  const asUtc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  asUtc.setUTCDate(asUtc.getUTCDate() - 1);
  return asUtc.toISOString().slice(0, 10);
}

function renderTransactionDirective({
  date, narration, sourceId, custodyAccount, custodyAmount, custodyCommodity, counterAccount, counterAmount,
}) {
  return [
    `${date} * "${narration}"`,
    `  source_id: "${sourceId}"`,
    `  ${custodyAccount}  ${custodyAmount} ${custodyCommodity}`,
    `  ${counterAccount}  ${counterAmount} ${custodyCommodity}`,
  ].join("\n");
}

/**
 * Derive one candidate Beancount transaction per mismatch row, dated the day before the
 * assertion so it is visible to that day's balance check, posting the exact chain-vs-book
 * delta between the custody account and a rule-chosen `Income:Investment:Unrealized-Gains` or
 * `Expenses:Investment:Unrealized-Losses` counter-account, each carrying the mismatch's chain
 * source id as `source_id` metadata.
 * @param {{ mismatches: readonly { account: string, commodity: string, postedBalance: (string|null),
 *   assertedBalance: string, assertionDate: string, sourceId: string }[], openAccounts?: readonly string[] }} input
 * @returns {{ type: "CandidateTransactionSet", version: 1, transactionCount: number,
 *   transactions: readonly object[], accountsToOpen: readonly object[], skipped: readonly object[] }}
 * @throws {TypeError} When `input.mismatches` is not an array, a row is malformed, or an amount is neither a decimal nor a fraction string.
 * @throws {RangeError} When a fraction's denominator does not reduce to only factors of 2 and 5.
 */
export function deriveSetOfCandidateTransactions(input) {
  if (!input || typeof input !== "object" || !Array.isArray(input.mismatches)) {
    throw new TypeError("derive-set-of-candidate-transactions: input.mismatches must be an array");
  }
  const openAccounts = new Set(Array.isArray(input.openAccounts) ? input.openAccounts : []);
  const transactions = [];
  const skipped = [];
  const accountsToOpenByName = new Map();
  for (const row of input.mismatches) {
    if (!row || typeof row.account !== "string" || typeof row.commodity !== "string"
      || typeof row.assertedBalance !== "string" || typeof row.assertionDate !== "string"
      || typeof row.sourceId !== "string") {
      throw new TypeError(`derive-set-of-candidate-transactions: malformed mismatch row: ${JSON.stringify(row)}`);
    }
    const delta = decimalDifference(row.assertedBalance, row.postedBalance ?? null);
    if (/^0(\.0+)?$/u.test(delta)) {
      skipped.push({ account: row.account, commodity: row.commodity, sourceId: row.sourceId, reason: "zero-delta" });
      continue;
    }
    const date = dayBefore(row.assertionDate);
    const counterAccount = delta.startsWith("-") ? DECREASE_ACCOUNT : INCREASE_ACCOUNT;
    const counterAmount = negateDecimalString(delta);
    if (!openAccounts.has(counterAccount) && !accountsToOpenByName.has(counterAccount)) {
      accountsToOpenByName.set(counterAccount, { account: counterAccount, date, directive: `${date} open ${counterAccount}` });
    }
    const narration = `Book chain-witnessed ${row.commodity} movement in ${row.account}`;
    transactions.push({
      date,
      narration,
      sourceId: row.sourceId,
      account: row.account,
      commodity: row.commodity,
      delta,
      counterAccount,
      counterAmount,
      directive: renderTransactionDirective({
        date, narration, sourceId: row.sourceId,
        custodyAccount: row.account, custodyAmount: delta, custodyCommodity: row.commodity,
        counterAccount, counterAmount,
      }),
    });
  }
  return Object.freeze({
    type: "CandidateTransactionSet",
    version: 1,
    transactionCount: transactions.length,
    transactions: Object.freeze(transactions),
    accountsToOpen: Object.freeze([...accountsToOpenByName.values()]),
    skipped: Object.freeze(skipped),
  });
}

if (import.meta.main) {
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  try {
    process.stdout.write(`${JSON.stringify(deriveSetOfCandidateTransactions(JSON.parse(text)), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ error: error.message })}\n`);
    process.exit(2);
  }
}
```
## Tests
```mjs path=test/derive-set-of-candidate-transactions.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { deriveSetOfCandidateTransactions } from "../scripts/derive-set-of-candidate-transactions.mjs";

test("refuses a non-array mismatches input", () => {
  assert.throws(() => deriveSetOfCandidateTransactions({}), /mismatches must be an array/u);
});

test("increase posts to Income:Investment:Unrealized-Gains, dated the day before the assertion", () => {
  const result = deriveSetOfCandidateTransactions({
    mismatches: [{
      account: "Assets:Digital-Assets:Hive:Liquid", commodity: "HIVE",
      postedBalance: "142.423", assertedBalance: "142913/1000",
      assertionDate: "2026-09-05", sourceId: "CHAIN-HIVE-20260904",
    }],
    openAccounts: ["Income:Investment:Unrealized-Gains", "Expenses:Investment:Unrealized-Losses"],
  });
  assert.equal(result.transactionCount, 1);
  const [txn] = result.transactions;
  assert.equal(txn.date, "2026-09-04");
  assert.equal(txn.delta, "0.49");
  assert.equal(txn.counterAccount, "Income:Investment:Unrealized-Gains");
  assert.equal(txn.counterAmount, "-0.49");
  assert.equal(result.accountsToOpen.length, 0);
});

test("decrease posts to Expenses:Investment:Unrealized-Losses", () => {
  const result = deriveSetOfCandidateTransactions({
    mismatches: [{
      account: "Assets:Digital-Assets:HiveEngine:Unclassified", commodity: "ALIVE",
      postedBalance: "1/5000 ALIVE", assertedBalance: "0/1 ALIVE",
      assertionDate: "2026-09-05", sourceId: "CHAIN-HIVEENGINE-20260904",
    }],
    openAccounts: ["Income:Investment:Unrealized-Gains", "Expenses:Investment:Unrealized-Losses"],
  });
  assert.equal(result.transactions[0].counterAccount, "Expenses:Investment:Unrealized-Losses");
  assert.equal(result.transactions[0].delta, "-0.0002");
  assert.equal(result.transactions[0].counterAmount, "0.0002");
});

test("a null postedBalance is treated as zero", () => {
  const result = deriveSetOfCandidateTransactions({
    mismatches: [{
      account: "Assets:Digital-Assets:HiveEngine:Unclassified", commodity: "NEWTOKEN",
      postedBalance: null, assertedBalance: "5.5",
      assertionDate: "2026-09-05", sourceId: "CHAIN-HIVEENGINE-20260904",
    }],
  });
  assert.equal(result.transactions[0].delta, "5.5");
});

test("a zero delta is skipped, never posted", () => {
  const result = deriveSetOfCandidateTransactions({
    mismatches: [{
      account: "Assets:Digital-Assets:Hive:Liquid", commodity: "HIVE",
      postedBalance: "142.423", assertedBalance: "142.423",
      assertionDate: "2026-09-05", sourceId: "CHAIN-HIVE-20260904",
    }],
  });
  assert.equal(result.transactionCount, 0);
  assert.deepEqual(result.skipped, [{
    account: "Assets:Digital-Assets:Hive:Liquid", commodity: "HIVE", sourceId: "CHAIN-HIVE-20260904", reason: "zero-delta",
  }]);
});

test("a missing counter account is listed once under accountsToOpen", () => {
  const result = deriveSetOfCandidateTransactions({
    mismatches: [
      { account: "A", commodity: "X", postedBalance: "1", assertedBalance: "2", assertionDate: "2026-09-05", sourceId: "S1" },
      { account: "B", commodity: "Y", postedBalance: "1", assertedBalance: "3", assertionDate: "2026-09-05", sourceId: "S2" },
    ],
    openAccounts: [],
  });
  assert.equal(result.accountsToOpen.length, 1);
  assert.equal(result.accountsToOpen[0].account, "Income:Investment:Unrealized-Gains");
});

test("rejects a non-terminating fraction", () => {
  assert.throws(() => deriveSetOfCandidateTransactions({
    mismatches: [{ account: "A", commodity: "X", postedBalance: "0", assertedBalance: "1/3", assertionDate: "2026-09-05", sourceId: "S1" }],
  }), /non-terminating/u);
});
```
## Examples
```json name="one increasing mismatch produces one dated, source-witnessed candidate transaction"
{"input":{"mismatches":[{"account":"Assets:Digital-Assets:Hive:Liquid","commodity":"HIVE","postedBalance":"142.423","assertedBalance":"142913/1000","assertionDate":"2026-09-05","sourceId":"CHAIN-HIVE-20260904"}],"openAccounts":["Income:Investment:Unrealized-Gains","Expenses:Investment:Unrealized-Losses"]},"output":{"type":"CandidateTransactionSet","version":1,"transactionCount":1,"transactions":[{"date":"2026-09-04","narration":"Book chain-witnessed HIVE movement in Assets:Digital-Assets:Hive:Liquid","sourceId":"CHAIN-HIVE-20260904","account":"Assets:Digital-Assets:Hive:Liquid","commodity":"HIVE","delta":"0.49","counterAccount":"Income:Investment:Unrealized-Gains","counterAmount":"-0.49","directive":"2026-09-04 * \"Book chain-witnessed HIVE movement in Assets:Digital-Assets:Hive:Liquid\"\n  source_id: \"CHAIN-HIVE-20260904\"\n  Assets:Digital-Assets:Hive:Liquid  0.49 HIVE\n  Income:Investment:Unrealized-Gains  -0.49 HIVE"}],"accountsToOpen":[],"skipped":[]}}
```
## Traceability
- `one-transaction-per-mismatch` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `beancount-balance-semantics`, `node-esm-operation`
- `exact-delta` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `rule-chosen-counter-account` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `witnessed-metadata` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `open-only-when-missing` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-zero-postings` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-float-arithmetic` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-nonterminating-fraction` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `beancount-balance-semantics`, `node-esm-operation`

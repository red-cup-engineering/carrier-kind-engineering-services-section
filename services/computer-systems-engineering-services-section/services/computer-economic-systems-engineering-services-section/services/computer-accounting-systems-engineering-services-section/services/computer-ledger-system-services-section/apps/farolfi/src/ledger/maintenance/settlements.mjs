/**
 * Enterprise settlements as reviewable Beancount transactions: what a micro-enterprise's
 * closings, deposits and value-added payouts do to the Group's book of record.
 *
 * - A `deposit` moves earnest money from cash into a deposit held by a closing agent.
 * - A `settlement` receives a fee into cash as the enterprise's service income, returns any deposit
 *   the closing agent credited, and accrues each value-added share as a payable to its party.
 * - A `payout` pays an accrued share from cash.
 * - A settlement's `reserves` set part of what it received aside in a named fund's cash account.
 * - An `acquisition` puts land the enterprise keeps on the books at its price plus fees, paid from
 *   cash (or a fund) with any balance owed on terms as a liability; an `installment` pays that
 *   balance and its interest; a `holding-cost` or `holding-income` is what keeping the land costs
 *   or earns, by what it is (property tax, a forest-incentive payment, timber).
 *
 * Amounts are USD to the cent; each transaction carries its enterprise, order and source record as
 * metadata, and a record with nothing to post is refused rather than booked as zero.
 * @packageDocumentation
 */

import { addDecimalStrings, compareDecimalStrings, decimalOfRational, expandDecimalNotation, negateDecimalString, rationalOfDecimal } from "@red-cup-engineering/exact-number-data-service/decimal-string";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

/** The accounts a settlement posts to, with the house chart's names as defaults. */
export const SETTLEMENT_ACCOUNTS = Object.freeze({
  cash: "Assets:Cash:Operating",
  deposits: "Assets:Deposits:Earnest-Money",
  income: (enterprise) => `Income:Services:${titleOf(enterprise)}`,
  sharing: (enterprise) => `Expenses:Cost-of-Revenue:Value-Added-Sharing:${titleOf(enterprise)}`,
  payable: "Liabilities:Accounts-Payable:Value-Added-Sharing",
  reserved: (fund) => `Assets:Cash:Reserved:${titleOf(fund)}`,
  held: "Assets:Land",
  owed: "Liabilities:Land-Contracts",
  interest: "Expenses:Interest:Land-Contracts",
  holdingCost: (what) => `Expenses:Land-Holding:${titleOf(what)}`,
  holdingIncome: (what) => `Income:Land-Holding:${titleOf(what)}`,
});

function titleOf(id) {
  return String(id).split(/[^A-Za-z0-9]+/u).filter(Boolean).map((word) => word[0].toUpperCase() + word.slice(1)).join("-");
}

// Monetary evidence stays decimal throughout composition. Numeric boundary
// values retain only their already-represented value; never coerce exact
// string evidence through binary floating point before ledger rendering.
const amount = (value) => {
  const admitted = value ?? "0";
  if (!["string", "number"].includes(typeof admitted)
    || (typeof admitted === "number" && !Number.isFinite(admitted))) {
    throw new TypeError("settlement transactions: amount must be finite decimal evidence");
  }
  return expandDecimalNotation(admitted);
};
const cents = (value) => decimalOfRational(rationalOfDecimal(amount(value)), 2, { rounding: "half-away-from-zero" });
const positive = (value) => compareDecimalStrings(amount(value), "0") > 0;
const sum = (...values) => addDecimalStrings(values.map(amount));
const difference = (left, right) => sum(left, negateDecimalString(amount(right)));
const negative = (text) => (text.startsWith("-") ? text.slice(1) : `-${text}`);
const partyAccount = (party) => String(party).replace(/[^A-Za-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "").slice(0, 60) || "Unnamed";

function render({ date, narration, metadata, postings }) {
  const lines = [`${date} * "${narration.replaceAll('"', "'")}"`];
  for (const [key, value] of Object.entries(metadata)) if (value !== undefined && value !== null && value !== "") lines.push(`  ${key}: "${String(value).replaceAll('"', "'")}"`);
  for (const p of postings) lines.push(`  ${p.account}  ${p.amount} USD`);
  return lines.join("\n");
}

/**
 * @param {{ settlements: readonly object[], openAccounts?: readonly string[], accounts?: object }} input
 *   each record `{ kind?: "deposit"|"settlement"|"payout"|"acquisition"|"installment"|"holding-cost"|"holding-income",
 *   enterprise, order, date, received?, deposit?, depositReturned?, shares?: [{ party, amount }],
 *   reserves?: [{ fund, amount }], price?, paid?, financed?, fees?, principal?, interest?, what?, fund?,
 *   party?, amount?, closingAgent?, recordedAt? }`
 * @returns {{ type: "SettlementTransactionSet", version: 1, transactionCount: number, transactions: readonly object[], accountsToOpen: readonly object[], refusals: readonly object[] }}
 */
export function deriveSetOfSettlementTransactions(input) {
  if (!input || !Array.isArray(input.settlements)) throw new TypeError("derive-set-of-settlement-transactions: input.settlements must be an array");
  const accounts = { ...SETTLEMENT_ACCOUNTS, ...(input.accounts ?? {}) };
  const resolve = (account, enterprise) => (typeof account === "function" ? account(enterprise) : account);
  const open = new Set(input.openAccounts ?? []);
  const toOpen = new Map();
  const note = (account, date) => { if (!open.has(account) && !toOpen.has(account)) toOpen.set(account, { account, date, directive: `${date} open ${account}` }); };
  const transactions = [];
  const refusals = [];
  for (const record of input.settlements) {
    const kind = record.kind ?? "settlement";
    const date = record.date ?? String(record.recordedAt ?? "").slice(0, 10);
    const id = `${record.enterprise}:${record.order ?? record.party ?? "?"}:${kind}:${date}`;
    if (!record.enterprise || !DATE_PATTERN.test(date)) { refusals.push({ id, reason: "a settlement names its enterprise and a YYYY-MM-DD date" }); continue; }
    const components = ["received", "deposit", "amount", "depositReturned", "price", "paid", "financed", "fees", "principal", "interest"]
      .filter((field) => record[field] !== undefined).map((field) => record[field]);
    components.push(...(record.shares ?? []).map((share) => share.amount), ...(record.reserves ?? []).map((reserve) => reserve.amount));
    if (components.some((value) => compareDecimalStrings(amount(value), "0") < 0)) {
      refusals.push({ id, reason: "settlement monetary components must be nonnegative" }); continue;
    }
    const metadata = { enterprise: record.enterprise, order: record.order, closing_agent: record.closingAgent, recorded_at: record.recordedAt, source: record.witness };
    const postings = [];
    let narration;
    if (kind === "deposit") {
      if (!positive(record.deposit)) { refusals.push({ id, reason: "a deposit names a positive amount" }); continue; }
      const amount = cents(record.deposit);
      postings.push({ account: accounts.deposits, amount }, { account: accounts.cash, amount: negative(amount) });
      narration = `${record.enterprise} earnest money for ${record.order} with ${record.closingAgent ?? "the closing agent"}`;
    } else if (kind === "payout") {
      if (!positive(record.amount) || !record.party) { refusals.push({ id, reason: "a payout names its party and a positive amount" }); continue; }
      const amount = cents(record.amount);
      postings.push({ account: `${accounts.payable}:${partyAccount(record.party)}`, amount }, { account: accounts.cash, amount: negative(amount) });
      narration = `${record.enterprise} value-added share paid to ${record.party}`;
    } else if (kind === "acquisition") {
      const price = cents(record.price);
      const paid = cents(record.paid);
      const financed = cents(record.financed ?? difference(price, paid));
      const fees = cents(record.fees);
      const gap = difference(sum(paid, financed), price);
      if (!positive(price) || compareDecimalStrings(financed, "0") < 0 || compareDecimalStrings(gap.startsWith("-") ? negateDecimalString(gap) : gap, "0.005") > 0) { refusals.push({ id, reason: "an acquisition names a positive price equal to what was paid plus what is owed" }); continue; }
      const from = record.fund ? resolve(accounts.reserved, record.fund) : accounts.cash;
      const asset = `${accounts.held}:${partyAccount(record.order)}`;
      postings.push({ account: asset, amount: cents(sum(price, fees)) }, { account: from, amount: negative(cents(sum(paid, fees))) });
      if (positive(financed)) postings.push({ account: `${accounts.owed}:${partyAccount(record.order)}`, amount: negative(cents(financed)) });
      narration = `${record.enterprise} acquired ${record.order}${positive(financed) ? " on terms" : ""}`;
    } else if (kind === "installment") {
      const principal = cents(record.principal);
      const interest = cents(record.interest);
      if (!positive(principal) && !positive(interest)) { refusals.push({ id, reason: "an installment names its principal or interest" }); continue; }
      const from = record.fund ? resolve(accounts.reserved, record.fund) : accounts.cash;
      if (positive(principal)) postings.push({ account: `${accounts.owed}:${partyAccount(record.order)}`, amount: cents(principal) });
      if (positive(interest)) postings.push({ account: accounts.interest, amount: cents(interest) });
      postings.push({ account: from, amount: negative(cents(sum(principal, interest))) });
      narration = `${record.enterprise} installment on ${record.order}`;
    } else if (kind === "holding-cost" || kind === "holding-income") {
      if (!positive(record.amount) || !record.what) { refusals.push({ id, reason: `a ${kind} names what it is and a positive amount` }); continue; }
      const amount = cents(record.amount);
      const cashAccount = record.fund ? resolve(accounts.reserved, record.fund) : accounts.cash;
      if (kind === "holding-cost") postings.push({ account: resolve(accounts.holdingCost, record.what), amount }, { account: cashAccount, amount: negative(amount) });
      else postings.push({ account: cashAccount, amount }, { account: resolve(accounts.holdingIncome, record.what), amount: negative(amount) });
      narration = `${record.enterprise} ${record.what} on ${record.order}`;
    } else {
      const received = amount(record.received);
      const returned = amount(record.depositReturned);
      const shares = (record.shares ?? []).filter((share) => positive(share.amount));
      if (!positive(received) && !positive(returned) && shares.length === 0) { refusals.push({ id, reason: "nothing received, returned or shared: not booked as zero" }); continue; }
      if (positive(received)) postings.push({ account: accounts.cash, amount: cents(received) }, { account: resolve(accounts.income, record.enterprise), amount: negative(cents(received)) });
      if (positive(returned)) postings.push({ account: accounts.cash, amount: cents(returned) }, { account: accounts.deposits, amount: negative(cents(returned)) });
      for (const share of shares) postings.push({ account: resolve(accounts.sharing, record.enterprise), amount: cents(share.amount) }, { account: `${accounts.payable}:${partyAccount(share.party)}`, amount: negative(cents(share.amount)) });
      for (const reserve of (record.reserves ?? []).filter((r) => r.fund && positive(r.amount))) postings.push({ account: resolve(accounts.reserved, reserve.fund), amount: cents(reserve.amount) }, { account: accounts.cash, amount: negative(cents(reserve.amount)) });
      narration = `${record.enterprise} settlement of ${record.order}${record.closingAgent ? ` at ${record.closingAgent}` : ""}`;
    }
    // Recognition uses the actual cent-posted carrier. An unrepresentable
    // positive input cannot establish a zero transaction, and no implicit
    // counter-posting or negative financing is invented to balance a record.
    const nonzero = postings.filter((posting) => compareDecimalStrings(posting.amount, "0") !== 0);
    if (nonzero.length === 0) { refusals.push({ id, reason: "nothing to post at USD-cent resolution" }); continue; }
    if (compareDecimalStrings(addDecimalStrings(nonzero.map((posting) => posting.amount)), "0") !== 0) {
      refusals.push({ id, reason: "USD-cent postings do not conserve currency" }); continue;
    }
    postings.splice(0, postings.length, ...nonzero);
    for (const p of postings) note(p.account, date);
    transactions.push(Object.freeze({ id, kind, date, narration, postings: Object.freeze(postings), directive: render({ date, narration, metadata, postings }) }));
  }
  return Object.freeze({
    type: "SettlementTransactionSet",
    version: 1,
    transactionCount: transactions.length,
    transactions: Object.freeze(transactions),
    accountsToOpen: Object.freeze([...toOpen.values()]),
    refusals: Object.freeze(refusals),
  });
}

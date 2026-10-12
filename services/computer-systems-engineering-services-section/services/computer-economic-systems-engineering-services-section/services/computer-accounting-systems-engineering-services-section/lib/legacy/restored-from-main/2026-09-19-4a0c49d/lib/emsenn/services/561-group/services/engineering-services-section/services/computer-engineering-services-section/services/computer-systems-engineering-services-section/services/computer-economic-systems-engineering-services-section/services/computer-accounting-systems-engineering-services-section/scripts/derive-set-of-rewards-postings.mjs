#!/usr/bin/env node
import {
  addDecimalStrings,
  formatScaled,
  multiplyDecimalStrings,
  parseDecimal,
} from "@red-cup-engineering/computer-ledger-system-services-section/src/decimal.mjs";
import { renderPriceDirective } from "@red-cup-engineering/computer-ledger-system-services-section/src/beancount-render.mjs";
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";

const EVENT_KINDS = new Set(["earned", "redeemed", "expired", "transferred", "statement-credit"]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

function requireString(value, context) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`derive-set-of-rewards-postings: ${context} must be a non-empty string`);
  return value;
}

function requireDate(value, context) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) throw new TypeError(`derive-set-of-rewards-postings: ${context} must be a YYYY-MM-DD date string`);
  return value;
}

function requireDecimalString(value, context) {
  if (typeof value !== "string") throw new TypeError(`derive-set-of-rewards-postings: ${context} must be a plain decimal string`);
  try {
    parseDecimal(value);
  } catch {
    throw new TypeError(`derive-set-of-rewards-postings: ${context} must be a plain decimal string`);
  }
  return value;
}

/**
 * The exact negation of a plain decimal string, via `parseDecimal`/`formatScaled` so the sign
 * flip never touches a floating-point number.
 * @param {string} text
 * @returns {string}
 */
function negateDecimalString(text) {
  const { negative, whole, frac } = parseDecimal(text);
  const magnitude = BigInt(`${whole}${frac}`);
  if (magnitude === 0n) return formatScaled(0n, frac.length);
  return formatScaled(negative ? magnitude : -magnitude, frac.length);
}

/**
 * Compares two plain decimal strings exactly via `parseDecimal` and BigInt, never a float.
 * @param {string} a
 * @param {string} b
 * @returns {-1 | 0 | 1}
 */
function compareDecimalStrings(a, b) {
  const left = parseDecimal(a);
  const right = parseDecimal(b);
  const scale = Math.max(left.frac.length, right.frac.length);
  const leftMagnitude = BigInt(`${left.whole}${left.frac.padEnd(scale, "0")}`) * (left.negative ? -1n : 1n);
  const rightMagnitude = BigInt(`${right.whole}${right.frac.padEnd(scale, "0")}`) * (right.negative ? -1n : 1n);
  if (leftMagnitude < rightMagnitude) return -1;
  if (leftMagnitude > rightMagnitude) return 1;
  return 0;
}

/**
 * Capitalizes each hyphen- or space-separated word of an issuer, program, or card-label name
 * into one Beancount account component, leaving a word that starts with a digit unchanged.
 * @param {string} text
 * @returns {string}
 */
function toAccountComponent(text) {
  return String(text)
    .trim()
    .split(/[\s-]+/u)
    .filter(Boolean)
    .map((word) => (/^\d/u.test(word) ? word : `${word.charAt(0).toUpperCase()}${word.slice(1)}`))
    .join("-");
}

function rewardsAssetAccount(issuer, program) {
  return `Assets:Rewards:${toAccountComponent(issuer)}:${toAccountComponent(program)}`;
}

function creditCardAccount(label) {
  return `Liabilities:Credit-Cards:${toAccountComponent(label)}`;
}

function renderMetadata(metadata) {
  return Object.entries(metadata)
    .map(([key, value]) => `  ${key}: "${value}"`)
    .join("\n");
}

function renderPostingLine(posting) {
  const priceSuffix = posting.pricePerUnit !== undefined ? ` @ ${posting.pricePerUnit} USD` : "";
  return `  ${posting.account}  ${posting.amount} ${posting.commodity}${priceSuffix}`;
}

function renderRewardsTransaction({ date, narration, metadata, postings }) {
  const lines = [`${date} * "${narration}"`];
  const renderedMetadata = renderMetadata(metadata);
  if (renderedMetadata !== "") lines.push(renderedMetadata);
  for (const posting of postings) lines.push(renderPostingLine(posting));
  return lines.join("\n");
}

function validateEvent(event, index) {
  const context = `events[${index}]`;
  if (event === null || typeof event !== "object") throw new TypeError(`derive-set-of-rewards-postings: ${context} must be an object`);
  requireString(event.eventId, `${context}.eventId`);
  if (!EVENT_KINDS.has(event.kind)) throw new TypeError(`derive-set-of-rewards-postings: ${context}.kind must be one of ${[...EVENT_KINDS].join(", ")}`);
  requireDate(event.date, `${context}.date`);
  requireString(event.issuer, `${context}.issuer`);
  requireString(event.program, `${context}.program`);
  requireString(event.narration, `${context}.narration`);
  const commodityRequired = event.kind !== "statement-credit";
  if (commodityRequired) {
    requireString(event.commodity, `${context}.commodity`);
    requireDecimalString(event.amount, `${context}.amount`);
  } else {
    if (event.commodity !== null) throw new TypeError(`derive-set-of-rewards-postings: ${context}.commodity must be null for statement-credit`);
    if (event.amount !== null) throw new TypeError(`derive-set-of-rewards-postings: ${context}.amount must be null for statement-credit`);
  }
  if (event.kind === "redeemed") requireDecimalString(event.redemptionValueUsd, `${context}.redemptionValueUsd`);
  else if (event.redemptionValueUsd !== null) throw new TypeError(`derive-set-of-rewards-postings: ${context}.redemptionValueUsd must be null unless kind is redeemed`);
  if (event.kind === "transferred") requireString(event.destinationProgram, `${context}.destinationProgram`);
  else if (event.destinationProgram !== null) throw new TypeError(`derive-set-of-rewards-postings: ${context}.destinationProgram must be null unless kind is transferred`);
  if (event.kind === "statement-credit") {
    requireString(event.cardLabel, `${context}.cardLabel`);
    requireDecimalString(event.statementCreditUsd, `${context}.statementCreditUsd`);
  } else {
    if (event.cardLabel !== null) throw new TypeError(`derive-set-of-rewards-postings: ${context}.cardLabel must be null unless kind is statement-credit`);
    if (event.statementCreditUsd !== null) throw new TypeError(`derive-set-of-rewards-postings: ${context}.statementCreditUsd must be null unless kind is statement-credit`);
  }
}

function validatePriceDirectiveInput(directive, index) {
  const context = `priceDirectives[${index}]`;
  if (directive === null || typeof directive !== "object") throw new TypeError(`derive-set-of-rewards-postings: ${context} must be an object`);
  requireString(directive.symbol, `${context}.symbol`);
  requireDate(directive.date, `${context}.date`);
  requireDecimalString(directive.price, `${context}.price`);
}

function findPriceForCommodity(priceDirectives, symbol, asOfDate) {
  const candidates = priceDirectives.filter((entry) => entry.symbol === symbol && entry.date <= asOfDate);
  if (candidates.length === 0) return null;
  return candidates.reduce((latest, entry) => (entry.date > latest.date ? entry : latest));
}

function noteAccountUse(accountsToOpenByName, openAccounts, account, date) {
  if (openAccounts.has(account)) return;
  const existing = accountsToOpenByName.get(account);
  if (!existing || date < existing.date) accountsToOpenByName.set(account, { account, date });
}

function finishTransaction(event, postings, metadata, extra = {}) {
  return {
    eventId: event.eventId,
    kind: event.kind,
    date: event.date,
    narration: event.narration,
    directive: renderRewardsTransaction({ date: event.date, narration: event.narration, metadata: { ...metadata, ...extra }, postings }),
  };
}

/**
 * @typedef {Object} RewardEvent
 * @property {string} eventId
 * @property {"earned"|"redeemed"|"expired"|"transferred"|"statement-credit"} kind
 * @property {string} date
 * @property {string} issuer
 * @property {string} program
 * @property {string} narration
 * @property {string|null} commodity
 * @property {string|null} amount
 * @property {string|null} redemptionValueUsd
 * @property {string|null} destinationProgram
 * @property {string|null} cardLabel
 * @property {string|null} statementCreditUsd
 * @typedef {Object} PriceDirectiveInput
 * @property {string} symbol
 * @property {string} date
 * @property {string} price
 * @typedef {Object} RewardsPostingsRequest
 * @property {string} principalId
 * @property {RewardEvent[]} events
 * @property {PriceDirectiveInput[]} priceDirectives
 * @property {string[]} [openAccounts]
 * @typedef {Object} RewardsTransaction
 * @property {string} eventId
 * @property {string} kind
 * @property {string} date
 * @property {string} narration
 * @property {string} directive
 * @typedef {Object} RenderedPriceDirective
 * @property {string} symbol
 * @property {string} date
 * @property {string} price
 * @property {string} directive
 * @typedef {Object} AccountToOpen
 * @property {string} account
 * @property {string} date
 * @property {string} directive
 * @typedef {Object} SkippedEvent
 * @property {string} eventId
 * @property {string} reason
 * @typedef {Object} RewardsPostingSet
 * @property {"RewardsPostingSet"} type
 * @property {1} version
 * @property {string} principalId
 * @property {number} transactionCount
 * @property {RewardsTransaction[]} transactions
 * @property {number} priceDirectiveCount
 * @property {RenderedPriceDirective[]} priceDirectives
 * @property {AccountToOpen[]} accountsToOpen
 * @property {SkippedEvent[]} skipped
 */

/**
 * Derives Beancount transactions and price directives for a principal's reward events, keeping earned/redeemed/expired/transferred/statement-credit rewards as a multi-commodity double-entry ledger: earned posts the commodity from Income:Rewards, expired posts it to Expenses:Rewards:Expired, transferred moves it between two program accounts, statement-credit posts USD from Income:Rewards:Statement-Credits against the card's Liabilities account, and redeemed converts the commodity at the matching price directive's cost basis into Assets:Cash:Operating with the realized difference booked to Income:Rewards:Redemption-Gain or Expenses:Rewards:Redemption-Loss; a redemption with no covering price directive is skipped, and every referenced account gets one open directive.
 * @param {RewardsPostingsRequest} input A record with `principalId`, `events`, `priceDirectives`, and optional `openAccounts`.
 * @returns {RewardsPostingSet} The derived transactions, price directives, account-open directives, and skipped events.
 * @throws {TypeError} When the input, an event, or a price directive is malformed.
 */
export function deriveSetOfRewardsPostings(input) {
  if (input === null || typeof input !== "object") throw new TypeError("derive-set-of-rewards-postings: input must be an object");
  requireString(input.principalId, "input.principalId");
  if (!Array.isArray(input.events)) throw new TypeError("derive-set-of-rewards-postings: input.events must be an array");
  if (!Array.isArray(input.priceDirectives)) throw new TypeError("derive-set-of-rewards-postings: input.priceDirectives must be an array");
  input.events.forEach((event, index) => validateEvent(event, index));
  input.priceDirectives.forEach((directive, index) => validatePriceDirectiveInput(directive, index));
  const openAccounts = new Set(Array.isArray(input.openAccounts) ? input.openAccounts : []);

  const transactions = [];
  const skipped = [];
  const accountsToOpenByName = new Map();
  const note = (account, date) => noteAccountUse(accountsToOpenByName, openAccounts, account, date);

  for (const event of input.events) {
    const metadata = { event_id: event.eventId, principal_id: input.principalId, issuer: event.issuer, program: event.program };
    if (event.kind === "earned") {
      const assetAccount = rewardsAssetAccount(event.issuer, event.program);
      note(assetAccount, event.date);
      note("Income:Rewards", event.date);
      transactions.push(finishTransaction(event, [
        { account: assetAccount, amount: event.amount, commodity: event.commodity },
        { account: "Income:Rewards", amount: negateDecimalString(event.amount), commodity: event.commodity },
      ], metadata));
      continue;
    }
    if (event.kind === "expired") {
      const assetAccount = rewardsAssetAccount(event.issuer, event.program);
      note("Expenses:Rewards:Expired", event.date);
      note(assetAccount, event.date);
      transactions.push(finishTransaction(event, [
        { account: "Expenses:Rewards:Expired", amount: event.amount, commodity: event.commodity },
        { account: assetAccount, amount: negateDecimalString(event.amount), commodity: event.commodity },
      ], metadata));
      continue;
    }
    if (event.kind === "transferred") {
      const fromAccount = rewardsAssetAccount(event.issuer, event.program);
      const toAccount = rewardsAssetAccount(event.issuer, event.destinationProgram);
      note(toAccount, event.date);
      note(fromAccount, event.date);
      transactions.push(finishTransaction(event, [
        { account: toAccount, amount: event.amount, commodity: event.commodity },
        { account: fromAccount, amount: negateDecimalString(event.amount), commodity: event.commodity },
      ], metadata));
      continue;
    }
    if (event.kind === "statement-credit") {
      const cardAccount = creditCardAccount(event.cardLabel);
      note(cardAccount, event.date);
      note("Income:Rewards:Statement-Credits", event.date);
      transactions.push(finishTransaction(event, [
        { account: cardAccount, amount: event.statementCreditUsd, commodity: "USD" },
        { account: "Income:Rewards:Statement-Credits", amount: negateDecimalString(event.statementCreditUsd), commodity: "USD" },
      ], metadata));
      continue;
    }
    const priceEntry = findPriceForCommodity(input.priceDirectives, event.commodity, event.date);
    if (!priceEntry) {
      skipped.push({ eventId: event.eventId, reason: `no price directive on or before ${event.date} for commodity ${event.commodity}` });
      continue;
    }
    const assetAccount = rewardsAssetAccount(event.issuer, event.program);
    note(assetAccount, event.date);
    note("Assets:Cash:Operating", event.date);
    const costBasisUsd = multiplyDecimalStrings(event.amount, priceEntry.price);
    const difference = addDecimalStrings([event.redemptionValueUsd, negateDecimalString(costBasisUsd)]);
    const postings = [
      { account: assetAccount, amount: negateDecimalString(event.amount), commodity: event.commodity, pricePerUnit: priceEntry.price },
      { account: "Assets:Cash:Operating", amount: event.redemptionValueUsd, commodity: "USD" },
    ];
    if (compareDecimalStrings(difference, "0") !== 0) {
      const gain = compareDecimalStrings(difference, "0") > 0;
      const account = gain ? "Income:Rewards:Redemption-Gain" : "Expenses:Rewards:Redemption-Loss";
      note(account, event.date);
      postings.push({ account, amount: negateDecimalString(difference), commodity: "USD" });
    }
    transactions.push(finishTransaction(event, postings, metadata, {
      cost_basis_usd: costBasisUsd,
      redemption_value_usd: event.redemptionValueUsd,
      realized_difference_usd: difference,
    }));
  }

  const accountsToOpen = [...accountsToOpenByName.values()]
    .sort((a, b) => a.account.localeCompare(b.account))
    .map(({ account, date }) => ({ account, date, directive: `${date} open ${account}` }));

  const priceDirectives = input.priceDirectives.map((entry) => ({
    symbol: entry.symbol,
    date: entry.date,
    price: entry.price,
    directive: renderPriceDirective({ date: entry.date, symbol: entry.symbol, price: entry.price }),
  }));

  return Object.freeze({
    type: "RewardsPostingSet",
    version: 1,
    principalId: input.principalId,
    transactionCount: transactions.length,
    transactions: Object.freeze(transactions),
    priceDirectiveCount: priceDirectives.length,
    priceDirectives: Object.freeze(priceDirectives),
    accountsToOpen: Object.freeze(accountsToOpen),
    skipped: Object.freeze(skipped),
  });
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "derive-set-of-rewards-postings", description: "Derives Beancount transactions and price directives for a principal's reward events, keeping earned/redeemed/expired/transferred/statement-credit rewards as a multi-commodity double-entry ledger: earned posts the commodity from Income:Rewards, expired posts it to Expenses:Rewards:Expired, transferred moves it between two program accounts, statement-credit posts USD from Income:Rewards:Statement-Credits against the card's Liabilities account, and redeemed converts the commodity at the matching price directive's cost basis into Assets:Cash:Operating with the realized difference booked to Income:Rewards:Redemption-Gain or Expenses:Rewards:Redemption-Loss; a redemption with no covering price directive is skipped, and every referenced account gets one open directive.", operation: deriveSetOfRewardsPostings }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}

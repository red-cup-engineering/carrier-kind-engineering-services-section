#!/usr/bin/env node
import {
  addDecimalStrings,
  formatScaled,
  multiplyDecimalStrings,
  parseDecimal,
} from "@red-cup-engineering/computer-ledger-system-services-section/src/decimal.mjs";
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";

const HOME_CURRENCY = "USD";
const CHANNELS = new Set(["online", "in-store"]);
const RULE_CHANNELS = new Set(["online", "in-store", "any"]);
const CAP_PERIODS = new Set(["monthly", "quarterly", "annual"]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

function requireString(value, context) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`route-card-rewards: ${context} must be a non-empty string`);
  return value;
}

function requireNumber(value, context) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(`route-card-rewards: ${context} must be a finite number`);
  return value;
}

function requireDate(value, context) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) throw new TypeError(`route-card-rewards: ${context} must be a YYYY-MM-DD date string`);
  return value;
}

function requireDecimalString(value, context) {
  if (typeof value !== "string") throw new TypeError(`route-card-rewards: ${context} must be a plain decimal string`);
  try {
    parseDecimal(value);
  } catch {
    throw new TypeError(`route-card-rewards: ${context} must be a plain decimal string`);
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

function compareCapRemaining(a, b) {
  if (a === "unlimited" && b === "unlimited") return 0;
  if (a === "unlimited") return 1;
  if (b === "unlimited") return -1;
  return compareDecimalStrings(a, b);
}

function validateCategoryRule(rule, context) {
  if (rule === null || typeof rule !== "object") throw new TypeError(`route-card-rewards: ${context} must be an object`);
  requireString(rule.category, `${context}.category`);
  requireNumber(rule.multiplier, `${context}.multiplier`);
  if (rule.cap !== null) requireDecimalString(rule.cap, `${context}.cap`);
  if (rule.capPeriod !== null && !CAP_PERIODS.has(rule.capPeriod)) throw new TypeError(`route-card-rewards: ${context}.capPeriod must be "monthly", "quarterly", "annual", or null`);
  requireDecimalString(rule.capUsage, `${context}.capUsage`);
  if (!RULE_CHANNELS.has(rule.channel)) throw new TypeError(`route-card-rewards: ${context}.channel must be "online", "in-store", or "any"`);
}

function validateSignUpBonus(bonus, context) {
  if (bonus === null || typeof bonus !== "object") throw new TypeError(`route-card-rewards: ${context} must be an object or null`);
  requireString(bonus.commodity, `${context}.commodity`);
  requireDecimalString(bonus.remainingSpend, `${context}.remainingSpend`);
  requireDate(bonus.deadline, `${context}.deadline`);
}

function validateExpiringCredit(credit, context) {
  if (credit === null || typeof credit !== "object") throw new TypeError(`route-card-rewards: ${context} must be an object`);
  requireDecimalString(credit.amount, `${context}.amount`);
  requireString(credit.commodity, `${context}.commodity`);
  requireDate(credit.expiresBy, `${context}.expiresBy`);
  if (credit.appliesToCategory !== null) requireString(credit.appliesToCategory, `${context}.appliesToCategory`);
}

function validateCard(card, index) {
  const context = `mandate.cards[${index}]`;
  if (card === null || typeof card !== "object") throw new TypeError(`route-card-rewards: ${context} must be an object`);
  requireString(card.cardId, `${context}.cardId`);
  requireString(card.commodity, `${context}.commodity`);
  requireNumber(card.baseRate, `${context}.baseRate`);
  requireNumber(card.foreignTransactionFeeRate, `${context}.foreignTransactionFeeRate`);
  requireDecimalString(card.annualFee, `${context}.annualFee`);
  if (!Array.isArray(card.categories)) throw new TypeError(`route-card-rewards: ${context}.categories must be an array`);
  card.categories.forEach((rule, ruleIndex) => validateCategoryRule(rule, `${context}.categories[${ruleIndex}]`));
  if (card.signUpBonus !== null) validateSignUpBonus(card.signUpBonus, `${context}.signUpBonus`);
  if (!Array.isArray(card.expiringCredits)) throw new TypeError(`route-card-rewards: ${context}.expiringCredits must be an array`);
  card.expiringCredits.forEach((credit, creditIndex) => validateExpiringCredit(credit, `${context}.expiringCredits[${creditIndex}]`));
}

function validatePurchase(purchase) {
  if (purchase === null || typeof purchase !== "object") throw new TypeError("route-card-rewards: purchase must be an object");
  const amount = requireDecimalString(purchase.amount, "purchase.amount");
  const merchantCategory = requireString(purchase.merchantCategory, "purchase.merchantCategory");
  const currency = requireString(purchase.currency, "purchase.currency");
  const date = requireDate(purchase.date, "purchase.date");
  if (!CHANNELS.has(purchase.channel)) throw new TypeError('route-card-rewards: purchase.channel must be "online" or "in-store"');
  return { amount, merchantCategory, currency, date, channel: purchase.channel };
}

function ruleAppliesToChannel(rule, purchase) {
  return rule.channel === "any" || rule.channel === purchase.channel;
}

function matchCategoryRule(card, purchase) {
  return (
    card.categories.find((rule) => {
      if (rule.category !== purchase.merchantCategory) return false;
      if (!ruleAppliesToChannel(rule, purchase)) return false;
      if (rule.cap === null) return true;
      const projectedUsage = addDecimalStrings([rule.capUsage, purchase.amount]);
      return compareDecimalStrings(projectedUsage, rule.cap) <= 0;
    }) ?? null
  );
}

function cardBonusApplies(card, purchase) {
  if (!card.signUpBonus) return false;
  if (compareDecimalStrings(card.signUpBonus.remainingSpend, "0") <= 0) return false;
  return purchase.date <= card.signUpBonus.deadline;
}

function capRemainingFor(rule) {
  if (rule.cap === null) return "unlimited";
  return addDecimalStrings([rule.cap, negateDecimalString(rule.capUsage)]);
}

function scoreCard(card, purchase) {
  const bonus = cardBonusApplies(card, purchase);
  const matchedRule = matchCategoryRule(card, purchase);
  const rate = matchedRule ? matchedRule.multiplier : card.baseRate;
  const expectedReward = multiplyDecimalStrings(String(rate), purchase.amount);
  const isForeign = purchase.currency !== HOME_CURRENCY;
  const foreignTransactionFee = isForeign ? multiplyDecimalStrings(String(card.foreignTransactionFeeRate), purchase.amount) : "0";
  const reasonChain = [bonus ? "bonus-progress" : matchedRule ? "category-multiplier-under-cap" : "base-rate"];
  if (isForeign) reasonChain.push(card.foreignTransactionFeeRate > 0 ? "foreign-transaction-fee-applies" : "no-foreign-transaction-fee");
  return {
    cardId: card.cardId,
    commodity: card.commodity,
    expectedReward,
    bonusApplies: bonus,
    categoryApplied: matchedRule ? matchedRule.category : null,
    rewardRate: rate,
    foreignTransactionFee,
    capRemaining: matchedRule ? capRemainingFor(matchedRule) : "unlimited",
    reasonChain,
  };
}

function compareAlternatives(a, b) {
  if (a.bonusApplies !== b.bonusApplies) return a.bonusApplies ? -1 : 1;
  if (a.rewardRate !== b.rewardRate) return b.rewardRate - a.rewardRate;
  const feeCompare = compareDecimalStrings(a.foreignTransactionFee, b.foreignTransactionFee);
  if (feeCompare !== 0) return feeCompare;
  return compareCapRemaining(b.capRemaining, a.capRemaining);
}

/**
 * @typedef {Object} CardCategoryRule
 * @property {string} category
 * @property {number} multiplier
 * @property {string|null} cap
 * @property {"monthly"|"quarterly"|"annual"|null} capPeriod
 * @property {string} capUsage
 * @property {"online"|"in-store"|"any"} channel
 * @typedef {Object} SignUpBonus
 * @property {string} commodity
 * @property {string} remainingSpend
 * @property {string} deadline
 * @typedef {Object} ExpiringCredit
 * @property {string} amount
 * @property {string} commodity
 * @property {string} expiresBy
 * @property {string|null} appliesToCategory
 * @typedef {Object} CardMandate
 * @property {string} cardId
 * @property {string} commodity
 * @property {number} baseRate
 * @property {number} foreignTransactionFeeRate
 * @property {string} annualFee
 * @property {CardCategoryRule[]} categories
 * @property {SignUpBonus|null} signUpBonus
 * @property {ExpiringCredit[]} expiringCredits
 * @typedef {Object} CardPurchaseIntent
 * @property {string} amount
 * @property {string} merchantCategory
 * @property {string} currency
 * @property {string} date
 * @property {"online"|"in-store"} channel
 * @typedef {Object} RouteCardRewardsRequest
 * @property {{ cards: CardMandate[] }} mandate
 * @property {CardPurchaseIntent} purchase
 * @typedef {Object} RoutingAlternative
 * @property {string} cardId
 * @property {string} commodity
 * @property {string} expectedReward
 * @property {boolean} bonusApplies
 * @property {string|null} categoryApplied
 * @property {number} rewardRate
 * @property {string} foreignTransactionFee
 * @property {string} capRemaining
 * @property {string[]} reasonChain
 * @typedef {Object} CardRewardsRoutingDecision
 * @property {"CardRewardsRoutingDecision"} type
 * @property {1} version
 * @property {CardPurchaseIntent} purchase
 * @property {RoutingAlternative|null} chosen
 * @property {RoutingAlternative[]} alternatives
 * @property {{ code: string, message: string }|null} refusal
 */

/**
 * Routes one purchase to the best of a principal's connected cards: bonus-progress outranks an in-cap category multiplier, which outranks the base rate, and ties break on the lower foreign-transaction fee then the most cap headroom; every card is scored, and a mandate naming no cards refuses.
 * @param {RouteCardRewardsRequest} request A record with `mandate.cards` and `purchase`.
 * @returns {CardRewardsRoutingDecision} The ranked routing decision.
 * @throws {TypeError} When the mandate or purchase is malformed.
 */
export function routeCardRewards(request) {
  if (request === null || typeof request !== "object") throw new TypeError("route-card-rewards: request must be an object");
  const { mandate, purchase } = request;
  if (mandate === null || typeof mandate !== "object" || !Array.isArray(mandate.cards)) {
    throw new TypeError("route-card-rewards: mandate.cards must be an array");
  }
  mandate.cards.forEach((card, index) => validateCard(card, index));
  const validPurchase = validatePurchase(purchase);
  if (mandate.cards.length === 0) {
    return Object.freeze({
      type: "CardRewardsRoutingDecision",
      version: 1,
      purchase: validPurchase,
      chosen: null,
      alternatives: [],
      refusal: { code: "NO_CARD_AVAILABLE", message: "route-card-rewards: the mandate names no card that can carry this purchase" },
    });
  }
  const alternatives = mandate.cards.map((card) => scoreCard(card, validPurchase));
  alternatives.sort(compareAlternatives);
  return Object.freeze({
    type: "CardRewardsRoutingDecision",
    version: 1,
    purchase: validPurchase,
    chosen: alternatives[0],
    alternatives,
    refusal: null,
  });
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "route-card-rewards", description: "Routes one purchase to the best of a principal's connected cards: bonus-progress outranks an in-cap category multiplier, which outranks the base rate, and ties break on the lower foreign-transaction fee then the most cap headroom; every card is scored, and a mandate naming no cards refuses.", operation: routeCardRewards }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}

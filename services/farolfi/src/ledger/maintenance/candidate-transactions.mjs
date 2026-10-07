const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/u;
const FRACTION_PATTERN = /^(-?\d+)\/(\d+)$/u;
const DECIMAL_PATTERN = /^-?\d+(?:\.\d+)?$/u;
/** Where a chain-witnessed increase no record explains is counter-posted. */
export const INCREASE_ACCOUNT = "Income:Investment:Unrealized-Gains";
/** Where a chain-witnessed decrease no record explains is counter-posted. */
export const DECREASE_ACCOUNT = "Expenses:Investment:Unrealized-Losses";

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

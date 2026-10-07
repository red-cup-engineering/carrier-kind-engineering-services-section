/**
 * accounting/treasury — money moves only by declared, receipted acts (561 Group note of 2026-10-03,
 * "One outcome path", debt 9; the finance stack's law of capital, 2026-09-04: mandate, data as of,
 * risk-sized intent, authorization, venue instruction, reconciliation; the authority envelope sits
 * outside the model).
 *
 * A treasury act is a declared intent to move money: from one held account to another, of one asset,
 * by one amount, for a stated purpose, along a stated route. Declaring it moves nothing. It is
 * planned first, on paper, exactly as its signer would run it. It is authorized only by a standing
 * mandate: an agency deontic power over the office that acts (`deontic-powers`, e.g. a grant to the
 * chief financial officer), naming the account it may move from, its limits and when it lapses. An
 * act no mandate covers stays paper. An authorized act is executed by the one signer the mandate
 * names, never here, and is settled only when two independent readings of the venue corroborate
 * its receipt; then, and only then, the books record it, with the mandate's id.
 *
 * Nothing here signs, broadcasts or reads a key. Everything here is a reading of records: the act,
 * the mandates, the registry of the Group's own accounts, the quote it was sized at, and the
 * receipts.
 * @packageDocumentation
 */
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { makeNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";

/** The stages a treasury act passes through; a refusal can end it at any stage before execution. */
export const TREASURY_STAGES = Object.freeze(["paper", "authorized", "executed", "settled", "refused"]);

/** The kinds of act: a transfer between accounts, a sweep of earnings to where they are held, a payout to a party. */
export const TREASURY_KINDS = Object.freeze(["transfer", "sweep", "payout"]);

const text = (value) => typeof value === "string" && value.trim() !== "";
const DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d+)?$/u;
const INSTANT = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/u;
const sameAccount = (left, right) => left?.venue === right?.venue && String(left?.address ?? "").toLowerCase() === String(right?.address ?? "").toLowerCase();

function accountOf(value, what) {
  if (!text(value?.venue) || !text(value?.address)) throw new TypeError(`a treasury act's ${what} is {venue, address}`);
  return Object.freeze({ venue: value.venue, address: value.address, ...(text(value.ledgerAccount) ? { ledgerAccount: value.ledgerAccount } : {}) });
}

/**
 * The one treasury act record: `kind`, `from` and `to` (`{venue, address, ledgerAccount?}`), `asset`,
 * `amount` (decimal text), `purpose` (why, in one statement), `route` (the hops a signer runs, each
 * `{venue, action}`; one hop for a transfer on one venue), `office` (who acts) and `at` (when
 * declared). Its id is the content address of the rest, so one act declared twice is one act.
 */
export function treasuryActOf(input) {
  if (!TREASURY_KINDS.includes(input?.kind)) throw new TypeError(`a treasury act's kind is one of ${TREASURY_KINDS.join(", ")}`);
  if (!DECIMAL.test(String(input.amount ?? "")) || Number(input.amount) <= 0) throw new TypeError("a treasury act moves a positive decimal amount");
  if (!text(input.asset) || !text(input.purpose) || !text(input.office)) throw new TypeError("a treasury act names its asset, its purpose and the office that acts");
  if (!INSTANT.test(input.at ?? "")) throw new TypeError("a treasury act's at is an ISO instant in UTC");
  const route = (input.route ?? []).map((hop) => {
    if (!text(hop?.venue) || !text(hop?.action)) throw new TypeError("each hop of a treasury act's route is {venue, action}");
    return Object.freeze({ venue: hop.venue, action: hop.action, ...(text(hop.via) ? { via: hop.via } : {}) });
  });
  if (route.length === 0) throw new TypeError("a treasury act states the route its signer would run");
  const body = {
    kind: input.kind, from: accountOf(input.from, "from"), to: accountOf(input.to, "to"), asset: input.asset,
    amount: String(input.amount), purpose: input.purpose, route, office: input.office, at: input.at,
  };
  return Object.freeze({ id: makeNiUri(Buffer.from(canonicalJson(body), "utf8")), ...body });
}

/** A mandate's per-act value limit, `"25 USD at the pre-trade quote"`, as `{amount, currency}`; undefined when it states none. */
export function perActLimitOf(power) {
  const match = /^\s*((?:0|[1-9]\d*)(?:\.\d+)?)\s+([A-Z]{3,5})\b/u.exec(String(power?.limits?.max_value_per_transaction ?? ""));
  return match === null ? undefined : Object.freeze({ amount: match[1], currency: match[2] });
}

/**
 * Why a mandate does not cover an act, or nothing when it does: it must be over the acting office,
 * on the account the act moves from, not yet lapsed, the act's quoted value within its per-act
 * limit, and, when the mandate allows no outbound transfer outside the Group (its standing flows say
 * so), the destination one of the Group's own accounts.
 * @param {object} power an agency deontic power record
 * @param {object} act a treasury act
 * @param {{at: string, quote?: {amount: string, currency: string}, groupAccounts?: Set<string>}} reading
 */
export function mandateRefusalsOf(power, act, { at, quote, groupAccounts = new Set() } = {}) {
  const refusals = [];
  if (power?.over !== act.office) refusals.push(`over ${power?.over ?? "no office"}, not ${act.office}`);
  if (!sameAccount(power?.account, act.from)) refusals.push(`over account ${power?.account?.venue}:${power?.account?.address}, not ${act.from.venue}:${act.from.address}`);
  if (text(power?.valid_until) && at.slice(0, 10) > power.valid_until) refusals.push(`lapsed ${power.valid_until}`);
  const limit = perActLimitOf(power);
  if (limit === undefined) refusals.push("states no per-act limit");
  else if (quote === undefined || quote.currency !== limit.currency) refusals.push(`act unquoted in ${limit.currency}`);
  else if (Number(quote.amount) > Number(limit.amount)) refusals.push(`act quoted ${quote.amount} ${quote.currency} beyond its ${limit.amount} ${limit.currency} limit`);
  const insideOnly = /no outbound transfer to an address outside/iu.test(String(power?.limits?.standing_flows ?? ""));
  if (insideOnly && !groupAccounts.has(String(act.to.address).toLowerCase())) refusals.push("allows no transfer outside the Group's own accounts");
  return Object.freeze(refusals);
}

/**
 * An act's authorization: the first mandate that covers it (`mandateRefusalsOf` finds nothing), as
 * `{stage: "authorized", mandate}`, else `{stage: "paper", refusals}` naming why each mandate did not.
 * An act no mandate covers is still a plan: it stays on paper, and nothing executes it.
 */
export function authorizationOf(act, powers = [], reading = {}) {
  const refusals = [];
  for (const power of powers) {
    const against = mandateRefusalsOf(power, act, reading);
    if (against.length === 0) return Object.freeze({ act: act.id, stage: "authorized", mandate: power.id, signer: power.account?.signer ?? null });
    refusals.push(Object.freeze({ mandate: power.id, refusals: against }));
  }
  return Object.freeze({ act: act.id, stage: "paper", refusals: Object.freeze(refusals) });
}

/**
 * An act's settlement: executed when its signer's receipt names it, settled only when two
 * independent readings of the venue agree on that receipt (the same transaction, success, the same
 * amount to the same destination). Anything less leaves it executed, unsettled, and unbooked.
 * @param {object} act
 * @param {{transaction: string, readings: ReadonlyArray<{provider: string, transaction: string, status: string, amount: string, to: string}>}} receipt
 */
export function settlementOf(act, receipt) {
  if (!text(receipt?.transaction)) return Object.freeze({ act: act.id, stage: "authorized" });
  const agreeing = (receipt.readings ?? []).filter((reading) => reading.transaction === receipt.transaction && reading.status === "success"
    && reading.amount === act.amount && String(reading.to).toLowerCase() === String(act.to.address).toLowerCase());
  const providers = new Set(agreeing.map((reading) => reading.provider));
  return Object.freeze({ act: act.id, stage: providers.size >= 2 ? "settled" : "executed", transaction: receipt.transaction, corroboratedBy: Object.freeze([...providers].sort()) });
}

/**
 * The plan a sweep of earnings makes: when an account's holding of an asset exceeds what it keeps
 * (`keep`), one act moving the excess to where the Group holds it, along the route the venues offer.
 * A holding at or under its keep, or a sweep with no route, plans nothing and says why.
 */
export function sweepPlanOf({ from, to, asset, holding, keep = "0", route = [], office, purpose, at }) {
  const excess = Number(holding) - Number(keep);
  if (!(excess > 0)) return Object.freeze({ acts: Object.freeze([]), why: `${asset} holding ${holding} is within its keep of ${keep}` });
  if (route.length === 0) return Object.freeze({ acts: Object.freeze([]), why: `no route is declared from ${from.venue} to ${to.venue}` });
  const amount = excess.toFixed(Math.max(0, (String(holding).split(".")[1] ?? "").length));
  return Object.freeze({ acts: Object.freeze([treasuryActOf({ kind: "sweep", from, to, asset, amount, purpose: purpose ?? `sweep ${asset} earnings above ${keep} to ${to.venue}`, route, office, at })]) });
}

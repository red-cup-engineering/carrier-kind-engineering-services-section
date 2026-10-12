/**
 * Allowances: perishable, renewing capacity an account holds with a provider, read against what was
 * spent from it, so an enterprise can size its consumption to it.
 *
 * A subscription sells capacity, not work: so many generations per window, credits per day, a
 * share of compute per five hours. Its marginal cash cost is zero and what is not spent before the
 * window turns is lost, so the question an enterprise asks of it is never "may I?" but "what
 * lapses if I don't?" — revenue management's perishable inventory, a scheduler's backfill. Quota
 * is not a failure: a refusal is evidence about the allowance, read like any other.
 *
 * An allowance declares its meters — each a budget under a law of renewal:
 *   - `sliding` (hours): the window is the last `hours`; capacity frees as old spends age out.
 *   - `from-first-spend` (hours): a window opens at the first spend after the last one closed.
 *   - `period` (every day | week | month, or `minutes`, from `anchor`): fixed periods; a billing cycle.
 *   - `stated` (hours): the provider states the window itself, its level and when it resets, as a
 *     subscription's rate-limit report does (Claude's five-hour and seven-day windows, Codex's
 *     weekly one). Its window and level are read off the latest `reading`, never derived from the
 *     house's own spends, since the account's other sessions draw on it too.
 * and how a spend draws on them: `every` (a spend counts against each meter, as a five-hour
 * window under a weekly cap) or `first` (meters drain in order, as daily credits before monthly).
 *
 * And how the provider admits work against it: `whole` (a unit goes through only if all of it fits
 * what is left, as credits) or `open` (work goes through while the window is not exhausted and is
 * charged as it runs, so the last unit may overdraw it, as compute windows: Gemini Notebook's, or
 * this house's own model plans). Under `open`, a spend that went through says only that what had
 * been charged by then was short of the budget, and with charges landing as work runs that is
 * never a bound on what was submitted; so only refusals, priors and balances teach it.
 *
 * Providers often keep the price of a kind of work, and even a meter's budget, to themselves. An
 * unknown is an interval, never zero: [0, ∞) until evidence narrows it. Every spend that went
 * through bounds costs from above and budgets from below; every refusal bounds them the other way.
 * Interval propagation over those linear constraints (box consistency) learns what the provider
 * will not say. A prior — the founder's "one cinematic and two explainers a window" — enters as a
 * constraint of lower rank, dropped first when observation contradicts it; one may say a bundle
 * fits a fresh window (`fits`) or that it does not (`exceeds`: "one cinematic and a bit" is that a
 * cinematic fits and a cinematic and an explainer do not). If observation
 * contradicts itself (the provider changed its limits), the reading is contested, not guessed.
 * Only `every` allowances learn; a `first` one declares its prices and is read by drawing them,
 * from its latest balance where the provider shows one.
 *
 * Whether a kind fits now is a FOUR reading in the extremal family: held, denied, unknown or
 * contested; across `every` meters it is their truth meet.
 */
import { readingOfSides, truthMeetReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";

const HOUR = 3_600_000;
const STEP = Object.freeze({ day: 24 * HOUR, week: 7 * 24 * HOUR });
const EPS = 1e-9;
const FIT = Object.freeze({ held: readingOfSides("extremal", true, false), denied: readingOfSides("extremal", false, true), unknown: readingOfSides("extremal", false, false), contested: readingOfSides("extremal", true, true) });

const nonEmpty = (value) => typeof value === "string" && value.length > 0;
const instant = (value, what) => {
  const ms = typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(ms)) throw new TypeError(`${what}: an ISO instant`);
  return ms;
};
const iso = (ms) => (ms === null || !Number.isFinite(ms) ? null : new Date(ms).toISOString());
const span = (lo, hi) => Object.freeze({ lo, hi: hi === Infinity ? null : hi });

// — declarations —

function admitMeter(meter, index, draws) {
  const what = `allowance meter ${index}`;
  if (meter === null || typeof meter !== "object") throw new TypeError(`${what}: an object`);
  if (!nonEmpty(meter.id)) throw new TypeError(`${what}: id`);
  const budget = meter.budget ?? null;
  if (budget !== null && !(typeof budget === "number" && budget >= 0)) throw new TypeError(`${what}: budget is a non-negative number or null (unknown)`);
  if (draws === "first" && budget === null) throw new TypeError(`${what}: meters drawn first-available must declare their budget`);
  const base = { id: meter.id, law: meter.law, budget, ...(nonEmpty(meter.because) ? { because: meter.because } : {}) };
  if (meter.law === "sliding" || meter.law === "from-first-spend") {
    if (!(typeof meter.hours === "number" && meter.hours > 0)) throw new TypeError(`${what}: hours`);
    if (draws === "first" && meter.law === "sliding") throw new TypeError(`${what}: a sliding meter cannot be drawn first-available`);
    return Object.freeze({ ...base, hours: meter.hours });
  }
  if (meter.law === "stated") {
    if (!(typeof meter.hours === "number" && meter.hours > 0)) throw new TypeError(`${what}: hours`);
    if (budget === null) throw new TypeError(`${what}: a stated meter declares the budget its readings are stated against`);
    if (draws === "first") throw new TypeError(`${what}: a stated meter cannot be drawn first-available`);
    return Object.freeze({ ...base, hours: meter.hours });
  }
  if (meter.law === "period") {
    const every = meter.every ?? (typeof meter.minutes === "number" && meter.minutes > 0 ? meter.minutes : undefined);
    if (!(every in STEP || every === "month" || typeof every === "number")) throw new TypeError(`${what}: every is day, week or month, or minutes is a positive number`);
    return Object.freeze({ ...base, every, anchor: new Date(instant(meter.anchor, `${what} anchor`)).toISOString() });
  }
  throw new TypeError(`${what}: law is sliding, from-first-spend, period or stated`);
}

function admitCost(value, kind) {
  if (value === null || value === undefined) return Object.freeze([0, Infinity]);
  if (typeof value === "number" && value >= 0) return Object.freeze([value, value]);
  if (Array.isArray(value) && value.length === 2 && value[0] >= 0 && (value[1] === null || value[1] >= value[0])) return Object.freeze([value[0], value[1] ?? Infinity]);
  throw new TypeError(`allowance cost ${kind}: a number, [lo, hi|null] or null (unknown)`);
}

/**
 * One allowance declaration, checked: `{id, account, product, unit, draws, meters, costs, priors?,
 * admits?, because}`. `costs` names every kind of work the allowance meters, each a number, an
 * interval or null; a kind it does not name it does not meter. `admits` is `whole` (the default)
 * or `open`. `priors` are bundles believed to fit one fresh window of a meter, `{meter, fits:
 * {kind: count}, because}`, or believed not to, `{meter, exceeds: {kind: count}, because}`.
 */
export function admitAllowance(value) {
  if (value === null || typeof value !== "object") throw new TypeError("allowance: an object");
  for (const field of ["id", "account", "product", "unit", "because"]) if (!nonEmpty(value[field])) throw new TypeError(`allowance: ${field}`);
  const draws = value.draws ?? "every";
  if (draws !== "every" && draws !== "first") throw new TypeError("allowance: draws is every or first");
  const admits = value.admits ?? "whole";
  if (admits !== "whole" && admits !== "open") throw new TypeError("allowance: admits is whole or open");
  if (admits === "open" && draws === "first") throw new TypeError("allowance: a first-available pool admits whole draws");
  if (!Array.isArray(value.meters) || value.meters.length === 0) throw new TypeError("allowance: at least one meter");
  const meters = value.meters.map((meter, index) => admitMeter(meter, index, draws));
  if (new Set(meters.map((meter) => meter.id)).size !== meters.length) throw new TypeError("allowance: meter ids are distinct");
  if (value.costs === null || typeof value.costs !== "object" || Object.keys(value.costs).length === 0) throw new TypeError("allowance: costs name the kinds it meters");
  const costs = Object.freeze(Object.fromEntries(Object.entries(value.costs).map(([kind, cost]) => [kind, admitCost(cost, kind)])));
  const priors = Object.freeze((value.priors ?? []).map((prior, index) => {
    if (!meters.some((meter) => meter.id === prior?.meter)) throw new TypeError(`allowance prior ${index}: names one of its meters`);
    const sense = "fits" in prior ? "fits" : "exceeds" in prior ? "exceeds" : null;
    if (sense === null || ("fits" in prior && "exceeds" in prior)) throw new TypeError(`allowance prior ${index}: either fits or exceeds`);
    const bundle = Object.entries(prior[sense] ?? {});
    if (bundle.length === 0 || !bundle.every(([kind, count]) => kind in costs && Number.isSafeInteger(count) && count > 0)) throw new TypeError(`allowance prior ${index}: ${sense} counts metered kinds`);
    if (!nonEmpty(prior.because)) throw new TypeError(`allowance prior ${index}: because`);
    return Object.freeze({ meter: prior.meter, [sense]: Object.freeze(Object.fromEntries(bundle)), because: prior.because });
  }));
  return Object.freeze({ id: value.id, account: value.account, product: value.product, unit: value.unit, draws, admits, meters: Object.freeze(meters), costs, priors, because: value.because });
}

/**
 * Evidence about an allowance, in time order: spends (`{type: "spend", kind, at, count?}`, work the
 * provider accepted), refusals (`{type: "refusal", kind, at}`, work it declined for want of
 * capacity, naming the `meter` when the provider says which), balances (`{type: "balance", at,
 * remaining}`, what a first-available pool's provider shows is left of it, all meters together),
 * and readings (`{type: "reading", meter, at, used, resetsAt}`, what the provider states of one
 * stated meter: `used` of its budget, in the allowance's unit, in the window that resets at
 * `resetsAt`). A failure for any other reason is not evidence about capacity and has no place here.
 */
export function admitAllowanceEvidence(list) {
  if (!Array.isArray(list)) throw new TypeError("allowance evidence: a list");
  return Object.freeze(list.map((entry, index) => {
    if (entry?.type === "balance") {
      if (!(typeof entry.remaining === "number" && entry.remaining >= 0)) throw new TypeError(`allowance evidence ${index}: a balance's remaining is a non-negative number`);
      return Object.freeze({ type: "balance", at: instant(entry.at, `allowance evidence ${index} at`), remaining: entry.remaining, ...(nonEmpty(entry.source) ? { source: entry.source } : {}) });
    }
    if (entry?.type === "reading") {
      if (!nonEmpty(entry.meter)) throw new TypeError(`allowance evidence ${index}: a reading names its meter`);
      if (!(typeof entry.used === "number" && entry.used >= 0)) throw new TypeError(`allowance evidence ${index}: a reading's used is a non-negative number`);
      return Object.freeze({ type: "reading", meter: entry.meter, at: instant(entry.at, `allowance evidence ${index} at`), used: entry.used, resetsAt: instant(entry.resetsAt, `allowance evidence ${index} resetsAt`), ...(nonEmpty(entry.source) ? { source: entry.source } : {}) });
    }
    if (entry?.type !== "spend" && entry?.type !== "refusal") throw new TypeError(`allowance evidence ${index}: type spend, refusal, balance or reading`);
    if (!nonEmpty(entry.kind)) throw new TypeError(`allowance evidence ${index}: kind`);
    const count = entry.count ?? 1;
    if (!Number.isSafeInteger(count) || count < 1) throw new TypeError(`allowance evidence ${index}: count`);
    if (entry.meter !== undefined && (entry.type !== "refusal" || !nonEmpty(entry.meter))) throw new TypeError(`allowance evidence ${index}: only a refusal names the meter that refused`);
    return Object.freeze({ type: entry.type, kind: entry.kind, at: instant(entry.at, `allowance evidence ${index} at`), count, ...(entry.meter === undefined ? {} : { meter: entry.meter }), ...(nonEmpty(entry.source) ? { source: entry.source } : {}) });
  }).sort((a, b) => a.at - b.at));
}

// — windows —

/** The anchor moved `n` calendar months, its day of month clamped to the month's last. */
function monthsFrom(anchor, n) {
  const a = new Date(anchor);
  const first = Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + n, 1, a.getUTCHours(), a.getUTCMinutes(), a.getUTCSeconds(), a.getUTCMilliseconds());
  const d = new Date(first);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  return first + (Math.min(a.getUTCDate(), last) - 1) * STEP.day;
}

/** The [start, end) of the period of `meter` holding `t`. */
function periodOf(meter, t) {
  const anchor = Date.parse(meter.anchor);
  if (meter.every !== "month") {
    const step = typeof meter.every === "number" ? meter.every * 60_000 : STEP[meter.every];
    const start = anchor + Math.floor((t - anchor) / step) * step;
    return [start, start + step];
  }
  const a = new Date(anchor);
  const b = new Date(t);
  let n = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth();
  while (monthsFrom(anchor, n) > t) n -= 1;
  while (monthsFrom(anchor, n + 1) <= t) n += 1;
  return [monthsFrom(anchor, n), monthsFrom(anchor, n + 1)];
}

/**
 * The window of `meter` that holds instant `t`, given the times of the spends before it:
 * `{opensAt, resetsAt, holds(s)}`, with `holds` true of a spend at `s` counted in it. A
 * from-first-spend meter with no open window reads opensAt and resetsAt null and holds nothing.
 */
export function meterWindow(meter, spendTimes, t) {
  if (meter.law === "sliding") {
    const from = t - meter.hours * HOUR;
    const inside = spendTimes.filter((s) => s > from && s <= t);
    return Object.freeze({ opensAt: from, resetsAt: inside.length === 0 ? null : Math.min(...inside) + meter.hours * HOUR, clearsAt: inside.length === 0 ? null : Math.max(...inside) + meter.hours * HOUR, holds: (s) => s > from && s <= t });
  }
  if (meter.law === "period") {
    const [start, end] = periodOf(meter, t);
    return Object.freeze({ opensAt: start, resetsAt: end, clearsAt: end, holds: (s) => s >= start && s <= t });
  }
  let opened = null;
  for (const s of spendTimes) if (s <= t && (opened === null || s >= opened + meter.hours * HOUR)) opened = s;
  if (opened === null || t >= opened + meter.hours * HOUR) return Object.freeze({ opensAt: null, resetsAt: null, clearsAt: null, holds: () => false });
  const end = opened + meter.hours * HOUR;
  return Object.freeze({ opensAt: opened, resetsAt: end, clearsAt: end, holds: (s) => s >= opened && s <= t });
}

/** The window of a stated meter holding `t`: the one the latest reading at or before `t` states,
 *  while it has not reset, with that reading; else unknown. */
function statedWindow(meter, readings, t) {
  const latest = readings.filter((reading) => reading.meter === meter.id && reading.at <= t).at(-1);
  if (latest === undefined || latest.resetsAt <= t) return Object.freeze({ opensAt: null, resetsAt: null, clearsAt: null, reading: null, holds: () => false });
  const opensAt = latest.resetsAt - meter.hours * HOUR;
  return Object.freeze({ opensAt, resetsAt: latest.resetsAt, clearsAt: latest.resetsAt, reading: latest, holds: (s) => s >= latest.at && s <= t });
}

// — learning: interval propagation over Σ a·x ≤ 0 —

const costVar = (kind) => `cost:${kind}`;
const budgetVar = (meter) => `budget:${meter}`;

function initialBounds(allowance) {
  const bounds = new Map();
  for (const [kind, [lo, hi]] of Object.entries(allowance.costs)) bounds.set(costVar(kind), [lo, hi]);
  for (const meter of allowance.meters) bounds.set(budgetVar(meter.id), meter.budget === null ? [0, Infinity] : [meter.budget, meter.budget]);
  return bounds;
}

/** Terms Σ count·cost − budget for the metered spends `within`, in `meter`. */
function loadTerms(allowance, meter, within, extra) {
  const terms = new Map([[budgetVar(meter.id), -1]]);
  for (const spend of within) if (spend.kind in allowance.costs) terms.set(costVar(spend.kind), (terms.get(costVar(spend.kind)) ?? 0) + spend.count);
  if (extra !== undefined) terms.set(costVar(extra), (terms.get(costVar(extra)) ?? 0) + 1);
  return terms;
}
const negate = (terms) => new Map([...terms].map(([v, a]) => [v, -a]));

/**
 * The constraints evidence puts on prices and budgets, each kept with the meter and load it is
 * about: every spend's window load went through (Σ count·cost ≤ budget); every refusal's load plus
 * the refused unit did not, in at least one meter (Σ count·cost + cost > budget). Under `open`
 * admission spends bound nothing, and a refusal says the load already in the window had exhausted
 * it (Σ count·cost ≥ budget). A prior's bundle fits (≤) or exceeds (>) a fresh window; a row that
 * says a load does not go through is marked `refused`.
 */
function constraintsOf(allowance, evidence, { priors }) {
  const rows = [];
  const disjunctions = [];
  // A first-available spend overflows one meter into the next, so no single meter's window bounds
  // it; such an allowance declares its prices and budgets and is read by drawing, not learned.
  if (allowance.draws === "first") return { rows, disjunctions };
  const spends = evidence.filter((entry) => entry.type === "spend" && entry.kind in allowance.costs);
  const times = spends.map((spend) => spend.at);
  // A stated meter's level is the provider's to state; the house's spends are only part of it.
  const learnable = allowance.meters.filter((meter) => meter.law !== "stated");
  for (const meter of learnable) {
    for (const spend of spends) {
      if (!(spend.kind in allowance.costs)) continue;
      if (allowance.admits === "open") break;
      const window = meterWindow(meter, times, spend.at);
      rows.push({ meter: meter.id, terms: loadTerms(allowance, meter, spends.filter((s) => s.at <= spend.at && window.holds(s.at))) });
    }
  }
  for (const refusal of evidence.filter((entry) => entry.type === "refusal" && entry.kind in allowance.costs)) {
    const explaining = learnable.filter((meter) => refusal.meter === undefined || meter.id === refusal.meter);
    if (explaining.length === 0) continue;
    disjunctions.push(explaining.map((meter) => {
      const window = meterWindow(meter, times, refusal.at);
      return { meter: meter.id, terms: negate(loadTerms(allowance, meter, spends.filter((s) => s.at <= refusal.at && window.holds(s.at)), allowance.admits === "open" ? undefined : refusal.kind)) };
    }));
  }
  if (priors) for (const prior of allowance.priors) {
    const terms = new Map([[budgetVar(prior.meter), -1]]);
    for (const [kind, count] of Object.entries(prior.fits ?? prior.exceeds)) terms.set(costVar(kind), count);
    rows.push(prior.fits ? { meter: prior.meter, terms } : { meter: prior.meter, terms: negate(terms), refused: true });
  }
  return { rows, disjunctions };
}

/** A row's load: kind → count, read off its cost terms. */
const loadOf = (terms) => new Map([...terms].filter(([v]) => v.startsWith("cost:")).map(([v, a]) => [v.slice("cost:".length), Math.abs(a)]));

const minTerm = (a, [lo, hi]) => (a > 0 ? a * lo : a * hi);
const rowMin = (terms, bounds) => [...terms].reduce((sum, [v, a]) => sum + minTerm(a, bounds.get(v)), 0);

/** The one disjunct a refusal can still be explained by, null if several, false if none. */
function soleDisjunct(rows, bounds) {
  const open = rows.filter(({ terms }) => rowMin(terms, bounds) <= EPS);
  return open.length === 1 ? open[0] : open.length === 0 ? false : null;
}

function propagate(allowance, { rows, disjunctions }) {
  const bounds = initialBounds(allowance);
  for (let pass = 0; pass < 256; pass += 1) {
    let changed = false;
    const active = rows.map(({ terms }) => terms);
    for (const disjunction of disjunctions) {
      const sole = soleDisjunct(disjunction, bounds);
      if (sole === false) return { bounds, contested: true };
      if (sole !== null) active.push(sole.terms);
    }
    for (const terms of active) {
      for (const [v, a] of terms) {
        let others = 0;
        for (const [u, b] of terms) if (u !== v) others += minTerm(b, bounds.get(u));
        if (!Number.isFinite(others)) continue;
        const [lo, hi] = bounds.get(v);
        if (a > 0) { const top = -others / a; if (top < hi - EPS) { bounds.set(v, [lo, top]); changed = true; } }
        else { const bottom = -others / a; if (bottom > lo + EPS) { bounds.set(v, [bottom, hi]); changed = true; } }
        const [nlo, nhi] = bounds.get(v);
        if (nlo > nhi + EPS) return { bounds, contested: true };
      }
    }
    if (!changed) break;
  }
  return { bounds, contested: false };
}

/**
 * What the evidence teaches about an allowance's hidden prices and budgets: per-kind cost and
 * per-meter budget intervals; per meter, the loads known to have gone through and the loads known
 * to have been refused; whether the priors held up; and whether observation is contested.
 *
 * The intervals alone forget that a refusal bounds a sum: they cannot say the very load refused an
 * hour ago is refused still. The loads keep it, read by dominance — a load no larger, kind by kind,
 * than one that went through goes through; one at least as large as a refused load is refused.
 * A refusal that more than one meter could explain keeps its loads together in `either`: whichever
 * meter refused, loads at least as large in every one of them are refused too.
 */
export function learnAllowance(allowance, evidence) {
  const withPriors = constraintsOf(allowance, evidence, { priors: true });
  const first = propagate(allowance, withPriors);
  const kept = first.contested && allowance.priors.length > 0 ? constraintsOf(allowance, evidence, { priors: false }) : withPriors;
  const learned = kept === withPriors ? first : propagate(allowance, kept);
  const priors = allowance.priors.length === 0 ? "none" : first.contested ? (learned.contested ? "undecided" : "dropped") : "held";
  const loads = Object.fromEntries(allowance.meters.map((meter) => [meter.id, { accepted: [], refused: [] }]));
  const either = [];
  if (!learned.contested) {
    for (const { meter, terms, refused } of kept.rows) loads[meter][refused ? "refused" : "accepted"].push(loadOf(terms));
    for (const disjunction of kept.disjunctions) {
      const sole = soleDisjunct(disjunction, learned.bounds);
      if (sole) loads[sole.meter].refused.push(loadOf(sole.terms));
      else if (sole === null) either.push(disjunction.filter(({ terms }) => rowMin(terms, learned.bounds) <= EPS).map(({ meter, terms }) => ({ meter, load: loadOf(terms) })));
    }
  }
  return Object.freeze({ bounds: learned.contested ? initialBounds(allowance) : learned.bounds, contested: learned.contested, priors, loads, either });
}

/** Whether load `small` is no larger than `large`, kind by kind. */
const within = (small, large) => [...small].every(([kind, count]) => count <= (large.get(kind) ?? 0));

// — readings —

/**
 * A first-available pool drained by `draws` ({at, amount} in the pool's unit, oldest first): each
 * draw finds every meter in the window open at its instant, full if that window is new, and takes
 * from the meters in their declared order, as Flow's daily credits go before its monthly ones.
 * From a `balance` ({at, levels}) the meters start at its levels in the windows open when it was
 * read; otherwise each starts full. `times` are the spends that open first-spend windows (every
 * draw's, unless more is known). Answers each meter's window and level at `now`, what each draw
 * took from each meter, and `short`, what no meter could cover. A ledger reserves through this.
 */
export function drainFirstAvailable(allowance, draws, now, { balance = null, times = draws.map((draw) => draw.at) } = {}) {
  if (allowance.draws !== "first") throw new TypeError(`allowance ${allowance.id}: only a first-available pool drains in order`);
  const at = instant(now, "drain now");
  const spendTimes = times.map((t) => instant(t, "drain spend time"));
  const remaining = allowance.meters.map((meter, index) => (balance === null
    ? { window: null, left: meter.budget }
    : { window: meterWindow(meter, spendTimes, instant(balance.at, "drain balance")).opensAt, left: balance.levels[index] }));
  const roll = (t) => allowance.meters.forEach((meter, index) => {
    const window = meterWindow(meter, spendTimes, t);
    if (remaining[index].window !== window.opensAt) remaining[index] = { window: window.opensAt, left: meter.budget };
  });
  let short = 0;
  const takes = draws.map((draw) => {
    roll(instant(draw.at, "drain draw"));
    let need = draw.amount;
    const took = remaining.map((held) => { const take = Math.min(held.left, need); held.left -= take; need -= take; return take; });
    short += need;
    return Object.freeze(took);
  });
  roll(at);
  const meters = allowance.meters.map((meter, index) => {
    const window = meterWindow(meter, spendTimes, at);
    return Object.freeze({ meter: meter.id, opensAt: iso(window.opensAt), resetsAt: iso(window.resetsAt), left: remaining[index].left });
  });
  return Object.freeze({ meters: Object.freeze(meters), takes: Object.freeze(takes), short });
}

/** Each meter's level after drawing `spends` first-available, at `pick` of each price. */
function remainingOfPool(allowance, spends, costBounds, now, pick, balance = null) {
  const draws = spends.filter((spend) => spend.kind in allowance.costs).map((spend) => ({ at: spend.at, amount: spend.count * pick(costBounds.get(costVar(spend.kind))) }));
  const drained = drainFirstAvailable(allowance, draws, now, { balance, times: balance?.times ?? spends.map((spend) => spend.at) });
  return { left: drained.meters.map((meter) => meter.left), overdrawn: drained.short > EPS };
}

/**
 * The two extreme ways a pool balance can lie across its meters: the earliest-drawn filled first,
 * or last. Every meter's level at the balance lies between its levels in the two (exactly so for
 * two meters, as a daily grant before a monthly one), and a balance beyond the budgets' sum
 * contradicts them.
 */
function balanceSplits(allowance, remaining) {
  const fill = (order) => {
    const levels = allowance.meters.map(() => 0);
    let left = remaining;
    for (const index of order) { levels[index] = Math.min(allowance.meters[index].budget, left); left -= levels[index]; }
    return { levels, over: left > EPS };
  };
  const order = allowance.meters.map((_, index) => index);
  const [first, last] = [fill(order), fill([...order].reverse())];
  return { splits: [first.levels, last.levels], over: first.over };
}

/** Whether every metered kind's price is learned exactly, so an overdraw is a contradiction. */
const costsKnown = (bounds, allowance) => Object.keys(allowance.costs).every((kind) => { const [lo, hi] = bounds.get(costVar(kind)); return hi - lo <= EPS; });

function fitOf(costLo, costHi, remLo, remHi) {
  if (costHi <= remLo + EPS) return FIT.held;
  if (costLo > remHi + EPS) return FIT.denied;
  return FIT.unknown;
}
const openFitOf = (remLo, remHi) => (remLo > EPS ? FIT.held : remHi <= EPS ? FIT.denied : FIT.unknown);
// Under open admission the unit that crosses the budget still goes through.
const openCountOf = (costLo, costHi, remLo, remHi) => [
  remLo <= EPS ? 0 : costHi === Infinity ? 1 : Math.max(1, Math.ceil(remLo / costHi - EPS)),
  remHi <= EPS ? 0 : costLo === 0 || remHi === Infinity ? Infinity : Math.ceil(remHi / costLo - EPS),
];
const countOf = (costLo, costHi, remLo, remHi) => [
  costHi === Infinity ? 0 : costHi === 0 ? Infinity : Math.max(0, Math.floor(remLo / costHi + EPS)),
  costLo === 0 || remHi === Infinity ? Infinity : Math.max(0, Math.floor(remHi / costLo + EPS)),
];

/**
 * An allowance read at `now`: what the evidence taught, each meter's window and what is left in
 * it, whether each kind fits (a FOUR extremal reading), how many more of each could go through,
 * and the slack — capacity that lapses unspent at its window's turn, or now, for a window idling.
 * `pending` spends (reserved, in flight, planned) count against the windows but teach nothing,
 * since they have not succeeded.
 */
export function readAllowance(allowance, evidence, { now, pending = [] } = {}) {
  const at = instant(now, "allowance reading now");
  const learned = learnAllowance(allowance, evidence);
  const balances = evidence.filter((entry) => entry.type === "balance" && entry.at <= at);
  if (balances.length > 0 && allowance.draws !== "first") throw new TypeError(`allowance ${allowance.id}: a balance is read only of a first-available pool`);
  const spends = [...evidence.filter((entry) => entry.type === "spend"), ...admitAllowanceEvidence(pending.map((entry) => ({ ...entry, type: "spend" }))).map((spend) => ({ ...spend, pending: true }))].filter((spend) => spend.kind in allowance.costs).sort((a, b) => a.at - b.at);
  const times = spends.map((spend) => spend.at);
  const readings = evidence.filter((entry) => entry.type === "reading" && entry.at <= at);
  const costs = Object.fromEntries(Object.keys(allowance.costs).map((kind) => [kind, learned.bounds.get(costVar(kind))]));
  const meters = allowance.meters.map((meter) => {
    if (meter.law === "stated") {
      // Read off the provider's latest statement, plus the house's spends since it; a window the
      // provider has not stated (none read, or turned since) may hold anything up to its budget.
      const window = statedWindow(meter, readings, at);
      const since = spends.filter((spend) => spend.at <= at && window.holds(spend.at) && spend.at > (window.reading?.at ?? Infinity));
      const load = new Map();
      for (const spend of since) load.set(spend.kind, (load.get(spend.kind) ?? 0) + spend.count);
      const added = since.reduce(([lo, hi], spend) => [lo + spend.count * costs[spend.kind][0], hi + spend.count * costs[spend.kind][1]], [0, 0]);
      const spent = window.reading === null ? [0, meter.budget] : [window.reading.used + added[0], window.reading.used + added[1]];
      return { meter, window, load, budget: [meter.budget, meter.budget], spent, remaining: [Math.max(0, meter.budget - spent[1]), Math.max(0, meter.budget - spent[0])] };
    }
    const window = meterWindow(meter, times, at);
    const inWindow = spends.filter((spend) => spend.kind in allowance.costs && spend.at <= at && window.holds(spend.at));
    const load = new Map();
    for (const spend of inWindow) load.set(spend.kind, (load.get(spend.kind) ?? 0) + spend.count);
    const spent = inWindow.reduce(([lo, hi], spend) => [lo + spend.count * costs[spend.kind][0], hi + spend.count * costs[spend.kind][1]], [0, 0]);
    const [bLo, bHi] = learned.bounds.get(budgetVar(meter.id));
    return { meter, window, load, budget: [bLo, bHi], spent, remaining: [Math.max(0, bLo - spent[1]), Math.max(0, bHi - spent[0])] };
  });
  let pooled = null;
  let contested = learned.contested;
  if (allowance.draws === "first") {
    // The latest balance stands for every spend before it; a pending spend is never in it.
    const balance = balances.at(-1) ?? null;
    const drawn = spends.filter((s) => s.at <= at && (balance === null || s.pending || s.at > balance.at));
    const { splits, over } = balance === null ? { splits: [null], over: false } : balanceSplits(allowance, balance.remaining);
    const runs = splits.map((levels) => {
      const start = levels === null ? null : { at: balance.at, levels, times: spends.filter((s) => s.at <= at).map((s) => s.at) };
      return { low: remainingOfPool(allowance, drawn, learned.bounds, at, ([, hi]) => hi, start), high: remainingOfPool(allowance, drawn, learned.bounds, at, ([lo]) => lo, start) };
    });
    const sum = (left) => left.reduce((a, b) => a + b, 0);
    meters.forEach((entry, index) => { entry.remaining = [Math.min(...runs.map(({ low }) => low.left[index])), Math.max(...runs.map(({ high }) => high.left[index]))]; });
    pooled = [Math.min(...runs.map(({ low }) => sum(low.left))), Math.max(...runs.map(({ high }) => sum(high.left)))];
    if (over || (runs.every(({ low }) => low.overdrawn) && costsKnown(learned.bounds, allowance))) contested = true;
  }
  const fits = {};
  const counts = {};
  for (const [kind, [cLo, cHi]] of Object.entries(costs)) {
    if (contested) { fits[kind] = FIT.contested; counts[kind] = span(0, Infinity); continue; }
    if (pooled !== null) { fits[kind] = fitOf(cLo, cHi, ...pooled); counts[kind] = span(...countOf(cLo, cHi, ...pooled)); continue; }
    const open = allowance.admits === "open";
    // Open admission asks only whether the window is exhausted: what is in it already, not the next unit.
    const asked = new Map(meters.map(({ meter, load }) => [meter.id, open ? load : new Map(load).set(kind, (load.get(kind) ?? 0) + 1)]));
    const refusedEither = learned.either.some((disjunction) => disjunction.every(({ meter, load }) => within(load, asked.get(meter))));
    fits[kind] = meters.map(({ meter, load, remaining }) => {
      const next = new Map(load).set(kind, (load.get(kind) ?? 0) + 1);
      const { accepted, refused } = learned.loads[meter.id];
      const boxed = open ? openFitOf(...remaining) : fitOf(cLo, cHi, ...remaining);
      const goes = boxed === FIT.held || (!open && accepted.some((seen) => within(next, seen)));
      const stops = boxed === FIT.denied || refusedEither || refused.some((seen) => within(seen, asked.get(meter.id)));
      return readingOfSides("extremal", goes, stops);
    }).reduce(truthMeetReading);
    const each = meters.map(({ remaining }) => (open ? openCountOf : countOf)(cLo, cHi, ...remaining));
    counts[kind] = fits[kind] === FIT.denied ? span(0, 0) : span(Math.min(...each.map(([lo]) => lo)), Math.min(...each.map(([, hi]) => hi)));
  }
  // A sliding window and an unopened first-spend window lose capacity every moment they sit
  // unspent (the one as spends age out unreplaced, the other as the windows it could have run
  // back to back go by), so their slack lapses now; a running window's lapses at its turn.
  const slack = meters
    .filter(({ meter, window }) => meter.law !== "period" || window.resetsAt !== null)
    .map(({ meter, window, remaining }) => Object.freeze({ meter: meter.id, remaining: span(...remaining), lapsesAt: iso(meter.law === "sliding" || window.resetsAt === null ? at : window.resetsAt), law: meter.law }))
    .filter((entry) => entry.remaining.hi === null || entry.remaining.hi > EPS);
  return Object.freeze({
    allowance: allowance.id,
    account: allowance.account,
    product: allowance.product,
    unit: allowance.unit,
    at: iso(at),
    contested,
    priors: learned.priors,
    learnedFrom: Object.freeze({ spends: evidence.filter((e) => e.type === "spend").length, refusals: evidence.filter((e) => e.type === "refusal").length, balances: balances.length, readings: readings.length }),
    costs: Object.freeze(Object.fromEntries(Object.entries(costs).map(([kind, [lo, hi]]) => [kind, span(lo, hi)]))),
    meters: Object.freeze(meters.map(({ meter, window, budget, spent, remaining }) => Object.freeze({
      meter: meter.id, law: meter.law, opensAt: iso(window.opensAt), resetsAt: iso(window.resetsAt), clearsAt: iso(window.clearsAt),
      budget: span(...budget), spent: span(...spent), remaining: span(...remaining),
    }))),
    fits: Object.freeze(fits),
    counts: Object.freeze(counts),
    slack: Object.freeze(slack),
  });
}

/** The least price a subscription's capacity is ever offered at: what is about to lapse is nearly, never wholly, free. */
export const PERISHABLE_PRICE_FLOOR = 0.01;

/**
 * What one more unit of an allowance costs now, as a share of a unit bought at full scarcity: the
 * exchange rate staffing prices a carrier at (organizing work/staffing `price`). Capacity that will
 * lapse unspent at its window's turn costs nearly nothing; capacity the window will spend anyway
 * costs in full. Each read window with a known budget and a level read off the provider (a stated
 * meter) or learned exactly is projected to its turn at the pace it has been spent so far
 * (`spent / elapsed`, elapsed at least a twentieth of the window, so a window's first minutes are
 * not read as idle), and its price is the share of what is left that pace would still spend. The
 * scarcest window binds. A window spent out prices the allowance as exhausted until it turns. An
 * allowance with no window so read prices at the unit: an unknown is never free.
 * Returns `{price, exhausted, binding, until?, windows}`.
 */
export function perishablePrice(reading, { floor = PERISHABLE_PRICE_FLOOR } = {}) {
  const at = Date.parse(reading.at);
  const windows = reading.meters.map((meter) => {
    const budget = meter.budget.lo;
    const known = meter.budget.hi !== null && meter.budget.hi - meter.budget.lo <= EPS && meter.resetsAt !== null && meter.opensAt !== null && budget > 0;
    if (!known) return Object.freeze({ meter: meter.meter, known: false });
    const spent = meter.spent.lo;
    const resetsAt = Date.parse(meter.resetsAt);
    const span = resetsAt - Date.parse(meter.opensAt);
    const elapsed = Math.max(at - Date.parse(meter.opensAt), span / 20);
    const left = Math.max(0, budget - spent);
    if (left <= EPS) return Object.freeze({ meter: meter.meter, known: true, exhausted: true, until: meter.resetsAt, price: Infinity });
    const projected = Math.min(left, (spent / elapsed) * Math.max(0, resetsAt - at));
    return Object.freeze({ meter: meter.meter, known: true, exhausted: false, until: meter.resetsAt, left, projected, price: Math.max(floor, projected / left) });
  });
  const read = windows.filter((window) => window.known);
  const exhausted = read.find((window) => window.exhausted);
  if (exhausted !== undefined) return Object.freeze({ price: Infinity, exhausted: true, binding: exhausted.meter, until: exhausted.until, windows: Object.freeze(windows) });
  if (read.length === 0) return Object.freeze({ price: 1, exhausted: false, binding: null, windows: Object.freeze(windows) });
  const binding = read.reduce((a, b) => (b.price > a.price ? b : a));
  return Object.freeze({ price: binding.price, exhausted: false, binding: binding.meter, until: binding.until, windows: Object.freeze(windows) });
}

// — planning —

const lapseOrder = (reading) => Math.min(...reading.slack.map((entry) => Date.parse(entry.lapsesAt)), Infinity);
const CLASS_ORDER = Object.freeze({ committed: 0, backfill: 1 });

/**
 * What to draw now. `holdings` are `{allowance, evidence, pending?}`; `demands` are `{id, kind,
 * count?, value?, class?: committed | backfill, allowances?: [id]}`. Committed demand is placed
 * before backfill, higher value first; each unit goes to the allowance whose capacity lapses
 * soonest among those where the kind is held to fit. Where no allowance is known to fit but one
 * might, one unit per allowance goes as a probe: its success or refusal is how the price is learned.
 * Returns the draws, the unmet demand with why, and the slack each allowance still leaves to lapse.
 */
export function planDraws({ holdings, demands, now, probe = true }) {
  const state = holdings.map(({ allowance, evidence, pending = [] }) => ({ allowance, evidence, pending: [...pending], probed: false }));
  const read = (held) => readAllowance(held.allowance, held.evidence, { now, pending: held.pending });
  const ordered = [...demands].sort((a, b) => (CLASS_ORDER[a.class ?? "backfill"] - CLASS_ORDER[b.class ?? "backfill"]) || ((b.value ?? 0) - (a.value ?? 0)) || String(a.id).localeCompare(String(b.id)));
  const draws = [];
  const unmet = [];
  for (const demand of ordered) {
    let wanted = demand.count ?? 1;
    while (wanted > 0) {
      const offers = state
        .filter((held) => demand.kind in held.allowance.costs && (demand.allowances === undefined || demand.allowances.includes(held.allowance.id)))
        .map((held) => ({ held, reading: read(held) }));
      const fitting = offers.filter(({ reading }) => reading.fits[demand.kind] === FIT.held).sort((a, b) => lapseOrder(a.reading) - lapseOrder(b.reading) || a.held.allowance.id.localeCompare(b.held.allowance.id));
      const probing = probe ? offers.filter(({ held, reading }) => !held.probed && reading.fits[demand.kind] === FIT.unknown) : [];
      const chosen = fitting[0] ?? probing[0];
      if (chosen === undefined) {
        const reasons = offers.map(({ reading }) => reading.fits[demand.kind]);
        unmet.push(Object.freeze({ demand: demand.id, kind: demand.kind, count: wanted, reason: offers.length === 0 ? "unoffered" : reasons.includes(FIT.contested) ? FIT.contested : reasons.includes(FIT.unknown) ? FIT.unknown : FIT.denied }));
        break;
      }
      const isProbe = fitting[0] === undefined;
      if (isProbe) chosen.held.probed = true;
      chosen.held.pending.push({ kind: demand.kind, at: now });
      draws.push(Object.freeze({ demand: demand.id, kind: demand.kind, allowance: chosen.held.allowance.id, account: chosen.held.allowance.account, probe: isProbe }));
      wanted -= 1;
    }
  }
  const slack = state.map((held) => { const reading = read(held); return Object.freeze({ allowance: held.allowance.id, slack: reading.slack, fits: reading.fits }); });
  return Object.freeze({ at: iso(instant(now, "plan now")), draws: Object.freeze(draws), unmet: Object.freeze(unmet), slack: Object.freeze(slack) });
}

// — lapses —

/** The discrete windows of `meter` over [from, to): a period meter's every period, a first-spend meter's opened ones. */
function windowsOf(meter, times, from, to) {
  if (meter.law === "period") {
    const windows = [];
    for (let [start, end] = periodOf(meter, from); start < to; [start, end] = periodOf(meter, end)) windows.push([start, end]);
    return { windows, idle: 0 };
  }
  const span = meter.hours * HOUR;
  const windows = [];
  for (const s of times) if (s < to && (windows.length === 0 || s >= windows.at(-1)[0] + span)) windows.push([s, s + span]);
  const inRange = windows.filter(([, end]) => end > from);
  // Whole windows that could have run back to back in the gaps where none was open.
  let idle = 0;
  let cursor = from;
  for (const [start, end] of inRange) { idle += Math.max(0, Math.floor((start - cursor) / span)); cursor = Math.max(cursor, end); }
  idle += Math.max(0, Math.floor((to - cursor) / span));
  return { windows: inRange, idle };
}

/**
 * A stated meter's windows between `from` and `to`, each as its readings state it: what its last
 * reading before the turn says was used, and so what was lost at the turn. A window no reading
 * states is not known and is not counted.
 */
function statedLapses(meter, readings, from, to) {
  const byWindow = new Map();
  for (const reading of readings.filter((entry) => entry.meter === meter.id && entry.resetsAt > from)) {
    const prior = byWindow.get(reading.resetsAt);
    if (prior === undefined || reading.at >= prior.at) byWindow.set(reading.resetsAt, reading);
  }
  const rows = [...byWindow.values()].sort((a, b) => a.resetsAt - b.resetsAt).map((reading) => {
    const closed = reading.resetsAt <= to;
    const left = Math.max(0, meter.budget - reading.used);
    return Object.freeze({ opensAt: iso(reading.resetsAt - meter.hours * HOUR), resetsAt: iso(reading.resetsAt), closed, budget: span(meter.budget, meter.budget),
      spent: span(reading.used, reading.used), refused: 0, readAt: iso(reading.at), wasted: span(...(closed ? [left, left] : [0, 0])), open: span(...(closed ? [0, 0] : [left, left])) });
  });
  const total = (field) => rows.reduce(([a, b], row) => [a + row[field].lo, b + (row[field].hi ?? Infinity)], [0, 0]);
  const closedRows = rows.filter((row) => row.closed);
  const capacity = closedRows.length * meter.budget;
  return Object.freeze({
    meter: meter.id, law: meter.law, windows: Object.freeze(rows), idleWindows: 0,
    spent: span(...total("spent")), wasted: span(...total("wasted")), open: span(...total("open")),
    utilization: capacity === 0 ? null : span(...[closedRows.reduce((sum, row) => sum + row.spent.lo, 0) / capacity, closedRows.reduce((sum, row) => sum + row.spent.lo, 0) / capacity]),
  });
}

/**
 * What an allowance lapsed between `since` and `now`: each meter's windows in that span with what
 * was spent from each and what was lost unspent at its turn, plus, for a from-first-spend meter,
 * the whole windows that never opened because nothing was spent. Spends are the evidence's (and
 * `pending`'s, for a window still open). A refusal inside a window says it was spent to within the
 * refused kind's price, so its loss is at most that; under open admission, that it was exhausted. A first-available pool's spends are drained
 * in meter order, so each meter's spend is what was taken from it. A sliding meter has no windows
 * to lose and is not accounted. This is the measure a consumer schedule is tuned against.
 */
export function allowanceLapses(allowance, evidence, { since, now, pending = [] }) {
  const from = instant(since, "lapses since");
  const to = instant(now, "lapses now");
  if (!(from < to)) throw new TypeError("allowance lapses: since precedes now");
  const learned = learnAllowance(allowance, evidence);
  const spends = [...evidence.filter((entry) => entry.type === "spend"), ...admitAllowanceEvidence(pending.map((entry) => ({ ...entry, type: "spend" })))]
    .filter((spend) => spend.kind in allowance.costs && spend.at < to).sort((a, b) => a.at - b.at);
  const refusals = evidence.filter((entry) => entry.type === "refusal" && entry.kind in allowance.costs && entry.at < to);
  const times = spends.map((spend) => spend.at);
  const cost = (kind) => learned.bounds.get(costVar(kind));
  // Per meter, the [lo, hi] each spend took from it.
  const taken = allowance.draws === "first"
    ? (() => {
      const drain = (pick) => drainFirstAvailable(allowance, spends.map((spend) => ({ at: spend.at, amount: spend.count * pick(cost(spend.kind)) })), to, { times }).takes;
      const [low, high] = [drain(([lo]) => lo), drain(([, hi]) => hi)];
      return allowance.meters.map((_, index) => spends.map((_, n) => [low[n][index], high[n][index]]));
    })()
    : allowance.meters.map(() => spends.map((spend) => [spend.count * cost(spend.kind)[0], spend.count * cost(spend.kind)[1]]));
  const sum = (rows) => rows.reduce(([a, b], [c, d]) => [a + c, b + d], [0, 0]);
  const readings = evidence.filter((entry) => entry.type === "reading" && entry.at < to);
  const meters = allowance.meters.filter((meter) => meter.law !== "sliding").map((meter) => {
    if (meter.law === "stated") return statedLapses(meter, readings, from, to);
    const index = allowance.meters.indexOf(meter);
    const [bLo, bHi] = learned.bounds.get(budgetVar(meter.id));
    const { windows, idle } = windowsOf(meter, times, from, to);
    const rows = windows.map(([start, end]) => {
      const inside = (t) => t >= start && t < end;
      const spent = sum(spends.map((spend, n) => (inside(spend.at) ? taken[index][n] : [0, 0])));
      const refused = refusals.filter((refusal) => inside(refusal.at) && (refusal.meter === undefined || refusal.meter === meter.id));
      const closed = end <= to;
      const load = new Map();
      for (const spend of spends) if (inside(spend.at)) load.set(spend.kind, (load.get(spend.kind) ?? 0) + spend.count);
      const exhausted = allowance.admits === "open" && learned.loads[meter.id].refused.some((seen) => within(seen, load));
      let left = [Math.max(0, bLo - spent[1]), Math.max(0, bHi - spent[0])];
      if (exhausted) left = [0, 0];
      else if (refused.length > 0) left = allowance.admits === "open" ? [0, 0] : [0, Math.min(left[1], ...refused.map((refusal) => cost(refusal.kind)[1]))];
      return Object.freeze({ opensAt: iso(start), resetsAt: iso(end), closed, budget: span(bLo, bHi), spent: span(...spent), refused: refused.length,
        wasted: span(...(closed ? left : [0, 0])), open: span(...(closed ? [0, 0] : left)) });
    });
    const total = (field) => rows.reduce(([a, b], row) => [a + row[field].lo, b + (row[field].hi ?? Infinity)], [0, 0]);
    const spent = total("spent");
    const wasted = total("wasted").map((value, end) => value + idle * (end === 0 ? bLo : bHi));
    const closedSpent = sum(rows.filter((row) => row.closed).map((row) => [row.spent.lo, row.spent.hi ?? Infinity]));
    const capacity = [closedSpent[0] + wasted[0], closedSpent[1] + wasted[1]];
    return Object.freeze({
      meter: meter.id, law: meter.law, windows: Object.freeze(rows), idleWindows: idle,
      spent: span(...spent), wasted: span(...wasted), open: span(...total("open")),
      utilization: capacity[1] === 0 ? null : span(capacity[1] === Infinity ? 0 : closedSpent[0] / capacity[1], capacity[0] === 0 ? 1 : Math.min(1, closedSpent[1] / capacity[0])),
    });
  });
  return Object.freeze({ allowance: allowance.id, account: allowance.account, product: allowance.product, unit: allowance.unit, since: iso(from), now: iso(to), contested: learned.contested, meters: Object.freeze(meters) });
}

/**
 * Divide `available` units of an allowance among consumers, one draw at a time: highest priority
 * first, then the consumer least served per unit of weight (units `served` over the caller's
 * horizon plus units granted here), then identity order. It is work-conserving: a demand whose
 * kind no longer fits is skipped while a cheaper one still does, because what is not drawn lapses.
 * `costs` prices each kind in the allowance's unit; demands are `{consumer, kind, wanted, weight?,
 * priority?, served?}`. Where planDraws says which allowance a draw goes to, this says whose it is.
 */
export function shareAllowance({ available, costs, demands }) {
  if (!(typeof available === "number" && available >= 0)) throw new TypeError("share: available is a non-negative number");
  if (!Array.isArray(demands)) throw new TypeError("share: demands is a list");
  const rows = demands.map((demand, index) => {
    if (!nonEmpty(demand?.consumer) || !nonEmpty(demand.kind)) throw new TypeError(`share demand ${index}: consumer and kind`);
    const units = costs?.[demand.kind];
    if (!(typeof units === "number" && units > 0)) throw new TypeError(`share demand ${index}: ${demand.kind} has a positive price`);
    const weight = demand.weight ?? 1;
    if (!(typeof weight === "number" && weight > 0 && Number.isFinite(weight))) throw new TypeError(`share demand ${index}: weight is positive`);
    for (const field of ["wanted", "served"]) if (!(Number.isSafeInteger(demand[field] ?? 0) && (demand[field] ?? 0) >= 0)) throw new TypeError(`share demand ${index}: ${field}`);
    return { consumer: demand.consumer, kind: demand.kind, units, weight, wanted: demand.wanted ?? 0, priority: Number.isSafeInteger(demand.priority) ? demand.priority : 0, served: demand.served ?? 0, draws: 0 };
  });
  if (new Set(rows.map(({ consumer, kind }) => `${consumer}\u0000${kind}`)).size !== rows.length) throw new TypeError("share: one demand per consumer and kind");
  const servedBy = new Map(rows.map(({ consumer }) => [consumer, 0]));
  for (const row of rows) servedBy.set(row.consumer, Math.max(servedBy.get(row.consumer), row.served));
  let remaining = available;
  for (;;) {
    const open = rows.filter((row) => row.draws < row.wanted && row.units <= remaining + EPS);
    if (open.length === 0) break;
    open.sort((a, b) => b.priority - a.priority || servedBy.get(a.consumer) / a.weight - servedBy.get(b.consumer) / b.weight
      || a.consumer.localeCompare(b.consumer) || a.kind.localeCompare(b.kind));
    const chosen = open[0];
    chosen.draws += 1;
    remaining -= chosen.units;
    servedBy.set(chosen.consumer, servedBy.get(chosen.consumer) + chosen.units);
  }
  const grants = rows.filter(({ draws }) => draws > 0).map(({ consumer, kind, draws, units }) => Object.freeze({ consumer, kind, draws, units: draws * units }));
  return Object.freeze({ grants: Object.freeze(grants), allocated: available - remaining, unallocated: remaining });
}

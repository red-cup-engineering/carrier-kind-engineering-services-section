import assert from "node:assert/strict";
import test from "node:test";

import { readingOfSides } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { admitAllowance, admitAllowanceEvidence, allowanceLapses, drainFirstAvailable, perishablePrice, planDraws, readAllowance } from "@red-cup-engineering/organizing/enterprise";

const notebook = admitAllowance({
  id: "notebook-studio", account: "google:fixture", product: "gemini-notebook", unit: "five-hour-share", draws: "every",
  meters: [{ id: "five-hour", law: "sliding", hours: 5, budget: 1 }, { id: "weekly", law: "sliding", hours: 168, budget: null }],
  costs: { "video:explainer": null, "video:cinematic": null },
  priors: [{ meter: "five-hour", fits: { "video:cinematic": 1, "video:explainer": 2 }, because: "founder's estimate" }],
  because: "fixture",
});

test("spends bound prices from above, a refusal from below, and the reading follows the window", () => {
  const evidence = admitAllowanceEvidence([
    { type: "spend", kind: "video:explainer", at: "2026-10-02T00:00:00Z" },
    { type: "spend", kind: "video:explainer", at: "2026-10-02T00:20:00Z" },
    { type: "spend", kind: "video:explainer", at: "2026-10-02T00:40:00Z" },
    { type: "refusal", kind: "video:cinematic", at: "2026-10-02T01:00:00Z", meter: "five-hour" },
  ]);
  const inside = readAllowance(notebook, evidence, { now: "2026-10-02T01:30:00Z" });
  assert.equal(inside.costs["video:explainer"].hi, 1 / 3);
  assert.equal(inside.fits["video:cinematic"], "denied", "the refused load is still in the window");
  assert.equal(inside.fits["video:explainer"], "unknown", "a fourth explainer is no larger than the refused load");
  assert.equal(inside.priors, "held");
  const after = readAllowance(notebook, evidence, { now: "2026-10-02T06:00:00Z" });
  assert.equal(after.fits["video:explainer"], "unknown", "the weekly cap is still unknown");
  assert.equal(after.meters[0].remaining.lo, 1);
});

test("first-available credits drain daily before monthly and report the monthly slack", () => {
  const flow = admitAllowance({
    id: "flow-credits", account: "google:fixture", product: "google-flow", unit: "credit", draws: "first",
    meters: [{ id: "daily", law: "period", every: "day", anchor: "2026-10-01T07:00:00Z", budget: 50 }, { id: "monthly", law: "period", every: "month", anchor: "2026-09-15T00:00:00Z", budget: 200 }],
    costs: { "veo:fast": 20, "veo:quality": 100 }, because: "fixture",
  });
  const evidence = admitAllowanceEvidence([1, 2, 3].map((n) => ({ type: "spend", kind: "veo:fast", at: `2026-10-02T${String(n + 7).padStart(2, "0")}:00:00Z` })));
  const reading = readAllowance(flow, evidence, { now: "2026-10-02T12:00:00Z" });
  assert.deepEqual(reading.meters.map((meter) => meter.remaining.lo), [0, 190]);
  assert.equal(reading.counts["veo:fast"].lo, 9);
  assert.equal(reading.slack.at(-1).lapsesAt, "2026-10-15T00:00:00.000Z");
  const plan = planDraws({ holdings: [{ allowance: flow, evidence }], now: "2026-10-02T12:00:00Z", demands: [
    { id: "trailer", kind: "veo:quality", count: 2, class: "committed" },
    { id: "b-roll", kind: "veo:fast", count: 5 },
  ] });
  assert.deepEqual(plan.draws.map((draw) => draw.demand), ["trailer", "b-roll", "b-roll", "b-roll", "b-roll"]);
  assert.deepEqual(plan.unmet.map((entry) => [entry.demand, entry.count, entry.reason]), [["trailer", 1, "denied"], ["b-roll", 1, "denied"]]);
  assert.equal(plan.slack[0].slack.at(-1).remaining.lo, 10);
});

test("a pool balance stands for the spends before it, split across meters by their draw order", () => {
  const flow = admitAllowance({
    id: "flow-credits", account: "google:fixture", product: "google-flow", unit: "credit", draws: "first",
    meters: [{ id: "daily", law: "period", every: "day", anchor: "2026-10-01T07:00:00Z", budget: 50 }, { id: "monthly", law: "period", every: "month", anchor: "2026-09-08T16:51:25Z", budget: 1000 }],
    costs: { "veo:fast": 20 }, because: "fixture",
  });
  const read = (list, now) => readAllowance(flow, admitAllowanceEvidence(list), { now });
  const full = read([{ type: "balance", at: "2026-10-03T01:00:00Z", remaining: 1050 }], "2026-10-03T01:30:00Z");
  assert.deepEqual(full.meters.map(({ remaining }) => [remaining.lo, remaining.hi]), [[50, 50], [1000, 1000]]);
  const after = read([
    { type: "spend", kind: "veo:fast", at: "2026-10-03T00:00:00Z" },
    { type: "balance", at: "2026-10-03T01:00:00Z", remaining: 400 },
    { type: "spend", kind: "veo:fast", at: "2026-10-03T02:00:00Z" },
  ], "2026-10-03T03:00:00Z");
  assert.deepEqual(after.meters.map(({ remaining }) => [remaining.lo, remaining.hi]), [[0, 30], [350, 380]], "400 is 0-50 daily and 350-400 monthly; a spend drains the daily first");
  assert.equal(after.counts["veo:fast"].lo, 19);
  const nextDay = read([{ type: "balance", at: "2026-10-03T01:00:00Z", remaining: 400 }], "2026-10-03T08:00:00Z");
  assert.deepEqual(nextDay.meters.map(({ remaining }) => [remaining.lo, remaining.hi]), [[50, 50], [350, 400]], "the daily grant turned since the balance");
  assert.equal(read([{ type: "balance", at: "2026-10-03T01:00:00Z", remaining: 1200 }], "2026-10-03T01:30:00Z").contested, true, "more than the budgets hold");
});

test("a first-available pool drains its meters in order, each window filling anew", () => {
  const flow = admitAllowance({
    id: "flow-credits", account: "google:fixture", product: "google-flow", unit: "credit", draws: "first",
    meters: [{ id: "daily", law: "period", every: "day", anchor: "2026-10-01T07:00:00Z", budget: 50 }, { id: "monthly", law: "period", every: "month", anchor: "2026-09-08T16:51:25Z", budget: 1000 }],
    costs: { "veo:fast": 20 }, because: "fixture",
  });
  const drained = drainFirstAvailable(flow, [
    { at: "2026-10-03T01:00:00Z", amount: 30 },
    { at: "2026-10-03T02:00:00Z", amount: 40 },
    { at: "2026-10-03T08:00:00Z", amount: 20 },
  ], "2026-10-03T09:00:00Z");
  assert.deepEqual(drained.takes, [[30, 0], [20, 20], [20, 0]], "the day's grant goes first, and the next day's grant is whole again");
  assert.deepEqual(drained.meters.map(({ meter, left }) => [meter, left]), [["daily", 30], ["monthly", 980]]);
  assert.equal(drained.meters[0].resetsAt, "2026-10-04T07:00:00.000Z");
  assert.equal(drainFirstAvailable(flow, [{ at: "2026-10-03T01:00:00Z", amount: 30 }], "2026-10-03T02:00:00Z", { balance: { at: "2026-10-03T00:00:00Z", levels: [0, 10] } }).short, 20);
  assert.throws(() => drainFirstAvailable({ ...flow, draws: "every" }, [], "2026-10-03T00:00:00Z"), TypeError);
});

test("a stated meter is read off the provider's latest statement, and lapses what it states unused at its turn", () => {
  const allowance = admitAllowance({
    id: "subscription", account: "urn:test:account", product: "cli", unit: "percent-of-window", admits: "open",
    because: "a subscription states its windows",
    meters: [{ id: "five_hour", law: "stated", hours: 5, budget: 100 }, { id: "seven_day", law: "stated", hours: 168, budget: 100 }],
    costs: { session: null },
  });
  const evidence = admitAllowanceEvidence([
    { type: "reading", meter: "five_hour", at: "2026-10-03T10:00:00Z", used: 19, resetsAt: "2026-10-03T13:00:00Z" },
    { type: "reading", meter: "seven_day", at: "2026-10-03T10:00:00Z", used: 47, resetsAt: "2026-10-07T00:00:00Z" },
    { type: "spend", kind: "session", at: "2026-10-03T10:30:00Z" },
  ]);
  const reading = readAllowance(allowance, evidence, { now: "2026-10-03T11:00:00Z" });
  const five = reading.meters.find((meter) => meter.meter === "five_hour");
  assert.equal(five.opensAt, "2026-10-03T08:00:00.000Z");
  assert.equal(five.resetsAt, "2026-10-03T13:00:00.000Z");
  assert.deepEqual(five.spent, { lo: 19, hi: null });
  assert.equal(five.remaining.hi, 81);
  assert.equal(reading.learnedFrom.readings, 2);
  // An unknown session price leaves what is left unknown below, so the window may be exhausted.
  assert.equal(reading.fits.session, readingOfSides("extremal", false, false));
  // After the five-hour window turns unstated, it may hold anything up to its budget.
  const later = readAllowance(allowance, evidence, { now: "2026-10-03T14:00:00Z" });
  const turned = later.meters.find((meter) => meter.meter === "five_hour");
  assert.equal(turned.resetsAt, null);
  assert.deepEqual(turned.remaining, { lo: 0, hi: 100 });
  // The turn lost what the last statement before it left unused.
  const lapses = allowanceLapses(allowance, evidence, { since: "2026-10-03T00:00:00Z", now: "2026-10-03T14:00:00Z" });
  const fiveLapsed = lapses.meters.find((meter) => meter.meter === "five_hour");
  assert.deepEqual(fiveLapsed.wasted, { lo: 81, hi: 81 });
  assert.equal(fiveLapsed.windows[0].closed, true);
  assert.deepEqual(lapses.meters.find((meter) => meter.meter === "seven_day").wasted, { lo: 0, hi: 0 });
});

test("a stated meter with a known price admits by its stated level", () => {
  const allowance = admitAllowance({
    id: "weekly", account: "urn:test:account", product: "cli", unit: "percent-of-window", admits: "open",
    because: "a stated weekly window", meters: [{ id: "primary", law: "stated", hours: 168, budget: 100 }], costs: { session: 1 },
  });
  const full = admitAllowanceEvidence([{ type: "reading", meter: "primary", at: "2026-10-03T10:00:00Z", used: 100, resetsAt: "2026-10-05T00:00:00Z" }]);
  assert.equal(readAllowance(allowance, full, { now: "2026-10-03T11:00:00Z" }).fits.session, readingOfSides("extremal", false, true));
  const roomy = admitAllowanceEvidence([{ type: "reading", meter: "primary", at: "2026-10-03T10:00:00Z", used: 11, resetsAt: "2026-10-05T00:00:00Z" }]);
  assert.equal(readAllowance(allowance, roomy, { now: "2026-10-03T11:00:00Z" }).fits.session, readingOfSides("extremal", true, false));
  assert.throws(() => admitAllowance({ id: "x", account: "a", product: "p", unit: "u", because: "b", meters: [{ id: "m", law: "stated", hours: 1 }], costs: { k: 1 } }), /declares the budget/u);
});

test("capacity that will lapse unspent costs nearly nothing; capacity the window will spend anyway costs in full", () => {
  const allowance = admitAllowance({
    id: "weekly", account: "urn:test:account", product: "cli", unit: "percent-of-window", admits: "open",
    because: "a stated weekly window", meters: [{ id: "primary", law: "stated", hours: 168, budget: 100 }], costs: { session: null },
  });
  const at = (used, now) => perishablePrice(readAllowance(allowance, admitAllowanceEvidence([{ type: "reading", meter: "primary", at: now, used, resetsAt: "2026-10-09T00:00:00Z" }]), { now }));
  // A day into the week at 11% the pace spends 77% by the turn: most of what is left is spent anyway.
  const steady = at(11, "2026-10-03T00:00:00Z");
  assert.equal(steady.exhausted, false);
  assert.ok(Math.abs(steady.price - 66 / 89) < 1e-9, steady.price);
  // Six days in at 11%, the pace leaves almost all of it to lapse.
  assert.ok(at(11, "2026-10-08T00:00:00Z").price < 0.03);
  // A window spent out is exhausted until it turns.
  const out = at(100, "2026-10-05T00:00:00Z");
  assert.equal(out.exhausted, true);
  assert.equal(out.until, "2026-10-09T00:00:00.000Z");
  // No reading: unknown is never free.
  assert.equal(perishablePrice(readAllowance(allowance, [], { now: "2026-10-03T00:00:00Z" })).price, 1);
});

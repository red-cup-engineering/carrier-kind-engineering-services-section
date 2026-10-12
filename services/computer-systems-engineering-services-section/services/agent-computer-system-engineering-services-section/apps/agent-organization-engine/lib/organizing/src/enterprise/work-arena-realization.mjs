/**
 * enterprise/work-arena-realization — the work arena realized against ObsmetrologiaComputing's
 * `WorkArena` law (lean-system obsmetrologia-conformance, suite `work-arena`). The law speaks of
 * one thread with numbered players, minutes after the opening, numbered conditions and measures;
 * this module maps those names onto the arena's own vocabulary (players `player-<n>`, conditions
 * `c<n>` verifying requirements `r<n>`, the need as claim 0, measures `m<n>` with a unit, read more
 * is better) and reads the arena's board back in the law's terms. It decides nothing itself: every
 * standing, refusal, delivery reading and wager standing is the arena's.
 */
import { readingAs } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { slugify } from "@red-cup-engineering/computer-text-content-engineering-services-section/slugify-text";
import { intentOfThread, moveOf, orderOf, workBoard, wagersOf, takersOf, RESPONSE_MOVES, TOLD_MOVES } from "./work-arena.mjs";
import { REALIZED_EDITION } from "./work-arena-law.mjs";

const BASE = Date.parse("2026-01-01T00:00:00.000Z");
const at = (minutes) => new Date(BASE + minutes * 60_000).toISOString();
const minutesOf = (instant) => Math.round((Date.parse(instant) - BASE) / 60_000);
const player = (n) => `player-${n}`;
const numberOf = (id) => Number(String(id).replace(/^player-/u, ""));
// The law reads deliveries in FOUR's knowledge names; the arena records them in its extremal names.
const lawReading = (reading) => readingAs("knowledge", reading);
const law = { law: REALIZED_EDITION };
// The issue every proposal in a scenario addresses: a thread of its own, which the law's one thread never reads.
const ISSUE = moveOf({ move: "ask", by: "player-0", at: "2026-01-01T00:00:00.000Z", question: "What does the scenario propose?" }, { law: REALIZED_EDITION });

const requirement = (n) => ({ id: `r${n}`, class: "functional", priority: "must", says: `The result ${n} shall be delivered.`, rationale: "The law's scenario names it." });
const condition = (n) => ({ id: `c${n}`, method: "test", says: `Result ${n} is checked.`, verifies: [`r${n}`] });
const termsOf = (numbers) => ({ requirements: numbers.map(requirement), conditions: numbers.map(condition) });

function openingFor(o, { serial = 0 } = {}) {
  const by = player(o.opener);
  const base = { by, at: at(0) };
  const tag = serial === 0 ? "" : ` (restated ${serial})`;
  switch (o.kind) {
    case "aim": return { ...base, move: "aim", purpose: `The thread's measured state is kept${tag}.`, measures: o.measures.map((n) => ({ id: `m${n}`, says: `Measure ${n}.`, unit: "count", better: "more" })) };
    case "request": return { ...base, move: "request", need: `The scenario's result exists${tag}.`, ...termsOf(o.conditions), ...(o.assayer === o.opener ? {} : { assayer: player(o.assayer) }), ...(o.addressee === undefined ? {} : { to: player(o.addressee) }) };
    case "propose": return { ...base, move: "propose", idea: `The scenario's idea holds${tag}.`, addresses: [ISSUE.id] };
    case "report": return { ...base, move: "report", observation: `The scenario's condition is observed${tag}.` };
    case "ask": return { ...base, move: "ask", question: `Does the scenario hold${tag}?`, ...(o.assayer === o.opener ? {} : { assayer: player(o.assayer) }) };
    case "declare": return { ...base, move: "declare", ruling: `The scenario's ruling stands${tag}.` };
    // A supply is the law's resource offer: one compute resource in credits, each unit of any kind costing one credit.
    case "supply": return { ...base, move: "supply", resource: "compute", amount: o.amount, unit: "credit", until: at(o.lapses), costs: { unit: [1, 1] }, admits: o.admitsOpen ? "open" : "whole" };
    default: throw new TypeError(`no kind ${o.kind}`);
  }
}

function responseFor(m, thread, played, o) {
  const base = { thread, by: player(m.player), at: at(m.time) };
  switch (m.act) {
    case "hold": case "promise": case "adopt": case "release": case "leave": case "withdraw": return { ...base, move: m.act };
    case "attach": {
      // A taking attaches its own admitted work: the subject its thread's intent is admitted under.
      const current = workBoard(played, at(m.time)).threads.find((t) => t.id === thread);
      return { ...base, move: "attach", subject: `structured-work-intent-${slugify(intentOfThread(current).id) || "slug"}` };
    }
    case "decline": return { ...base, move: "decline", reason: "the scenario declines" };
    case "wager": return { ...base, move: "wager", measure: `m${m.measure}`, target: m.value, until: at(m.ends), benchmark: { of: "operator:benchmark", value: m.value, evidence: ["benchmark"] }, stake: { upside: 1, downside: 1 } };
    case "draw": return { ...base, move: "draw", amount: m.amount, kind: "unit", count: m.amount, serves: ["scenario-request"] };
    case "return": return { ...base, move: "return", amount: m.amount };
    // The law's measure 0 on a supply is what remains of it; on an aim, measures are numbered.
    case "observe": return { ...base, move: "observe", measure: o.kind === "supply" && m.measure === 0 ? "remaining" : `m${m.measure}`, value: m.value, observed: at(m.observed), evidence: ["observation"] };
    case "refine": {
      const completes = m.completes ? orderOf(workBoard(played, at(m.time)).threads.find((t) => t.id === thread)) : undefined;
      return { ...base, move: "refine", ...termsOf(m.terms), ...(completes === undefined ? {} : { completes, evidence: ["the miss"] }) };
    }
    case "counter": return { ...base, move: "counter", ...termsOf(m.terms) };
    case "agree": return { ...base, move: "agree", to: player(m.about) };
    case "deliver": return { ...base, move: "deliver", evidence: [`delivery-${m.player}-${m.time}`] };
    case "accept": return { ...base, move: "accept", of: player(m.about), evidence: ["witness"] };
    case "reject": return { ...base, move: "reject", of: player(m.about), unmet: m.unmet.map((n) => (n === 0 ? "need" : `c${n}`)), evidence: ["witness"] };
    case "argue": return { ...base, move: "argue", stance: "for", says: "The scenario argues for it." };
    case "corroborate": return { ...base, move: "corroborate", evidence: ["corroboration"] };
    case "resolve": return { ...base, move: "resolve", evidence: ["resolution"] };
    case "answer": return { ...base, move: "answer", says: `Answer ${m.player}.` };
    default: throw new TypeError(`no act ${m.act}`);
  }
}

/** ObsmetrologiaComputing.WorkArena.board: one fresh thread's board at T. */
export function board(o, moves, T) {
  const opening = moveOf(openingFor(o), law);
  const played = [JSON.parse(JSON.stringify(ISSUE)), JSON.parse(JSON.stringify(opening))];
  const unbuilt = [];
  let serial = 0;
  for (const m of [...moves].sort((a, b) => a.time - b.time)) {
    if (m.time > T) continue;
    let move;
    try {
      move = m.act === "supersede"
        ? moveOf({ ...openingFor(o, { serial: (serial += 1) }), by: player(m.player), at: at(m.time), supersedes: [opening.id] }, law)
        : moveOf(responseFor(m, opening.id, played, o), law);
    } catch (error) {
      unbuilt.push(m.time);
      continue;
    }
    played.push(JSON.parse(JSON.stringify(move)));
  }
  const read = workBoard(played, at(T));
  const thread = read.threads.find((t) => t.id === opening.id);
  const refused = [...new Set([...unbuilt, ...read.refused.map((entry) => minutesOf(entry.move.at))])].sort((a, b) => a - b);
  const answerers = o.kind === "ask" ? [...new Set((thread.answers ?? []).map((answer) => numberOf(answer.player)))].sort((a, b) => a - b) : undefined;
  const takers = answerers ?? [...new Set(takersOf(thread).map(numberOf))].sort((a, b) => a - b);
  const claimNumber = (claim) => (claim === "need" ? 0 : Number(String(claim).replace(/^c/u, "")));
  const deliveries = (thread.deliveries ?? []).map((delivery) => (delivery.readings === undefined
    ? { player: numberOf(delivery.player), time: minutesOf(delivery.at), readings: [] }
    : {
      player: numberOf(delivery.player), time: minutesOf(delivery.at),
      readings: Object.entries(delivery.readings).map(([claim, reading]) => ({ claim: claimNumber(claim), reading: lawReading(reading) }))
        .sort((a, b) => (a.claim === 0) - (b.claim === 0) || a.claim - b.claim),
      reading: lawReading(delivery.reading),
      ...(delivery.verdict === undefined ? {} : { verdict: delivery.verdict }),
    }));
  const wagers = o.kind === "aim" ? wagersOf(thread, at(T)).map((wager) => ({ player: numberOf(wager.player), measure: Number(String(wager.measure).replace(/^m/u, "")), standing: wager.standing })) : [];
  return { standing: thread.standing, takers, refused, deliveries, wagers };
}

export const obsmetrologiaRealization = Object.freeze({
  "ObsmetrologiaComputing.WorkArena.answers": (kind, act) => (RESPONSE_MOVES[kind] ?? []).includes(act),
  "ObsmetrologiaComputing.WorkArena.told": (kind, act) => (TOLD_MOVES[kind] ?? []).includes(act),
  "ObsmetrologiaComputing.WorkArena.board": board,
});

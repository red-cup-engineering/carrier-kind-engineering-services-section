/**
 * enterprise/brief — a bearer's seat brief, read off the registry and the work board rather than
 * written by hand (561 Group lane register, 2026-10-03: the enterprise governing itself, slice 3).
 *
 * A session is a hand of its character, and the character plays wearing its masks (organizing agency
 * cast). So what a session is for is not a prompt someone composes: it is the character's seats (each
 * office it holds at dignitas, with the duties it bears, the skills it provides, the line it reports
 * along and the enterprises whose rights it exercises), and, for each seat, the threads of the board
 * awaiting its move, the aims those threads serve and the conditions its customers judge them by. A
 * brief derived this way changes when the board or a seat does, and every session of the character
 * reads the same one.
 * @packageDocumentation
 */
import { playersOf } from "../agency/cast.mjs";
import { canonicalPlayer, officeCoordinationBoundary, officeReading, resolve } from "../agency/index.mjs";
import { agendaOf, assayerOf, gistOfOpening, operativeOf } from "./work-arena.mjs";

const gistOf = (thread) => {
  const opening = thread.opening;
  return gistOfOpening(opening).replace(/\s+/gu, " ");
};

/** The aims a thread serves, walking its `serves` up through requests until an aim. */
function aimsServedBy(thread, byId, seen = new Set()) {
  if (seen.has(thread.id)) return [];
  seen.add(thread.id);
  if (thread.opening.move === "aim") return [thread];
  return (thread.opening.serves ?? []).map((id) => byId.get(String(id).split("#")[0])).filter(Boolean).flatMap((served) => aimsServedBy(served, byId, seen));
}

/** One agenda entry read as work: what the thread asks, the moves owed, what it serves and how it is judged. */
function workOf(entry, byId, agency) {
  const thread = byId.get(entry.id);
  const operative = thread.opening.move === "request" ? (thread.operative ?? operativeOf(thread)) : undefined;
  return Object.freeze({
    thread: thread.id, move: thread.opening.move, step: entry.step, owes: entry.moves, roles: entry.roles,
    ...(entry.horizon === undefined ? {} : { horizon: entry.horizon }),
    gist: gistOf(thread),
    opener: canonicalPlayer(agency, thread.opening.by),
    assayer: canonicalPlayer(agency, assayerOf(thread)),
    aims: Object.freeze(aimsServedBy(thread, byId).map((aim) => Object.freeze({ thread: aim.id, purpose: gistOf(aim) }))),
    doneWhen: Object.freeze((operative?.conditions ?? []).map((condition) => condition.says)),
  });
}

/**
 * The seat brief of `bearer` (a character id): its seats, each with its charge and the work awaiting
 * its move, and the brief as text. `limit` bounds the work listed per seat.
 * @param {object} agency the agency registry (with told hands and seats, where a platform has them)
 * @param {{ threads: ReadonlyArray<object> }} board the work board read at a time
 * @param {string} bearer
 * @param {{ limit?: number, hand?: string }} [options] `hand` narrows the work to a session's own lane
 */
export function seatBriefOf(agency, board, bearer, { limit = 12, hand } = {}) {
  const identity = (player) => canonicalPlayer(agency, player);
  const byId = new Map(board.threads.map((thread) => [thread.id, thread]));
  const character = resolve(agency, "characters", bearer);
  // A session's own lane: the threads its hand took up (held, promised, adopted) and those serving them.
  const heldByHand = hand === undefined ? undefined : new Set(board.threads.filter((thread) =>
    [...(thread.holders ?? []), ...(thread.promisers ?? []), ...(thread.adoptions ?? [])].some((taking) => taking.hand === hand)).map((thread) => thread.id));
  const inLane = (id, seen = new Set()) => {
    if (heldByHand === undefined) return true;
    if (heldByHand.has(id)) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return (byId.get(id)?.opening.serves ?? []).some((served) => inLane(String(served).split("#")[0], seen));
  };
  const agendaFor = (player) => agendaOf(board, player, { playerIdentity: identity }).filter((entry) => inLane(entry.id)).slice(0, limit).map((entry) => workOf(entry, byId, agency));
  const seats = playersOf(agency, bearer).filter((player) => player.kind === "office").map((player) => {
    const reading = officeReading(agency, player.by);
    const boundary = officeCoordinationBoundary(agency, player.by);
    const enterprises = [...agency.enterprises.values()].filter((enterprise) => (enterprise.authored?.offices ?? [])
      .some((ref) => resolve(agency, "offices", ref, enterprise.sectionPath)?.key === reading.office)).map((enterprise) => enterprise.id);
    return Object.freeze({
      office: reading.office, name: reading.name, section: reading.section,
      reportsTo: reading.reportsTo, authorityScope: reading.authorityScope,
      duties: Object.freeze(reading.duties.map((duty) => Object.freeze({ id: duty.id, receivedWhen: duty.receiverCondition ?? null }))),
      skills: Object.freeze(reading.skills.map((skill) => skill.id)),
      receivesFrom: boundary.receivesFrom, assignsTo: boundary.assignsTo,
      enterprises: Object.freeze(enterprises),
      // Doing an enterprise's work makes its seat-holders its doers, so its own agenda is theirs too.
      work: Object.freeze([...agendaFor(reading.office), ...enterprises.flatMap((enterprise) => agendaFor(enterprise))]),
    });
  });
  const brief = Object.freeze({ kind: "organizing.enterprise.seat-brief", bearer, name: character?.name ?? bearer, ...(hand === undefined ? {} : { hand, lane: Object.freeze([...heldByHand]) }), seats: Object.freeze(seats) });
  return Object.freeze({ ...brief, text: briefText(brief) });
}

/** A thread's handle, as the world speaks it: the first eight characters of its digest. */
const handleOf = (id) => String(id).replace(/^ni:\/\/\/sha-256;/u, "").slice(0, 8);

const short = (text, length) => (text.length > length ? `${text.slice(0, length - 1)}…` : text);

/** The brief written out in the lane briefs' order: seat, scope, work, targets, done when. */
function briefText(brief) {
  const lines = [`SEAT`, `You are ${brief.name} (${brief.bearer}). You play wearing ${brief.seats.length === 0 ? "no office: you hold none at dignitas" : "these offices:"}`];
  for (const seat of brief.seats) {
    lines.push(`- ${seat.name} (${seat.office}), reporting along ${seat.reportsTo.join(" → ") || "no line"}${seat.enterprises.length > 0 ? `; an office of ${seat.enterprises.join(", ")}, whose rights you exercise with everyone who does its work` : ""}.`);
    if (seat.duties.length > 0) lines.push(`  Duties: ${seat.duties.map((duty) => duty.id).join(", ")}.`);
    if (seat.skills.length > 0) lines.push(`  Skills (read each before acting): ${seat.skills.join(", ")}.`);
    if (seat.authorityScope.length > 0) lines.push(`  Scope: ${seat.authorityScope.join("; ")}.`);
    if (seat.receivesFrom.length > 0) lines.push(`  Receives from: ${seat.receivesFrom.join(", ")}.`);
  }
  const work = brief.seats.flatMap((seat) => seat.work.map((item) => ({ seat, item })));
  if (brief.hand !== undefined) lines.push("", `LANE (the work your hand, ${brief.hand}, took up: ${brief.lane.length} thread${brief.lane.length === 1 ? "" : "s"}; hold or promise a thread to make it yours)`);
  lines.push("", "WORK (awaiting your move, nearest horizon first)");
  if (work.length === 0) lines.push("- Nothing on the board awaits a move of yours.");
  for (const { seat, item } of work) {
    lines.push(`- [${seat.name}] ${item.move} ${handleOf(item.thread)} (${item.step}; owes ${item.owes.join("/")}): ${short(item.gist, 220)}`);
    if (item.doneWhen.length > 0) lines.push(`  Done when: ${item.doneWhen.map((says) => short(says, 160)).join(" | ")}`);
    lines.push(`  Judged by ${item.assayer}.`);
  }
  const aims = [...new Map(work.flatMap(({ item }) => item.aims).map((aim) => [aim.thread, aim])).values()];
  lines.push("", "TARGETS (the aims your work serves)");
  if (aims.length === 0) lines.push("- None stated: the work above serves no aim on the board.");
  for (const aim of aims) lines.push(`- ${short(aim.purpose, 240)}`);
  return lines.join("\n");
}

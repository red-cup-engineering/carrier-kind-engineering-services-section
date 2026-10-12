/**
 * A settlement's signal board: the journal in which demand not addressed to one micro-enterprise
 * waits to be taken (organizing/enterprise/signals). Posting, taking, offering a result, accepting
 * and withdrawing are each one told-for record; the board's standing is read from them, never
 * written. A take admits the signal's work into the taker's own root before it is recorded, so a
 * take on the board always has its work behind it.
 * @packageDocumentation
 */
import { createSemanticRecordJournal } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-eavt/record-semantic-record";
import {
  acceptanceOf, resultOf, SIGNAL_CATEGORIES, signalBoard, signalOf, takeOf, withdrawalOf,
} from "@red-cup-engineering/organizing/enterprise";
import { structuredWorkIntentAdmissionContract } from "@red-cup-engineering/organizing/work/schema";
import { slugify } from "@red-cup-engineering/computer-text-content-engineering-services-section/slugify-text";
import { admitStructuredWorkIntent, assertStructuredWorkIntent, assessedBy } from "./structured-intent.mjs";

export const SIGNAL_BOARD_KIND = "settlement-signal";

const TOLD = Object.freeze({ for: true, against: false });

/** The board kept in one settlement's root. */
export function signalBoardStore(binding) {
  const journal = createSemanticRecordJournal({ root: binding.dataRoot, objectKind: SIGNAL_BOARD_KIND });
  const write = (category, record, at) => {
    journal.record({ category, recordedAt: at, record: JSON.parse(JSON.stringify(record)), told: TOLD });
    return record;
  };
  const facts = () => Object.fromEntries(SIGNAL_CATEGORIES.map((category) => [category, journal.query({ category }).map((row) => row.record)]));
  const read = (at = binding.now()) => signalBoard(facts(), at);
  const find = (id, at) => {
    const entry = read(at).find((candidate) => candidate.signal.id === id);
    if (entry === undefined) throw new TypeError(`no signal ${id} on this board`);
    return entry;
  };
  return Object.freeze({
    read,
    find,
    /** Post demand; posting the same content again is the same signal. */
    post(input) {
      const signal = signalOf({ ...input, intent: assertStructuredWorkIntent(input.intent), postedAt: input.postedAt ?? binding.now() });
      const known = read(signal.postedAt).find((entry) => entry.signal.id === signal.id);
      return known?.signal ?? write("signal", signal, signal.postedAt);
    },
    /**
     * Take a signal into a micro-enterprise's own root: admit its work there, assessed by the
     * taker's own assessing duty, then record the take. Taking again is harmless; the admission
     * reports the work already held.
     */
    take(id, { enterprise, assesses, into, at = binding.now() }) {
      const entry = find(id, at);
      if (entry.standing === "accepted" || entry.standing === "withdrawn") throw new TypeError(`signal ${id} is ${entry.standing}`);
      if (entry.signal.to !== undefined && entry.signal.to !== enterprise) throw new TypeError(`signal ${id} is addressed to ${entry.signal.to}`);
      const admission = admitStructuredWorkIntent(into, assessedBy(assesses, entry.signal.intent), { at: at.slice(0, 10), rootName: enterprise });
      const take = takeOf({ signal: id, enterprise, subject: admission.subject, at });
      if (!entry.takers.includes(enterprise)) write("take", take, at);
      return Object.freeze({ take, admission });
    },
    result(input) {
      const result = resultOf({ ...input, at: input.at ?? binding.now() });
      if (!find(result.signal, result.at).takers.includes(result.enterprise)) throw new TypeError(`${result.enterprise} has not taken signal ${result.signal}`);
      return write("result", result, result.at);
    },
    /** Only the signal's assayer accepts, and only a result offered by a taker. */
    accept(input) {
      const acceptance = acceptanceOf({ ...input, at: input.at ?? binding.now() });
      const entry = find(acceptance.signal, acceptance.at);
      if (acceptance.by !== entry.signal.assayer) throw new TypeError(`only ${entry.signal.assayer} accepts results of signal ${acceptance.signal}`);
      if (!entry.resulted.includes(acceptance.enterprise)) throw new TypeError(`${acceptance.enterprise} has offered no result for signal ${acceptance.signal}`);
      return write("acceptance", acceptance, acceptance.at);
    },
    /** Only the poster withdraws. */
    withdraw(input) {
      const withdrawal = withdrawalOf({ ...input, at: input.at ?? binding.now() });
      const entry = find(withdrawal.signal, withdrawal.at);
      if (withdrawal.by !== entry.signal.poster) throw new TypeError(`only ${entry.signal.poster} withdraws signal ${withdrawal.signal}`);
      return write("withdrawal", withdrawal, withdrawal.at);
    },
  });
}

/**
 * Whether an intent is addressed by its own content: work whose items extend an admitted hierarchy
 * belongs to the root holding that hierarchy, and is admitted there rather than posted.
 */
export function intentExtendsHeldWork(intent) {
  return intent.items.some((item) => item.parent !== undefined || item.parentWitness !== undefined);
}

/**
 * The micro-enterprise already holding an intent's work, read from the board: the one that took an
 * earlier signal of the same intent (its accepted taker first), or the one holding the work an item
 * extends. A revision or an extension goes to its holder; it is not opened to everyone again.
 */
export function holderOf(board, intent) {
  const cited = new Set(intent.items.map((item) => item.parentWitness?.subject).filter(Boolean));
  for (const entry of board) {
    if (entry.signal.intent.id === intent.id && entry.takers.length > 0) return entry.accepted ?? entry.takers[0];
    const holding = entry.held.find((held) => cited.has(held.subject));
    if (holding !== undefined) return holding.enterprise;
  }
  return undefined;
}

/**
 * A settlement's intake: demand addressed by its own content goes to its holder; work extending a
 * hierarchy held before the board existed is admitted into this root, where that hierarchy lives;
 * everything else is posted for a micro-enterprise to take. The intake never chooses a taker.
 */
export function settlementIntake({ binding, board = signalBoardStore(binding), rootName }) {
  return (input, { at }) => {
    const intent = assertStructuredWorkIntent(input);
    const holder = holderOf(board.read(), intent);
    if (holder === undefined && intentExtendsHeldWork(intent)) return admitStructuredWorkIntent(binding, intent, { at, rootName });
    const tags = [...new Set((intent.sources ?? []).map((source) => source.kind).filter(Boolean))];
    const signal = board.post({ poster: intent.producer.id, intent, ...(holder === undefined ? {} : { to: holder }), ...(tags.length === 0 ? {} : { tags }) });
    return structuredWorkIntentAdmissionContract.assert(Object.freeze({
      kind: "metroplat.work.structured-intent-admission",
      intent: intent.id,
      subject: `structured-work-intent-${slugify(intent.id) || "slug"}`,
      items: intent.items.length,
      obligations: [],
      appended: 0,
      status: "posted",
      signal: signal.id,
    }), "structured work intent posting");
  };
}

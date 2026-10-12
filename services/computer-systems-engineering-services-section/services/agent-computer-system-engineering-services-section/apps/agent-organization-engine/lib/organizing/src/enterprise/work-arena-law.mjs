/**
 * enterprise/work-arena-law — the editions of the work arena's law, as content-addressed data
 * (561 Group note 2026-10-03 "How the node changes itself").
 *
 * An edition is a record { kind, arena, edition, previous, note, says }: its number, the address of
 * the edition it follows, the note that states it and one paragraph of what it changes. Its address
 * is the record's semantic content address. The chain of editions, each naming its predecessor, is
 * the law's skeleton: it grows by deposition, one edition at a time, and is never rewritten.
 *
 * A move records the edition that admitted it (`edition`, its address, beside its time and outside
 * its content, so a thread's id never depends on its law; a report's own `law` is the law it finds
 * broken). The board judges each move under its own edition, as a law
 * judges an act by the law in force when it was done (non-retroactivity), and reads its meaning
 * forward, one edition's pure `forward` reading at a time, into the terms of the edition it is read
 * under (glass-sponge note, 2026-08-01, §9.2: a migration is never a prefix rewrite; what cannot be
 * recovered stays unknown). A move whose edition this release does not know, or whose meaning an
 * edition cannot carry forward, is unread: kept, listed with its reason, and played by no reading
 * until a release that knows how to read it. Moves stored before moves named their law belong to
 * the sixteenth edition, the chain's root, where they hold under it: this node's were admitted under
 * it or read into it by hand migrations. One that does not hold there was admitted under an earlier
 * edition that no migration read into the sixteenth (a peer's journal the hand migrations never
 * reached), and it is unread like any move whose law this release does not know, never refused under
 * a law it was not admitted under (`unmigratedReason`).
 *
 * Which edition is in force is a governance act, not a release. The agency's law record (policies
 * pool, `work-arena-law`) names the adopted edition's address, and an office with power over it
 * adopts an edition by an act on the agency act chain (agency-record-admit). An edition this release
 * realizes binds new moves only once it is adopted; until then it is pending, and the adopted
 * edition admits them. An adopted edition this release does not realize leaves the newest realized
 * edition in force. Either mismatch is a nonconformity for group-operations to measure
 * (group-operations `work-arena-law-findings`), never a reason to stop.
 * @packageDocumentation
 */
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";

export const WORK_ARENA_LAW = "work-arena";
/** The agency record whose head names the adopted edition: `<group section>/lib/agency/policies/work-arena-law.json`. */
export const WORK_ARENA_LAW_RECORD = "work-arena-law";

const NOTES = "lib/emsenn/services/561-group/services/561-group-services-section/content/text/documents/articles/notes";

function editionOf({ edition, previous = null, note, says, forward }) {
  if (!Number.isInteger(edition) || edition < 1) throw new TypeError("a law edition has a positive number");
  if (typeof note !== "string" || typeof says !== "string" || says === "") throw new TypeError("a law edition names the note that states it and says what it changes");
  const record = Object.freeze({ kind: "work-arena-edition", arena: WORK_ARENA_LAW, edition, previous, note, says });
  return Object.freeze({ ...record, address: semanticId(record), ...(forward === undefined ? {} : { forward }) });
}

/** The sixteenth edition: the chain's root, the law every move stored before law addresses was read under. */
export const SIXTEENTH_EDITION = editionOf({
  edition: 16,
  note: `${NOTES}/2026/10/02/2026-10-02-note-on-the-work-arenas-sixteenth-edition.md`,
  says: "Every miss has a reason and a reader: a rejection carries its reason, order channels and assessing attempts are calibrations, a derivation settles only its own domain and says a finding again as it now stands, and a node whose release is refused reports it.",
});

/**
 * The seventeenth edition: an order is a meaning-closure, and a witness told before its delivery
 * stands is kept as a telling. Requests admitted under the sixteenth edition carry no codomain or
 * examples, so their meaning reads forward unchanged: an order without a codomain stays open.
 */
export const SEVENTEENTH_EDITION = editionOf({
  edition: 17,
  previous: SIXTEENTH_EDITION.address,
  note: `${NOTES}/2026/10/03/2026-10-03-note-on-the-work-arenas-seventeenth-edition.md`,
  says: "An order is a meaning-closure: a request's contract may state its result's codomain (returns, an anonymous JSON Schema) and admitted examples the codomain types, its takers' work carries the codomain so a result outside it is a miss, and its assayer reads the examples. A judgment told before the delivery it would judge is kept as a telling that bears on no delivery, never refused.",
  forward: (move) => ({ move }),
});

/**
 * The eighteenth edition: perishable capacity is offered on the board. A resource's holder opens a
 * supply, what is left of it is read from the record, and consumers draw what their requests need
 * before it lapses. Nothing admitted under the seventeenth edition changes meaning.
 */
export const EIGHTEENTH_EDITION = editionOf({
  edition: 18,
  previous: SEVENTEENTH_EDITION.address,
  note: `${NOTES}/2026/10/03/2026-10-03-note-on-the-work-arenas-eighteenth-edition.md`,
  says: "Capacity that perishes is offered, not hand-wired: a resource's holder opens a supply (an amount of a resource until it lapses, what one unit of each kind it makes costs, and whether it admits work while any is left), consumers draw from it for the requests they serve and return what they did not use, and what is left is read from the supplier's latest reading of what remains less the draws since. A draw past what is left, or after the supply lapses, is refused.",
  forward: (move) => ({ move }),
});

/** The editions this release realizes, oldest first. */
export const WORK_ARENA_EDITIONS = Object.freeze([SIXTEENTH_EDITION, SEVENTEENTH_EDITION, EIGHTEENTH_EDITION]);
/** The newest edition this release realizes. */
export const REALIZED_EDITION = WORK_ARENA_EDITIONS.at(-1);

const BY_ADDRESS = new Map(WORK_ARENA_EDITIONS.map((edition) => [edition.address, edition]));

/** The realized edition at an address, or undefined. */
export const editionAt = (address) => BY_ADDRESS.get(address);

/**
 * Whether a move names an edition this release does not realize: a peer's on a newer law, or one
 * admitted before a rollback. Such a move is kept unread, never judged under a law it was not
 * admitted under.
 */
export const isUnreadableMove = (move) => move?.edition !== undefined && !BY_ADDRESS.has(move.edition);

/**
 * Why a move that names no edition and does not hold under the sixteenth is unread: it was admitted
 * under an edition before the sixteenth, and no migration read it forward. `why` is what the sixteenth
 * finds wrong with it.
 */
export const unmigratedReason = (why) => `admitted before moves named their law, under an edition before the sixteenth that no migration read it into (the sixteenth finds: ${why})`;

/** The edition that admitted a stored move: the one its `edition` names, or the chain's root for a move stored before moves named one. */
export const editionOfMove = (move) => (move.edition === undefined ? SIXTEENTH_EDITION : BY_ADDRESS.get(move.edition));

/**
 * A stored move read forward from its own edition into `to`'s terms: { move, edition } with the
 * move's own edition (the law that admitted it, kept on the move), or { unread } with why it is not
 * read. A move is never read backward: one admitted under an edition newer than `to` is unread.
 */
export function readForward(move, to = REALIZED_EDITION) {
  const own = editionOfMove(move);
  if (own === undefined) return Object.freeze({ unread: `admitted under law edition ${move.edition}, which this release does not realize` });
  if (own.edition > to.edition) return Object.freeze({ unread: `admitted under the ${ordinal(own.edition)} edition, newer than the ${ordinal(to.edition)} in force here` });
  let read = move;
  for (const edition of WORK_ARENA_EDITIONS) {
    if (edition.edition <= own.edition || edition.edition > to.edition) continue;
    const next = edition.forward?.(read) ?? { move: read };
    if (next.move === undefined) return Object.freeze({ unread: `the ${ordinal(edition.edition)} edition cannot read this move forward: ${next.unread ?? "its meaning is not recovered"}` });
    read = next.move;
  }
  return Object.freeze({ move: read, edition: own });
}

/**
 * The law in force given an agency (organizing agency registry): { adopted, inForce, realized,
 * standing, record? }. `adopted` is the edition address the law record names (undefined with no
 * record); `inForce` the realized edition that admits new moves; `standing` one of `adopted` (in
 * force is what was adopted and the newest realized), `pending` (a newer realized edition awaits
 * adoption), `unrealized` (the adopted edition is not in this release), `unadopted` (no record:
 * nothing was adopted, so the chain's root admits). Without an agency (a tool, a test), the newest
 * realized edition is in force.
 */
export function workArenaLawOf(agency) {
  if (agency === undefined) return Object.freeze({ inForce: REALIZED_EDITION, realized: REALIZED_EDITION, standing: "ungoverned" });
  const record = agency.byId?.policies?.get(WORK_ARENA_LAW_RECORD)?.[0];
  const adopted = typeof record?.edition === "string" ? record.edition : undefined;
  if (adopted === undefined) return Object.freeze({ inForce: SIXTEENTH_EDITION, realized: REALIZED_EDITION, standing: "unadopted" });
  const known = BY_ADDRESS.get(adopted);
  if (known === undefined) return Object.freeze({ adopted, inForce: REALIZED_EDITION, realized: REALIZED_EDITION, standing: "unrealized", record });
  return Object.freeze({ adopted, inForce: known, realized: REALIZED_EDITION, standing: known === REALIZED_EDITION ? "adopted" : "pending", record });
}

export function ordinal(n) {
  const words = { 16: "sixteenth", 17: "seventeenth", 18: "eighteenth", 19: "nineteenth", 20: "twentieth" };
  return words[n] ?? `${n}th`;
}

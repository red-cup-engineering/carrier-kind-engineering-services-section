/**
 * SignChain — the telling log: tellings in the order they were told.
 *
 * A telling is one row: a cell's triple, the side it tells (for or against),
 * and its witness — by default its position in the log, the way an EAVT row's
 * time witnesses its fact. Telling against is information about the same cell
 * (Belnap's "told false"), not the absence of telling for. The log only grows.
 * Read by pattern it gives back rows in order (so "the latest telling about
 * this" is well defined); read as cells it gives the cell set, each cell's
 * sides gathered from its rows. A cell set forgets order; the log keeps it.
 */
import { address, cell, cellSet, coincides, coincidenceKey, knowledgeReading, measured } from "@red-cup-engineering/signcell/cell";
import { signCellOfSeavt, isAbsoluteSeavtClock, compareAbsoluteSeavtClocks } from "@red-cup-engineering/semiotic-eavt-services-section/admit-seavt-row";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { retainedCarrier } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { readingOfSides } from "@red-cup-engineering/computer-data-engineering-services-section/four";

const ROLES = ["subject", "predicate", "object"];
const SIDES = ["for", "against"];
const matches = (pattern, row) => ROLES.every((role) => !Object.hasOwn(pattern, role) || coincides(pattern[role], row[role]));

/** Index by exactly the canonical SCA coincidence relation used by SignCell.
 * JSON.stringify is not an identity function: NFC-equivalent marks and keys
 * would otherwise be present in the log but absent from indexed queries. */
const keyOf = coincidenceKey;

/** One telling: a triple, the side it tells, and its witness. */
export function telling(at, witness, side = "for", observedAt = undefined) {
  for (const role of ROLES) if (at?.[role] === undefined) throw new TypeError(`signchain log: a telling needs a ${role}`);
  if (!SIDES.includes(side)) throw new TypeError(`signchain log: a telling's side is "for" or "against", not ${JSON.stringify(side)}`);
  if (witness === undefined) throw new TypeError("signchain log: a telling must carry a witness");
  // Own the entire event, including nested witnesses, before indexing it. A
  // later mutation of provider-owned input cannot rewrite a past telling.
  return retainedCarrier({ subject: at.subject, predicate: at.predicate, object: at.object, side, witness, ...(observedAt === undefined ? {} : { observedAt }) });
}

/** The cells a list of tellings tells. Unknown/missing sides must never
 * silently become affirmative evidence. */
export const cellsOfRows = (rows) => cellSet(rows.map((row) => {
  const admitted = telling(row, row?.witness, row?.side);
  return cell(admitted.subject, admitted.predicate, admitted.object, { [admitted.side]: [admitted.witness] });
}));

/** An append-only log of tellings. */
export class TellingLog {
  #rows = [];
  // Row positions by each role's term key, so a pattern is read from its narrowest role.
  #byRole = Object.fromEntries(ROLES.map((role) => [role, new Map()]));

  constructor(rows = []) {
    for (const row of rows) {
      if (!SIDES.includes(row?.side))
        throw new TypeError("signchain log: persisted telling requires an explicit for/against side");
      this.#push(telling(row, row.witness, row.side, row.observedAt));
    }
  }

  #push(row) {
    const position = this.#rows.length;
    this.#rows.push(row);
    for (const role of ROLES) {
      const key = keyOf(row[role]), positions = this.#byRole[role].get(key);
      if (positions) positions.push(position); else this.#byRole[role].set(key, [position]);
    }
  }

  /** The rows a pattern can match, in order: those under its narrowest role, or all. */
  #candidates(pattern) {
    let narrowest = null;
    for (const role of ROLES) {
      if (!Object.hasOwn(pattern, role)) continue;
      const positions = this.#byRole[role].get(keyOf(pattern[role])) ?? [];
      if (narrowest === null || positions.length < narrowest.length) narrowest = positions;
    }
    return narrowest === null ? this.#rows : narrowest.map((position) => this.#rows[position]);
  }

  /** Tell a triple for (witness defaults to the row's position). */
  tell(at, witness = this.#rows.length, observedAt = undefined) { this.#push(telling(at, witness, "for", observedAt)); return this; }

  /** Tell a triple against. */
  deny(at, witness = this.#rows.length, observedAt = undefined) { this.#push(telling(at, witness, "against", observedAt)); return this; }

  /** The rows, in order. */
  get rows() { return Object.freeze([...this.#rows]); }

  /** How many tellings, repeats included. */
  get size() { return this.#rows.length; }

  /** The rows telling for a triple matching a pattern of any of subject, predicate, object, in order. */
  where(pattern = {}) { return Object.freeze(this.#candidates(pattern).filter((row) => row.side === "for" && matches(pattern, row))); }

  /** The rows telling against a triple matching a pattern, in order. */
  against(pattern = {}) { return Object.freeze(this.#candidates(pattern).filter((row) => row.side === "against" && matches(pattern, row))); }

  /** The latest row telling for a pattern, if any. */
  latest(pattern = {}) { const found = this.where(pattern); return found[found.length - 1]; }

  /** The cells (all of them, or those matching a pattern). */
  cells(pattern = {}) { return Object.freeze(cellsOfRows(this.#candidates(pattern).filter((row) => matches(pattern, row)))); }

  /** FOUR is a valuation of one proposition, never an aggregation across
   * unrelated cells. Broad where/against queries remain possible for discovery,
   * but asking for a knowledge value requires all three predication terms. */
  readingWhere(pattern) {
    if (!pattern || typeof pattern !== "object" || !ROLES.every(role => Object.hasOwn(pattern, role)))
      throw new TypeError("signchain log: a FOUR reading requires one complete subject/predicate/object proposition");
    return readingOfSides("knowledge", this.where(pattern).length > 0, this.against(pattern).length > 0);
  }

  /** The knowledge reading at one triple. */
  readingAt(at) { return this.readingWhere({ subject: at.subject, predicate: at.predicate, object: at.object }); }
}

/** Tell a triple on the sides given as [for, against]. */
export function tellSides(log, at, [forSide, againstSide]) {
  if (forSide) log.tell(at);
  if (againstSide) log.deny(at);
  return log;
}

/** A cell's knowledge reading, re-exported for readers of the log's cells. */
export { knowledgeReading };

/**
 * Reconstruct the append-only tellings of witnessed SignCells from existing
 * native SEN/SEAVT rows. The SEAVT store remains the authoritative custody;
 * this is a read projection, not a second journal or a new receipt format.
 *
 * The supplied stream must be nondecreasing in the SEAVT observation clock.
 * The optional asOf cut excludes future observations; it does NOT independently
 * establish a source's publication/availability time. Every cell must be
 * Measured: a telling log cannot represent an unwitnessed value override.
 * Repeated cumulative snapshots do not create fresh witnesses.
 */
export function logOfSeavtRows(rows, { asOf } = {}) {
  if (rows == null || typeof rows[Symbol.iterator] !== "function")
    throw new TypeError("signchain log: SEAVT rows must be iterable");
  if (asOf !== undefined && !isAbsoluteSeavtClock(asOf))
    throw new TypeError("signchain log: asOf must be an absolute timestamp");
  const log = new TellingLog(), seen = new Set();
  let preceding = null;
  for (const row of rows) {
    if (!isAbsoluteSeavtClock(row?.t))
      throw new TypeError("signchain log: SEAVT observation clock must be absolute");
    if (preceding !== null && compareAbsoluteSeavtClocks(row.t, preceding) < 0)
      throw new RangeError("signchain log: SEAVT observations must be time-ordered");
    preceding = row.t;
    // Exact fractional-second filtration: no future witness may cross a cut
    // merely because two distinct instants share a JavaScript millisecond.
    if (asOf !== undefined && compareAbsoluteSeavtClocks(row.t, asOf) > 0) break;
    const at = signCellOfSeavt(row); // SEN admission and SCA subject verification
    if (!measured(at))
      throw new TypeError("signchain log: non-measured SignCell requires a witnessed valuation, not a telling");
    for (const side of ["for", "against"]) for (const witness of at[side]) {
      const key = semanticId([address(at), side, witness]);
      if (seen.has(key)) continue;
      seen.add(key);
      if (side === "for") log.tell(at, witness, row.t);
      else log.deny(at, witness, row.t);
    }
  }
  return log;
}

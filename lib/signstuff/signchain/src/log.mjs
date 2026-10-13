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
import { cell, cellSet, coincides, coincidenceKey, knowledgeReading } from "@red-cup-engineering/signcell/cell";
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
export function telling(at, witness, side = "for") {
  for (const role of ROLES) if (at?.[role] === undefined) throw new TypeError(`signchain log: a telling needs a ${role}`);
  if (!SIDES.includes(side)) throw new TypeError(`signchain log: a telling's side is "for" or "against", not ${JSON.stringify(side)}`);
  if (witness === undefined) throw new TypeError("signchain log: a telling must carry a witness");
  // Own the entire event, including nested witnesses, before indexing it. A
  // later mutation of provider-owned input cannot rewrite a past telling.
  return retainedCarrier({ subject: at.subject, predicate: at.predicate, object: at.object, side, witness });
}

/** The cells a list of tellings tells. */
export const cellsOfRows = (rows) => cellSet(rows.map((row) => cell(row.subject, row.predicate, row.object, { [row.side ?? "for"]: [row.witness] })));

/** An append-only log of tellings. */
export class TellingLog {
  #rows = [];
  // Row positions by each role's term key, so a pattern is read from its narrowest role.
  #byRole = Object.fromEntries(ROLES.map((role) => [role, new Map()]));

  constructor(rows = []) { for (const row of rows) this.#push(telling(row, row.witness, row.side)); }

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
  tell(at, witness = this.#rows.length) { this.#push(telling(at, witness, "for")); return this; }

  /** Tell a triple against. */
  deny(at, witness = this.#rows.length) { this.#push(telling(at, witness, "against")); return this; }

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

  /** The knowledge reading of a pattern: told for if a for-row matches it, against if an against-row does. */
  readingWhere(pattern = {}) { return readingOfSides("knowledge", this.where(pattern).length > 0, this.against(pattern).length > 0); }

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

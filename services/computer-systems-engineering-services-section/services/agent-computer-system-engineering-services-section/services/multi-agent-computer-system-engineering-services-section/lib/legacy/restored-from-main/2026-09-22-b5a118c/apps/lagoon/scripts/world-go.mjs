// world-go — moves an already-constituted actor entity to a named place, by appending one
// "located-in" row (@red-cup-engineering/eavt's own row law: rows are appended, never edited,
// never retracted here — a later `go` simply adds another witness of where the actor has been).
// Composes only readEavtFile/appendEavt (eavt) and this app's own scripts/world-look.mjs name
// resolution; invents no substrate law.

import { readEavtEntries } from "@red-cup-engineering/eavt/read-eavt-entries";
import { appendEavtRow } from "@red-cup-engineering/eavt/append-eavt-row";
import { findAddressByName } from "./world-look.mjs";

/**
 * Moves an actor entity to a named place by appending a `located-in` row naming the place's
 * own constituted address.
 *
 * @summary Appends {actor, "located-in", placeAddress, t} to an on-disk EAVT trace.
 * @param {string} tracePath Path to the on-disk EAVT trace (readEavtFile's own format).
 * @param {string} actor The mover's own entity address (already constituted).
 * @param {string} placeName The `name` attribute of the destination place.
 * @param {number} t The row's transaction/witness coordinate.
 * @returns {{actor: string, place: string, address: string, row: object}} The destination
 *   place's resolved address and the row appended.
 * @throws {TypeError} When no constituted entity in the trace carries `placeName`.
 */
export function go(tracePath, actor, placeName, t) {
  const rows = readEavtEntries({ path: tracePath });
  const address = findAddressByName(rows, placeName);
  if (address === undefined) {
    throw new TypeError(`world-go: no constituted place named ${JSON.stringify(placeName)}`);
  }
  const row = { e: actor, a: "located-in", v: address, t };
  appendEavtRow({ path: tracePath, row });
  return { actor, place: placeName, address, row };
}

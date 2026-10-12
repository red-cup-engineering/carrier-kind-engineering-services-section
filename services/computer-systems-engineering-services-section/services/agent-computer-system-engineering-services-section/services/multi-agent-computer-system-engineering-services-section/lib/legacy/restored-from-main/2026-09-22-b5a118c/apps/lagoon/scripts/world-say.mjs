// world-say — constitutes an "utterance" entity (@red-cup-engineering/eavt's constituteEntity —
// the EAVT sketch-lane <kind>:<ni-digest> address rule) and attributes it to its speaker and
// place with two further rows, gerund-predicate style like "located-in": the vocabulary-of-
// attributes law, never a per-kind object schema baked into one row. Composes only eavt's own
// constituteEntity/appendEavt/readEavtFile and this app's own scripts/world-look.mjs name
// resolution; invents no substrate law.

import { readEavtEntries } from "@red-cup-engineering/eavt/read-eavt-entries";
import { appendEavtRow } from "@red-cup-engineering/eavt/append-eavt-row";
import { constitute } from "@red-cup-engineering/eavt/constitute-entity";
import { findAddressByName } from "./world-look.mjs";

/**
 * Constitutes an utterance entity carrying the spoken text, then appends its genesis row plus
 * two attribution rows naming who spoke it and where.
 *
 * @summary Speaks: constitutes+appends an utterance, attributed to its speaker and place.
 * @param {string} tracePath Path to the on-disk EAVT trace (readEavtFile's own format).
 * @param {string} speaker The speaker's own entity address (already constituted).
 * @param {string} placeName The `name` attribute of the place the utterance is spoken at.
 * @param {string} text The spoken text — the utterance's one genesis attribute.
 * @param {number} t The genesis row's transaction/witness coordinate.
 * @returns {{address: string, place: string, genesisRow: object, spokenByRow: object,
 *   spokenAtRow: object}} The constituted utterance's own address and every row appended.
 * @throws {TypeError} When no constituted entity in the trace carries `placeName`.
 */
export function say(tracePath, speaker, placeName, text, t) {
  const rows = readEavtEntries({ path: tracePath });
  const placeAddress = findAddressByName(rows, placeName);
  if (placeAddress === undefined) {
    throw new TypeError(`world-say: no constituted place named ${JSON.stringify(placeName)}`);
  }

  const { address, genesis: genesisRow } = constitute({ kind: "utterance", attributes: { text }, t });
  appendEavtRow({ path: tracePath, row: genesisRow });

  const spokenByRow = { e: address, a: "spoken-by", v: speaker, t };
  const spokenAtRow = { e: address, a: "spoken-at", v: placeAddress, t };
  appendEavtRow({ path: tracePath, row: spokenByRow });
  appendEavtRow({ path: tracePath, row: spokenAtRow });

  return { address, place: placeName, genesisRow, spokenByRow, spokenAtRow };
}

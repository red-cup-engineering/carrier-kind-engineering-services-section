// wire — the JSON reading of a settling, so the section's scripts have data to move.
//
// A settling on the wire is a plain record `{ "<cell>": "<charge value name>" }`, the names being
// @lenticule-science/articulating's own four: "absurd" (⊥), "potential" (t), "active" (f),
// "stable" (⊤). No second FOUR representation is introduced — `asChargeValueName` and
// `chargeValue` are articulating's, and this module only turns its names into its values and back.
// The schema for this shape is data/records/schema/settling.schema.json.

import {
  asChargeValueName,
  chargeValue,
  chargeValueName,
} from "@lenticule-science/articulating/predicating/positing/bilattice-charge";

/** Decode a wire settling (cell -> charge value name) into a settling of charge values. */
export function readSettling(wire) {
  if (!wire || typeof wire !== "object" || Array.isArray(wire)) {
    throw new TypeError("readSettling: a settling is a record of cell -> charge value name");
  }
  const out = {};
  for (const [cell, name] of Object.entries(wire)) out[cell] = chargeValue(asChargeValueName(name));
  return out;
}

/** Encode a settling of charge values back to the wire record. */
export function writeSettling(settling) {
  const out = {};
  for (const [cell, value] of Object.entries(settling)) out[cell] = chargeValueName(value);
  return out;
}

/** Decode a wire orbit (a list of charge value names for one cell) into charge values. */
export function readOrbit(wire) {
  if (!Array.isArray(wire)) throw new TypeError("readOrbit: an orbit is a list of charge value names");
  return wire.map((name) => chargeValue(asChargeValueName(name)));
}

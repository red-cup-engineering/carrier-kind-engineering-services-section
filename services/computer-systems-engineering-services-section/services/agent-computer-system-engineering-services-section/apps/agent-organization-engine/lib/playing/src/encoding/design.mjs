/**
 * Design codec — Girard's dialogical objects as reading valuations.
 *
 * The ludics correspondence theorem makes a design a partial valuation from
 * loci into the bilattice reading: a finite list of `{locusKey, reading}` entries.
 * We serialize each entry as `{locus: <address>, reading: <reading tag>}`, using
 * the same address-array carrier as the rest of the ludics surface.
 *
 * Round-trip note: `design(map)` drops any entry whose reading is `absurd`
 * ($\bot$) — that is the default, the no-action region.  This is harmless for
 * round-tripping because a design's support never carries `absurd` (entries
 * with $\bot$ are already dropped at construction), so `encode` never emits one
 * and `decode` never needs to preserve one.
 */
import { design } from "../structuring/concurrent-game/with-symmetry/ludicizing/design.mjs";

import { decodeReading, encodeReading } from "./reading.mjs";
import { locusFromKey, locusKey } from "../structuring/concurrent-game/with-symmetry/ludicizing/locus.mjs";
import { decodeLocus, encodeLocus } from "./locus.mjs";
import { asArray, asObject, field } from "./json.mjs";

/** Encode a design to `{entries: [{locus, reading}, ...]}`. */
export function encodeDesign(value) {
  return {
    entries: value.entries.map((entry) => ({
      locus: encodeLocus(locusFromKey(entry.locusKey)),
      reading: encodeReading(entry.reading),
    })),
  };
}

/** Decode `{entries: [{locus, reading}, ...]}` back to the frozen `Design`. */
export function decodeDesign(json) {
  const obj = asObject(json, "design");
  const entries = asArray(field(obj, "entries", "design"), "design.entries");
  const labelling = new Map();
  for (const raw of entries) {
    const entry = asObject(raw, "design.entry");
    const key = locusKey(decodeLocus(field(entry, "locus", "design.entry")));
    labelling.set(key, decodeReading(field(entry, "reading", "design.entry")));
  }
  return design(labelling);
}

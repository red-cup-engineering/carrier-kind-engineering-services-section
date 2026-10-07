import { isReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
/**
 * Reading codec — the apex value, serialized by its stable name.
 *
 * "meme is the APEX": every game object is a configuration of
 * `@emsenn/meme-algebra`, and the atom of that configuration is the bilattice
 * `ReadingValue`.  A reading value is named by one of four stable tags —
 * `absurd` ($\bot$), `potential` ($t$), `active` ($f$), `stable` ($\top$) — so
 * the reading-faithful JSON of a reading is exactly that name string.  Decode
 * guards the tag and rebuilds the *real* frozen reading via `readingValue`; we do
 * not reinvent the bilattice, we name it.
 */
const isReadingInKnowledge = (name) => isReading(name, "knowledge");

/** Encode a reading value to its stable name tag (e.g. `"stable"`). */
export function encodeReading(value) {
  return (value);
}

/** Decode a reading-name tag back to the frozen `ReadingValue`; `TypeError` on a bad tag. */
export function decodeReading(json) {
  if (typeof json !== "string" || !isReadingInKnowledge(json)) {
    throw new TypeError(`game-codecs: expected reading-value name, got ${JSON.stringify(json)}`);
  }
  return (json);
}

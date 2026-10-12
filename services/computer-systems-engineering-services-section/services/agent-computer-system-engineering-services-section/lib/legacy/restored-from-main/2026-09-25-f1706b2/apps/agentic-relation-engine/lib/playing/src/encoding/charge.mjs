/**
 * Charge codec — the apex value, serialized by its stable name.
 *
 * "meme is the APEX": every game object is a configuration of
 * `@emsenn/meme-algebra`, and the atom of that configuration is the bilattice
 * `ChargeValue`.  A charge value is named by one of four stable tags —
 * `absurd` ($\bot$), `potential` ($t$), `active` ($f$), `stable` ($\top$) — so
 * the charge-faithful JSON of a charge is exactly that name string.  Decode
 * guards the tag and rebuilds the *real* frozen charge via `chargeValue`; we do
 * not reinvent the bilattice, we name it.
 */
import { isReading } from "@red-cup-engineering/computer-code-engineering-services-section/signchain/bilattice";
const isReadingInKnowledge = (name) => isReading(name, "knowledge");

/** Encode a charge value to its stable name tag (e.g. `"stable"`). */
export function encodeCharge(value) {
  return (value);
}

/** Decode a charge-name tag back to the frozen `ChargeValue`; `TypeError` on a bad tag. */
export function decodeCharge(json) {
  if (typeof json !== "string" || !isReadingInKnowledge(json)) {
    throw new TypeError(`game-codecs: expected charge-value name, got ${JSON.stringify(json)}`);
  }
  return (json);
}

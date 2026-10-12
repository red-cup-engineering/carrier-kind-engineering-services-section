// What forgetting destroys, measured — built on the stable @red-cup-engineering/metrologic morphisms.
//
// forget = transfer (η of the predication monad): present each path of the void cone as an
// ATOMIC edge, dropping every composite. It is non-injective — a saturated cone (atoms + the
// composites realize built) and the bare atoms forget to the SAME atoms (the KZ unit's
// non-invertibility), so the composition history is gone. The information forgetting destroys is
// exactly twistor's residue: the concept-sequences that never saturate into an object — the
// aperiodic void, H¹≠0.

import { saturate, transfer, twistor } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/void";

// realize = saturate (μ): compose paths across a shared object; forget = transfer (η).
export { saturate as realize, transfer as forget };

// A canonical composable cone: a →[p]→ b →[q]→ c. realize composes it (adds a →[p,q]→ c);
// forget erases that composite.
export const composableCone = () => ({
  potential: [
    { subject: "a", predicate: "p", object: "b" },
    { subject: "b", predicate: "q", object: "c" },
  ],
});

const S = JSON.stringify;

// Logical irreversibility: realize-then-forget lands on the same atoms as forget alone, so the
// realized composites cannot be recovered from the output — distinct inputs, identical output.
export const isNonInjective = (cone = composableCone()) =>
  S(transfer(saturate(cone))) === S(transfer(cone));

// The erased information = twistor's residue: the unsaturable concept-sequences (the composites
// forget drops). Each is one binary distinction (present in the realized cone / invisible after
// forget), so the count is the number of bits erased.
export const erasedSequences = (cone = composableCone()) => twistor(cone).residue;
export const bitsErased = (cone = composableCone()) => erasedSequences(cone).length;

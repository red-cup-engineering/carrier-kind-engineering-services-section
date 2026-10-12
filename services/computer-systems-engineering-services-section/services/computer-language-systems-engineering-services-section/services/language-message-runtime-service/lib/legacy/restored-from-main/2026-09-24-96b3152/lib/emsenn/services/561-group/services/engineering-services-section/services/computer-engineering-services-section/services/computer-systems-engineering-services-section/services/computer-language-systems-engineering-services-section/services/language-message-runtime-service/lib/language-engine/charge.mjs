// language-engine/charge.mjs — grammatical charge, the four-valued bilattice word for
// linguistic judgments. Mechanically ported (types stripped) from the
// recovered @lenticule-science/language-algebra/src/charge.mts, merged with
// @lenticule-science/language-topology/src/charge.mts (which was itself only a
// re-export/rename of this layer — chargeStatus as `status`, plus the
// evidenceless BOTTOM/TOP/TRUE/FALSE constants). Logic is unchanged; the
// only thing dropped is the `import type { ChargeValue } from
// "@lenticule-science/meme-topology"` type-only import, which constrained nothing at
// runtime.
//
// The four charge values:
//   absurd    (⊥) — no judgment yet; the default for any unmentioned cell
//   potential (t) — compliant: the positive side is witnessed
//   active    (f) — violation: the negative side is witnessed
//   stable    (⊤) — contradictory: both sides witnessed, held not discarded
//
// Two σ-dual lattice orders:
//   knowledge: absurd < {potential, active} < stable  ("how determined")
//   truth:     active < {absurd, stable} < potential  ("which way")

const truthBit = (v) => v === "potential" || v === "stable";
const falsityBit = (v) => v === "active" || v === "stable";

const fromBits = (truth, falsity) => {
  if (truth && falsity) return "stable";
  if (truth) return "potential";
  if (falsity) return "active";
  return "absurd";
};

const make = (value, pos, neg) => Object.freeze({
  kind: "language-algebra.charge",
  value,
  positiveWitnesses: Object.freeze([...pos]),
  negativeWitnesses: Object.freeze([...neg]),
});

// ── constructors ──────────────────────────────────────────────────────────────

/** ⊥ absurd — no judgment; the identity of joinKnowledge. */
export const bottom = () => make("absurd", [], []);
/** ⊤ stable — both sides witnessed; a held contradiction. */
export const top = () => make("stable", [], []);
/** potential — positive charge, no witness (evidenceless). */
export const potential = () => make("potential", [], []);
/** active — negative charge, no witness (evidenceless). */
export const active = () => make("active", [], []);
/** active — a negative finding with a witness (a rule violation, a parse failure). */
export const violation = (witness) => make("active", [], [witness]);
/** potential — a positive finding with a witness (a rule satisfaction, a parse success). */
export const compliant = (witness) => make("potential", [witness], []);

// ── guards ────────────────────────────────────────────────────────────────────

export const isBottom = (c) => c.value === "absurd";
export const isTop = (c) => c.value === "stable";
/** True when the negative (falsity) side is present — violation or stable. */
export const isViolation = (c) => falsityBit(c.value);
/** True when the positive (truth) side is present — compliant or stable. */
export const isCompliant = (c) => truthBit(c.value);

/** Epistemic status: void (⊥), ambiguous (⊤), or decided (one side only). */
export const chargeStatus = (c) => {
  if (isTop(c)) return "ambiguous";
  if (isBottom(c)) return "void";
  return "decided";
};
export const status = chargeStatus;

// ── lattice operations ────────────────────────────────────────────────────────

/** left ≤_k right: right is at least as determined as left on both sides. */
export const leqKnowledge = (left, right) =>
  (!truthBit(left.value) || truthBit(right.value)) &&
  (!falsityBit(left.value) || falsityBit(right.value));

/** Knowledge-order join (lub in ≤_k): OR both coordinates; evidence accumulates. */
export const joinKnowledge = (left, right) =>
  make(
    fromBits(truthBit(left.value) || truthBit(right.value), falsityBit(left.value) || falsityBit(right.value)),
    [...left.positiveWitnesses, ...right.positiveWitnesses],
    [...left.negativeWitnesses, ...right.negativeWitnesses],
  );

/** Knowledge-order meet (glb in ≤_k): AND both coordinates; evidence accumulates. */
export const meetKnowledge = (left, right) =>
  make(
    fromBits(truthBit(left.value) && truthBit(right.value), falsityBit(left.value) && falsityBit(right.value)),
    [...left.positiveWitnesses, ...right.positiveWitnesses],
    [...left.negativeWitnesses, ...right.negativeWitnesses],
  );

/** Truth-order join (lub in ≤_t): truth OR, falsity AND. */
export const joinTruth = (left, right) =>
  make(
    fromBits(truthBit(left.value) || truthBit(right.value), falsityBit(left.value) && falsityBit(right.value)),
    [...left.positiveWitnesses, ...right.positiveWitnesses],
    [...left.negativeWitnesses, ...right.negativeWitnesses],
  );

/** Truth-order meet (glb in ≤_t): truth AND, falsity OR. */
export const meetTruth = (left, right) =>
  make(
    fromBits(truthBit(left.value) && truthBit(right.value), falsityBit(left.value) || falsityBit(right.value)),
    [...left.positiveWitnesses, ...right.positiveWitnesses],
    [...left.negativeWitnesses, ...right.negativeWitnesses],
  );

// ── residuation (the Lambek grammar combinator) ───────────────────────────────

/** left ≤_t right: at least as true (truth grows, falsity shrinks). */
export const leqTruth = (left, right) =>
  (!truthBit(left.value) || truthBit(right.value)) &&
  (!falsityBit(right.value) || falsityBit(left.value));

/** Fusion ⊙ — the monoid that combines two judgments (unit = TRUE/potential). */
export const fuse = (left, right) => meetTruth(left, right);

const FOUR = ["absurd", "active", "potential", "stable"];
const valued = (v) => make(v, [], []);

/** Implication ⇒ — the right residual of ⊙: the largest a (in ≤_t) with a ⊙ b ≤_t c. */
export const implies = (b, c) => {
  const bv = valued(b.value);
  const cv = valued(c.value);
  return FOUR
    .map(valued)
    .filter((a) => leqTruth(fuse(a, bv), cv))
    .reduce((acc, a) => joinTruth(acc, a), active());
};

// ── involutions ───────────────────────────────────────────────────────────────

/** Truth involution: swap positive and negative — value AND evidence together. */
export const negate = (c) =>
  make(fromBits(falsityBit(c.value), truthBit(c.value)), [...c.negativeWitnesses], [...c.positiveWitnesses]);

/** Knowledge involution: [truth, falsity] → [¬falsity, ¬truth]; swaps absurd↔stable. */
export const conflate = (c) =>
  make(fromBits(!falsityBit(c.value), !truthBit(c.value)), [...c.positiveWitnesses], [...c.negativeWitnesses]);

// ── named constants ───────────────────────────────────────────────────────────

/** ⊥ absurd — the knowledge-least charge; identity of joinKnowledge. */
export const BOTTOM = bottom();
/** ⊤ stable — the knowledge-greatest charge; a held contradiction. */
export const TOP = top();
/** potential — the truth-greatest evidenceless charge ("true"). */
export const TRUE = potential();
/** active — the truth-least evidenceless charge ("false"). */
export const FALSE = active();

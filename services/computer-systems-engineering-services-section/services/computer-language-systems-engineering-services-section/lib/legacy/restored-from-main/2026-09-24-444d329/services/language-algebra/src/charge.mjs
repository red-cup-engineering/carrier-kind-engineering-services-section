/**
 * Grammatical charge — the four-valued bilattice word for linguistic judgments.
 *
 * The four charge values align exactly with meme-topology's ChargeValue names:
 *   absurd    (⊥) — no judgment yet; the default for any unmentioned cell
 *   potential (t) — compliant: the positive side is witnessed
 *   active    (f) — violation: the negative side is witnessed
 *   stable    (⊤) — contradictory: both sides witnessed, held not discarded
 *
 * Two σ-dual lattice orders:
 *   knowledge: absurd < {potential, active} < stable  ("how determined")
 *   truth:     active < {absurd, stable} < potential  ("which way")
 *
 * Evidence accumulates losslessly across all operations — witnesses ride
 * with their charge through every join, meet, and involution.
 */

/** The four named charge values, aligned with meme-topology's ChargeValue. */

/** A grammatical charge carrier: a four-valued judgment with lossless evidence. */

/** Epistemic status of a charge: how determined the judgment is. */

// ── internal coordinate helpers ───────────────────────────────────────────────

const truthBit = (v) => v === "potential" || v === "stable";
const falsityBit = (v) => v === "active" || v === "stable";

const fromBits = (truth, falsity) => {
  if (truth && falsity) return "stable";
  if (truth) return "potential";
  if (falsity) return "active";
  return "absurd";
};

const make = (
  value,
  pos,
  neg,
) => Object.freeze({
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

// ── knowledge order ───────────────────────────────────────────────────────────

/** left ≤_k right: right is at least as determined as left on both sides. */
export const leqKnowledge = (left, right) =>
  (!truthBit(left.value) || truthBit(right.value)) &&
  (!falsityBit(left.value) || falsityBit(right.value));

// ── lattice operations ────────────────────────────────────────────────────────

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
// The truth lattice (≤_t, joinTruth, meetTruth) carries a residuated commutative
// monoid: fusion ⊙ combines a predicate with its argument; implication ⇒ is its
// right adjoint, satisfying  a ⊙ b ≤_t c  ⇔  a ≤_t (b ⇒ c).  This is the
// algebraic content of the Lambek calculus of categorial grammar — residuation
// generated by the fiber's nuclei (cf. research: nuclei-and-residuation.md), the
// same structure whose obstruction language-topology reads as H¹.

/** left ≤_t right: at least as true (truth grows, falsity shrinks). */
export const leqTruth = (left, right) =>
  (!truthBit(left.value) || truthBit(right.value)) &&
  (!falsityBit(right.value) || falsityBit(left.value));

/** Fusion ⊙ — the monoid that combines two judgments (unit = TRUE/potential).
 * Grammatical only when both are; it is the truth-meet, evidence accumulating. */
export const fuse = (left, right) =>
  meetTruth(left, right);

const FOUR = ["absurd", "active", "potential", "stable"];
const valued = (v) => make(v, [], []);

/** Implication ⇒ — the right residual of ⊙: the largest a (in ≤_t) with a ⊙ b ≤_t c.
 * Evidence-free: an implication witnesses nothing until it is discharged. */
export const implies = (b, c) => {
  const bv = valued(b.value);
  const cv = valued(c.value);
  return FOUR
    .map(valued)
    .filter((a) => leqTruth(fuse(a, bv), cv))
    .reduce((acc, a) => joinTruth(acc, a), FALSE);
};

// ── involutions ───────────────────────────────────────────────────────────────

/** Truth involution: swap positive and negative — value AND evidence together. */
export const negate = (c) =>
  make(
    fromBits(falsityBit(c.value), truthBit(c.value)),
    [...c.negativeWitnesses],
    [...c.positiveWitnesses],
  );

/** Knowledge involution: [truth, falsity] → [¬falsity, ¬truth]; swaps absurd↔stable. */
export const conflate = (c) =>
  make(
    fromBits(!falsityBit(c.value), !truthBit(c.value)),
    [...c.positiveWitnesses],
    [...c.negativeWitnesses],
  );

// ── named constants & aliases ─────────────────────────────────────────────────
// The four evidenceless charges, kept here as the single source of truth so any
// layer can import them without reconstructing them.

/** ⊥ absurd — the knowledge-least charge; identity of joinKnowledge. */
export const BOTTOM = bottom();
/** ⊤ stable — the knowledge-greatest charge; a held contradiction. */
export const TOP = top();
/** potential — the truth-greatest evidenceless charge ("true"). */
export const TRUE = potential();
/** active — the truth-least evidenceless charge ("false"). */
export const FALSE = active();

/** Epistemic status of a charge (alias of chargeStatus). */
export const status = chargeStatus;

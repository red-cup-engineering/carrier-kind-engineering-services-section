import { readingOfSides, sidesOfReading, conflateReading, knowledgeJoinReading, knowledgeLeqReading, knowledgeMeetReading, negateReading, truthJoinReading, truthMeetReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
// value.mjs — Horsetail's values: a point of FOUR (named in its knowledge family) with the witnesses
// that carry its payload. The point combines by FOUR's reading operations; witnesses union
// under every combination (nothing is lost), and negation swaps them with the sides. Horsetail-specific
// data (sequence, function reference, homoiconic code) rides as the first for-witness.


/** A Horsetail value at a reading, with for- and against-witnesses. */
export const horsetailValue = (reading, witnesses = [[], []]) => Object.freeze({
  kind: "horsetail.value",
  reading,
  witnesses: Object.freeze([Object.freeze([...witnesses[0]]), Object.freeze([...witnesses[1]])]),
});

const union = (left, right) => Object.freeze([...left, ...right.filter((w) => !left.some((v) => JSON.stringify(v) === JSON.stringify(w)))]);
const combine = (op) => (left, right) => horsetailValue(op(left.reading, right.reading), [union(left.witnesses[0], right.witnesses[0]), union(left.witnesses[1], right.witnesses[1])]);

export const joinKnowledge = combine(knowledgeJoinReading);
export const meetKnowledge = combine(knowledgeMeetReading);
export const joinTruth = combine(truthJoinReading);
export const meetTruth = combine(truthMeetReading);
export const aggregate = (pair) => joinKnowledge(pair.left, pair.right);
export const negate = (c) => horsetailValue(negateReading(c.reading), [c.witnesses[1], c.witnesses[0]]);
export const conflate = (c) => horsetailValue(conflateReading(c.reading), c.witnesses);
export const leqKnowledge = (left, right) => knowledgeLeqReading(left.reading, right.reading);
/** The told sides [for, against] of a value's point. */
export const present = (c) => sidesOfReading(c.reading);
export const isTop = (c) => c.reading === "stable";
export const isBottom = (c) => c.reading === "absurd";

// ── canonical points ─────────────────────────────────────────────────────────

/** potential [T,F] — affirmed, no contradiction */
export const T = horsetailValue("potential");
/** active [F,T] — denied */
export const F = horsetailValue("active");
/** absurd [F,F] — no information */
export const BOT = horsetailValue("absurd");
export const bottom = BOT;
/** stable [T,T] — held contradiction */
export const TOP = horsetailValue("stable");

/** A potential value witnessed on the for side. */
export const potential = (witness) => horsetailValue("potential", [[witness], []]);

// ── boolean projections ───────────────────────────────────────────────────────

const truthSide = (c) => present(c)[0];
const falsitySide = (c) => present(c)[1];

/** Strictly potential [T,F] → true; everything else (including ⊤) → false. Edge-only collapse. */
export const booleanOf = (c) => truthSide(c) && !falsitySide(c);

/** Has a positive mark: t or ⊤. */
export const isAffirmed = (c) => truthSide(c);

/** Has a negative mark: f or ⊤. */
export const isDenied = (c) => falsitySide(c);

/** Alias for isTop — held contradiction ⊤. */
export const isHeld = isTop;

/** Alias for isBottom — pending / no-information ⊥. */
export const isPending = isBottom;

/** The Horsetail value of a knowledge reading (absurd, potential, active, stable). */
export const valueOfReading = (name) => horsetailValue(readingOfSides("knowledge", ...sidesOfReading(name)));

/** A value's knowledge reading. */
export function readingOf(c) {
  return c.reading;
}

// ── data carriers ─────────────────────────────────────────────────────────────
// Every Horsetail value is a Value. Structured values (seq, fn, code) are encoded
// as tagged objects behind the first positive-evidence witness.

const witnessOf = (c) => c.witnesses[0][0];

// Sequence ────────────────────────────────────────────────────────────────────

const isSeqData = (v) =>
  typeof v === "object" && v !== null &&
  "seq" in (v) && Array.isArray((v).seq);

export const seqOf = (items) => potential({ seq: items });

export const seqFrom = (c) => {
  const v = witnessOf(c);
  return isSeqData(v) ? v.seq : null;
};

// Function reference ──────────────────────────────────────────────────────────

const isFnData = (v) =>
  typeof v === "object" && v !== null &&
  "fn" in (v) && typeof (v).fn === "string";

export const fnValue = (id) => potential({ fn: id });

export const fnId = (c) => {
  const v = witnessOf(c);
  return isFnData(v) ? v.fn : null;
};

// Homoiconic code ─────────────────────────────────────────────────────────────

const isCodeData = (v) =>
  typeof v === "object" && v !== null && "__form" in (v);

export const codeOf = (form) => potential({ __form: form });

export const codeFrom = (c) => {
  const v = witnessOf(c);
  return isCodeData(v) ? v.__form : null;
};

// ── raw value extraction ──────────────────────────────────────────────────────

/** Extract the first positive witness as a raw JS value — the payload for numbers and strings. */
export const valueOf = (c) => witnessOf(c) ?? null;

// ── display ───────────────────────────────────────────────────────────────────

/** Horsetail's point literals in FOUR's side order (0,0) (1,0) (0,1) (1,1): what the reader reads
 *  and the printer writes. */
const glyphs = ["⊥", "t", "f", "⊤"];

/** A value's point as its Horsetail literal (⊥ t f ⊤). */
export const glyph = (c) => glyphs[(truthSide(c) ? 1 : 0) + (falsitySide(c) ? 2 : 0)];

/** Pretty-print a value as a Horsetail value string. */
export function writeValue(c) {
  if (!booleanOf(c)) return glyph(c);

  const v = valueOf(c);
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return `"${v}"`;
  if (v !== null && typeof v === "object") {
    if (isSeqData(v)) {
      const items = seqFrom(c);
      return items ? `(seq${items.map((x) => " " + writeValue(x)).join("")})` : "#<seq>";
    }
    if (isFnData(v)) return "#<fn>";
    if (isCodeData(v)) return "#<code>";
  }
  if (v === null || v === undefined) return glyph(c);
  return `#<${String(v)}>`;
}

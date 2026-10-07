/**
 * SignChain — the evidence bilattice over SignCell's cells.
 *
 * A cell's evidence is a pair (F, A): the witnesses told for it and against
 * it. Its value is a point of FOUR (Belnap 1977; Ginsberg 1988), ordered two
 * ways — knowledge (how much is told) and truth (which way it leans) — with
 * negation swapping the sides. This is Obsmetrologia's Valued (Evidence.lean):
 *
 *   - every operation is lossless on evidence: joinK, meetK, joinT and meetT
 *     all union both sides, whatever they do to the value
 *     (evidence_accumulates_joinK and its mates);
 *   - the value is the four-point operation on the operands' values. The
 *     knowledge join of Measured tellings is Measured (joinK_measured); a meet
 *     can fall below what its witnesses show — "absurd reached, witnesses
 *     kept" (meetK_not_measured) — and the cell then writes its value;
 *   - negation swaps value and sides together and stays Measured
 *     (negate_measured); conflation moves the value alone; presumption raises a
 *     side no witness told without manufacturing a witness, the one
 *     sanctioned breach of Measured (presumeFree).
 *
 * The witness sets are ordered too (knowledgeLeq, truthLeq): inclusion of what
 * has been told, the order evidence grows in.
 */
import { cell, cellSet, evidence, evidenced, hasTriple, sameCell, valueOf } from "@red-cup-engineering/signcell/cell";
import { conflateReading, knowledgeJoinAll, readingSchema, knowledgeJoinReading, knowledgeMeetReading, knowledgeTop, negateReading, readingOfSides, samePoint, sidesOfReading, truthJoinReading, truthMeetReading } from "@red-cup-engineering/computer-data-services-section/four";
import { semanticBytes } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";

// — the bilattice on cells: values combined, evidence accumulated —

const key = (witness) => semanticBytes(witness).toString("hex");
const includes = (small, large) => { const has = new Set(large.map(key)); return small.every((w) => has.has(key(w))); };

const sameShape = (left, right) => {
  if (hasTriple(left) !== hasTriple(right)) throw new TypeError("signchain: a cell combines only with a cell, a bare evidence pair only with a pair");
  if (hasTriple(left) && !sameCell(left, right)) throw new TypeError("signchain: evidence of different cells does not combine");
};

/** Rebuild `like` (a cell or a bare pair) with new sides and value. */
const shaped = (like, sides) => hasTriple(like) ? cell(like.subject, like.predicate, like.object, sides) : evidence(sides);

/** Combine two tellings: their values by `operation`, their evidence unioned on both sides. */
const combined = (operation) => (left, right) => {
  sameShape(left, right);
  return shaped(left, { for: [...left.for, ...right.for], against: [...left.against, ...right.against], value: operation(valueOf(left), valueOf(right)) });
};

/** Knowledge join (Valued.joinK): everything either telling told (on cells, SignCell's merge). */
export const knowledgeJoin = combined(knowledgeJoinReading);
/** Knowledge meet (Valued.meetK): the value both tellings share, every witness of either kept. */
export const knowledgeMeet = combined(knowledgeMeetReading);
/** Truth join (Valued.joinT): the value leaning truer, every witness kept. */
export const truthJoin = combined(truthJoinReading);
/** Truth meet (Valued.meetT): the conjunction of the values, every witness kept. */
export const truthMeet = combined(truthMeetReading);

/** Negation (Valued.negate): the same cell (or bare pair) with its sides and its value's poles swapped
 *  together — a witness for is a witness against the negation. Antitone in truth, monotone in knowledge,
 *  involutive, and Measured when its operand is; also the linear negation (the residuum into the
 *  multiplicative unit told-both). */
export const negate = (value) => shaped(value, { for: value.against, against: value.for, value: negateReading(valueOf(value)) });

/** Conflation (Valued.conflate): the value's knowledge negation, the evidence untouched. It may raise the
 *  value above what the evidence shows. */
export const conflate = (value) => shaped(value, { for: value.for, against: value.against, value: conflateReading(valueOf(value)) });

/** Presumption (Valued.presumeFree): every side no witness has told raised to told, no witness made for
 *  it — the one sanctioned breach of Measured. A side the value already tells stays told. */
export function presumeFree(value) {
  const [forTold, againstTold] = sidesOfReading(valueOf(value));
  return shaped(value, { for: value.for, against: value.against, value: readingOfSides("knowledge", forTold || value.for.length === 0, againstTold || value.against.length === 0) });
}

/** A list of cells with each cell told more than once folded into one by a lattice operation on its
 *  value (knowledgeJoin, the default; knowledgeMeet what every telling shares; truthJoin and truthMeet
 *  the truth order's). Every witness of every telling is kept whichever operation folds. */
export const foldCells = (cells, operation = knowledgeJoin) => cellSet(cells, (left, right) => evidenced(left, operation(left, right)));

/** Whether `left`'s evidence is no more than `right`'s, side by side. */
export function knowledgeLeq(left, right) {
  sameShape(left, right);
  return includes(left.for, right.for) && includes(left.against, right.against);
}

/** Whether `left`'s evidence leans no more true than `right`'s: no more for, no less against. */
export function truthLeq(left, right) {
  sameShape(left, right);
  return includes(left.for, right.for) && includes(right.against, left.against);
}

/** The evidence that tells a reading's sides, each told side witnessed by `witness` — the least evidence
 *  a single witness can give that reads as `name` (knowledgeReading inverts it). */
export function witnessedReading(name, witness) {
  const [forTold, againstTold] = sidesOfReading(name);
  return evidence({ for: forTold ? [witness] : [], against: againstTold ? [witness] : [] });
}

/** Bare evidence pairs: nothing told, one witness for, one witness against. */
export const noEvidence = evidence();
export const witnessedFor = (witness) => evidence({ for: [witness] });
export const witnessedAgainst = (witness) => evidence({ against: [witness] });

/** The JSON Schema of a bare evidence pair. */
export const evidenceSchema = Object.freeze({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://schemas.561.group/signchain/evidence.schema.json",
  title: "Evidence", description: "The witnesses told for and against, each side a set, and the value when it is not what the witnesses show.",
  type: "object", required: ["for", "against"],
  properties: { for: { type: "array", uniqueItems: true }, against: { type: "array", uniqueItems: true }, value: readingSchema("knowledge") },
  additionalProperties: false,
});

/** Settle named judgments ({ value: reading, ... }) at their knowledge join, keeping every judgment and
 *  separately the ones that are themselves told both ways (a held contradiction is retained, not folded). */
export function settleJudgments(judgments) {
  const records = Object.freeze([...judgments]);
  return Object.freeze({
    kind: "signchain.judgment-settlement",
    value: knowledgeJoinAll(records.map((judgment) => judgment.value)),
    judgments: records,
    stableJudgments: Object.freeze(records.filter((judgment) => samePoint(judgment.value, knowledgeTop()))),
  });
}


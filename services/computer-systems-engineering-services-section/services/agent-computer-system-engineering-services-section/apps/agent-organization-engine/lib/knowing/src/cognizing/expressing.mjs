/**
 * cognizing/expressing — CHL terms for the meme-comonad cognizing morphisms.
 *
 * These terms express knowing's five pure meme→meme cognizing morphisms in
 * Relation Model Notation, using the SEN grammar and JSON bridge from
 * `@red-cup-engineering/relating`, over the meme as a SignCell (subject, predicate,
 * object, and its evidence for and against).
 */
import { arrayTerm, objectTerm, stringTerm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
import { tm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";

// ── the meme: a SignCell, its evidence on two sides ──────────────────────────

const empty = arrayTerm([]);
const field = (name) => tm.field(name, tm.var(0));
const cellTerm = (subject, predicate, object, forSide, againstSide) => objectTerm([
  ["subject", subject],
  ["predicate", predicate],
  ["object", object],
  ["for", forSide],
  ["against", againstSide],
]);
const isEmpty = (list) => tm.coincide(list, empty);

// ── cognizing terms ───────────────────────────────────────────────────────────

/** cognize: identity on the meme — the knowledge join of a meme with itself is itself. */
export const cognizerCognize = tm.lam(tm.var(0));

/** forget: the meme's cell with no evidence (the ≤_k bottom). */
export const cognizerForget = tm.lam(cellTerm(field("subject"), field("predicate"), field("object"), empty, empty));

/**
 * doubt: descend ≤_k one step — a cell told both keeps only its evidence for; anything else
 * loses all its evidence.
 */
export const cognizerDoubt = tm.lam(cellTerm(
  field("subject"), field("predicate"), field("object"),
  tm.cond(isEmpty(field("for")), empty, tm.cond(isEmpty(field("against")), empty, field("for"))),
  empty,
));

/** reflect: the comultiplication — the prior meme nested as the cell's object, evidence kept. */
export const cognizerReflect = tm.lam(cellTerm(field("subject"), field("predicate"), tm.var(0), field("for"), field("against")));

/** ruminate: the prior meme as both subject and object, told for by itself on each pass. */
export const cognizerRuminate = tm.lam(cellTerm(tm.var(0), field("predicate"), tm.var(0), arrayTerm([tm.var(0)]), empty));

export const cognizingTerms = Object.freeze({
  cognize: cognizerCognize,
  forget: cognizerForget,
  doubt: cognizerDoubt,
  reflect: cognizerReflect,
  ruminate: cognizerRuminate,
});
